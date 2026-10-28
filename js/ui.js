/**
 * ui.js – UI helpers: modals, toasts, navigation, sidebar
 */

const UI = (() => {
  const overlay = Utils.el('overlay');
  let confirmCallback = null;

  // ===================== TOASTS =====================
  function toast(message, type = 'info', duration = 3500) {
    const container = Utils.el('toast-container');
    const icons = {
      success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️',
    };
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${Utils.esc(message)}</span>`;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('toast-out');
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  // ===================== MODALS =====================
  function openModal(id) {
    const modal = Utils.el(id);
    if (!modal) return;
    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');
    // Focus first input
    setTimeout(() => {
      const first = modal.querySelector('input:not([type=hidden]), select, textarea');
      if (first) first.focus();
    }, 100);
  }

  function closeModal(id) {
    const modal = Utils.el(id);
    if (modal) modal.classList.add('hidden');
    // Close overlay only if no other modal is open
    const anyOpen = document.querySelectorAll('.modal:not(.hidden)').length > 0;
    if (!anyOpen) overlay.classList.add('hidden');
  }

  function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    overlay.classList.add('hidden');
  }

  function confirm(message, onOk) {
    Utils.el('confirm-message').textContent = message;
    confirmCallback = onOk;
    openModal('confirm-modal');
  }

  // Bind close buttons
  function bindModalCloseButtons() {
    document.querySelectorAll('[data-modal]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(btn.dataset.modal));
    });
    Utils.el('confirm-ok-btn').addEventListener('click', () => {
      closeModal('confirm-modal');
      if (typeof confirmCallback === 'function') confirmCallback();
    });
    overlay.addEventListener('click', closeAllModals);
  }

  // ===================== NAVIGATION =====================
  function navigate(page) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });
    // Show/hide pages
    document.querySelectorAll('.page').forEach(p => {
      p.classList.toggle('hidden', p.id !== `page-${page}`);
      if (p.id === `page-${page}`) p.classList.remove('hidden');
    });
    // Update title
    const titles = {
      dashboard:     'Tableau de bord',
      clients:       'Gestion des clients',
      subscriptions: 'Abonnements',
      payments:      'Paiements',
      alerts:        'Alertes',
      history:       'Historique',
      reports:       'Rapports',
      settings:      'Paramètres',
    };
    Utils.el('page-title').textContent = titles[page] || page;
    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
  }

  // ===================== SIDEBAR =====================
  function initSidebar() {
    const sidebar     = Utils.el('sidebar');
    const menuBtn     = Utils.el('menu-btn');
    const closeBtn    = Utils.el('sidebar-close-btn');

    menuBtn.addEventListener('click', () => sidebar.classList.add('open'));
    closeBtn.addEventListener('click', () => sidebar.classList.remove('open'));

    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(item.dataset.page);
        // Trigger page-specific render
        App.renderPage(item.dataset.page);
      });
    });
  }

  // ===================== CLOCK =====================
  function updateClock() {
    const el = Utils.el('topbar-date');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleDateString('fr-FR', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  // ===================== ALERTS BADGE =====================
  function updateAlertsBadge(count) {
    const badge = Utils.el('alerts-badge');
    if (!badge) return;
    badge.textContent = count;
    badge.dataset.count = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
  }

  // ===================== GLOBAL SEARCH =====================
  function initGlobalSearch() {
    Utils.el('global-search').addEventListener('input', (e) => {
      const q = e.target.value.trim();
      if (q.length < 2) return;
      // Navigate to clients and apply search
      navigate('clients');
      App.renderPage('clients');
      Utils.el('client-search').value = q;
      Clients.applyFilters();
    });
  }

  // ===================== INIT =====================
  function init() {
    bindModalCloseButtons();
    initSidebar();
    updateClock();
    setInterval(updateClock, 60000);
    initGlobalSearch();
  }

  return {
    toast, openModal, closeModal, closeAllModals, confirm,
    navigate, updateAlertsBadge, init,
  };
})();
