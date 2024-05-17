var answersInput = document.getElementById("answers");
var enonceInput = document.getElementById("enonce");
var outputDiv = document.getElementById("output");
var answersOutput = document.getElementById("output-answers");
var submit = document.getElementById('submit');
var submitTag = document.getElementById('submitTag');

var aNum = 1;
var qid = "";
var tagsList = [];
var qtype = "";

function loadAnswerInput(enonce = "") {
  var div = document.getElementById("output-input");
  div.innerHTML = '<li id="rliN0"><input type="number" name="answer" id="rN0" step="0.01" required /><label for="answer"></label><input type="hidden" checked id="rvN0">   </li>';
  var input = document.getElementById("rN0");
  input.value = enonce;
}

function addSelectedTag(tag) {
  var ul = document.getElementById('selected-tags');
  var li = document.createElement('li');
  var div = document.createElement('div');
  div.className = 'div-tag-button'
  var removeA = document.createElement('a');
  var deleteA = document.createElement('a');
  removeA.className = 'button small icon solid fa-xmark';
  deleteA.className = 'button small icon solid fa-trash';
  removeA.innerHTML = 'Enlever';
  deleteA.innerHTML = 'Supprimer';
  removeA.setAttribute('onclick', "moveTag({'tid' : '" + tag['tid'] + "', 'name' : '" + tag['name'] + "'})");
  deleteA.setAttribute('onclick', "removeTag('" + tag['tid'] + "');");
  div.appendChild(removeA);
  div.appendChild(deleteA);
  li.innerHTML = tag['name'];
  li.appendChild(div);
  li.id = "t" + tag['tid'];
  ul.appendChild(li);
}

function addTagToList(tag) {
  var ul = document.getElementById('not-selected-tags');
  var li = document.createElement('li');
  var div = document.createElement('div');
  div.className = 'div-tag-button'
  var addA = document.createElement('a');
  var deleteA = document.createElement('a');
  addA.className = 'button small icon solid fa-check add-delete-button';
  deleteA.className = 'button small icon solid fa-trash';
  addA.innerHTML = 'Ajouter';
  deleteA.innerHTML = 'Supprimer';
  addA.setAttribute('onclick', "moveTag({'tid' : '" + tag['tid'] + "', 'name' : '" + tag['name'] + "'})");
  deleteA.setAttribute('onclick', "removeTag('" + tag['tid'] + "');");
  div.appendChild(addA);
  div.appendChild(deleteA);
  li.innerHTML = tag['name'];
  li.appendChild(div);
  li.id = "t" + tag['tid'];
  ul.appendChild(li);
}

function moveTag(tag) {
  var tagLi = document.getElementById('t' + tag['tid']);
  var sTags = document.getElementById("selected-tags");
  var nsTags = document.getElementById("not-selected-tags");

  if (sTags.contains(tagLi)) {
    sTags.removeChild(tagLi);
    addTagToList(tag);

  } else {
    nsTags.removeChild(tagLi);
    addSelectedTag(tag);
  }
}

function removeTag(tid) {
  socket.emit('delete-tag', { 'tid': tid });
  setTimeout(() => {
    socket.emit('get-tags-list');
  }, 200);
};


