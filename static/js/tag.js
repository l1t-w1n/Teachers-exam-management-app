var tagid = "";
var questionNum = 0;

var socket = io();
var tagname = document.getElementById("tag-name");
var submit = document.getElementById('submit');
const urlParams = new URLSearchParams(window.location.search);
var sQuestions = document.getElementById("selected-questions");
var nsQuestions = document.getElementById("not-selected-questions");
var qNum = document.getElementById("qNum");
qNum.innerText = questionNum;

function moveQuestion(qid) {
    var question = document.getElementById("ql" + qid);

    if (sQuestions.contains(question)) {
        question.querySelector('[id="' + qid + '"]').innerHTML = '<svg fill="#80BF80" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--! Font Awesome Pro 6.2.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/></svg>';
        nsQuestions.appendChild(question);
        questionNum--;
    } else {
        question.querySelector('[id="' + qid + '"]').innerHTML = '<svg fill="#E36A6A" class="croix" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--! Font Awesome Pro 6.2.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z\"/></svg>';
        sQuestions.appendChild(question);
        questionNum++;
    }
    qNum.innerText = questionNum;
}

function addQuestionToList(qid, enonce) {
    var li = document.createElement("li");
    var newA = document.createElement("a");

    newA.setAttribute('id', qid);
    newA.setAttribute("href", '#');
    newA.setAttribute('onclick', "moveQuestion(" + qid + ");");
    newA.innerHTML = '<svg fill="#80BF80" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--! Font Awesome Pro 6.2.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/></svg>';

    li.setAttribute('id', "ql" + qid);
    li.appendChild(document.createTextNode(enonce.substring(0, 60) + "..."));
    li.appendChild(newA);

    nsQuestions.appendChild(li);
}

function submitModifications() {
    let qOjbs = sQuestions.querySelectorAll('[id^="ql"]');
    var questionsList = [];
    qOjbs.forEach((question) => {
        questionsList.push(question.id.slice(2));
    });
    socket.emit(action + '-tag', { 'tagid': tagid, 'name': tagname.value, 'questions': questionsList });
}

submit.addEventListener("click", submitModifications);

socket.on('error', (message) => {
    if (message['type'] == "connection") {
        infotxt.innerText = message['error'];
    } else {
        alert(message['error']);
    }
});

socket.on('success', (message) => {
    document.location.replace(message['redirect']);
});

socket.on('question', (message) => {
    moveQuestion(message['qid'], message['enonce']);
});

socket.on('questions-list', (message) => {
    for (var question of message) {
        addQuestionToList(question['qid'], question['enonce']);
    }
});

socket.on('tag', (message) => {
    tagid = message['tagid'];
    tagname.value = message['name'];
    for (var qid of message['questions']) {
        socket.emit('get-question', { 'qid': qid });
    }
});

var action = "modify";

socket.emit("get-questions-list");

setTimeout(() => {
    if (urlParams.get('action') == "modify") {
        socket.emit('get-tag', { 'tagid': urlParams.get('tagid') });
    }
    if (urlParams.get('action') == "create") {
        action = "create";
    }
}, 200);
