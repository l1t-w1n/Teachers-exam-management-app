var qNum = document.getElementById("qNum");
var sQuestions = document.getElementById("selected-questions");
var nsQuestions = document.getElementById("not-selected-questions");
var quizName = document.getElementById("quiz-name");
var renderedQuestions = document.getElementById('questions');
var submit = document.getElementById('submit');
var quizid = "";
var qtypeBuffer = {};
var actionBuffer = "";
var qidsBuffer = [];

qNum.innerText = 0;

function createPDF() {
  var element = document.querySelector(".visualiser").querySelector("[id='questions']");

  var options = {
    filename: 'quiz.pdf',
    margin : [5,5,5,5],
    html2canvas:  { scale: 1, scrollY: 0 }
  };
  var  scale = 0.5;
  html2pdf()
    .set(options)
    .from(element)
    //.scale(scale)
    .save();
}

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

function newQuestionRender(qid, enonce, qtype) {
  var htmlText = '<li id="qr' + qid + '">\
                      <div class="box">\
                      ' + renderText(enonce, qid) + '\
                      </div><br>\
                      <ul id="output-answers"></ul>\
                    </li><br>';

  renderedQuestions.innerHTML += htmlText;
}

function newAnswerRender(rid, enonce, qid) {
  var questionUl = renderedQuestions.querySelector('[id="qr' + qid + '"]').querySelector('[id="output-answers"]');
  console.log(rid, qtypeBuffer[qid]);
  if (qtypeBuffer[qid] === "qcm") {
    var htmlText = '<li id="r' + rid + '"><input name="qcm" type="checkbox"><label for="qcm"></label>' + renderText(enonce, rid) + '\</li>';
    questionUl.innerHTML += htmlText;
  }
  else {
    questionUl.innerHTML = "<input disabled>"
  }
}


var x = '<a class="button small icon solid fa-xmark add-delete-button">Enlever</a>';
var v = '<a class="button small icon solid fa-check add-delete-button">Ajouter</a>';


function actualise_questions_num() {
  var num = 0;
  var allRQ = renderedQuestions.querySelectorAll('[id^="qr"]');
  allRQ.forEach((question) => {
    num++;
  });
  qNum.innerText = num;
}

function moveQuestion(qid) {
  console.log(qid);
  var question = document.getElementById("ql" + qid);
  var btn = question.querySelector('[id="' + qid + '"]');

  if (sQuestions.contains(question)) {
    document.getElementById('qr' + qid).remove();
    btn.innerHTML = "Ajouter";
    btn.className = "button small icon solid fa-check add-delete-button";
    nsQuestions.appendChild(question);
  } else {
    btn.innerHTML = "Enlever";
    btn.className = "button small icon solid fa-xmark add-delete-button";
    sQuestions.appendChild(question);
    socket.emit('get-question', { 'qid': qid });
  }
  actualise_questions_num();
}

function addQuestionToList(qid, enonce) {
  var li = document.createElement("li");
  var newA = document.createElement("a");

  newA.setAttribute('id', qid)
  newA.setAttribute('onclick', "moveQuestion('" + qid + "');");
  newA.className = "button small icon solid fa-check";
  newA.innerHTML = "Ajouter"

  li.setAttribute('id', "ql" + qid);
  li.appendChild(document.createTextNode(enonce.substring(0, 60) + "..."));
  li.appendChild(newA);

  nsQuestions.appendChild(li);
}

function submitModifications() {
  var questionsHtmlList = renderedQuestions.querySelectorAll('[id^="qr"]');
  var qidsList = [];
  questionsHtmlList.forEach((question) => {
    qidsList.push(question.id.slice(2));
  });
  socket.emit(action + '-quiz', { 'quizid': quizid, 'name': quizName.value, 'qids': qidsList });
}

socket.on('quiz', (message) => {
  quizName.value = message['name'];
  for (qid of message['qids']) {
    if (actionBuffer !== "search" || qidsBuffer.indexOf(qid) > -1) {
      moveQuestion(qid);
    }
  }
});

socket.on('answer', (message) => {
  var rid = message['rid'];
  var enonce = message['statement'];
  var qid = message['qid'];
  newAnswerRender(rid, enonce, qid);
});

socket.on('question', (message) => {
  var qid = message['qid'];
  var enonce = message['statement'];
  var qtype = message['type'];
  console.log(qtype)
  qtypeBuffer[qid] = qtype;
  newQuestionRender(qid, enonce, qtype);
  for (var rid of message['rids']) {
    socket.emit('get-answer', { 'rid': rid });
  }
  actualise_questions_num();
});

socket.on('questions-list', (message) => {
  nsQuestions.innerHTML = '';
  sQuestions.innerHTML = '';
  renderedQuestions.innerHTML = '';
  for (var question of message) {
    var qid = question['qid'];
    if (actionBuffer === "search") {
      qidsBuffer.push(qid);
    }
    var enonce = question['statement'];
    addQuestionToList(qid, enonce);
  }
});


var searchTagButton = document.getElementById('tag-search');
document.addEventListener("keyup", () => {
  actionBuffer = "search";
  qidsBuffer = [];
  if (searchTagButton.value === "") {
    actionBuffer = "";
    socket.emit('get-questions-list');
  } else {
    socket.emit('get-questions-list', { 'tag_search': searchTagButton.value });
  }
  if (action === "modify") {
    setTimeout(() => {
      socket.emit('get-quiz', { 'quizid': quizid });
    }, 100);
  }
});

socket.emit('get-questions-list');

const urlParams = new URLSearchParams(window.location.search);

setTimeout(() => {
  if (urlParams.get('action') == "modify") {
    action = "modify";
    quizid = urlParams.get('quizid');
    socket.emit('get-quiz', { 'quizid': quizid });
    document.getElementById("title").innerHTML = '<h1>Modifier un quiz</h1>';
  }

  else if (urlParams.get('action') == "create") {
    action = "create";
    document.getElementById("title").innerHTML = '<h1>Créer un quiz</h1>';
  }
}, 200);

submit.addEventListener("click", submitModifications);

