const togglePassword = document.querySelector("#togglePassword");
const passwd = document.querySelector("#password");
togglePassword.addEventListener('click', function (e) {
    const type = passwd.getAttribute('type') === 'password' ? 'text' : 'password';
    passwd.setAttribute('type', type);
    this.classList.toggle('bi-eye');
});

var infoText = document.getElementById("info-text");
var mail = document.getElementById("mail");
var password = document.getElementById("password");
var lastname = document.getElementById("lastname");
var firstname = document.getElementById("firstname");
var submit = document.getElementById("submit");


function isValidMail(input) {
    var validRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    if (input.match(validRegex)) {
        return true;

    } else {
        return false;
    }
}

socket.on('update-cookies', (message) => {
    document.cookie = "connection_token=" + message['token'];
    document.cookie = "uid=" + message['uid'];
});

socket.on('register-fail', (message) => {
    infoText.innerHTML = infoText.innerHTML + message['message'];
});

function submitCreds() {
    if (isValidMail(mail.value)) {
        if (password.value != "") {
            socket.emit('register', {'identifier': mail.value,
                                     'password': password.value,
                                     'last_name': lastname.value,
                                     'first_name': firstname.value
                                    });
        } else {
            alert('Le mot de passe ne peut pas être vide');
        }
    }
    else {
        alert('Email non valide');
    }
}

submit.addEventListener("click", submitCreds);

document.addEventListener("keyup", (event) => {
    if (event.code === 'Enter' || event.code === 'NumpadEnter') {
        submitCreds();
    }
});