function newAnswerInput(enonce = "", value = false, rid = "") {
  var newLiInput = document.createElement("li");
  var newAnswerInput = document.createElement("textarea");
  var newLiOutput = document.createElement("li");
  var newCheckOutput = document.createElement("input");
  newCheckOutput.classList.add("disabled-checkbox-output");
  newCheckOutput.type = "checkbox";
  newCheckOutput.name = "false-checkbox"
  newCheckOutput.disabled = true;
  var newCheckOutputLabel = document.createElement('label');
  newCheckOutputLabel.setAttribute('for', 'false-checkbox');
  var newAnswerOutput = document.createElement("div");
  var newDeleteInput = document.createElement("a");
  var newSwitchInput = document.createElement("input");
  var newSwitchDiv = document.createElement("div")

  var allid = "N" + aNum;
  aNum++;
  if (rid != "") {
    allid = rid;
  }

  newDeleteInput.id = allid;
  newDeleteInput.setAttribute("href", '#');
  newDeleteInput.setAttribute('onclick', "removeAnswerInput('" + allid + "');");
  newDeleteInput.classList = "button small icon solid solid fa-trash-can";
  newDeleteInput.innerHTML = 'Supprimer';

  newSwitchInput.type = "checkbox";
  newSwitchInput.setAttribute("name", "check");
  newSwitchInput.checked = value;
  newSwitchInput.id = "rv" + allid;

  var newLabelSwitch = document.createElement("label");
  newLabelSwitch.setAttribute("for", "rv" + allid);

  newAnswerInput.id = "r" + allid;
  newAnswerInput.className = "enonce answer";
  newAnswerInput.rows = "2";
  newAnswerInput.placeholder = "Veuillez saisir l'énoncé de la réponse...";
  newAnswerInput.value = enonce;

  newAnswerOutput.id = "r" + allid;
  newAnswerOutput.className = "enonce output answer";
  newAnswerOutput.placeholder = "Veuillez saisir l'énoncé de la réponse...";

  newSwitchDiv.className = "checkdiv"
  newSwitchDiv.appendChild(newSwitchInput);
  newSwitchDiv.appendChild(newLabelSwitch);

  var newDivActions = document.createElement("div");
  newDivActions.className = "actions-button";
  newDivActions.appendChild(newSwitchDiv);
  newDivActions.appendChild(newDeleteInput);

  newLiInput.appendChild(newAnswerInput);
  newLiInput.appendChild(newDivActions)
  newLiInput.id = "rli" + allid;
  newLiInput.appendChild(document.createElement('br'));

  newLiOutput.appendChild(newAnswerOutput);
  newLiOutput.id = "rli" + allid;
  newLiOutput.appendChild(newCheckOutput);
  newLiOutput.appendChild(newCheckOutputLabel);

  answersInput.appendChild(newLiInput);
  answersOutput.appendChild(newLiOutput);
}


function removeAnswerInput(rid) {
  answersInput.querySelector('[id="rli' + rid + '"]').remove();
  answersOutput.querySelector('[id="rli' + rid + '"]').remove();
  aNum--;
}

