const socket = io();

let monPrenom = '';
let codeActuel = '';

// Éléments des écrans
const ecrans = {
  accueil: document.getElementById('ecran-accueil'),
  lobby: document.getElementById('ecran-lobby'),
  attribution: document.getElementById('ecran-attribution'),
  jeu: document.getElementById('ecran-jeu'),
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

// --- Écran accueil ---
document.getElementById('btn-creer').addEventListener('click', () => {
  monPrenom = document.getElementById('input-prenom').value.trim();
  if (!monPrenom) return afficherErreur('Entre ton prénom.');
  codeActuel = Math.floor(1000 + Math.random() * 9000).toString();
  socket.emit('rejoindre_partie', { codePartie: codeActuel, prenom: monPrenom });
});

document.getElementById('btn-rejoindre').addEventListener('click', () => {
  monPrenom = document.getElementById('input-prenom').value.trim();
  codeActuel = document.getElementById('input-code').value.trim();
  if (!monPrenom || !codeActuel) return afficherErreur('Entre ton prénom et le code.');
  socket.emit('rejoindre_partie', { codePartie: codeActuel, prenom: monPrenom });
});

// --- Lobby ---
socket.on('maj_lobby', ({ joueurs }) => {
  document.getElementById('code-affiche').textContent = codeActuel;
  const liste = document.getElementById('liste-joueurs');
  liste.innerHTML = '';
  joueurs.forEach(p => {
    const li = document.createElement('li');
    li.textContent = p;
    liste.appendChild(li);
  });
  afficherEcran('lobby');
});

document.getElementById('btn-demarrer').addEventListener('click', () => {
  socket.emit('demarrer_partie');
});

// --- Attribution ---
socket.on('a_toi_de_choisir', ({ pourQui }) => {
  document.getElementById('nom-cible').textContent = pourQui;
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
    if (j.personnage === null) {
      li.textContent = j.trouve ? `${j.prenom} : trouvé ✅` : `${j.prenom} : ??? (c'est toi)`;
    } else {
      li.textContent = `${j.prenom} : ${j.personnage}${j.trouve ? ' ✅' : ''}`;
    }
    liste.appendChild(li);
  });
}

socket.on('debut_jeu', ({ joueurs }) => {
  afficherJeu(joueurs);
  afficherEcran('jeu');
});

socket.on('maj_jeu', ({ joueurs }) => {
  afficherJeu(joueurs);
});

document.getElementById('btn-deviner').addEventListener('click', () => {
  const proposition = document.getElementById('input-deviner').value.trim();
  if (!proposition) return;
  socket.emit('deviner', { proposition });
});

socket.on('reponse_incorrecte', () => {
  document.getElementById('message-jeu').textContent = '❌ Pas ça, réessaie !';
});

// --- Fin ---
socket.on('partie_terminee', ({ classement }) => {
  const liste = document.getElementById('liste-classement');
  liste.innerHTML = '';
  classement.forEach(j => {
    const li = document.createElement('li');
    li.textContent = `${j.prenom} — c'était ${j.personnage}`;
    liste.appendChild(li);
  });
  afficherEcran('fin');
});

// --- Erreurs générales ---
socket.on('erreur', (msg) => afficherErreur(msg));