import fs from 'fs';

// récupérer le contenu du fichier res.json 
const content = fs.readFileSync('res.json', 'utf8');
const data = JSON.parse(content);

let strCours = data['partial-response']['changes']['update'][1]['_cdata'];
let coursJson = JSON.parse(strCours);
let tabCours = coursJson['events'];

let tabTitle, date;
let id, ecole, salle, nomDuCours, heureDebut, heureFin, jour, description, textIfExam;
const formatPlannings = [];    

for (let i = 0; i < 2; i++) {
    for (let cours of tabCours) {
        ///////// tester si l'id est pas déjà dans formatPlannings
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
            textIfExam = (cours['title'].match(/(Examen)/g) !== null) ? '🎓 Examen - ' : '';

            formatPlannings.push({
                id, ecole, salle, nomDuCours, heureDebut, heureFin, jour, description, textIfExam
            });
        }
    }
}

console.log(formatPlannings)