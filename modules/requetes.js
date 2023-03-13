import fetch from 'node-fetch';
import {parse} from 'node-html-parser';
import {parseString} from 'xml2js';
import 'web-streams-polyfill';
import ajax from 'ajax-request';
import {XMLHttpRequest} from 'xmlhttprequest';
import axios from 'axios';

export async function requetes(res, username, password) {
    let jsessionid = await getCookiesLogin();
    jsessionid = await login(jsessionid, username, password);

    await sleep(1000);
    const viewState = await getViewState(jsessionid);
    await sleep(1000);
    await getPlanning(jsessionid, viewState);

    res.send('ok');
}

function getJSessionIdFromResponse(response) {
    let jsessionid = response.headers.get('set-cookie');
    jsessionid = jsessionid.slice(jsessionid.indexOf('JSESSIONID=') + 11, jsessionid.indexOf(';'));
    return jsessionid;
}

async function getCookiesLogin() {
    const response = await fetch('https://aurion.junia.com/faces/Login.xhtml');
    return getJSessionIdFromResponse(response);
}

async function login(jsessionid, username, password) {
    const response = await fetch('https://aurion.junia.com/login', {
        headers: {
            'Cookie': 'JSESSIONID=' + jsessionid,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': 'https://aurion.junia.com/faces/Login.xhtml',
            'Origin': 'https://aurion.junia.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:102.0) Gecko/20100101 Goanna/6.0 Firefox/102.0 Basilisk/20230126'
        }, method: 'POST', body: 'username=' + username + '&password=' + password + '&&j_idt28=',
    });
    return getJSessionIdFromResponse(response);
}

