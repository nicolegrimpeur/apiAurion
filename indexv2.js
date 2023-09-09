import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import convert from 'xml-js';

dotenv.config();
const username = process.env.USER;
const password = process.env.PASSWORD;

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

const browser = await puppeteer.launch({
    headless: false,
});
const page = await browser.newPage();


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
    // res.status(401).send('Mauvais mot de passe');
    // return;
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


////////////// initialisation des variables utilisés dans les boucles
let res, resJson, strCours, coursJson, tabCours;
let tabTitle, date;
let id, ecole, salle, nomDuCours, heureDebut, heureFin, jour, description, textIfExam;

/**
     * Permet de stocker tous les événements formatés
     * @type {Array.<StockageDonneesEventModel>}
     */
const formatPlannings = [];

await new Promise(resolve => setTimeout(resolve, 7000));
button = await page.$('.fc-right>button.fc-month-button');
await button.click();

for (let mois = 0; mois < nombreDeMoisARecuperer; mois++) {
    res = await new Promise(resolve => {
        page.on('response', async response => {
            if (response.headers()['content-type'] === 'text/xml;charset=UTF-8') {
                const res = await response.text();
                resolve(res);
            } else {
                resolve(undefined);
            }

        });
    });

    if (res === undefined) {
        throw new Error('Erreur lors de la récupération du planning');
    }

    resJson = JSON.parse(convert.xml2json(res, { compact: true, spaces: 4 }));

    strCours = resJson['partial-response']['changes']['update'][1]['_cdata'];
    coursJson = JSON.parse(strCours);
    tabCours = coursJson['events'];
    console.log(tabCours);

    for (let cours of tabCours) {
        if (formatPlannings.findIndex((p) => p.id === cours['id']) === -1) {
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

            //////////////////////////// à refaire
            textIfExam = (cours['className'] === 'est-epreuve') ? '🎓 Examen - ' : '';

            formatPlannings.push({
                id, ecole, salle, nomDuCours, heureDebut, heureFin, jour, description, textIfExam
            });
        }
    }

    if (mois !== nombreDeMoisARecuperer - 1) {
        button = await page.$('.fc-left>button.fc-next-button');
        await button.click();
    }
}

console.log(formatPlannings);

// // on ferme le navigateur
// // await browser.close();

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
console.log("fini !");

// si l'on permet une réponse express
if (res !== undefined) {
    // on enregistre le contenu ICS obtenu dans un fichier data.ics
    await fs.writeFileSync('./aurion.ics', icsMSG);

    // on renvoie le fichier à l'utilisateur pour téléchargement
    await res.status(200).download('./aurion.ics');

    // on attend la fin du téléchargement
    await new Promise(resolve => setTimeout(resolve, 500));

    // on supprime le fichier
    fs.unlinkSync('./aurion.ics');
}