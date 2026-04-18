// js/auth.js — Login & Register page logic (plain JS, no modules)

document.addEventListener('DOMContentLoaded', function () {

  // Redirect if already logged in
  if (Auth.isLoggedIn()) {
    let redirect = new URLSearchParams(window.location.search).get('redirect') || 'dashboard.html';
    window.location.href = redirect;
    return;
  }

  // ── Tab switching ──────────────────────────────────────────
  let loginTab    = document.getElementById('loginTabBtn');
  let registerTab = document.getElementById('registerTabBtn');
  let loginPanel  = document.getElementById('loginPanel');
  let regPanel    = document.getElementById('registerPanel');

  function switchTab(showPanel, hidePanel, activeTab, inactiveTab) {
    showPanel.classList.add('active');
    showPanel.hidden = false;
    hidePanel.classList.remove('active');
    hidePanel.hidden = true;
    activeTab.classList.add('active');
    activeTab.setAttribute('aria-selected', 'true');
    inactiveTab.classList.remove('active');
    inactiveTab.setAttribute('aria-selected', 'false');
  }

  loginTab && loginTab.addEventListener('click', function () {
    switchTab(loginPanel, regPanel, loginTab, registerTab);
  });
  registerTab && registerTab.addEventListener('click', function () {
    switchTab(regPanel, loginPanel, registerTab, loginTab);
  });

  // ── Password toggle ────────────────────────────────────────
  function addPasswordToggle(btnId, inputId) {
    let btn = document.getElementById(btnId);
    let inp = document.getElementById(inputId);
    if (!btn || !inp) return;
    btn.addEventListener('click', function () {
      let hidden = inp.type === 'password';
      inp.type = hidden ? 'text' : 'password';
      btn.textContent = hidden ? '🙈' : '👁';
    });
  }
  addPasswordToggle('toggleLoginPw', 'loginPassword');
  addPasswordToggle('toggleRegPw', 'regPassword');

  // ── Password strength ──────────────────────────────────────
  let regPw = document.getElementById('regPassword');
  let strengthBar = document.getElementById('strengthBar');
  let strengthLabel = document.getElementById('strengthLabel');

  if (regPw) {
    regPw.addEventListener('input', function () {
      let pw = regPw.value;
      let score = 0;
      if (pw.length >= 6) score++;
      if (pw.length >= 10) score++;
      if (/[A-Z]/.test(pw)) score++;
      if (/[0-9]/.test(pw)) score++;
      if (/[^A-Za-z0-9]/.test(pw)) score++;
      let levels = [
        { pct: '0%',   color: '#ef4444', text: '' },
        { pct: '20%',  color: '#ef4444', text: 'Very weak' },
        { pct: '40%',  color: '#f97316', text: 'Weak' },
        { pct: '60%',  color: '#eab308', text: 'Fair' },
        { pct: '80%',  color: '#22c55e', text: 'Strong' },
        { pct: '100%', color: '#22c55e', text: 'Very strong' },
      ];
      let lvl = levels[score] || levels[0];
      if (strengthBar) { strengthBar.style.setProperty('--strength', lvl.pct); strengthBar.style.setProperty('--strength-color', lvl.color); }
      if (strengthLabel) { strengthLabel.textContent = lvl.text; strengthLabel.style.color = lvl.color; }
    });
  }



  // ── Login ──────────────────────────────────────────────────
  let loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      let emailEl = document.getElementById('loginEmail');
      let passEl  = document.getElementById('loginPassword');
      let btn     = document.getElementById('loginSubmitBtn');

      clearError(emailEl); clearError(passEl);
      let ok = true;
      if (!emailEl.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value)) {
        showError(emailEl, 'Please enter a valid email address.'); ok = false;
      }
      if (!passEl.value) { showError(passEl, 'Password is required.'); ok = false; }
      if (!ok) return;

      setLoading(btn, true);
      try {
        let data = await http.post('/auth/login', { email: emailEl.value.trim(), password: passEl.value });
        Auth.setSession(data.token, data.user);
        Toast.success('Welcome back, ' + data.user.name + '! 👋');
        let redirect = new URLSearchParams(window.location.search).get('redirect') || 'dashboard.html';
        setTimeout(function () { window.location.href = redirect; }, 1000);
      } catch (err) {
        Toast.error(err.message || 'Login failed. Check credentials.');
        showError(passEl, err.message || 'Invalid email or password');
      } finally {
        setLoading(btn, false);
      }
    });
  }

  // ── Register ───────────────────────────────────────────────
  let regForm = document.getElementById('registerForm');
  if (regForm) {
    regForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      let nameEl  = document.getElementById('regName');
      let emailEl = document.getElementById('regEmail');
      let passEl  = document.getElementById('regPassword');
      let terms   = document.getElementById('agreeRegTerms');
      let btn     = document.getElementById('registerSubmitBtn');

      clearError(nameEl); clearError(emailEl); clearError(passEl);
      let ok = true;
      if (!nameEl.value.trim()) { showError(nameEl, 'Full name is required.'); ok = false; }
      if (!emailEl.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value)) {
        showError(emailEl, 'Please enter a valid email.'); ok = false;
      }
      if (passEl.value.length < 6) { showError(passEl, 'Password must be at least 6 characters.'); ok = false; }
      if (!terms || !terms.checked) { Toast.error('Please agree to the Terms of Service.'); ok = false; }
      if (!ok) return;

      let phone = (document.getElementById('regPhone') || {}).value || '';

      setLoading(btn, true);
      try {
        let data = await http.post('/auth/register', {
          name: nameEl.value.trim(),
          email: emailEl.value.trim(),
          password: passEl.value,
          phone: phone.trim()
        });
        Auth.setSession(data.token, data.user);
        Toast.success('Account created! Welcome ' + data.user.name + ' 🎉');
        setTimeout(function () { window.location.href = 'dashboard.html'; }, 1200);
      } catch (err) {
        Toast.error(err.message || 'Registration failed.');
        if (err.message && err.message.toLowerCase().includes('email')) {
          showError(emailEl, 'This email is already registered.');
        }
      } finally {
        setLoading(btn, false);
      }
    });
  }

});
