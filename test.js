// let time = new Date(new Date().setDate(new Date().getDate() - new Date(Date.now()).getDay()));

// obtenir le timestamp unix du dimanche 8 semaines après le dimanche actuel
let time = new Date(new Date().setDate(new Date().getDate() - new Date(Date.now()).getDay() + 56));
console.log(time.getTime());
