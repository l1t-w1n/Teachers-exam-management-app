function addTagToList(tag, first, last) //ajoute une étiquette au formulaire
{
  // Créer un nouvel élément li
  var newTag = document.createElement("li");
  newTag.id = "li" + tag['tid'];
  newTag.innerHTML += tag['name'];

  // Ajouter la classe row et gtr-uniform
  newTag.classList.add("row", "gtr-uniform");

  // Ajouter les champs d'intervalle
  var intervalleDiv = document.createElement("div");
  intervalleDiv.classList.add("intervalle");
  var minusInput = document.createElement("input");
  minusInput.type = "number";
  minusInput.id = "minus" + tag['tid'];
  intervalleDiv.appendChild(minusInput);
  var plusInput = document.createElement("input");
  plusInput.type = "number";
  plusInput.id = "plus" + tag['tid'];
  intervalleDiv.appendChild(plusInput);
  newTag.appendChild(intervalleDiv);

  // Ajouter le nouvel élément li à la liste tags-subject
  var tagsSubjectList = document.getElementById("tags-subject");
  if (!first) tagsSubjectList.innerHTML += '<br>';
  tagsSubjectList.appendChild(newTag);
  if (!last) tagsSubjectList.innerHTML += '<br>';
}

// Cette fonction crée un dictionnaire pour chaque étiquette qui pour chaque entier n inclus dans l'intervalle donne la
// liste des combinaisons de n questions parmis la liste complète des questions associées à l'étiquette
function createTopics(dico_etiquettes) {
  let topics = {};
  const tags = Object.keys(dico_etiquettes);
  for (let tag of tags) {
    const value = dico_etiquettes[tag];
    var start = value[1][0];
    var end = value[1][1];
    let questionDict = {};
    for (let i = start; i <= end; i++) {
      questionDict[i] = getCombinations(value[0], i);
    }
    topics[tag] = questionDict;
  }
  return topics;
}

// Cette fonction retourne toutes les combinaisons possibles de n éléments dans une liste
function getCombinations(list, n) {
  let result = [];

  function helper(temp, index) {
    if (temp.length === n) {
      result.push(temp);
      return;
    }

    for (let i = index; i < list.length; i++) {
      helper([...temp, list[i]], i + 1);
    }
  }

  helper([], 0);
  return result;
}

// Cette fonction transforme un dictionnaire en un dictionnaire plat qui ne contient que les clés et les valeurs
function flattenDict(dict) {
  const result = {};

  for (const key in dict) {
    if (dict.hasOwnProperty(key)) {
      result[key] = Object.keys(dict[key]);
    }
  }

  return result;
}

// Renvoie toutes les combinaisons possibles de nombre d'étiquettes pour avoir le nombre exact de questions demandé
function allPossibilities(dict, nbQuestions) {
  // Extraire les clés et et les listes correspondantes du dictionnaire
  const keys = Object.keys(dict);
  const values = Object.values(dict);

  // Calcule toutes les combinaisons possibles
  const combinations = cartesianProduct(...values);
  // Crée un nouveau dictionnaire pour chaque combinaison de valeurs dont la somme est égale au nombre de questions demandé
  const results = [];
  for (const combination of combinations) {
    if (sum(combination) == nbQuestions) {
      const newDict = {};
      for (let i = 0; i < keys.length; i++) {
        newDict[keys[i]] = combination[i];
      }
      results.push(newDict);
    }
  }

  return results;
}

function cartesianProduct(...lists) {
  // Cartesian product of multiple lists
  if (lists.length === 0) {
    return [[]];
  } else {
    const results = [];
    for (const element of lists[0]) {
      for (const sublist of cartesianProduct(...lists.slice(1))) {
        results.push([element, ...sublist]);
      }
    }
    return results;
  }
}

function sum(list) {
  // Sum of the elements in a list
  let total = 0;
  for (const element of list) {
    total += parseInt(element);
  }
  return total;
}

