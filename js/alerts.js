/**
 * alerts.js – Alert system module
 */

const Alerts = (() => {
  // Returns sorted alert items for all clients
  function getAlerts() {
    const clients = DB.clients.getAll();
    const alerts  = [];

    clients.forEach(c => {
      const days = Utils.daysUntil(c.expirationDate);
      if (days === null) return;

      let level = null;
      if      (days < 0)  level = 'expired';
      else if (days === 0) level = 'today';
      else if (days === 1) level = '1day';
      else if (days <= 3)  level = '3days';
      else if (days <= 7)  level = '7days';

      if (level) {
        alerts.push({ client: c, days, level });
      }
    });

    // Sort: most urgent first
    alerts.sort((a, b) => a.days - b.days);
    return alerts;
  }

  function levelClass(level) {
    const map = {
      expired: 'alert-expired',
      today:   'alert-today',
      '1day':  'alert-1day',
      '3days': 'alert-3days',
      '7days': 'alert-7days',
    };
    return map[level] || '';
  }

  function levelLabel(level, days) {
    if (level === 'expired') return `⛔ Expiré il y a ${Math.abs(days)} jour(s)`;
    if (level === 'today')   return `🔴 Expire aujourd'hui !`;
    if (level === '1day')    return `🔴 Expire demain !`;
    if (level === '3days')   return `🟠 Expire dans ${days} jours`;
    if (level === '7days')   return `🔵 Expire dans ${days} jours`;
    return `Dans ${days} jours`;
  }

  function renderAlertItem(alert, compact = false) {
    const { client: c, days, level } = alert;
    const waMsg = level === 'expired'
      ? `Bonjour ${c.name}, votre abonnement ${c.service} a expiré le ${Utils.formatDate(c.expirationDate)}. Souhaitez-vous le renouveler ?`
      : `Bonjour ${c.name}, votre abonnement ${c.service} expire le ${Utils.formatDate(c.expirationDate)}. Pensez à le renouveler !`;

    if (compact) {
      return `<div class="alert-item ${levelClass(level)}">
        <div class="alert-dot"></div>
        <div class="alert-content">
          <div class="alert-name">${Utils.esc(c.name)} – <span style="color:var(--text-muted)">${Utils.esc(c.service)}</span></div>
          <div class="alert-detail">${levelLabel(level, days)} · ${Utils.formatDate(c.expirationDate)}</div>
        </div>
        <div class="alert-actions">
          <button class="btn btn-sm btn-primary" onclick="Clients.openCredentialsModal('${c.id}')" title="Identifiants & WhatsApp">🔑</button>
          <button class="btn btn-sm btn-success" onclick="Clients.openRenewal('${c.id}')" title="Renouveler">🔄</button>
          <a href="${Utils.waLink(c.whatsapp, waMsg)}" target="_blank" class="wa-btn">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </a>
        </div>
      </div>`;
    }

    return `<div class="alert-item ${levelClass(level)}">
      <div class="alert-dot"></div>
      <div class="alert-content">
        <div class="alert-name">${Utils.esc(c.name)}</div>
        <div class="alert-detail">
          ${Utils.esc(c.service)} · ID: ${Utils.esc(c.id)} · 
          Expiration : ${Utils.formatDate(c.expirationDate)} · 
          ${levelLabel(level, days)}
        </div>
      </div>
      <div class="alert-actions">
        <button class="btn btn-sm btn-primary" onclick="Clients.openCredentialsModal('${c.id}')" title="Identifiants & WhatsApp">🔑 Accès</button>
        <button class="btn btn-sm btn-success" onclick="Clients.openRenewal('${c.id}')">🔄 Renouveler</button>
        <a href="${Utils.waLink(c.whatsapp, waMsg)}" target="_blank" class="wa-btn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Contacter sur WhatsApp
        </a>
      </div>
    </div>`;
  }

  function render() {
    const container = Utils.el('alerts-container');
    const alerts    = getAlerts();

    if (!alerts.length) {
      container.innerHTML = Utils.emptyStateDiv('Aucune alerte active. Tous les abonnements sont à jour ! ✅');
      return;
    }

    // Group by level
    const groups = {
      expired: { label: '⛔ Expirés',      items: [] },
      today:   { label: '🔴 Aujourd\'hui', items: [] },
      '1day':  { label: '🔴 Demain',       items: [] },
      '3days': { label: '🟠 Dans 2-3 jours', items: [] },
      '7days': { label: '🔵 Dans 4-7 jours', items: [] },
    };
    alerts.forEach(a => {
      if (groups[a.level]) groups[a.level].items.push(a);
    });

    let html = '';
    Object.entries(groups).forEach(([key, group]) => {
      if (!group.items.length) return;
      html += `<div class="card mb-3">
        <div class="card-header"><h2 class="card-title">${group.label} <span class="nav-badge" style="display:inline-block">${group.items.length}</span></h2></div>
        <div class="card-body" style="padding:0.75rem;display:flex;flex-direction:column;gap:0.5rem">
          ${group.items.map(a => renderAlertItem(a, false)).join('')}
        </div>
      </div>`;
    });

    container.innerHTML = html;
  }

  function refresh() {
    const alerts = getAlerts();
    UI.updateAlertsBadge(alerts.length);

    // Render dashboard alerts (compact)
    const dashAlerts = Utils.el('dashboard-alerts');
    if (dashAlerts) {
      if (!alerts.length) {
        dashAlerts.innerHTML = Utils.emptyStateDiv('Aucune alerte active ✅');
      } else {
        const first5 = alerts.slice(0, 5);
        dashAlerts.innerHTML = first5.map(a => renderAlertItem(a, true)).join('');
        if (alerts.length > 5) {
          dashAlerts.innerHTML += `<div style="text-align:center;padding:0.5rem;font-size:0.82rem;color:var(--text-muted)">
            + ${alerts.length - 5} alertes supplémentaires – <a href="#" onclick="UI.navigate('alerts');App.renderPage('alerts')" style="color:var(--accent)">Voir tout</a>
          </div>`;
        }
      }
    }
  }

  function init() {
    // nothing special
  }

  return { init, render, refresh, getAlerts };
})();