function insertText(text, input) {
  var cursorPos = input.selectionStart;
  var currentValue = input.value;
  var newValue = currentValue.substring(0, cursorPos) + text + currentValue.substring(cursorPos);

  input.value = newValue;
  input.selectionStart = cursorPos + text.length;
  input.selectionEnd = cursorPos + text.length;
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

function renderAll() {
  var enonce = enonceInput.value;
  outputDiv.innerHTML = renderText(enonce, qid);
  var answersHtmlList = answersInput.querySelectorAll('[id^="r"]');
  answersHtmlList.forEach((answer) => {
    if (answer.id.startsWith("rv") || answer.id.startsWith("rli")) {
      return;
    }
    var elemO = answersOutput.querySelector('[id="' + answer.id + '"]');
    elemO.innerHTML = renderText(answer.value, answer.id);
  });
}


const bold = document.getElementById("bold");
bold.addEventListener("click", function () {
  if (bold.classList.contains("selected")) {
    insertText("**", enonceInput);
  } else {
    insertText("**", enonceInput);
  }
  bold.classList.toggle("selected");
});

const italic = document.getElementById("italic");
italic.addEventListener("click", function () {
  if (italic.classList.contains("selected")) {
    insertText("*", enonceInput);
  } else {
    insertText("*", enonceInput);
  }
  italic.classList.toggle("selected");
});

const latex = document.getElementById("latex");
latex.addEventListener("click", function () {
  if (latex.classList.contains("selected")) {
    insertText("$$", enonceInput);
  } else {
    insertText("$$", enonceInput);
  }
  latex.classList.toggle("selected");
});

const mermaid2 = document.getElementById("mermaid2");
mermaid2.addEventListener("click", function () {
  if (!mermaid2.classList.contains("selected")) {
    insertText("```mermaid", enonceInput);
  } else {
    insertText("```", enonceInput);
  }
  mermaid2.classList.toggle("selected");
});

const code = document.getElementById("code");
code.addEventListener("click", function () {
  if (!code.classList.contains("selected")) {
    insertText("```<langage>\n", enonceInput);
  } else {
    insertText("```", enonceInput);
  }
  code.classList.toggle("selected");
});

function radio(qtype) {
  if (qtype === "qcm") {
    document.getElementById("qtype-radio").innerHTML = `
    <div class="col-4 col-12-small">
    <input type="radio" id="qcm" name="qtype" value="qcm" disabled checked/>
    <label for="qcm">QCM</label>
    </div>

    <div class="col-4 col-12-small">
    <input type="radio" id="num" name="qtype" value="num" disabled/>
    <label for="num">Numérique</label>
    </div>

    <div class="col-4 col-12-small">
    <input type="radio" id="opn" name="qtype" value="opn" disabled/>
    <label for="opn">Ouverte</label>
    </div>
  `;
  }
  else if (qtype === "num") {
    document.getElementById("qtype-radio").innerHTML = `
    <div class="col-4 col-12-small">
    <input type="radio" id="qcm" name="qtype" value="qcm" disabled/>
    <label for="qcm">QCM</label>
    </div>

    <div class="col-4 col-12-small">
    <input type="radio" id="num" name="qtype" value="num" disabled checked/>
    <label for="num">Numérique</label>
    </div>

    <div class="col-4 col-12-small">
    <input type="radio" id="opn" name="qtype" value="opn" disabled/>
    <label for="opn">Ouverte</label>
    </div>
  `;
  }
  else if (qtype === "opn") {
    document.getElementById("qtype-radio").innerHTML = `
    <div class="col-4 col-12-small">
    <input type="radio" id="qcm" name="qtype" value="qcm" disabled/>
    <label for="qcm">QCM</label>
    </div>

    <div class="col-4 col-12-small">
    <input type="radio" id="num" name="qtype" value="num" disabled/>
    <label for="num">Numérique</label>
    </div>

    <div class="col-4 col-12-small">
    <input type="radio" id="opn" name="qtype" value="opn" disabled checked/>
    <label for="opn">Ouverte</label>
    </div>
  `;
  }
}

function inputOutputAnswer(qtype) {
  if (qtype === "qcm") {
    document.getElementById("answers").innerHTML = '';
    document.getElementById("button-answers").innerHTML = `
    <div id="answerNum"></div>
    <p id="add-q">
      <button class="add-question-button primary button" type="button"
        onclick="newAnswerInput()">Ajouter une réponse</button>
    </p>
  `;

    document.getElementById("output-input").innerHTML = ``;
    document.getElementById("output-answers").innerHTML = ``;
    document.getElementById("input-title").innerHTML = `Réponses`;
    document.getElementById("output-title").innerHTML = `Réponses`;
  }
  else if (qtype === "num") {
    document.getElementById("button-answers").innerHTML = '';
    document.getElementById("answers").innerHTML = '<li id="rliN0"><input type="number" name="answer" id="rN0" step="0.01" required /><label for="answer"></label><input type="hidden" checked id="rvN0">   </li>';
    document.getElementById("output-answers").innerHTML = ``;
    document.getElementById("output-input").innerHTML = `<input type="number" step="0.01" disabled>`;
    document.getElementById("input-title").innerHTML = `Réponse`;
    document.getElementById("output-title").innerHTML = `Réponse`;
  }
  else if (qtype === "opn") {
    document.getElementById("button-answers").innerHTML = '';
    document.getElementById("answers").innerHTML = '<li id="rliN0" hidden><input type="number" name="answer" id="rN0" step="0.01" required hidden /><label for="answer"></label><input type="hidden" checked id="rvN0">   </li>';
    document.getElementById("output-answers").innerHTML = ``;
    document.getElementById("output-input").innerHTML = ``;
    document.getElementById("input-title").innerHTML = ``;
    document.getElementById("output-title").innerHTML = ``;
  }
}


socket.on('tags-list', (message) => {
  var ul1 = document.getElementById('selected-tags');
  var ul2 = document.getElementById('not-selected-tags');
  ul1.innerHTML = '';
  ul2.innerHTML = '';
  for (tag of message) {
    addTagToList(tag);
    for (qstid of tag['qids']) {
      if (qid == qstid) {
        moveTag(tag);
      }
    }
  };
});


socket.on('question', (message) => {
  qid = message['qid'];
  enonceInput.value = message['statement'];
  qtype = message['type'];
  for (rid of message['rids']) {
    socket.emit('get-answer', { 'rid': rid });
  }
  radio(qtype);
  inputOutputAnswer(qtype);
  setTimeout(() => {
    socket.emit('get-tags-list');
  }, 200);
});


socket.on('answer', (message) => {
  if (qtype === "qcm") {
    newAnswerInput(message['statement'], message['value'], message['rid']);
  }
  else if (qtype === "num") {
    loadAnswerInput(message['statement']);
  }
});

const urlParams = new URLSearchParams(window.location.search);

if (urlParams.get('action') == "modify") {
  action = "modify";
  socket.emit('get-question', { 'qid': urlParams.get('qid') });
  document.getElementById("title").innerHTML = '<h1>Modifier une question</h1>';
}
else if (urlParams.get('action') == "create") {
  action = "create";
  inputOutputAnswer("qcm");
  document.getElementById("title").innerHTML = '<h1>Créer une question</h1>';
  socket.emit('get-tags-list');
}

var button1 = document.getElementById("qcm");
var button2 = document.getElementById("num");
var button3 = document.getElementById("opn");

button1.addEventListener("click", () => { qtype = "qcm"; inputOutputAnswer("qcm"); });
button2.addEventListener("click", () => { qtype = "num"; inputOutputAnswer("num"); });
button3.addEventListener("click", () => { qtype = "num"; inputOutputAnswer("opn"); });

function submitModifications() {
  var answersHtmlList = answersInput.querySelectorAll('[id^="r"]');
  var answersList = {};
  var tagsList = [];
  answersHtmlList.forEach((answer) => {
    if (answer.id.startsWith("rli")) {
      return;
    }
    if (answer.id[1] == "v") {
      answersList[answer.id.slice(2)]['value'] = answer.checked;
    } else {
      answersList[answer.id.slice(1)] = { 'statement': answer.value };
    }
  });
  if (button1.checked) {
    qtype = "qcm";
  } else if (button2.checked) {
    qtype = "num";
  }else if (button3.checked) {
    qtype = "opn";
  }
  var selectedTagsList = document.querySelectorAll("ul#selected-tags [id^='t']");
  selectedTagsList.forEach((tag) => {
    var tid = tag.id.slice(1);
    tagsList.push(tid);
  });
  socket.emit(action + '-question', { 'qid': qid, 'statement': enonceInput.value, 'answers': answersList, 'type': qtype, 'tags': tagsList });
}

submit.addEventListener('click', submitModifications);

document.addEventListener("keyup", (event) => {
  if (event.code === 13) {
    submitModifications();
  }
});

var addTagButton = document.getElementById('add-tag-button');

addTagButton.addEventListener('click', () => {
  let tagNameInput = document.getElementById('new-tag-input');
  let tagName = tagNameInput.value;
  tagNameInput.value = "";
  socket.emit('create-tag', { 'name': tagName });
  setTimeout(() => {
    socket.emit('get-tags-list');
  }, 200);
});
