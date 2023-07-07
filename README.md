# Déploiement d'un projet Angular / Spring Boot

## Présentation

Ce projet est constitué :

* `./back` d'un backend Sprint Boot 3 qui se connecte à une base de donnée PostgreSQL
* `./front` et d'un frontend Angular 15.
* `./deploy` & `.github/workflows` de fichiers de configuration et de scripts assurant le déploiement de ce projet vers un serveur, grâce à GitHub Actions
* `./docker-compose.dev.yml` d'un fichier compose permettant de créer et lancer l'application en local

Le front ne fait qu'afficher une page (`HomeComponent`) incluant : 
* La version : prod ou preprod, récupérée depuis `front/src/environments/environment.ts` (qui bascule vers `front/src/environments/environment.prod.ts`) lorsque l'environnement Angular est production
* La connectivité au back : grâce au `HealthCheckService`, on appelle périodiquement `/api/ping` pour vérifier que l'accès au backend depuis le frontend est bien fonctionnel.

## Démarrer

Pour lancer le projet en local sur une machine de développement

```
cd back 
./mvnw spring-boot:build-image
cd ..
GATEWAY_PORT=8889 docker compose -f docker-compose.dev.yml up --build --force-recreate -d
```

La webapp devrait être accessible à l'adresse `http://localhost:8889`

### Explication du processus de build

Le projet Docker Compose va compiler le front Angular dans un container en utilisant `./front/Dockerfile`. La compilation va générer les fichiers dans un dossier de sortie qui est sur un volume Docker.

Cela permet qu'un autre container, faisant tourner nginx, puisse utiliser le dossier du volume afin d'afficher le front. 
Le container nginx fait aussi proxy vers le backend. Comme l'indique `./nginx.conf`, toutes les requêtes commençant par `/api/` vont être redirigées vers `http://back:8080/` donc le container du backend. Le hostname `back` est généré grâce à docker compose, car tous les containers sont dans le même _network_ Docker. 

Le backend est tout simplement lancé à partir de l'image Docker qui a été générée par la commande `./mvnw spring-boot:build-image`. En local cette commande est lancée à la main et génère une image Docker : `local/wns-deploy-angular-spring-back:latest`

On peut constater que les containers dépendent les uns des autres. On définit donc l'ordre de lancement grâce à `depends_on` : 

```text
`db` (postgresql) -- puis --> `back` --\
`front`--------------------------------->-- puis --> `nginx`   
```

## Déploiement automatisé ou CD (Continuous Deployment)

Comme l'illustre le schéma ci-dessous, ce projet propose un cycle de déploiement automatisé se basant sur :
* Les GitHub Actions
* DockerHub
* Un webhook
* Docker compose 

[Explications](#explications)

![](./docs/deployment_cycle.png)

### Explications

#### **GitHub Action**
Comme défini dans le fichier `.github/workflows/on-push.yaml`, lorsque GitHub détecte un push sur la branche `main` ou `dev`, une GitHub Action est lancée.
Cette GitHub Action va venir construire : 
* une image docker pour le backend grâce au plugin Spring Boot pour Maven
* une image docker pour le frontend avec nginx et les fichiers compilés du front

_NOTE_ Les actions utilisent des secrets qui [doivent être définis dans la configuration](https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-a-repository) (réservée aux admins) du repository GitHub afin d'éviter que des informations sensibles se retrouvent dans les fichiers versionnés

Les images sont taggées avec le nom de la branche, pour pouvoir déterminer si le déploiement doit se faire : 
* `main` => le déploiement doit se faire en **production**
* `dev` => déploiement en **pré-production**

Une fois les images construites, elles sont publiées sur Docker Hub dans l'espace de l'utilisateur qui a été configuré.

#### **DockerHub** 

En configurant un webhook sur la page DockerHub de votre image, dans l'espace Docker de l'utilisateur vers lequel les images ont été publiées, vous pourrez appeler une URL de votre choix à chaque fois qu'une nouvelle version du tag de l'image docker est publiée.

Nous souhaitons par ce biais appeler un script sur notre serveur pour déclencher le déploiement.

#### **Webhook sur le serveur**
Le package Linux `webhook` permet justement d'exposer une URL (port par défaut 9000) et de déclencher une action sur le serveur en passant les paramètres de la requête
Installer le package webhook sur votre serveur si ce n'est pas déjà fait : 
```
sudo apt install webhook
```

L'idéal est de [créer un service système Linux](https://timleland.com/how-to-run-a-linux-program-on-startup/) pour ce programme afin de garantir qu'il soit toujours lancé, même après un redémarrage système.

La configuration de webhook permettant de lancer le script est située ici `./deploy/webhook.conf`, elle est à placer dans `/etc/webhook.conf`.
En observant cette configuration on note : 
* Qu'on appelle le script `/home/ubuntu/scripts/fetch-and-deploy.sh`
* Avec en arguments des valeurs issues du BODY de la requête de webhook :
  * `push_data.tag` : Le tag de l'image qui a été publié sur DockerHub `main` ou `dev`
  * `push_data.pusher` : L'utilisateur qui a fait le push sur DockerHub, cela va nous permettre de savoir dans quel espace DockerHub récupérer les images à déployer
  * La description complète du JSON envoyé par DockerHub est consultable ici : https://docs.docker.com/docker-hub/webhooks/

_IMPORTANT_ Le script doit être déployé au même chemin que celui dans `/etc/webhook.conf` et **être exécutable** (http://dev.petitchevalroux.net/linux/rendre-script-executable-linux.262.html) 

Pour suivre les appels au service webhook, consultez ses logs avec la commande ci-dessous. Si DockerHub appelle bien votre service, vous verrez des lignes apparaitre. 
```
sudo journalctl -f -u webhook -n 200
```

Assurez-vous bien que le service est démarré :
```
sudo systemctl restart webhook
```

_IMPORTANT 2_ Il faut redémarrer le service dès que vous modifiez `/etc/webhook.conf`.

Vous pouvez tester le script directement en lui passant les arguments qui vous arrangent : 
```
bash /path/to/the/fetch-and-deploy.sh main lgrignon
```

Il faut que ce script crée les 3 containers de l'application (pour la préproduction, remplacer `prod` par `preprod`) : 
- app_prod_db
- app_prod_back
- app_prod_front

Vous pouvez ensuite tester que l'application marche en accédant à `http://<IP DE VOTRE SERVER>:8000` si vous avez déployé l'app de production (branche main)
Sinon `http://<IP DE VOTRE SERVER>:8002` pour la préproduction. 
Le statut de la connexion au back doit être **YES**

⚠️ Il y a un bug volontairement laissé sur le site : l'environnement affiche toujours l'environnement production. Ce bug sera corrigé dans la quête https://odyssey.wildcodeschool.com/quests/2786

### Troubleshooting / Correction des problèmes

#### GitHub Action
Sur l'onglet Actions de votre repository GitHub vous pouvez suivre les logs du job lancé par votre push

#### Webhook
Sur votre serveur, pour vérifier ce que provoque l'appel du webhook, le log du scripts
```
sudo journalctl -f -u webhook -n 200
```
Note : webhook doit avoir été créé comme un service

#### Containers
Pour suivre les logs de vos containers, par exemple pour le back de production : 
```
docker logs app_prod_back -f --tail 200
```
ou les logs nginx

```
docker logs app_prod_front -f --tail 200
```

