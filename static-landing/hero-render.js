/* ──────────────────────────────────────────────────────────
   Hero render — faithful to the actual GhostLine instrument.
   Reference: real "Chicken" generation render.
   - Dense, overlapping per-state clusters (no separation)
   - Bright glowing halos around small saturated cores
   - Saturated cyan attention web threading everything
   - Periphery triangle markers (out-of-frame token glyphs)
   - Sparse star background
   - Faint central selected-token glow
   - Continuous slow 3D rotation
   ────────────────────────────────────────────────────────── */
(function () {
  const svg = document.getElementById('heroSvg');
  if (!svg) return;

  // Canonical redesign palette — matches data/statePalettes.ts in the live
  // research frontend. Keeps the hero consistent with the demo viewer's
  // state coloring. (Earlier draft used a saturated alt palette where
  // precision was green and creativity magenta — corrected Apr 27.)
  const STATE_COLORS = {
    reasoning:   '#4dd9ff',  // cyan
    retrieval:   '#5cf2a8',  // green
    creativity:  '#b466ff',  // purple
    precision:   '#ffd24d',  // yellow
    uncertainty: '#ff9c52',  // orange
    selected:    '#a855f7',  // purple selected glow (kept — distinct from creativity for a reason)
  };

  // ─── Cluster centers — distinct positions, moderate overlap
  const CLUSTERS = [
    { state: 'precision',   center: [  20, -110,   40], spread: 28, count: 26 },
    { state: 'retrieval',   center: [  10,   30,  -10], spread: 34, count: 36 },
    { state: 'creativity',  center: [ -70,   80,  -40], spread: 26, count: 22 },
    { state: 'reasoning',   center: [ 100,   10,   60], spread: 24, count: 16 },
    { state: 'uncertainty', center: [-100,  -30,   20], spread: 22, count: 8  },
  ];

  // Deterministic PRNG
  let seed = 0xC0FFEE;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed >>> 8) / 0x01000000; };
  const gauss = () => {
    const u = Math.max(rand(), 1e-9), v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  // Token nodes
  const points = [];
  CLUSTERS.forEach((c, ci) => {
    for (let i = 0; i < c.count; i++) {
      points.push({
        x: c.center[0] + gauss() * c.spread,
        y: c.center[1] + gauss() * c.spread * 0.85,
        z: c.center[2] + gauss() * c.spread,
        state: c.state,
        cluster: ci,
        size: 0.7 + rand() * 0.7,  // size variation
        i: points.length,
      });
    }
  });

  // ─── Trajectory thread (sequential, weaving through clusters)
  const visitOrder = [1, 2, 1, 0, 1, 3, 2, 1, 4, 1, 2, 1, 0, 1, 3, 2, 1];
  const clusterTokens = CLUSTERS.map((_, ci) => points.filter(p => p.cluster === ci));
  const cursor = CLUSTERS.map(() => 0);
  const trajectory = [];
  let safety = 0;
  while (trajectory.length < points.length && safety++ < 800) {
    const ci = visitOrder[trajectory.length % visitOrder.length];
    if (cursor[ci] < clusterTokens[ci].length) {
      trajectory.push(clusterTokens[ci][cursor[ci]++]);
    } else {
      const next = clusterTokens.findIndex((arr, i) => cursor[i] < arr.length);
      if (next === -1) break;
      trajectory.push(clusterTokens[next][cursor[next]++]);
    }
  }

  // ─── Dense attention web — colored by endpoint state
  const arcs = [];
  for (let k = 0; k < 130; k++) {
    const a = Math.floor(rand() * trajectory.length);
    let b = Math.floor(rand() * trajectory.length);
    if (Math.abs(a - b) < 2) b = (b + 5 + Math.floor(rand() * 20)) % trajectory.length;
    arcs.push([trajectory[a].i, trajectory[b].i]);
  }

  // ─── Periphery triangle glyphs (out-of-frame token markers)
  const triangles = [];
  for (let k = 0; k < 7; k++) {
    const angle = (k / 7) * Math.PI * 2 + rand() * 0.4;
    const radius = 195 + rand() * 18;
    triangles.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.85,
    });
  }

  // ─── Background star dots (static, no rotation)
  const stars = [];
  for (let k = 0; k < 24; k++) {
    stars.push({
      x: (rand() - 0.5) * 440,
      y: (rand() - 0.5) * 440,
      r: 0.4 + rand() * 0.6,
      o: 0.15 + rand() * 0.4,
    });
  }

  // ─── Build SVG ───────────────────────────────────────
  const SVGNS = 'http://www.w3.org/2000/svg';
  svg.innerHTML = '';

  // Defs — radial gradients for halos + central selected-token glow
  const defs = document.createElementNS(SVGNS, 'defs');
  Object.entries(STATE_COLORS).forEach(([name, color]) => {
    const grad = document.createElementNS(SVGNS, 'radialGradient');
    grad.setAttribute('id', `halo-${name}`);
    grad.innerHTML = `
      <stop offset="0%" stop-color="${color}" stop-opacity="0.7"/>
      <stop offset="35%" stop-color="${color}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    `;
    defs.appendChild(grad);
  });
  // Bigger central glow gradient
  const centerGlow = document.createElementNS(SVGNS, 'radialGradient');
  centerGlow.setAttribute('id', 'center-glow');
  centerGlow.innerHTML = `
    <stop offset="0%" stop-color="#a855f7" stop-opacity="0.45"/>
    <stop offset="50%" stop-color="#5b3aa8" stop-opacity="0.12"/>
    <stop offset="100%" stop-color="#a855f7" stop-opacity="0"/>
  `;
  defs.appendChild(centerGlow);
  svg.appendChild(defs);

  // 1. Stars (static background)
  const starGroup = document.createElementNS(SVGNS, 'g');
  stars.forEach(s => {
    const c = document.createElementNS(SVGNS, 'circle');
    c.setAttribute('cx', s.x);
    c.setAttribute('cy', s.y);
    c.setAttribute('r', s.r);
    c.setAttribute('fill', '#ffffff');
    c.setAttribute('opacity', s.o);
    starGroup.appendChild(c);
  });
  svg.appendChild(starGroup);

  // 2. Periphery triangles (static, very faint)
  const triGroup = document.createElementNS(SVGNS, 'g');
  triGroup.setAttribute('opacity', '0.4');
  triangles.forEach(t => {
    const tri = document.createElementNS(SVGNS, 'polygon');
    const s = 4;
    tri.setAttribute('points', `${t.x},${t.y - s} ${t.x - s * 0.87},${t.y + s * 0.5} ${t.x + s * 0.87},${t.y + s * 0.5}`);
    tri.setAttribute('fill', 'none');
    tri.setAttribute('stroke', '#4dd9ff');
    tri.setAttribute('stroke-width', '0.6');
    triGroup.appendChild(tri);
  });
  svg.appendChild(triGroup);

  // 3. Central selected-token glow (rotates with scene center)
  const centerGlowEl = document.createElementNS(SVGNS, 'circle');
  centerGlowEl.setAttribute('fill', 'url(#center-glow)');
  centerGlowEl.setAttribute('r', '70');
  svg.appendChild(centerGlowEl);

  // 4. Attention web — each line colored by its endpoint token's state
  const arcGroup = document.createElementNS(SVGNS, 'g');
  const arcEls = arcs.map(([from, to]) => {
    const line = document.createElementNS(SVGNS, 'line');
    line.setAttribute('stroke', STATE_COLORS[points[to].state]);
    line.setAttribute('stroke-width', '0.5');
    line.dataset.from = from;
    line.dataset.to = to;
    arcGroup.appendChild(line);
    return line;
  });
  svg.appendChild(arcGroup);

  // 5. Sequential trajectory — each segment colored by its endpoint state
  const trajGroup = document.createElementNS(SVGNS, 'g');
  const trajEls = [];
  for (let i = 0; i < trajectory.length - 1; i++) {
    const seg = document.createElementNS(SVGNS, 'line');
    seg.setAttribute('stroke', STATE_COLORS[trajectory[i + 1].state]);
    seg.setAttribute('stroke-width', '0.75');
    seg.setAttribute('stroke-linecap', 'round');
    seg.dataset.from = trajectory[i].i;
    seg.dataset.to = trajectory[i + 1].i;
    trajGroup.appendChild(seg);
    trajEls.push(seg);
  }
  svg.appendChild(trajGroup);

  // 6. Halos (large soft glow per token)
  const haloGroup = document.createElementNS(SVGNS, 'g');
  const haloEls = points.map(p => {
    const h = document.createElementNS(SVGNS, 'circle');
    h.setAttribute('fill', `url(#halo-${p.state})`);
    h.dataset.idx = p.i;
    haloGroup.appendChild(h);
    return h;
  });
  svg.appendChild(haloGroup);

  // 7. Bright cores
  const coreGroup = document.createElementNS(SVGNS, 'g');
  const coreEls = points.map(p => {
    const c = document.createElementNS(SVGNS, 'circle');
    c.setAttribute('fill', STATE_COLORS[p.state]);
    c.dataset.idx = p.i;
    coreGroup.appendChild(c);
    return c;
  });
  svg.appendChild(coreGroup);

  // 8. Inline label on a chosen token (matches "Chicken" in real render)
  const labelToken = points[Math.floor(points.length * 0.42)];
  const labelGroup = document.createElementNS(SVGNS, 'g');
  const labelBg = document.createElementNS(SVGNS, 'rect');
  labelBg.setAttribute('rx', '1');
  labelBg.setAttribute('fill', 'rgba(6, 8, 12, 0.75)');
  labelBg.setAttribute('stroke', '#4dd9ff');
  labelBg.setAttribute('stroke-width', '0.4');
  labelGroup.appendChild(labelBg);
  const labelText = document.createElementNS(SVGNS, 'text');
  labelText.setAttribute('font-family', 'JetBrains Mono, monospace');
  labelText.setAttribute('font-size', '6.5');
  labelText.setAttribute('fill', '#4dd9ff');
  labelText.setAttribute('text-anchor', 'start');
  labelText.setAttribute('dominant-baseline', 'middle');
  labelText.textContent = '" chicken"';
  labelGroup.appendChild(labelText);
  svg.appendChild(labelGroup);

  // ─── Render loop ─────────────────────────────────────
  let start = performance.now();

  function rotate3D(p, cosY, sinY, cosP, sinP) {
    let x =  p.x * cosY + p.z * sinY;
    let z = -p.x * sinY + p.z * cosY;
    let y =  p.y;
    const y2 = y * cosP - z * sinP;
    const z2 = y * sinP + z * cosP;
    const camZ = 540;
    const scale = camZ / (camZ + z2);
    return { x: x * scale, y: y2 * scale, z: z2, scale };
  }

  function frame(now) {
    const elapsed = (now - start) / 1000;
    const yaw = elapsed * 0.16;
    const pitch = Math.sin(elapsed * 0.10) * 0.18 + 0.10;

    const cosY = Math.cos(yaw),  sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch), sinP = Math.sin(pitch);

    const proj = points.map(p => rotate3D(p, cosY, sinY, cosP, sinP));

    // Center glow follows center of mass + breathes
    const cx = proj.reduce((s, p) => s + p.x, 0) / proj.length;
    const cy = proj.reduce((s, p) => s + p.y, 0) / proj.length;
    centerGlowEl.setAttribute('cx', cx.toFixed(2));
    centerGlowEl.setAttribute('cy', cy.toFixed(2));
    const breathe = 0.85 + Math.sin(elapsed * 1.2) * 0.15;
    centerGlowEl.setAttribute('r', (70 * breathe).toFixed(2));

    // Arcs
    arcEls.forEach(line => {
      const f = proj[+line.dataset.from], t = proj[+line.dataset.to];
      line.setAttribute('x1', f.x.toFixed(2));
      line.setAttribute('y1', f.y.toFixed(2));
      line.setAttribute('x2', t.x.toFixed(2));
      line.setAttribute('y2', t.y.toFixed(2));
      const s = (f.scale + t.scale) / 2;
      line.setAttribute('opacity', (0.22 + 0.4 * s).toFixed(2));
    });

    // Trajectory
    trajEls.forEach(seg => {
      const f = proj[+seg.dataset.from], t = proj[+seg.dataset.to];
      seg.setAttribute('x1', f.x.toFixed(2));
      seg.setAttribute('y1', f.y.toFixed(2));
      seg.setAttribute('x2', t.x.toFixed(2));
      seg.setAttribute('y2', t.y.toFixed(2));
      const s = (f.scale + t.scale) / 2;
      seg.setAttribute('opacity', (0.5 + 0.4 * s).toFixed(2));
    });

    // Depth-sort halos + cores
    const order = proj.map((p, i) => ({ i, z: p.z })).sort((a, b) => a.z - b.z);
    order.forEach(({ i }) => {
      const p = proj[i];
      const sz = points[i].size;
      const halo = haloEls[i];
      const haloR = (5 + 5 * p.scale) * sz;
      halo.setAttribute('cx', p.x.toFixed(2));
      halo.setAttribute('cy', p.y.toFixed(2));
      halo.setAttribute('r', haloR.toFixed(2));
      halo.setAttribute('opacity', (0.55 + 0.4 * p.scale).toFixed(2));
      haloGroup.appendChild(halo);

      const core = coreEls[i];
      const coreR = (1.4 + 1.2 * p.scale) * sz;
      core.setAttribute('cx', p.x.toFixed(2));
      core.setAttribute('cy', p.y.toFixed(2));
      core.setAttribute('r', coreR.toFixed(2));
      core.setAttribute('opacity', (0.75 + 0.25 * p.scale).toFixed(2));
      coreGroup.appendChild(core);
    });

    // Position the inline label
    const lp = proj[labelToken.i];
    const offset = 8 + 4 * lp.scale;
    labelText.setAttribute('x', (lp.x + offset).toFixed(2));
    labelText.setAttribute('y', lp.y.toFixed(2));
    // Estimate text width
    const tw = 36;
    labelBg.setAttribute('x', (lp.x + offset - 1.5).toFixed(2));
    labelBg.setAttribute('y', (lp.y - 4).toFixed(2));
    labelBg.setAttribute('width', tw);
    labelBg.setAttribute('height', '8');
    labelGroup.setAttribute('opacity', (0.5 + 0.5 * lp.scale).toFixed(2));

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
