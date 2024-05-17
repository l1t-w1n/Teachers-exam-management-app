// const togglePassword = document.querySelector("#togglePassword");
// const passwd = document.querySelector("#password");
// togglePassword.addEventListener('click', function (e) {
//     const type = passwd.getAttribute('type') === 'password' ? 'text' : 'password';
//     passwd.setAttribute('type', type);
//     this.classList.toggle('bi-eye');
// });

var newPassCheck = document.getElementById("newPassCheck");
var newPassBox = document.getElementById("newPassBox");
var infotxt = document.getElementById("info-text");
var mail = document.getElementById("email");
var password = document.getElementById("password");
var newPassword = document.getElementById("new_password");
var lastname = document.getElementById("last_name");
var firstname = document.getElementById("first_name");
var submit = document.getElementById("submit");
var listeEtudiantsCsv = document.getElementById("csv_list");
var submitCsv = document.getElementById("submit_csv");


function ValidateEmail(input) {
    var validRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    if (input.match(validRegex)) {
        return true;

    } else {
        return false;
    }
}

socket.on('modify-account-fail', (message) => {
    infoText.innerText = message['message'];
});

function newPass(element) {
    if (element.checked) {
        newPassBox.style.display = "block";
    } else {
        newPassBox.style.display = "none";
    }
}

function submitCreds() {
    if (ValidateEmail(mail.value)) {
        let message = {'identifier': mail.value,
                        'password': password.value,
                        'last_name': lastname.value,
                        'first_name': firstname.value
                      }

        if (newPassword.value != "") {
            message['new_password'] = newPassword.value;
        }
        socket.emit('modify-account', message);
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

// function parse_csv() {
//     let array = [];
//     Papa.parse(
//         listeEtudiantsCsv.files[0],
//         {
//             download: true,
//             skipEmptyLines: true,
//             complete: function(results) {
//                 array = results.data;
//                 socket.emit('liste_etudiants', array);
//             }
//         }
//     );
// }

// submitCsv.addEventListener('click', parse_csv);

socket.on('connect', () => {
    socket.emit('get-account-infos');
});
