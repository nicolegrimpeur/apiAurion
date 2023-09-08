// port utilisé par le serveur
const portHTTPS = 1080;

// instanciation du serveur express
import express from 'express';
const appHTTP = express();
import http from "http";
const serverHTTP = http.createServer(appHTTP);

// récupération du module pour récupérer les plannings
import {recupPlanning} from "./modules/recuperationPlannings.js";

import {Cluster} from "puppeteer-cluster";

// utilisation de cluster afin de gérer plusieurs onglets indépendamment
const cluster = Cluster.launch({
    // on utilise un onglet par browser, en cas de crash d'un, les autres processus ne sont pas affectés
    concurrency: Cluster.CONCURRENCY_CONTEXT,
    maxConcurrency: 5,
    puppeteerOptions: {
        // args: ['--no-sandbox', '--disable-setuid-sandbox'],
        // ignoreDefaultArgs: ['--disable-extensions'],
        headless: 'false',
        executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',
        // timeout: 0,
        // slowMo: 100,
    }, // arguments puppeteer browser
    // monitor: true, // affichage des logs
}); // lancement du navigateur Headless

/**
 * Requète serveur sur le /aurion
 * @example localhost:1080/aurion?user=email&mdp=monMdp
 */
appHTTP.get('/isen/aurion', async function (req, res) {
    console.log("requête reçue");
    // on ajoute à la file d'attente la récupération du planning
    await (await cluster).queue({
        username: req.query.user,
        // ici on n'utilise pas req.query.password étant donné que req.query ne prend pas en compte les caractères spéciaux
        password: req.originalUrl.slice(req.originalUrl.indexOf('mdp=') + 4),
        res
    }, recupPlanning);
});

serverHTTP.listen(portHTTPS);

console.log("let's go https port : " + portHTTPS);
