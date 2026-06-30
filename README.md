# Session Chat

Petit chat statique pour GitHub Pages.

## Deploiement GitHub Pages

1. Copiez les fichiers `index.html`, `styles.css` et `app.js` dans un depot GitHub.
2. Activez GitHub Pages sur la branche voulue.
3. Ouvrez le site, copiez le lien de session et envoyez-le a l'autre personne.

## Fonctionnement

- Le site est statique: aucun serveur applicatif n'est necessaire.
- Les messages passent en pair-a-pair avec WebRTC.
- Le code utilise `trystero` via CDN pour aider les navigateurs a se trouver.
- Rien n'est enregistre par cette application; si les deux personnes quittent, la discussion disparait.

## Limites utiles a connaitre

- Les deux personnes doivent etre connectees en meme temps.
- Certains reseaux d'entreprise ou VPN peuvent bloquer WebRTC.
- Comme tout chat sans compte, toute personne ayant le lien ou le code peut rejoindre la session.
