"""Module sessions"""
import secrets
import json
import time
from db import DB
from answers import load_answer
from questions import load_questions_list
from users import load_user

STATES_LIST = ['crea', 'qstn', 'wait', 'show', 'end']


def get_time():
    """Retourne le marqueur de temps actuel
    sous forme YYYYmmddHHMMSS"""
    return time.strftime("%Y%m%d%H%M%S")


def get_new_sid():
    """Fonction qui génère un nouvel id de session"""
    new_sid = secrets.token_hex(4)
    while load_session(sid=new_sid) is not None:
        new_sid = secrets.token_hex(4)  # 4 bytes -> 8 caractères

    return new_sid


class Session:
    """Objet session"""

    def __init__(self, quizid: str, uid: str, socket_id, stype: str = "quiz"):
        self.sid = None
        self.quizid = None
        if stype == 'quiz':
            self.quizid = quizid

        self.uid = uid
        self.state = "crea"
        self.openqid = None
        if stype == 'question':
            self.openqid = quizid

        self.connected = {}
        self.history = {
                        'created': get_time(),
                        'user_sid': socket_id,
                        'connected': {},
                        'disconnected': {},
                        'answered': {},
                        'states': {},
                        'questions': {}
                       }

    def store(self):
        """Enregistre la session dans la DB"""
        if self.sid is None:
            self.sid = get_new_sid()
            DB.execute('INSERT INTO Sessions(id, quizid, uid, state, openqid, history) VALUES (?, ?, ?, ?, ?, ?)',
                       (self.sid, self.quizid, self.uid, self.state, self.openqid, json.dumps(self.history)))
            DB.commit()

        else:
            DB.execute('UPDATE Sessions SET id = ?, quizid = ?, uid = ?, state = ?, openqid = ?, history = ? WHERE id = ?',
                       (self.sid, self.quizid, self.uid, self.state, self.openqid, json.dumps(self.history), self.sid))
            DB.commit()

    def get_actual_qnum(self):
        """Renvoie le numéro de la question actuelle"""
        if self.quizid is not None:
            cnt = 1
            for question in load_questions_list(quizid=self.quizid):
                if question.qid == self.openqid:
                    return cnt

                cnt += 1

        return 1

    def get_question_num(self):
        """Renvoie le nombre de questions du quiz associé"""
        if self.quizid is not None:
            return len(load_questions_list(quizid=self.quizid))

        return 1

    def change_state(self, override_state: str = None):
        """Passe à l'état suivant ou à celui indiqué"""
        if self.state == 'end':
            return

        old_state = self.state
        if override_state is not None and override_state in STATES_LIST:
            self.state = override_state

        else:
            next_index = (STATES_LIST.index(self.state) + 1) % (len(STATES_LIST) - 1)
            if next_index == 0:
                next_index = 1

            self.state = STATES_LIST[next_index]

        if self.state == 'qstn':
            if self.quizid is not None:
                old_qid = self.openqid
                questions = load_questions_list(quizid=self.quizid)
                is_next = False
                if self.openqid is None:
                    self.openqid = questions[0].qid

                else:
                    for question in questions:
                        if is_next:
                            self.openqid = question.qid
                            is_next = False
                            break

                        if self.openqid == question.qid:
                            is_next = True

                if is_next:
                    self.state = 'end'

                else:
                    self.history['questions'][self.openqid] = {'before': old_qid, 'time': get_time()}

            else:
                if 'qstn' in self.history['states']:
                    self.state = 'end'

        self.history['states'][self.state] = {'before': old_state, 'time': get_time()}

        self.store()

    def student_connect(self, uid: str, socket_id: str):
        """Connecte un élève à la session"""
        user = load_user(uid)
        if user is not None and user.identifier not in self.connected:
            self.connected[user.identifier] = socket_id
            DB.execute('INSERT INTO StudentSession(sid, identifier, socketid) VALUES (?, ?, ?)',
                       (self.sid, user.identifier, socket_id))
            DB.commit()
            if not user.identifier in self.history['connected']:
                self.history['connected'][user.identifier] = []

            self.history['connected'][user.identifier].append(get_time())
            self.store()

    def student_disconnect(self, uid: str):
        """Déconnecte un élève de la session"""
        user = load_user(uid=uid)
        if user.identifier in self.connected:
            self.connected.pop(user.identifier)
            DB.execute(
                'DELETE FROM StudentSession WHERE sid=? AND identifier=?', (self.sid, user.identifier))
            DB.commit()
            if not user.identifier in self.history['disconnected']:
                self.history['disconnected'][user.identifier] = []

            self.history['disconnected'][user.identifier].append(get_time())
            self.store()

    def can_answer(self, uid: str):
        """Vérifie si un utilisateur donné peut répondre"""
        user = load_user(uid=uid)
        if user.identifier in self.connected:
            answered = self.history['answered']
            return not (user.identifier in answered and self.openqid in answered[user.identifier])

        return False

    def student_answer(self, uid: str, rid: str, value: bool | int):
        """Enregistre une nouvelle réponse d'un utilisateur"""
        answer = load_answer(rid)
        user = load_user(uid=uid)
        if answer.qid == self.openqid:
            try:
                self.history['answered'][user.identifier][answer.qid][rid] = value

            except KeyError:
                try:
                    self.history['answered'][user.identifier][answer.qid] = {rid: value}

                except KeyError:
                    self.history['answered'][user.identifier] = {answer.qid: {rid: value}}

            self.store()


