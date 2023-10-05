import fs from "fs";
import StockageDonneesEventModel from "../models/stockageDonneesEventModel.js";
import convert from 'xml-js';

/**
 * Script de récupération des plannings Aurion à l'aide du navigateur Headless Puppeteer
 * @param param page contient la page allouée par le cluster pour le processus et data contient :
 *          <br>
 *          - username : le mail de l'utilisateur qui souhaite se connecter
 *          - password : le mot de passe associé
 *          - res : la variable de réponse express
 */
export async function recupPlanning ({page, data}) {
    const username = data.username;
    const password = data.password;
    const response = data.res;

    
    const nombreDeMoisARecuperer = 2;           // nombre de mois pour lesquelles on souhaite récupérer le planning
    await page.setExtraHTTPHeaders({            // correction de la langue des requêtes
        'Accept-Language': 'fr'                 // (les navigateurs linux serveurs sont par défaut configurés en anglais,
    });                                         // or la version anglaise d'Aurion n'affiche pas les numéros de salle 🙃)
    await page.setViewport({                    // passage de la page en 1080p
        width: 1920,
        height: 1080,
        deviceScaleFactor: 1,
    })
    await page.goto('https://aurion.junia.com/faces/Login.xhtml');  // déplacement sur la page de Login d'Aurion
    // remplissage du formulaire de connexion
    await page.type('#username', username);
    await page.type('#password', decodeURI(password));
    await page.keyboard.press('Enter');
    
    await page.waitForNavigation();             // on attend le changement de page
    
    if (page.url() === 'https://aurion.junia.com/login') {
        console.log("Mauvais mot de passe");
        response.status(401).send('Mauvais mot de passe');
        throw new Error('Mauvais mot de passe');
    }
    // bouton Mon Planning, premier élément possédant la dépendance li>a>span
    // permet de se déplacer sur la page des plannings
    const spans = await page.$$('li>a>span');
    let button;
    for (let span of spans) {
        if (await page.evaluate(el => el.textContent, span) === "Mon Planning") button = span;
    }
    await button.click();
    
    // on attend le changement de page
    await page.waitForNavigation();

    // on attend que la page soit chargée
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    
    ////////////// initialisation des variables utilisés dans les boucles
    let result, resJson, strCours, coursJson, tabCours;
    let tabTitle, date;
    let id, ecole, salle, nomDuCours, heureDebut, heureFin, jour, description, textIfExam;
    
    /**
         * Permet de stocker tous les événements formatés
         * @type {Array.<StockageDonneesEventModel>}
         */
    const formatPlannings = [];
    
    // on clique sur le bouton mois pour passer en vue mois
    button = await page.$('.fc-right>button.fc-month-button');
    await button.click();
    
    for (let mois = 0; mois < nombreDeMoisARecuperer; mois++) {
        // on récupère le résultat de la requète lié à la récupération du planning
        result = await new Promise(resolve => {
            page.on('response', async response => {
                if (response.headers()['content-type'] === 'text/xml;charset=UTF-8') {
                    const res = await response.text();
                    resolve(res);
                } else {
                    resolve(undefined);
                }
    
            });
        });
    
        if (result === undefined) {
            response.status(500).send('Erreur lors de la récupération du planning');
            return;
        }
    
        // on convertit le résultat en JSON
        resJson = JSON.parse(convert.xml2json(result, { compact: true, spaces: 4 }));
    
        // on récupère les cours
        strCours = resJson['partial-response']['changes']['update'][1]['_cdata'];
        // on convertit les cours en JSON
        coursJson = JSON.parse(strCours);
        // on récupère le tableau des cours
        tabCours = coursJson['events'];
    
        // on parcourt les cours
        for (let cours of tabCours) {
            // si le cours n'est pas déjà dans le tableau des cours formatés
            if (formatPlannings.findIndex((p) => p.id === cours['id']) === -1) {
                // on récupère l'id du cours, l'école, la salle, le nom du cours, l'heure de début, l'heure de fin, le jour et la description
                id = cours['id'];
                ecole = cours['title'].match(/(ISEN)|(HEI)|(ISA)/g);
                ecole = (ecole !== null) ? ecole[0] : '🤷';
                salle = cours['title'].match(/[A-Z]?[0-9]{3}/g);
                salle = (salle !== null) ? salle[0] : '';
                tabTitle = cours['title'].split('\n');
                nomDuCours = (tabTitle[2] === '') ? tabTitle[1] : tabTitle[2];
                date = new Date(cours['start']);
                heureDebut = date.getHours().toString().padStart(2, '0') + date.getMinutes().toString().padStart(2, '0') + '00';
                date = new Date(cours['end']);
                heureFin = date.getHours().toString().padStart(2, '0') + date.getMinutes().toString().padStart(2, '0') + '00';
                jour = date.getFullYear().toString() + (date.getMonth() + 1).toString().padStart(2, '0') + date.getDate().toString().padStart(2, '0');
                description = cours['title'].replaceAll('\n', ' \\n ').replaceAll(/(\s)+/g, ' ');
                textIfExam = (cours['className'] === 'est-epreuve') ? '🎓 Examen - ' : '';
    
                // on ajoute le cours au tableau des cours formatés
                formatPlannings.push({
                    id, ecole, salle, nomDuCours, heureDebut, heureFin, jour, description, textIfExam
                });
            }
        }
    
        // on clique sur le bouton suivant pour passer au mois suivant
        if (mois !== nombreDeMoisARecuperer - 1) {
            button = await page.$('.fc-left>button.fc-next-button');
            await button.click();
        }
    }
    
    
    ///////// on commence la création du fichier ICS à partir des données récupérées
    // contenu du fichier ICS
    let icsMSG =
        "BEGIN:VCALENDAR\n" +
        "CALSCALE:GREGORIAN\n" +
        "METHOD:PUBLISH\n" +
        "PRODID:-//Aurion//FR\n" +
        "VERSION:2.0\n";
    
    // on ajoute chaque cours récupéré au contenu ICS
    for (let event of formatPlannings) {
        icsMSG +=
            "BEGIN:VEVENT\n" +
            "DTSTART;TZID=Europe/Paris:" +                            // début de l'événement
            event.jour + "T" + event.heureDebut +
            "\n" +
            "DTEND;TZID=Europe/Paris:" +                              // fin de l'événement
            event.jour + "T" + event.heureFin +
            "\n" +
            "SUMMARY:" +                            // titre
            event.textIfExam + event.ecole + ' ' + event.salle + ' - ' + event.nomDuCours +
            "\n" +
            "DESCRIPTION:" +                        // description
            event.description +
            "\n" +
            "END:VEVENT\n";
    }
    
    // on ferme le calendrier
    icsMSG += "END:VCALENDAR";
    // console.log("fini !");
    
    // si l'on permet une réponse express
    if (response !== undefined) {
        // on enregistre le contenu ICS obtenu dans un fichier data.ics
        await fs.writeFileSync('./aurion.ics', icsMSG);
    
        // on renvoie le fichier à l'utilisateur pour téléchargement
        await response.status(200).download('./aurion.ics');
    
        // on attend la fin du téléchargement
        await new Promise(resolve => setTimeout(resolve, 500));
    
        // on supprime le fichier
        fs.unlinkSync('./aurion.ics');
    }
}

// permet d'obtenir le lundi du début de mois
function getDateLundi(numeroSemaine, annee) {
    let date = new Date(annee, 0, 1);
    let jourDeLaSemaine = date.getDay();
    let joursAvantLundi = 1 - jourDeLaSemaine;
    let joursDansLaSemaine = 7;
    let joursAvantSemaine = (numeroSemaine - 1) * joursDansLaSemaine;
    let joursDepuis1erJanvier = joursAvantLundi + joursAvantSemaine;
    let dateLundi = new Date(annee, 0, joursDepuis1erJanvier + 1);
    return dateLundi;
}