/**
 * payments.js – Payment management module
 */

const Payments = (() => {
  let _editingId = null;

  function populateClientSelect() {
    const sel     = Utils.el('pf-client');
    const current = sel.value;
    sel.innerHTML = '<option value="">— Choisir un client —</option>';
    DB.clients.getAll().sort((a,b) => a.name.localeCompare(b.name)).forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name} (${c.service})`;
      opt.dataset.name    = c.name;
      opt.dataset.service = c.service;
      opt.dataset.price   = c.price;
      if (c.id === current) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  function populateServiceSelect(selId) {
    const sel = Utils.el(selId);
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">— Service —</option>';
    DB.services.getAll().forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.name;
      opt.textContent = s.name;
      if (s.name === current) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  // ===================== RENDER =====================
  function render() {
    applyFilters();
  }

  function applyFilters() {
    const query  = Utils.el('payment-search').value.toLowerCase().trim();
    const method = Utils.el('payment-method-filter').value;
    let data = DB.payments.getAll();

    if (query) {
      data = data.filter(p =>
        (p.reference || '').toLowerCase().includes(query) ||
        (p.clientName || '').toLowerCase().includes(query) ||
        (p.service || '').toLowerCase().includes(query) ||
        (p.method || '').toLowerCase().includes(query)
      );
    }
    if (method) data = data.filter(p => p.method === method);

    // Sort newest first
    data.sort((a,b) => (b.date || '') < (a.date || '') ? -1 : 1);

    renderTable(data);
  }

  function renderTable(data) {
    const tbody  = Utils.el('payments-tbody');
    const footer = Utils.el('payments-footer');

    if (!data.length) {
      tbody.innerHTML = Utils.emptyState('Aucun paiement trouvé.');
      footer.textContent = '';
      return;
    }

    const total = data.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    tbody.innerHTML = data.map(p => `<tr>
      <td><code style="font-size:0.75rem;color:var(--accent)">${Utils.esc(p.reference || '—')}</code></td>
      <td><strong>${Utils.esc(p.clientName || '—')}</strong></td>
      <td><strong style="color:var(--success)">${Utils.formatCurrency(p.amount)}</strong></td>
      <td>${Utils.methodBadge(p.method)}</td>
      <td>${Utils.serviceTag(p.service || '')}</td>
      <td>${Utils.esc(p.period || '—')}</td>
      <td>${Utils.formatDate(p.date)}</td>
      <td style="color:var(--text-muted);font-size:0.8rem">${Utils.esc(p.notes || '—')}</td>
      <td>
        <div style="display:flex;gap:0.35rem">
          <button class="btn btn-sm btn-secondary" onclick="Payments.openEdit('${p.id}')">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="Payments.confirmDelete('${p.id}')">🗑️</button>
        </div>
      </td>
    </tr>`).join('');

    footer.innerHTML = `${data.length} paiement(s) – Total : <strong style="color:var(--success)">${Utils.formatCurrency(total)}</strong>`;
  }

  // ===================== OPEN MODAL =====================
  function openAdd(clientId = null) {
    _editingId = null;
    Utils.el('payment-modal-title').textContent = 'Enregistrer un paiement';
    Utils.el('payment-form').reset();
    Utils.el('payment-id-field').value = '';
    Utils.el('pf-date').value = Utils.today();
    Utils.el('payment-form-error').classList.add('hidden');
    populateClientSelect();
    populateServiceSelect('pf-service');

    if (clientId) {
      Utils.el('pf-client').value = clientId;
      const c = DB.clients.getById(clientId);
      if (c) {
        Utils.el('pf-amount').value  = c.price || '';
        Utils.el('pf-service').value = c.service || '';
      }
    }

    // Auto-fill on client select
    Utils.el('pf-client').addEventListener('change', onClientChange);
    UI.openModal('payment-modal');
  }

  function onClientChange(e) {
    const sel = e.target;
    const opt = sel.options[sel.selectedIndex];
    if (opt && opt.dataset.price) {
      Utils.el('pf-amount').value  = opt.dataset.price;
      Utils.el('pf-service').value = opt.dataset.service || '';
    }
  }

  function openEdit(id) {
    const p = DB.payments.getById(id);
    if (!p) return;
    _editingId = id;
    Utils.el('payment-modal-title').textContent = 'Modifier le paiement';
    Utils.el('payment-id-field').value = id;
    populateClientSelect();
    populateServiceSelect('pf-service');

    Utils.el('pf-client').value    = p.clientId || '';
    Utils.el('pf-amount').value    = p.amount || '';
    Utils.el('pf-method').value    = p.method || 'wave';
    Utils.el('pf-service').value   = p.service || '';
    Utils.el('pf-date').value      = p.date || '';
    Utils.el('pf-period').value    = p.period || '';
    Utils.el('pf-reference').value = p.reference || '';
    Utils.el('pf-notes').value     = p.notes || '';
    Utils.el('payment-form-error').classList.add('hidden');
    UI.openModal('payment-modal');
  }

  // ===================== SAVE =====================
  function save() {
    const clientId  = Utils.el('pf-client').value;
    const amount    = Number(Utils.el('pf-amount').value);
    const method    = Utils.el('pf-method').value;
    const service   = Utils.el('pf-service').value;
    const date      = Utils.el('pf-date').value;
    const period    = Utils.el('pf-period').value.trim();
    const reference = Utils.el('pf-reference').value.trim();
    const notes     = Utils.el('pf-notes').value.trim();
    const errEl     = Utils.el('payment-form-error');

    if (!clientId || !amount || !date) {
      errEl.textContent = 'Veuillez remplir les champs obligatoires (client, montant, date).';
      errEl.classList.remove('hidden');
      return;
    }
    errEl.classList.add('hidden');

    const client     = DB.clients.getById(clientId);
    const clientName = client ? client.name : '—';
    const payload    = { clientId, clientName, amount, method, service, date, period, reference, notes };

    if (_editingId) {
      DB.payments.update(_editingId, payload);
      UI.toast('Paiement mis à jour.', 'success');
    } else {
      const item = DB.payments.add(payload);
      DB.activityLogs.add('payment', `Paiement de ${Utils.formatCurrency(amount)} par ${clientName}`, { paymentId: item.id, clientId });
      UI.toast(`Paiement de ${Utils.formatCurrency(amount)} enregistré.`, 'success');
    }

    UI.closeModal('payment-modal');
    render();
    Dashboard.refresh();
  }

  // ===================== DELETE =====================
  function confirmDelete(id) {
    UI.confirm('Supprimer ce paiement ?', () => {
      DB.payments.delete(id);
      UI.toast('Paiement supprimé.', 'warning');
      render();
      Dashboard.refresh();
    });
  }

  // ===================== INIT =====================
  function init() {
    Utils.el('add-payment-btn').addEventListener('click', () => openAdd());
    Utils.el('payment-save-btn').addEventListener('click', save);
    ['payment-search', 'payment-method-filter'].forEach(id => {
      const el = Utils.el(id);
      if (el) el.addEventListener('input', applyFilters);
    });
  }

  return { init, render, openAdd, openEdit, save, confirmDelete };
})();
