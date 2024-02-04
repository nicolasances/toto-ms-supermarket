# Template for Toto NodeJS Microservices
This repo serves as a template to create new Toto NodeJS Microservices. 

Follow these steps: 

## 1. Clone the Repository
The last parameter will allow you to clone the template to a specific target directory (e.g. `toto-ms-xyz`)
```
git clone https://github.com/nicolasances/toto-node-template <target directory>
```

## 2. Create a new Repo 
Go on Github and create a new Git Repo for `toto-ms-xyz`. 

## 3. Set the new Origin URL
CD to the target directory (`toto-ms-xyz`) and set the new Origin URL to the newly created repo for the new microservice. 
```
git remote set-url origin <new-repo-url>
```

## 4. Install dependencies and start the Microservice
Install NPM dependencies through `npm i` and then you should be able to start the microservice through <br>
`npm run start:dev`

## 5. Change core configurations
The following will need to be done: 
 - Update `index.ts` by chaning the API name and adding the endpoints of the service
 - Uncomment the `github workflows` job parts
 - Update `Config.ts` to make sure you're downloading the right secrets and that the configurations are ok (e.g. db names, collections, etc..)
 - Update `package.json` and change the **package name** and eventually description and version

## What doesn't this template cover yet? 
 1. **Terraforming of the microservice**. This still has to be done separately. 