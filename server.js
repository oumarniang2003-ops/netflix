/**
 * server.js – Serveur local & Robot d'écoute des emails Netflix
 * Permet de synchroniser les codes reçus de Netflix et d'héberger le portail client.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const CODES_FILE = path.join(__dirname, 'netflix-codes.json');

// Initialiser le fichier des codes si inexistant
if (!fs.existsSync(CODES_FILE)) {
  fs.writeFileSync(CODES_FILE, JSON.stringify([
    {
      id: 'NFC-INIT',
      code: '7492',
      email: 'stream.netflix1@gmail.com',
      source: 'Initialisation automatique',
      receivedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      householdLink: 'https://www.netflix.com/update-primary-location'
    }
  ], null, 2));
}

function getCodes() {
  try {
    return JSON.parse(fs.readFileSync(CODES_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveCode(codeData) {
  const codes = getCodes();
  const newEntry = {
    id: 'NFC-' + Date.now().toString(36).toUpperCase(),
    code: String(codeData.code).trim(),
    email: codeData.email || 'stream.netflix1@gmail.com',
    source: codeData.source || 'Email automatique',
    receivedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    householdLink: codeData.householdLink || 'https://www.netflix.com/update-primary-location'
  };
  codes.unshift(newEntry);
  if (codes.length > 50) codes.splice(50);
  fs.writeFileSync(CODES_FILE, JSON.stringify(codes, null, 2));
  console.log(`[NETFLIX-BOT] Nouveau code reçu et enregistré : ${newEntry.code} pour ${newEntry.email}`);
  return newEntry;
}

// Types MIME
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API : Obtenir le dernier code
  if (pathname === '/api/latest-code' && req.method === 'GET') {
    const codes = getCodes();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(codes[0] || null));
    return;
  }

  // API : Tous les codes
  if (pathname === '/api/netflix-codes' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getCodes()));
    return;
  }

  // API : Enregistrer un nouveau code (par webhook ou robot)
  if (pathname === '/api/netflix-codes' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const saved = saveCode(data);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(saved));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Données invalides' }));
      }
    });
    return;
  }

  // Servir les fichiers statiques
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Fichier non trouvé');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 SERVEUR SUBMANAGER & ROBOT NETFLIX ACTIF !`);
  console.log(`👉 Tableau de bord : http://localhost:${PORT}`);
  console.log(`👉 Portail Client  : http://localhost:${PORT}/portal.html`);
  console.log(`======================================================\n`);
});
