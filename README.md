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

### Explication du processus de build

