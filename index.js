// port utilisé par le serveur
const portHTTPS = 1080;

// instanciation du serveur express
const express = require('express');
const appHTTP = express();
const serverHTTP = require('http').createServer(appHTTP);

// récupération du module pour récupérer les plannings
const recuperationPlannings = require('./modules/recuperationPlannings');

const {Cluster} = require('puppeteer-cluster');

// utilisation de cluster afin de gérer plusieurs onglets indépendamment
const cluster = Cluster.launch({
    // on utilise un onglet par browser, en cas de crash d'un, les autres processus ne sont pas affectés
    concurrency: Cluster.CONCURRENCY_BROWSER,
    maxConcurrency: 5,
    puppeteerOptions: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }, // arguments puppeteer browser
    timeout: 90000,
}); // lancement du navigateur Headless

/**
 * Requète serveur sur le /aurion
 * @example localhost:1080/aurion?user=email&mdp=monMdp
 */
appHTTP.get('/aurion', async function (req, res) {
    // on ajoute à la file d'attente la récupération du planning
    await (await cluster).queue({
        username: req.query.user,
        // ici on n'utilise pas req.query.password étant donné que req.query ne prend pas en compte les caractères spéciaux
        password: req.originalUrl.slice(req.originalUrl.indexOf('mdp=') + 4),
        res
    }, recuperationPlannings.recupPlanning);
});

serverHTTP.listen(portHTTPS);

console.log("let's go https port : " + portHTTPS);
