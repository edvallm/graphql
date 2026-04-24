import { query } from './api.js';
import { renderXpOverTime, renderPassFail } from './graphs.js';

/* ── Queries ──────────────────────────────────────────────── */

// Normal query — basic user fields
const Q_USER = `{
  user {
    id
    login
    email
    firstName
    lastName
    campus
  }
}`;

// Normal query — audit stats from user table
const Q_AUDIT = `{
  user {
    totalUp
    totalDown
    auditRatio
  }
}`;

// Argument query — only XP transactions, with nested object name
const Q_XP = `{
  transaction(
    where: { type: { _eq: "xp" } }
    order_by: { createdAt: asc }
  ) {
    amount
    createdAt
    object {
      name
    }
  }
}`;

// Nested query — results with nested user and object info
const Q_RESULTS = `{
  result {
    grade
    object {
      name
      type
    }
  }
}`;

/* ── Helpers ──────────────────────────────────────────────── */

function infoItem(label, value, cls = '') {
  return `<div class="info-item">
    <div class="label">${label}</div>
    <div class="value ${cls}">${value}</div>
  </div>`;
}

function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + ' MB';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + ' kB';
  return String(n);
}

/* ── Render functions ─────────────────────────────────────── */

function renderUser(users) {
  const u = users[0] ?? {};
  const el = document.getElementById('user-info');
  el.innerHTML = [
    infoItem('Login',    u.login    ?? '—'),
    infoItem('Name',     `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '—'),
    infoItem('Email',    u.email    ?? '—'),
    infoItem('Campus',   u.campus   ?? '—'),
    infoItem('User ID',  u.id       ?? '—'),
  ].join('');
}

function renderXp(transactions) {
  const total = transactions.reduce((s, t) => s + t.amount, 0);
  const el = document.getElementById('xp-info');
  el.innerHTML = [
    infoItem('Total XP', fmt(total), 'accent'),
    infoItem('Transactions', transactions.length, 'accent2'),
  ].join('');
}

function renderAudit(users) {
  const u = users[0] ?? {};
  const ratio = typeof u.auditRatio === 'number' ? u.auditRatio.toFixed(2) : '—';
  const el = document.getElementById('audit-info');
  el.innerHTML = [
    infoItem('Audit Ratio', ratio, ratio >= 1 ? 'pass' : 'accent'),
    infoItem('Done (up)',   fmt(u.totalUp   ?? 0), 'pass'),
    infoItem('Received (down)', fmt(u.totalDown ?? 0)),
  ].join('');
}

/* ── Main load ────────────────────────────────────────────── */

export async function loadProfile() {
  const [userData, auditData, xpData, resultData] = await Promise.all([
    query(Q_USER),
    query(Q_AUDIT),
    query(Q_XP),
    query(Q_RESULTS),
  ]);

  renderUser(userData.user ?? []);
  renderXp(xpData.transaction ?? []);
  renderAudit(auditData.user ?? []);

  renderXpOverTime(xpData.transaction ?? [], document.getElementById('graph-xp-time'));
  renderPassFail(resultData.result ?? [], document.getElementById('graph-pass-fail'));
}
