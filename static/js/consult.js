var type = window.location.pathname.replace("/consult-", "");
var idType = 'qid';
var mainAttr = 'statement';
if (type === "quiz") {
    idType = 'quizid';
    mainAttr = 'name';
}

function deleteElement(props) {
    let elemId = props[idType];
    socket.emit('delete-' + type, { [idType]: elemId });
    setTimeout(() => {
        socket.emit('get-' + type + 's-list');
    }, 200);
}

function updateCreaLists(type, list) {
    let ul = document.getElementById(type + "s-list");
    ul.innerHTML = '';

    for (const elem of list) {
        let elemId = elem[idType];
        let mainAttrVal = elem[mainAttr].substring(0, 60);

        let li = document.createElement("li");
        let span = document.createElement("span");
        let dropdown = document.createElement("ul");
        let modifyLi = document.createElement("li");
        let deleteLi = document.createElement("li");
        let modifyA = document.createElement("a");
        let deleteA = document.createElement("a");
        let sessionLi = document.createElement("li");
        let sessionA = document.createElement("a");

        modifyA.setAttribute("href", "/" + type + "?action=modify&" + idType + "=" + elemId);
        modifyA.innerHTML = "Modifier";

        deleteA.setAttribute('id', JSON.stringify({ [idType]: elemId }));
        deleteA.addEventListener('click', (event) => {
            deleteElement(JSON.parse(event.target.id));
        });
        deleteA.innerHTML = "Supprimer";

        // newA.setAttribute('onclick', "moveQuestion('" + qid + "');");

        sessionA.setAttribute('onclick',"socket.emit('create-session', {'" + idType + "': '" + elemId + "'});"); 
        sessionA.innerHTML = "Lancer une session";

        modifyLi.appendChild(modifyA);
        deleteLi.appendChild(deleteA);
        sessionLi.appendChild(sessionA);

        dropdown.appendChild(modifyLi);
        dropdown.appendChild(deleteLi);
        dropdown.appendChild(sessionLi);

        span.classList.add("opener");
        span.appendChild(document.createTextNode(mainAttrVal + "..."));
        li.appendChild(span);
        li.appendChild(dropdown);
        li.classList.add(type + "-created");

        ul.appendChild(li);
    }
    actualiseDynamics();
}

if (type === "question") {
    var searchTagButton = document.getElementById('tag-search');
    document.addEventListener("keyup", () => {
        socket.emit('get-questions-list', {'tag_search': searchTagButton.value});
    });
}

socket.on(type + 's-list', (message) => {
    updateCreaLists(type, message);
});

socket.on('connect', () => {
    socket.emit('get-' + type + 's-list');
});
