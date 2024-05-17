const urlParams = new URLSearchParams(window.location.search);
var top = document.getElementById('top');
var infoSession = document.getElementById('info-text');
var statementInput = document.getElementById('statement-box');
var answersInput = document.getElementById('answers');
var buttons = document.getElementById('buttons');

var sessionBuffer = "";
var questionStatementBuffer = "";
var answersHTMLBuffer = "";
var listAnswersBuffer = "";

var sid = urlParams.get('sid');

function renderText(text, id) {
    var outputText = text;

    var markdownRegex = /(```(?:mermaid|tex|[\w-]+)\n[\s\S]+?\n```|.+)/g;
    outputText = outputText.replace(markdownRegex, function (match, p1) {
        if (!match.startsWith("```")) return marked.parse(p1);
        else return match;
    });

    var mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
    outputText = outputText.replace(mermaidRegex, function (match, p1) {
        var svgCode = mermaid.mermaidAPI.render('graph' + id, p1);
        return '<div class="mermaid">' + svgCode + '</div>';
    });

    var latexRegex = /\$\$([\s\S]*?)\$\$/g;
    outputText = outputText.replace(latexRegex, function (match, p1) {
        var latexCode = katex.renderToString(p1, {output: "html"});
        return latexCode;
    });

    var codeRegex = /```(.+)\n([\s\S]*?)```/g;
    outputText = outputText.replace(codeRegex, function (match, p1, p2) {
        var code = Prism.highlight(p2, Prism.languages[p1]);
        return "<pre class='language-" + p1 + "'>" + code + "</pre>"
    });

    return outputText;
}

function numberConnected(session) {
    nbConnected = Object.keys(session['connected']).length;
    if (nbConnected > 1) {
        infoSession.innerHTML += '<br>Il y a actuellement ' + nbConnected + ' étudiants connectés.';
    } else {
        infoSession.innerHTML += '<br>Il y a actuellement ' + nbConnected + ' étudiant connecté.';
    }
}

function printInfo(session) {
    console.log(session);
    var idSession = document.getElementById('id-session');
    idSession.innerHTML = 'Identifiant de session : ' + session['sid'] + '<br>';
}

function createState(session) {
    infoSession.innerHTML = 'La session n\'a pas encore commencé...';
    if (session['history']) {
        buttons.innerHTML = '<br><br>\
        <a class="primary button icon solid fa-tv" onclick="socket.emit(\'change-session-state\', {\'sid\': sid, \'state\': \'qstn\'});">Lancer la session</a>\
        <br><br>\
        <a class="button icon solid fa-right-from-bracket primary" onclick="socket.emit(\'change-session-state\', {\'sid\': sid, \'state\': \'end\'});">Quitter la session</a>'
    }
}

