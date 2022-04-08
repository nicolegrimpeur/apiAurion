# Api Aurion

## Description

L'objectif de cette API est de récupérer vos plannings afin d'en ressortir un fichier au format ICS.

Ce format peut par exemple être utilisé afin d'automatiser votre
calendrier, [lien vers un petit tuto](https://blog.share-d.com/application/les-tutos/tuto-comment-synchroniser-agenda/)
pour vous montrer comment faire

Vous avez à disposition dans ce repository les scripts nécessaires à la création d'un serveur en ligne, ou pour ajout
sur votre serveur existant.

N'hésitez pas à fork le projet pour faire vos propres modifications et ainsi personnaliser ce script.

## Exemple de résultat avec Google Calendar

![Exemple de résultat avec Google Calendar](Résultat avec Google Calendar.png)

## FAQ

### Que faire si mon mot de passe contient des caractères spéciaux ?

Pas de soucis ! La plupart des caractères spéciaux utilisés dans les mots de passe Aurion sont acceptés dans les
requêtes HTTP 👌

En cas de soucis tout de même, une sécurité est présente dans le script, vous permettant d'encoder votre mot de passe en
utilisant la commande encodeURI(votreMDP) dans la console de votre navigateur, puis en utilisant la sortie comme votre
mot de passe

### J'ai un problème avec le script que je pense pouvoir corriger, est-ce que les pulls requests sont acceptés pour corriger cela ?

Bien évidemment ! Il se peut que Aurion soit mis à jour cassant les recherches de composants utilisés, n'hésitez pas à
proposer vos corrections dans ce cas la 👍

### Quels sont les dépendances nécessaires ?

Le projet étant basé sur Javascript, vous aurez besoin de node pour exécuter le script.

Le projet [Puppeteer](https://github.com/puppeteer/puppeteer) étant ici utilisé, un navigateur utilisant Chromium sera
installé (la plupart des navigateurs le sont déjà pas de soucis de ce côté la). En revanche, cela peut poser problème
sur serveur, avec une erreur lors de l'installation de Puppeteer. Il vous suffit d'installer manuellement Chromium pour
corriger le problème (sudo apt install chromium-browser).

Sinon, les librairies utilisées sont fs pour la création du fichier de sortie avant téléchargement et express pour la
gestion du serveur

## Crédits

Réalisé par Nicolas Barrat, étudiant à l'ISEN Lille, France

Petit lien pour me supporter dans ce type de projet, merci d'avance à ceux qui prennent le temps de m'acheter un café !
😇

<a href="https://www.buymeacoffee.com/nicolegrimpeur" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-blue.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>
