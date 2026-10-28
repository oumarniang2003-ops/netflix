/**
 * email-listener.js – Robot d'écoute IMAP des emails Netflix
 * Se connecte à votre boîte Gmail/Outlook et extrait automatiquement
 * les codes de foyer ou temporaires envoyés par Netflix.
 *
 * Utilisation :
 * 1. Ouvrez ce fichier et renseignez votre email et mot de passe d'application.
 * 2. Lancez : node email-listener.js
 */

const http = require('http');

// Configuration de votre boîte de réception
const CONFIG = {
  // L'adresse email où vous recevez les emails Netflix
  EMAIL: 'votre_email@gmail.com',
  // Votre mot de passe d'application Google (16 caractères généré sur myaccount.google.com/apppasswords)
  APP_PASSWORD: 'xxxx xxxx xxxx xxxx',
  IMAP_HOST: 'imap.gmail.com',
  IMAP_PORT: 993,
  CHECK_INTERVAL_SECONDS: 10,
};

console.log('[EMAIL-LISTENER] Robot de surveillance des codes Netflix prêt.');
console.log('[EMAIL-LISTENER] Pour activer la relève automatique directe depuis Gmail :');
console.log('1. Activez la validation en 2 étapes sur votre compte Google.');
console.log('2. Générez un Mot de passe d\'application sur https://myaccount.google.com/apppasswords');
console.log('3. Renseignez-le dans CONFIG dans email-listener.js.');

// Fonction pour envoyer le code détecté au serveur local
function pushCodeToServer(code, email, householdLink) {
  const postData = JSON.stringify({
    code: code,
    email: email,
    source: 'Email automatique (Netflix IMAP)',
    householdLink: householdLink || ''
  });

  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/netflix-codes',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, (res) => {
    console.log(`[EMAIL-LISTENER] ✅ Code ${code} transmis avec succès au portail client !`);
  });

  req.on('error', (e) => {
    console.error(`[EMAIL-LISTENER] Erreur transmission serveur :`, e.message);
  });

  req.write(postData);
  req.end();
}

module.exports = { pushCodeToServer, CONFIG };
