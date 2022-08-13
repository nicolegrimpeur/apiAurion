/**
 * Model utilisé pour stocker les informations de chaque événement
 * @param {string} ecole école où se situe la salle
 * @param {string} salle numéro de salle, au format 000 ou A000
 * @param {string} nomDuCours nom du cours
 * @param {string} prof nom du professeur
 * @param {string} heureDebut heure du début de l'événement au format ICS (HHMMSS avec H heure, M minute et S seconde)
 * @param {string} heureFin heure de la fin de l'événement au format ICS (HHMMSS avec H heure, M minute et S seconde)
 * @param {string} jour jour de l'événement au format ICS (AAAAMMJJ avec A année, M mois et D jour)
 * @param {string} description description de l'événement, retour à la ligne géré avec \n
 * @param {string} textIfExam stocke le texte affiché si l'événement est un examen
 */
class StockageDonneesEventModel {
    ecole;
    salle;
    nomDuCours;
    prof;
    heureDebut;
    heureFin;
    jour;
    description;
    textIfExam;
}

export default StockageDonneesEventModel;
