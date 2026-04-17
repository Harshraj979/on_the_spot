// js/dashboard.js — Live Dashboard (plain JS, no modules)

document.addEventListener('DOMContentLoaded', function () {

  let socket = null;

  // ── Live clock ────────────────────────────────────────────────
  function startClock() {
    let el = document.getElementById('dashTime');
    if (!el) return;
    function tick() {
      el.textContent = new Date().toLocaleString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    }
    tick();
    setInterval(tick, 1000);
  }

  startClock();

  // ── User info in sidebar ──────────────────────────────────────
  let user = Auth.getUser();
  if (user) {
    let nameEl   = document.getElementById('sidebarName');
    let roleEl   = document.getElementById('sidebarRole');
    let avatarEl = document.getElementById('sidebarAvatar');
    if (nameEl)   nameEl.textContent   = user.name;
    if (roleEl)   roleEl.textContent   = user.role;
    if (avatarEl) avatarEl.textContent = user.name ? user.name[0].toUpperCase() : '👤';
    let loginBtn = document.getElementById('btnLogin');
    if (loginBtn) { loginBtn.textContent = 'Dashboard'; loginBtn.href = 'dashboard.html'; }
  }

  // ── Panel navigation ──────────────────────────────────────────
  function switchPanel(panelId) {
    document.querySelectorAll('.dash-panel').forEach(function (p) { p.classList.remove('active'); });
    document.querySelectorAll('.dash-nav-btn').forEach(function (b) { b.classList.remove('active'); });
    let panel = document.getElementById('panel-' + panelId);
    let btn   = document.querySelector('[data-panel="' + panelId + '"]');
    if (panel) panel.classList.add('active');
    if (btn)   btn.classList.add('active');

    // Load data for panel
    if (panelId === 'overview')   loadOverview();
    if (panelId === 'accidents')  loadAccidentsTable(1);
    if (panelId === 'claims')     loadClaimsPanel();
    if (panelId === 'disputes')   loadDisputesPanel();
  }

  document.querySelectorAll('.dash-nav-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { switchPanel(btn.dataset.panel); });
  });

  // ── Animated counter ──────────────────────────────────────────
  function animateTo(id, target) {
    let el = document.getElementById(id);
    if (!el) return;
    let current = 0;
    let step    = Math.max(1, Math.ceil(target / 50));
    let timer   = setInterval(function () {
      current = Math.min(current + step, target);
      el.textContent = current.toLocaleString('en-IN');
      if (current >= target) clearInterval(timer);
    }, 25);
  }

  // ── Overview ──────────────────────────────────────────────────
  function loadOverview() {
    if (!Auth.isLoggedIn()) return;

    Promise.allSettled([
      http.get('/accidents?limit=1'),
      http.get('/claims?limit=1'),
      http.get('/disputes?limit=1&status=resolved'),
    ]).then(function (results) {
      if (results[0].status === 'fulfilled') animateTo('statTotalReports', results[0].value.pagination.total || 0);
      if (results[1].status === 'fulfilled') animateTo('statTotalClaims',  results[1].value.pagination.total || 0);
      if (results[2].status === 'fulfilled') animateTo('statResolved',     results[2].value.pagination.total || 0);
    });

    loadRecentActivity();
  }

  function loadRecentActivity() {
    let feed = document.getElementById('activityFeed');
    if (!feed) return;
    feed.innerHTML = '<div class="activity-loading"><div class="spinner"></div></div>';

    Promise.allSettled([
      http.get('/accidents?limit=3'),
      http.get('/claims?limit=3'),
      http.get('/disputes?limit=2'),
    ]).then(function (results) {
      let items = [];
      if (results[0].status === 'fulfilled') {
        (results[0].value.data || []).forEach(function (a) {
          items.push({ icon: '🚨', bg: 'hsla(4,86%,58%,0.12)', title: a.accidentType + ' — ' + a.caseNumber, detail: a.severity + ' · ' + (a.location && a.location.city ? a.location.city : ''), time: a.createdAt });
        });
      }
      if (results[1].status === 'fulfilled') {
        (results[1].value.data || []).forEach(function (c) {
          items.push({ icon: '📋', bg: 'hsla(28,100%,55%,0.12)', title: (c.claimNumber || '—') + ' — ' + c.claimType, detail: '₹' + ((c.estimatedAmount || 0).toLocaleString('en-IN')) + ' · ' + c.status, time: c.createdAt });
        });
      }
      if (results[2].status === 'fulfilled') {
        (results[2].value.data || []).forEach(function (d) {
          items.push({ icon: '⚖️', bg: 'hsla(262,80%,60%,0.12)', title: d.disputeNumber || '—', detail: d.title, time: d.createdAt });
        });
      }
      items.sort(function (a, b) { return new Date(b.time) - new Date(a.time); });
      items = items.slice(0, 6);

      if (!items.length) { feed.innerHTML = '<p style="color:var(--txt-400);padding:1rem;font-size:.875rem">No recent activity yet.</p>'; return; }

      feed.innerHTML = items.map(function (item) {
        let ago = timeAgo(new Date(item.time));
        return '<div class="activity-item">' +
          '<div class="activity-icon" style="background:' + item.bg + '">' + item.icon + '</div>' +
          '<div class="activity-content"><p class="activity-title">' + item.title + '</p><p class="activity-detail">' + item.detail + '</p></div>' +
          '<span class="activity-time">' + ago + '</span>' +
          '</div>';
      }).join('');
    }).catch(function () {
      feed.innerHTML = '<p style="color:var(--txt-400);padding:1rem;font-size:.875rem">Could not load activity.</p>';
    });
  }

  function timeAgo(date) {
    let s = Math.floor((Date.now() - date) / 1000);
    if (s < 60)   return s + 's ago';
    if (s < 3600)  return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  }

  // ── Accidents Table ───────────────────────────────────────────
  function loadAccidentsTable(page) {
    let tbody = document.getElementById('accidentsTableBody');
    if (!tbody) return;
    if (!Auth.isLoggedIn()) {
      tbody.innerHTML = '<tr><td colspan="7" class="table-loading">Please <a href="login.html">log in</a>.</td></tr>';
      return;
    }
    tbody.innerHTML = '<tr><td colspan="7" class="table-loading"><div class="spinner spinner-sm"></div> Loading...</td></tr>';

    let filter = (document.getElementById('accidentStatusFilter') || {}).value || '';
    let params = '?page=' + (page || 1) + '&limit=10' + (filter ? '&status=' + filter : '');

    http.get('/accidents' + params).then(function (data) {
      let accidents = data.data || [];
      if (!accidents.length) { tbody.innerHTML = '<tr><td colspan="7" class="table-loading">No accident reports found.</td></tr>'; return; }
      let sev = { minor: 'resolved', moderate: 'pending', severe: 'danger', fatal: 'danger' };
      tbody.innerHTML = accidents.map(function (a) {
        let loc = (a.location && (a.location.city || a.location.address)) || '—';
        let statusClass = a.status === 'resolved' ? 'resolved' : a.status === 'pending' ? 'pending' : 'review';
        return '<tr>' +
          '<td style="font-family:var(--font-display);font-size:.8rem;color:var(--clr-primary-light)">' + a.caseNumber + '</td>' +
          '<td>' + a.accidentType + '</td>' +
          '<td><span class="badge badge-' + (sev[a.severity] || 'pending') + '">' + a.severity + '</span></td>' +
          '<td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + loc + '</td>' +
          '<td>' + new Date(a.dateTime).toLocaleDateString('en-IN') + '</td>' +
          '<td><span class="badge badge-' + statusClass + '">' + a.status + '</span></td>' +
          '<td><a href="report.html" class="btn btn-ghost btn-sm" style="font-size:.75rem">View</a></td>' +
          '</tr>';
      }).join('');

      // Pagination
      let pagination = data.pagination || {};
      renderPagination(pagination, loadAccidentsTable);
    }).catch(function () {
      tbody.innerHTML = '<tr><td colspan="7" class="table-loading">Failed to load accidents.</td></tr>';
    });
  }

  function renderPagination(pagination, onPage) {
    let container = document.getElementById('accidentsPagination');
    if (!container || !pagination.pages || pagination.pages <= 1) { if (container) container.innerHTML = ''; return; }
    let html = '';
    for (let i = 1; i <= Math.min(pagination.pages, 7); i++) {
      html += '<button class="page-btn' + (i === pagination.page ? ' active' : '') + '" data-page="' + i + '">' + i + '</button>';
    }
    container.innerHTML = html;
    container.querySelectorAll('.page-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { onPage(parseInt(btn.dataset.page)); });
    });
  }

  // ── Claims Panel ──────────────────────────────────────────────
  function loadClaimsPanel() {
    let body = document.getElementById('claimsPanelBody');
    if (!body || !Auth.isLoggedIn()) return;
    body.innerHTML = '<div class="activity-loading"><div class="spinner"></div></div>';
    http.get('/claims?limit=10').then(function (data) {
      let list = data.data || [];
      if (!list.length) { body.innerHTML = '<p style="color:var(--txt-400);padding:1.5rem">No claims yet. <a href="claim.html">File a claim →</a></p>'; return; }
      body.innerHTML = list.map(function (c) {
        let sc = c.status === 'approved' ? 'resolved' : c.status === 'rejected' ? 'danger' : 'pending';
        return '<div class="activity-item" style="cursor:pointer" onclick="window.location.href=\'claim.html\'">' +
          '<div class="activity-icon" style="background:hsla(28,100%,55%,0.12)">📋</div>' +
          '<div class="activity-content">' +
            '<p class="activity-title">' + (c.claimNumber || '—') + ' — ' + (c.claimType || '') + '</p>' +
            '<p class="activity-detail">₹' + ((c.estimatedAmount || 0).toLocaleString('en-IN')) + ' · ' + (c.insuranceCompany || '') + '</p>' +
          '</div>' +
          '<span class="badge badge-' + sc + '">' + c.status + '</span>' +
          '</div>';
      }).join('');
    }).catch(function () { body.innerHTML = '<p style="color:var(--txt-400);padding:1.5rem">Failed to load claims.</p>'; });
  }

  // ── Disputes Panel ────────────────────────────────────────────
  function loadDisputesPanel() {
    let body = document.getElementById('disputesPanelBody');
    if (!body || !Auth.isLoggedIn()) return;
    body.innerHTML = '<div class="activity-loading"><div class="spinner"></div></div>';
    http.get('/disputes?limit=10').then(function (data) {
      let list = data.data || [];
      if (!list.length) { body.innerHTML = '<p style="color:var(--txt-400);padding:1.5rem">No disputes yet. <a href="dispute.html">Open a dispute →</a></p>'; return; }
      body.innerHTML = list.map(function (d) {
        let sc = d.status === 'resolved' ? 'resolved' : d.status === 'open' ? 'active' : 'review';
        return '<div class="activity-item" style="cursor:pointer" onclick="window.location.href=\'dispute.html\'">' +
          '<div class="activity-icon" style="background:hsla(262,80%,60%,0.12)">⚖️</div>' +
          '<div class="activity-content">' +
            '<p class="activity-title">' + (d.disputeNumber || '—') + '</p>' +
            '<p class="activity-detail">' + (d.title || '') + '</p>' +
          '</div>' +
          '<span class="badge badge-' + sc + '">' + d.status + '</span>' +
          '</div>';
      }).join('');
    }).catch(function () { body.innerHTML = '<p style="color:var(--txt-400);padding:1.5rem">Failed to load disputes.</p>'; });
  }

  // ── Socket.IO Live Feed ───────────────────────────────────────
  function initSocket() {
    if (typeof io === 'undefined') {
      updateConnectionUI(false);
      return;
    }
    socket = io('http://localhost:5000', {
      auth: { token: Auth.getToken() || '' },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', function () {
      updateConnectionUI(true);
      socket.emit('dashboard:ping');
    });
    socket.on('disconnect', function () { updateConnectionUI(false); });

    socket.on('dashboard:pong', function (data) {
      let el = document.getElementById('statOnline');
      if (el) el.textContent = data.onlineCount;
    });

    socket.on('accident:new', function (accident) {
      addLiveFeedEvent('🚨', 'New ' + accident.accidentType, accident.severity + ' · ' + ((accident.location && accident.location.city) || 'Unknown') + ' · ' + accident.caseNumber);
      Toast.warning('🚨 New accident: ' + accident.caseNumber);
    });
    socket.on('accident:updated', function (a) { addLiveFeedEvent('🔄', 'Report Updated', a.caseNumber + ' → ' + a.status); });
    socket.on('claim:new', function (c)         { addLiveFeedEvent('📋', 'New Claim', (c.claimNumber || '—') + ' · ' + c.claimType); });
    socket.on('dispute:new', function (d)       { addLiveFeedEvent('⚖️', 'New Dispute', d.title + ' · Priority: ' + d.priority); });

    setInterval(function () { if (socket && socket.connected) socket.emit('dashboard:ping'); }, 30000);
  }

  function updateConnectionUI(connected) {
    let dot    = document.querySelector('.dash-connection .live-dot');
    let status = document.getElementById('connectionStatus');
    if (dot)    dot.style.background  = connected ? 'var(--clr-success)' : 'var(--txt-400)';
    if (status) status.textContent    = connected ? 'Connected' : 'Disconnected';
  }

  function addLiveFeedEvent(icon, title, detail) {
    let container = document.getElementById('liveFeedContainer');
    if (!container) return;
    container.querySelector('.live-feed-empty') && container.querySelector('.live-feed-empty').remove();

    let ev = document.createElement('div');
    ev.className = 'live-event';
    ev.innerHTML =
      '<div class="live-event-type">' + icon + '</div>' +
      '<div class="live-event-content">' +
        '<p class="live-event-title">' + title + '</p>' +
        '<p class="live-event-detail">' + detail + '</p>' +
      '</div>' +
      '<span class="live-event-time">' + new Date().toLocaleTimeString('en-IN') + '</span>';
    container.insertBefore(ev, container.firstChild);
    while (container.children.length > 50) container.lastChild.remove();
  }

  // ── Wire up buttons ───────────────────────────────────────────
  document.getElementById('refreshActivity') && document.getElementById('refreshActivity').addEventListener('click', loadRecentActivity);

  document.getElementById('clearFeedBtn') && document.getElementById('clearFeedBtn').addEventListener('click', function () {
    let c = document.getElementById('liveFeedContainer');
    if (c) c.innerHTML = '<div class="live-feed-empty"><div class="live-feed-empty-icon">📡</div><p>Feed cleared. Waiting for events...</p></div>';
  });

  document.getElementById('accidentStatusFilter') && document.getElementById('accidentStatusFilter').addEventListener('change', function () { loadAccidentsTable(1); });

  // ── Start ─────────────────────────────────────────────────────
  initSocket();
  loadOverview();  // load overview first
});
