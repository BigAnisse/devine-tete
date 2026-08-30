const socket = io();

let monPrenom = sessionStorage.getItem('prenom') || '';
let codeActuel = sessionStorage.getItem('codePartie') || '';

const ecrans = {
  accueil: document.getElementById('ecran-accueil'),
  lobby: document.getElementById('ecran-lobby'),
  attribution: document.getElementById('ecran-attribution'),
  jeu: document.getElementById('ecran-jeu'),
  finManche: document.getElementById('ecran-fin-manche'),
  fin: document.getElementById('ecran-fin')
};

function afficherEcran(nom) {
  Object.values(ecrans).forEach(e => e.classList.add('cache'));
  ecrans[nom].classList.remove('cache');
}

const divErreur = document.getElementById('erreur');
function afficherErreur(msg) {
  divErreur.textContent = msg;
  divErreur.classList.remove('cache');
}

if (monPrenom && codeActuel) {
  socket.emit('rejoindre_partie', { codePartie: codeActuel, prenom: monPrenom });
}

// --- Écran accueil ---
document.getElementById('btn-creer').addEventListener('click', () => {
  monPrenom = document.getElementById('input-prenom').value.trim();
  if (!monPrenom) return afficherErreur('Entre ton prénom.');
  const nbManches = parseInt(document.getElementById('input-nb-manches').value, 10) || 1;
  codeActuel = Math.floor(1000 + Math.random() * 9000).toString();
  sessionStorage.setItem('prenom', monPrenom);
  sessionStorage.setItem('codePartie', codeActuel);
  socket.emit('rejoindre_partie', { codePartie: codeActuel, prenom: monPrenom, nbManches });
});

document.getElementById('btn-rejoindre').addEventListener('click', () => {
  monPrenom = document.getElementById('input-prenom').value.trim();
  codeActuel = document.getElementById('input-code').value.trim();
  if (!monPrenom || !codeActuel) return afficherErreur('Entre ton prénom et le code.');
  sessionStorage.setItem('prenom', monPrenom);
  sessionStorage.setItem('codePartie', codeActuel);
  socket.emit('rejoindre_partie', { codePartie: codeActuel, prenom: monPrenom });
});

// --- Lobby ---
socket.on('maj_lobby', ({ joueurs, hote }) => {
  document.getElementById('code-affiche').textContent = codeActuel;
  const liste = document.getElementById('liste-joueurs');
  liste.innerHTML = '';
  joueurs.forEach(p => {
    const li = document.createElement('li');
    li.textContent = p + (p === hote ? ' 👑' : '');
    liste.appendChild(li);
  });

  const btnDemarrer = document.getElementById('btn-demarrer');
  const attenteHote = document.getElementById('attente-hote');
  if (monPrenom === hote) {
    btnDemarrer.classList.remove('cache');
    attenteHote.classList.add('cache');
  } else {
    btnDemarrer.classList.add('cache');
    attenteHote.classList.remove('cache');
  }

  afficherEcran('lobby');
});

document.getElementById('btn-demarrer').addEventListener('click', () => {
  socket.emit('demarrer_partie');
});

// --- Attribution ---
socket.on('a_toi_de_choisir', ({ pourQui }) => {
  document.getElementById('titre-attribution').innerHTML = `Choisis un personnage pour <span id="nom-cible">${pourQui}</span>`;
  document.getElementById('input-personnage').disabled = false;
  document.getElementById('input-personnage').value = '';
  document.getElementById('btn-valider-perso').disabled = false;
  afficherEcran('attribution');
});

socket.on('en_attente_attribution', () => {
  document.getElementById('titre-attribution').textContent = 'En attente des autres joueurs...';
  document.getElementById('input-personnage').disabled = true;
  document.getElementById('btn-valider-perso').disabled = true;
  afficherEcran('attribution');
});