async function getViewState(jsessionid) {
    const response = await fetch('https://aurion.junia.com/', {
        headers: {
            'Cookie': 'JSESSIONID=' + jsessionid,
        },
    });
    const text = await response.text();
    const html = parse(text);
    return html.querySelector('input[name="javax.faces.ViewState"]').getAttribute('value');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getPlanning(jsessionid, viewState) {
    const nbSemaines = 8;

    // référence au dimanche du début de semaine
    const dimanchePrecedent = new Date(new Date().setDate(new Date().getDate() - new Date(Date.now()).getDay()));
    // référence à la date de fin à récupérer
    const dateFin = new Date(new Date().setDate(dimanchePrecedent.getDate() + (nbSemaines * 7)));

    const options = {year: 'numeric', month: 'numeric', day: 'numeric'};

    const premierJanvier = new Date(dimanchePrecedent.getFullYear(), 0, 1);
    const nombreJours = Math.floor((dimanchePrecedent - premierJanvier) / (24 * 60 * 60 * 1000));
    const nombreSemaines = Math.ceil((dimanchePrecedent.getDay() + 1 + nombreJours) / 7);

    console.log(dimanchePrecedent.getTime());

    // let response = await fetch('https://aurion.junia.com/faces/Planning.xhtml', {
    //     method: 'POST',
    //     body: 'javax.faces.partial.ajax=true' +
    //         '&javax.faces.source=form:j_idt117' +
    //         '&javax.faces.partial.execute=form:j_idt117' +
    //         '&javax.faces.partial.render=form:j_idt117' +
    //         '&form:j_idt117=form:j_idt117' +
    //         '&form:j_idt117_start=' + dimanchePrecedent.getTime() +
    //         '&form:j_idt117_end=' + dateFin.getTime() +
    //         '&form=form' +
    //         '&form:largeurDivCenter=' +
    //         '&form:idInit=webscolaapp.Planning_31062438843074729' +
    //         '&form:date_input=' + dimanchePrecedent.toLocaleDateString('fr-FR', options) +
    //         '&form:week=' + nombreSemaines + '-' + dimanchePrecedent.getFullYear() +
    //         '&form:j_idt117_view=agendaWeek' +
    //         '&form:offsetFuseauNavigateur=-3600000' +
    //         '&form:onglets_activeIndex=0&' +
    //         'form:onglets_scrollState=0' +
    //         '&form:j_idt237_focus=' +
    //         '&form:j_idt237_input=46623' +
    //         '&javax.faces.ViewState=' + viewState,
    //     credentials: 'include',
    //     headers: {
    //         'Cookie': 'JSESSIONID=' + jsessionid,
    //         'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    //         'Connection': 'close',
    //         // 'Faces-Request': 'partial/ajax',
    //         'X-Requested-With': 'XMLHttpRequest',
    //         // 'Accept': 'application/xml, text/xml, */*; q=0.01',
    //         'Accept': '*/*',
    //         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:102.0) Gecko/20100101 Goanna/6.0 Firefox/102.0 Basilisk/20230126',
    //         'Referer': 'https://aurion.junia.com/faces/Planning.xhtml',
    //         'Origin': 'https://aurion.junia.com',
    //         'Accept-Encoding': 'gzip, deflate',
    //     }});
    //
    // const responseData = await response.text();
    // console.log(responseData);


    const response = await axios.post('https://aurion.junia.com/faces/Planning.xhtml', // your request body,
        {
            headers: {
                'Cookie': 'JSESSIONID=' + jsessionid,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Connection': 'close', // 'Faces-Request': 'partial/ajax',
                'X-Requested-With': 'XMLHttpRequest', // 'Accept': 'application/xml, text/xml, */*; q=0.01',
                'Accept': '*/*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:102.0) Gecko/20100101 Goanna/6.0 Firefox/102.0 Basilisk/20230126',
                'Referer': 'https://aurion.junia.com/faces/Planning.xhtml',
                'Origin': 'https://aurion.junia.com',
                'Accept-Encoding': 'gzip, deflate',
            },
            responseType: 'stream',
            data: 'javax.faces.partial.ajax=true' +
                '&javax.faces.source=form:j_idt117' +
                '&javax.faces.partial.execute=form:j_idt117' +
                '&javax.faces.partial.render=form:j_idt117' +
                '&form:j_idt117=form:j_idt117' +
                '&form:j_idt117_start=' + dimanchePrecedent.getTime() +
                '&form:j_idt117_end=' + dateFin.getTime() +
                '&form=form' +
                '&form:largeurDivCenter=' +
                '&form:idInit=webscolaapp.Planning_31062438843074729' +
                '&form:date_input=' + dimanchePrecedent.toLocaleDateString('fr-FR', options) +
                '&form:week=' + nombreSemaines + '-' + dimanchePrecedent.getFullYear() +
                '&form:j_idt117_view=agendaWeek' +
                '&form:offsetFuseauNavigateur=-3600000' +
                '&form:onglets_activeIndex=0&' +
                'form:onglets_scrollState=0' +
                '&form:j_idt237_focus=' +
                '&form:j_idt237_input=46623' +
                '&javax.faces.ViewState=' + viewState,
        });

    const reader = response.body.getReader();

    while (true) {
        const {value, done} = await reader.read();
        if (done) break;
        console.log('Received', value);
    }

    console.log('Response fully received');


    // await fetch('https://aurion.junia.com/faces/Planning.xhtml', {
    //     headers: {
    //         'Cookie': 'JSESSIONID=' + jsessionid,
    //         'Content-Type': 'application/x-www-form-urlencoded',
    //     },
    //     method: 'POST',
    //     body: 'javax.faces.partial.ajax=true' +
    //         '&javax.faces.source=form:j_idt117' +
    //         '&javax.faces.partial.execute=form:j_idt117' +
    //         '&javax.faces.partial.render=form:j_idt117' +
    //         '&form:j_idt117=form:j_idt117' +
    //         '&form:j_idt117_start=' + dimanchePrecedent.getTime() +
    //         '&form:j_idt117_end=' + dateFin.getTime() +
    //         '&form=form' +
    //         '&form:largeurDivCenter=' +
    //         '&form:idInit=webscolaapp.Planning_31062438843074729' +
    //         '&form:date_input=' + dimanchePrecedent.toLocaleDateString('fr-FR', options) +
    //         '&form:week=' + nombreSemaines + '-' + dimanchePrecedent.getFullYear() +
    //         '&form:j_idt117_view=agendaWeek' +
    //         '&form:offsetFuseauNavigateur=-3600000' +
    //         '&form:onglets_activeIndex=0&' +
    //         'form:onglets_scrollState=0' +
    //         '&form:j_idt237_focus=' +
    //         '&form:j_idt237_input=46623' +
    //         '&javax.faces.ViewState=' + viewState,
    //     signal: signal,
    // })
    //     .then(response => response.text())
    //     .then(text => {
    //         console.log(text);
    //     });


    // const text = await response.text();
    // let xml;
    // parseString(text, function (err, result) {
    //     xml = result;
    // });
    // console.log(xml);
    // const planning = xml['partial-response']['changes'][0]['update'][0]['_'];
    // console.log(planning);
}
