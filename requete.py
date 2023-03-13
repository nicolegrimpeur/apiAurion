import requests
import datetime


def requetes(username, password):
    jsessionid = get_cookies_login()
    jsessionid = get_login(jsessionid["JSESSIONID"], username, password)
    view_state = get_view_state(jsessionid["JSESSIONID"])
    get_plannings(jsessionid["JSESSIONID"], view_state["ViewState"])


def get_jsessionid_from_response(response):
    if "JSESSIONID" in response.cookies:
        return response.cookies["JSESSIONID"]
    else:
        return None


def get_cookies_login():
    url = "https://aurion.junia.com/faces/Login.xhtml"
    response = requests.get(url)
    jsessionid = get_jsessionid_from_response(response)
    return {"JSESSIONID": jsessionid}


def get_login(jsessionid, username, password):
    url = "https://aurion.junia.com/faces/login"

    headers = {
        "Cookie": "JSESSIONID=" + jsessionid,
        "Content-Type": "application/x-www-form-urlencoded",
    }

    data = 'username=' + username + '&password=' + password + '&&j_idt28='

    response = requests.post(url, headers=headers, data=data)
    jsessionid = get_jsessionid_from_response(response)
    return {"JSESSIONID": jsessionid}


def get_view_state(jsessionid):
    url = "https://aurion.junia.com/"
    headers = {
        "Cookie": "JSESSIONID=" + jsessionid,
    }
    response = requests.get(url, headers=headers)

    response = response.text[response.text.find("javax.faces.ViewState"):]
    response = response[response.find("value=") + 7:]
    response = response[:response.find('"')]
    return {"ViewState": response}


from io import BytesIO, SEEK_SET, SEEK_END


class ResponseStream(object):
    def __init__(self, request_iterator):
        self._bytes = BytesIO()
        self._iterator = request_iterator

    def _load_all(self):
        self._bytes.seek(0, SEEK_END)
        for chunk in self._iterator:
            self._bytes.write(chunk)

    def _load_until(self, goal_position):
        current_position = self._bytes.seek(0, SEEK_END)
        while current_position < goal_position:
            try:
                current_position += self._bytes.write(next(self._iterator))
            except StopIteration:
                break

    def tell(self):
        return self._bytes.tell()

    def read(self, size=None):
        left_off_at = self._bytes.tell()
        if size is None:
            self._load_all()
        else:
            goal_position = left_off_at + size
            self._load_until(goal_position)

        self._bytes.seek(left_off_at)
        return self._bytes.read(size)

    def seek(self, position, whence=SEEK_SET):
        if whence == SEEK_END:
            self._load_all()
        else:
            self._bytes.seek(position, whence)


def get_plannings(jsessionid, viewstate):
    nb_semaines = 8

    dimanche_precedent = datetime.datetime.today() - datetime.timedelta(days=datetime.datetime.today().weekday())
    date_fin = dimanche_precedent + datetime.timedelta(days=nb_semaines * 7)

    premier_janvier = datetime.datetime(dimanche_precedent.year, 1, 1)
    nombre_jours = (dimanche_precedent - premier_janvier).days
    nombre_semaines = nombre_jours // 7 + 1

    url = "https://aurion.junia.com/faces/Planning.xhtml"
    headers = {
        "Cookie": "JSESSIONID=" + jsessionid,
        "Content-Type": "application/x-www-form-urlencoded",
    }
    data = 'javax.faces.partial.ajax=true' \
           '&javax.faces.source=form:j_idt117' \
           '&javax.faces.partial.execute=form:j_idt117' \
           '&javax.faces.partial.render=form:j_idt117' \
           '&form:j_idt117=form:j_idt117'
    data.join('&form:j_idt117_start=' + str(int(dimanche_precedent.timestamp() * 1000)))
    data.join('&form:j_idt117_end=' + str(int(date_fin.timestamp() * 1000)))
    data.join('&form=form')
    data.join('&form:largeurDivCenter=')
    data.join('&form:idInit=webscolaapp.Planning_31062438843074729')
    data.join('&form:date_input=' + dimanche_precedent.strftime("%d/%m/%Y"))
    data.join('&form:week=' + str(nombre_semaines) + '-' + str(dimanche_precedent.year))
    data.join('&form:j_idt117_view=agendaWeek')
    data.join('&form:offsetFuseauNavigateur=-3600000')
    data.join('&form:onglets_activeIndex=0')
    data.join('&form:onglets_scrollState=0')
    data.join('&form:j_idt237_focus=')
    data.join('&form:j_idt237_input=46623')
    data.join('&javax.faces.ViewState=' + viewstate)

    response = requests.post(url, headers=headers, data=data, stream=True)
    stream = ResponseStream(response.iter_content(64))
    stream.read(100)
    print(stream.tell())

    # print(response.text)
    # print(response.status_code)


if __name__ == "__main__":
    requetes("nicolas.barrat@student.junia.com", "/ZTcI3IL")
