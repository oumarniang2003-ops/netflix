/**
 * settings.js – Settings module: services management, password change, export/import
 */

const Settings = (() => {
  let _editingServiceId = null;

  function render() {
    renderServicesList();
  }

  // ===================== SERVICES =====================
  function renderServicesList() {
    const list     = Utils.el('services-list');
    const services = DB.services.getAll();

    if (!services.length) {
      list.innerHTML = '<p class="text-muted">Aucun service configuré.</p>';
      return;
    }

    list.innerHTML = services.map(s => `
      <div class="service-item">
        <div class="service-color-dot" style="background:${s.color}"></div>
        <div class="service-name">${Utils.esc(s.name)}</div>
        <div class="service-price">${s.defaultPrice ? Utils.formatCurrency(s.defaultPrice) : '—'}</div>
        <button class="btn-icon" onclick="Settings.openEditService('${s.id}')" title="Modifier">✏️</button>
        <button class="btn-icon" onclick="Settings.confirmDeleteService('${s.id}')" title="Supprimer">🗑️</button>
      </div>`).join('');
  }

  function openAddService() {
    _editingServiceId = null;
    Utils.el('service-modal-title').textContent = 'Ajouter un service';
    Utils.el('service-form').reset();
    Utils.el('service-id-field').value = '';
    Utils.el('svc-color').value = '#6366f1';
    Utils.el('service-form-error').classList.add('hidden');
    UI.openModal('service-modal');
  }

  function openEditService(id) {
    const s = DB.services.getById(id);
    if (!s) return;
    _editingServiceId = id;
    Utils.el('service-modal-title').textContent = 'Modifier le service';
    Utils.el('service-id-field').value    = id;
    Utils.el('svc-name').value            = s.name || '';
    Utils.el('svc-color').value           = s.color || '#6366f1';
    Utils.el('svc-default-price').value   = s.defaultPrice || '';
    Utils.el('service-form-error').classList.add('hidden');
    UI.openModal('service-modal');
  }

  function saveService() {
    const name         = Utils.el('svc-name').value.trim();
    const color        = Utils.el('svc-color').value;
    const defaultPrice = Number(Utils.el('svc-default-price').value) || 0;
    const errEl        = Utils.el('service-form-error');

    if (!name) {
      errEl.textContent = 'Le nom du service est obligatoire.';
      errEl.classList.remove('hidden');
      return;
    }
    errEl.classList.add('hidden');

    if (_editingServiceId) {
      DB.services.update(_editingServiceId, { name, color, defaultPrice });
      UI.toast(`Service "${name}" mis à jour.`, 'success');
    } else {
      // Check duplicate
      if (DB.services.getByName(name)) {
        errEl.textContent = 'Un service avec ce nom existe déjà.';
        errEl.classList.remove('hidden');
        return;
      }
      DB.services.add({ name, color, defaultPrice });
      UI.toast(`Service "${name}" ajouté.`, 'success');
    }

    UI.closeModal('service-modal');
    renderServicesList();
    // Refresh service selects elsewhere
    if (typeof Clients !== 'undefined') Clients.render();
  }

  function confirmDeleteService(id) {
    const s = DB.services.getById(id);
    if (!s) return;
    // Check if used
    const usedByClients = DB.clients.getAll().filter(c => c.service === s.name).length;
    if (usedByClients > 0) {
      UI.toast(`Ce service est utilisé par ${usedByClients} client(s). Reassignez-les d'abord.`, 'error');
      return;
    }
    UI.confirm(`Supprimer le service "${s.name}" ?`, () => {
      DB.services.delete(id);
      UI.toast(`Service "${s.name}" supprimé.`, 'warning');
      renderServicesList();
    });
  }

  // ===================== PASSWORD =====================
  function initPasswordForm() {
    Utils.el('change-password-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const newUsername = Utils.el('new-username').value.trim();
      const currentPw   = Utils.el('current-password').value;
      const newPw       = Utils.el('new-password').value;
      const confirmPw   = Utils.el('confirm-password').value;
      const msgEl       = Utils.el('password-msg');

      msgEl.className = '';
      msgEl.classList.remove('hidden');

      if (!currentPw) {
        msgEl.className = 'error';
        msgEl.textContent = 'Veuillez saisir votre mot de passe actuel.';
        return;
      }
      if (!DB.auth.verify(DB.auth.getUsername(), currentPw)) {
        msgEl.className = 'error';
        msgEl.textContent = 'Mot de passe actuel incorrect.';
        return;
      }
      if (newPw && newPw !== confirmPw) {
        msgEl.className = 'error';
        msgEl.textContent = 'Les nouveaux mots de passe ne correspondent pas.';
        return;
      }
      if (newPw && newPw.length < 6) {
        msgEl.className = 'error';
        msgEl.textContent = 'Le nouveau mot de passe doit contenir au moins 6 caractères.';
        return;
      }

      const username = newUsername || DB.auth.getUsername();
      const password = newPw || currentPw;
      DB.auth.update(username, password);

      msgEl.className = 'success';
      msgEl.textContent = 'Identifiants mis à jour avec succès.';
      Utils.el('sidebar-username').textContent = username;
      Utils.el('change-password-form').reset();
      UI.toast('Identifiants mis à jour.', 'success');
    });
  }

  // ===================== EXPORT / IMPORT =====================
  function initExportImport() {
    Utils.el('export-btn').addEventListener('click', () => {
      const data = DB.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `subscription-manager-${Utils.today()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      UI.toast('Données exportées avec succès.', 'success');
    });

    Utils.el('import-btn').addEventListener('click', () => {
      Utils.el('import-file').click();
    });

    Utils.el('import-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (!data.clients && !data.payments) throw new Error('Format invalide');
          UI.confirm('Importer ces données ? Cela remplacera toutes les données actuelles.', () => {
            DB.importAll(data);
            UI.toast('Données importées. Rechargement...', 'success');
            setTimeout(() => location.reload(), 1500);
          });
        } catch {
          UI.toast('Fichier JSON invalide.', 'error');
        }
      };
      reader.readAsText(file);
      e.target.value = ''; // reset
    });
  }

  function init() {
    Utils.el('add-service-btn').addEventListener('click', openAddService);
    Utils.el('service-save-btn').addEventListener('click', saveService);
    initPasswordForm();
    initExportImport();
  }

  return { init, render, openEditService, confirmDeleteService };
})();
