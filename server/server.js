const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('../client'));

const parties = {};

function vueJoueur(partie, prenom) {
  return partie.joueurs.map(j => ({
    prenom: j.prenom,
    personnage: (j.prenom === prenom && !j.trouve) ? null : j.personnage,
    trouve: j.trouve,
    pointsTotal: j.pointsTotal,
    avatar: j.avatar
  }));
}

function tourActuelPrenom(partie) {
  return partie.ordreTours[partie.indexTourActuel];
}

function avancerTour(partie) {
  const n = partie.ordreTours.length;
  for (let step = 1; step <= n; step++) {
    const i = (partie.indexTourActuel + step) % n;
    const prenom = partie.ordreTours[i];
    const joueur = partie.joueurs.find(j => j.prenom === prenom);
    if (joueur && !joueur.trouve) {
      partie.indexTourActuel = i;
      return true;
    }
  }
  return false;
}

function envoyerTour(partie) {
  const prenomActuel = tourActuelPrenom(partie);
  partie.joueurs.forEach(j => {
    io.to(j.id).emit('tour', { joueurActuel: prenomActuel, estMonTour: j.prenom === prenomActuel });
  });
}

function demarrerManche(partie) {
  partie.etat = 'attribution';
  partie.joueurs.forEach(j => {
    j.personnage = null;
    j.aChoisi = false;
    j.trouve = false;
    j.ordreTrouve = null;
  });

  const n = partie.joueurs.length;
  partie.joueurs.forEach((joueur, i) => {
    const cible = partie.joueurs[(i + 1) % n];
    io.to(joueur.id).emit('a_toi_de_choisir', { pourQui: cible.prenom });
  });
}

function renvoyerEtatActuel(socket, partie, prenom) {
  if (partie.etat === 'lobby') {
    socket.emit('maj_lobby', {
      joueurs: partie.joueurs.map(j => j.prenom),
      hote: partie.hote
    });
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
    socket.emit('debut_jeu', {
      joueurs: vueJoueur(partie, prenom),
      manche: partie.mancheActuelle,
      nbManches: partie.nbManches
    });
    socket.emit('tour', {
      joueurActuel: tourActuelPrenom(partie),
      estMonTour: tourActuelPrenom(partie) === prenom
    });
  } else if (partie.etat === 'fin_manche') {
    socket.emit('fin_manche', {
      resultats: partie.derniersResultatsManche,
      manche: partie.mancheActuelle,
      nbManches: partie.nbManches,
      estHote: prenom === partie.hote
    });
  } else if (partie.etat === 'fin_partie') {
    socket.emit('partie_terminee', { classement: partie.classementFinal });
  }
}