document.getElementById('btn-valider-perso').addEventListener('click', () => {
  const personnage = document.getElementById('input-personnage').value.trim();
  if (!personnage) return;
  socket.emit('choisir_personnage', { personnage });
  document.getElementById('input-personnage').disabled = true;
  document.getElementById('btn-valider-perso').disabled = true;
});

// --- Jeu ---
function afficherJeu(joueurs) {
  const liste = document.getElementById('liste-jeu');
  liste.innerHTML = '';
  joueurs.forEach(j => {
    const li = document.createElement('li');
    let texte;
    if (j.personnage === null) {
      texte = j.trouve ? `${j.prenom} : trouvé ✅` : `${j.prenom} : ??? (c'est toi)`;
    } else {
      texte = `${j.prenom} : ${j.personnage}${j.trouve ? ' ✅' : ''}`;
    }
    li.textContent = `${texte} — ${j.pointsTotal} pts`;
    liste.appendChild(li);
  });
}

socket.on('debut_jeu', ({ joueurs, manche, nbManches }) => {
  document.getElementById('info-manche').textContent = `Manche ${manche} / ${nbManches}`;
  afficherJeu(joueurs);
  document.getElementById('message-jeu').textContent = '';
  afficherEcran('jeu');
});

socket.on('maj_jeu', ({ joueurs }) => {
  afficherJeu(joueurs);
});

socket.on('tour', ({ joueurActuel, estMonTour }) => {
  const infoTour = document.getElementById('info-tour');
  const btnDeviner = document.getElementById('btn-deviner');
  const inputDeviner = document.getElementById('input-deviner');

  if (estMonTour) {
    infoTour.textContent = "C'est ton tour ! Devine ton personnage.";
    btnDeviner.disabled = false;
    inputDeviner.disabled = false;
  } else {
    infoTour.textContent = `C'est au tour de ${joueurActuel}.`;
    btnDeviner.disabled = true;
    inputDeviner.disabled = true;
  }
});

document.getElementById('btn-deviner').addEventListener('click', () => {
  const proposition = document.getElementById('input-deviner').value.trim();
  if (!proposition) return;
  socket.emit('deviner', { proposition });
  document.getElementById('input-deviner').value = '';
});

socket.on('reponse_incorrecte', () => {
  document.getElementById('message-jeu').textContent = '❌ Pas ça !';
});

socket.on('bonne_reponse', ({ prenom, points }) => {
  document.getElementById('message-jeu').textContent = `✅ ${prenom} a trouvé (+${points} pts) !`;
});

// --- Fin de manche ---
socket.on('fin_manche', ({ resultats, manche, nbManches, estHote }) => {
  document.getElementById('num-manche-finie').textContent = `${manche} / ${nbManches}`;
  const liste = document.getElementById('liste-resultats-manche');
  liste.innerHTML = '';
  resultats.forEach(r => {
    const li = document.createElement('li');
    li.textContent = `${r.prenom} — ${r.personnage} — total : ${r.pointsTotal} pts`;
    liste.appendChild(li);
  });

  const btnSuivante = document.getElementById('btn-manche-suivante');
  const attente = document.getElementById('attente-hote-manche');
  if (estHote) {
    btnSuivante.classList.remove('cache');
    attente.classList.add('cache');
  } else {
    btnSuivante.classList.add('cache');
    attente.classList.remove('cache');
  }

  afficherEcran('finManche');
});

document.getElementById('btn-manche-suivante').addEventListener('click', () => {
  socket.emit('manche_suivante');
});

// --- Fin de partie ---
socket.on('partie_terminee', ({ classement }) => {
  const liste = document.getElementById('liste-classement');
  liste.innerHTML = '';
  classement.forEach(j => {
    const li = document.createElement('li');
    li.textContent = `${j.prenom} — ${j.pointsTotal} pts`;
    liste.appendChild(li);
  });
  afficherEcran('fin');
  sessionStorage.removeItem('prenom');
  sessionStorage.removeItem('codePartie');
});

// --- Erreurs générales ---
socket.on('erreur', (msg) => afficherErreur(msg));