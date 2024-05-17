
# JetQuiz

## Table des matières
1. [Informations générales](#informations-générales)
2. [Technologies utilisées](#technologies)
3. [Installation](#installation)
4. [Lancement](#lancement)
5. [Formats de sauvegarde](#format-de-sauvegarde)

### Informations générales

JetQuiz est un site web crée pour un projet universitaire de deuxième année de licence informatique qui consiste à permet à tout utilisateur connecté, de créer une banque de questions et affecter ces questions à différentes étiquettes. Il pourra ensuite créer des tests et les afficher.

### Technologies

Liste des outils utilisés dans le projet:

Langages:
* Python
* HTML
* CSS
* JavaScript 

Bibliothèques Python:
* sqlite3
* hashlib
* secret
* flask_socketio
* flask
* re (reglex)

Bibliothèques JavaScript:
* KaTeX
* Mermaid
* Prism
* JQuery
* SQLite
* html2pdf
* D3.js
* Bootstrap

### Installation

Commandes à executer pour l'installation du projet:

#### Windows
```batch
pip install -r requirements.txt
```

#### Linux
```bash
pip3 install -r requirements.txt
```

### Lancement

Commandes à executer pour le lancement du projet:

#### Windows
```batch
python app.py
```

#### Linux
```bash
python3 app.py
```

### Format de sauvegarde

Pour sauvegarder nos données, c'est-à-dire les informations concernant les utilisateurs, les tokens de connexion, les questions créées, les réponses, les étiquettes etc...

![Image text](https://zupimages.net/up/23/12/hfxt.jpg)

La table Quizs correspond aux séquences de questions.