io.on('connection', (socket) => {

  socket.on('rejoindre_partie', ({ codePartie, prenom, nbManches }) => {
    if (!parties[codePartie]) {
      parties[codePartie] = {
        joueurs: [],
        etat: 'lobby',
        hote: prenom,
        nbManches: (nbManches && nbManches >= 1) ? nbManches : 1,
        mancheActuelle: 1,
        ordreTours: [],
        indexTourActuel: 0,
        derniersResultatsManche: null,
        classementFinal: null
      };
    }
    const partie = parties[codePartie];

    const joueurExistant = partie.joueurs.find(j => j.prenom === prenom);

    if (joueurExistant) {
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
      ordreTrouve: null,
      pointsTotal: 0,
      rangsHistorique: [],
      avatar: { chapeau: 0, tete: 0, buste: 0, jambes: 0 }
    });

    socket.join(codePartie);
    socket.data.codePartie = codePartie;
    socket.data.prenom = prenom;

    io.to(codePartie).emit('maj_lobby', {
      joueurs: partie.joueurs.map(j => j.prenom),
      hote: partie.hote
    });
  });

  socket.on('maj_avatar', ({ avatar }) => {
    const codePartie = socket.data.codePartie;
    const partie = parties[codePartie];
    if (!partie) return;
    const joueur = partie.joueurs.find(j => j.id === socket.id);
    if (joueur && partie.etat === 'lobby') {
      joueur.avatar = avatar;
    }
  });

  socket.on('demarrer_partie', () => {
    const codePartie = socket.data.codePartie;
    const partie = parties[codePartie];
    if (!partie) return;
    if (socket.data.prenom !== partie.hote) {
      socket.emit('erreur', "Seul l'hôte peut démarrer la partie.");
      return;
    }
    if (partie.joueurs.length < 3) {
      socket.emit('erreur', 'Il faut au moins 3 joueurs pour démarrer.');
      return;
    }
    demarrerManche(partie);
  });

  socket.on('choisir_personnage', ({ personnage }) => {
    const codePartie = socket.data.codePartie;
    const partie = parties[codePartie];
    if (!partie) return;

    const i = partie.joueurs.findIndex(j => j.id === socket.id);
    if (i === -1 || partie.joueurs[i].aChoisi) return;

    partie.joueurs[i].aChoisi = true;
    const n = partie.joueurs.length;
    const cible = partie.joueurs[(i + 1) % n];
    cible.personnage = personnage;

    const tousAssignes = partie.joueurs.every(j => j.personnage !== null);

    if (tousAssignes) {
      partie.etat = 'jeu';
      partie.ordreTours = [...partie.joueurs.map(j => j.prenom)].sort(() => Math.random() - 0.5);
      partie.indexTourActuel = 0;

      partie.joueurs.forEach(joueur => {
        io.to(joueur.id).emit('debut_jeu', {
          joueurs: vueJoueur(partie, joueur.prenom),
          manche: partie.mancheActuelle,
          nbManches: partie.nbManches
        });
      });
      envoyerTour(partie);
    } else {
      socket.emit('en_attente_attribution');
    }
  });

  socket.on('deviner', ({ proposition }) => {
    const codePartie = socket.data.codePartie;
    const partie = parties[codePartie];
    if (!partie || partie.etat !== 'jeu') return;

    const prenom = socket.data.prenom;
    if (tourActuelPrenom(partie) !== prenom) return;

    const joueur = partie.joueurs.find(j => j.prenom === prenom);
    if (!joueur || joueur.trouve) return;

    const correct = proposition.trim().toLowerCase() === joueur.personnage.trim().toLowerCase();

    if (correct) {
      joueur.trouve = true;
      const dejaTrouve = partie.joueurs.filter(j => j.trouve).length;
      joueur.ordreTrouve = dejaTrouve;
      const n = partie.joueurs.length;
      const points = n - dejaTrouve + 1;
      joueur.pointsTotal += points;
      joueur.rangsHistorique.push(dejaTrouve);

      io.to(codePartie).emit('bonne_reponse', { prenom, points });
    } else {
      io.to(joueur.id).emit('reponse_incorrecte');
    }

    const tousTrouve = partie.joueurs.every(j => j.trouve);

    if (tousTrouve) {
      partie.derniersResultatsManche = partie.joueurs.map(j => ({
        prenom: j.prenom,
        personnage: j.personnage,
        ordreTrouve: j.ordreTrouve,
        pointsTotal: j.pointsTotal
      })).sort((a, b) => a.ordreTrouve - b.ordreTrouve);

      if (partie.mancheActuelle >= partie.nbManches) {
        partie.etat = 'fin_partie';
        partie.classementFinal = [...partie.joueurs]
          .map(j => ({
            prenom: j.prenom,
            pointsTotal: j.pointsTotal,
            sommeRangs: j.rangsHistorique.reduce((a, b) => a + b, 0)
          }))
          .sort((a, b) => b.pointsTotal - a.pointsTotal || a.sommeRangs - b.sommeRangs);

        io.to(codePartie).emit('partie_terminee', { classement: partie.classementFinal });
      } else {
        partie.etat = 'fin_manche';
        partie.joueurs.forEach(j => {
          io.to(j.id).emit('fin_manche', {
            resultats: partie.derniersResultatsManche,
            manche: partie.mancheActuelle,
            nbManches: partie.nbManches,
            estHote: j.prenom === partie.hote
          });
        });
      }
    } else {
      avancerTour(partie);
      envoyerTour(partie);
      partie.joueurs.forEach(j => {
        io.to(j.id).emit('maj_jeu', { joueurs: vueJoueur(partie, j.prenom) });
      });
    }
  });

  socket.on('manche_suivante', () => {
    const codePartie = socket.data.codePartie;
    const partie = parties[codePartie];
    if (!partie) return;
    if (socket.data.prenom !== partie.hote) return;
    if (partie.etat !== 'fin_manche') return;

    partie.mancheActuelle += 1;
    demarrerManche(partie);
  });

  socket.on('disconnect', () => {
    // le joueur reste dans la partie, pourra revenir via rejoindre_partie
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});