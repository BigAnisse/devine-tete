const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('../client'));

// Stockage de toutes les parties en cours, en mémoire
// parties = { "4821": { joueurs: [...], etat: "lobby" } }
const parties = {};

io.on('connection', (socket) => {

  // Un joueur rejoint (ou crée) une partie avec son prénom
  socket.on('rejoindre_partie', ({ codePartie, prenom }) => {
    if (!parties[codePartie]) {
      parties[codePartie] = { joueurs: [], etat: 'lobby' };
    }
    const partie = parties[codePartie];

    if (partie.etat !== 'lobby') {
      socket.emit('erreur', 'Cette partie a déjà commencé.');
      return;
    }

    partie.joueurs.push({
      id: socket.id,
      prenom,
      personnage: null,
      trouve: false,
      ordreTrouve: null
    });

    socket.join(codePartie);
    socket.data.codePartie = codePartie;

    io.to(codePartie).emit('maj_lobby', {
      joueurs: partie.joueurs.map(j => j.prenom)
    });
  });

  // L'hôte démarre la partie
  socket.on('demarrer_partie', () => {
    const codePartie = socket.data.codePartie;
    const partie = parties[codePartie];
    if (!partie || partie.joueurs.length < 3) {
      socket.emit('erreur', 'Il faut au moins 3 joueurs pour démarrer.');
      return;
    }

    partie.etat = 'attribution';
    const n = partie.joueurs.length;

    // Chaque joueur i doit choisir un perso pour le joueur (i+1) % n
    partie.joueurs.forEach((joueur, i) => {
      const cible = partie.joueurs[(i + 1) % n];
      io.to(joueur.id).emit('a_toi_de_choisir', { pourQui: cible.prenom });
    });
  });

  // Un joueur envoie le personnage qu'il attribue au joueur suivant
  socket.on('choisir_personnage', ({ personnage }) => {
    const codePartie = socket.data.codePartie;
    const partie = parties[codePartie];
    if (!partie) return;

    const i = partie.joueurs.findIndex(j => j.id === socket.id);
    const n = partie.joueurs.length;
    const cible = partie.joueurs[(i + 1) % n];
    cible.personnage = personnage;

    // Vérifie si tout le monde a reçu un personnage
    const tousAssignes = partie.joueurs.every(j => j.personnage !== null);

    if (tousAssignes) {
      partie.etat = 'jeu';
      // Envoie à chaque joueur la liste des autres (avec leur perso), pas le sien
      partie.joueurs.forEach(joueur => {
        const vue = partie.joueurs.map(j => ({
          prenom: j.prenom,
          personnage: j.id === joueur.id ? null : j.personnage,
          trouve: j.trouve
        }));
        io.to(joueur.id).emit('debut_jeu', { joueurs: vue });
      });
    }
  });

  // Un joueur tente de deviner son personnage
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

      // Prévient tout le monde de la mise à jour (qui a trouvé quoi)
      partie.joueurs.forEach(j => {
        const vue = partie.joueurs.map(p => ({
          prenom: p.prenom,
          personnage: (p.id === j.id && !p.trouve) ? null : p.personnage,
          trouve: p.trouve
        }));
        io.to(j.id).emit('maj_jeu', { joueurs: vue });
      });

      const tousTrouve = partie.joueurs.every(j => j.trouve);
      if (tousTrouve) {
        const classement = [...partie.joueurs]
          .sort((a, b) => a.ordreTrouve - b.ordreTrouve)
          .map(j => ({ prenom: j.prenom, personnage: j.personnage }));
        io.to(codePartie).emit('partie_terminee', { classement });
        partie.etat = 'fini';
      }
    } else {
      socket.emit('reponse_incorrecte');
    }
  });

  socket.on('disconnect', () => {
    // Optionnel : gérer la déconnexion d'un joueur en cours de partie
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});