function questionState(session) {
    infoSession.innerHTML = '';
    statementInput.className = "box";
    statementInput.innerHTML = "<i>Question:</i><br><div id='statement'>" + renderText(session['question']['statement']) + '</div><button type="button"\
    class="button small icon solid fa-eye-slash hide-button" id="hide-statement">Masquer</button>';
    answersInput.className = "box";
    var s = "";
    if (session['answers'] && session['answers'].length > 1) s = "s";
    answersInput.innerHTML = '<button type="button" class="button small icon solid fa-eye-slash hide-button" id="hide-answers">Masquer</button>\
    <i>Réponse' + s + ':</i><br><ul id="output-answers"></ul><div id="output-others-answers"></div>';
    var answersList = document.getElementById('output-answers');
    var answersHTML = ''
    if (session['question']['type'] === 'qcm') {
        for (answer of session['answers']) {
            answersHTML += "<li><input type='checkbox' id='rN" + answer['rid'] + "' disabled></input><label for='rN" + answer['rid'] + "'></label>" + renderText(answer['statement'], answer['rid']) + "<div ></div></li>\
            \
            <div class='progress' style='height: 12px;'><div id = 'pg"+ answer['rid'] + "' class='progress-bar progress-bar-striped progress-bar-animated' role='progressbar' aria-valuenow='50' aria-valuemin='0' aria-valuemax='100' style='width: 0%'></div></div>"
        }
    }
    else if (session['question']['type'] === 'num') {
        answersHTML = '<input id="aI' + session['answer']['rid'] + '" type="number" disabled></input>';
        document.getElementById('output-others-answers').innerHTML = '<br><i>Réponses les plus fréquentes : </i><ul style="list-style-type: none;" id="output-list-answers"></ul>'
    }
    else {
        answersHTML = '<input id="aI' + session['answer']['rid'] + '" type="text" disabled></input>';
        document.getElementById('output-others-answers').innerHTML = '<br><i>Réponses les plus fréquentes : </i><ul style="list-style-type: none;" id="output-list-answers"></ul>';
    }
    answersList.innerHTML = answersHTML
    buttons.innerHTML = '<a class="button icon solid fa-x" onclick="socket.emit(\'change-session-state\', {\'sid\': sid, \'state\': \'wait\'});">Arrêter les réponses</a>\
    <a class="button icon solid fa-check" onclick="socket.emit(\'change-session-state\', {\'sid\': sid, \'state\': \'show\'});">Afficher la correction</a>\
    <br><br>\
    <a class="button icon solid fa-right-from-bracket primary" onclick="socket.emit(\'change-session-state\', {\'sid\': sid, \'state\': \'end\'});">Quitter la session</a>'
    document.getElementById('top').innerHTML += '<button type="button" class="button icon solid fa-forward-step next-question primary" onclick=\'socket.emit("change-session-state", {"sid": sid, "state": "wait"});\
    setTimeout(() => {\
    socket.emit("change-session-state", {"sid": sid, "state": "qstn"});\
    }, 200);\'>Suivant</button>';

    var hideStatement = document.getElementById('hide-statement');
    var hideAnswers = document.getElementById('hide-answers');
    questionStatementBuffer = session['question']['statement'];
    hideStatement.addEventListener('click', () => {
        var hideStatement = document.getElementById('hide-statement');
        var statementDiv = document.getElementById('statement');
        if (hideStatement.innerHTML == 'Masquer') {
            hideStatement.innerHTML = 'Démasquer';
            hideStatement.className = 'button small icon solid fa-eye hide-button';
            statementDiv.innerHTML = '<i>Masqué</i>';
        }
        else {
            hideStatement.innerHTML = 'Masquer';
            hideStatement.className = 'button small icon solid fa-eye-slash hide-button';
            statementDiv.innerHTML = renderText(questionStatementBuffer);
        }
    });

    answersHTMLBuffer = answersHTML;
    hideAnswers.addEventListener('click', () => {
        var hideAnswers = document.getElementById('hide-answers');
        var answersList = document.getElementById('output-answers');
        var listAnswers = document.getElementById('output-list-answers');
        if (hideAnswers.innerHTML == 'Masquer') {
            answersHTMLBuffer = answersList.innerHTML;
            answersList.innerHTML = '<i>Masqué</i>';
            hideAnswers.innerHTML = 'Démasquer';
            hideAnswers.className = 'button small icon solid fa-eye hide-button'
            listAnswersBuffer = listAnswers.innerHTML;
            listAnswers.innerHTML = '<i>Masqué</i>';
        }
        else {
            answersList.innerHTML = answersHTMLBuffer;
            hideAnswers.innerHTML = 'Masquer';
            hideAnswers.className = 'button small icon solid fa-eye-slash hide-button';
            listAnswers.innerHTML = listAnswersBuffer;
        }
    });
}

function questionStateStudent(session) {
    infoSession.innerHTML = 'Vous pouvez répondre à la question!';
    statementInput.className = "box";
    statementInput.innerHTML = "<i>Question:</i><br><div id='statement'>" + renderText(session['question']['statement'], session['question']['qid']) + '</div>';
    answersInput.className = "box";
    var s = "";
    if (session['answers'] && session['answers'].length > 1) s = "s";
    answersInput.innerHTML = '<i>Réponse' + s + ':</i><br><ul id="output-answers-student" style="list-style-type: none;"></ul>';
    var answersList = document.getElementById('output-answers-student');
    var answersHTML = ''
    if (session['question']['type'] === 'qcm') {
        for (answer of session['answers']) {
            answersHTML += "<li>" + renderText(answer['statement'], answer['rid']) + "<input type='checkbox' id='rN" + answer['rid'] + "'></input><label for='rN" + answer['rid'] + "'></label></li>";
        }
        buttons.innerHTML = '<a class="button icon primary solid fa-check" onclick="sendAnswers()">Valider</a>';
    }
    else if (session['question']['type'] === 'num') {
        var disabled = "";
        if (session['state'] == "show") disabled = "disabled";
        answersHTML = '<input id="aI' + session['answer']['rid'] + '" type="number" ' + disabled + '></input>';
        buttons.innerHTML = '<a class="button icon primary solid fa-check" onclick="sendAnswer()">Valider</a>';
    }
    else {
        var disabled = "";
        if (session['state'] == "show") disabled = "disabled";
        answersHTML = '<input id="aI' + session['answer']['rid'] + '" type="text" ' + disabled + '></input>';
        buttons.innerHTML = '<a class="button icon primary solid fa-check" onclick="sendAnswer()">Valider</a>';
    }
    answersList.innerHTML = answersHTML;
    answers = [];
}

function waitState() {
    infoSession.innerHTML = "Il n'est plus possible de répondre à la question...";
}

function waitStateStudent() {
    buttons.innerHTML = '';
}

