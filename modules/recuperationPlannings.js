const puppeteer = require('puppeteer');
const fs = require('fs');

/**
 * Script de récupération des plannings Aurion à l'aide du navigateur Headless Puppeteer
 * @param username  Mail de l'utilisateur qui souhaite se connecter
 * @param password  Mot de passe associé
 * @param res       Variable de réponse express
 */
exports.recupPlanning = async function (username, password, res) {
    const nombreDeSemaineARecuperer = 2;        // nombre de semaines pour lesquelles on souhaite récupérer le planning
    const browser = await puppeteer.launch();   // lancement du navigateur Headless
    const page = await browser.newPage();       // création d'un nouvel onglet
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

    // bouton Mon Planning, premier élément possédant la dépendance li>a>span
    // permet de se déplacer sur la page des plannings
    const button = await page.$('li>a>span');
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
    // récupère les contenus de chaque événement du jour (format ...<br>...<br>...<br>...)
    let htmlPlannings;
    // stocke dans un tableau les contenus séparés (format [..., ..., ..., ...])
    let tabPlanningsJournee;
    // stocke l'école où aura lieu le cours
    let quelleEcole;
    // stocke la salle où aura lieu le cours
    let salle;
    // stocke les heures de départ du cours (format HH:MM)
    let tabHeures;
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

            // parcours de chaque événement de la journée
            for (let planning of htmlPlannings) {
                // sépare le contenu obtenu et le transforme en tableau
                tabPlanningsJournee = planning.split('<br>');

                // recherche dans la première ligne obtenue l'école (HEI, ISA, ou ISEN)
                quelleEcole = await tabPlanningsJournee[0].match(/(ISEN)|(HEI)|(ISA)/g);
                // recherche dans la première ligne la salle (format 000 ou A000)
                salle = await tabPlanningsJournee[0].match(/[A-Z]?[0-9]{3}/g);
                // recherche dans la troisième ligne les horaires de début et de fin (format HH:MM)
                tabHeures = tabPlanningsJournee[2].match(/[0-9]{2}:[0-9]{2}/g);

                // ajout de l'évènement formaté
                formatPlannings.push({
                    ecole: (quelleEcole !== null) ? quelleEcole[quelleEcole.length - 1] : 'Teams',
                    salle: (salle !== null) ? salle[salle.length - 1] : '',
                    nomDuCours: (tabPlanningsJournee[1] !== '') ? tabPlanningsJournee[1] : tabPlanningsJournee[0].slice(0, tabPlanningsJournee[0].indexOf('-')),
                    prof: tabPlanningsJournee[3],
                    heureDebut: tabHeures[0].replace(':', '') + '00',
                    heureFin: tabHeures[1].replace(':', '') + '00',
                    jour: prefixDate
                });
            }
        }

        // récupère le bouton vers la semaine suivante
        btnNextSemaine = await page.$('button>span.ui-icon-circle-triangle-e');
        await btnNextSemaine.click();
    }

    // on ferme le navigateur
    await browser.close();

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
            "DTSTART:" +                            // début de l'événement
            event.jour + "T" + event.heureDebut +
            "\n" +
            "DTEND:" +                              // fin de l'événement
            event.jour + "T" + event.heureFin +
            "\n" +
            "SUMMARY:" +                            // titre
            event.ecole + ' ' + event.salle + ' - ' + event.nomDuCours +
            "\n" +
            "DESCRIPTION:" +                        // description
            "" +
            "\n" +
            "ORGANIZER;CN=" +                       // organisateur, ici utilisé pour le professeur
            event.prof +
            "\n" +
            "END:VEVENT\n";
    }

    // on ferme le calendrier
    icsMSG += "END:VCALENDAR";

    // si l'on permet une réponse express
    if (res !== undefined) {
        // on enregistre le contenu ICS obtenu dans un fichier data.ics
        await fs.writeFileSync('./aurion.ics', icsMSG);

        // on renvoi le fichier à l'utilisateur pour téléchargement
        await res.status(200).download('./data.ics');

        // on attend la fin du téléchargement
        await new Promise(resolve => setTimeout(resolve, 500));

        // on supprime le fichier
        fs.unlinkSync('./aurion.ics');
    }
}
