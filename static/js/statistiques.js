const urlParams = new URLSearchParams(window.location.search);
var title = document.getElementById('title');
var sid = urlParams.get('sid');
title.innerHTML += sid;

function getTime() {
  var now = new Date();
  var hours = now.getHours().toString().padStart(2, '0');
  var minutes = now.getMinutes().toString().padStart(2, '0');
  return hours + ':' + minutes;
}

function actuStudentsResults(dico, questionsList) {
  var ul = document.getElementById('participants');
  ul.innerHTML = '';
  var goodAnswers = 0;
  for (const [student, questions] of Object.entries(dico)) {
    var numQ = 1;
    ul.innerHTML = '<li class="box" id=' + student + '>Etudiant n°' + student + '<div class="average" id="a' + student + '"> </div><br><br></li>';
    var li = document.getElementById(student);
    for (var qid of questionsList) {
      if (li.innerHTML.slice(-4) === "</i>") {
        li.innerHTML += " | ";
      }
      if (questions[qid]) {
        li.innerHTML += ' Question n°' + numQ + ' : <i class="fa-solid fa-face-laugh-beam"></i>';
        goodAnswers++;
      }
      else {
        li.innerHTML += ' Question n°' + numQ + ' : <i class="fa-solid fa-face-sad-tear"></i>';
      }
      numQ++;
    }
    var average = document.getElementById('a' + student);
    average.innerHTML = "Moyenne : " + goodAnswers + "/" + (numQ - 1);
  }
}

function createBarChart(labels, values, divId) {
  // Création du SVG
  var svg = d3.select("#" + divId)
    .append("svg")
    .attr("width", "100%")
    .attr("height", 300);

  var width = labels.length * 40; // largeur en fonction du nombre d'éléments

  // Echelles
  var x = d3.scaleBand()
    .range([0, width])
    .domain(labels)
    .padding(0.1); // padding ajusté

  var y = d3.scaleLinear()
    .range([250, 0])
    .domain([0, d3.max(values) + 1.1]);

  // Axes
  var xAxis = d3.axisBottom(x);

  var yAxis = d3.axisLeft(y)
    .ticks(5);

  // Ajout des axes
  svg.append("g")
    .attr("transform", "translate(50, 250)")
    .call(xAxis);

  svg.append("g")
    .attr("transform", "translate(50, 0)")
    .call(yAxis);

  // Ajout des bâtons
  svg.selectAll(".bar")
    .data(values)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", function (d, i) { return x(labels[i]) + 50; })
    .attr("y", function (d) { return y(d); })
    .attr("width", x.bandwidth())
    .attr("height", function (d) { return 250 - y(d); });
}

var labels = [];
var values = [];
var sessionBuffer = {};

socket.on("session-stats", (session) => {
  console.log(session);
  sessionBuffer = session;
  var history = session['history'];
  var questionsList = session['questions_list'];
  console.log(questionsList);
  console.log(session['history']['answered'])
  actuStudentsResults(session['history']['answered'], questionsList);
  if (history['connected']) // On vérifie si l'utilisateur a l'accès professeur
  {
    console.log("accès professeur");
    var crea = parseInt(history['created']);
    var end = parseInt(history['states']['end']['time']);
    var connectionTimes = [];
    var disconnectionTimes = [];
    for (const [_, times] of Object.entries(history['connected'])) {
      for (const time of times) {
        connectionTimes.push(parseInt(time));
      }
    }
    for (const [_, times] of Object.entries(history['disconnected'])) {
      for (const time of times) {
        disconnectionTimes.push(parseInt(time));
      }
    }

    var dict = {};
    var currentValue = crea;
    while ((currentValue - 100) <= end) {
      dict[currentValue] = 0;
      currentValue += 100;
    }

    var previous = 0

    for (const [key, _] of Object.entries(dict)) {
      var countConnected = 0;
      var countDisconnected = 0;
      for (const time of connectionTimes) {
        if (time > key - 100 && time <= key) {
          countConnected++;
        }
      }
      for (const time of disconnectionTimes) {
        if (time > key - 100 && time <= key) {
          countDisconnected++;
        }
      }
      dict[key] = previous + countConnected - countDisconnected;
      previous += countConnected - countDisconnected;
    }
    var labels = Object.keys(dict).map(function (key) {
      var sliced = key.toString().slice(-6, -4) + ":" + key.toString().slice(-4, -2);
      return sliced;
    });   // extrait toutes les clés dans un tableau
    var values = Object.values(dict); // extrait toutes les valeurs dans un tableau
    document.getElementById('diagram').innerHTML = '';
    createBarChart(labels, values, 'diagram');
  } else {
    console.log("accès étudiant");
    document.getElementById('limited-access').innerHTML = '';
    document.getElementById('limited-access2').innerHTML = '';
    document.getElementById('modif-title').innerHTML = 'Mes résultats';
  }
});

function updateCreaLists(list) {
  let ul = document.getElementById("others");
  ul.innerHTML = '';
  for (const elem of list) {
    let li = document.createElement("li");
    li.innerHTML = elem;
    ul.appendChild(li);
  }
}

socket.on('students-list', (message) => {
  if (sessionBuffer['history']['connected']) {
    studentList = [];
    connectedList = [];
    nconnectedList = [];
    for (i of message) {
      studentList.push(i['identifier']);
    }
    for (const [studentCo, _] of Object.entries(sessionBuffer['history']['connected'])) {
      connectedList.push(studentCo);
    }
    for (student of studentList) {
      if (!connectedList.includes(student)) {
        nconnectedList.push(student);
      }
    }
    updateCreaLists(nconnectedList);
  }
});

socket.emit('get-session-stats', { 'sid': sid });
setTimeout(() => {
  socket.emit('get-students-list');
}, 200);