function showState(session) {
    infoSession.innerHTML = "Voici la correction!";
    if (session['question']['type'] === 'qcm') {
        for (answer of session['answers']) {
            var checkbox = document.getElementById('rN' + answer['rid']);
            checkbox.checked = answer['value'];
            checkbox.setAttribute('disabled', 1);
        }
    }
    else if (session['question']['type'] === 'num') {
        var answerNumInput = document.querySelector('[id^="aI"]');
        answerNumInput.value = session['answer']['statement'];
    }
};

function sendAnswers() {
    const checkboxes = document.querySelectorAll('input[type="checkbox"][id^="rN"]');
    const answers = {};

    checkboxes.forEach(checkbox => {
        const idAnswer = checkbox.id.substring(2);
        answers[idAnswer] = checkbox.checked;
    });

    console.log(answers);
    socket.emit('answer-session', { 'sid': sid, 'answers': answers });
}

function sendAnswer() {
    const answer = document.querySelector('[id^="aI"]');
    const idAnswer = answer.id.substring(2);
    answers = {};
    answers[idAnswer] = answer.value;
    console.log(answers);
    socket.emit('answer-session', { 'sid': sid, 'answers': answers });
}

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

/* Permet d'actualiser les barres de progression des questions de type QCM*/
function actualiseProgressBar(listAnswers) {
    let count = {};
    for (let i = 0; i < listAnswers.length; i++) {
        let answer = listAnswers[i];
        count[answer] = 0;
    }

    for (let i = 0; i < listAnswers.length; i++) {
        let answer = listAnswers[i];
        count[answer]++;
    }

    let table = {};
    for (let answer in count) {
        table[answer] = count[answer];
    }
    console.log(table);

    const progressBar = document.querySelectorAll('[id^="pg"]');

    progressBar.forEach(pg => {
        const idAnswer = pg.id.substring(2);
        let percentage = (table[idAnswer] / listAnswers.length) * 100;
        percentage = parseFloat(percentage.toFixed(2));
        pg.setAttribute('style', 'width: ' + percentage + '%;');
        if (table[idAnswer] != undefined) {
            pg.setAttribute('style', 'width: ' + percentage + '%;');
            if (table[idAnswer] > 1) pg.innerHTML = table[idAnswer] + " étudiants (" + percentage + " %)";
            else pg.innerHTML = table[idAnswer] + " étudiant (" + percentage + " %)";
        }
        else {
            pg.innerHTML = "0 étudiant (0 %)";
            pg.setAttribute('style', 'width: 0%;');
        }
    });
    console.log(table);
}

/* Crée des barres de progression des réponses les plus fréquentes pour les questions numériques */
function createProgressBar(listAnswers) {
    console.log(listAnswers)
    var outputListAnswers = document.getElementById('output-list-answers');

    outputListAnswers.innerHTML = '';

    const answerCounts = {}; // Dictionnaire pour stocker les occurrences de chaque réponse

    // Compter les occurrences de chaque réponse
    listAnswers.forEach((answer) => {
        if (answer in answerCounts) {
            answerCounts[answer]++;
        } else {
            answerCounts[answer] = 1;
        }
    });

    // Trier les réponses par ordre décroissant d'occurrence
    const sortedAnswers = Object.keys(answerCounts).sort((a, b) => {
        return answerCounts[b] - answerCounts[a];
    });

    // Si le nombre de réponses différentes est supérieur à 4, afficher uniquement les 3 premiers et regrouper les autres dans la catégorie "Autres"
    if (sortedAnswers.length > 4) {
        var otherCount = 0;
        for (var i = 3; i < sortedAnswers.length; i++) {
            otherCount += answerCounts[sortedAnswers[i]];
        }
        sortedAnswers.splice(3);
        sortedAnswers.push("Autres");
        answerCounts["Autres"] = otherCount;
    }

    // Créer une barre de progression pour chaque réponse
    sortedAnswers.forEach((answer) => {
        const count = answerCounts[answer];
        const percent = (count / listAnswers.length) * 100;
        var grammaire = "étudiant";
        if (count > 1) grammaire = "étudiants";
        const progressBarHtml = "<li>" + answer + "</li><div class='progress' style='height: 12px;'><div id='pg" + answer + "' class='progress-bar progress-bar-striped progress-bar-animated' role='progressbar' aria-valuenow='" + percent + "' aria-valuemin='0' aria-valuemax='100' style='width: " + percent + "%'>" + count + " " + grammaire + " (" + percent.toFixed(2) + "%)</div></div>";
        outputListAnswers.innerHTML += progressBarHtml;
    });
}

