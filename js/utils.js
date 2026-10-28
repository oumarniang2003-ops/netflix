/**
 * utils.js – Utility helpers shared across modules
 */

const Utils = (() => {
  // --- Date helpers ---
  function today() {
    return new Date().toISOString().split('T')[0];
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatDateTime(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) +
           ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    const now  = new Date(); now.setHours(0,0,0,0);
    const exp  = new Date(dateStr + 'T00:00:00');
    return Math.round((exp - now) / 86400000);
  }

  function monthYear(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }

  function monthKey(dateStr) {
    if (!dateStr) return '';
    return dateStr.slice(0, 7); // "2025-10"
  }

  function getLast12Months() {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key:   d.toISOString().slice(0, 7),
        label: d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      });
    }
    return months;
  }

  // --- Number helpers ---
  function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '—';
    return Number(amount).toLocaleString('fr-FR') + ' FCFA';
  }

  function formatPercent(value) {
    if (value === null || value === undefined || !isFinite(value)) return '—';
    return value.toFixed(1) + '%';
  }

  // --- Status helpers ---
  function computeStatus(expirationDate, currentStatus) {
    if (currentStatus === 'suspended') return 'suspended';
    const days = daysUntil(expirationDate);
    if (days === null) return currentStatus || 'active';
    if (days < 0) return 'expired';
    if (days <= 7) return 'expiring';
    return 'active';
  }

  function statusBadge(status) {
    const map = {
      active:    '<span class="badge badge-active">● Actif</span>',
      expired:   '<span class="badge badge-expired">● Expiré</span>',
      expiring:  '<span class="badge badge-expiring">● Bientôt</span>',
      suspended: '<span class="badge badge-suspended">● Suspendu</span>',
    };
    return map[status] || `<span class="badge">${status}</span>`;
  }

  function daysLabel(days) {
    if (days === null) return '—';
    if (days < 0)  return `<span style="color:var(--danger)">Expiré il y a ${Math.abs(days)}j</span>`;
    if (days === 0) return `<span style="color:var(--danger)">Aujourd'hui</span>`;
    if (days === 1) return `<span style="color:var(--danger)">Demain</span>`;
    if (days <= 3) return `<span style="color:var(--danger)">${days} jours</span>`;
    if (days <= 7) return `<span style="color:var(--warning)">${days} jours</span>`;
    return `<span style="color:var(--success)">${days} jours</span>`;
  }

  function methodLabel(method) {
    const map = {
      wave: 'Wave',
      orange_money: 'Orange Money',
      especes: 'Espèces',
      autre: 'Autre',
    };
    return map[method] || method || '—';
  }

  function methodBadge(method) {
    const colors = {
      wave: '#2196f3',
      orange_money: '#ff6600',
      especes: '#4caf50',
      autre: '#9e9e9e',
    };
    const color = colors[method] || '#9e9e9e';
    return `<span style="background:${color}22;color:${color};padding:0.2rem 0.5rem;border-radius:99px;font-size:0.75rem;font-weight:600">${methodLabel(method)}</span>`;
  }

  // --- WhatsApp ---
  function waLink(phone, message = '') {
    const clean = (phone || '').replace(/\D/g, '');
    const text  = encodeURIComponent(message);
    return `https://wa.me/${clean}${text ? '?text=' + text : ''}`;
  }

  // --- DOM helpers ---
  function el(id) { return document.getElementById(id); }

  function clearChildren(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function emptyState(message = 'Aucune donnée disponible') {
    return `<tr><td colspan="20"><div class="empty-state">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
      <p>${message}</p>
    </div></td></tr>`;
  }

  function emptyStateDiv(message = 'Aucun élément') {
    return `<div class="empty-state">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
      <p>${message}</p>
    </div>`;
  }

  // --- Escape HTML ---
  function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // --- Service color dot ---
  function serviceTag(name) {
    const svc = DB.services.getByName(name);
    const color = svc ? svc.color : '#6366f1';
    return `<span style="display:inline-flex;align-items:center;gap:0.3rem"><span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></span>${esc(name)}</span>`;
  }

  // --- History icons ---
  function historyIcon(type) {
    const icons = {
      client_created:  { icon: '👤', bg: 'var(--accent-soft)',   color: 'var(--accent)' },
      client_updated:  { icon: '✏️', bg: 'var(--info-soft)',     color: 'var(--info)' },
      client_deleted:  { icon: '🗑️', bg: 'var(--danger-soft)',   color: 'var(--danger)' },
      payment:         { icon: '💰', bg: 'var(--success-soft)',  color: 'var(--success)' },
      renewal:         { icon: '🔄', bg: 'var(--accent-soft)',   color: 'var(--accent)' },
      expiration:      { icon: '⏰', bg: 'var(--danger-soft)',   color: 'var(--danger)' },
      subscription:    { icon: '📋', bg: 'var(--info-soft)',     color: 'var(--info)' },
    };
    return icons[type] || { icon: '📌', bg: 'var(--bg-tertiary)', color: 'var(--text-muted)' };
  }

  // --- Clipboard Helper ---
  async function copyToClipboard(text, successMsg = 'Copié dans le presse-papiers !') {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      if (typeof UI !== 'undefined' && UI.toast) {
        UI.toast(successMsg, 'success');
      }
      return true;
    } catch (e) {
      if (typeof UI !== 'undefined' && UI.toast) {
        UI.toast('Erreur lors de la copie', 'error');
      }
      return false;
    }
  }

  // --- WhatsApp Access Message Generator ---
  function generateAccessMessage(client, sub) {
    const serviceName = client.service || 'Service';
    const email = (sub && sub.accountEmail) || client.customEmail || '(Identifiant non défini)';
    const password = (sub && sub.accountPassword) || client.customPassword || '••••••••';
    const profile = client.profile || 'Profil standard';
    const pin = client.pinCode ? `\n🔢 *Code PIN profil :* ${client.pinCode}` : (sub && sub.accountPin ? `\n🔢 *Code PIN :* ${sub.accountPin}` : '');
    const expDate = formatDate(client.expirationDate);

    return `🍿 *VOS ACCÈS ${serviceName.toUpperCase()}* 🍿

Bonjour *${client.name}*, voici les informations de connexion pour votre abonnement :

📧 *Email / Identifiant :* ${email}
🔑 *Mot de passe :* ${password}
👤 *Profil / Écran :* ${profile}${pin}
📅 *Valable jusqu'au :* ${expDate}

⚠️ *Règles d'utilisation :*
• Connectez-vous UNIQUEMENT sur votre profil attitré (*${profile}*).
• Utilisation sur 1 seul appareil à la fois.
• Ne modifiez pas l'adresse email, le mot de passe ni les autres profils.
• Tout changement non autorisé entraînera l'exclusion immédiate.

Bon visionnage et merci pour votre confiance ! 🎬✨`;
  }

  // --- WhatsApp Renewal Reminder Message ---
  function generateRenewalReminder(client, sub) {
    const serviceName = client.service || 'Service';
    const days = daysUntil(client.expirationDate);
    const expDate = formatDate(client.expirationDate);
    const priceStr = formatCurrency(client.price);

    let timing = `arrive à expiration le ${expDate}`;
    if (days === 0) timing = `expire *AUJOURD'HUI* (${expDate})`;
    else if (days === 1) timing = `expire *DEMAIN* (${expDate})`;
    else if (days < 0) timing = `a expiré le ${expDate} (il y a ${Math.abs(days)} jour(s))`;
    else if (days !== null) timing = `expire dans *${days} jours* (${expDate})`;

    return `🔔 *RAPPEL RENOUVELLEMENT – ${serviceName.toUpperCase()}* 🔔

Bonjour *${client.name}*,

Votre abonnement *${serviceName}* (${client.profile || 'votre accès'}) ${timing}.

💳 *Tarif de renouvellement :* ${priceStr}

Pour éviter toute coupure, merci d'effectuer le paiement et de nous envoyer la confirmation.

Besoin d'aide ou prêt à renouveler ? Répondez directement à ce message ! Merci 😊`;
  }

  return {
    today, formatDate, formatDateTime, daysUntil, monthYear, monthKey, getLast12Months,
    formatCurrency, formatPercent,
    computeStatus, statusBadge, daysLabel, methodLabel, methodBadge,
    waLink, el, clearChildren, emptyState, emptyStateDiv, esc, serviceTag, historyIcon,
    copyToClipboard, generateAccessMessage, generateRenewalReminder,
  };
})();
