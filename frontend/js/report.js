// js/report.js — Accident report multi-step form (plain JS)

document.addEventListener('DOMContentLoaded', function () {

  let currentStep = 1;
  let selectedFiles = [];
  let vehicleCount  = 0;

  // ── Step navigation ──────────────────────────────────────────
  function goToStep(step) {
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(function (el) {
      el.classList.remove('active');
      el.classList.add('hidden');
    });

    // Update step bubbles
    document.querySelectorAll('.step').forEach(function (el) {
      let s = parseInt(el.dataset.step);
      el.classList.remove('active', 'done');
      if (s < step) el.classList.add('done');
      if (s === step) el.classList.add('active');
    });

    // Show the target step
    let target = document.getElementById('step-' + step);
    if (target) {
      target.classList.remove('hidden');
      target.classList.add('active');
      
      // Fix Leaflet map rendering if jumping to step 2
      if (step === 2 && map) {
        setTimeout(function() { map.invalidateSize(); }, 100);
      }
    }
    currentStep = step;
    window.scrollTo({ top: 100, behavior: 'smooth' });
  }

  // ── Default datetime ─────────────────────────────────────────
  let dtInput = document.getElementById('dateTime');
  if (dtInput) {
    let now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    dtInput.value = now.toISOString().slice(0, 16);
  }

  // ── Description counter ───────────────────────────────────────
  let descEl  = document.getElementById('description');
  let counter = document.getElementById('descCounter');
  if (descEl && counter) {
    descEl.addEventListener('input', function () { counter.textContent = descEl.value.length + '/2000'; });
  }

  // ── Injury toggle ─────────────────────────────────────────────
  document.querySelectorAll('input[name="injuriesOccurred"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      let details = document.getElementById('injuryDetails');
      if (details) {
        if (radio.value === 'true') {
          details.classList.remove('hidden');
        } else {
          details.classList.add('hidden');
        }
      }
    });
  });

  // ── Geolocation & Map ─────────────────────────────────────────
  let map     = null;
  let marker  = null;
  let detectBtn = document.getElementById('detectLocationBtn');

  function updateMap(lat, lon) {
    let mapContainer = document.getElementById('mapPreview');
    if (!mapContainer) return;

    if (!map) {
      // Clear placeholder
      mapContainer.innerHTML = '';
      // Initialize Leaflet
      map = L.map('mapPreview').setView([lat, lon], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      marker = L.marker([lat, lon]).addTo(map);
    } else {
      map.setView([lat, lon], 15);
      marker.setLatLng([lat, lon]);
    }
  }

  if (detectBtn) {
    detectBtn.addEventListener('click', function () {
      let status = document.getElementById('locationStatus');
      if (!navigator.geolocation) { Toast.error('Geolocation not supported.'); return; }
      if (status) status.textContent = '📡 Detecting...';
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          let lat = pos.coords.latitude.toFixed(6);
          let lon = pos.coords.longitude.toFixed(6);
          let latEl = document.getElementById('latitude');
          let lonEl = document.getElementById('longitude');
          if (latEl) latEl.value = lat;
          if (lonEl) lonEl.value = lon;
          if (status) status.textContent = '✅ Location found';
          
          updateMap(lat, lon);
          Toast.success('Location detected!');
        },
        function (err) {
          if (status) status.textContent = 'Could not detect location.';
          Toast.error('GPS error: ' + (err.message || 'Unknown'));
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  // ── Add vehicle ───────────────────────────────────────────────
  function addVehicle() {
    vehicleCount++;
    let n = vehicleCount;
    let list = document.getElementById('vehicleList');
    if (!list) return;
    let card = document.createElement('div');
    card.className = 'vehicle-card';
    card.id = 'vehicle-' + n;
    card.innerHTML =
      '<div class="vehicle-card-header">' +
        '<span class="vehicle-card-title">🚗 Vehicle ' + n + '</span>' +
        '<button type="button" class="vehicle-remove" data-id="' + n + '">Remove</button>' +
      '</div>' +
      '<div class="form-grid">' +
        '<div class="form-group"><label class="form-label">Type</label>' +
          '<select class="form-control" name="vType' + n + '">' +
            '<option value="car">Car</option><option value="motorcycle">Motorcycle</option>' +
            '<option value="truck">Truck</option><option value="bus">Bus</option>' +
            '<option value="bicycle">Bicycle</option><option value="other">Other</option>' +
          '</select></div>' +
        '<div class="form-group"><label class="form-label">Make</label>' +
          '<input type="text" class="form-control" name="vMake' + n + '" placeholder="e.g. Honda"></div>' +
        '<div class="form-group"><label class="form-label">Model</label>' +
          '<input type="text" class="form-control" name="vModel' + n + '" placeholder="e.g. City"></div>' +
        '<div class="form-group"><label class="form-label">License Plate</label>' +
          '<input type="text" class="form-control" name="vPlate' + n + '" placeholder="MH-01-AB-1234" style="text-transform:uppercase"></div>' +
        '<div class="form-group"><label class="form-label">Color</label>' +
          '<input type="text" class="form-control" name="vColor' + n + '" placeholder="White"></div>' +
        '<div class="form-group"><label class="form-label">Insurance Policy #</label>' +
          '<input type="text" class="form-control" name="vPolicy' + n + '" placeholder="INS-XXXXXXXX"></div>' +
      '</div>';
    list.appendChild(card);
  }

  addVehicle();

  let addBtn = document.getElementById('addVehicleBtn');
  if (addBtn) addBtn.addEventListener('click', addVehicle);

  // Remove vehicle
  let vehicleList = document.getElementById('vehicleList');
  if (vehicleList) {
    vehicleList.addEventListener('click', function (e) {
      if (e.target.classList.contains('vehicle-remove')) {
        let card = document.getElementById('vehicle-' + e.target.dataset.id);
        if (card) card.remove();
      }
    });
  }

  // ── File upload ───────────────────────────────────────────────
  let dropZone  = document.getElementById('dropZone');
  let fileInput = document.getElementById('evidence');
  let previews  = document.getElementById('filePreviews');

  function renderPreviews() {
    if (!previews) return;
    previews.innerHTML = '';
    for (let i = 0; i < selectedFiles.length; i++) {
      let file = selectedFiles[i];
      let item = document.createElement('div');
      item.className = 'file-preview-item';
      let isImg = file.type.startsWith('image/');
      if (isImg) {
        let img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.alt = file.name;
        item.appendChild(img);
      } else {
        let ic = document.createElement('div');
        ic.style.cssText = 'font-size:2rem;margin-bottom:8px;text-align:center';
        ic.textContent = file.type.includes('pdf') ? '📄' : '🎥';
        item.appendChild(ic);
      }
      let name = document.createElement('p');
      name.className = 'file-preview-name';
      name.textContent = file.name;
      item.appendChild(name);
      let rmBtn = document.createElement('button');
      rmBtn.className = 'file-preview-remove';
      rmBtn.textContent = '×';
      rmBtn.type = 'button';
      rmBtn.setAttribute('data-idx', i);
      item.appendChild(rmBtn);
      previews.appendChild(item);
    }
  }

  if (previews) {
    previews.addEventListener('click', function (e) {
      if (e.target.classList.contains('file-preview-remove')) {
        selectedFiles.splice(parseInt(e.target.dataset.idx), 1);
        renderPreviews();
      }
    });
  }

  function addFiles(files) {
    let allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf'];
    for (let i = 0; i < files.length; i++) {
      if (allowed.indexOf(files[i].type) === -1) { Toast.error(files[i].name + ': Invalid file type.'); continue; }
      if (files[i].size > 10 * 1024 * 1024) { Toast.error(files[i].name + ': Exceeds 10MB.'); continue; }
      if (selectedFiles.length >= 10) { Toast.warning('Max 10 files allowed.'); break; }
      selectedFiles.push(files[i]);
    }
    renderPreviews();
  }

  if (dropZone) {
    dropZone.addEventListener('click', function () { if (fileInput) fileInput.click(); });
    dropZone.addEventListener('dragover', function (e) { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('drag-over'); });
    dropZone.addEventListener('drop', function (e) { e.preventDefault(); dropZone.classList.remove('drag-over'); addFiles(e.dataTransfer.files); });
  }
  if (fileInput) {
    fileInput.addEventListener('change', function () { addFiles(fileInput.files); fileInput.value = ''; });
  }

  // ── Review summary ────────────────────────────────────────────
  function buildReview() {
    let summary = document.getElementById('reviewSummary');
    if (!summary) return;
    function g(id) { return (document.getElementById(id) || {}).value || '—'; }
    let dt = g('dateTime');
    let dtStr = dt !== '—' ? new Date(dt).toLocaleString() : '—';
    summary.innerHTML =
      '<div class="review-section">' +
        '<p class="review-section-title">Accident Details</p>' +
        '<dl class="review-grid">' +
          '<div class="review-field"><dt>Type</dt><dd>' + g('accidentType') + '</dd></div>' +
          '<div class="review-field"><dt>Severity</dt><dd>' + g('severity') + '</dd></div>' +
          '<div class="review-field"><dt>Date & Time</dt><dd>' + dtStr + '</dd></div>' +
        '</dl>' +
        '<div class="review-field" style="margin-top:12px"><dt>Description</dt><dd style="color:var(--txt-300);font-weight:400">' + g('description') + '</dd></div>' +
      '</div>' +
      '<div class="review-section">' +
        '<p class="review-section-title">Location</p>' +
        '<dl class="review-grid">' +
          '<div class="review-field"><dt>Address</dt><dd>' + g('address') + '</dd></div>' +
          '<div class="review-field"><dt>City</dt><dd>' + g('city') + '</dd></div>' +
        '</dl>' +
      '</div>' +
      '<div class="review-section">' +
        '<p class="review-section-title">Summary</p>' +
        '<dl class="review-grid">' +
          '<div class="review-field"><dt>Vehicles</dt><dd>' + document.querySelectorAll('.vehicle-card').length + '</dd></div>' +
          '<div class="review-field"><dt>Evidence Files</dt><dd>' + selectedFiles.length + '</dd></div>' +
        '</dl>' +
      '</div>';
  }

  // ── Validation ────────────────────────────────────────────────
  function validateStep1() {
    let at = document.getElementById('accidentType');
    let sv = document.getElementById('severity');
    let dt = document.getElementById('dateTime');
    let ds = document.getElementById('description');
    let ok = true;
    if (!at.value)                   { showError(at, 'Please select accident type.'); ok = false; } else clearError(at);
    if (!sv.value)                   { showError(sv, 'Please select severity.'); ok = false; } else clearError(sv);
    if (!dt.value)                   { showError(dt, 'Please set date and time.'); ok = false; } else clearError(dt);
    if (ds.value.trim().length < 20) { showError(ds, 'Description needs at least 20 characters.'); ok = false; } else clearError(ds);
    return ok;
  }

  function validateStep2() {
    let addr = document.getElementById('address');
    let city = document.getElementById('city');
    let ok = true;
    if (!addr.value.trim()) { showError(addr, 'Address is required.'); ok = false; } else clearError(addr);
    if (!city.value.trim()) { showError(city, 'City is required.'); ok = false; } else clearError(city);
    return ok;
  }

  // ── Step buttons ──────────────────────────────────────────────
  document.getElementById('step1Next') && document.getElementById('step1Next').addEventListener('click', function () { if (validateStep1()) goToStep(2); });
  document.getElementById('step2Prev') && document.getElementById('step2Prev').addEventListener('click', function () { goToStep(1); });
  document.getElementById('step2Next') && document.getElementById('step2Next').addEventListener('click', function () { if (validateStep2()) goToStep(2 + 1); });
  document.getElementById('step3Prev') && document.getElementById('step3Prev').addEventListener('click', function () { goToStep(2); });
  document.getElementById('step3Next') && document.getElementById('step3Next').addEventListener('click', function () { goToStep(4); });
  document.getElementById('step4Prev') && document.getElementById('step4Prev').addEventListener('click', function () { goToStep(3); });
  document.getElementById('step4Next') && document.getElementById('step4Next').addEventListener('click', function () { buildReview(); goToStep(5); });
  document.getElementById('step5Prev') && document.getElementById('step5Prev').addEventListener('click', function () { goToStep(4); });

  // ── Form submit ───────────────────────────────────────────────
  let form = document.getElementById('accidentForm');
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!document.getElementById('agreeTerms').checked) { Toast.error('Please confirm the information is accurate.'); return; }
      if (!Auth.isLoggedIn()) {
        Toast.warning('Please log in to submit a report.');
        setTimeout(function () { window.location.href = 'login.html?redirect=report.html'; }, 1200);
        return;
      }
      let btn = document.getElementById('submitBtn');
      setLoading(btn, true);
      try {
        function g(id) { return (document.getElementById(id) || {}).value || ''; }
        let fd = new FormData();
        fd.append('accidentType', g('accidentType'));
        fd.append('severity',     g('severity'));
        fd.append('dateTime',     g('dateTime'));
        fd.append('description',  g('description'));
        fd.append('location', JSON.stringify({ address: g('address'), city: g('city'), state: g('state'), latitude: parseFloat(g('latitude')) || null, longitude: parseFloat(g('longitude')) || null }));
        let injured = document.querySelector('input[name="injuriesOccurred"]:checked');
        fd.append('injuries', JSON.stringify({ occurred: injured && injured.value === 'true', count: parseInt(g('injuryCount')) || 0, description: g('injuryDesc') }));
        fd.append('policeReport', JSON.stringify({ filed: g('policeReportFiled') === 'true' }));

        // Vehicles
        let vehicles = [];
        document.querySelectorAll('.vehicle-card').forEach(function (card) {
          let inputs = card.querySelectorAll('input, select');
          let v = {};
          inputs.forEach(function (inp) {
            let name = inp.name || '';
            if (name.startsWith('vType'))  v.type  = inp.value;
            if (name.startsWith('vMake'))  v.make  = inp.value;
            if (name.startsWith('vModel')) v.model = inp.value;
            if (name.startsWith('vPlate')) v.licensePlate = inp.value;
            if (name.startsWith('vColor')) v.color = inp.value;
            if (name.startsWith('vPolicy')) v.insurancePolicyNumber = inp.value;
          });
          vehicles.push(v);
        });
        fd.append('vehicles', JSON.stringify(vehicles));
        for (let i = 0; i < selectedFiles.length; i++) {
          fd.append('evidence', selectedFiles[i]);
        }

        let result = await http.post('/accidents', fd);
        let caseEl = document.getElementById('caseNumberDisplay');
        if (caseEl) caseEl.textContent = (result.data && result.data.caseNumber) || '—';

        // Show success step
        document.querySelectorAll('.form-step').forEach(function (el) { el.classList.remove('active'); el.classList.add('hidden'); });
        document.querySelectorAll('.step').forEach(function (s) { s.classList.add('done'); });
        let success = document.getElementById('step-success');
        if (success) { success.classList.remove('hidden'); success.classList.add('active'); }
        Toast.success('Report submitted successfully!');
      } catch (err) {
        Toast.error(err.message || 'Failed to submit report.');
      } finally {
        setLoading(btn, false);
      }
    });
  }
});