function createWordCloud(listAnswers) {
    console.log(listAnswers)
    var outputListAnswers = document.getElementById('output-list-answers');
    outputListAnswers.innerHTML = '';
    groupedWords = groupSimilarWords(listAnswers);
    console.log(groupedWords)
    var wordFreq = groupedWords.map(function (list) {
        return { text: list[0], size: list.length };
    });
    var colors = d3.scaleOrdinal(d3.schemeCategory10);


    // Taille du nuage de mots
    var width = outputListAnswers.getBoundingClientRect().width;
    var height = 300;

    // Créer l'élément SVG et l'ajouter au conteneur
    var svg = d3.select(outputListAnswers)
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Générer les données pour le nuage de mots
    var words = [];
    for (var i = 0; i < groupedWords.length; i++) {
        var word = groupedWords[i][0];
        var size = 20 + groupedWords[i].length * 12;
        words.push({ text: word, size: size });
    }

    // Configurer la mise en page du nuage de mots
    var layout = d3.layout.cloud()
        .size([width, height])
        .words(words)
        .padding(7)
        .rotate(0)
        .fontSize(function (d) { return d.size; })
        .on("end", draw);

    // Générer le nuage de mots
    layout.start();

    // Fonction pour dessiner le nuage de mots
    function draw(words) {
        svg.append("g")
            .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")")
            .selectAll("text")
            .data(words)
            .enter().append("text")
            .style("font-size", function (d) { return d.size + "px"; })
            .style("fill", function (d, i) { return d3.schemeCategory10[i % 10]; })
            .attr("text-anchor", "middle")
            .attr("transform", function (d) {
                return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
            })
            .text(function (d) { return d.text; });
    }
}

// Groupe les mots similaires (de distance inférieure à 2) dans des listes
function groupSimilarWords(words) {
    const groups = {};

    for (const word of words) {
        let found = false;
        for (const group of Object.values(groups)) {
            if (group.some(w => getDistance(word.toLowerCase(), w.toLowerCase()) <= 2)) {
                group.push(word);
                found = true;
                break;
            }
        }
        if (!found) {
            groups[word] = [word];
        }
    }

    return Object.values(groups);
}

// Algorithme de Levenstein pour calculer la distance entre deux mots
function getDistance(a, b) {
    const matrix = Array(b.length + 1).fill().map(() => Array(a.length + 1).fill(0));
    for (let i = 1; i <= b.length; i++) {
        matrix[i][0] = i * 2;
    }
    for (let j = 1; j <= a.length; j++) {
        matrix[0][j] = j * 2;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b[i - 1] === a[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 2,   // coût de suppression
                    matrix[i][j - 1] + 2,   // coût d'insertion
                    matrix[i - 1][j - 1] + 1  // coût de substitution
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

function progressBarFunctions(session, listAnswers) {
    if (session['question']['type'] === "qcm") {
        actualiseProgressBar(listAnswers);
    }
    else if (session['question']['type'] === "num") { createProgressBar(listAnswers); }
    else { createWordCloud(listAnswers); }
}

function getAnswersData(session) {
    var answersData = [];
    for (const [_, v] of Object.entries(session['history']['answered'])) {
        if (v[session['question']['qid']]) {
            for (const [k2, v2] of Object.entries(v[session['question']['qid']])) {
                if (session['question']['type'] === "num" || session['question']['type'] === "opn") {
                    answersData.push(v2);
                }
                else {
                    if (v2 === true) {
                        answersData.push(k2);
                    }
                }
            }
        }
    }
    return answersData;
}

socket.on("session-infos", (session) => {
    printInfo(session);
    if (session['state'] === 'crea') {
        if (session['history']) {
            numberConnected(session);
        }
        createState(session);
    }
    if (session['state'] === 'qstn') {
        if (session['history']) {
            questionState(session);
            var answersData = getAnswersData(session);
            progressBarFunctions(session, answersData);
            numberConnected(session);
        }
        else {
            if (session['can_answer'] == true) questionStateStudent(session);
            else {
                questionStateStudent(session);
                waitState(session);
                waitStateStudent(session);
            }
        }
    }
    if (session['state'] === 'wait') {
        if (session['history']) {
            questionState(session);
            waitState();
            var answersData = getAnswersData(session);
            progressBarFunctions(session, answersData);
            numberConnected(session);
        }
        else {
            questionStateStudent(session);
            waitState();
            waitStateStudent();
        }
    }
    if (session['state'] === 'show') {
        if (session['history']) {
            questionState(session);
            var answersData = getAnswersData(session);
            progressBarFunctions(session, answersData);
            numberConnected(session);
        }
        else {
            questionStateStudent(session);
            waitStateStudent();
            showState(session);
        }
        showState(session);
    }
});

socket.on("session-state-changed", () => {
    setTimeout(() => {
        socket.emit("get-session-infos", { 'sid': sid });
    }, 200);
});

socket.emit("get-session-infos", { 'sid': sid });
