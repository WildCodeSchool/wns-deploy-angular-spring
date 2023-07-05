FROM node:18.16.1-alpine

RUN mkdir /app
WORKDIR /app

COPY . .
RUN npm install
RUN npx ng build --configuration=production 
CMD cp ./dist/front/* /app/build/

