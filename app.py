"""Fichier serveur du projet"""
import hashlib
import secrets
import re
from flask_socketio import SocketIO, emit
from flask import Flask, request, render_template, redirect, make_response
from tokens import create_tokens_table, Token
from users import create_users_table, load_user, User, load_users_list
from answers import create_answers_table, load_answer, load_answers_list, Answer
from questions import create_questions_table, load_question, load_questions_list, Question
from tags import create_tags_table, create_tagquestion_table, load_tag, load_tags_list, Tag
from quizs import create_quiz_table, create_quizquestion_table, load_quiz, load_quiz_list, Quiz
from sessions import create_sessions_table, create_studentsession_table, load_session, load_sessions_list, Session


# <-----------------------------------> #
# <----- Configurations diverses -----> #


MAIL_REGEX = re.compile(
    r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$")

app = Flask(__name__)
app.config['SECRET_KEY'] = secrets.token_hex(6)
socketio = SocketIO(app, cors_allowed_origins="*", logger=True)

create_users_table()
create_tokens_table()
create_questions_table()
create_answers_table()
create_tags_table()
create_tagquestion_table()
create_quiz_table()
create_quizquestion_table()
create_sessions_table()
create_studentsession_table()


# <-----------------------------------> #
# <-----------------------------------> #

# <-----------------------------------> #
# <------- Panel des fonctions -------> #


def get_new_token():
    """Fonction qui génère un nouveau token de connexion"""
    token = Token(secrets.token_urlsafe(20))
    while token.exists():  # Tant que le token n'est pas unique, on en regénère un
        token = Token(secrets.token_urlsafe(20))

    return token


def get_new_quiz_session():
    """Fonction qui génère une nouvelle session de quiz"""
    sid = secrets.token_hex(4) # 4 bytes (1 byte => 2 caractères du token)

    return sid


def token_valid(value: str, uid: str):
    """Vérifie la validité d'un token et met à jour son temps de connexion"""
    if not (value is None or uid is None):
        token = Token(value, uid)
        if token.is_valid():
            token.update_time()
            return True

    return False


def is_prof(user):
    """Vérifie si l'utilisateur user est un professeur"""
    if re.match(MAIL_REGEX, user.identifier):
        return True

    return False


def get_auth_level(uid: str, token: str):
    """Retourne le niveau d'autorisation"""
    user = load_user(uid=uid)
    if user is not None and token_valid(token, uid):
        if is_prof(user):
            return 2

        return 1

    return 0


def is_data_good_type(data, data_type: type):
    """Détermine si la variable data est de type data_type"""
    if not (data is None or data_type is None):
        return isinstance(data, data_type)

    return True


def data_has_required(data, required_data):
    """Détermine si la variable data est bien formée"""
    if not (data is None or required_data is None):
        return not any(arg not in data for arg in required_data)

    return True

def sio_auth_access(required_level: int = 0, uid: str = None, connection_token: str = None, data = None, required_data: list | dict = None, data_type: type = dict):
    """Détermine si l'accès est autorisé au socket en fonction
    des paramètres"""
    if get_auth_level(uid, connection_token) < required_level:
        return False, {
                       'type': 'auth',
                       'message': 'Niveau d\'autorisation insuffisant'
                      }

    if not (is_data_good_type(data, data_type) and data_has_required(data, required_data)):
        return False, {
                       'type': 'format',
                       'message': 'Erreur en essayant de décoder le message'
                      }

    return True, {}


# <-----------------------------------> #
# <-----------------------------------> #

# <-----------------------------------> #
# <---------- Routes  Flask ----------> #


@app.route("/word-cloud")
def word_cloud():
    """Page de tests pour partie 3"""
    return render_template("word-cloud.html")


@app.route("/elements")
def elements():
    """Page des éléments"""
    return render_template("elements.html")


@app.route("/")
def index():
    """Page d'accueil"""
    return render_template("index.html")


@app.route("/disconnect")
def disconnect():
    """Déconnexion d'un utilisateur"""
    if get_auth_level(request.cookies.get('uid'), request.cookies.get('connection_token')) > 0:
        Token(request.cookies.get('connection_token'),
              request.cookies.get('uid')).delete()

    resp = make_response(redirect('/'))
    resp.delete_cookie('connection_token')
    resp.delete_cookie('uid')
    return resp


@app.route("/login")
def login_get():
    """Page de connexion"""
    if get_auth_level(request.cookies.get('uid'), request.cookies.get('connection_token')) > 0:
        return redirect('/')

    return render_template("login.html")


@app.route("/register")
def register_get():
    """Page de création de compte"""
    if get_auth_level(request.cookies.get('uid'), request.cookies.get('connection_token')) > 0:
        return redirect('/')

    return render_template("register.html")


@app.route("/register-student")
def register_student():
    """Inscription des étudiants"""
    if get_auth_level(request.cookies.get('uid'), request.cookies.get('connection_token')) < 2:
        return redirect('/login?from=other')
    return render_template("register-student.html")


@app.route("/question")
def question_get():
    """Page d'ajout ou de modification des questions"""
    if get_auth_level(request.cookies.get('uid'), request.cookies.get('connection_token')) < 2:
        return redirect('/login?from=other')

    data = request.args
    action = data.get('action')
    if action is None or action not in ["create", "modify"]:
        return redirect("/")

    return render_template("question.html")


@app.route("/account")
def account_get():
    """Page de paramètres du compte"""
    if get_auth_level(request.cookies.get('uid'), request.cookies.get('connection_token')) < 1:
        return redirect('/login?from=other')

    user = load_user(uid=request.cookies.get('uid'))

    return render_template("account.html",
                           name=user.last_name.upper() + " " + user.first_name,
                           last_name=user.last_name,
                           first_name=user.first_name,
                           identifier=user.identifier
                           )


@app.route('/quiz')
def quiz_get():
    """Affichage des quizs"""
    if get_auth_level(request.cookies.get('uid'), request.cookies.get('connection_token')) < 2:
        return redirect('/login?from=other')

    data = request.args
    action = data.get('action')
    if action is None or action not in ["create", "modify"]:
        return redirect("/")

    return render_template("quiz.html")


@app.route('/subject')
def subject_get():
    """Affichage des questions num (à changer)"""
    if get_auth_level(request.cookies.get('uid'), request.cookies.get('connection_token')) < 2:
        return redirect('/login?from=other')

    return render_template("subject.html")


@app.route('/join')
def join_get():
    """Page de connexion à une session côté étudiant"""
    if get_auth_level(request.cookies.get('uid'), request.cookies.get('connection_token')) < 1:
        return redirect('/login?from=other')

    return render_template("join.html")


@app.route("/team")
def team_get():
    """Présentation de l'équipe"""
    return render_template("team.html")


@app.route("/session")
def session_create_get():
    """Affichage session"""
    if get_auth_level(request.cookies.get('uid'), request.cookies.get('connection_token')) < 1:
        return redirect('/login?from=other')

    data = request.args
    if 'sid' not in data:
        return redirect("/")

    return render_template("session.html")

@app.route("/statistiques")
def statistiques():
    """Affichage statistiques d'une session"""
    if get_auth_level(request.cookies.get('uid'), request.cookies.get('connection_token')) < 1:
        return redirect('/login?from=other')

    data = request.args
    if 'sid' not in data:
        return redirect("/")

    return render_template("statistiques.html")


@app.route("/about")
def about_get():
    """À propos"""
    return render_template("about.html")


@app.route("/consult-question")
def consult_get():
    """Page de consultation des questions"""
    if get_auth_level(request.cookies.get('uid'), request.cookies.get('connection_token')) < 2:
        return redirect('/login?from=other')

    return render_template("consult-question.html")


@app.route("/consult-quiz")
def consult2_get():
    """Page de consultation des quiz"""
    if get_auth_level(request.cookies.get('uid'), request.cookies.get('connection_token')) < 2:
        return redirect('/login?from=other')

    return render_template("consult-quiz.html")


@app.errorhandler(404)
def page_not_found(error):
    """Page en cas d'erreur 404"""
    print(error)
    return render_template('404.html'), 404


# <-----------------------------------> #
# <-----------------------------------> #

# <-----------------------------------> #
# <--------- Routes SocketIO ---------> #


@socketio.on('get-auth-level')
def get_auth_level_sio():
    """Envoie au client son niveau d'autorisation"""
    emit(
         'auth-level',
         {'level': get_auth_level(request.cookies.get('uid'),
                                       request.cookies.get('connection_token'))},
         to=request.sid
        )


@socketio.on('login')
def login_sio(data):
    """Un client demande une connexion à un compte"""
    required = ['identifier', 'password']
    access_granted, return_value = sio_auth_access(data=data, required_data=required)

    if not access_granted:
        emit('server-error', return_value, to=request.sid)
        return

    identifier = data['identifier']
    user = load_user(identifier=identifier)
    password = hashlib.sha256(data['password'].encode('utf-8')).hexdigest()
    if user is not None and user.password == password:
        token = user.get_token()
        if token is None or not token.is_valid():
            token = get_new_token()
            token.set_user(user.uid)
            token.store()

        else:
            token.update_time()

        emit('update-cookies', {'token': token.value,'uid': user.uid}, to=request.sid)
        emit('redirect', {'location': '/'}, to=request.sid)
        return

    emit('login-fail', {'message': 'Mauvais identifiant ou mot de passe'}, to=request.sid)


@socketio.on('register')
def register_sio(data):
    """Un client demande un enregistrement de compte"""
    required = {
                'identifier': "identifiant",
                'password': "mot de passe",
                'last_name': "nom",
                'first_name': "prénom"
               }

    access_granted, return_value = sio_auth_access(data=data, required_data=required)

    if not access_granted:
        emit('server-error', return_value, to=request.sid)
        return

    for key, val in data.items():
        if val == "":
            emit(
                 'register-fail',
                 {'message': "Votre " + required[key] + " ne peut pas être vide"},
                 to=request.sid
                )

    identifier = data['identifier'].lower()
    if not re.match(MAIL_REGEX, identifier):
        emit(
             'register-fail',
             {'message': 'L\'identifiant doit être un email valide'},
             to=request.sid
            )
        return

    if load_user(identifier=identifier) is not None:
        emit('register-fail', {'message': 'Email déjà utilisé'}, to=request.sid)
        return

    if len(data['password']) < 9:
        emit(
             'register-fail',
             {'message': "Le mot de passe doit faire plus de 8 caractères"},
             to=request.sid
            )

    password = hashlib.sha256(data['password'].encode('utf-8')).hexdigest()
    first_name = data['first_name']
    last_name = data['last_name']

    user = User(first_name, last_name, identifier, password)
    user.store()

    emit('redirect', {'location': '/login', 'parameters': {'from': 'register'}}, to=request.sid)


@socketio.on('get-students-list')
def get_students_list_sio():
    """Renvoie la liste des étudiants"""
    u_list = load_users_list()
    s_list = []
    for user in u_list:
        if not is_prof(user):
            s_list.append({'identifier': user.identifier, 'uid': user.uid})

    emit('students-list', s_list , to=request.sid)


@socketio.on('register-student')
def register_student_sio(data):
    """Un client demande un enregistrement de compte étudiant"""
    required = {
                'identifier': "identifiant",
                'password': "mot de passe",
                'last_name': "nom",
                'first_name': "prénom"
               }

    access_granted, return_value = sio_auth_access(2, request.cookies.get('uid'), request.cookies.get('connection_token'), data, required)

    if not access_granted:
        emit('server-error', return_value, to=request.sid)
        return

    identifier = data['identifier']

    if load_user(identifier=identifier) is not None:
        emit(
             'register-fail',
             {'message': 'Étudiant ' + identifier + ' déjà inscrit'},
             to=request.sid
            )
        return

    password = hashlib.sha256(data['password'].encode('utf-8')).hexdigest()
    first_name = data['first_name']
    last_name = data['last_name']

    user = User(first_name, last_name, identifier, password)
    user.store()
    emit('register-done', {'message': 'Étudiant ' + identifier + ' inscrit'}, to=request.sid)


@socketio.on("modify-account")
def modify_account_sio(data):
    """Changement des paramètres utilisateur"""
    required = {
                'identifier': "identifiant",
                'password': "mot de passe",
                'last_name': "nom",
                'first_name': "prénom"
               }

    access_granted, return_value = sio_auth_access(1, request.cookies.get('uid'), request.cookies.get('connection_token'), data, required)

    if not access_granted:
        emit('server-error', return_value, to=request.sid)
        return

    user = load_user(uid=request.cookies.get('uid'))
    user_lvl = get_auth_level(request.cookies.get('uid'), request.cookies.get('connection_token'))
    identifier = user.identifier
    if user_lvl == 2:
        identifier = data['identifier'].lower()
        if not re.match(MAIL_REGEX, identifier):
            emit(
                 'account-modification-fail',
                 {'message': 'L\'identifiant doit être un email valide'},
                 to=request.sid
                )
            return

        user2 = load_user(identifier=identifier)
        if user2 is not None and user.uid != user2.uid:
            emit(
                 'account-modification-fail',
                 {'message': 'Identifiant déjà utilisé'},
                 to=request.sid
                )
            return

    for key, val in data.items():
        if val == "":
            emit(
                 'account-modification-fail',
                 {'message': "Votre " + required[key] + " ne peut pas être vide"},
                 to=request.sid
                )

    if user.password == hashlib.sha256(data['password'].encode('utf-8')).hexdigest():
        user.first_name = data['first_name']
        user.last_name = data['last_name']
        user.identifier = identifier
        if 'new_password' in data:
            if len(data['new_password']) < 9:
                emit(
                     'account-modification-fail',
                     {'message': "Le mot de passe doit faire plus de 8 caractères"},
                     to=request.sid
                    )

            user.password = hashlib.sha256(
                data['new_password'].encode('utf-8')).hexdigest()

        user.store(1)
        return

    emit('account-modification-fail', {'message': 'Mauvais mot de passe'}, to=request.sid)


@socketio.on('get-answer')
def get_answer_sio(data):
    """Renvoie une réponse en fonction de l'id indiqué"""
    required = ['rid']
    access_granted, return_value = sio_auth_access(2, request.cookies.get('uid'), request.cookies.get('connection_token'), data, required)

    if not access_granted:
        emit('server-error', return_value, to=request.sid)
        return

    answer = load_answer(rid=data['rid'])
    if answer is None or answer.uid != request.cookies.get('uid'):
        emit('server-error', {
                              'type': 'answer',
                              'message': 'Cette réponse ne vous appartient pas ou n\'existe pas'
                             }, to=request.sid)
        return

    emit('answer', {
                    'rid': answer.rid,
                    'statement': answer.statement,
                    'value': answer.value,
                    'qid': answer.qid
                   }, to=request.sid)


@socketio.on('get-question')
def get_question_sio(data):
    """Renvoie une question en fonction de l'id indiqué"""
    required = ['qid']
    access_granted, return_value = sio_auth_access(2, request.cookies.get('uid'), request.cookies.get('connection_token'), data, required)

    if not access_granted:
        emit('server-error', return_value, to=request.sid)
        return

    qid = data['qid']
    question = load_question(qid)
    if question is None or question.uid != request.cookies.get('uid'):
        emit('server-error', {
                              'type': 'exown',
                              'message': 'Cette question ne vous appartient pas ou n\'existe pas'
                             }, to=request.sid)
        return

    rids_list = []
    for answer in load_answers_list(qid):
        rids_list.append(answer.rid)

    tids_list = []
    for tag in load_tags_list(qid=qid):
        tids_list.append(tag.tid)

    emit('question', {
                      'qid': question.qid,
                      'statement': question.statement,
                      'type': question.qtype,
                      'rids': rids_list,
                      'tids': tids_list
                     }, to=request.sid)


@socketio.on('get-questions-list')
def get_questions_list_sio(data = None):
    """Renvoie la liste des questions de l'utilisateur authentifié ou du tag indiqué"""
    access_granted, return_value = sio_auth_access(2, request.cookies.get('uid'), request.cookies.get('connection_token'), data)

    if not access_granted:
        emit('server-error', return_value, to=request.sid)
        return

    questions_list = []
    if data is not None:
        if any(arg in data for arg in ['tid', 'quizid']):
            questions_list = load_questions_list(tid=data.get('tid'), quizid=data.get('quizid'))

        elif 'tag_search' in data:
            tags = load_tags_list(uid=request.cookies.get('uid'))
            for tag in tags:
                if data['tag_search'].lower() in tag.name.lower():
                    questions_list += load_questions_list(tid=tag.tid)

    else:
        questions_list = load_questions_list(uid=request.cookies.get('uid'))

    q_list = []
    for question in questions_list:
        rids_list = []
        for answer in load_answers_list(question.qid):
            rids_list.append(answer.rid)

        tids_list = []
        for tag in load_tags_list(qid=question.qid):
            tids_list.append(tag.tid)

        q_list.append({
                       'qid': question.qid,
                       'statement': question.statement,
                       'type': question.qtype,
                       'rids': rids_list,
                       'tids': tids_list
                      })

    emit('questions-list', q_list, to=request.sid)


@socketio.on('create-question')
def create_question_sio(data):
    """Enregistre la question créée"""
    required = ['statement', 'answers', 'type', 'tags']
    access_granted, return_value = sio_auth_access(2, request.cookies.get('uid'), request.cookies.get('connection_token'), data, required)

    if not access_granted:
        emit('server-error', return_value, to=request.sid)
        return

    question = Question(data['statement'], data['type'], request.cookies.get('uid'))
    question.store()
    qid = question.qid
    for ans in data['answers'].values():
        answer = Answer(ans['statement'], bool(ans['value']), qid, request.cookies.get('uid'))
        answer.store()

    for tid in data['tags']:
        tag = load_tag(tid)
        if tag is None or tag.uid != request.cookies.get('uid'):
            emit('server-error', {
                                  'type': 'tag',
                                  'message': 'Ce tag ne vous appartient pas ou n\'existe pas'
                                 }, to=request.sid)
            return

        tag.add_question(qid)

    emit('redirect', {
                      'location': '/question',
                      'parameters': {
                                     'action': 'modify',
                                     'qid': qid
                                    }
                     }, to=request.sid)


@socketio.on('modify-question')
def modify_question_sio(data):
    """Modifie la question demandée"""
    required = ['qid', 'statement', 'answers', 'tags']
    access_granted, return_value = sio_auth_access(2, request.cookies.get('uid'), request.cookies.get('connection_token'), data, required)

    if not access_granted:
        emit('server-error', return_value, to=request.sid)
        return

    qid = data['qid']
    question = load_question(qid)
    if question is None or question.uid != request.cookies.get('uid'):
        emit('server-error', {
                              'type': 'question',
                              'message': 'Cette question ne vous appartient pas ou n\'existe pas'
                             }, to=request.sid)
        return

    question.set_statement(data['statement'])
    question.store()
    answers_dict = {}
    for rid, ans in data['answers'].items():
        answers_dict[rid] = Answer(
                                   ans['statement'],
                                   bool(ans['value']),
                                   qid,
                                   request.cookies.get('uid')
                                  )

    for ans in load_answers_list(qid):
        if ans.rid not in answers_dict:
            ans.delete()
            continue

        answers_dict[ans.rid].rid = ans.rid

    for answer in answers_dict.values():
        answer.store()

    for tag in load_tags_list(qid=qid):
        if tag.tid not in data['tags']:
            tag.rem_question(qid)

    for tid in data['tags']:
        tag = load_tag(tid)
        if tag is None or tag.uid != request.cookies.get('uid'):
            emit('server-error', {
                                  'type': 'tag',
                                  'message': 'Ce tag ne vous appartient pas ou n\'existe pas'
                                 }, to=request.sid)
            return

        tag.add_question(data['qid'])


@socketio.on('delete-question')
def delete_question_sio(data):
    """Supprime la question demandée"""
    required = ['qid']
    access_granted, return_value = sio_auth_access(2, request.cookies.get('uid'), request.cookies.get('connection_token'), data, required)

    if not access_granted:
        emit('server-error', return_value, to=request.sid)
        return

    qid = data['qid']
    question = load_question(qid)
    if question is None or question.uid != request.cookies.get('uid'):
        emit('server-error', {
                              'type': 'question',
                              'message': 'Cette question ne vous appartient pas ou n\'existe pas'
                             }, to=request.sid)
        return

    question.delete()


@socketio.on('get-quiz')
def get_quiz_sio(data):
    """Renvoie un quiz en fonction de l'id indiqué"""
    required = ['quizid']
    access_granted, return_value = sio_auth_access(2, request.cookies.get('uid'), request.cookies.get('connection_token'), data, required)

    if not access_granted:
        emit('server-error', return_value, to=request.sid)
        return

    quizid = data['quizid']
    quiz = load_quiz(quizid)
    if quiz is None or quiz.uid != request.cookies.get('uid'):
        emit('server-error', {
                              'type': 'quiz',
                              'message': 'Ce quiz ne vous appartient pas ou n\'existe pas'
                             }, to=request.sid)
        return

    qids_list = []
    for question in load_questions_list(quizid=quizid):
        qids_list.append(question.qid)

    emit('quiz', {
                 'quizid': quiz.quizid,
                 'name': quiz.name,
                 'qids': qids_list
                }, to=request.sid)


@socketio.on('get-quizs-list')
def get_quiz_list_sio():
    """Renvoie la liste des quiz de l'utilisateur authentifié"""
    access_granted, return_value = sio_auth_access(2, request.cookies.get('uid'), request.cookies.get('connection_token'))

    if not access_granted:
        emit('server-error', return_value, to=request.sid)
        return

    quiz_list = load_quiz_list(request.cookies.get('uid'))

    q_list = []
    for quiz in quiz_list:
        q_list.append({
                       'quizid': quiz.quizid,
                       'name': quiz.name
                      })

    emit('quizs-list', q_list, to=request.sid)


@socketio.on('create-quiz')
def create_quiz_sio(data):
    """Enregistre le quiz créé"""
    required = ['name', 'qids']
    access_granted, return_value = sio_auth_access(2, request.cookies.get('uid'), request.cookies.get('connection_token'), data, required)

    if not access_granted:
        emit('server-error', return_value, to=request.sid)
        return

    quiz = Quiz(data['name'], request.cookies.get('uid'))
    quiz.store()
    for qid in data['qids']:
        question = load_question(qid)
        if question is None or question.uid != request.cookies.get('uid'):
            emit('server-error', {
                                  'type': 'question',
                                  'message': 'Cette question ne vous appartient pas ou n\'existe pas'
                                 }, to=request.sid)
            return

        quiz.add_question(qid)

    emit('redirect', {
                      'location': '/quiz',
                      'parameters': {
                                     'action': 'modify',
                                     'quizid': quiz.quizid
                                    }
                     }, to=request.sid)


@socketio.on('modify-quiz')
def modify_quiz_sio(data):
    """Modifier le quiz spécifié"""
    required = ['quizid', 'name', 'qids']
    access_granted, return_value = sio_auth_access(2, request.cookies.get('uid'), request.cookies.get('connection_token'), data, required)

    if not access_granted:
        emit('server-error', return_value, to=request.sid)
        return

    quizid = data['quizid']
    quiz = load_quiz(quizid)
    if quiz is None or quiz.uid != request.cookies.get('uid'):
        emit('server-error', {
                              'type': 'quiz',
                              'message': 'Ce quiz ne vous appartient pas ou n\'existe pas'
                             }, to=request.sid)
        return

    quiz.set_name(data['name'])
    quiz.store()
    for question in load_questions_list(quizid=quizid):
        if question.qid not in data['qids']:
            quiz.rem_question(question.qid)

    for qid in data['qids']:
        question = load_question(qid)
        if question is None or question.uid != request.cookies.get('uid'):
            emit('server-error', {
                                  'type': 'question',
                                  'message': 'Cette question ne vous appartient pas ou n\'existe pas'
                                 }, to=request.sid)
            return

        quiz.add_question(qid)


@socketio.on('delete-quiz')
def delete_quiz_sio(data):
    """Supprimer le quiz spécifié"""
    required = ['quizid']
    access_granted, return_value = sio_auth_access(2, request.cookies.get('uid'), request.cookies.get('connection_token'), data, required)

    if not access_granted:
        emit('server-error', return_value, to=request.sid)
        return

    quizid = data['quizid']
    quiz = load_quiz(quizid)
    if quiz is None or quiz.uid != request.cookies.get('uid'):
        emit('server-error', {
                              'type': 'question',
                              'message': 'Ce quiz ne vous appartient pas ou n\'existe pas'
                             }, to=request.sid)
        return

    quiz.delete()


@socketio.on('get-tag')
def get_tag_sio(data):
    """Renvoie un tag en fonction de l'id indiqué"""
    required = ['tid','name']
    access_granted, return_value = sio_auth_access(2, request.cookies.get('uid'), request.cookies.get('connection_token'), data, required)

    if not access_granted:
        emit('server-error', return_value, to=request.sid)
        return

    if data['tid'] is not None :
        tid = data['tid']
        tag = load_tag(tid = tid)

    elif data['name'] is not None:
        name = data['name']
        tag = load_tag(tname = name)

    if tag is None or tag.uid != request.cookies.get('uid'):
        emit('server-error', {
                              'type': 'exown',
                              'message': 'Ce tag ne vous appartient pas ou n\'existe pas'
                             }, to=request.sid)
        return

    qids_list = []
    for question in load_questions_list(tid=tid):
        qids_list.append(question.qid)

    emit('tag', {
                 'tid': tag.tid,
                 'name': tag.name,
                 'qids': qids_list
                }, to=request.sid)


@socketio.on('get-tags-list')
def get_tags_list_sio():
    """Renvoie la liste des tag de l'utilisateur d'id indiqué"""
    access_granted, return_value = sio_auth_access(2, request.cookies.get('uid'), request.cookies.get('connection_token'))

    if not access_granted:
        emit('server-error', return_value, to=request.sid)
        return

    tags_list = load_tags_list(uid=request.cookies.get('uid'))
    t_list = []
    for tag in tags_list:
        qids_list = []
        for question in load_questions_list(tid=tag.tid):
            qids_list.append(question.qid)

        t_list.append({
                       'tid': tag.tid,
                       'name': tag.name,
                       'qids': qids_list
                      })

    emit('tags-list', t_list, to=request.sid)


@socketio.on('create-tag')
def create_tag_sio(data):
    """Enregistre le tag créé"""
    required = ['name']
    access_granted, return_value = sio_auth_access(2, request.cookies.get('uid'), request.cookies.get('connection_token'), data, required)

    if not access_granted:
        emit('server-error', return_value, to=request.sid)
        return

    tag = Tag(data['name'], request.cookies.get('uid'))
    tag.store()


@socketio.on('delete-tag')
def delete_tag_sio(data):
    """Supprime le tag demandé"""
    required = ['tid']
    access_granted, return_value = sio_auth_access(2, request.cookies.get('uid'), request.cookies.get('connection_token'), data, required)

    if not access_granted:
        emit('server-error', return_value, to=request.sid)
        return

    tid = data['tid']
    tag = load_tag(tid)
    if tag is None or tag.uid != request.cookies.get('uid'):
        emit('server-error', {
                              'type': 'tag',
                              'message': 'Ce tag ne vous appartient pas ou n\'existe pas'
                             }, to=request.sid)
        return

    tag.delete()


@socketio.on("create-session")
def new_session_sio(data):
    """Crée une nouvelle session en fonction du quiz ou de la question d'id indiqué"""
    access_granted, return_value = sio_auth_access(2, request.cookies.get('uid'), request.cookies.get('connection_token'), data)

    if not access_granted:
        emit('server-error', return_value, to=request.sid)
        return

    if 'quizid' in data:
        quizid = data['quizid']
        quiz = load_quiz(quizid)
        if quiz is None or quiz.uid != request.cookies.get('uid'):
            emit('server-error', {
                                'type': 'quiz',
                                'message': 'Ce quiz ne vous appartient pas ou n\'existe pas'
                                }, to=request.sid)
            return

        session = Session(quizid, request.cookies.get('uid'), request.sid)

    elif 'qid' in data:
        qid = data['qid']
        question = load_question(qid)
        if question is None or question.uid != request.cookies.get('uid'):
            emit('server-error', {
                                  'type': 'question',
                                  'message': 'Cette question ne vous appartient pas ou n\'existe pas'
                                 }, to=request.sid)
            return

        session = Session(qid, request.cookies.get('uid'), request.sid, "question")

    else:
        emit('server-error', {
                              'type': 'format',
                              'message': 'Erreur en essayant de décoder le message'
                             }, to=request.sid)
        return

    session.store()

    emit('redirect', {
                      'location': '/session',
                      'parameters': {
                                     'sid': session.sid
                                    }
                     }, to=request.sid)


@socketio.on("get-session-infos")
def get_session_info_sio(data):
    """Renvoie les informations accessibles à
    l'utilisateur de la session demandée"""
    required = ['sid']
    access_granted, return_value = sio_auth_access(1, request.cookies.get('uid'), request.cookies.get('connection_token'), data, required)

    if not access_granted:
        emit('server-error', return_value, to=request.sid)
        return

    sid = data['sid']
    session = load_session(sid)
    if session is None:
        emit('server-error', {
                              'type': 'session',
                              'message': 'Cette session n\'existe pas'
                             }, to=request.sid)
        return

    if session.state == 'end':
        emit('redirect', {
                          'location': '/statistiques',
                          'parameters': {
                                         'sid': session.sid
                                        }
                         }, to=request.sid)

        return

    user = load_user(uid=request.cookies.get('uid'))
    if not (user.identifier in session.connected or user.uid == session.uid):
        session.student_connect(request.cookies.get('uid'), request.sid)

    message = {'sid': sid, 'state': session.state}
    if session.uid == user.uid:
        message['connected'] = session.connected
        if session.history['user_sid'] != request.sid:
            session.history['user_sid'] = request.sid
            session.store()

        message['history'] = session.history

    elif session.state == 'qstn':
        message['can_answer'] = session.can_answer(user.uid)

    if session.state in ['qstn', 'wait', 'show']:
        question = load_question(session.openqid)
        message['question'] = {'qid': question.qid, 'statement': question.statement, 'type': question.qtype}
        if question.qtype == 'qcm':
            answers_list = load_answers_list(question.qid)
            message['answers'] = []
            for answer in answers_list:
                properties = {'rid': answer.rid, 'statement': answer.statement}
                if session.state == 'show':
                    properties['value'] = answer.value

                message['answers'].append(properties)

        else:
            answer = load_answers_list(question.qid)[0]
            message['answer'] = {'rid': answer.rid}
            if session.state == 'show':
                message['answer']['statement']= answer.statement

    emit('session-infos', message, to=request.sid)


@socketio.on("change-session-state")
def change_session_state_sio(data):
    """Passe la session à l'état suivant ou celui indiqué"""
    required = ['sid']
    access_granted, return_value = sio_auth_access(2, request.cookies.get('uid'), request.cookies.get('connection_token'), data, required)

    if not access_granted:
        emit('server-error', return_value, to=request.sid)
        return

    session = load_session(data['sid'])
    if session is None or session.uid != request.cookies.get('uid'):
        emit('server-error', {
                              'type': 'session',
                              'message': 'Cette session ne vous appartient pas ou n\'existe pas'
                             }, to=request.sid)
        return

    session.change_state(data.get('state'))
    emit('session-state-changed', to=request.sid)
    for socketid in session.connected.values():
        emit('session-state-changed', to=socketid)


@socketio.on("answer-session")
def answer_session_sio(data):
    """Récupère la réponse d'un étuidiant"""
    required = ['sid', 'answers']
    access_granted, return_value = sio_auth_access(1, request.cookies.get('uid'), request.cookies.get('connection_token'), data, required)

    if not access_granted:
        emit('server-error', return_value, to=request.sid)
        return

    user = load_user(request.cookies.get('uid'))
    session = load_session(data['sid'])
    if session is None or not user.identifier in session.connected:
        emit('server-error', {
                              'type': 'session',
                              'message': 'Vous ne participez pas à cette session ou elle n\'existe pas'
                             }, to=request.sid)
        return

    if not session.can_answer(user.uid):
        emit('server-error', {
                              'type': 'permission',
                              'message': 'Vous avez déjà répondu'
                             }, to=request.sid)
        return

    for rid, value in data['answers'].items():
        session.student_answer(user.uid, rid, value)

    emit('session-state-changed', to=session.history['user_sid'])
    emit('session-state-changed', to=request.sid)


@socketio.on("get-session-stats")
def get_session_stats_sio(data):
    """Renvoie les statistiques accessibles à
    l'utilisateur de la session demandée"""
    required = ['sid']
    access_granted, return_value = sio_auth_access(1, request.cookies.get('uid'), request.cookies.get('connection_token'), data, required)

    if not access_granted:
        emit('server-error', return_value, to=request.sid)
        return

    sid = data['sid']
    session = load_session(sid)
    if session is None:
        emit('server-error', {
                              'type': 'session',
                              'message': 'Cette session n\'existe pas'
                             }, to=request.sid)
        return

    user = load_user(uid=request.cookies.get('uid'))
    message = {'sid': sid, 'history': {}, 'questions_list': []}

    if session.quizid is not None:
        questions = load_questions_list(quizid=session.quizid)
        for question in questions:
            message['questions_list'].append(question.qid)

    else:
        message['questions_list'].append(session.openqid)

    def replace_values_by_succes(history):
        for identifier, question in history['answered'].items():
            for qid, rid_value in question.items():
                success = True
                for rid, value in rid_value.items():
                    answer = load_answer(rid)
                    qstn = load_question(qid)
                    if qstn.qtype == 'num':
                        success = success and answer.statement == value
                        break

                    if qstn.qtype == 'opn':
                        break

                    success = success and answer.value == value

                history['answered'][identifier][qid]['success'] = success

        return history

    if session.uid == user.uid:
        message['history'] = replace_values_by_succes(session.history)
        for identifier in session.history['connected'].keys():
            if identifier not in session.history['answered']:
                message['history']['answered'][identifier] = {}

    else:
        new_history = {'answered': {}}
        if user.identifier in session.history['answered']:
            new_history['answered'][user.identifier] = replace_values_by_succes(session.history)['answered'][user.identifier]

        message['history'] = new_history

    emit('session-stats', message, to=request.sid)


@socketio.on('disconnect')
def disconnect_sio():
    """Quand un utilisateur quitte le socket"""
    user = load_user(request.cookies.get('uid'))
    if user is not None:
        sessions = load_sessions_list()
        for session in sessions:
            if user.identifier in session.connected:
                session.student_disconnect(user.uid)
                emit('session-state-changed', to=session.history['user_sid'])
                continue


# <-----------------------------------> #
# <-----------------------------------> #

# <-----------------------------------> #
# <-------- Démarrage serveur --------> #


socketio.run(
             app,
             host = '0.0.0.0',
             port = 5000,
             debug = True,
             ssl_context = ('fullchain.pem', 'privkey.pem')
            )
