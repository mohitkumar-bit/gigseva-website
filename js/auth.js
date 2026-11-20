/** Shared API client — same backend as the gigSEVA app */
const API_BASE = 'https://api.gigseva.com/api';

const AUTH_KEYS = {
  access: 'gigseva_access_token',
  refresh: 'gigseva_refresh_token',
  user: 'gigseva_user',
};

const AuthStore = {
  getAccessToken() {
    return localStorage.getItem(AUTH_KEYS.access);
  },
  getRefreshToken() {
    return localStorage.getItem(AUTH_KEYS.refresh);
  },
  getUser() {
    try {
      const raw = localStorage.getItem(AUTH_KEYS.user);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setSession({ accessToken, refreshToken, user }) {
    if (accessToken) localStorage.setItem(AUTH_KEYS.access, accessToken);
    if (refreshToken) localStorage.setItem(AUTH_KEYS.refresh, refreshToken);
    if (user) localStorage.setItem(AUTH_KEYS.user, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(AUTH_KEYS.access);
    localStorage.removeItem(AUTH_KEYS.refresh);
    localStorage.removeItem(AUTH_KEYS.user);
  },
  isLoggedIn() {
    return Boolean(this.getAccessToken() && this.getUser());
  },
};

async function apiRequest(path, { method = 'GET', body, auth = false } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  };

  if (auth) {
    const token = AuthStore.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const err = new Error(data?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

const AuthApi = {
  async login({ email, password }) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    AuthStore.setSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    });
    return data.user;
  },

  async register({ name, email, phone, password }) {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: { name, email, phone, password },
    });
    AuthStore.setSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    });
    return data.user;
  },

  async sendOtp({ phone, purpose = 'login', name, email }) {
    return apiRequest('/auth/otp/send', {
      method: 'POST',
      body: { phone, purpose, name, email },
    });
  },

  async verifyOtp({ phone, otp, name, email }) {
    const data = await apiRequest('/auth/otp/verify', {
      method: 'POST',
      body: { phone, otp, name, email },
    });
    AuthStore.setSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    });
    return data.user;
  },

  async getProfile() {
    const data = await apiRequest('/auth/me', { auth: true });
    if (data?.user) {
      AuthStore.setSession({ user: data.user });
    }
    return data.user;
  },

  async getQuota() {
    const data = await apiRequest('/job/quota', { auth: true });
    return data;
  },

  async getCategories() {
    return apiRequest('/category', { auth: false });
  },

  async uploadJobImage(file) {
    const formData = new FormData();
    formData.append('image', file, file.name || 'banner.jpg');

    const headers = { 'ngrok-skip-browser-warning': 'true' };
    const token = AuthStore.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/job/upload-image`, {
      method: 'POST',
      headers,
      body: formData,
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      throw new Error(data?.message || 'Failed to upload image');
    }
    return data.imageUrl;
  },

  async uploadJobVideo(file, durationSeconds) {
    const formData = new FormData();
    formData.append('video', file, file.name || 'video.mp4');
    if (durationSeconds != null) {
      formData.append('durationSeconds', String(durationSeconds));
    }

    const headers = { 'ngrok-skip-browser-warning': 'true' };
    const token = AuthStore.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/job/upload-video`, {
      method: 'POST',
      headers,
      body: formData,
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const fallback =
        res.status === 413 ? 'Video must be 25 MB or less' : 'Failed to upload video';
      throw new Error(data?.message || fallback);
    }
    return data.videoUrl;
  },

  async createVideoPost(body) {
    return apiRequest('/job/video', {
      method: 'POST',
      body,
      auth: true,
    });
  },

  async createBannerPost(body) {
    return apiRequest('/job/banner', {
      method: 'POST',
      body,
      auth: true,
    });
  },

  async createPlanOrder(plan) {
    return apiRequest('/subscription/create-order', {
      method: 'POST',
      body: { plan },
      auth: true,
    });
  },

  async createCreditOrder(kind) {
    return apiRequest('/subscription/create-credit-order', {
      method: 'POST',
      body: { kind },
      auth: true,
    });
  },

  async verifyOrder(payload) {
    return apiRequest('/subscription/verify-order', {
      method: 'POST',
      body: payload,
      auth: true,
    });
  },

  async getVerificationEligibility() {
    return apiRequest('/verification/eligibility', { auth: true });
  },

  async sendAadhaarOtp(aadhaarNumber) {
    return apiRequest('/verification/aadhaar/send-otp', {
      method: 'POST',
      body: { aadhaar_number: aadhaarNumber },
      auth: true,
    });
  },

  async verifyAadhaarAndSubmit({ aadhaar_number, otp }) {
    return apiRequest('/verification/aadhaar/verify', {
      method: 'POST',
      body: { aadhaar_number, otp },
      auth: true,
    });
  },

  async createAddonOrder(kind) {
    return apiRequest('/job/addon-order', {
      method: 'POST',
      body: { kind },
      auth: true,
    });
  },

  loadRazorpayScript() {
    if (window.Razorpay) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-razorpay]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay')));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.dataset.razorpay = '1';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay'));
      document.head.appendChild(script);
    });
  },

  async openRazorpayCheckout(order) {
    if (!order?.razorpayOrderId || !order?.keyId) {
      throw new Error('Invalid payment order from server');
    }

    await this.loadRazorpayScript();
    const user = AuthStore.getUser() || {};

    return new Promise((resolve, reject) => {
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency || 'INR',
        name: 'gigSEVA',
        description: order.description || 'Payment',
        order_id: order.razorpayOrderId,
        prefill: {
          name: user.name || '',
          email: user.email || '',
          contact: user.phone || '',
        },
        theme: { color: '#00A300' },
        handler: async (response) => {
          try {
            const result = await AuthApi.verifyOrder({
              merchantOrderId: order.merchantOrderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            resolve(result);
          } catch (err) {
            reject(err);
          }
        },
        modal: {
          ondismiss() {
            reject(new Error('Payment cancelled'));
          },
        },
      });
      rzp.on('payment.failed', (response) => {
        reject(new Error(response?.error?.description || 'Payment failed'));
      });
      rzp.open();
    });
  },

  async uploadProfilePicture(file) {
    const formData = new FormData();
    formData.append('image', file, file.name || 'profile.jpg');

    const headers = {
      'ngrok-skip-browser-warning': 'true',
    };
    const token = AuthStore.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/auth/upload-profile-picture`, {
      method: 'POST',
      headers,
      body: formData,
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      throw new Error(data?.message || 'Failed to upload profile picture');
    }

    if (data?.user) {
      AuthStore.setSession({ user: data.user });
    }
    return data.user;
  },

  async removeProfilePicture() {
    const data = await apiRequest('/auth/profile-picture', {
      method: 'DELETE',
      auth: true,
    });
    if (data?.user) {
      AuthStore.setSession({ user: data.user });
    }
    return data.user;
  },

  async logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST', auth: true });
    } catch {
      // still clear local session
    } finally {
      AuthStore.clear();
    }
  },
};

function getPasswordChecks(password) {
  const hasMinLength = password.length >= 6;
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  return {
    hasMinLength,
    hasLowercase,
    hasUppercase,
    hasNumber,
    hasSymbol,
    isValid: hasMinLength && hasLowercase && hasUppercase && hasNumber && hasSymbol,
  };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderAuthNav() {
  // TEMP DISABLED: no Login button or account menu in the header. Delete this block to restore.
  document.querySelectorAll('#navAuthDesktop, #navAuthMobile').forEach((el) => {
    el.innerHTML = '';
  });
  return;
  // eslint-disable-next-line no-unreachable

  const user = AuthStore.getUser();
  const desktop = document.getElementById('navAuthDesktop');
  const mobile = document.getElementById('navAuthMobile');

  const loggedOutHtml = `
    <a href="login.html" class="btn btn-outline">
      <i class="fa-solid fa-user"></i>
      Login
    </a>
  `;

  if (!user) {
    if (desktop) desktop.innerHTML = loggedOutHtml;
    if (mobile) mobile.innerHTML = loggedOutHtml;
    return;
  }

  const name = escapeHtml(user.name || 'User');
  const first = escapeHtml((user.name || 'U').charAt(0).toUpperCase());
  const photo = user.profilePicture
    ? `<img src="${escapeHtml(user.profilePicture)}" alt="" class="nav-user-avatar-img">`
    : first;

  const profileMenu = `
    <div class="nav-profile" data-profile-menu>
      <button type="button" class="nav-user nav-profile-trigger" aria-haspopup="true" aria-expanded="false">
        <div class="nav-user-avatar" aria-hidden="true">${photo}</div>
        <div class="nav-user-meta">
          <span class="nav-user-label">Hi,</span>
          <strong class="nav-user-name">${name}</strong>
        </div>
        <i class="fa-solid fa-chevron-down nav-profile-caret" aria-hidden="true"></i>
      </button>
      <div class="nav-profile-dropdown" hidden>
        <a href="dashboard.html" class="nav-profile-item">
          <i class="fa-solid fa-table-columns"></i>
          Dashboard
        </a>
        <a href="index.html#contact" class="nav-profile-item">
          <i class="fa-solid fa-envelope"></i>
          Contact
        </a>
        <button type="button" class="nav-profile-item nav-profile-logout" data-logout>
          <i class="fa-solid fa-right-from-bracket"></i>
          Logout
        </button>
      </div>
    </div>
  `;

  if (desktop) {
    desktop.innerHTML = profileMenu;
  }

  if (mobile) {
    mobile.innerHTML = profileMenu;
  }

  bindProfileMenus();
}

function bindProfileMenus() {
  document.querySelectorAll('[data-profile-menu]').forEach((wrap) => {
    const trigger = wrap.querySelector('.nav-profile-trigger');
    const dropdown = wrap.querySelector('.nav-profile-dropdown');
    if (!trigger || !dropdown) return;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = dropdown.hasAttribute('hidden');
      closeAllProfileMenus();
      if (willOpen) {
        dropdown.removeAttribute('hidden');
        wrap.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });

  document.querySelectorAll('[data-logout]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.disabled = true;
      await AuthApi.logout();
      window.location.href = 'login.html';
    });
  });

  if (!window.__gigsevaProfileMenuBound) {
    window.__gigsevaProfileMenuBound = true;
    document.addEventListener('click', () => closeAllProfileMenus());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAllProfileMenus();
    });
  }
}

function closeAllProfileMenus() {
  document.querySelectorAll('[data-profile-menu]').forEach((wrap) => {
    const trigger = wrap.querySelector('.nav-profile-trigger');
    const dropdown = wrap.querySelector('.nav-profile-dropdown');
    wrap.classList.remove('open');
    if (dropdown) dropdown.setAttribute('hidden', '');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  });
}

window.AuthStore = AuthStore;
window.AuthApi = AuthApi;
window.getPasswordChecks = getPasswordChecks;
window.renderAuthNav = renderAuthNav;
window.escapeHtml = escapeHtml;
window.closeAllProfileMenus = closeAllProfileMenus;

