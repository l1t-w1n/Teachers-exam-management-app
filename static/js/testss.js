var socket = io();
var qNum = document.getElementById("qNum");
var sQuestions = document.getElementById("selected-questions");
var nsQuestions = document.getElementById("not-selected-questions");
var renderedQuestions = document.getElementById('questions');

qNum.innerText = 0;

function createPDF() {
  var doc = new jsPDF();
  console.log(doc)
  doc.fromHTML($(".visualiser").get(0), 20, 20, {
    'width': 170,
  });
  doc.save('quiz.pdf');
}

function renderText(text) {
  var outputText = text;

  var markdownRegex = /(```(?:mermaid|tex|[\w-]+)\n[\s\S]+?\n```|.+)/g;
  outputText = outputText.replace(markdownRegex, function (match, p1) {
    if (!match.startsWith("```")) return marked.parse(p1);
    else return match;
  });

  var mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  outputText = outputText.replace(mermaidRegex, function (match, p1) {
    var svgCode = mermaid.render("theGraph", p1);
    return svgCode;
  });

  var latexRegex = /```tex\n([\s\S]*?)```/g;
  outputText = outputText.replace(latexRegex, function (match, p1) {
    var latexCode = katex.renderToString(p1);
    return latexCode;
  });

  var codeRegex = /```(.+)\n([\s\S]*?)```/g;
  outputText = outputText.replace(codeRegex, function (match, p1, p2) {
    var code = Prism.highlight(p2, Prism.languages[p1]);
    return "<pre class='language-" + p1 + "'>" + code + "</pre>"
  });

  return outputText;
}

function newQuestionRender(qid, enonce) {
  var htmlText = '<li id="qr' + qid + '" class="content-wrapper">\
                    <div class="subname-wrapper" id="question-num"></div>\
                    <div id="enonce" class="enonce">\
                    ' + renderText(enonce) + '\
                    </div>\
                    <div class="subname-wrapper"><h2>Réponses</h2></div>\
                    <ul class="ul-enonce" id="answers"></ul>\
                  </li>';

  renderedQuestions.innerHTML += htmlText;
}

function newAnswerRender(rid, enonce, qid) {
  var htmlText = '<li id="r'  + rid + '">\
                    <div id="rd' + rid + '" class="enonce answer">\
                      ' + renderText(enonce) + '\
                    </div>\
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--! Font Awesome Pro 6.2.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d="M384 32C419.3 32 448 60.65 448 96V416C448 451.3 419.3 480 384 480H64C28.65 480 0 451.3 0 416V96C0 60.65 28.65 32 64 32H384zM384 80H64C55.16 80 48 87.16 48 96V416C48 424.8 55.16 432 64 432H384C392.8 432 400 424.8 400 416V96C400 87.16 392.8 80 384 80z"/></svg>\
                  </li>';

  var questionUl = renderedQuestions.querySelector('[id="qr' + qid + '"]').querySelector('[id="answers"]');
  questionUl.innerHTML += htmlText;
}



var x = '<a class="button small icon solid fa-xmark add-delete-button">Enlever</a>';
var v = '<a class="button small icon solid fa-check add-delete-button">Ajouter</a>';


function actualise_questions_num() {
  var num = 0;
  var allRQ = renderedQuestions.querySelectorAll('[id^="qr"]');
  allRQ.forEach((question) => {
    num ++;
    question.querySelector('[id="question-num"]').innerHTML = "<h2>Question " + num + "</h2>";
  });
  qNum.innerText = allRQ.length();  
}

function moveQuestion(qid) {
  var question = document.getElementById("ql" + qid);

  if (sQuestions.contains(question)) {
    var questionRender = document.getElementById('qr' + qid);
    question.querySelector('[id="' + qid + '"]').innerHTML = "Ajouter";
    nsQuestions.appendChild(question);
    questionRender.remove();
    actualise_questions_num();
  } else {
    question.querySelector('[id="' + qid + '"]').innerHTML = "Enlever";
    sQuestions.appendChild(question);
    socket.emit('get-question', { 'qid': qid });
  }
}

function addQuestionToList(qid, enonce) {
  var li = document.createElement("li");
  var newA = document.createElement("a");

  newA.setAttribute('id', qid)
  newA.setAttribute('onclick', "moveQuestion(" + qid + ");");
  newA.className = "button small icon solid fa-check";
  newA.innerHTML = "Ajouter"

  li.setAttribute('id', "ql" + qid);
  li.appendChild(document.createTextNode(enonce.substring(0, 60) + "..."));
  li.appendChild(newA);

  nsQuestions.appendChild(li);
}


function submitModifications() {
  var answersHtmlList = answersInput.querySelectorAll('[id^="r"]');
  var answersList = {};
  answersHtmlList.forEach((answer) => {
    if (answer.id.startsWith("rli")) {
      return;
    }
    if (answer.id[1] == "v") {
      answersList[answer.id.slice(2)]['value'] = answer.checked;
    } else {
      answersList[answer.id.slice(1)] = { 'enonce': answer.value };
    }
  });
  socket.emit(action + '-question', { 'qid': qid, 'enonce': enonceInput.value, 'answers': answersList, 'type': qtype, 'tags': tagsList });
}

submit.addEventListener('click', submitModifications);

socket.on('error', (message) => {
  alert(message['error']);
});

socket.on('answer', (message) => {
  var rid = message['rid'];
  var enonce = message['enonce'];
  var qid = message['qid'];
  newAnswerRender(rid, enonce, qid);
});

socket.on('question', (message) => {
  var qid = message['qid'];
  var enonce = message['enonce'];
  newQuestionRender(qid, enonce);
  for (var rid of message['answers']) {
    socket.emit('get-answer', { 'rid': rid });
  }
  actualise_questions_num();
});

socket.on('questions-list', (message) => {
  for (var question of message) {
    var qid = question['qid'];
    var enonce = question['enonce'];
    addQuestionToList(qid, enonce);
  }
});

socket.emit('get-questions-list');


