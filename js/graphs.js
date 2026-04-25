const NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + ' MB';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + ' kB';
  return String(n);
}

/* ── Shared tooltip ─────────────────────────────────────────── */
const tip = document.getElementById('graph-tooltip');

function showTip(e, html) {
  tip.innerHTML = html;
  tip.classList.add('visible');
  moveTip(e);
}
function moveTip(e) {
  tip.style.left = (e.clientX + 14) + 'px';
  tip.style.top  = (e.clientY - 42) + 'px';
}
function hideTip() {
  tip.classList.remove('visible');
}

/* ── XP over time — line chart ──────────────────────────────── */
export function renderXpOverTime(transactions, container) {
  container.innerHTML = '';

  const sorted = [...transactions].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  if (!sorted.length) { container.textContent = 'No XP data'; return; }

  let cum = 0;
  const points = sorted.map(t => {
    cum += t.amount;
    return { date: new Date(t.createdAt), xp: cum, name: t.object?.name ?? '', amount: t.amount };
  });

  const W = 500, H = 220, PL = 52, PR = 16, PT = 16, PB = 40;
  const iW = W - PL - PR, iH = H - PT - PB;

  const minD  = points[0].date.getTime();
  const maxD  = points[points.length - 1].date.getTime();
  const maxXP = points[points.length - 1].xp;

  const xScale = d => (d.getTime() - minD) / (maxD - minD || 1) * iW + PL;
  const yScale = v => PT + iH - (v / maxXP) * iH;

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'XP over time' });

  // Gradient
  const defs = el('defs');
  const grad = el('linearGradient', { id: 'areaGrad', x1: '0', y1: '0', x2: '0', y2: '1' });
  grad.append(
    el('stop', { offset: '0%',   'stop-color': '#7c6af7', 'stop-opacity': '0.35' }),
    el('stop', { offset: '100%', 'stop-color': '#7c6af7', 'stop-opacity': '0.02' }),
  );
  defs.append(grad);
  svg.append(defs);

  // Grid + Y labels
  for (let i = 0; i <= 4; i++) {
    const v = (maxXP / 4) * i;
    const y = yScale(v);
    svg.append(el('line', { class: 'graph-grid', x1: PL, y1: y, x2: W - PR, y2: y }));
    const lbl = el('text', { class: 'graph-label', x: PL - 5, y: y + 4, 'text-anchor': 'end' });
    lbl.textContent = fmt(Math.round(v));
    svg.append(lbl);
  }

  // X labels
  const ticks = Math.min(5, points.length);
  for (let i = 0; i < ticks; i++) {
    const pt = points[Math.round((i / (ticks - 1 || 1)) * (points.length - 1))];
    const lbl = el('text', { class: 'graph-label', x: xScale(pt.date), y: H - 8, 'text-anchor': 'middle' });
    lbl.textContent = pt.date.toLocaleDateString('en', { month: 'short', year: '2-digit' });
    svg.append(lbl);
  }

  // Area + line
  const areaD = [
    `M ${xScale(points[0].date)} ${yScale(0)}`,
    ...points.map(p => `L ${xScale(p.date)} ${yScale(p.xp)}`),
    `L ${xScale(points[points.length - 1].date)} ${yScale(0)} Z`,
  ].join(' ');
  svg.append(el('path', { class: 'graph-area', d: areaD }));

  const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.date)} ${yScale(p.xp)}`).join(' ');
  svg.append(el('path', { class: 'graph-line', d: lineD }));

  // Vertical guide line (hidden by default)
  const guide = el('line', {
    x1: 0, y1: PT, x2: 0, y2: PT + iH,
    stroke: '#7c6af7', 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0,
  });
  svg.append(guide);

  // Hover dot
  const hoverDot = el('circle', { r: 5, fill: '#7c6af7', stroke: '#0f1117', 'stroke-width': 2, opacity: 0 });
  svg.append(hoverDot);

  // Invisible overlay for hover detection
  const overlay = el('rect', {
    x: PL, y: PT, width: iW, height: iH,
    fill: 'transparent', style: 'cursor: crosshair',
  });
  overlay.addEventListener('mousemove', e => {
    const rect = svg.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const nearest = points.reduce((best, p) => {
      return Math.abs(xScale(p.date) - mx) < Math.abs(xScale(best.date) - mx) ? p : best;
    });
    const x = xScale(nearest.date), y = yScale(nearest.xp);
    guide.setAttribute('x1', x); guide.setAttribute('x2', x); guide.setAttribute('opacity', 0.6);
    hoverDot.setAttribute('cx', x); hoverDot.setAttribute('cy', y); hoverDot.setAttribute('opacity', 1);
    showTip(e,
      `<b>${nearest.name || 'XP'}</b><br>` +
      `+${fmt(nearest.amount)}<br>` +
      `Total: ${fmt(nearest.xp)}<br>` +
      nearest.date.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })
    );
  });
  overlay.addEventListener('mouseleave', () => {
    guide.setAttribute('opacity', 0);
    hoverDot.setAttribute('opacity', 0);
    hideTip();
  });
  svg.append(overlay);

  // Axes
  svg.append(el('line', { class: 'graph-axis', x1: PL, y1: PT, x2: PL, y2: PT + iH }));
  svg.append(el('line', { class: 'graph-axis', x1: PL, y1: PT + iH, x2: W - PR, y2: PT + iH }));

  container.append(svg);
}

/* ── Pass / Fail donut chart ────────────────────────────────── */
export function renderPassFail(results, container) {
  container.innerHTML = '';

  const projects = results.filter(r => r.object?.type === 'project');
  const pass = projects.filter(r => r.grade >= 1).length;
  const fail = projects.filter(r => r.grade <  1).length;
  const total = pass + fail;

  if (!total) { container.textContent = 'No project data'; return; }

  const W = 220, H = 220, cx = W / 2, cy = H / 2, R = 80, ri = 50;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Pass/Fail ratio' });

  function arc(startDeg, endDeg, color, label, count) {
    const toRad = a => (a - 90) * Math.PI / 180;
    const x1 = cx + R * Math.cos(toRad(startDeg)), y1 = cy + R * Math.sin(toRad(startDeg));
    const x2 = cx + R * Math.cos(toRad(endDeg)),   y2 = cy + R * Math.sin(toRad(endDeg));
    const xi1 = cx + ri * Math.cos(toRad(endDeg)),  yi1 = cy + ri * Math.sin(toRad(endDeg));
    const xi2 = cx + ri * Math.cos(toRad(startDeg)),yi2 = cy + ri * Math.sin(toRad(startDeg));
    const large = endDeg - startDeg > 180 ? 1 : 0;
    const d = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${xi1} ${yi1} A ${ri} ${ri} 0 ${large} 0 ${xi2} ${yi2} Z`;
    const path = el('path', { d, fill: color, opacity: '0.9', style: 'cursor:pointer; transition: opacity .15s' });
    path.addEventListener('mouseenter', e => {
      path.setAttribute('opacity', '1');
      showTip(e, `<b>${label}</b><br>${count} project${count !== 1 ? 's' : ''}<br>${Math.round((count / total) * 100)}%`);
    });
    path.addEventListener('mousemove', moveTip);
    path.addEventListener('mouseleave', () => { path.setAttribute('opacity', '0.9'); hideTip(); });
    svg.append(path);
  }

  const passAngle = (pass / total) * 360;
  arc(0, passAngle, '#4ade80', 'Passed', pass);
  if (fail > 0) arc(passAngle, 360, '#f87171', 'Failed', fail);

  const pct = el('text', { x: cx, y: cy - 4, 'text-anchor': 'middle', fill: '#e2e4f0', 'font-size': '22', 'font-weight': '700', 'font-family': 'system-ui' });
  pct.textContent = `${Math.round((pass / total) * 100)}%`;
  svg.append(pct);

  const sub = el('text', { x: cx, y: cy + 16, 'text-anchor': 'middle', fill: '#8b8fa8', 'font-size': '11', 'font-family': 'system-ui' });
  sub.textContent = 'pass rate';
  svg.append(sub);

  container.append(svg);

  const legend = document.createElement('div');
  legend.className = 'donut-legend';
  legend.innerHTML = `
    <span><span class="legend-dot" style="background:#4ade80"></span> Pass (${pass})</span>
    <span><span class="legend-dot" style="background:#f87171"></span> Fail (${fail})</span>
  `;
  container.append(legend);
}

