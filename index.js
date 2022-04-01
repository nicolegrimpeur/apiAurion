// port utilisé par le serveur
const portHTTPS = 1080;

// instanciation du serveur express
const express = require('express');
const appHTTP = express();
const serverHTTP = require('http').createServer(appHTTP);

// récupération du module pour récupérer les plannings
const recuperationPlannings = require('./modules/recuperationPlannings');

/**
 * Requète serveur sur le /aurion
 * @example localhost:1080/aurion?user=email&mdp=monMdp
 */
appHTTP.get('/aurion', function (req, res) {
    // lance la récupération et le téléchargement du planning
    recuperationPlannings.recupPlanning(req.query.user, req.query.mdp, res)
        .then()
        .catch(err => {
            console.log(err);
            res.status(504);
        })
});

serverHTTP.listen(portHTTPS);

console.log("let's go https port : " + portHTTPS);
