import fs from "fs";
// import StockageDonneesEventModel from "./stockageDonneesEventModel.js";

/**
 * Script de récupération des plannings Aurion à l'aide du navigateur Headless Puppeteer
 * @param param page contient la page allouée par le cluster pour le processus et data contient :
 *          <br>
 *          - username : le mail de l'utilisateur qui souhaite se connecter <br>
 *          - password : le mot de passe associé <br>
 *          - res : la variable de réponse express <br>
 */
export async function recupPlanning ({page, data}) {
    const username = data.username;
    const password = data.password;
    const res = data.res;

    const nombreDeSemaineARecuperer = 8;        // nombre de semaines pour lesquelles on souhaite récupérer le planning

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
        res.status(401).send('Mauvais mot de passe');
        return;
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
    // stocke les colonnes de toutes les journées
    let tabJour;
    // référence au dimanche du début de semaine
    let time = new Date(new Date().setDate(new Date().getDate() - new Date(Date.now()).getDay()));
    // référence pour la création du format ICS du jour en cours
    let jourEnCours;
    // stocke le format ICS du jour (format JJ)
    let jour;
    // stocke le format ICS du mois (format MM)
    let mois;
    // stocke le jour au format ICS (AAAAMMJJ)
    let prefixDate;
    // récupère les contenus de chaque événement du jour (format "...<br>...<br>...<br>...")
    let htmlPlannings;
    // permet de stocker le parent de htmlPlannings --> permet de tester si le créneau est un examen ou pas
    let parentHtmlPlannings;
    // stocke dans un tableau les contenus séparés (format [..., ..., ..., ...])
    let tabPlanningsJournee;
    // stocke l'école où aura lieu le cours
    let quelleEcole;
    // stocke la salle où aura lieu le cours
    let salle;
    // stocke les heures de départ du cours (format HH:MM)
    let tabHeures;
    // teste si le créneau est un examen ou pas
    let isExam;
    // bouton vers la prochaine semaine
    let btnNextSemaine;

    /**
     * Permet de stocker tous les événements formatés
     * @type {Array.<StockageDonneesEventModel>}
     */
    const formatPlannings = [];

    // une boucle correspond à la récupération des données d'une semaine
    for (let semaine = 0; semaine < nombreDeSemaineARecuperer; semaine++) {
        // timer sur la page permettant d'attendre la fin de la récupération des données par Aurion
        await new Promise(resolve => setTimeout(resolve, 5000));

        // on récupère toutes les colonnes de journées
        tabJour = await page.$$('tr>td>div.fc-content-col');

        // boucle sur chaque jour de la semaine
        for (let i = 1; i <= tabJour.length; i++) {
            // jour parcouru au format Date
            jourEnCours = new Date(new Date().setTime(time.getTime() + (7 * semaine + i) * 86400000));

            // récupération du jour et du mois au format ICS
            jour = (jourEnCours.getDate().toString().length === 1) ? '0' + jourEnCours.getDate().toString() : jourEnCours.getDate().toString();
            mois = ((jourEnCours.getMonth() + 1).toString().length === 1) ? '0' + (jourEnCours.getMonth() + 1).toString() : (jourEnCours.getMonth() + 1).toString();
            // récupération du jour au format ICS
            prefixDate = jourEnCours.getFullYear().toString() + mois + jour;

            // on récupère tous les événements de la journée
            htmlPlannings = await tabJour[i - 1].$$eval('.fc-title', node => node.map(n => n.innerHTML));
            parentHtmlPlannings = await tabJour[i - 1].$$('.fc-content');

            // parcours de chaque événement de la journée
            for (let indicePlanning = 0; indicePlanning < htmlPlannings.length; indicePlanning++) {
                // sépare le contenu obtenu et le transforme en tableau
                tabPlanningsJournee = htmlPlannings[indicePlanning].split('<br>');
                console.log(tabPlanningsJournee);
                // recherche dans la troisième ligne les horaires de début et de fin (format HH:MM)
                tabHeures = htmlPlannings[indicePlanning].match(/[0-9]{2}:[0-9]{2}/g);

                isExam = (await parentHtmlPlannings[indicePlanning].$$('i')).length !== 0;

                if (tabPlanningsJournee.length === 6) {
                    // recherche dans la première ligne obtenue l'école (HEI, ISA, ou ISEN)
                    quelleEcole = await tabPlanningsJournee[0].match(/(ISEN)|(HEI)|(ISA)/g);
                    // recherche dans la première ligne la salle (format 000 ou A000)
                    salle = await tabPlanningsJournee[0].match(/[A-Z]?[0-9]{3}/g);
                } else {
                    quelleEcole = [""];
                    salle = [""];
                }

                // ajout de l'évènement formaté
                formatPlannings.push({
                    ecole: (quelleEcole !== null) ? quelleEcole[quelleEcole.length - 1] : '🤷',
                    salle: (salle !== null) ? salle[salle.length - 1] : '',
                    nomDuCours: (tabPlanningsJournee[tabPlanningsJournee.length - 4] !== '') ?
                        tabPlanningsJournee[tabPlanningsJournee.length - 4] :
                        tabPlanningsJournee[tabPlanningsJournee.length - 4].slice(0, tabPlanningsJournee[0].indexOf('-')),
                    prof: tabPlanningsJournee[tabPlanningsJournee.length - 1],
                    heureDebut: tabHeures[0].replace(':', '') + '00',
                    heureFin: tabHeures[1].replace(':', '') + '00',
                    jour: prefixDate,
                    description: htmlPlannings[indicePlanning].replaceAll('<br>', ' \\n ').replaceAll(/(\s)+/g, ' '),
                    textIfExam: isExam ? '🎓 Examen - ' : ''
                });
            }
        }


        // récupère le bouton vers la semaine suivante
        btnNextSemaine = await page.$('button>span.ui-icon-circle-triangle-e');
        await btnNextSemaine.click();
    }

    // on ferme le navigateur
    // await browser.close();

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
}
