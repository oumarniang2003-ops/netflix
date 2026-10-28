/**
 * dashboard.js – Dashboard module
 */

const Dashboard = (() => {
  function refresh() {
    renderNetflixWidget();
    renderStats();
    renderExpiringTable();
    renderActivity();
    Alerts.refresh();
  }

  function renderNetflixWidget() {
    const el = Utils.el('dashboard-netflix-widget');
    if (!el) return;
    const codes = DB.netflixCodes ? DB.netflixCodes.getAll() : [];
    const latest = codes[0];
    if (!latest) {
      el.innerHTML = '';
      return;
    }
    const exp = new Date(latest.expiresAt).getTime();
    const isStillValid = exp > Date.now();
    el.innerHTML = `
      <div style="background: linear-gradient(90deg, rgba(229,9,20,0.15), rgba(26,32,53,0.95)); border: 1px solid rgba(229,9,20,0.35); border-radius: 12px; padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; box-shadow: 0 4px 20px rgba(229,9,20,0.1);">
        <div style="display: flex; align-items: center; gap: 0.85rem;">
          <div style="background: #e50914; color: #fff; width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem;">
            N
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <span style="font-weight: 800; font-size: 0.95rem;">Dernier Code Netflix Reçu :</span>
              <span style="font-family: monospace; font-size: 1.25rem; font-weight: 900; color: #fff; background: #0f1117; padding: 0.15rem 0.6rem; border-radius: 8px; border: 1px solid rgba(229,9,20,0.5); letter-spacing: 2px;">
                ${Utils.esc(latest.code)}
              </span>
              <span class="badge ${isStillValid ? 'badge-active' : 'badge-expired'}" style="font-size:0.7rem">
                ${isStillValid ? '● Valide' : '● Expiré'}
              </span>
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem;">
              Pour : ${Utils.esc(latest.email)} • Reçu ${Utils.formatDateTime(latest.receivedAt)}
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
          <button class="btn btn-sm btn-success" onclick="NetflixCodes.sendCodeToAllClients('${latest.id}')" style="background: #25d366; border: none; font-weight: 700;">
            📲 Envoyer WhatsApp (1-Clic)
          </button>
          <button class="btn btn-sm btn-secondary" onclick="Utils.copyToClipboard('${latest.code}', 'Code ${latest.code} copié !')">
            📋 Copier
          </button>
          <button class="btn btn-sm btn-ghost" onclick="UI.navigate('netflix-codes'); App.renderPage('netflix-codes');">
            Gérer les codes ➔
          </button>
        </div>
      </div>
    `;
  }

  // ===================== STATS =====================
  function renderStats() {
    const clients   = DB.clients.getAll();
    const payments  = DB.payments.getAll();
    const subs      = DB.subscriptions.getAll();

    // Update statuses
    clients.forEach(c => {
      const computed = Utils.computeStatus(c.expirationDate, c.status);
      if (computed !== c.status && c.status !== 'suspended') {
        DB.clients.update(c.id, { status: computed });
      }
    });
    const updated = DB.clients.getAll();

    const active    = updated.filter(c => c.status === 'active').length;
    const expired   = updated.filter(c => c.status === 'expired').length;
    const expiring  = updated.filter(c => Utils.daysUntil(c.expirationDate) !== null && Utils.daysUntil(c.expirationDate) >= 0 && Utils.daysUntil(c.expirationDate) <= 7).length;

    const totalRevenue = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const totalCosts   = subs.reduce((s, sub) => s + (Number(sub.cost) || 0), 0);
    const netProfit    = totalRevenue - totalCosts;

    const stats = [
      { label: 'Chiffre d\'affaires', value: Utils.formatCurrency(totalRevenue), icon: '💰', color: 'var(--success)',  bg: 'var(--success-soft)', sub: 'Total des paiements reçus' },
      { label: 'Dépenses totales',    value: Utils.formatCurrency(totalCosts),   icon: '💸', color: 'var(--danger)',   bg: 'var(--danger-soft)',  sub: 'Coût des abonnements' },
      { label: 'Bénéfice net',        value: Utils.formatCurrency(netProfit),    icon: '📈', color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)', bg: netProfit >= 0 ? 'var(--success-soft)' : 'var(--danger-soft)', sub: 'CA – Dépenses' },
      { label: 'Clients actifs',      value: active,   icon: '✅', color: 'var(--accent)',  bg: 'var(--accent-soft)',  sub: 'Abonnements en cours' },
      { label: 'Clients expirés',     value: expired,  icon: '⛔', color: 'var(--danger)',  bg: 'var(--danger-soft)',  sub: 'À relancer' },
      { label: 'Expirent bientôt',    value: expiring, icon: '⚠️', color: 'var(--warning)', bg: 'var(--warning-soft)', sub: 'Dans les 7 prochains jours' },
      { label: 'Abonnements gérés',   value: subs.length, icon: '📋', color: 'var(--info)',  bg: 'var(--info-soft)', sub: 'Comptes & accès' },
      { label: 'Total clients',       value: updated.length, icon: '👥', color: 'var(--accent)', bg: 'var(--accent-soft)', sub: 'Tous statuts confondus' },
    ];

    const grid = Utils.el('stats-grid');
    grid.innerHTML = stats.map(s => `
      <div class="stat-card" style="--stat-color:${s.color};--stat-bg:${s.bg}">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div class="stat-label">${s.label}</div>
          <div class="stat-icon">${s.icon}</div>
        </div>
        <div class="stat-value">${s.value}</div>
        <div class="stat-sub">${s.sub}</div>
      </div>`).join('');
  }

  // ===================== EXPIRING TABLE =====================
  function renderExpiringTable() {
    const tbody = Utils.el('expiring-tbody');
    const clients = DB.clients.getAll()
      .map(c => ({ ...c, days: Utils.daysUntil(c.expirationDate) }))
      .filter(c => c.days !== null && c.days <= 7 && c.days >= -1)
      .sort((a, b) => a.days - b.days);

    if (!clients.length) {
      tbody.innerHTML = Utils.emptyState('Aucun abonnement expirant dans les 7 prochains jours.');
      return;
    }

    tbody.innerHTML = clients.map(c => {
      const waMsg = `Bonjour ${c.name}, votre abonnement ${c.service} expire le ${Utils.formatDate(c.expirationDate)}. Pensez à le renouveler !`;
      return `<tr>
        <td><strong>${Utils.esc(c.name)}</strong></td>
        <td>${Utils.serviceTag(c.service)}</td>
        <td>${Utils.formatDate(c.expirationDate)}</td>
        <td>${Utils.daysLabel(c.days)}</td>
        <td>
          <div style="display:flex;gap:0.35rem">
            <button class="btn btn-sm btn-primary" onclick="Clients.openCredentialsModal('${c.id}')" title="Identifiants & WhatsApp">🔑</button>
            <button class="btn btn-sm btn-success" onclick="Clients.openRenewal('${c.id}')" title="Renouveler">🔄</button>
            <a href="${Utils.waLink(c.whatsapp, waMsg)}" target="_blank" class="wa-btn" style="font-size:0.72rem" title="Contacter sur WhatsApp">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WA
            </a>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  // ===================== ACTIVITY =====================
  function renderActivity() {
    const activity = Utils.el('dashboard-activity');
    const logs = DB.activityLogs.getAll().slice(0, 8);
    if (!logs.length) {
      activity.innerHTML = Utils.emptyStateDiv('Aucune activité récente.');
      return;
    }
    activity.innerHTML = `<div class="history-list">` + logs.map(log => {
      const info = Utils.historyIcon(log.type);
      return `<div class="history-item" style="padding:0.65rem 0.85rem">
        <div class="history-icon" style="background:${info.bg};color:${info.color};width:28px;height:28px;font-size:0.75rem">${info.icon}</div>
        <div class="history-content">
          <div class="history-action" style="font-size:0.83rem">${Utils.esc(log.description)}</div>
        </div>
        <div class="history-date" style="font-size:0.72rem">${Utils.formatDateTime(log.timestamp)}</div>
      </div>`;
    }).join('') + `</div>`;
  }

  function init() {
    // Dashboard renders on app start
  }

  return { init, refresh };
})();
