document.addEventListener('DOMContentLoaded', () => {
  if (window.AuthStore?.isLoggedIn()) {
    window.location.replace('dashboard.html');
    return;
  }

  let pending = null;
  try {
    pending = JSON.parse(sessionStorage.getItem('gigseva_otp_pending') || 'null');
  } catch {
    pending = null;
  }

  if (!pending?.phone) {
    window.location.replace('login.html');
    return;
  }

  const form = document.getElementById('otpForm');
  const inputs = Array.from(document.querySelectorAll('.otp-input'));
  const errorEl = document.getElementById('authError');
  const submitBtn = document.getElementById('otpSubmit');
  const phoneLabel = document.getElementById('otpPhoneLabel');
  const hintEl = document.getElementById('otpHint');
  const editLink = document.getElementById('otpEditLink');
  const resendLink = document.getElementById('otpResend');

  const formatPhone = (phone) => {
    const p = String(phone);
    return `+91 ${p.slice(0, 5)} ${p.slice(5)}`;
  };

  phoneLabel.textContent = formatPhone(pending.phone);
  hintEl.textContent = 'Enter the 6-digit OTP sent to your phone';

  editLink.href = pending.purpose === 'register' ? 'registration-form.html' : 'login.html';
  editLink.addEventListener('click', () => {
    sessionStorage.removeItem('gigseva_otp_pending');
  });

  const getOtp = () => inputs.map((el) => el.value).join('');

  inputs.forEach((input, index) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 1);
      if (input.value && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && index > 0) {
        inputs[index - 1].focus();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
      text.split('').forEach((ch, i) => {
        if (inputs[i]) inputs[i].value = ch;
      });
      const focusAt = Math.min(text.length, inputs.length - 1);
      inputs[focusAt]?.focus();
    });
  });

  resendLink?.addEventListener('click', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    try {
      await AuthApi.sendOtp({
        phone: pending.phone,
        purpose: pending.purpose || 'login',
        name: pending.name,
        email: pending.email,
      });
      sessionStorage.setItem('gigseva_otp_pending', JSON.stringify(pending));
      hintEl.textContent = 'OTP resent. Enter the new code sent to your phone.';
      inputs.forEach((el) => {
        el.value = '';
      });
      inputs[0]?.focus();
    } catch (err) {
      errorEl.textContent = err.message || 'Failed to resend OTP';
      errorEl.hidden = false;
    }
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    errorEl.textContent = '';

    const otp = getOtp();
    if (otp.length !== 6) {
      errorEl.textContent = 'Enter the 6-digit OTP';
      errorEl.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    const label = submitBtn.querySelector('span');
    const prev = label ? label.textContent : '';
    if (label) label.textContent = 'Verifying...';

    try {
      await AuthApi.verifyOtp({
        phone: pending.phone,
        otp,
        name: pending.name,
        email: pending.email,
      });
      sessionStorage.removeItem('gigseva_otp_pending');
      window.location.href = 'dashboard.html';
    } catch (err) {
      errorEl.textContent = err.message || 'Invalid OTP';
      errorEl.hidden = false;
      submitBtn.disabled = false;
      if (label) label.textContent = prev || 'Verify & Proceed';
    }
  });
});
