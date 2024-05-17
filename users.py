"""Module utilisateurs"""
import secrets
from db import DB
from tokens import Token


def get_new_uid():
    """Fonction qui génère un nouvel id d'utilisateur"""
    new_uid = secrets.token_hex(8)
    while load_user(uid=new_uid) is not None:
        new_uid = secrets.token_hex(8)

    return new_uid


class User:
    """Objet utilisateur"""

    def __init__(self, first_name: str, last_name: str, identifier: str, password: str):
        self.uid = None
        self.first_name = first_name
        self.last_name = last_name
        self.identifier = identifier
        self.password = password

    def store(self, update: bool = False):
        """Enregistre l'utilisateur dans la DB"""
        if self.uid is None:
            if load_user(identifier=self.identifier) is None:
                self.uid = get_new_uid()
                DB.execute('INSERT INTO Users(id, first_name, last_name, identifier, password) VALUES (?, ?, ?, ?, ?)',
                           (self.uid, self.first_name, self.last_name, self.identifier, self.password))
                DB.commit()

        else:
            if update and (load_user(identifier=self.identifier) is None or load_user(identifier=self.identifier).uid == self.uid):
                DB.execute('UPDATE Users SET identifier = ?, first_name = ?, last_name = ?, password = ? WHERE id = ?',
                           (self.identifier, self.first_name, self.last_name, self.password, self.uid))
                DB.commit()

    def get_token(self):
        """Renvoie le token associé à l'utilisateur"""
        token = DB.execute(
            'SELECT value FROM Tokens WHERE uid=?', (self.uid,)).fetchone()

        if token is not None:
            token = Token(token[0], self.uid)

        return token


def load_user(uid: str = None, identifier: str = None):
    """Renvoie l'utilisateur correspondant à l'id uid
    ou à l'identifiant identifier"""
    if uid is None and identifier is None:
        return None

    if uid is not None:
        res = DB.execute("SELECT * FROM Users WHERE id=?", (uid,)).fetchone()

    else:
        res = DB.execute("SELECT * FROM Users WHERE identifier=?",
                         (identifier,)).fetchone()

    if res is None:
        return None

    uid, first_name, last_name, identifier, password = res
    user = User(first_name, last_name, identifier, password)
    user.uid = uid
    return user


def load_users_list():
    """Renvoie la liste de tous les utilisateurs"""
    res = DB.execute("SELECT * FROM Users", ()).fetchall()

    if res is None:
        return None

    users_list = []
    for row in res:
        uid, first_name, last_name, identifier, password = row
        user = User(first_name, last_name, identifier, password)
        user.uid = uid
        users_list.append(user)

    return users_list


def create_users_table():
    """Crée la table des utilisateurs"""
    cursor = DB.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Users(
            id VARCHAR(16) PRIMARY KEY,
            first_name VARCHAR(32),
            last_name VARCHAR(32),
            identifier VARCHAR(128) UNIQUE,
            password VARCHAR(128)
        )
    ''')
    DB.commit()