def load_session(sid: str = None):
    """Renvoie la session correspondant à l'id sid"""
    res = None
    if sid is not None:
        res = DB.execute("SELECT * FROM Sessions WHERE id=?",
                         (sid,)).fetchone()

    if res is None:
        return None

    sid, quizid, uid, state, openqid, history = res

    res = DB.execute(
        "SELECT identifier, socketid FROM StudentSession WHERE sid=?", (sid,)).fetchall()

    connected = {}
    for row in res:
        connected[row[0]] = row[1]

    history = json.loads(history)
    if quizid is None:
        session = Session(quizid, uid, history['user_sid'], "question")

    else:
        session = Session(quizid, uid, history['user_sid'])

    session.sid = sid
    session.state = state
    session.openqid = openqid
    session.connected = connected
    session.history = history
    return session


def load_sessions_list(uid: str = None):
    """Renvoie la liste de sessions correspondant à
    l'utilisateur d'id uid ou toutes les sessions"""
    res = None
    if uid is not None:
        res = DB.execute("SELECT * FROM Sessions WHERE uid=?",
                         (uid,)).fetchall()

    else:
        res = DB.execute("SELECT * FROM Sessions").fetchall()

    if res is None:
        return None

    sessions_list = []
    for row in res:
        sid, quizid, uid, state, openqid, history = row

        res2 = DB.execute(
            "SELECT identifier, socketid FROM StudentSession WHERE sid=?", (sid,)).fetchall()

        connected = {}
        for row2 in res2:
            connected[row2[0]] = row2[1]

        history = json.loads(history)
        if quizid is None:
            session = Session(quizid, uid, history['user_sid'], "question")

        else:
            session = Session(quizid, uid, history['user_sid'])

        session.sid = sid
        session.state = state
        session.openqid = openqid
        session.connected = connected
        session.history = history
        sessions_list.append(session)

    return sessions_list


def create_sessions_table():
    """Crée la table des sessions"""
    DB.execute('''
    CREATE TABLE IF NOT EXISTS Sessions(
        id VARCHAR(16) PRIMARY KEY,
        quizid VARCHAR(16) REFERENCES Quiz(id),
        uid VARCHAR(16) REFERENCES Users(id),
        state VARCHAR(4),
        openqid VARCHAR(16) REFERENCES Questions(id),
        history BIGTEXT
    )
    ''')
    DB.commit()


def create_studentsession_table():
    """Crée la table d'association élève - session"""
    DB.execute('''
    CREATE TABLE IF NOT EXISTS StudentSession(
        sid VARCHAR(8) REFERENCES Sessions(id),
        identifier VARCHAR(128) REFERENCES Users(identifier),
        socketid BIGTEXT,
        PRIMARY KEY(sid,identifier)
    )
    ''')
    DB.commit()