// Supprime tous les sujets ayant des questions en double 
//(une question appartenant à plusieurs étiquettes n'est comptée que pour l'une d'elles)
function filterByCount(dico1, dico2) {
  const result = {};
  for (const label in dico1) {
    if (dico2.hasOwnProperty(label)) {
      const count = dico2[label];
      const subDict = dico1[label];
      if (subDict.hasOwnProperty(count)) {
        result[label] = subDict[count];
      }
    }
  }
  return result;
}


function getCombinations2(dict) {
  // Obtenir les clés du dictionnaire
  const keys = Object.keys(dict);

  // Créer un tableau de tableaux contenant toutes les valeurs associées à chaque clé
  const values = keys.map(key => dict[key]);

  // Calculer le nombre total de combinaisons
  const numCombinations = values.reduce((acc, curr) => acc * curr.length, 1);

  // Initialiser un tableau pour stocker toutes les combinaisons possibles
  const combinations = [];

  // Boucle sur chaque combinaison
  for (let i = 0; i < numCombinations; i++) {
    const currentCombination = {};

    // Boucle sur chaque clé
    for (let j = 0; j < keys.length; j++) {
      const key = keys[j];
      const valueIndex = Math.floor(i / values.slice(j + 1).reduce((acc, curr) => acc * curr.length, 1)) % dict[key].length;
      currentCombination[key] = dict[key][valueIndex];
    }

    combinations.push(currentCombination);
  }

  return combinations;
}


function convertDictValuesToInt(dictList) {
  const result = [];
  for (let i = 0; i < dictList.length; i++) {
    const dict = dictList[i];
    const intDict = {};
    for (const key in dict) {
      intDict[key] = parseInt(dict[key]);
    }
    result.push(intDict);
  }
  return result;
}

function createSubjects1(topics, possibilities, nbSubjects) {
  var union = [];
  for (var i = 0; i < possibilities.length; i++) {
    if (union.length < nbSubjects) {
      var dictCount = filterByCount(topics, possibilities[i]);
      var res = getCombinations2(dictCount);
      union = union.concat(res);
    }
    else {
      return union;
    }
  }
  if (union.length < nbSubjects) {
    document.getElementById('message-error').innerHTML = 'Il est impossible de générer autant de sujets.';
    throw new Error(`Il est impossible de générer autant de sujets.`);
  }
  return union;
}

function createSubjects2(union, nbSubjects) {
  var filteredList = removeDuplicates(union);
  if (filteredList.length < nbSubjects) {
    document.getElementById('message-error').innerHTML = 'Il est impossible de générer autant de sujets.';
    throw new Error("Il est impossible de générer autant de sujets.");
  }
  return filteredList.slice(0, nbSubjects);
}


function removeDuplicates(listOfDicts) {
  return listOfDicts.filter((dict) => !checkForDuplicates(dict));
}

function checkForDuplicates(dict) {
  const concatenated = Object.values(dict).flat(); // Concaténer toutes les listes
  const set = new Set(concatenated); // Créer un ensemble pour éliminer les doublons
  return set.size !== concatenated.length; // Vérifier s'il y a des doublons et renvoyer true ou false
}

// Concactène et mélange les questions toutes entre elles si shuffleBool est vrai
// ou seulement entre mêmes étiquettes si shuffleBool est faux
function shuffleAndConcat(obj, shuffleBool) {
  var shuffledObj = {};
  var list = [];

  // Récupérer les clés de l'objet dans un tableau
  var keys = Object.keys(obj);

  // Mélanger les tableaux de chaque propriété de l'objet
  for (let key of keys) {
    shuffledObj[key] = shuffle(obj[key]);
    list = list.concat(shuffledObj[key]);
  }

  if (shuffleBool === true) {
    list = shuffle(list);
  }
  return list;
}

// Mélange une liste
function shuffle(list) {
  let shuffledList = [...list];
  for (let i = shuffledList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledList[i], shuffledList[j]] = [shuffledList[j], shuffledList[i]];
  }
  return shuffledList;
}

// Mélange tous les sujets en appelant shuffleAndConcat
function shuffleAll(dictList, shuffleBool) {
  var result = [];
  for (dict of dictList) {
    result.push(shuffleAndConcat(dict, shuffleBool));
  }
  return result;
}