/* ── Skills radar chart ─────────────────────────────────────── */
export function renderSkillsRadar(skills, container) {
  container.innerHTML = '';
  if (!skills.length) { container.textContent = 'No skill data'; return; }

  const W = 420, H = 420, cx = W / 2, cy = H / 2, maxR = 140;
  const N = skills.length;

  function polar(i, r) {
    const angle = (i / N) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Skills radar' });

  // Concentric grid rings
  [0.25, 0.5, 0.75, 1].forEach(t => {
    const pts = Array.from({ length: N }, (_, i) => { const p = polar(i, t * maxR); return `${p.x},${p.y}`; }).join(' ');
    svg.append(el('polygon', { points: pts, fill: 'none', stroke: '#2e3149', 'stroke-width': 1 }));
  });

  // % labels on first axis
  [25, 50, 75, 100].forEach(pct => {
    const p = polar(0, (pct / 100) * maxR);
    const lbl = el('text', { x: p.x + 4, y: p.y, fill: '#8b8fa8', 'font-size': '9', 'font-family': 'system-ui' });
    lbl.textContent = pct + '%';
    svg.append(lbl);
  });

  // Axis spokes
  Array.from({ length: N }, (_, i) => {
    const p = polar(i, maxR);
    svg.append(el('line', { x1: cx, y1: cy, x2: p.x, y2: p.y, stroke: '#2e3149', 'stroke-width': 1 }));
  });

  // Data polygon
  const dataPts = skills.map((s, i) => { const p = polar(i, (s.amount / 100) * maxR); return `${p.x},${p.y}`; }).join(' ');
  svg.append(el('polygon', { points: dataPts, fill: 'rgba(124,106,247,0.18)', stroke: '#7c6af7', 'stroke-width': 2 }));

  // Dots + labels
  skills.forEach((s, i) => {
    const dp  = polar(i, (s.amount / 100) * maxR);
    const lp  = polar(i, maxR + 24);

    const dot = el('circle', { cx: dp.x, cy: dp.y, r: 4, fill: '#7c6af7', style: 'cursor:pointer; transition: r .1s' });
    dot.addEventListener('mouseenter', e => {
      dot.setAttribute('r', 7);
      showTip(e, `<b>${s.name}</b><br>${s.amount}%`);
    });
    dot.addEventListener('mousemove', moveTip);
    dot.addEventListener('mouseleave', () => { dot.setAttribute('r', 4); hideTip(); });
    svg.append(dot);

    // Axis label — adjust anchor based on position
    const angle = (i / N) * 2 * Math.PI - Math.PI / 2;
    const anchor = Math.abs(Math.cos(angle)) < 0.1 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end';
    const lbl = el('text', { x: lp.x, y: lp.y + 4, 'text-anchor': anchor, fill: '#8b8fa8', 'font-size': '11', 'font-family': 'system-ui' });
    lbl.textContent = s.name;
    svg.append(lbl);
  });

  container.append(svg);
}
