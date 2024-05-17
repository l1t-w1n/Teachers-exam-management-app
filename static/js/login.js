const togglePassword = document.querySelector("#togglePassword");
const passwd = document.querySelector("#password");
togglePassword.addEventListener('click', function (e) {
    const type = passwd.getAttribute('type') === 'password' ? 'text' : 'password';
    passwd.setAttribute('type', type);
    this.classList.toggle('bi-eye');
});

var infoText = document.getElementById("info-text");
var identifier = document.getElementById("identifier");
var password = document.getElementById("password");
var submit = document.getElementById("submit");

socket.on('update-cookies', (message) => {
    document.cookie = "connection_token=" + message['token'] + ";";
    document.cookie = "uid=" + message['uid'];
});

socket.on('login-fail', (message) => {
    infoText.innerText = message['message'];
});

function submitCreds() {
    socket.emit('login', { 'identifier': identifier.value, 'password': password.value });
}

submit.addEventListener("click", submitCreds);

document.addEventListener("keyup", (event) => {
    if (event.code === 'Enter' || event.code === 'NumpadEnter') {
        submitCreds();
    }
});

const urlParams = new URLSearchParams(window.location.search);

if (urlParams['from'] == "other") {
    infoText.innerText = "Vous devez être connecté pour accéder à ces ressources";
}

if (urlParams['from'] == "register") {
    infoText.innerText = "Enregistrement réussi !";
}
