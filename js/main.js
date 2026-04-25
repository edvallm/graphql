import { login, logout, getToken } from './auth.js';
import { loadProfile } from './profile.js';

const viewLogin   = document.getElementById('view-login');
const viewProfile = document.getElementById('view-profile');
const loginForm   = document.getElementById('login-form');
const loginError  = document.getElementById('login-error');
const loginBtn    = document.getElementById('login-btn');
const logoutBtn   = document.getElementById('logout-btn');

function showLogin() {
  viewLogin.classList.remove('hidden');
  viewProfile.classList.add('hidden');
}

function showProfile() {
  viewLogin.classList.add('hidden');
  viewProfile.classList.remove('hidden');
  loadProfile().catch(err => {
    console.error('Profile load error:', err);
  });
}

function showError(msg) {
  loginError.textContent = msg;
  loginError.classList.remove('hidden');
}

function clearError() {
  loginError.textContent = '';
  loginError.classList.add('hidden');
}

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  clearError();

  const credential = document.getElementById('credential').value.trim();
  const password   = document.getElementById('password').value;

  if (!credential || !password) {
    showError('Please enter your username/email and password.');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in…';

  try {
    await login(credential, password);
    showProfile();
  } catch (err) {
    showError(err.message || 'Login failed. Please try again.');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign in';
  }
});

logoutBtn.addEventListener('click', () => {
  logout();
  showLogin();
});

// On page load: resume session if JWT exists
if (getToken()) {
  showProfile();
} else {
  showLogin();
}
