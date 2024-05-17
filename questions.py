"""Module questions"""
import secrets
from db import DB


def get_new_qid():
    """Fonction qui génère un nouvel id de question"""
    new_qid = secrets.token_hex(8)
    while load_question(new_qid) is not None:
        new_qid = secrets.token_hex(8)

    return new_qid


class Question:
    """Objet question"""

    def __init__(self, statement: str, qtype: str, uid: str):
        self.qid = None
        self.statement = statement
        self.qtype = qtype
        self.uid = uid

    def store(self):
        """Enregistre la question dans la DB"""
        if self.qid is None:
            self.qid = get_new_qid()
            DB.execute('INSERT INTO Questions(id, statement, type, uid) VALUES(?, ?, ?, ?)',
                       (self.qid, self.statement,self.qtype, self.uid))

        else:
            DB.execute('UPDATE Questions SET statement=? WHERE id=?',
                       (self.statement, self.qid))

        DB.commit()

    def exists(self):
        """Vérifie l'existence de la réponse dans la DB"""
        res = DB.execute('SELECT * FROM Questions WHERE id=?',
                         (self.qid,)).fetchone()
        if res is not None:
            return True

        return False

    def delete(self):
        """Supprime la question de la DB"""
        if self.exists():
            DB.execute('DELETE FROM Answers WHERE qid=?', (self.qid,))
            DB.execute('DELETE FROM Questions WHERE id=?', (self.qid,))
            DB.commit()

    def set_statement(self, statement: str):
        """Définit l'enoncé"""
        self.statement = statement


def load_question(qid: str):
    """Renvoie la question correspondant à l'id qid"""
    res = None
    if qid is not None:
        res = DB.execute("SELECT * FROM Questions WHERE id=?",
                         (qid,)).fetchone()

    if res is None:
        return None

    qid, statement, qtype, uid = res
    question = Question(statement, qtype, uid)
    question.qid = qid
    return question


def load_questions_list(uid: str = None, tid: str = None, quizid: str = None):
    """Retourne la liste des questions corréspondant
    à l'utilisateur d'id uid ou au tag d'id tid"""
    if uid is None and tid is None and quizid is None:
        return None

    if uid is not None:
        res = DB.execute(
            "SELECT * FROM Questions WHERE uid=?", (uid,)).fetchall()

    elif tid is not None:
        res = DB.execute(
            "SELECT q.id, q.statement, q.type, q.uid FROM Questions q INNER JOIN TagQuestion tq ON q.id=tq.qid WHERE tq.tid=?", (tid,)).fetchall()

    else:
        res = DB.execute(
            "SELECT q.id, q.statement, q.type, q.uid FROM Questions q INNER JOIN QuizQuestion qq ON q.id=qq.qid WHERE qq.quizid=?", (quizid,)).fetchall()

    if res is None:
        return None

    q_list = []
    for row in res:
        qid, statement, qtype, uid = row
        question = Question(statement, qtype, uid)
        question.qid = qid
        q_list.append(question)

    return q_list


def create_questions_table():
    """Crée la table des questions"""
    DB.execute('''
    CREATE TABLE IF NOT EXISTS Questions(
        id VARCHAR(16) PRIMARY KEY,
        statement BIGTEXT,
        type CHAR(3),
        uid VARCHAR(16) REFERENCES Users(id)
    )
    ''')
    DB.commit()
