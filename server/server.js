const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('../client'));

// Stockage de toutes les parties en cours, en mémoire
const parties = {};

// Construit la "vue" d'un joueur : ses infos + celles des autres, sans révéler son propre perso
function vueJoueur(partie, prenom) {
  return partie.joueurs.map(j => ({
    prenom: j.prenom,
    personnage: (j.prenom === prenom && !j.trouve) ? null : j.personnage,
    trouve: j.trouve
  }));
}

// Renvoie à un joueur l'écran correspondant à l'état actuel de la partie
function renvoyerEtatActuel(socket, partie, prenom) {
  if (partie.etat === 'lobby') {
    socket.emit('maj_lobby', { joueurs: partie.joueurs.map(j => j.prenom) });
  } else if (partie.etat === 'attribution') {
    const joueur = partie.joueurs.find(j => j.prenom === prenom);
    if (joueur.aChoisi) {
      socket.emit('en_attente_attribution');
    } else {
      const i = partie.joueurs.findIndex(j => j.prenom === prenom);
      const n = partie.joueurs.length;
      const cible = partie.joueurs[(i + 1) % n];
      socket.emit('a_toi_de_choisir', { pourQui: cible.prenom });
    }
  } else if (partie.etat === 'jeu') {
    socket.emit('debut_jeu', { joueurs: vueJoueur(partie, prenom) });
  } else if (partie.etat === 'fini') {
    const classement = [...partie.joueurs]
      .sort((a, b) => a.ordreTrouve - b.ordreTrouve)
      .map(j => ({ prenom: j.prenom, personnage: j.personnage }));
    socket.emit('partie_terminee', { classement });
  }
}

io.on('connection', (socket) => {

  socket.on('rejoindre_partie', ({ codePartie, prenom }) => {
    if (!parties[codePartie]) {
      parties[codePartie] = { joueurs: [], etat: 'lobby' };
    }
    const partie = parties[codePartie];

    const joueurExistant = partie.joueurs.find(j => j.prenom === prenom);

    if (joueurExistant) {
      // Reconnexion d'un joueur déjà présent (ex: refresh de page)
      joueurExistant.id = socket.id;
      socket.join(codePartie);
      socket.data.codePartie = codePartie;
      socket.data.prenom = prenom;
      renvoyerEtatActuel(socket, partie, prenom);
      return;
    }

    if (partie.etat !== 'lobby') {
      socket.emit('erreur', 'Cette partie a déjà commencé.');
      return;
    }

    partie.joueurs.push({
      id: socket.id,
      prenom,
      personnage: null,
      aChoisi: false,
      trouve: false,
      ordreTrouve: null
    });

    socket.join(codePartie);
    socket.data.codePartie = codePartie;
    socket.data.prenom = prenom;

    io.to(codePartie).emit('maj_lobby', { joueurs: partie.joueurs.map(j => j.prenom) });
  });

  socket.on('demarrer_partie', () => {
    const codePartie = socket.data.codePartie;
    const partie = parties[codePartie];
    if (!partie || partie.joueurs.length < 3) {
      socket.emit('erreur', 'Il faut au moins 3 joueurs pour démarrer.');
      return;
    }

    partie.etat = 'attribution';
    const n = partie.joueurs.length;

    partie.joueurs.forEach((joueur, i) => {
      const cible = partie.joueurs[(i + 1) % n];
      io.to(joueur.id).emit('a_toi_de_choisir', { pourQui: cible.prenom });
    });
  });

  socket.on('choisir_personnage', ({ personnage }) => {
    const codePartie = socket.data.codePartie;
    const partie = parties[codePartie];
    if (!partie) return;

    const i = partie.joueurs.findIndex(j => j.id === socket.id);
    if (i === -1 || partie.joueurs[i].aChoisi) return; // évite un double envoi

    partie.joueurs[i].aChoisi = true;
    const n = partie.joueurs.length;
    const cible = partie.joueurs[(i + 1) % n];
    cible.personnage = personnage;

    const tousAssignes = partie.joueurs.every(j => j.personnage !== null);

    if (tousAssignes) {
      partie.etat = 'jeu';
      partie.joueurs.forEach(joueur => {
        io.to(joueur.id).emit('debut_jeu', { joueurs: vueJoueur(partie, joueur.prenom) });
      });
    } else {
      socket.emit('en_attente_attribution');
    }
  });

  socket.on('deviner', ({ proposition }) => {
    const codePartie = socket.data.codePartie;
    const partie = parties[codePartie];
    if (!partie) return;

    const joueur = partie.joueurs.find(j => j.id === socket.id);
    if (!joueur || joueur.trouve) return;

    const correct = proposition.trim().toLowerCase() === joueur.personnage.trim().toLowerCase();

    if (correct) {
      joueur.trouve = true;
      const dejaTrouve = partie.joueurs.filter(j => j.trouve).length;
      joueur.ordreTrouve = dejaTrouve;

      partie.joueurs.forEach(j => {
        io.to(j.id).emit('maj_jeu', { joueurs: vueJoueur(partie, j.prenom) });
      });

      const tousTrouve = partie.joueurs.every(j => j.trouve);
      if (tousTrouve) {
        partie.etat = 'fini';
        const classement = [...partie.joueurs]
          .sort((a, b) => a.ordreTrouve - b.ordreTrouve)
          .map(j => ({ prenom: j.prenom, personnage: j.personnage }));
        io.to(codePartie).emit('partie_terminee', { classement });
      }
    } else {
      socket.emit('reponse_incorrecte');
    }
  });

  socket.on('disconnect', () => {
    // Le joueur reste dans la partie (juste déconnecté), il pourra revenir via rejoindre_partie
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});