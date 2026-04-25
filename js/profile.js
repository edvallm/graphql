import { query } from './api.js';
import { renderXpOverTime, renderPassFail, renderSkillsRadar } from './graphs.js';

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

// Argument query — XP transactions for div-01 only, excluding piscine sub-exercises
const Q_XP = `{
  transaction(
    where: {
      type: { _eq: "xp" }
      _and: [
        { path: { _like: "/athens/div-01/%" } }
        { path: { _nlike: "/athens/div-01/piscine-%/%" } }
      ]
    }
    order_by: { createdAt: asc }
  ) {
    amount
    createdAt
    object {
      name
    }
  }
}`;

// Nested query — results with nested object info
const Q_RESULTS = `{
  result {
    grade
    object {
      name
      type
    }
  }
}`;

// Argument query — skill transactions
const Q_SKILLS = `{
  transaction(
    where: { type: { _like: "skill_%" } }
    order_by: { amount: desc }
  ) {
    type
    amount
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

function processSkills(transactions) {
  const map = new Map();
  for (const t of transactions) {
    if (!map.has(t.type) || map.get(t.type) < t.amount) {
      map.set(t.type, t.amount);
    }
  }
  return Array.from(map.entries())
    .map(([type, amount]) => ({
      name: type.replace('skill_', '').replace(/-/g, ' '),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 12);
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
    infoItem('Total XP',      fmt(total),              'accent'),
    infoItem('Transactions',  transactions.length,     'accent2'),
  ].join('');
}

function renderRecentActivity(transactions) {
  const el = document.getElementById('recent-activity');
  const recent = [...transactions].reverse().slice(0, 5);
  el.innerHTML = `<div class="activity-list">${
    recent.map(t => `
      <div class="activity-item">
        <span class="activity-name">${t.object?.name ?? 'Unknown'}</span>
        <span class="activity-xp">+${fmt(t.amount)}</span>
        <span class="activity-date">${new Date(t.createdAt).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
      </div>
    `).join('')
  }</div>`;
}

function renderAudit(users) {
  const u = users[0] ?? {};
  const ratio = typeof u.auditRatio === 'number' ? u.auditRatio.toFixed(2) : '—';
  const el = document.getElementById('audit-info');
  el.innerHTML = [
    infoItem('Audit Ratio',      ratio,                 ratio >= 1 ? 'pass' : 'accent'),
    infoItem('Done (up)',        fmt(u.totalUp   ?? 0), 'pass'),
    infoItem('Received (down)',  fmt(u.totalDown ?? 0)),
  ].join('');
}

/* ── Main load ────────────────────────────────────────────── */

export async function loadProfile() {
  const [userData, auditData, xpData, resultData, skillData] = await Promise.all([
    query(Q_USER),
    query(Q_AUDIT),
    query(Q_XP),
    query(Q_RESULTS),
    query(Q_SKILLS),
  ]);

  renderUser(userData.user ?? []);
  renderXp(xpData.transaction ?? []);
  renderRecentActivity(xpData.transaction ?? []);
  renderAudit(auditData.user ?? []);

  renderXpOverTime(xpData.transaction ?? [],   document.getElementById('graph-xp-time'));
  renderPassFail(resultData.result ?? [],       document.getElementById('graph-pass-fail'));
  renderSkillsRadar(processSkills(skillData.transaction ?? []), document.getElementById('graph-skills'));
}
