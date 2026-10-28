/**
 * history.js – Activity history module
 */

const History = (() => {
  function render() {
    applyFilters();
  }

  function applyFilters() {
    const type = Utils.el('history-type-filter').value;
    const data = DB.activityLogs.filterByType(type);
    renderList(data);
  }

  function renderList(data) {
    const list = Utils.el('history-list');

    if (!data.length) {
      list.innerHTML = Utils.emptyStateDiv('Aucune activité enregistrée.');
      return;
    }

    list.innerHTML = data.map(log => {
      const info  = Utils.historyIcon(log.type);
      const time  = Utils.formatDateTime(log.timestamp);
      return `<div class="history-item">
        <div class="history-icon" style="background:${info.bg};color:${info.color}">${info.icon}</div>
        <div class="history-content">
          <div class="history-action">${Utils.esc(log.description)}</div>
          <div class="history-meta">${typeLabel(log.type)}</div>
        </div>
        <div class="history-date">${time}</div>
      </div>`;
    }).join('');
  }

  function typeLabel(type) {
    const map = {
      client_created:  'Création client',
      client_updated:  'Modification client',
      client_deleted:  'Suppression client',
      payment:         'Paiement',
      renewal:         'Renouvellement',
      expiration:      'Expiration',
      subscription:    'Abonnement',
    };
    return map[type] || type;
  }

  function init() {
    Utils.el('history-type-filter').addEventListener('change', applyFilters);
    Utils.el('clear-history-btn').addEventListener('click', () => {
      UI.confirm('Vider tout l\'historique ? Cette action est irréversible.', () => {
        DB.activityLogs.clear();
        render();
        UI.toast('Historique vidé.', 'warning');
      });
    });
  }

  return { init, render };
})();
