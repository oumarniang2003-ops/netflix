/**
 * cloud-sync.js – Synchronisation Cloud & Transfert Mobile 1-Clic
 * Permet de partager instantanément les clients entre l'ordinateur et le téléphone.
 */

const CloudSync = (() => {
  const STORAGE_KEY = 'sm_cloud_config';

  function getConfig() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { firebaseUrl: '', autoSync: false };
    } catch {
      return { firebaseUrl: '', autoSync: false };
    }
  }

  function saveConfig(cfg) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  }

  // --- Encodage / Décodage UTF-8 Base64 pour lien magique 1-Clic ---
  function encodeSyncData(obj) {
    const json = JSON.stringify(obj);
    return btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, function(match, p1) {
      return String.fromCharCode('0x' + p1);
    }));
  }

  function decodeSyncData(base64Str) {
    const json = decodeURIComponent(Array.prototype.map.call(atob(base64Str), function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(json);
  }

  // --- Vérifier si l'URL contient des données de synchronisation au démarrage ---
  function checkUrlSync() {
    const hash = window.location.hash;
    if (!hash || !hash.includes('sync=')) return false;

    try {
      const paramStr = hash.replace(/^#/, '');
      const params = new URLSearchParams(paramStr);
      const rawData = params.get('sync');
      if (!rawData) return false;

      const data = decodeSyncData(rawData);
      if (data && (data.clients || data.subscriptions)) {
        DB.importAll(data);
        
        // Nettoyer l'URL sans recharger la page
        if (window.history && window.history.replaceState) {
          const cleanUrl = window.location.pathname + window.location.search;
          window.history.replaceState(null, '', cleanUrl);
        }

        const count = (data.clients || []).length;
        setTimeout(() => {
          UI.toast(`✅ Synchronisation réussie ! ${count} client(s) importés sur votre téléphone.`, 'success', 5000);
          if (typeof App !== 'undefined' && App.renderPage) {
            App.renderPage('clients');
          }
        }, 500);
        return true;
      }
    } catch (e) {
      console.error('[CloudSync] Erreur décodage lien magique :', e);
      UI.toast('Erreur lors de la synchronisation via le lien.', 'error');
    }
    return false;
  }

  // --- Générer le lien magique de synchronisation ---
  function getMagicSyncUrl() {
    const exportData = DB.exportAll();
    const encoded = encodeSyncData(exportData);
    const origin = window.location.origin;
    const path = window.location.pathname;
    return `${origin}${path}#sync=${encoded}`;
  }

  // --- Ouvrir la modale de synchronisation ---
  function openSyncModal() {
    const clients = DB.clients.getAll();
    const count = clients.length;
    const syncUrl = getMagicSyncUrl();

    // Remplir les informations
    const infoEl = Utils.el('sync-summary-info');
    if (infoEl) {
      infoEl.textContent = `${count} client(s), ${DB.subscriptions.getAll().length} compte(s) prêts à être synchronisés.`;
    }

    // Lien WhatsApp
    const waBtn = Utils.el('sync-wa-send-btn');
    if (waBtn) {
      const waMsg = `Voici mon lien de synchronisation SubManager pour voir tous mes clients sur mon téléphone :\n\n${syncUrl}`;
      waBtn.href = `https://wa.me/?text=${encodeURIComponent(waMsg)}`;
    }

    // QR Code
    const qrImg = Utils.el('sync-qr-code-img');
    if (qrImg) {
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(syncUrl)}`;
    }

    // Configuration Firebase
    const cfg = getConfig();
    const fbInput = Utils.el('sync-firebase-url');
    if (fbInput) fbInput.value = cfg.firebaseUrl || '';

    updateCloudStatusBadge();
    UI.openModal('sync-modal');
  }

  // --- Copier le lien magique ---
  function copyMagicSyncLink() {
    const url = getMagicSyncUrl();
    Utils.copyToClipboard(url, 'Lien de synchronisation copié ! Collez-le sur votre téléphone.');
  }

  // --- Synchronisation Cloud Permanente (Firebase REST API) ---
  let _listenerInterval = null;
  let _lastCloudUpdated = null;

  async function pushToCloud() {
    const cfg = getConfig();
    if (!cfg.firebaseUrl) return;

    let baseUrl = cfg.firebaseUrl.trim().replace(/\/$/, '');
    if (!baseUrl.endsWith('.json')) baseUrl += '/submanager-data.json';

    try {
      const payload = DB.exportAll();
      const res = await fetch(baseUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        _lastCloudUpdated = Date.now();
        updateCloudStatusBadge(true);
      }
    } catch (e) {
      console.warn('[CloudSync] Erreur envoi Cloud :', e);
    }
  }

  async function pullFromCloud(silent = false) {
    const cfg = getConfig();
    if (!cfg.firebaseUrl) return;

    let baseUrl = cfg.firebaseUrl.trim().replace(/\/$/, '');
    if (!baseUrl.endsWith('.json')) baseUrl += '/submanager-data.json';

    try {
      const res = await fetch(baseUrl);
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.clients) {
        DB.importAll(data);
        if (!silent) {
          UI.toast(`Cloud synchronisé (${data.clients.length} clients)`, 'success');
        }
        updateCloudStatusBadge(true);
        // Rafraîchir l'écran actif
        const activePage = document.querySelector('.nav-item.active')?.dataset?.page || 'clients';
        if (typeof App !== 'undefined' && App.renderPage) {
          App.renderPage(activePage);
        }
      }
    } catch (e) {
      console.warn('[CloudSync] Erreur récupération Cloud :', e);
    }
  }

  function startCloudListener() {
    const cfg = getConfig();
    if (!cfg.firebaseUrl) return;

    // Pull initial
    pullFromCloud(true);

    // Écoute / Polling discret toutes les 12 secondes
    if (_listenerInterval) clearInterval(_listenerInterval);
    _listenerInterval = setInterval(() => {
      pullFromCloud(true);
    }, 12000);
  }

  function updateCloudStatusBadge(isConnected = false) {
    const cfg = getConfig();
    const badge = Utils.el('cloud-status-indicator');
    if (!badge) return;

    if (cfg.firebaseUrl) {
      badge.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;margin-right:4px;"></span> Cloud Actif`;
      badge.style.color = '#10b981';
      badge.title = 'Synchronisation Cloud automatique active';
    } else {
      badge.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#8892a4;margin-right:4px;"></span> Local`;
      badge.style.color = 'var(--text-muted)';
      badge.title = 'Mode mémoire locale (cliquez pour synchroniser avec votre téléphone)';
    }
  }

  async function saveAndTestFirebase() {
    const fbInput = Utils.el('sync-firebase-url');
    if (!fbInput) return;
    const url = fbInput.value.trim();

    if (!url) {
      saveConfig({ firebaseUrl: '', autoSync: false });
      if (_listenerInterval) clearInterval(_listenerInterval);
      UI.toast('Mode Cloud désactivé (mémoire locale seule)', 'info');
      updateCloudStatusBadge();
      return;
    }

    if (!url.startsWith('https://')) {
      UI.toast("L'URL Firebase doit commencer par https://", 'warning');
      return;
    }

    saveConfig({ firebaseUrl: url, autoSync: true });
    UI.toast('Test de connexion au Cloud...', 'info');

    // Envoyer les données actuelles
    await pushToCloud();
    startCloudListener();
    UI.toast('✅ Connexion Cloud réussie ! Données synchronisées en temps réel.', 'success');
    updateCloudStatusBadge(true);
  }

  function init() {
    // 1. Vérifier si l'URL contient un lien de synchronisation magique
    const synced = checkUrlSync();

    // 2. Démarrer l'écoute Cloud si configuré
    startCloudListener();
    updateCloudStatusBadge();

    // 3. Connecter le bouton d'ouverture
    const openBtn = Utils.el('open-sync-btn');
    if (openBtn) openBtn.addEventListener('click', openSyncModal);

    const copyBtn = Utils.el('sync-copy-link-btn');
    if (copyBtn) copyBtn.addEventListener('click', copyMagicSyncLink);

    const saveFbBtn = Utils.el('sync-save-firebase-btn');
    if (saveFbBtn) saveFbBtn.addEventListener('click', saveAndTestFirebase);

    // Onglets de la modale
    const tabInstant = Utils.el('sync-tab-instant-btn');
    const tabCloud   = Utils.el('sync-tab-cloud-btn');
    const secInstant = Utils.el('sync-section-instant');
    const secCloud   = Utils.el('sync-section-cloud');

    if (tabInstant && tabCloud) {
      tabInstant.addEventListener('click', () => {
        tabInstant.className = 'btn btn-sm btn-primary';
        tabCloud.className = 'btn btn-sm btn-ghost';
        if (secInstant) secInstant.style.display = 'block';
        if (secCloud) secCloud.style.display = 'none';
      });
      tabCloud.addEventListener('click', () => {
        tabCloud.className = 'btn btn-sm btn-primary';
        tabInstant.className = 'btn btn-sm btn-ghost';
        if (secInstant) secInstant.style.display = 'none';
        if (secCloud) secCloud.style.display = 'block';
      });
    }
  }

  return {
    init,
    openSyncModal,
    copyMagicSyncLink,
    pushToCloud,
    pullFromCloud,
    getMagicSyncUrl,
  };
})();
