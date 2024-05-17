const fileInput = document.getElementById('csv_list');
var infoText = document.getElementById("info-registration");

socket.on('register-fail', (message) => {
  var li = document.createElement("li");
  li.innerText = message['message'];
  infoText.appendChild(li);
});

socket.on('register-done', (message) => {
  var li = document.createElement("li");
  li.innerText = message['message'];
  infoText.appendChild(li);
});

socket.on('students-list', (message) => {
  console.log(message)
  updateCreaLists(message);
});

fileInput.addEventListener('change', () => {
  const reader = new FileReader();
  console.log("fichier lu");
  reader.readAsText(fileInput.files[0]);
  // Fonction appelée lorsqu'on termine la lecture du fichier
  reader.onload = (event) => {
    const csv = event.target.result; // Contenu du fichier CSV
    const lines = csv.trim().split('\n'); // On sépare le fichier en lignes
    const headers = lines.shift().split(','); // On récupère les en-têtes
    // On boucle sur chaque ligne du fichier
    for (const line of lines) {
      const values = line.replace(/\r/g, '').split(','); // On remplace les caractères "\r" par une chaîne vide avant de séparer la ligne en valeurs
      const etu = {
        identifier: values[2],
        password: values[2],
        last_name: values[0],
        first_name: values[1]
      };
      console.log(etu);
      socket.emit("register-student", etu);
    }
  }
});


function updateCreaLists(list) {
  let ul = document.getElementById("student-list");
  ul.innerHTML = '';

  for (const elem of list) {
    let sId = elem["uid"];
    let identifier = elem["identifier"];
    let li = document.createElement("li");
    let span = document.createElement("span");
    let dropdown = document.createElement("ul");
    let modifyLi = document.createElement("li");
    let modifyA = document.createElement("a");

    modifyA.setAttribute("href", "/stat&" + "uid" + "=" + sId);
    modifyA.innerHTML = "Accéder aux statistiques";

    modifyLi.appendChild(modifyA);

    dropdown.appendChild(modifyLi);

    span.classList.add("opener");
    span.appendChild(document.createTextNode(identifier));
    li.appendChild(span);
    li.appendChild(dropdown);
    li.classList.add("student-registered");

    ul.appendChild(li);
  }
}

socket.emit('get-students-list');
