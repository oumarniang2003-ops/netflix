/**
 * subscriptions.js – Subscription management module
 */

const Subscriptions = (() => {
  let _editingId = null;
  let _activeSubForProfiles = null;

  function populateServiceSelect() {
    ['sf-service'].forEach(id => {
      const sel = Utils.el(id);
      if (!sel) return;
      const current = sel.value;
      sel.innerHTML = '<option value="">— Choisir un service —</option>';
      DB.services.getAll().forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.name;
        opt.textContent = s.name;
        if (s.name === current) opt.selected = true;
        sel.appendChild(opt);
      });
    });
  }

  // ===================== COMPUTE FINANCIALS =====================
  function computeFinancials(sub) {
    const clients = DB.clients.getAll().filter(c =>
      (c.subscriptionId === sub.id) ||
      (!c.subscriptionId && c.service === sub.service && c.startDate >= sub.buyDate && c.startDate <= sub.expirationDate)
    );
    const used     = clients.filter(c => c.status !== 'expired').length;
    const revenue  = clients.reduce((sum, c) => sum + (Number(c.price) || 0), 0);
    const cost     = Number(sub.cost) || 0;
    const slots    = Number(sub.slots) || 0;
    const profit   = revenue - cost;
    const margin   = revenue > 0 ? (profit / revenue) * 100 : 0;
    const avail    = Math.max(0, slots - used);
    return { used, avail, revenue, profit, margin, slots, clients };
  }

  // ===================== RENDER =====================
  function render() {
    populateServiceSelect();
    const subs = DB.subscriptions.getAll();
    renderStatsGrid(subs);
    renderTable(subs);
  }

  function renderStatsGrid(subs) {
    const grid = Utils.el('sub-stats-grid');
    let totalCost = 0, totalRevenue = 0, totalSlots = 0, totalUsed = 0;

    subs.forEach(s => {
      const fin = computeFinancials(s);
      totalCost    += Number(s.cost) || 0;
      totalRevenue += fin.revenue;
      totalSlots   += fin.slots;
      totalUsed    += fin.used;
    });

    const totalProfit = totalRevenue - totalCost;
    const totalAvail  = totalSlots - totalUsed;

    grid.innerHTML = [
      { label: 'Coût total',     value: Utils.formatCurrency(totalCost),    color: 'var(--danger)',  bg: 'var(--danger-soft)',  icon: '💸' },
      { label: 'Revenus totaux', value: Utils.formatCurrency(totalRevenue), color: 'var(--success)', bg: 'var(--success-soft)', icon: '💰' },
      { label: 'Bénéfice total', value: Utils.formatCurrency(totalProfit),  color: totalProfit >= 0 ? 'var(--success)' : 'var(--danger)', bg: totalProfit >= 0 ? 'var(--success-soft)' : 'var(--danger-soft)', icon: '📈' },
      { label: 'Accès totaux',   value: totalSlots,                         color: 'var(--accent)',  bg: 'var(--accent-soft)',  icon: '🔑' },
      { label: 'Accès utilisés', value: totalUsed,                          color: 'var(--warning)', bg: 'var(--warning-soft)', icon: '👤' },
      { label: 'Disponibles',    value: totalAvail,                         color: 'var(--info)',    bg: 'var(--info-soft)',    icon: '✅' },
    ].map(s => `
      <div class="stat-card" style="--stat-color:${s.color};--stat-bg:${s.bg}">
        <div class="stat-icon">${s.icon}</div>
        <div class="stat-label">${s.label}</div>
        <div class="stat-value" style="font-size:1.15rem">${s.value}</div>
      </div>`).join('');
  }

  function renderTable(subs) {
    const tbody = Utils.el('subscriptions-tbody');

    if (!subs.length) {
      tbody.innerHTML = Utils.emptyState('Aucun abonnement enregistré.');
      return;
    }

    tbody.innerHTML = subs.map(s => {
      const fin    = computeFinancials(s);
      const days   = Utils.daysUntil(s.expirationDate);
      const status = days < 0 ? 'expired' : days <= 7 ? 'expiring' : 'active';
      const usedBar = fin.slots > 0
        ? `<div style="display:flex;align-items:center;gap:0.4rem">
            <div style="flex:1;background:var(--bg-tertiary);border-radius:99px;height:6px;overflow:hidden">
              <div style="width:${Math.min(100,(fin.used/fin.slots)*100)}%;height:100%;background:${fin.used >= fin.slots ? 'var(--warning)' : 'var(--accent)'};border-radius:99px"></div>
            </div>
            <span style="font-size:0.75rem;color:var(--text-muted);font-weight:600">${fin.used}/${fin.slots}</span>
          </div>`
        : '—';

      const emailSubtitle = s.accountEmail
        ? `<div style="font-size:0.75rem;color:var(--text-muted);display:flex;align-items:center;gap:0.3rem;margin-top:2px">
            <span style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${Utils.esc(s.accountEmail)}</span>
            <button class="btn-copy-mini" onclick="Utils.copyToClipboard('${Utils.esc(s.accountEmail)}', 'Email copié !')" title="Copier l'email">📋</button>
           </div>`
        : '';

      const displayName = s.name ? `<div style="font-size:0.83rem;font-weight:600;color:#fff">${Utils.esc(s.name)}</div>` : '';

      return `<tr>
        <td>
          ${Utils.serviceTag(s.service)}
          ${displayName}
          ${emailSubtitle}
        </td>
        <td><strong>${Utils.formatCurrency(s.cost)}</strong></td>
        <td>${Utils.formatDate(s.buyDate)}</td>
        <td>${Utils.formatDate(s.expirationDate)}</td>
        <td style="text-align:center">${fin.slots}</td>
        <td style="min-width:100px">${usedBar}</td>
        <td style="text-align:center"><strong style="color:${fin.avail > 0 ? 'var(--success)' : 'var(--danger)'}">${fin.avail}</strong></td>
        <td style="color:var(--success)">${Utils.formatCurrency(fin.revenue)}</td>
        <td style="color:${fin.profit >= 0 ? 'var(--success)' : 'var(--danger)'}">${Utils.formatCurrency(fin.profit)}</td>
        <td>${Utils.formatPercent(fin.margin)}</td>
        <td>${Utils.statusBadge(status)}</td>
        <td>
          <div style="display:flex;gap:0.35rem;flex-wrap:wrap">
            <button class="btn btn-sm btn-primary" onclick="Subscriptions.openProfilesModal('${s.id}')" title="Gérer les profils et écrans de ce compte">
              👥 Profils
            </button>
            <button class="btn btn-sm btn-secondary" onclick="Subscriptions.openEdit('${s.id}')" title="Modifier">✏️</button>
            <button class="btn btn-sm btn-danger" onclick="Subscriptions.confirmDelete('${s.id}')" title="Supprimer">🗑️</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  // ===================== PROFILES & SLOTS MODAL =====================
  function openProfilesModal(id) {
    const s = DB.subscriptions.getById(id);
    if (!s) return;
    _activeSubForProfiles = s;

    Utils.el('sub-profiles-modal-title').textContent = `${s.name || s.service} – Profils & Écrans`;
    Utils.el('sub-profiles-modal-subtitle').textContent = `Gestion des accès et attribution des profils pour ${s.service}`;

    const fin = computeFinancials(s);
    Utils.el('sub-slots-badge').textContent = `${fin.used} / ${fin.slots} occupés`;

    // Overview Card
    const overviewEl = Utils.el('sub-account-overview-card');
    const pwdMasked = s.accountPassword ? '••••••••' : '—';
    overviewEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.75rem">
        <div>
          <div style="display:flex;align-items:center;gap:0.5rem">
            ${Utils.serviceTag(s.service)}
            <span class="badge ${fin.avail > 0 ? 'badge-active' : 'badge-suspended'}">${fin.avail > 0 ? fin.avail + ' place(s) libre(s)' : 'Complet'}</span>
          </div>
          <div style="font-weight:700;font-size:1.05rem;color:#fff;margin-top:0.3rem">${Utils.esc(s.name || s.service)}</div>
          <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px">
            Acheté le ${Utils.formatDate(s.buyDate)} · Expire le ${Utils.formatDate(s.expirationDate)} (${Utils.daysLabel(Utils.daysUntil(s.expirationDate))})
          </div>
        </div>
        <div style="display:flex;gap:0.5rem;align-items:center">
          <div class="stat-pill">
            <span style="font-size:0.7rem;color:var(--text-muted)">Coût</span>
            <strong>${Utils.formatCurrency(s.cost)}</strong>
          </div>
          <div class="stat-pill">
            <span style="font-size:0.7rem;color:var(--text-muted)">Revenus</span>
            <strong style="color:var(--success)">${Utils.formatCurrency(fin.revenue)}</strong>
          </div>
          <div class="stat-pill">
            <span style="font-size:0.7rem;color:var(--text-muted)">Bénéfice</span>
            <strong style="color:${fin.profit >= 0 ? 'var(--success)' : 'var(--danger)'}">${Utils.formatCurrency(fin.profit)}</strong>
          </div>
        </div>
      </div>
      <div class="sub-creds-strip mt-3">
        <div class="strip-item">
          <span class="strip-label">📧 Identifiant :</span>
          <span class="strip-val" id="strip-sub-email">${Utils.esc(s.accountEmail || '—')}</span>
          ${s.accountEmail ? `<button class="btn-copy-mini" onclick="Utils.copyToClipboard('${Utils.esc(s.accountEmail)}', 'Email copié !')">📋</button>` : ''}
        </div>
        <div class="strip-item">
          <span class="strip-label">🔑 Mot de passe :</span>
          <span class="strip-val" id="strip-sub-pw" data-hidden="true">${pwdMasked}</span>
          ${s.accountPassword ? `
            <button class="btn-peek-mini" onclick="Subscriptions.toggleAccountPwPeek('${s.id}')" title="Afficher/Masquer">👁️</button>
            <button class="btn-copy-mini" onclick="Utils.copyToClipboard('${Utils.esc(s.accountPassword)}', 'Mot de passe copié !')">📋</button>
          ` : ''}
        </div>
        ${s.accountPin ? `
        <div class="strip-item">
          <span class="strip-label">🔢 Master PIN :</span>
          <span class="strip-val">${Utils.esc(s.accountPin)}</span>
          <button class="btn-copy-mini" onclick="Utils.copyToClipboard('${Utils.esc(s.accountPin)}', 'PIN copié !')">📋</button>
        </div>` : ''}
      </div>
    `;

    // Profiles Grid
    renderSubProfilesGrid(s, fin);

    // Bind assign button
    Utils.el('sub-assign-new-client-btn').onclick = () => {
      UI.closeModal('sub-profiles-modal');
      Clients.openAddWithSub(s.id);
    };

    UI.openModal('sub-profiles-modal');
  }

  function toggleAccountPwPeek(subId) {
    const s = DB.subscriptions.getById(subId);
    if (!s) return;
    const el = Utils.el('strip-sub-pw');
    if (!el) return;
    const isHidden = el.dataset.hidden === 'true';
    if (isHidden) {
      el.textContent = s.accountPassword || '';
      el.dataset.hidden = 'false';
    } else {
      el.textContent = '••••••••';
      el.dataset.hidden = 'true';
    }
  }

  function renderSubProfilesGrid(sub, fin) {
    const grid = Utils.el('profiles-slots-grid');
    const assignedClients = DB.clients.getAll().filter(c =>
      c.subscriptionId === sub.id && c.status !== 'expired'
    );
    const totalSlots = Number(sub.slots) || 1;

    let slotsHtml = '';

    for (let i = 0; i < totalSlots; i++) {
      const client = assignedClients[i];
      if (client) {
        const days = Utils.daysUntil(client.expirationDate);
        const status = Utils.computeStatus(client.expirationDate, client.status);
        const avatarLetter = (client.name || 'C').charAt(0).toUpperCase();
        slotsHtml += `
          <div class="profile-slot-card occupied">
            <div class="profile-slot-top">
              <div class="profile-avatar avatar-${(i % 5) + 1}">${avatarLetter}</div>
              <div class="profile-status-wrap">
                ${Utils.statusBadge(status)}
              </div>
            </div>
            <div class="profile-slot-info">
              <div class="profile-slot-name">${Utils.esc(client.name)}</div>
              <div class="profile-screen-tag">${Utils.esc(client.profile || ('Écran ' + (i + 1)))}</div>
              <div class="profile-exp-date">Expire : <strong>${Utils.formatDate(client.expirationDate)}</strong> (${Utils.daysLabel(days)})</div>
              ${client.pinCode ? `<div class="profile-pin-tag">PIN : <code>${Utils.esc(client.pinCode)}</code></div>` : ''}
            </div>
            <div class="profile-slot-actions">
              <button class="btn btn-sm btn-primary" onclick="UI.closeModal('sub-profiles-modal'); Clients.openCredentialsModal('${client.id}')" title="Voir les identifiants & envoyer WhatsApp">
                🔑 Accès WhatsApp
              </button>
              <button class="btn btn-sm btn-success" onclick="UI.closeModal('sub-profiles-modal'); Clients.openRenewal('${client.id}')" title="Renouveler">
                🔄
              </button>
            </div>
          </div>
        `;
      } else {
        slotsHtml += `
          <div class="profile-slot-card free">
            <div class="free-slot-icon">➕</div>
            <div class="free-slot-title">Écran ${i + 1} Libre</div>
            <div class="free-slot-sub">Profil non attribué</div>
            <button class="btn btn-sm btn-primary mt-3" onclick="UI.closeModal('sub-profiles-modal'); Clients.openAddWithSub('${sub.id}', 'Profil ${i + 1}')">
              Attribuer ce profil
            </button>
          </div>
        `;
      }
    }

    grid.innerHTML = slotsHtml;
  }

  // ===================== OPEN MODAL =====================
  function openAdd() {
    _editingId = null;
    Utils.el('sub-modal-title').textContent = 'Ajouter un compte / abonnement';
    Utils.el('sub-form').reset();
    Utils.el('sub-id-field').value = '';
    Utils.el('sf-buy-date').value  = Utils.today();
    Utils.el('sub-form-error').classList.add('hidden');
    populateServiceSelect();
    UI.openModal('sub-modal');
  }

  function openEdit(id) {
    const s = DB.subscriptions.getById(id);
    if (!s) return;
    _editingId = id;
    Utils.el('sub-modal-title').textContent = 'Modifier le compte / abonnement';
    Utils.el('sub-id-field').value     = id;
    populateServiceSelect();
    Utils.el('sf-service').value      = s.service || '';
    Utils.el('sf-name').value         = s.name || '';
    Utils.el('sf-email').value        = s.accountEmail || '';
    Utils.el('sf-password').value     = s.accountPassword || '';
    Utils.el('sf-pin').value          = s.accountPin || '';
    Utils.el('sf-cost').value         = s.cost || '';
    Utils.el('sf-price').value        = s.sellingPrice || '';
    Utils.el('sf-buy-date').value     = s.buyDate || '';
    Utils.el('sf-expiration').value   = s.expirationDate || '';
    Utils.el('sf-slots').value        = s.slots || '';
    Utils.el('sf-notes').value        = s.notes || '';
    Utils.el('sub-form-error').classList.add('hidden');
    UI.openModal('sub-modal');
  }

  // ===================== SAVE =====================
  function save() {
    const service      = Utils.el('sf-service').value;
    const name         = Utils.el('sf-name').value.trim();
    const accountEmail = Utils.el('sf-email').value.trim();
    const accountPassword = Utils.el('sf-password').value.trim();
    const accountPin   = Utils.el('sf-pin').value.trim();
    const cost         = Number(Utils.el('sf-cost').value);
    const sellingPrice = Number(Utils.el('sf-price').value);
    const buyDate      = Utils.el('sf-buy-date').value;
    const expDate      = Utils.el('sf-expiration').value;
    const slots        = Number(Utils.el('sf-slots').value);
    const notes        = Utils.el('sf-notes').value.trim();
    const errEl        = Utils.el('sub-form-error');

    if (!service || !name || !accountEmail || !accountPassword || isNaN(cost) || !buyDate || !expDate || isNaN(slots) || slots < 1) {
      errEl.textContent = 'Veuillez remplir tous les champs obligatoires (nom, email, mot de passe, coût, dates, écrans).';
      errEl.classList.remove('hidden');
      return;
    }
    errEl.classList.add('hidden');

    const payload = {
      service, name, accountEmail, accountPassword, accountPin,
      cost, sellingPrice, buyDate, expirationDate: expDate, slots, notes,
    };

    if (_editingId) {
      DB.subscriptions.update(_editingId, payload);
      DB.activityLogs.add('subscription', `Compte ${name} mis à jour`, { subId: _editingId });
      UI.toast('Compte abonnement mis à jour.', 'success');
    } else {
      const item = DB.subscriptions.add(payload);
      DB.activityLogs.add('subscription', `Nouveau compte créé : ${name} (${slots} écrans)`, { subId: item.id });
      UI.toast('Compte abonnement ajouté avec succès.', 'success');
    }

    UI.closeModal('sub-modal');
    render();
    Dashboard.refresh();
  }

  // ===================== DELETE =====================
  function confirmDelete(id) {
    const s = DB.subscriptions.getById(id);
    if (!s) return;
    const linkedClients = DB.clients.getAll().filter(c => c.subscriptionId === id);
    const countWarning = linkedClients.length > 0 ? ` Ce compte contient ${linkedClients.length} client(s) assigné(s).` : '';

    UI.confirm(`Supprimer le compte "${s.name || s.service}" ?${countWarning}`, () => {
      DB.subscriptions.delete(id);
      DB.activityLogs.add('subscription', `Compte ${s.name || s.service} supprimé`, {});
      UI.toast('Compte supprimé.', 'warning');
      render();
      Dashboard.refresh();
    });
  }

  // ===================== INIT =====================
  function init() {
    Utils.el('add-sub-btn').addEventListener('click', openAdd);
    Utils.el('sub-save-btn').addEventListener('click', save);
  }

  return {
    init, render, openEdit, openAdd, confirmDelete, computeFinancials,
    openProfilesModal, toggleAccountPwPeek,
  };
})();
