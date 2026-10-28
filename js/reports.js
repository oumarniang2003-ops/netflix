/**
 * reports.js – Reports and charts module (Chart.js)
 */

const Reports = (() => {
  let _charts = {};

  function destroyCharts() {
    Object.values(_charts).forEach(c => { try { c.destroy(); } catch {} });
    _charts = {};
  }

  // ===================== DATA AGGREGATION =====================
  function getMonthlyData() {
    const months   = Utils.getLast12Months();
    const payments = DB.payments.getAll();
    const clients  = DB.clients.getAll();
    const logs     = DB.activityLogs.getAll();

    return months.map(m => {
      const monthPayments = payments.filter(p => Utils.monthKey(p.date) === m.key);
      const ca            = monthPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

      // Costs: sum of subscriptions bought in this month
      const subs    = DB.subscriptions.getAll().filter(s => Utils.monthKey(s.buyDate) === m.key);
      const couts   = subs.reduce((s, sub) => s + (Number(sub.cost) || 0), 0);

      const newClients     = clients.filter(c => Utils.monthKey(c.createdAt) === m.key).length;
      const renewals       = logs.filter(l => l.type === 'renewal' && Utils.monthKey(l.timestamp) === m.key).length;
      const expired        = logs.filter(l => l.type === 'expiration' && Utils.monthKey(l.timestamp) === m.key).length;
      const benefice       = ca - couts;

      return { ...m, ca, couts, benefice, newClients, renewals, expired };
    });
  }

  function getServiceSales() {
    const clients  = DB.clients.getAll();
    const counts   = {};
    const revenues = {};
    clients.forEach(c => {
      counts[c.service]   = (counts[c.service]   || 0) + 1;
      revenues[c.service] = (revenues[c.service] || 0) + (Number(c.price) || 0);
    });
    return Object.entries(counts)
      .sort((a,b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, revenue: revenues[name] || 0 }));
  }

  function getPaymentMethods() {
    const payments = DB.payments.getAll();
    const counts = {};
    payments.forEach(p => {
      counts[p.method] = (counts[p.method] || 0) + 1;
    });
    return counts;
  }

  // ===================== CHART DEFAULTS =====================
  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#8892a4', font: { family: 'Inter', size: 12 } },
      },
      tooltip: {
        backgroundColor: '#1a2035',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        titleColor: '#e8eaf0',
        bodyColor: '#8892a4',
      },
    },
    scales: {
      x: { ticks: { color: '#5a6478', font: { family: 'Inter', size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
      y: { ticks: { color: '#5a6478', font: { family: 'Inter', size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
    },
  };

  // ===================== RENDER =====================
  function render() {
    destroyCharts();
    const monthly = getMonthlyData();
    const labels  = monthly.map(m => m.label);

    // ── Chart 1: Revenue & Profit ──
    const ctx1 = Utils.el('chart-revenue');
    if (ctx1) {
      _charts.revenue = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'CA (FCFA)',
              data: monthly.map(m => m.ca),
              backgroundColor: 'rgba(99,102,241,0.7)',
              borderColor: '#6366f1',
              borderWidth: 1,
              borderRadius: 4,
            },
            {
              label: 'Bénéfice (FCFA)',
              data: monthly.map(m => m.benefice),
              backgroundColor: 'rgba(16,185,129,0.7)',
              borderColor: '#10b981',
              borderWidth: 1,
              borderRadius: 4,
            },
            {
              label: 'Coûts (FCFA)',
              data: monthly.map(m => m.couts),
              backgroundColor: 'rgba(239,68,68,0.5)',
              borderColor: '#ef4444',
              borderWidth: 1,
              borderRadius: 4,
            },
          ],
        },
        options: {
          ...chartDefaults,
          plugins: {
            ...chartDefaults.plugins,
            tooltip: {
              ...chartDefaults.plugins.tooltip,
              callbacks: {
                label: ctx => ` ${ctx.dataset.label}: ${Number(ctx.raw).toLocaleString('fr-FR')} FCFA`,
              },
            },
          },
        },
      });
    }

    // ── Chart 2: New Clients ──
    const ctx2 = Utils.el('chart-clients');
    if (ctx2) {
      _charts.clients = new Chart(ctx2, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Nouveaux clients',
              data: monthly.map(m => m.newClients),
              borderColor: '#6366f1',
              backgroundColor: 'rgba(99,102,241,0.12)',
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#6366f1',
            },
            {
              label: 'Renouvellements',
              data: monthly.map(m => m.renewals),
              borderColor: '#10b981',
              backgroundColor: 'rgba(16,185,129,0.1)',
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#10b981',
            },
          ],
        },
        options: chartDefaults,
      });
    }

    // ── Chart 3: Services ──
    const services = getServiceSales();
    const ctx3     = Utils.el('chart-services');
    if (ctx3 && services.length) {
      const colors = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6'];
      _charts.services = new Chart(ctx3, {
        type: 'doughnut',
        data: {
          labels: services.map(s => s.name),
          datasets: [{
            data: services.map(s => s.count),
            backgroundColor: services.map((_, i) => colors[i % colors.length]),
            borderColor: '#1a2035',
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            ...chartDefaults.plugins,
            tooltip: {
              ...chartDefaults.plugins.tooltip,
              callbacks: {
                label: ctx => ` ${ctx.label}: ${ctx.raw} client(s) – ${Number(services[ctx.dataIndex]?.revenue || 0).toLocaleString('fr-FR')} FCFA`,
              },
            },
          },
        },
      });
    }

    // ── Chart 4: Payment Methods ──
    const methods = getPaymentMethods();
    const ctx4    = Utils.el('chart-payments');
    if (ctx4 && Object.keys(methods).length) {
      const methodLabels = Object.keys(methods).map(Utils.methodLabel);
      const methodColors = {
        wave: '#2196f3', orange_money: '#ff6600', especes: '#4caf50', autre: '#9e9e9e',
      };
      _charts.payments = new Chart(ctx4, {
        type: 'pie',
        data: {
          labels: methodLabels,
          datasets: [{
            data: Object.values(methods),
            backgroundColor: Object.keys(methods).map(m => methodColors[m] || '#9e9e9e'),
            borderColor: '#1a2035',
            borderWidth: 2,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { ...chartDefaults.plugins },
        },
      });
    }

    // ── Annual Table ──
    renderAnnualTable(monthly);
  }

  function renderAnnualTable(monthly) {
    const tbody = Utils.el('annual-report-tbody');
    if (!tbody) return;

    const totals = { ca: 0, couts: 0, benefice: 0, newClients: 0, renewals: 0, expired: 0 };

    tbody.innerHTML = monthly.map(m => {
      totals.ca         += m.ca;
      totals.couts      += m.couts;
      totals.benefice   += m.benefice;
      totals.newClients += m.newClients;
      totals.renewals   += m.renewals;
      totals.expired    += m.expired;

      return `<tr>
        <td><strong>${m.label}</strong></td>
        <td style="color:var(--accent)">${Utils.formatCurrency(m.ca)}</td>
        <td style="color:var(--danger)">${Utils.formatCurrency(m.couts)}</td>
        <td style="color:${m.benefice >= 0 ? 'var(--success)' : 'var(--danger)'}">${Utils.formatCurrency(m.benefice)}</td>
        <td style="text-align:center">${m.newClients}</td>
        <td style="text-align:center">${m.renewals}</td>
        <td style="text-align:center">${m.expired}</td>
      </tr>`;
    }).join('');

    // Totals row
    tbody.innerHTML += `<tr style="border-top:2px solid var(--border-strong);font-weight:700">
      <td>TOTAL</td>
      <td style="color:var(--accent)">${Utils.formatCurrency(totals.ca)}</td>
      <td style="color:var(--danger)">${Utils.formatCurrency(totals.couts)}</td>
      <td style="color:${totals.benefice >= 0 ? 'var(--success)' : 'var(--danger)'}">${Utils.formatCurrency(totals.benefice)}</td>
      <td style="text-align:center">${totals.newClients}</td>
      <td style="text-align:center">${totals.renewals}</td>
      <td style="text-align:center">${totals.expired}</td>
    </tr>`;
  }

  function init() {
    // Charts are rendered on demand
  }

  return { init, render };
})();
