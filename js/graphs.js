const NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

function fmt(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

/* ── XP over time — line chart ────────────────────────────── */
export function renderXpOverTime(transactions, container) {
  container.innerHTML = '';

  // Sort and build cumulative series
  const sorted = [...transactions].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  if (!sorted.length) { container.textContent = 'No XP data'; return; }

  let cum = 0;
  const points = sorted.map(t => { cum += t.amount; return { date: new Date(t.createdAt), xp: cum }; });

  const W = 500, H = 220, PL = 52, PR = 16, PT = 16, PB = 40;
  const iW = W - PL - PR, iH = H - PT - PB;

  const minD = points[0].date.getTime();
  const maxD = points[points.length - 1].date.getTime();
  const maxXP = points[points.length - 1].xp;

  const xScale = d => (d.getTime() - minD) / (maxD - minD || 1) * iW + PL;
  const yScale = v => PT + iH - (v / maxXP) * iH;

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'XP over time' });

  // Gradient fill
  const defs = el('defs');
  const grad = el('linearGradient', { id: 'areaGrad', x1: '0', y1: '0', x2: '0', y2: '1' });
  const s1 = el('stop', { offset: '0%',   'stop-color': '#7c6af7', 'stop-opacity': '0.35' });
  const s2 = el('stop', { offset: '100%', 'stop-color': '#7c6af7', 'stop-opacity': '0.02' });
  grad.append(s1, s2);
  defs.append(grad);
  svg.append(defs);

  // Grid lines (5)
  for (let i = 0; i <= 4; i++) {
    const v = (maxXP / 4) * i;
    const y = yScale(v);
    svg.append(el('line', { class: 'graph-grid', x1: PL, y1: y, x2: W - PR, y2: y }));
    svg.append(Object.assign(document.createElementNS(NS, 'text'), {
      textContent: fmt(Math.round(v)),
    }));
    const lbl = el('text', { class: 'graph-label', x: PL - 5, y: y + 4, 'text-anchor': 'end' });
    lbl.textContent = fmt(Math.round(v));
    svg.append(lbl);
  }

  // X axis labels (up to 5)
  const ticks = Math.min(5, points.length);
  for (let i = 0; i < ticks; i++) {
    const pt = points[Math.round((i / (ticks - 1 || 1)) * (points.length - 1))];
    const x = xScale(pt.date);
    const lbl = el('text', { class: 'graph-label', x, y: H - 8, 'text-anchor': 'middle' });
    lbl.textContent = pt.date.toLocaleDateString('en', { month: 'short', year: '2-digit' });
    svg.append(lbl);
  }

  // Area path
  const areaD = [
    `M ${xScale(points[0].date)} ${yScale(0)}`,
    ...points.map(p => `L ${xScale(p.date)} ${yScale(p.xp)}`),
    `L ${xScale(points[points.length - 1].date)} ${yScale(0)}`,
    'Z',
  ].join(' ');
  svg.append(el('path', { class: 'graph-area', d: areaD }));

  // Line
  const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.date)} ${yScale(p.xp)}`).join(' ');
  svg.append(el('path', { class: 'graph-line', d: lineD }));

  // Dots (only last)
  const last = points[points.length - 1];
  svg.append(el('circle', { class: 'graph-dot', cx: xScale(last.date), cy: yScale(last.xp), r: 4 }));

  // Axes
  svg.append(el('line', { class: 'graph-axis', x1: PL, y1: PT, x2: PL, y2: PT + iH }));
  svg.append(el('line', { class: 'graph-axis', x1: PL, y1: PT + iH, x2: W - PR, y2: PT + iH }));

  container.append(svg);
}

/* ── Pass / Fail donut chart ───────────────────────────────── */
export function renderPassFail(results, container) {
  container.innerHTML = '';

  const projects = results.filter(r => r.object?.type === 'project');
  const pass = projects.filter(r => r.grade >= 1).length;
  const fail = projects.filter(r => r.grade < 1).length;
  const total = pass + fail;

  if (!total) { container.textContent = 'No project data'; return; }

  const W = 220, H = 220, cx = W / 2, cy = H / 2, R = 80, r = 50;

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Pass/Fail ratio' });

  function arc(startAngle, endAngle, color) {
    const toRad = a => (a - 90) * Math.PI / 180;
    const x1 = cx + R * Math.cos(toRad(startAngle));
    const y1 = cy + R * Math.sin(toRad(startAngle));
    const x2 = cx + R * Math.cos(toRad(endAngle));
    const y2 = cy + R * Math.sin(toRad(endAngle));
    const large = endAngle - startAngle > 180 ? 1 : 0;
    const xi1 = cx + r * Math.cos(toRad(endAngle));
    const yi1 = cy + r * Math.sin(toRad(endAngle));
    const xi2 = cx + r * Math.cos(toRad(startAngle));
    const yi2 = cy + r * Math.sin(toRad(startAngle));
    const d = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${xi1} ${yi1} A ${r} ${r} 0 ${large} 0 ${xi2} ${yi2} Z`;
    svg.append(el('path', { d, fill: color, opacity: '0.9' }));
  }

  const passAngle = (pass / total) * 360;
  arc(0, passAngle, '#4ade80');
  if (fail > 0) arc(passAngle, 360, '#f87171');

  // Center label
  const pct = el('text', { x: cx, y: cy - 4, 'text-anchor': 'middle', fill: '#e2e4f0', 'font-size': '22', 'font-weight': '700', 'font-family': 'system-ui' });
  pct.textContent = `${Math.round((pass / total) * 100)}%`;
  svg.append(pct);

  const sub = el('text', { x: cx, y: cy + 16, 'text-anchor': 'middle', fill: '#8b8fa8', 'font-size': '11', 'font-family': 'system-ui' });
  sub.textContent = 'pass rate';
  svg.append(sub);

  container.append(svg);

  // Legend
  const legend = document.createElement('div');
  legend.className = 'donut-legend';
  legend.innerHTML = `
    <span><span class="legend-dot" style="background:#4ade80"></span> Pass (${pass})</span>
    <span><span class="legend-dot" style="background:#f87171"></span> Fail (${fail})</span>
  `;
  container.append(legend);
}
