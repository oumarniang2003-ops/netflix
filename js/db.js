/**
 * db.js – Local Database Layer
 * Provides CRUD operations over localStorage with a clean API.
 */

const DB = (() => {
  const KEYS = {
    clients:       'sm_clients',
    subscriptions: 'sm_subscriptions',
    payments:      'sm_payments',
    services:      'sm_services',
    alerts:        'sm_alerts',
    activity_logs: 'sm_activity_logs',
    auth:          'sm_auth',
    settings:      'sm_settings',
    netflix_codes: 'sm_netflix_codes',
  };

  // --- Generic helpers ---
  function _get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  }
  function _set(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }
  function _getOne(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch { return {}; }
  }

  // --- ID Generator ---
  function generateId(prefix = '') {
    return prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,5).toUpperCase();
  }

  // =================== CLIENTS ===================
  const clients = {
    getAll() { return _get(KEYS.clients); },
    getById(id) { return this.getAll().find(c => c.id === id) || null; },
    add(data) {
      const all = this.getAll();
      const count = all.length + 1;
      const item = {
        id: 'CLI-' + String(count).padStart(4, '0') + '-' + Date.now().toString(36).toUpperCase().slice(-3),
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      all.push(item);
      _set(KEYS.clients, all);
      return item;
    },
    update(id, data) {
      const all = this.getAll();
      const idx = all.findIndex(c => c.id === id);
      if (idx === -1) return null;
      all[idx] = { ...all[idx], ...data, updatedAt: new Date().toISOString() };
      _set(KEYS.clients, all);
      return all[idx];
    },
    delete(id) {
      const all = this.getAll().filter(c => c.id !== id);
      _set(KEYS.clients, all);
    },
    search(query) {
      const q = query.toLowerCase();
      return this.getAll().filter(c =>
        c.id.toLowerCase().includes(q) ||
        (c.name || '').toLowerCase().includes(q) ||
        (c.whatsapp || '').toLowerCase().includes(q) ||
        (c.service || '').toLowerCase().includes(q) ||
        (c.status || '').toLowerCase().includes(q)
      );
    },
  };

  // =================== SUBSCRIPTIONS ===================
  const subscriptions = {
    getAll() { return _get(KEYS.subscriptions); },
    getById(id) { return this.getAll().find(s => s.id === id) || null; },
    add(data) {
      const all = this.getAll();
      const item = {
        id: generateId('SUB-'),
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      all.push(item);
      _set(KEYS.subscriptions, all);
      return item;
    },
    update(id, data) {
      const all = this.getAll();
      const idx = all.findIndex(s => s.id === id);
      if (idx === -1) return null;
      all[idx] = { ...all[idx], ...data, updatedAt: new Date().toISOString() };
      _set(KEYS.subscriptions, all);
      return all[idx];
    },
    delete(id) {
      _set(KEYS.subscriptions, this.getAll().filter(s => s.id !== id));
    },
    // Compute used slots for a given subscriptionId from clients
    getUsedSlots(subscriptionId) {
      return DB.clients.getAll().filter(c =>
        c.subscriptionId === subscriptionId && c.status !== 'expired'
      ).length;
    },
    getClientsForSub(subscriptionId) {
      return DB.clients.getAll().filter(c => c.subscriptionId === subscriptionId);
    },
    getAvailableSlots(subscriptionId) {
      const sub = this.getById(subscriptionId);
      if (!sub) return 0;
      return Math.max(0, (Number(sub.slots) || 0) - this.getUsedSlots(subscriptionId));
    },
  };

  // =================== PAYMENTS ===================
  const payments = {
    getAll() { return _get(KEYS.payments); },
    getById(id) { return this.getAll().find(p => p.id === id) || null; },
    add(data) {
      const all = this.getAll();
      const item = {
        id: generateId('PAY-'),
        reference: data.reference || ('PAY-' + new Date().getFullYear() + '-' + String(all.length + 1).padStart(4,'0')),
        ...data,
        createdAt: new Date().toISOString(),
      };
      all.push(item);
      _set(KEYS.payments, all);
      return item;
    },
    update(id, data) {
      const all = this.getAll();
      const idx = all.findIndex(p => p.id === id);
      if (idx === -1) return null;
      all[idx] = { ...all[idx], ...data };
      _set(KEYS.payments, all);
      return all[idx];
    },
    delete(id) {
      _set(KEYS.payments, this.getAll().filter(p => p.id !== id));
    },
    getByClient(clientId) {
      return this.getAll().filter(p => p.clientId === clientId);
    },
    getTotalRevenue() {
      return this.getAll().reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    },
  };

  // =================== SERVICES ===================
  const services = {
    getAll() { return _get(KEYS.services); },
    getById(id) { return this.getAll().find(s => s.id === id) || null; },
    getByName(name) { return this.getAll().find(s => s.name.toLowerCase() === name.toLowerCase()) || null; },
    add(data) {
      const all = this.getAll();
      const item = {
        id: generateId('SVC-'),
        ...data,
        createdAt: new Date().toISOString(),
      };
      all.push(item);
      _set(KEYS.services, all);
      return item;
    },
    update(id, data) {
      const all = this.getAll();
      const idx = all.findIndex(s => s.id === id);
      if (idx === -1) return null;
      all[idx] = { ...all[idx], ...data };
      _set(KEYS.services, all);
      return all[idx];
    },
    delete(id) {
      _set(KEYS.services, this.getAll().filter(s => s.id !== id));
    },
  };

  // =================== ACTIVITY LOGS ===================
  const activityLogs = {
    getAll() { return _get(KEYS.activity_logs); },
    add(type, description, meta = {}) {
      const all = this.getAll();
      const item = {
        id: generateId('LOG-'),
        type,
        description,
        meta,
        timestamp: new Date().toISOString(),
      };
      all.unshift(item); // newest first
      if (all.length > 500) all.splice(500); // cap logs
      _set(KEYS.activity_logs, all);
      return item;
    },
    clear() { _set(KEYS.activity_logs, []); },
    filterByType(type) {
      return type ? this.getAll().filter(l => l.type === type) : this.getAll();
    },
  };

  // =================== NETFLIX CODES (AUTOMATION) ===================
  const netflixCodes = {
    getAll() { return _get(KEYS.netflix_codes); },
    getById(id) { return this.getAll().find(c => c.id === id) || null; },
    add(data) {
      const all = this.getAll();
      const now = new Date();
      const expiresAt = data.expiresAt || new Date(now.getTime() + 15 * 60 * 1000).toISOString();
      const item = {
        id: generateId('NFC-'),
        code: String(data.code).trim(),
        email: data.email || 'stream.netflix1@gmail.com',
        subscriptionId: data.subscriptionId || '',
        clientId: data.clientId || '',
        clientName: data.clientName || 'Tous les profils',
        householdLink: data.householdLink || '',
        source: data.source || 'Email automatique',
        receivedAt: now.toISOString(),
        expiresAt: expiresAt,
        status: 'active',
      };
      all.unshift(item);
      if (all.length > 50) all.splice(50);
      _set(KEYS.netflix_codes, all);
      activityLogs.add('netflix_code', `Code temporaire Netflix ${item.code} reçu pour ${item.email}`);
      return item;
    },
    getLatest(emailOrSubId) {
      const all = this.getAll();
      if (!all.length) return null;
      if (!emailOrSubId) return all[0];
      return all.find(c => c.email === emailOrSubId || c.subscriptionId === emailOrSubId) || all[0];
    },
    delete(id) {
      const all = this.getAll().filter(c => c.id !== id);
      _set(KEYS.netflix_codes, all);
    },
    clear() {
      _set(KEYS.netflix_codes, []);
    }
  };

  // =================== AUTH ===================
  const auth = {
    _data() { return _getOne(KEYS.auth); },
    init() {
      if (!localStorage.getItem(KEYS.auth)) {
        // Default credentials
        localStorage.setItem(KEYS.auth, JSON.stringify({
          username: 'admin',
          password: btoa('admin123'), // basic obfuscation (not cryptographic)
        }));
      }
    },
    verify(username, password) {
      const data = this._data();
      return data.username === username && data.password === btoa(password);
    },
    update(username, password) {
      _set(KEYS.auth, { username, password: btoa(password) });
    },
    getUsername() { return this._data().username || 'admin'; },
  };

  // =================== SETTINGS ===================
  const settings = {
    get() { return _getOne(KEYS.settings); },
    set(data) { localStorage.setItem(KEYS.settings, JSON.stringify({ ...this.get(), ...data })); },
  };

  // =================== SEED DATA & MIGRATION ===================
  function seed() {
    // Only seed if no data exists
    if (services.getAll().length === 0) {
      services.add({ name: 'Netflix',  color: '#e50914', defaultPrice: 2500 });
      services.add({ name: 'Spotify',  color: '#1db954', defaultPrice: 1500 });
      services.add({ name: 'YouTube Premium', color: '#ff0000', defaultPrice: 1500 });
      services.add({ name: 'Disney+',  color: '#113ccf', defaultPrice: 2000 });
      services.add({ name: 'Amazon Prime', color: '#00a8e1', defaultPrice: 1500 });
    }

    const today = new Date();
    const fmt = d => d.toISOString().split('T')[0];
    const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

    // Subscriptions created first so clients can be linked to parent accounts
    if (subscriptions.getAll().length === 0) {
      subscriptions.add({
        name: 'Netflix Premium 4K - Compte #1',
        service: 'Netflix',
        accountEmail: 'stream.netflix1@gmail.com',
        accountPassword: 'PassNetflix2025!',
        accountPin: '1234',
        cost: 5000,
        sellingPrice: 2500,
        buyDate: fmt(addDays(today,-15)),
        expirationDate: fmt(addDays(today,15)),
        slots: 4,
        notes: 'Compte principal 4K UHD'
      });
      subscriptions.add({
        name: 'Spotify Famille - Compte #1',
        service: 'Spotify',
        accountEmail: 'spotify.fam1@gmail.com',
        accountPassword: 'MusicSpotify2025*',
        accountPin: '',
        cost: 3000,
        sellingPrice: 1500,
        buyDate: fmt(addDays(today,-60)),
        expirationDate: fmt(addDays(today,-5)),
        slots: 2,
        notes: 'Abonnement familial'
      });
      subscriptions.add({
        name: 'Disney+ Standard - Compte #1',
        service: 'Disney+',
        accountEmail: 'disney.vip1@gmail.com',
        accountPassword: 'DisneyMagic2025!',
        accountPin: '0000',
        cost: 3500,
        sellingPrice: 2000,
        buyDate: fmt(addDays(today,-28)),
        expirationDate: fmt(addDays(today,2)),
        slots: 4,
        notes: 'Compte 4 écrans'
      });
    }

    if (clients.getAll().length === 0) {
      const allSubs = subscriptions.getAll();
      const subNetflix = allSubs.find(s => s.service === 'Netflix');
      const subSpotify = allSubs.find(s => s.service === 'Spotify');
      const subDisney  = allSubs.find(s => s.service === 'Disney+');

      const c1 = clients.add({
        name: 'Moussa Diallo',
        whatsapp: '+221771234567',
        service: 'Netflix',
        subscriptionId: subNetflix ? subNetflix.id : '',
        profile: 'Profil 1 (Moussa)',
        pinCode: '1122',
        price: 2500,
        startDate: fmt(addDays(today,-15)),
        expirationDate: fmt(addDays(today,15)),
        status: 'active',
        notes: ''
      });
      const c2 = clients.add({
        name: 'Fatou Ndiaye',
        whatsapp: '+221782345678',
        service: 'Spotify',
        subscriptionId: subSpotify ? subSpotify.id : '',
        profile: 'Profil 1 (Fatou)',
        pinCode: '',
        price: 1500,
        startDate: fmt(addDays(today,-60)),
        expirationDate: fmt(addDays(today,-5)),
        status: 'expired',
        notes: ''
      });
      const c3 = clients.add({
        name: 'Ibrahim Sow',
        whatsapp: '+221793456789',
        service: 'Disney+',
        subscriptionId: subDisney ? subDisney.id : '',
        profile: 'Profil 1 (Ibrahim)',
        pinCode: '2468',
        price: 2000,
        startDate: fmt(addDays(today,-28)),
        expirationDate: fmt(addDays(today,2)),
        status: 'active',
        notes: 'Client fidèle'
      });
      const c4 = clients.add({
        name: 'Aminata Balde',
        whatsapp: '+221760000001',
        service: 'Netflix',
        subscriptionId: subNetflix ? subNetflix.id : '',
        profile: 'Profil 2 (Aminata)',
        pinCode: '3344',
        price: 2500,
        startDate: fmt(addDays(today,-10)),
        expirationDate: fmt(addDays(today,5)),
        status: 'active',
        notes: ''
      });
      const c5 = clients.add({
        name: 'Ousmane Traoré',
        whatsapp: '+221760000002',
        service: 'YouTube Premium',
        subscriptionId: '',
        customEmail: 'ousmane.yt@gmail.com',
        customPassword: 'YTUser2025!',
        profile: 'Invitation Famille',
        pinCode: '',
        price: 1500,
        startDate: fmt(addDays(today,-5)),
        expirationDate: fmt(addDays(today,25)),
        status: 'active',
        notes: ''
      });

      // Payments
      payments.add({ clientId: c1.id, clientName: c1.name, amount: 2500, method: 'wave',       service: 'Netflix', date: fmt(addDays(today,-15)), period: 'Mois en cours', notes: '' });
      payments.add({ clientId: c2.id, clientName: c2.name, amount: 1500, method: 'orange_money', service: 'Spotify', date: fmt(addDays(today,-60)), period: 'Mois précédent', notes: '' });
      payments.add({ clientId: c3.id, clientName: c3.name, amount: 2000, method: 'especes',     service: 'Disney+', date: fmt(addDays(today,-28)), period: 'Mois en cours', notes: '' });
      payments.add({ clientId: c4.id, clientName: c4.name, amount: 2500, method: 'wave',        service: 'Netflix', date: fmt(addDays(today,-10)), period: 'Mois en cours', notes: '' });
      payments.add({ clientId: c5.id, clientName: c5.name, amount: 1500, method: 'wave',        service: 'YouTube Premium', date: fmt(addDays(today,-5)), period: 'Mois en cours', notes: '' });

      // Activity logs
      activityLogs.add('client_created', `Client créé : ${c1.name}`, { clientId: c1.id });
      activityLogs.add('client_created', `Client créé : ${c2.name}`, { clientId: c2.id });
      activityLogs.add('payment', `Paiement de 2500 FCFA par ${c1.name}`, { clientId: c1.id });
      activityLogs.add('payment', `Paiement de 1500 FCFA par ${c2.name}`, { clientId: c2.id });
      activityLogs.add('expiration', `Abonnement expiré : ${c2.name}`, { clientId: c2.id });
    }

    if (netflixCodes.getAll().length === 0) {
      const sub = subscriptions.getAll().find(s => s.service === 'Netflix');
      netflixCodes.add({
        code: '7492',
        email: sub ? sub.accountEmail : 'stream.netflix1@gmail.com',
        subscriptionId: sub ? sub.id : '',
        clientName: 'Moussa Diallo & Aminata Balde',
        source: 'Email automatique (info@account.netflix.com)',
        householdLink: 'https://www.netflix.com/update-primary-location'
      });
    }

    // Migration helper for existing localStorage data: enrich accounts missing credentials
    upgrade();
  }

  function upgrade() {
    const allSubs = subscriptions.getAll();
    let subUpdated = false;
    allSubs.forEach(s => {
      let modified = false;
      if (!s.name) { s.name = `${s.service} Compte Principal`; modified = true; }
      if (!s.accountEmail) {
        if (s.service === 'Netflix') { s.accountEmail = 'stream.netflix1@gmail.com'; s.accountPassword = 'PassNetflix2025!'; s.accountPin = '1234'; }
        else if (s.service === 'Spotify') { s.accountEmail = 'spotify.fam1@gmail.com'; s.accountPassword = 'MusicSpotify2025*'; }
        else { s.accountEmail = `${s.service.toLowerCase().replace(/\s+/g,'')}@account.com`; s.accountPassword = 'PassAccount2025!'; }
        modified = true;
      }
      if (modified) subUpdated = true;
    });
    if (subUpdated) _set(KEYS.subscriptions, allSubs);

    const allClients = clients.getAll();
    let cliUpdated = false;
    allClients.forEach(c => {
      if (!c.subscriptionId) {
        const matchingSub = allSubs.find(s => s.service === c.service);
        if (matchingSub) {
          c.subscriptionId = matchingSub.id;
          cliUpdated = true;
        }
      }
      if (!c.pinCode && c.service === 'Netflix') {
        c.pinCode = '1234';
        cliUpdated = true;
      }
    });
    if (cliUpdated) _set(KEYS.clients, allClients);
  }

  // =================== EXPORT / IMPORT ===================
  function exportAll() {
    return {
      clients:       clients.getAll(),
      subscriptions: subscriptions.getAll(),
      payments:      payments.getAll(),
      services:      services.getAll(),
      activityLogs:  activityLogs.getAll(),
      exportedAt:    new Date().toISOString(),
      version:       '1.0',
    };
  }

  function importAll(data) {
    if (data.clients)       _set(KEYS.clients, data.clients);
    if (data.subscriptions) _set(KEYS.subscriptions, data.subscriptions);
    if (data.payments)      _set(KEYS.payments, data.payments);
    if (data.services)      _set(KEYS.services, data.services);
    if (data.activityLogs)  _set(KEYS.activity_logs, data.activityLogs);
  }

  // Initialize
  auth.init();
  seed();

  return { clients, subscriptions, payments, services, activityLogs, auth, settings, netflixCodes, exportAll, importAll };
})();
