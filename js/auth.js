/**
 * auth.js – Authentication module
 */

const Auth = (() => {
  const SESSION_KEY = 'sm_session';

  function isLoggedIn() {
    return true; // Accès direct simplifié sans écran de connexion
  }

  function login(username, password) {
    sessionStorage.setItem(SESSION_KEY, 'true');
    return true;
  }

  function autoLogin() {
    sessionStorage.setItem(SESSION_KEY, 'true');
    return true;
  }

  function logout() {
    UI.toast('Session administrateur réinitialisée', 'info');
    setTimeout(() => location.reload(), 400);
  }

  function init() {
    const loginScreen = Utils.el('login-screen');
    const app         = Utils.el('app');
    const loginForm   = Utils.el('login-form');
    const loginError  = Utils.el('login-error');
    const logoutBtn   = Utils.el('logout-btn');
    const togglePw    = Utils.el('toggle-pw-btn');
    const pwInput     = Utils.el('login-password');

    // Toujours afficher directement l'application
    if (loginScreen) loginScreen.classList.add('hidden');
    if (app) app.classList.remove('hidden');
    const sidebarUsername = Utils.el('sidebar-username');
    if (sidebarUsername) sidebarUsername.textContent = DB.auth.getUsername();

    // Masquer le bouton de déconnexion pour simplifier l'interface
    if (logoutBtn) {
      logoutBtn.style.display = 'none';
    }

    // Toggle password visibility
    if (togglePw && pwInput) {
      togglePw.addEventListener('click', () => {
        if (pwInput.type === 'password') {
          pwInput.type = 'text';
          togglePw.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
        } else {
          pwInput.type = 'password';
          togglePw.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
        }
      });
    }

    // Login form submit
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = Utils.el('login-username')?.value.trim();
        const password = Utils.el('login-password')?.value;
        const btn = Utils.el('login-btn');

        if (loginError) loginError.classList.add('hidden');
        if (btn) {
          btn.textContent = 'Connexion...';
          btn.disabled = true;
        }

        setTimeout(() => {
          if (login(username, password)) {
            if (loginScreen) loginScreen.classList.add('hidden');
            if (app) app.classList.remove('hidden');
            const sidebarUsername = Utils.el('sidebar-username');
            if (sidebarUsername) sidebarUsername.textContent = DB.auth.getUsername();
            App.init();
          } else {
            if (loginError) loginError.classList.remove('hidden');
            if (btn) {
              btn.textContent = 'Se connecter';
              btn.disabled = false;
            }
            const pwField = Utils.el('login-password');
            if (pwField) {
              pwField.value = '';
              pwField.focus();
            }
          }
        }, 400);
      });
    }

    // Logout
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        UI.confirm('Voulez-vous vraiment vous déconnecter ?', logout);
      });
    }
  }

  return { init, isLoggedIn, login, logout, autoLogin };
})();
