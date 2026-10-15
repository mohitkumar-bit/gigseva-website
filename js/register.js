document.addEventListener('DOMContentLoaded', () => {
  if (window.AuthStore?.isLoggedIn()) {
    window.location.replace('dashboard.html');
    return;
  }

  const form = document.getElementById('registerForm');
  const errorEl = document.getElementById('authError');
  const submitBtn = document.getElementById('registerSubmit');

  form?.phone?.addEventListener('input', () => {
    form.phone.value = form.phone.value.replace(/\D/g, '').slice(0, 10);
  });

  const terms = form?.querySelector('#agreeTerms');
  const syncSubmit = () => {
    if (submitBtn) submitBtn.disabled = !terms?.checked;
  };
  terms?.addEventListener('change', syncSubmit);
  syncSubmit();

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!terms?.checked) return;
    errorEl.hidden = true;
    errorEl.textContent = '';

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const phone = form.phone.value.replace(/\D/g, '').slice(0, 10);
    form.phone.value = phone;

    if (!name || !phone) {
      errorEl.textContent = 'Name and phone number are required';
      errorEl.hidden = false;
      return;
    }

    if (phone.length !== 10) {
      errorEl.textContent = 'Phone number must be exactly 10 digits';
      errorEl.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.classList.add('is-loading');
    const label = submitBtn.querySelector('span');
    const prev = label ? label.textContent : '';
    if (label) label.textContent = 'Sending OTP...';

    try {
      const result = await AuthApi.sendOtp({
        phone,
        purpose: 'register',
        name,
        email: email || undefined,
      });
      sessionStorage.setItem(
        'gigseva_otp_pending',
        JSON.stringify({
          phone,
          purpose: 'register',
          name,
          email,
          expiresIn: result.expiresIn,
        })
      );
      window.location.href = 'otp-verfication.html';
    } catch (err) {
      errorEl.textContent = err.message || 'Failed to send OTP';
      errorEl.hidden = false;
      submitBtn.disabled = false;
      submitBtn.classList.remove('is-loading');
      if (label) label.textContent = prev || 'Send OTP';
    }
  });
});