// Renvoie la liste des sujets (un sujet est une liste d'identifiants de questions) grâce aux informations
// récupérer du formulaire et de la base de données.
function createSubjects(dico_etiquettes, nbQuestions, nbSubjects, shuffleBetweenTags) {
  var messageError = document.getElementById('message-error');
  for (let [etiquette, [questions, intervalle]] of Object.entries(dico_etiquettes)) {
    // Vérifier si le nombre de questions est suffisant pour l'intervalle donné
    if (intervalle[1] > questions.length) {
      messageError.innerHTML = "L'intervalle de questions pour l'étiquette " + etiquette + " est invalide. Il n'existe pas assez de questions correspondant à l'étiquette.";
      throw new Error(`L'intervalle de questions pour l'étiquette '${etiquette}' est invalide. Il n'existe pas assez de questions correspondant à l'étiquette.`);
    }
    // Vérifier si l'intervalle est correct pour chaque étiquette
    if (intervalle[0] > intervalle[1] || intervalle[0] < 0 || intervalle[1] < 0) {
      messageError.innerHTML = "L'intervalle pour l'étiquette " + etiquette + " est invalide. La borne inférieure doit être inférieure ou égale à la borne supérieure.";
      throw new Error(`L'intervalle pour l'étiquette '${etiquette}' est invalide. La borne inférieure doit être inférieure ou égale à la borne supérieure.`);
    }
  }

  var topics = createTopics(dico_etiquettes);
  var flatDict = flattenDict(topics);
  var possibilities = convertDictValuesToInt(allPossibilities(flatDict, nbQuestions));
  var subjects1 = createSubjects1(topics, possibilities, nbSubjects)
  var subjects2 = createSubjects2(subjects1, nbSubjects);
  var subjects = shuffleAll(subjects2, shuffleBetweenTags);

  return subjects;
}
createSubjects({'Java': [[1, 5, 7, 10, 15],[2,5]], 'Python': [[23, 5, 14, 1],[1,2]], 'Maths': [[2],[1,1]], 'POO': [[15, 12, 6], [1,2]]},7,80,false);

var tagsListBuffer = [];
var qtypeBuffer = {};

// Récupère la liste d'étiquettes et appelle addTagToList pour les afficher
socket.on('tags-list', (message) => {
  tagsListBuffer = message;
  for (let i = 0; i < message.length; i++) {
    const tag = message[i];
    if (i === 0) {
      addTagToList(tag, true, false);
    } else if (i === message.length - 1) {
      addTagToList(tag, false, true);
    } else {
      addTagToList(tag, false, false);
    }
  }
});

// Récupère les informations d'une réponses grâce à son identifiant
socket.on('answer', (message) => {
  var rid = message['rid'];
  var enonce = message['statement'];
  var qid = message['qid'];
  var subject;
  var goRender = true;
  var removed = false;
  for (var i = 0; i < answersIDBuff.length; i++) {
    for (var j = 0; j < answersIDBuff[i].length; j++) {
      if (answersIDBuff[i][j] === rid && !removed) {
        subject = i;
        answersIDBuff[i].splice(j, 1);
        removed = true;
        break;
      }
    }
    if (answersIDBuff[i].length !== 0) {
      goRender = false;
      if (removed) {
        break;
      }
    }
    console.log(goRender);
    if (removed && !goRender) {
      break;
    }
  }

  newAnswerRender(rid, enonce, qid, subject);

  if (goRender) {
    for (subject of questionsIDBuff) {
      if (subject.length !== 0) {
        goRender = false;
        break;
      }
    }
    if (goRender) {
      renderPDF();
    }
  }
});

