/**
 * clients.js – Client management module
 * Supports parent subscription linking, profiles, PINs, and WhatsApp credentials dispatch.
 */

const Clients = (() => {
  let _editingId = null;
  let _activeClientForCreds = null;
  let _activeCredsTemplate = 'access'; // 'access' | 'reminder'

  // ===================== RENDER TABLE =====================
  function render() {
    populateServiceFilter();
    applyFilters();
  }

  function populateServiceFilter() {
    const sel = Utils.el('client-service-filter');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">Tous les services</option>';
    DB.services.getAll().forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.name;
      opt.textContent = s.name;
      if (s.name === current) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function applyFilters() {
    const query   = Utils.el('client-search').value.trim().toLowerCase();
    const status  = Utils.el('client-status-filter').value;
    const service = Utils.el('client-service-filter').value;
    const sort    = Utils.el('client-sort').value;

    let data = DB.clients.getAll();

    // Auto-update statuses
    data = data.map(c => {
      const computed = Utils.computeStatus(c.expirationDate, c.status);
      if (computed !== c.status && c.status !== 'suspended') {
        DB.clients.update(c.id, { status: computed });
        return { ...c, status: computed };
      }
      return c;
    });

    // Filter
    if (query) {
      data = data.filter(c =>
        (c.id || '').toLowerCase().includes(query) ||
        (c.name || '').toLowerCase().includes(query) ||
        (c.whatsapp || '').toLowerCase().includes(query) ||
        (c.service || '').toLowerCase().includes(query) ||
        (c.profile || '').toLowerCase().includes(query) ||
        (c.pinCode || '').toLowerCase().includes(query) ||
        (c.status || '').toLowerCase().includes(query)
      );
    }
    if (status) {
      if (status === 'expiring') {
        data = data.filter(c => Utils.computeStatus(c.expirationDate, c.status) === 'expiring');
      } else {
        data = data.filter(c => c.status === status);
      }
    }
    if (service) data = data.filter(c => c.service === service);

    // Sort
    data.sort((a, b) => {
      if (sort === 'expiration_asc')  return (a.expirationDate || '') < (b.expirationDate || '') ? -1 : 1;
      if (sort === 'expiration_desc') return (a.expirationDate || '') > (b.expirationDate || '') ? -1 : 1;
      if (sort === 'name_asc')        return (a.name || '').localeCompare(b.name || '');
      if (sort === 'name_desc')       return (b.name || '').localeCompare(a.name || '');
      return 0;
    });

    renderTable(data);
  }

  function renderTable(data) {
    const tbody  = Utils.el('clients-tbody');
    const footer = Utils.el('clients-footer');

    if (!data.length) {
      tbody.innerHTML = Utils.emptyState('Aucun client trouvé.');
      footer.textContent = '';
      return;
    }

    tbody.innerHTML = data.map(c => {
      const status  = Utils.computeStatus(c.expirationDate, c.status);
      const days    = Utils.daysUntil(c.expirationDate);
      const sub     = c.subscriptionId ? DB.subscriptions.getById(c.subscriptionId) : null;
      const waMsg   = Utils.generateRenewalReminder(c, sub);

      const profileDisplay = c.profile || '—';
      const pinTag = c.pinCode
        ? `<span class="badge" style="background:var(--accent-soft);color:var(--accent);font-size:0.7rem;padding:0.1rem 0.35rem;margin-left:0.3rem">PIN: ${Utils.esc(c.pinCode)}</span>`
        : '';

      return `<tr>
        <td>
          <div style="display:flex;align-items:center;gap:0.6rem">
            <div class="client-avatar-sm">${(c.name||'?').charAt(0).toUpperCase()}</div>
            <div>
              <div style="font-weight:600;font-size:0.875rem">${Utils.esc(c.name)}</div>
              <a href="${Utils.waLink(c.whatsapp)}" target="_blank" class="wa-btn" style="font-size:0.7rem;padding:0.15rem 0.45rem;margin-top:2px;display:inline-flex">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                ${Utils.esc(c.whatsapp)}
              </a>
            </div>
          </div>
        </td>
        <td>${Utils.serviceTag(c.service)}</td>
        <td><span>${Utils.esc(profileDisplay)}</span>${pinTag}</td>
        <td><strong>${Utils.formatCurrency(c.price)}</strong></td>
        <td>
          <div>${Utils.formatDate(c.expirationDate)}</div>
          <div style="font-size:0.75rem">${Utils.daysLabel(days)}</div>
        </td>
        <td>${Utils.statusBadge(status)}</td>
        <td>
          <div class="action-menu-wrap">
            <button class="btn-action-menu" onclick="Clients.toggleActionMenu(event, '${c.id}')" title="Actions">⋯</button>
            <div class="action-dropdown hidden" id="menu-${c.id}">
              <button class="action-item" onclick="Clients.closeAllMenus();Clients.openCredentialsModal('${c.id}')">🔑 Identifiants &amp; WhatsApp</button>
              <button class="action-item action-item-success" onclick="Clients.closeAllMenus();Clients.openRenewal('${c.id}')">🔄 Renouveler</button>
              <a href="${Utils.waLink(c.whatsapp, waMsg)}" target="_blank" class="action-item action-item-wa">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Contacter WA
              </a>
              <div class="action-divider"></div>
              <button class="action-item" onclick="Clients.closeAllMenus();Clients.openEdit('${c.id}')">✏️ Modifier</button>
              <button class="action-item action-item-danger" onclick="Clients.closeAllMenus();Clients.confirmDelete('${c.id}')">🗑️ Supprimer</button>
            </div>
          </div>
        </td>
      </tr>`;
    }).join('');

    footer.textContent = `${data.length} client(s) affiché(s)`;
  }


  // ===================== FORM POPULATION =====================
  function populateServiceSelect() {
    const sel = Utils.el('cf-service');
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
  }

  function populateSubscriptionSelect(serviceName, currentSubId = '') {
    const sel = Utils.el('cf-subscription');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Aucun (Compte autonome / direct) —</option>';
    if (!serviceName) return;

    const subs = DB.subscriptions.getAll().filter(s =>
      s.service.toLowerCase() === serviceName.toLowerCase()
    );

    subs.forEach(s => {
      const avail = DB.subscriptions.getAvailableSlots(s.id);
      const isCurrent = s.id === currentSubId;
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name || s.service} (${s.accountEmail || 'sans email'}) – ${avail} place(s) dispo`;
      if (isCurrent) opt.selected = true;
      sel.appendChild(opt);
    });

    toggleCustomCredsVisibility();
  }

  function toggleCustomCredsVisibility() {
    const subSel = Utils.el('cf-subscription');
    const wrap   = Utils.el('cf-custom-creds-wrap');
    if (!subSel || !wrap) return;
    if (subSel.value) {
      wrap.style.display = 'none';
    } else {
      wrap.style.display = 'block';
    }
  }

  // ===================== OPEN ADD / EDIT =====================
  function openAdd() {
    _editingId = null;
    Utils.el('client-modal-title').textContent = 'Ajouter un client';
    Utils.el('client-form').reset();
    Utils.el('client-id-field').value = '';
    Utils.el('cf-start').value = Utils.today();
    Utils.el('client-form-error').classList.add('hidden');

    populateServiceSelect();
    populateSubscriptionSelect('');

    // Default expiration: +30 days
    const exp = new Date();
    exp.setDate(exp.getDate() + 30);
    Utils.el('cf-expiration').value = exp.toISOString().split('T')[0];

    UI.openModal('client-modal');
  }

  function openAddWithSub(subId, suggestedProfile = '') {
    openAdd();
    const sub = DB.subscriptions.getById(subId);
    if (!sub) return;
    Utils.el('cf-service').value = sub.service;
    populateSubscriptionSelect(sub.service, subId);
    Utils.el('cf-subscription').value = subId;
    if (suggestedProfile) Utils.el('cf-profile').value = suggestedProfile;
    if (sub.sellingPrice) Utils.el('cf-price').value = sub.sellingPrice;
    toggleCustomCredsVisibility();
  }

  function openEdit(id) {
    const c = DB.clients.getById(id);
    if (!c) return;
    _editingId = id;
    Utils.el('client-modal-title').textContent = 'Modifier le client';
    Utils.el('client-id-field').value = id;

    populateServiceSelect();
    Utils.el('cf-service').value = c.service || '';
    populateSubscriptionSelect(c.service || '', c.subscriptionId || '');

    Utils.el('cf-name').value            = c.name || '';
    Utils.el('cf-whatsapp').value        = c.whatsapp || '';
    Utils.el('cf-subscription').value    = c.subscriptionId || '';
    Utils.el('cf-profile').value         = c.profile || '';
    Utils.el('cf-pin').value             = c.pinCode || '';
    Utils.el('cf-price').value           = c.price || '';
    Utils.el('cf-start').value           = c.startDate || '';
    Utils.el('cf-expiration').value      = c.expirationDate || '';
    Utils.el('cf-status').value          = c.status || 'active';
    Utils.el('cf-custom-email').value    = c.customEmail || '';
    Utils.el('cf-custom-password').value = c.customPassword || '';
    Utils.el('cf-notes').value           = c.notes || '';
    Utils.el('client-form-error').classList.add('hidden');

    toggleCustomCredsVisibility();
    UI.openModal('client-modal');
  }

  // ===================== SAVE =====================
  function save() {
    const name           = Utils.el('cf-name').value.trim();
    const whatsapp       = Utils.el('cf-whatsapp').value.trim();
    const service        = Utils.el('cf-service').value;
    const subscriptionId = Utils.el('cf-subscription').value;
    const profile        = Utils.el('cf-profile').value.trim();
    const pinCode        = Utils.el('cf-pin').value.trim();
    const price          = Number(Utils.el('cf-price').value);
    const startDate      = Utils.el('cf-start').value;
    const expDate        = Utils.el('cf-expiration').value;
    const status         = Utils.el('cf-status').value;
    const customEmail    = Utils.el('cf-custom-email').value.trim();
    const customPassword = Utils.el('cf-custom-password').value.trim();
    const notes          = Utils.el('cf-notes').value.trim();
    const errEl          = Utils.el('client-form-error');

    // Validation
    if (!name || !whatsapp || !service || !startDate || !expDate || isNaN(price)) {
      errEl.textContent = 'Veuillez remplir tous les champs obligatoires (nom, WhatsApp, service, prix, dates).';
      errEl.classList.remove('hidden');
      return;
    }
    if (expDate < startDate) {
      errEl.textContent = "La date d'expiration doit être après la date de début.";
      errEl.classList.remove('hidden');
      return;
    }
    errEl.classList.add('hidden');

    const payload = {
      name, whatsapp, service, subscriptionId, profile, pinCode,
      price, startDate, expirationDate: expDate, status,
      customEmail, customPassword, notes,
    };

    if (_editingId) {
      DB.clients.update(_editingId, payload);
      DB.activityLogs.add('client_updated', `Client modifié : ${name}`, { clientId: _editingId });
      UI.toast(`Client "${name}" mis à jour.`, 'success');
    } else {
      const item = DB.clients.add(payload);
      DB.activityLogs.add('client_created', `Client créé : ${name} (${service})`, { clientId: item.id });
      UI.toast(`Client "${name}" ajouté.`, 'success');
    }

    UI.closeModal('client-modal');
    render();
    Dashboard.refresh();
    Alerts.refresh();
  }

  // ===================== DELETE =====================
  function confirmDelete(id) {
    const c = DB.clients.getById(id);
    if (!c) return;
    UI.confirm(`Supprimer le client "${c.name}" ? Cette action est irréversible.`, () => {
      DB.activityLogs.add('client_deleted', `Client supprimé : ${c.name}`, { clientId: id });
      DB.clients.delete(id);
      UI.toast(`Client "${c.name}" supprimé.`, 'warning');
      render();
      Dashboard.refresh();
      Alerts.refresh();
    });
  }

  // ===================== CREDENTIALS & WHATSAPP MODAL =====================
  function openCredentialsModal(id) {
    const c = DB.clients.getById(id);
    if (!c) return;
    _activeClientForCreds = c;
    _activeCredsTemplate = 'access';

    const sub = c.subscriptionId ? DB.subscriptions.getById(c.subscriptionId) : null;
    const email = (sub && sub.accountEmail) || c.customEmail || 'Non spécifié';
    const password = (sub && sub.accountPassword) || c.customPassword || '';
    const pin = c.pinCode || (sub && sub.accountPin) || '';
    const profile = c.profile || 'Profil attribué';

    Utils.el('creds-modal-title').textContent = `Accès ${c.service} – ${c.name}`;
    Utils.el('creds-modal-subtitle').textContent = `Fiche d'accès & dispatch WhatsApp pour ${c.name}`;

    // Summary banner
    const status = Utils.computeStatus(c.expirationDate, c.status);
    const days = Utils.daysUntil(c.expirationDate);
    Utils.el('creds-summary-banner').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem">
        <div>
          <div style="font-weight:700;font-size:1.05rem;color:#fff">${Utils.esc(c.name)} · ${Utils.serviceTag(c.service)}</div>
          <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px">
            WhatsApp : <strong>${Utils.esc(c.whatsapp)}</strong> · Expire : <strong>${Utils.formatDate(c.expirationDate)}</strong> (${Utils.daysLabel(days)})
          </div>
        </div>
        <div>
          ${Utils.statusBadge(status)}
        </div>
      </div>
    `;

    // Credentials values
    Utils.el('creds-display-email').textContent = email;
    const pwEl = Utils.el('creds-display-pw');
    pwEl.textContent = '••••••••';
    pwEl.dataset.hidden = 'true';
    pwEl.dataset.raw = password;
    Utils.el('creds-display-profile').textContent = profile;
    Utils.el('creds-display-pin').textContent = pin || 'Aucun';

    // Tabs
    Utils.el('tab-template-access').classList.add('active');
    Utils.el('tab-template-reminder').classList.remove('active');

    // Pre-fill message
    updateCredsMessageText();

    UI.openModal('credentials-modal');
  }

  function toggleCredsPasswordPeek() {
    const el = Utils.el('creds-display-pw');
    if (!el) return;
    const isHidden = el.dataset.hidden === 'true';
    if (isHidden) {
      el.textContent = el.dataset.raw || '';
      el.dataset.hidden = 'false';
    } else {
      el.textContent = '••••••••';
      el.dataset.hidden = 'true';
    }
  }

  function updateCredsMessageText() {
    if (!_activeClientForCreds) return;
    const c = _activeClientForCreds;
    const sub = c.subscriptionId ? DB.subscriptions.getById(c.subscriptionId) : null;

    let text = '';
    if (_activeCredsTemplate === 'access') {
      text = Utils.generateAccessMessage(c, sub);
    } else {
      text = Utils.generateRenewalReminder(c, sub);
    }

    const textarea = Utils.el('creds-wa-message-text');
    textarea.value = text;
    updateWhatsAppLink();
  }

  function updateWhatsAppLink() {
    if (!_activeClientForCreds) return;
    const textarea = Utils.el('creds-wa-message-text');
    const waBtn = Utils.el('creds-open-wa-btn');
    waBtn.href = Utils.waLink(_activeClientForCreds.whatsapp, textarea.value);
  }

  // ===================== RENEWAL =====================
  function openRenewal(id) {
    const c = DB.clients.getById(id);
    if (!c) return;
    Utils.el('renewal-client-id').value = id;
    Utils.el('renewal-modal-title').textContent = `Renouveler – ${c.name}`;

    const days = Utils.daysUntil(c.expirationDate);
    Utils.el('renewal-client-info').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">
        <div><span style="color:var(--text-muted);font-size:0.78rem">Client</span><br><strong>${Utils.esc(c.name)}</strong></div>
        <div><span style="color:var(--text-muted);font-size:0.78rem">Service</span><br>${Utils.serviceTag(c.service)}</div>
        <div><span style="color:var(--text-muted);font-size:0.78rem">Expiration actuelle</span><br><strong style="color:var(--warning)">${Utils.formatDate(c.expirationDate)}</strong></div>
        <div><span style="color:var(--text-muted);font-size:0.78rem">Jours restants</span><br>${Utils.daysLabel(days)}</div>
      </div>`;

    Utils.el('rf-amount').value = c.price || '';

    let newExp = new Date(c.expirationDate + 'T00:00:00');
    if (isNaN(newExp.getTime())) newExp = new Date();
    newExp.setDate(newExp.getDate() + 30);
    Utils.el('rf-new-expiration').value = newExp.toISOString().split('T')[0];
    Utils.el('rf-reference').value = '';
    Utils.el('rf-notes').value = '';
    Utils.el('renewal-form-error').classList.add('hidden');
    UI.openModal('renewal-modal');
  }

  function saveRenewal() {
    const clientId   = Utils.el('renewal-client-id').value;
    const amount     = Number(Utils.el('rf-amount').value);
    const method     = Utils.el('rf-method').value;
    const newExpDate = Utils.el('rf-new-expiration').value;
    const reference  = Utils.el('rf-reference').value.trim();
    const notes      = Utils.el('rf-notes').value.trim();
    const errEl      = Utils.el('renewal-form-error');

    const c = DB.clients.getById(clientId);
    if (!c) return;

    if (!amount || !newExpDate) {
      errEl.textContent = 'Veuillez remplir le montant et la nouvelle date d\'expiration.';
      errEl.classList.remove('hidden');
      return;
    }
    errEl.classList.add('hidden');

    DB.clients.update(clientId, {
      expirationDate: newExpDate,
      status: 'active',
      price: amount,
    });

    DB.payments.add({
      clientId,
      clientName: c.name,
      amount,
      method,
      service: c.service,
      date: Utils.today(),
      period: Utils.monthYear(newExpDate),
      reference,
      notes: notes || `Renouvellement au ${Utils.formatDate(newExpDate)}`,
    });

    DB.activityLogs.add('renewal', `Renouvellement : ${c.name} → ${Utils.formatDate(newExpDate)}`, { clientId, amount });

    UI.toast(`Abonnement de "${c.name}" renouvelé jusqu'au ${Utils.formatDate(newExpDate)}.`, 'success');
    UI.closeModal('renewal-modal');
    render();
    Dashboard.refresh();
    Alerts.refresh();
  }

  // ===================== ACTION MENU =====================
  function toggleActionMenu(e, id) {
    e.stopPropagation();
    const menu = Utils.el(`menu-${id}`);
    if (!menu) return;
    const isOpen = !menu.classList.contains('hidden');
    // Close all open menus first
    closeAllMenus();
    if (!isOpen) menu.classList.remove('hidden');
  }

  function closeAllMenus() {
    document.querySelectorAll('.action-dropdown').forEach(m => m.classList.add('hidden'));
  }

  // ===================== INIT =====================
  function init() {
    Utils.el('add-client-btn').addEventListener('click', openAdd);

    // Close action menus on outside click
    document.addEventListener('click', () => closeAllMenus());
    Utils.el('client-save-btn').addEventListener('click', save);
    Utils.el('renewal-save-btn').addEventListener('click', saveRenewal);

    // Dynamic select on service change in client form
    const serviceSel = Utils.el('cf-service');
    if (serviceSel) {
      serviceSel.addEventListener('change', (e) => {
        populateSubscriptionSelect(e.target.value);
      });
    }

    const subSel = Utils.el('cf-subscription');
    if (subSel) {
      subSel.addEventListener('change', toggleCustomCredsVisibility);
    }

    // Filters
    ['client-search', 'client-status-filter', 'client-service-filter', 'client-sort'].forEach(id => {
      const el = Utils.el(id);
      if (el) el.addEventListener('input', applyFilters);
    });

    // Credentials Modal Copy & Toggle Buttons
    Utils.el('creds-copy-email-btn')?.addEventListener('click', () => {
      Utils.copyToClipboard(Utils.el('creds-display-email').textContent, 'Email copié !');
    });

    Utils.el('creds-copy-pw-btn')?.addEventListener('click', () => {
      const raw = Utils.el('creds-display-pw').dataset.raw || '';
      Utils.copyToClipboard(raw, 'Mot de passe copié !');
    });

    Utils.el('creds-toggle-pw-btn')?.addEventListener('click', toggleCredsPasswordPeek);

    Utils.el('creds-copy-profile-btn')?.addEventListener('click', () => {
      Utils.copyToClipboard(Utils.el('creds-display-profile').textContent, 'Profil copié !');
    });

    Utils.el('creds-copy-pin-btn')?.addEventListener('click', () => {
      Utils.copyToClipboard(Utils.el('creds-display-pin').textContent, 'Code PIN copié !');
    });

    Utils.el('creds-copy-msg-btn')?.addEventListener('click', () => {
      Utils.copyToClipboard(Utils.el('creds-wa-message-text').value, 'Message WhatsApp copié !');
    });

    Utils.el('creds-wa-message-text')?.addEventListener('input', updateWhatsAppLink);

    // Template tabs
    Utils.el('tab-template-access')?.addEventListener('click', () => {
      _activeCredsTemplate = 'access';
      Utils.el('tab-template-access').classList.add('active');
      Utils.el('tab-template-reminder').classList.remove('active');
      updateCredsMessageText();
    });

    Utils.el('tab-template-reminder')?.addEventListener('click', () => {
      _activeCredsTemplate = 'reminder';
      Utils.el('tab-template-reminder').classList.add('active');
      Utils.el('tab-template-access').classList.remove('active');
      updateCredsMessageText();
    });
  }

  return {
    init, render, applyFilters, openEdit, openAdd, openAddWithSub,
    confirmDelete, openRenewal, saveRenewal, openCredentialsModal,
    populateServiceSelect, populateSubscriptionSelect,
    toggleActionMenu, closeAllMenus,
  };
})();
