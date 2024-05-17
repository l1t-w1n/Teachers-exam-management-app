"""Module tags"""
import secrets
from db import DB
from questions import load_question


def get_new_tid():
    """Fonction qui génère un nouvel id de tag"""
    new_tid = secrets.token_hex(8)
    while load_tag(tid=new_tid) is not None:
        new_tid = secrets.token_hex(8)

    return new_tid


class Tag:
    """Objet tag"""

    def __init__(self, name: str, uid: str):
        self.tid = None
        self.name = name
        self.uid = uid

    def store(self):
        """Sauvegarde le tag dans la DB"""
        if self.tid is None:
            self.tid = get_new_tid()
            DB.execute('INSERT INTO Tags(id, name, uid) VALUES (?, ?, ?)',
                       (self.tid, self.name, self.uid))

        else:
            DB.execute('UPDATE Tags SET name=? WHERE id=?',
                       (self.name, self.tid))

        DB.commit()

    def exists(self):
        """Teste l'existence de la réponse dans la DB"""
        res = DB.execute('SELECT * FROM Tags WHERE id=?',
                         (self.tid,)).fetchone()
        if res is not None:
            return True

        return False

    def delete(self):
        """Supprime le tag de la DB"""
        if self.exists():
            self.rem_all_questions()
            DB.execute('DELETE FROM Tags WHERE id=?', (self.tid,))
            DB.commit()

    def add_question(self, qid: str):
        """Ajoute une question au tag"""
        question = load_question(qid)
        if question is not None and question.uid == self.uid and not question_is_in_tag(qid, self.tid):
            DB.execute(
                'INSERT INTO TagQuestion(tid, qid) VALUES (?, ?)', (self.tid, qid))
            DB.commit()

    def rem_question(self, qid: str):
        """Supprime une question du tag"""
        if question_is_in_tag(qid, self.tid):
            DB.execute(
                'DELETE FROM TagQuestion WHERE tid=? AND qid=?', (self.tid, qid))
            DB.commit()

    def rem_all_questions(self):
        """Supprime toutes les questions du tag"""
        DB.execute(
            'DELETE FROM TagQuestion WHERE tid=?', (self.tid,))
        DB.commit()


def load_tag(tid: str = None, tname: str = None):
    """Retourne le tag d'id tid"""
    res = None
    if tid is not None:
        res = DB.execute("SELECT * FROM Tags WHERE id=?", (tid,)).fetchone()

    elif tname is not None:
        res = DB.execute("SELECT * FROM Tags WHERE name=?", (tname)).fetchone()

    else:
        return None

    if res is None:
        return None

    tid, name, uid = res
    tag = Tag(name, uid)
    tag.tid = tid
    return tag


def load_tags_list(uid: str = None, qid: str = None):
    """Retourne la liste des tag corréspondant à l'utilisateur
    d'id uid ou à la question d'id qid"""
    if uid is None and qid is None:
        return None

    if uid is not None:
        res = DB.execute("SELECT * FROM Tags WHERE uid=?", (uid,)).fetchall()

    else:
        res = DB.execute("SELECT t.id, t.name, t.uid FROM Tags t INNER JOIN TagQuestion tq ON t.id=tq.tid WHERE tq.qid=?", (qid,)).fetchall()

    if res is None:
        return None

    tag_list = []
    for row in res:
        tid, name, uid = row
        tag = Tag(name, uid)
        tag.tid = tid
        tag_list.append(tag)

    return tag_list


def question_is_in_tag(qid: str, tid: str):
    """Verifie si la question d'id qid est dans le tag d'id tid"""
    if qid is None or tid is None:
        return False

    res = DB.execute(
        "SELECT * FROM TagQuestion WHERE tid=? AND qid=?", (tid, qid)).fetchone()
    if res is None:
        return False

    return True


def create_tags_table():
    """Crée la table des tags"""
    DB.execute('''
    CREATE TABLE IF NOT EXISTS Tags(
        id VARCHAR(16) PRIMARY KEY,
        name BIGTEXT,
        uid VARCHAR(16) REFERENCES Users(id)
    )
    ''')
    DB.commit()


def create_tagquestion_table():
    """Crée la table d'association tag - question"""
    DB.execute('''
    CREATE TABLE IF NOT EXISTS TagQuestion(
        tid VARCHAR(16) REFERENCES Tag(id),
        qid VARCHAR(16) REFERENCES Questions(id),
        PRIMARY KEY(tid,qid)
    )
    ''')
    DB.commit()
