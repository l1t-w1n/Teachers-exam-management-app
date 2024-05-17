"""Module quiz"""
import secrets
from db import DB
from questions import load_question


def get_new_quizid():
    """Fonction qui génère un nouvel id de quiz"""
    new_quizid = secrets.token_hex(8)
    while load_quiz(new_quizid) is not None:
        new_quizid = secrets.token_hex(8)

    return new_quizid

class Quiz:
    """Objet quiz"""

    def __init__(self, name : str, uid: str):
        self.quizid = None
        self.name = name
        self.uid = uid

    def store(self):
        """Enregistre le quiz dans la DB"""
        if self.quizid is None:
            self.quizid = get_new_quizid()
            DB.execute('INSERT INTO Quiz(id, name, uid) VALUES (?, ?, ?)',
                       (self.quizid, self.name, self.uid))

        else:
            DB.execute('UPDATE Quiz SET name=? WHERE id=?',
                       (self.name, self.quizid))

        DB.commit()

    def exists(self):
        """Vérifie l'existence du quiz dans la DB"""
        res = DB.execute('SELECT * FROM Quiz WHERE id=?',
                         (self.quizid,)).fetchone()
        if res is not None:
            return True

        return False

    def delete(self):
        """Supprime le quiz de la DB"""
        if self.exists():
            DB.execute('DELETE FROM QuizQuestion WHERE quizid=?',
                       (self.quizid,))
            DB.execute('DELETE FROM Quiz WHERE id=?', (self.quizid,))
            DB.commit()

    def set_name(self, name: str):
        """Définit le nom"""
        self.name = name

    def add_question(self, qid: str):
        """Ajoute une question au quiz"""
        question = load_question(qid)
        if question is not None and question.uid == self.uid and not question_is_in_quiz(qid, self.quizid):
            DB.execute(
                'INSERT INTO QuizQuestion(quizid, qid) VALUES (?, ?)', (self.quizid, qid))
            DB.commit()

    def rem_question(self, qid: str):
        """Supprime une question du quiz"""
        if question_is_in_quiz(qid, self.quizid):
            DB.execute(
                'DELETE FROM QuizQuestion WHERE quizid=? AND qid=?', (self.quizid, qid))
            DB.commit()

    def rem_all_questions(self):
        """Supprime toutes les questions du quiz"""
        DB.execute(
            'DELETE FROM QuizQuestion WHERE quizid=?', (self.quizid,))
        DB.commit()


def load_quiz(quizid: str):
    """Retourne le quiz d'id quizid"""
    res = None
    if quizid is not None:
        res = DB.execute("SELECT * FROM Quiz WHERE id=?", (quizid,)).fetchone()

    if res is None:
        return None

    quizid, name, uid = res
    quiz = Quiz(name, uid)
    quiz.quizid = quizid
    return quiz


def load_quiz_list(uid: str):
    """Retourne la liste des quiz corréspondant
    à l'utilisateur d'id uid"""
    res = None
    if uid is not None:
        res = DB.execute("SELECT * FROM Quiz WHERE uid=?", (uid,)).fetchall()

    if res is None:
        return None

    quiz_list = []
    for row in res:
        quizid, name, uid = row
        quiz = Quiz(name, uid)
        quiz.quizid = quizid
        quiz_list.append(quiz)

    return quiz_list

def question_is_in_quiz(qid: str, quizid: str):
    """Verifie si la question d'id qid est dans le quiz d'id quizid"""
    if qid is None or quizid is None:
        return False

    res = DB.execute(
        "SELECT * FROM QuizQuestion WHERE quizid=? AND qid=?", (quizid, qid)).fetchone()
    if res is None:
        return False

    return True


def create_quiz_table():
    """Crée la table des Quiz"""
    DB.execute('''
    CREATE TABLE IF NOT EXISTS Quiz(
        id VARCHAR(16) PRIMARY KEY,
        name BIGTEXT,
        uid VARCHAR(16) REFERENCES Users(id)
    )
    ''')
    DB.commit()


def create_quizquestion_table():
    """Crée la table d'association quiz - question"""
    DB.execute('''
    CREATE TABLE IF NOT EXISTS QuizQuestion(
        quizid VARCHAR(16) REFERENCES Quiz(id),
        qid VARCHAR(16) REFERENCES Questions(id),
        PRIMARY KEY(quizid,qid)
    )
    ''')
    DB.commit()
