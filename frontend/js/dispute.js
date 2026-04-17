// js/dispute.js — Dispute page (plain JS, no modules)

document.addEventListener('DOMContentLoaded', function () {

  let selectedFiles = [];

  // ── File upload ───────────────────────────────────────────────
  (function initUpload() {
    let dropZone = document.getElementById('disputeDropZone');
    let fileInput = document.getElementById('disputeDocs');
    let previews  = document.getElementById('disputeFilePreviews');
    if (!dropZone || !fileInput) return;

    function renderChips() {
      if (!previews) return;
      previews.innerHTML = '';
      selectedFiles.forEach(function (file, idx) {
        let chip = document.createElement('div');
        chip.className = 'file-chip';
        chip.innerHTML = (file.type.includes('pdf') ? '📄 ' : '🖼️ ') +
          '<span class="file-chip-name">' + file.name + '</span>' +
          '<button type="button" class="file-chip-remove" data-idx="' + idx + '" style="background:none;border:none;cursor:pointer;color:red">×</button>';
        previews.appendChild(chip);
      });
    }

    previews && previews.addEventListener('click', function (e) {
      if (e.target.classList.contains('file-chip-remove')) {
        selectedFiles.splice(parseInt(e.target.dataset.idx), 1);
        renderChips();
      }
    });

    dropZone.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      Array.from(fileInput.files).forEach(function (f) {
        if (f.size > 10 * 1024 * 1024) { Toast.error(f.name + ' exceeds 10MB.'); return; }
        if (selectedFiles.length < 10) selectedFiles.push(f);
      });
      renderChips();
      fileInput.value = '';
    });
    dropZone.addEventListener('dragover', function (e) { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('drag-over'); });
    dropZone.addEventListener('drop', function (e) {
      e.preventDefault(); dropZone.classList.remove('drag-over');
      Array.from(e.dataTransfer.files).forEach(function (f) { if (selectedFiles.length < 10) selectedFiles.push(f); });
      renderChips();
    });
  })();

  // ── Load disputes ─────────────────────────────────────────────
  function loadDisputes(statusFilter) {
    let container = document.getElementById('disputesList');
    if (!container) return;
    if (!Auth.isLoggedIn()) {
      container.innerHTML = '<div class="claim-empty">Please <a href="login.html">log in</a> to view disputes.</div>';
      return;
    }
    container.innerHTML = '<div class="claims-loading"><div class="spinner"></div><p>Loading...</p></div>';
    let p = '?limit=10' + (statusFilter ? '&status=' + statusFilter : '');
    http.get('/disputes' + p)
      .then(function (data) {
        let list = data.data || [];
        if (!list.length) { container.innerHTML = '<div class="claim-empty">No disputes yet.</div>'; return; }
        container.innerHTML = '';
        list.forEach(function (d) {
          let statusColors = { open:'active', 'in-mediation':'review', resolved:'resolved', closed:'danger' };
          let sc = statusColors[d.status] || 'pending';
          let item = document.createElement('div');
          item.className = 'dispute-list-item';
          item.dataset.priority = d.priority;
          item.tabIndex = 0;
          item.innerHTML =
            '<div class="dispute-item-header">' +
              '<span class="dispute-item-number">' + (d.disputeNumber || '—') + '</span>' +
              '<span class="badge badge-' + sc + '">' + d.status + '</span>' +
            '</div>' +
            '<p class="dispute-item-title">' + (d.title || '—') + '</p>' +
            '<div class="dispute-item-meta">' +
              '<span>' + (d.disputeType || '') + '</span>' +
              '<span>·</span>' +
              '<span>' + new Date(d.createdAt).toLocaleDateString('en-IN') + '</span>' +
            '</div>';
          item.addEventListener('click', function () { openDisputeModal(d._id); });
          item.addEventListener('keypress', function (e) { if (e.key === 'Enter') openDisputeModal(d._id); });
          container.appendChild(item);
        });
      })
      .catch(function () { container.innerHTML = '<div class="claim-empty">Could not load disputes.</div>'; });
  }

  loadDisputes('');

  let filterEl = document.getElementById('disputeStatusFilter');
  if (filterEl) filterEl.addEventListener('change', function () { loadDisputes(filterEl.value); });

  // ── Modal ─────────────────────────────────────────────────────
  function openDisputeModal(id) {
    let body  = document.getElementById('disputeModalBody');
    let title = document.getElementById('disputeModalTitle');
    if (!body) return;
    body.innerHTML = '<div class="claims-loading"><div class="spinner"></div></div>';
    openModal('disputeModal');
    http.get('/disputes/' + id)
      .then(function (data) {
        let d = data.data;
        let statusColors = { open:'active', 'in-mediation':'review', resolved:'resolved', closed:'danger' };
        let sc = statusColors[d.status] || 'pending';
        title.textContent = d.disputeNumber || 'Dispute';
        body.innerHTML =
          '<dl class="detail-grid">' +
            '<div class="detail-field"><dt>Type</dt><dd>' + d.disputeType + '</dd></div>' +
            '<div class="detail-field"><dt>Status</dt><dd><span class="badge badge-' + sc + '">' + d.status + '</span></dd></div>' +
            '<div class="detail-field"><dt>Priority</dt><dd>' + d.priority + '</dd></div>' +
            '<div class="detail-field"><dt>Filed</dt><dd>' + new Date(d.createdAt).toLocaleDateString('en-IN', { dateStyle:'long' }) + '</dd></div>' +
          '</dl>' +
          '<h4 style="font-size:.9rem;font-weight:700;margin:1rem 0 .5rem">Description</h4>' +
          '<p style="font-size:.875rem;color:var(--txt-300);line-height:1.7;margin-bottom:1rem">' + d.description + '</p>';
      })
      .catch(function () { body.innerHTML = '<p style="color:var(--txt-400)">Could not load dispute details.</p>'; });
  }

  document.getElementById('closeDisputeModal') && document.getElementById('closeDisputeModal').addEventListener('click', function () { closeModal('disputeModal'); });

  // ── Form submit ───────────────────────────────────────────────
  let form = document.getElementById('disputeForm');
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      let typeEl = document.getElementById('disputeType');
      let titleEl = document.getElementById('disputeTitle');
      let descEl  = document.getElementById('disputeDesc');
      let btn     = document.getElementById('disputeSubmitBtn');

      let ok = true;
      if (!typeEl.value) { showError(typeEl, 'Please select dispute type.'); ok = false; } else clearError(typeEl);
      if (!titleEl.value.trim()) { showError(titleEl, 'Title is required.'); ok = false; } else clearError(titleEl);
      if (descEl.value.trim().length < 30) { showError(descEl, 'Description needs at least 30 characters.'); ok = false; } else clearError(descEl);
      if (!ok) return;

      if (!Auth.isLoggedIn()) {
        Toast.warning('Please log in to raise a dispute.');
        setTimeout(function () { window.location.href = 'login.html?redirect=dispute.html'; }, 1200);
        return;
      }

      setLoading(btn, true);
      try {
        let fd = new FormData();
        fd.append('disputeType',        typeEl.value);
        fd.append('title',              titleEl.value.trim());
        fd.append('description',        descEl.value.trim());
        fd.append('priority',           (document.getElementById('disputePriority') || {}).value || 'medium');
        fd.append('expectedResolution', (document.getElementById('expectedResolution') || {}).value || '');
        selectedFiles.forEach(function (f) { fd.append('documents', f); });

        await http.post('/disputes', fd);
        Toast.success('Dispute submitted! AI analysis will begin shortly. ⚖️');
        form.reset();
        selectedFiles = [];
        document.getElementById('disputeFilePreviews').innerHTML = '';
        loadDisputes('');
      } catch (err) {
        Toast.error(err.message || 'Failed to submit dispute.');
      } finally {
        setLoading(btn, false);
      }
    });
  }
});
