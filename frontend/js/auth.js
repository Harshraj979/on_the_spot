// js/auth.js — Login & Register page logic (plain JS, no modules)

document.addEventListener('DOMContentLoaded', function () {

  // Redirect if already logged in
  if (Auth.isLoggedIn()) {
    let redirect = new URLSearchParams(window.location.search).get('redirect') || 'dashboard.html';
    window.location.href = redirect;
    return;
  }

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

  // ── Unified Login / Sign Up ────────────────────────────────
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
        Toast.success('Welcome, ' + data.user.name + '! 👋');
        let redirect = new URLSearchParams(window.location.search).get('redirect') || 'dashboard.html';
        setTimeout(function () { window.location.href = redirect; }, 1000);
      } catch (err) {
        Toast.error(err.message || 'Authentication failed. Check credentials.');
        showError(passEl, err.message || 'Invalid password');
      } finally {
        setLoading(btn, false);
      }
    });
  }

});
