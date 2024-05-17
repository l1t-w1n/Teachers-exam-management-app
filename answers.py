"""Module réponse"""
import secrets
from db import DB
from questions import load_question


def get_new_rid():
    """Fonction qui génère un nouvel id de réponse"""
    new_rid = secrets.token_hex(8)
    while load_answer(new_rid) is not None:
        new_rid = secrets.token_hex(8)

    return new_rid


class Answer:
    """Objet réponse"""

    def __init__(self, statement: str, value: bool, qid: str, uid: str):
        self.rid = None
        self.statement = statement
        self.value = value
        self.qid = qid
        self.uid = uid

    def store(self):
        """Enregistre la réponse dans la DB"""
        if self.rid is None:
            self.rid = get_new_rid()
            DB.execute('INSERT INTO Answers(id, statement, value, qid, uid) VALUES (?, ?, ?, ?, ?)',
                       (self.rid, self.statement, self.value, self.qid, self.uid))

        else:
            DB.execute('UPDATE Answers SET statement=?, value=?, uid=? WHERE id=?',
                       (self.statement, self.value, self.uid, self.rid))

        DB.commit()

    def exists(self):
        """Vérifie l'existence de la réponse dans la DB"""
        res = DB.execute('SELECT * FROM Answers WHERE id=?',
                         (self.rid,)).fetchone()
        if res is not None:
            return True

        return False

    def delete(self):
        """Supprime la réponse de la DB"""
        if self.exists():
            DB.execute('DELETE FROM Answers WHERE id=?', (self.rid,))
            DB.commit()

    def get_question(self):
        """Renvoie la question associée à la réponse"""
        return load_question(self.qid)

    def set_question(self, qid: str):
        """Définit la question associée à la réponse"""
        if self.qid is None:
            self.qid = qid

    def set_value(self, value: bool):
        """Définit la valeur (vraie ou fausse) de la réponse"""
        self.value = value


def load_answer(rid: str):
    """Charge la réponse d'id rid"""
    res = None
    if rid is not None:
        res = DB.execute("SELECT * FROM Answers WHERE id=?", (rid,)).fetchone()

    if res is None:
        return None

    rid, statement, value, qid, uid = res
    answer = Answer(statement, value, qid, uid)
    answer.rid = rid
    return answer


def load_answers_list(qid: str):
    """Retourne la liste des réponses corréspondant
    à la question d'id qid"""
    res = None
    if qid is not None:
        res = DB.execute("SELECT * FROM Answers WHERE qid=?",
                         (qid,)).fetchall()

    if res is None:
        return None

    a_list = []
    for row in res:
        rid, statement, value, qid, uid = row
        answer = Answer(statement, value, qid, uid)
        answer.rid = rid
        a_list.append(answer)

    return a_list


def create_answers_table():
    """Crée la table des réponses"""
    DB.execute('''
    CREATE TABLE IF NOT EXISTS Answers(
        id VARCHAR(16) PRIMARY KEY,
        statement BIGTEXT,
        value BOOLEAN,
        qid VARCHAR(16) REFERENCES Questions(id),
        uid VARCHAR(16) REFERENCES Users(id)
    )
    ''')
    DB.commit()
