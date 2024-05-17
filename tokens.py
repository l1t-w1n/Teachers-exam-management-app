"""Module tokens"""
import time
from sqlite3 import OperationalError, DatabaseError
from db import DB


class Token:
    """Objet token"""

    def __init__(self, value: str, uid: str = None):
        self.value = value
        self.uid = uid

    def exists(self):
        """Vérifie l'existence d'un token dans la DB"""
        db_user = DB.execute(
            'SELECT uid FROM Tokens WHERE value=?', (self.value,)).fetchone()
        if db_user is not None:
            return True

        return False

    def delete(self):
        """Supprime le token de la DB"""
        if self.exists():
            DB.execute('DELETE FROM Tokens WHERE value=?', (self.value,))
            DB.commit()

    def is_valid(self):
        """Vérifie la validité du token"""
        res = DB.execute(
            'SELECT uid, time FROM Tokens WHERE value=?', (self.value,)).fetchone()
        if res is not None:
            db_user, db_time = res
            if self.uid is None or self.uid == db_user:
                self.uid = db_user
                if (time.time() - db_time) < 1800:
                    return True

                self.delete()

        return False

    def set_user(self, uid: str):
        """Définit l'utilisateur associé au token"""
        if not self.is_valid():
            self.uid = uid

    def update_time(self):
        """Actualise le token (30 min de validité à
        partir de l'actualisation)"""
        done = 0
        while not done:
            try:
                DB.execute('UPDATE Tokens SET time=? WHERE value=?',
                           (time.time(), self.value))
                DB.commit()
                done = 1

            except OperationalError:
                pass

            except DatabaseError:
                pass

    def store(self):
        """Enregistre le token dans la DB"""
        if not self.exists():
            DB.execute('INSERT INTO Tokens(uid, value, time) VALUES (?, ?, ?)',
                       (self.uid, self.value, time.time()))
            DB.commit()


def create_tokens_table():
    """Crée la table des tokens"""
    DB.execute('''
    CREATE TABLE IF NOT EXISTS Tokens(
        uid INT REFERENCES Users(id),
        value BIGTEXT PRIMARY KEY,
        time FLOAT
    )
    ''')
    DB.commit()
