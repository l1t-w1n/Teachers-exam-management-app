var auth_level = 0;

socket.on('error', (e) => {
    console.log('Error: ' + e);
});

socket.on('server-error', (message) => {
    alert(message['type'] + ": " + message['message']);
});

socket.on('auth-level', (message) => {
    let div = document.getElementById("button-login");
    let ul = document.getElementById("menu-list");
    let mainBtn = document.getElementById("main-button");

    div.innerHTML = '<li><a href="/account" class="button icon solid fa-user">Mon compte</a></li><li><a href="/disconnect" class="primary button icon solid fa-power-off">Se déconnecter</a></li>';
    if (mainBtn != null) mainBtn.href = "/consult-question";

    auth_level = message['level'];

    if (auth_level === 1) { //cas "élève"
        ul.innerHTML = '<li><a href="/">Page d\'accueil</a></li><li><a href="/join">Rejoindre une session</a></li>';
    }
    else if (auth_level === 2) { //Cas "prof"
        ul.innerHTML = '<li><a href="/">Page d\'accueil</a></li><li><a href="/consult-question">Mes questions</a></li><li><a href="/consult-quiz">Mes quiz</a></li><li><a href="/register-student">Mes étudiants</a></li><li><a href="/subject">Créer des sujets</a></li>';
    }
    else { //Cas ou l'utilisateur n'est pas connecté
        div.innerHTML = '<li><a href="/login" class="button icon solid fa-key">Se connecter</a></li><li><a href="/register" class="primary button icon regular fa-clipboard">S\'inscrire</a></li>';
        ul.innerHTML = '<li><a href="/">Page d\'accueil</a></li>';
        if (mainBtn != null) mainBtn.href = "/register";
    }
    window.dispatchEvent(new Event('resize'));
});

socket.on('redirect', (message) => {
    let new_location = message['location'];
    if (message['parameters']) {
        new_location += "?";
        for (const [key, value] of Object.entries(message['parameters'])) {
            if (new_location.slice(-1) !== "?") {
                new_location += "&";
            }
            new_location += key + "=" + value;
        }
    }
    document.location.replace(new_location);
});


socket.on('connect', () => {
    socket.emit('get-auth-level');
});
