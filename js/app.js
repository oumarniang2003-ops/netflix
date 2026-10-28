/**
 * app.js – Main application bootstrap
 * Initializes all modules and handles routing.
 */

const App = (() => {
  let _initialized = false;

  function init() {
    if (_initialized) return;
    _initialized = true;

    // Init UI first
    UI.init();

    // Init all modules
    Clients.init();
    Subscriptions.init();
    Payments.init();
    Alerts.init();
    History.init();
    Reports.init();
    Settings.init();
    NetflixCodes.init();
    Dashboard.init();

    // Render initial page
    renderPage('dashboard');

    // Auto-refresh every 60 seconds (updates statuses & alerts)
    setInterval(() => {
      const activePage = document.querySelector('.nav-item.active')?.dataset?.page;
      if (activePage) renderPage(activePage);
    }, 60000);
  }

  function renderPage(page) {
    switch (page) {
      case 'dashboard':
        Dashboard.refresh();
        break;
      case 'clients':
        Clients.render();
        break;
      case 'subscriptions':
        Subscriptions.render();
        break;
      case 'netflix-codes':
        NetflixCodes.render();
        break;
      case 'payments':
        Payments.render();
        break;
      case 'alerts':
        Alerts.render();
        break;
      case 'history':
        History.render();
        break;
      case 'reports':
        // Slight delay for canvas to be visible
        setTimeout(() => Reports.render(), 50);
        break;
      case 'settings':
        Settings.render();
        break;
    }
  }

  return { init, renderPage };
})();

// ===================== BOOTSTRAP =====================
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
  App.init();
});