socket.on('question', (message) => {
  var qid = message['qid'];
  var enonce = message['statement'];
  var qtype = message['type'];
  qtypeBuffer[qid] = qtype;
  var subject;
  var removed = false
  for (var i = 0; i < questionsIDBuff.length; i++) {
    for (var j = 0; j < questionsIDBuff[i].length; j++) {
      if (questionsIDBuff[i][j] === qid && !removed) {
        subject = i;
        questionsIDBuff[i].splice(j, 1);
        removed = true;
        break;
      }
    }
    if (removed) {
      break;
    }
  }
  newQuestionRender(qid, enonce, subject);
  if (!answersIDBuff[subject]) {
    answersIDBuff.push([]);
  }
  for (var rid of message['rids']) {
    answersIDBuff[subject].push(rid);
    socket.emit('get-answer', { 'rid': rid });
  }
});

// Récupère les informations du formulaire et vérifie les données
function createPDF() {
  var messageError = document.getElementById('message-error');
  messageError.innerHTML = '';

  var dico_tags = {};
  for (tag of tagsListBuffer) {
    var minus = parseInt(document.getElementById('minus' + tag['tid']).value);
    var plus = parseInt(document.getElementById('plus' + tag['tid']).value);

    // Vérifier si minus est un nombre, sinon le remplacer par 0
    minus = isNaN(minus) ? 0 : minus;

    // Vérifier si plus est un nombre, sinon le remplacer par 0
    plus = isNaN(plus) ? 0 : plus;

    dico_tags[tag['tid']] = [];
    dico_tags[tag['tid']][0] = tag['qids'];
    dico_tags[tag['tid']][1] = [minus, plus];
  }

  var nbQuestions = parseInt(document.getElementById('nbQuestions').value);
  var nbSubjects = parseInt(document.getElementById('nbSubjects').value);
  var shuffleBool = document.querySelector('input[name="shuffleBool"]:checked').value === "oui1";
  var anonymous = document.querySelector('input[name="anonymous"]:checked').value === "oui2";

  if (isNaN(nbQuestions)) {
    messageError.innerHTML = 'Veuillez entrer un nombre de questions correct <br>';
  }
  if (isNaN(nbSubjects)) messageError.innerHTML += 'Veuillez entrer un nombre de sujets correct <br>';

  if (!isNaN(nbQuestions) && !isNaN(nbSubjects)) var subjects = createSubjects(dico_tags, nbQuestions, nbSubjects, shuffleBool);

  renderAllSubjects(subjects, anonymous)
}

socket.emit('get-tags-list');

var questionsIDBuff = [];
var answersIDBuff = [];
var printDiv = document.getElementById('print');

function renderAllSubjects(listSubjects, anonymous) {
  // Quand tous les sujets sont render, la dernière réponse générée (ou la dernière question si question open) lance la création du pdf

  printDiv.innerHTML = "";

  for (var i = 0; i < listSubjects.length; i++) {
    var element = document.createElement("div");
    element.setAttribute('id', "prdiv" + i);

    var numSubject = document.createElement('ol');
    numSubject.setAttribute('id', 'num-subject');
    element.appendChild(numSubject);

    var renderSubjects = document.createElement('ol');
    renderSubjects.setAttribute('id', 'renderSubjects');
    element.appendChild(renderSubjects);

    printDiv.appendChild(element);

    if (anonymous === true) {
      renderSubjects.innerHTML = "<label>Numéro d'anonymat :</label><center><div id='grid-container'></div></center><br><br>";
      createGrid(i);
    } else {
      renderSubjects.innerHTML = "<label for='last_name'>Nom :</label><input type='text' id='last_name'>\
                      <label for='first_name'>Prénom :</label><input type='text' id='first_name'>\
                      <label for='student_number'>Numéro d'étudiant :</label><input type='text' id='student_number'>\
                      <br>\
                      <br>";
    }
    numSubject.innerHTML = '<h2>Sujet ' + (i + 1)+'</h2>';

    questionsIDBuff.push([]);

    for (question of listSubjects[i]) {
      questionsIDBuff[i].push(question)
      socket.emit('get-question', { 'qid': question });
    }
  }
}

