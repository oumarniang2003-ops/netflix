/**
 * netflix-codes.js – Module d'automatisation des codes temporaires & foyers Netflix
 */

const NetflixCodes = (() => {

  function getLatestCode() {
    return DB.netflixCodes.getLatest();
  }

  function getClientPortalUrl(clientId) {
    const origin = window.location.origin;
    const path = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
    return `${origin}${path}/portal.html?c=${clientId}`;
  }

  function render() {
    renderActiveCard();
    renderClientsTable();
    renderHistoryTable();
    updateCountdown();
  }

  // ===================== CARTE DU CODE ACTIF =====================
  function renderActiveCard() {
    const latest = getLatestCode();
    const container = Utils.el('nfc-active-card-container');
    if (!container) return;

    if (!latest) {
      container.innerHTML = `
        <div class="card" style="border: 1px dashed var(--border-strong); text-align: center; padding: 2rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📡</div>
          <h3 style="font-size: 1.1rem; margin-bottom: 0.3rem;">Aucun code Netflix en cours</h3>
          <p style="color: var(--text-muted); font-size: 0.88rem; max-width: 480px; margin: 0 auto 1.2rem;">
            Dès qu'un client demande une mise à jour sur sa TV ou qu'un email Netflix arrive, le code à 4 chiffres s'affichera ici instantanément.
          </p>
          <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-primary" onclick="NetflixCodes.simulateTestCode()">⚡ Simuler un code reçu (Test)</button>
            <button class="btn btn-secondary" onclick="NetflixCodes.openQuickAddModal()">✍️ Saisir un code manuellement</button>
          </div>
        </div>`;
      return;
    }

    const exp = new Date(latest.expiresAt).getTime();
    const now = Date.now();
    const isStillValid = exp > now;
    const diffMs = Math.max(0, exp - now);
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    const countdownStr = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;

    container.innerHTML = `
      <div class="card" style="background: linear-gradient(135deg, rgba(229,9,20,0.08), rgba(26,32,53,0.9)); border: 1px solid rgba(229,9,20,0.3); box-shadow: 0 8px 32px rgba(229,9,20,0.15);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 44px; height: 44px; border-radius: 12px; background: #e50914; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.2rem; color: #fff;">
              N
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <h3 style="font-size: 1.15rem; font-weight: 800; margin: 0;">Code Netflix Reçu</h3>
                <span class="badge ${isStillValid ? 'badge-active' : 'badge-expired'}">
                  ${isStillValid ? '● Valide en direct' : '● Expiré'}
                </span>
              </div>
              <div style="font-size: 0.82rem; color: var(--text-muted);">
                Compte : <strong>${Utils.esc(latest.email)}</strong> • Reçu ${Utils.formatDateTime(latest.receivedAt)}
              </div>
            </div>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 0.78rem; color: var(--text-muted); display: block;">Temps restant</span>
            <span id="nfc-live-timer" style="font-size: 1.25rem; font-weight: 800; color: ${isStillValid ? 'var(--success)' : 'var(--danger)'};">
              ${isStillValid ? countdownStr : '00:00'}
            </span>
          </div>
        </div>

        <!-- 4 digits visual -->
        <div style="display: flex; align-items: center; justify-content: center; gap: 0.75rem; margin: 1.5rem 0;">
          ${latest.code.split('').map(d => `
            <div style="width: 60px; height: 75px; background: #0f1117; border: 2px solid rgba(229,9,20,0.5); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; font-weight: 900; color: #fff; box-shadow: 0 4px 15px rgba(229,9,20,0.3);">
              ${d}
            </div>
          `).join('')}
        </div>

        <!-- Actions -->
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center;">
          <button class="btn btn-success" onclick="NetflixCodes.sendCodeToAllClients('${latest.id}')" style="background: #25d366; border: none; font-weight: 700;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Envoyer le code au client par WhatsApp (1-Clic)
          </button>
          <button class="btn btn-secondary" onclick="Utils.copyToClipboard('${latest.code}', 'Code ${latest.code} copié !')">
            📋 Copier le code
          </button>
          <button class="btn btn-ghost" onclick="NetflixCodes.openQuickAddModal()">
            ✍️ Nouveau code
          </button>
        </div>
      </div>`;
  }

  // ===================== TABLEAU DES CLIENTS NETFLIX =====================
  function renderClientsTable() {
    const tbody = Utils.el('nfc-clients-tbody');
    if (!tbody) return;

    const netflixClients = DB.clients.getAll().filter(c => c.service === 'Netflix');
    const latest = getLatestCode();

    if (!netflixClients.length) {
      tbody.innerHTML = Utils.emptyState('Aucun client Netflix enregistré pour le moment.');
      return;
    }

    tbody.innerHTML = netflixClients.map(c => {
      const portalUrl = getClientPortalUrl(c.id);
      const codeMsg = latest 
        ? `Bonjour ${c.name}, voici votre code Netflix pour débloquer votre écran : *${latest.code}*. (Valable pendant 15 minutes).` 
        : `Bonjour ${c.name}, en cas de déconnexion Netflix sur votre TV, retrouvez votre code en temps réel sur votre portail : ${portalUrl}`;

      return `
        <tr>
          <td>
            <strong>${Utils.esc(c.name)}</strong>
            <div style="font-size:0.75rem;color:var(--text-muted)">${Utils.esc(c.profile || 'Profil')} • PIN: ${Utils.esc(c.pinCode || '1234')}</div>
          </td>
          <td>${c.whatsapp ? `<a href="tel:${c.whatsapp}" style="color:var(--text-primary)">${c.whatsapp}</a>` : '—'}</td>
          <td>${Utils.statusBadge(c.status)}</td>
          <td>
            <a href="${portalUrl}" target="_blank" class="btn btn-sm btn-ghost" style="font-size:0.75rem" title="Ouvrir le portail du client">
              🌐 Ouvrir Portail
            </a>
          </td>
          <td>
            <div style="display: flex; gap: 0.4rem;">
              <a href="${Utils.waLink(c.whatsapp, codeMsg)}" target="_blank" class="btn btn-sm btn-success" style="font-size:0.75rem;background:#25d366" title="Envoyer le code par WhatsApp">
                📲 Envoyer Code
              </a>
              <button class="btn btn-sm btn-secondary" onclick="NetflixCodes.copyPortalLink('${c.id}')" title="Copier le lien autonome du client">
                🔗 Copier Lien
              </button>
            </div>
          </td>
        </tr>`;
    }).join('');
  }

  // ===================== HISTORIQUE DES CODES =====================
  function renderHistoryTable() {
    const tbody = Utils.el('nfc-history-tbody');
    if (!tbody) return;

    const codes = DB.netflixCodes.getAll();
    if (!codes.length) {
      tbody.innerHTML = Utils.emptyState('Aucun code reçu dans l\'historique.');
      return;
    }

    tbody.innerHTML = codes.map(c => `
      <tr>
        <td>
          <span style="font-family:monospace;font-size:1.1rem;font-weight:800;color:var(--accent);letter-spacing:1px">${Utils.esc(c.code)}</span>
        </td>
        <td>${Utils.esc(c.email)}</td>
        <td>${Utils.formatDateTime(c.receivedAt)}</td>
        <td>${Utils.esc(c.source)}</td>
        <td>
          <button class="btn btn-sm btn-ghost" onclick="DB.netflixCodes.delete('${c.id}'); NetflixCodes.render();" title="Supprimer">
            🗑️
          </button>
        </td>
      </tr>
    `).join('');
  }

  // ===================== ACTIONS =====================
  function copyPortalLink(clientId) {
    const url = getClientPortalUrl(clientId);
    Utils.copyToClipboard(url, 'Lien du portail client copié !');
  }

  function sendCodeToAllClients(codeId) {
    const code = DB.netflixCodes.getById(codeId) || getLatestCode();
    if (!code) return;

    const netflixClients = DB.clients.getAll().filter(c => c.service === 'Netflix');
    if (!netflixClients.length) {
      UI.toast('Aucun client Netflix trouvé.', 'warning');
      return;
    }

    // If only one or multiple, open first or prompt
    const client = netflixClients[0];
    const portalUrl = getClientPortalUrl(client.id);
    const msg = `Bonjour ${client.name}, voici votre code temporaire Netflix : *${code.code}*.\n\nEntrez-le sur votre téléviseur pour reprendre vos vidéos (valable 15 minutes).\n\nVotre lien d'accès en direct : ${portalUrl}`;
    window.open(Utils.waLink(client.whatsapp, msg), '_blank');
  }

  function simulateTestCode() {
    const testCode = String(Math.floor(1000 + Math.random() * 9000));
    DB.netflixCodes.add({
      code: testCode,
      email: 'stream.netflix1@gmail.com',
      source: 'Test Simulé (info@account.netflix.com)',
      householdLink: 'https://www.netflix.com/update-primary-location'
    });
    render();
    UI.toast(`Code Netflix ${testCode} généré avec succès !`, 'success');
  }

  function openQuickAddModal() {
    const code = prompt('Entrez le code à 4 chiffres reçu de Netflix :');
    if (!code || code.trim().length < 4) return;
    const cleanCode = code.trim().slice(0, 4);
    DB.netflixCodes.add({
      code: cleanCode,
      email: 'stream.netflix1@gmail.com',
      source: 'Saisie manuelle rapide'
    });
    render();
    UI.toast(`Code ${cleanCode} enregistré et disponible sur les portails clients !`, 'success');
  }

  function updateCountdown() {
    const timer = Utils.el('nfc-live-timer');
    if (!timer) return;
    const latest = getLatestCode();
    if (!latest) return;
    const exp = new Date(latest.expiresAt).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, exp - now);
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    timer.textContent = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
    timer.style.color = diffMs > 0 ? 'var(--success)' : 'var(--danger)';
  }

  function init() {
    // Timer interval for countdown
    setInterval(updateCountdown, 1000);
  }

  return {
    init,
    render,
    simulateTestCode,
    openQuickAddModal,
    sendCodeToAllClients,
    copyPortalLink,
  };
})();
