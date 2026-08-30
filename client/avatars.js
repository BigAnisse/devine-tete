// Bibliothèque d'avatars — éléments originaux et absurdes, 4 options par catégorie

const AVATAR_OPTIONS = {
  chapeaux: [
    `<ellipse cx="100" cy="45" rx="55" ry="12" fill="#8B5A2B"/><rect x="75" y="10" width="50" height="40" rx="10" fill="#8B5A2B"/>`,
    `<polygon points="100,0 75,50 125,50" fill="#FF4757"/><circle cx="100" cy="0" r="8" fill="#FFD700"/>`,
    `<rect x="70" y="15" width="60" height="35" rx="6" fill="#95A5A6"/><rect x="125" y="28" width="20" height="6" fill="#7F8C8D"/>`,
    `<ellipse cx="100" cy="40" rx="30" ry="20" fill="#F1C40F"/><path d="M85 20 L90 0 M100 20 L100 -5 M115 20 L110 0" stroke="#27AE60" stroke-width="6" fill="none"/>`
  ],
  tetes: [
    `<circle cx="100" cy="80" r="38" fill="#FFE156"/><rect x="65" y="70" width="70" height="15" rx="6" fill="#2C3E50"/><path d="M75 100 Q100 115 125 100 Q100 108 75 100" fill="#3B2F2F"/>`,
    `<circle cx="100" cy="80" r="38" fill="#2ECC71"/><circle cx="100" cy="75" r="14" fill="white"/><circle cx="100" cy="75" r="6" fill="black"/><path d="M78 100 Q100 118 122 100" stroke="#1B4D3E" stroke-width="4" fill="none"/>`,
    `<circle cx="100" cy="80" r="38" fill="#FF9FF3"/><circle cx="85" cy="72" r="10" fill="white"/><circle cx="85" cy="72" r="4" fill="black"/><circle cx="115" cy="72" r="10" fill="white"/><circle cx="115" cy="72" r="4" fill="black"/><path d="M90 100 Q100 118 105 130" stroke="#E84393" stroke-width="8" fill="none"/>`,
    `<circle cx="100" cy="80" r="38" fill="#74B9FF"/><rect x="60" y="68" width="80" height="12" fill="#2C3E50"/><circle cx="115" cy="75" r="5" fill="#2C3E50"/><path d="M75 105 Q100 130 125 105 L125 115 Q100 135 75 115 Z" fill="white"/>`
  ],
  bustes: [
    `<rect x="55" y="110" width="90" height="80" rx="14" fill="#00B894"/><circle cx="80" cy="140" r="6" fill="#FDCB6E"/><circle cx="110" cy="155" r="6" fill="#FF7675"/><circle cx="95" cy="175" r="6" fill="#FDCB6E"/>`,
    `<rect x="55" y="110" width="90" height="80" rx="10" fill="#2D3436"/><polygon points="95,110 105,110 115,130 100,190 85,130" fill="#D63031"/>`,
    `<rect x="55" y="110" width="90" height="80" rx="30" fill="#FFEAA7"/><polygon points="55,130 40,140 55,150" fill="#FDCB6E"/><polygon points="145,130 160,140 145,150" fill="#FDCB6E"/>`,
    `<rect x="55" y="110" width="90" height="80" rx="12" fill="#0984E3"/><polygon points="55,115 30,190 55,180" fill="#D63031"/><polygon points="145,115 170,190 145,180" fill="#D63031"/><polygon points="100,130 108,150 128,150 112,162 118,182 100,170 82,182 88,162 72,150 92,150" fill="#FFEAA7"/>`
  ],
  jambes: [
    `<rect x="60" y="190" width="80" height="65" rx="10" fill="#A29BFE"/><circle cx="80" cy="210" r="5" fill="white"/><circle cx="120" cy="225" r="5" fill="white"/><circle cx="95" cy="245" r="5" fill="white"/>`,
    `<rect x="55" y="190" width="90" height="65" rx="14" fill="#FF7675"/><rect x="55" y="190" width="18" height="65" fill="white"/><rect x="91" y="190" width="18" height="65" fill="white"/><rect x="127" y="190" width="18" height="65" fill="white"/>`,
    `<rect x="65" y="190" width="70" height="65" rx="8" fill="#2E86DE"/><rect x="95" y="190" width="10" height="65" fill="#1B4F91"/>`,
    `<rect x="60" y="190" width="80" height="40" rx="10" fill="#00CEC9"/><ellipse cx="80" cy="250" rx="20" ry="8" fill="#0984E3"/><ellipse cx="120" cy="250" rx="20" ry="8" fill="#0984E3"/>`
  ]
};

const NOMS_OPTIONS = {
  chapeaux: ['Cowboy', 'Fête', 'Casserole', 'Ananas'],
  tetes: ['Moustachu', 'Cyclope', 'Langue tirée', 'Pirate'],
  bustes: ['Hawaïenne', 'Costard froissé', 'Poulet', 'Super-cape'],
  jambes: ['Pyjama pois', 'Clown', 'Jean slim', 'Palmes']
};

function rendreAvatar(avatar) {
  return `<svg viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg">
    ${AVATAR_OPTIONS.jambes[avatar.jambes]}
    ${AVATAR_OPTIONS.bustes[avatar.buste]}
    ${AVATAR_OPTIONS.tetes[avatar.tete]}
    ${AVATAR_OPTIONS.chapeaux[avatar.chapeau]}
  </svg>`;
}