function renderPDF() {
  var htmlList = document.querySelectorAll("[id^='prdiv']");
  var options = {
    filename: 'quiz.pdf',
    margin: [5, 5, 5, 5],
    html2canvas: { scale: 1, scrollY: 0 }
  };
  let pdfDoc = html2pdf().set(options).from(htmlList[0]).toPdf()
  for (let j = 1; j < htmlList.length; j++) {
    pdfDoc = pdfDoc.get('pdf').then(
      pdf => { pdf.addPage() }
    ).from(htmlList[j]).toContainer().toCanvas().toPdf()
  }
  pdfDoc.save();
  printDiv.innerHTML = "";
}

function renderText(text, id) // permet d'afficher du markdown, mermaid, latex et code colorisé
{
  var outputText = text;
  while (document.getElementById('graph' + id) != null) {
    id += "_";
  }

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
    var latexCode = katex.renderToString(p1, { output: "html" });
    return latexCode;
  });

  var codeRegex = /```(.+)\n([\s\S]*?)```/g;
  outputText = outputText.replace(codeRegex, function (match, p1, p2) {
    var code = Prism.highlight(p2, Prism.languages[p1]);
    return "<pre class='language-" + p1 + "'>" + code + "</pre>"
  });
  return outputText;
}

function newQuestionRender(qid, enonce, subject) // affiche l'énoncé d'une question
{
  var htmlText = '<li id="liq' + qid + '">\
                      <div class="box">\
                      ' + renderText(enonce, qid) + '\
                      </div><br>\
                      <ul id="output-answers"></ul>\
                    </li><br>';

  document.getElementById('prdiv' + subject).querySelector("[id='renderSubjects']").innerHTML += htmlText;
}

function newAnswerRender(rid, enonce, qid, subject) // affiche une réponse
{
  // récupère l'élément correspondant à la question lui étant associée
  var questionUl = document.getElementById("prdiv" + subject).querySelector('[id="liq' + qid + '"]').querySelector('[id="output-answers"]');
  if (qtypeBuffer[qid] === "qcm") {
    var htmlText = '<li id="lir' + rid + '"><input name="qcm" type="checkbox"><label for="qcm"></label>' + renderText(enonce, rid) + '\</li>';
    questionUl.innerHTML += htmlText;
  }
  else {
    questionUl.innerHTML = "<input disabled>";
  }
}

function createGrid(subject) { // fonction permettant d'ajouter la grille de cases à colorier dans le cas de contrôles anonymes

  // Définition des variables pour la grille
  var rows = 6;
  var cols = 10;
  var cellSize = 35; // ajustement pour inclure l'espace de 5 pixels
  var padding = 5;

  // Création du conteneur pour la grille
  var gridContainer = d3.select("#prdiv" + subject).select("#grid-container")
    .append("svg")
    .attr("width", cols * (cellSize + padding)) // ajustement pour inclure l'espace de 5 pixels
    .attr("height", (rows + 1) * (cellSize + padding)); // ajustement pour inclure l'espace de 5 pixels et une ligne supplémentaire pour les chiffres des colonnes

  // Ajout des chiffres des colonnes en haut de la grille
  var columnLabels = gridContainer.selectAll("text.column-label")
    .data(d3.range(cols))
    .enter()
    .append("text")
    .attr("class", "column-label")
    .attr("x", function (d) { return (d + 0.5) * (cellSize + padding); }) // ajustement pour inclure l'espace de 5 pixels
    .attr("y", cellSize / 2)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .text(function (d) { return d; });

  // Ajout des cases de la grille
  var grid = gridContainer.selectAll("rect")
    .data(d3.range(rows * cols))
    .enter()
    .append("rect")
    .attr("x", function (d) { return (d % cols) * (cellSize + padding); }) // ajustement pour inclure l'espace de 5 pixels
    .attr("y", function (d) { return Math.floor(d / cols) * (cellSize + padding) + cellSize + padding; }) // ajustement pour inclure l'espace de 5 pixels et commence à dessiner la grille après la ligne de chiffres des colonnes
    .attr("width", cellSize)
    .attr("height", cellSize)
    .attr("fill", "#fff")
    .attr("stroke", "#ccc")
    .attr("rx", 5);
}
