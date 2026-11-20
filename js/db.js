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

    // Comptes Netflix Réels & Partenaires
    if (subscriptions.getAll().length === 0) {
      subscriptions.add({
        name: 'Netflix - compte 1',
        service: 'Netflix',
        accountEmail: 'stream.netflix1@gmail.com',
        accountPassword: 'PassNetflix2026!',
        accountPin: '7530',
        cost: 5000,
        sellingPrice: 3000,
        buyDate: '2026-10-30',
        expirationDate: '2026-12-30',
        slots: 4,
        notes: 'Compte 1 (Dembele, Gendarmerie, Moussa)'
      });
      subscriptions.add({
        name: 'Netflix - Compte 2',
        service: 'Netflix',
        accountEmail: 'stream.netflix2@gmail.com',
        accountPassword: 'PassNetflix2026!',
        accountPin: '0356',
        cost: 5000,
        sellingPrice: 2500,
        buyDate: '2026-11-14',
        expirationDate: '2026-12-14',
        slots: 4,
        notes: 'Compte 2 (Abdoulaye)'
      });
      subscriptions.add({
        name: 'Netflix - compte 3',
        service: 'Netflix',
        accountEmail: 'stream.netflix3@gmail.com',
        accountPassword: 'PassNetflix2026!',
        accountPin: '2394',
        cost: 5000,
        sellingPrice: 3000,
        buyDate: '2026-11-02',
        expirationDate: '2026-12-02',
        slots: 4,
        notes: 'Compte 3 (Alioune Diouck)'
      });
      subscriptions.add({
        name: 'Netflix - compte 4',
        service: 'Netflix',
        accountEmail: 'stream.netflix4@gmail.com',
        accountPassword: 'PassNetflix2026!',
        accountPin: '0056',
        cost: 5000,
        sellingPrice: 2500,
        buyDate: '2026-11-20',
        expirationDate: '2026-12-20',
        slots: 4,
        notes: 'Compte 4 (khlif sall)'
      });
      subscriptions.add({
        name: 'Netflix - Compte 5',
        service: 'Netflix',
        accountEmail: 'stream.netflix5@gmail.com',
        accountPassword: 'PassNetflix2026!',
        accountPin: '3398',
        cost: 5000,
        sellingPrice: 3000,
        buyDate: '2026-10-24',
        expirationDate: '2026-11-24',
        slots: 4,
        notes: 'Compte 5 (libase Niang)'
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
    }

    if (clients.getAll().length === 0) {
      const allSubs = subscriptions.getAll();
      const sub1 = allSubs.find(s => s.name.includes('compte 1') || s.accountPin === '7530');
      const sub2 = allSubs.find(s => s.name.includes('Compte 2') || s.accountPin === '0356');
      const sub3 = allSubs.find(s => s.name.includes('compte 3') || s.accountPin === '2394');
      const sub4 = allSubs.find(s => s.name.includes('compte 4') || s.accountPin === '0056');
      const sub5 = allSubs.find(s => s.name.includes('Compte 5') || s.accountPin === '3398');

      clients.add({
        name: 'libase Niang',
        whatsapp: '+221775407574',
        service: 'Netflix',
        subscriptionId: sub5 ? sub5.id : '',
        profile: 'Compte 5',
        pinCode: '3398',
        price: 3000,
        startDate: '2026-10-24',
        expirationDate: '2026-11-24',
        status: 'active',
        notes: 'Compte 5'
      });
      clients.add({
        name: 'Dembele',
        whatsapp: '+221781486583',
        service: 'Netflix',
        subscriptionId: sub1 ? sub1.id : '',
        profile: 'compte 1',
        pinCode: '7530',
        price: 3000,
        startDate: '2026-10-30',
        expirationDate: '2026-11-30',
        status: 'active',
        notes: 'compte 1'
      });
      clients.add({
        name: 'Alioune Diouck',
        whatsapp: '+221774808043',
        service: 'Netflix',
        subscriptionId: sub3 ? sub3.id : '',
        profile: 'compte 3',
        pinCode: '2394',
        price: 3000,
        startDate: '2026-11-02',
        expirationDate: '2026-12-02',
        status: 'active',
        notes: 'compte 3'
      });
      clients.add({
        name: 'Abdoulaye',
        whatsapp: '+221784226091',
        service: 'Netflix',
        subscriptionId: sub2 ? sub2.id : '',
        profile: 'Compte 2',
        pinCode: '0356',
        price: 2500,
        startDate: '2026-11-14',
        expirationDate: '2026-12-14',
        status: 'active',
        notes: 'Compte 2'
      });
      clients.add({
        name: 'Gendarmerie',
        whatsapp: '+221789927754',
        service: 'Netflix',
        subscriptionId: sub1 ? sub1.id : '',
        profile: 'compte 1',
        pinCode: '7530',
        price: 3000,
        startDate: '2026-11-16',
        expirationDate: '2026-12-16',
        status: 'active',
        notes: 'compte 1'
      });
      clients.add({
        name: 'khlif sall',
        whatsapp: '+221775920936',
        service: 'Netflix',
        subscriptionId: sub4 ? sub4.id : '',
        profile: 'compte 4',
        pinCode: '0056',
        price: 2500,
        startDate: '2026-11-20',
        expirationDate: '2026-12-20',
        status: 'active',
        notes: 'compte 4'
      });
      clients.add({
        name: 'Moussa Diallo',
        whatsapp: '+221771234567',
        service: 'Netflix',
        subscriptionId: sub1 ? sub1.id : '',
        profile: 'compte 1',
        pinCode: '7530',
        price: 2500,
        startDate: '2026-11-05',
        expirationDate: '2026-12-05',
        status: 'active',
        notes: 'compte 1'
      });
    }

    if (netflixCodes.getAll().length === 0) {
      const sub = subscriptions.getAll().find(s => s.service === 'Netflix');
      netflixCodes.add({
        code: '7492',
        email: sub ? sub.accountEmail : 'stream.netflix1@gmail.com',
        subscriptionId: sub ? sub.id : '',
        clientName: 'Dembele & Moussa Diallo',
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
        if (s.service === 'Netflix') { s.accountEmail = 'stream.netflix1@gmail.com'; s.accountPassword = 'PassNetflix2026!'; s.accountPin = '7530'; }
        else if (s.service === 'Spotify') { s.accountEmail = 'spotify.fam1@gmail.com'; s.accountPassword = 'MusicSpotify2025*'; }
        else { s.accountEmail = `${s.service.toLowerCase().replace(/\s+/g,'')}@account.com`; s.accountPassword = 'PassAccount2025!'; }
        modified = true;
      }
      if (modified) subUpdated = true;
    });
    if (subUpdated) _set(KEYS.subscriptions, allSubs);

    let allClients = clients.getAll();

    // UPGRADE AUTOMATIQUE : Si l'utilisateur ou le smartphone a encore les anciens clients de démo (Fatou Ndiaye, Ibrahim Sow)
    // et n'a pas encore les vrais clients de baroube (Dembele, libase Niang), on remplace par les vrais clients !
    const hasDembele = allClients.some(c => c.name && c.name.toLowerCase().includes('dembele'));
    const hasOnlyOldMock = allClients.some(c => c.name === 'Fatou Ndiaye' || c.name === 'Ibrahim Sow');

    if (!hasDembele && (hasOnlyOldMock || allClients.length <= 5)) {
      const realSubs = subscriptions.getAll();
      const s1 = realSubs.find(s => s.name && s.name.includes('compte 1')) || realSubs[0];
      const s2 = realSubs.find(s => s.name && s.name.includes('Compte 2')) || realSubs[0];
      const s3 = realSubs.find(s => s.name && s.name.includes('compte 3')) || realSubs[0];
      const s4 = realSubs.find(s => s.name && s.name.includes('compte 4')) || realSubs[0];
      const s5 = realSubs.find(s => s.name && s.name.includes('Compte 5')) || realSubs[0];

      allClients = [
        { id: 'CLI-0001-LIB', name: 'libase Niang', whatsapp: '+221775407574', service: 'Netflix', subscriptionId: s5?.id || '', profile: 'Compte 5', pinCode: '3398', price: 3000, startDate: '2026-10-24', expirationDate: '2026-11-24', status: 'active', notes: 'Compte 5' },
        { id: 'CLI-0002-DEM', name: 'Dembele', whatsapp: '+221781486583', service: 'Netflix', subscriptionId: s1?.id || '', profile: 'compte 1', pinCode: '7530', price: 3000, startDate: '2026-10-30', expirationDate: '2026-11-30', status: 'active', notes: 'compte 1' },
        { id: 'CLI-0003-ALI', name: 'Alioune Diouck', whatsapp: '+221774808043', service: 'Netflix', subscriptionId: s3?.id || '', profile: 'compte 3', pinCode: '2394', price: 3000, startDate: '2026-11-02', expirationDate: '2026-12-02', status: 'active', notes: 'compte 3' },
        { id: 'CLI-0004-ABD', name: 'Abdoulaye', whatsapp: '+221784226091', service: 'Netflix', subscriptionId: s2?.id || '', profile: 'Compte 2', pinCode: '0356', price: 2500, startDate: '2026-11-14', expirationDate: '2026-12-14', status: 'active', notes: 'Compte 2' },
        { id: 'CLI-0005-GEN', name: 'Gendarmerie', whatsapp: '+221789927754', service: 'Netflix', subscriptionId: s1?.id || '', profile: 'compte 1', pinCode: '7530', price: 3000, startDate: '2026-11-16', expirationDate: '2026-12-16', status: 'active', notes: 'compte 1' },
        { id: 'CLI-0006-KHL', name: 'khlif sall', whatsapp: '+221775920936', service: 'Netflix', subscriptionId: s4?.id || '', profile: 'compte 4', pinCode: '0056', price: 2500, startDate: '2026-11-20', expirationDate: '2026-12-20', status: 'active', notes: 'compte 4' },
        { id: 'CLI-0007-MOU', name: 'Moussa Diallo', whatsapp: '+221771234567', service: 'Netflix', subscriptionId: s1?.id || '', profile: 'compte 1', pinCode: '7530', price: 2500, startDate: '2026-11-05', expirationDate: '2026-12-05', status: 'active', notes: 'compte 1' }
      ];
      _set(KEYS.clients, allClients);
    }

    // Vérifier les associations clients <-> comptes
    let cliUpdated = false;
    allClients = clients.getAll();
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
      netflixCodes:  netflixCodes ? netflixCodes.getAll() : [],
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
    if (data.netflixCodes)  _set(KEYS.netflix_codes, data.netflixCodes);
  }

  // Initialize
  auth.init();
  seed();

  return { clients, subscriptions, payments, services, activityLogs, auth, settings, netflixCodes, exportAll, importAll };
})();
