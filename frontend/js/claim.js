// js/claim.js — Claims page (plain JS, no modules)

document.addEventListener('DOMContentLoaded', function () {

  let selectedFiles = [];

  // ── File upload ───────────────────────────────────────────────
  function initFileUpload() {
    let dropZone = document.getElementById('claimDropZone');
    let fileInput = document.getElementById('claimDocs');
    let previews  = document.getElementById('claimFilePreviews');
    if (!dropZone || !fileInput) return;

    function renderChips() {
      if (!previews) return;
      previews.innerHTML = '';
      selectedFiles.forEach(function (file, idx) {
        let chip = document.createElement('div');
        chip.className = 'file-chip';
        chip.innerHTML = (file.type.includes('pdf') ? '📄 ' : '🖼️ ') +
          '<span class="file-chip-name">' + file.name + '</span>' +
          '<button type="button" class="file-chip-remove" data-idx="' + idx + '">×</button>';
        previews.appendChild(chip);
      });
      previews.addEventListener('click', function (e) {
        if (e.target.classList.contains('file-chip-remove')) {
          selectedFiles.splice(parseInt(e.target.dataset.idx), 1);
          renderChips();
        }
      });
    }

    function addFiles(files) {
      Array.from(files).forEach(function (f) {
        if (f.size > 10 * 1024 * 1024) { Toast.error(f.name + ' is too large (max 10MB).'); return; }
        if (selectedFiles.length >= 10) { Toast.warning('Max 10 files allowed.'); return; }
        selectedFiles.push(f);
      });
      renderChips();
    }

    dropZone.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () { addFiles(fileInput.files); fileInput.value = ''; });
    dropZone.addEventListener('dragover', function (e) { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('drag-over'); });
    dropZone.addEventListener('drop', function (e) { e.preventDefault(); dropZone.classList.remove('drag-over'); addFiles(e.dataTransfer.files); });
  }

  initFileUpload();

  // ── Load claims list ──────────────────────────────────────────
  function loadClaims(page, statusFilter) {
    let container = document.getElementById('claimsList');
    if (!container) return;
    if (!Auth.isLoggedIn()) {
      container.innerHTML = '<div class="claim-empty">Please <a href="login.html">log in</a> to view claims.</div>';
      return;
    }
    container.innerHTML = '<div class="claims-loading"><div class="spinner"></div><p>Loading...</p></div>';

    let params = '?limit=10' + (page ? '&page=' + page : '') + (statusFilter ? '&status=' + statusFilter : '');
    http.get('/claims' + params)
      .then(function (data) {
        let claims = data.data || [];
        if (!claims.length) { container.innerHTML = '<div class="claim-empty">No claims yet.</div>'; return; }
        container.innerHTML = '';
        claims.forEach(function (claim) {
          let statusMap = { submitted:'pending', 'under-review':'review', approved:'resolved', rejected:'danger' };
          let sc = statusMap[claim.status] || 'pending';
          let item = document.createElement('div');
          item.className = 'claim-list-item';
          item.tabIndex = 0;
          item.innerHTML =
            '<div class="claim-item-header">' +
              '<span class="claim-item-number">' + (claim.claimNumber || '—') + '</span>' +
              '<span class="badge badge-' + sc + '">' + claim.status + '</span>' +
            '</div>' +
            '<p class="claim-item-type">' + (claim.claimType || '—') + '</p>' +
            '<p class="claim-item-amount">₹' + ((claim.estimatedAmount || 0).toLocaleString('en-IN')) + '</p>' +
            '<p class="claim-item-date">' + new Date(claim.createdAt).toLocaleDateString('en-IN') + '</p>';
          item.addEventListener('click', function () { openClaimModal(claim); });
          item.addEventListener('keypress', function (e) { if (e.key === 'Enter') openClaimModal(claim); });
          container.appendChild(item);
        });
      })
      .catch(function () {
        container.innerHTML = '<div class="claim-empty">Could not load claims.</div>';
      });
  }

  loadClaims(1, '');

  let statusFilter = document.getElementById('claimStatusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', function () { loadClaims(1, statusFilter.value); });
  }

  // ── Modal ─────────────────────────────────────────────────────
  function openClaimModal(claim) {
    let body  = document.getElementById('claimModalBody');
    let title = document.getElementById('claimModalTitle');
    if (!body) return;
    title.textContent = claim.claimNumber || 'Claim Details';
    let timeline = (claim.timeline || []).map(function (t) {
      return '<div class="timeline-item"><div class="timeline-dot">✓</div><div class="timeline-content">' +
        '<p class="timeline-action">' + t.action + '</p>' +
        (t.note ? '<p class="timeline-note">' + t.note + '</p>' : '') +
        '<p class="timeline-time">' + new Date(t.timestamp).toLocaleString('en-IN') + '</p>' +
        '</div></div>';
    }).join('');
    body.innerHTML =
      '<dl class="detail-grid">' +
        '<div class="detail-field"><dt>Type</dt><dd>' + (claim.claimType || '—') + '</dd></div>' +
        '<div class="detail-field"><dt>Status</dt><dd><span class="badge">' + claim.status + '</span></dd></div>' +
        '<div class="detail-field"><dt>Policy #</dt><dd>' + (claim.policyNumber || '—') + '</dd></div>' +
        '<div class="detail-field"><dt>Insurer</dt><dd>' + (claim.insuranceCompany || '—') + '</dd></div>' +
        '<div class="detail-field"><dt>Estimated</dt><dd>₹' + ((claim.estimatedAmount || 0).toLocaleString('en-IN')) + '</dd></div>' +
        '<div class="detail-field"><dt>Filed On</dt><dd>' + new Date(claim.createdAt).toLocaleDateString('en-IN', { dateStyle:'long' }) + '</dd></div>' +
      '</dl>' +
      '<p style="font-size:.875rem;color:var(--txt-300);margin-bottom:1rem;line-height:1.7">' + (claim.description || '') + '</p>' +
      (timeline ? '<h4 style="font-size:.9rem;font-weight:700;margin-bottom:.75rem">Timeline</h4><div class="timeline">' + timeline + '</div>' : '');
    openModal('claimModal');
  }

  document.getElementById('closeClaimModal') && document.getElementById('closeClaimModal').addEventListener('click', function () { closeModal('claimModal'); });

  // ── Form submit ───────────────────────────────────────────────
  let claimForm = document.getElementById('claimForm');
  if (claimForm) {
    claimForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      let claimType   = document.getElementById('claimType');
      let policyNum   = document.getElementById('policyNumber');
      let insurer     = document.getElementById('insuranceCompany');
      let amount      = document.getElementById('estimatedAmount');
      let desc        = document.getElementById('claimDescription');
      let btn         = document.getElementById('claimSubmitBtn');

      let ok = true;
      if (!claimType.value)        { showError(claimType, 'Please select claim type.'); ok = false; } else clearError(claimType);
      if (!policyNum.value.trim()) { showError(policyNum, 'Policy number is required.'); ok = false; } else clearError(policyNum);
      if (!insurer.value.trim())   { showError(insurer, 'Insurance company is required.'); ok = false; } else clearError(insurer);
      if (!amount.value || parseFloat(amount.value) < 0) { showError(amount, 'Enter a valid amount.'); ok = false; } else clearError(amount);
      if (desc.value.trim().length < 20) { showError(desc, 'Description needs at least 20 characters.'); ok = false; } else clearError(desc);
      if (!ok) return;

      if (!Auth.isLoggedIn()) {
        Toast.warning('Please log in to file a claim.');
        setTimeout(function () { window.location.href = 'login.html?redirect=claim.html'; }, 1200);
        return;
      }

      setLoading(btn, true);
      try {
        let fd = new FormData();
        fd.append('claimType',        claimType.value);
        fd.append('policyNumber',     policyNum.value.toUpperCase().trim());
        fd.append('insuranceCompany', insurer.value.trim());
        fd.append('estimatedAmount',  amount.value);
        fd.append('description',      desc.value.trim());
        let accRef = (document.getElementById('accidentRef') || {}).value;
        if (accRef) fd.append('accidentRef', accRef.trim());
        selectedFiles.forEach(function (f) { fd.append('documents', f); });

        await http.post('/claims', fd);
        Toast.success('Claim submitted successfully! 📋');
        claimForm.reset();
        selectedFiles = [];
        document.getElementById('claimFilePreviews').innerHTML = '';
        loadClaims(1, '');
      } catch (err) {
        Toast.error(err.message || 'Failed to submit claim.');
      } finally {
        setLoading(btn, false);
      }
    });
  }
});
