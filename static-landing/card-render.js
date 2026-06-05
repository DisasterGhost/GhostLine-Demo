/* ──────────────────────────────────────────────────────────
   Card render — mini token-cloud per recording card.
   Draws the ACTUAL generation geometry (centered + normalized
   coords from card-data.js) in the new frontend's visual
   language: muted state palette, soft halos, dual-layer
   trajectory, red fabrication rings on high-risk tokens.

   - Canvas 2D (one shared rAF loop, many small canvases)
   - Viewport-gated via IntersectionObserver (idle off-screen)
   - prefers-reduced-motion → single static frame, no loop
   - Each card spins on a phase offset so the grid isn't synced
   ────────────────────────────────────────────────────────── */
(function () {
  const DATA = window.GHOSTLINE_CARD_DATA;
  if (!DATA) return;

  // Muted state palette — matches data/statePalettes.ts in the live
  // research frontend (the "redesign" default), keyed by the short
  // codes emitted by extract_card_data.py.
  const STATE_COLORS = {
    R: '#56b0dd', // reasoning  — muted blue
    T: '#4eba85', // retrieval  — muted emerald
    C: '#9b6fc9', // creativity — muted violet
    P: '#d4c25a', // precision  — muted gold
    U: '#d98a4f', // uncertainty— muted orange
    X: '#d05f6d', // collapse   — muted red
    E: '#c06f9e', // edge cases — muted magenta
    '?': '#6f7a93', // unknown  — slate
  };
  const HALLUC_RING = '#ff5577';

  const reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ─── Pre-rendered halo sprites (one soft-glow disc per color) ───
  // Re-drawing radial gradients every frame is expensive; bake each
  // state color into a sprite once and blit it (the frontend uses
  // billboarded sprites for the same reason).
  const SPRITE_PX = 64;
  const haloSprites = {};
  function haloSprite(color) {
    if (haloSprites[color]) return haloSprites[color];
    const c = document.createElement('canvas');
    c.width = c.height = SPRITE_PX;
    const g = c.getContext('2d');
    const r = SPRITE_PX / 2;
    const grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, color);
    grad.addColorStop(0.18, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 1;
    g.fillStyle = grad;
    g.beginPath();
    g.arc(r, r, r, 0, Math.PI * 2);
    g.fill();
    haloSprites[color] = c;
    return c;
  }

  function hexToRgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // 3D rotate (yaw + pitch) + perspective projection.
  function project(p, cosY, sinY, cosP, sinP) {
    const x = p.x * cosY + p.z * sinY;
    let z = -p.x * sinY + p.z * cosY;
    const y = p.y * cosP - z * sinP;
    z = p.y * sinP + z * cosP;
    const camZ = 4.2;
    const scale = camZ / (camZ + z);
    return { x: x * scale, y: y * scale, z, scale };
  }

  // ─── Build one card's render context ───
  function buildCard(mount, index) {
    const id = mount.dataset.rec;
    const raw = DATA[id];
    if (!raw) return null;

    const canvas = document.createElement('canvas');
    mount.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const points = raw.map((d, i) => ({
      x: d[0], y: d[1], z: d[2],
      color: STATE_COLORS[d[3]] || STATE_COLORS['?'],
      risk: d.length > 4 ? d[4] : 0,
      i,
    }));

    // A few faint background stars (deterministic per card)
    let seed = 0x9e37 + index * 101;
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed >>> 8) / 0x01000000; };
    const stars = [];
    for (let k = 0; k < 14; k++) {
      stars.push({ x: rand() - 0.5, y: rand() - 0.5, r: 0.4 + rand() * 0.7, o: 0.12 + rand() * 0.3 });
    }

    const card = {
      id, canvas, ctx, points, stars,
      w: 0, h: 0, dpr: 1,
      phase: index * 0.9,     // desync the grid
      hover: false,
      visible: false,
    };

    resize(card);
    mount.addEventListener('mouseenter', () => { card.hover = true; });
    mount.addEventListener('mouseleave', () => { card.hover = false; });
    return card;
  }

  function resize(card) {
    const rect = card.canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    card.w = rect.width;
    card.h = rect.height;
    card.dpr = dpr;
    card.canvas.width = Math.round(rect.width * dpr);
    card.canvas.height = Math.round(rect.height * dpr);
    card.canvas.style.width = rect.width + 'px';
    card.canvas.style.height = rect.height + 'px';
  }

  function draw(card, yaw, pitch) {
    const { ctx, points, stars, w, h, dpr } = card;
    if (!w || !h) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Background — subtle radial, lighter navy center fading to near-black
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
    bg.addColorStop(0, '#0c1220');
    bg.addColorStop(1, '#04050a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) * 0.34;

    // Stars (static, behind cloud)
    ctx.fillStyle = '#ffffff';
    for (const s of stars) {
      ctx.globalAlpha = s.o;
      ctx.beginPath();
      ctx.arc(cx + s.x * w, cy + s.y * h, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
    const proj = points.map((p) => {
      const q = project(p, cosY, sinY, cosP, sinP);
      return { sx: cx + q.x * R, sy: cy + q.y * R, z: q.z, scale: q.scale, p };
    });

    // ─── Trajectory: dual-layer line, colored by destination state ───
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // outer glow pass
    for (let i = 1; i < proj.length; i++) {
      const a = proj[i - 1], b = proj[i];
      ctx.strokeStyle = hexToRgba(b.p.color, 0.16);
      ctx.lineWidth = 2.4 * ((a.scale + b.scale) / 2);
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.stroke();
    }
    // inner crisp pass
    for (let i = 1; i < proj.length; i++) {
      const a = proj[i - 1], b = proj[i];
      ctx.strokeStyle = hexToRgba(b.p.color, 0.62);
      ctx.lineWidth = 0.9 * ((a.scale + b.scale) / 2);
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.stroke();
    }

    // ─── Tokens: depth-sorted halos + cores ───
    const order = proj.map((q, i) => i).sort((m, n) => proj[m].z - proj[n].z);

    // halos (soft glow sprites)
    for (const i of order) {
      const q = proj[i];
      const haloR = (5 + 5 * q.scale);
      const spr = haloSprite(q.p.color);
      ctx.globalAlpha = (0.18 + 0.22 * q.scale);
      ctx.drawImage(spr, q.sx - haloR, q.sy - haloR, haloR * 2, haloR * 2);
    }
    ctx.globalAlpha = 1;

    // cores + fabrication rings
    for (const i of order) {
      const q = proj[i];
      const coreR = (1.1 + 1.3 * q.scale);
      ctx.fillStyle = q.p.color;
      ctx.globalAlpha = (0.7 + 0.3 * q.scale);
      ctx.beginPath();
      ctx.arc(q.sx, q.sy, coreR, 0, Math.PI * 2);
      ctx.fill();

      if (q.p.risk >= 0.5) {
        ctx.globalAlpha = Math.min(1, (q.p.risk - 0.4) * 1.4) * (0.5 + 0.4 * q.scale);
        ctx.strokeStyle = HALLUC_RING;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(q.sx, q.sy, coreR + 2.4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  // ─── Boot ───
  const mounts = Array.from(document.querySelectorAll('.rec-card__render[data-rec]'));
  const cards = mounts.map(buildCard).filter(Boolean);
  if (!cards.length) return;

  window.addEventListener('resize', () => cards.forEach(resize));

  if (reduceMotion) {
    // Single composed static frame per card.
    cards.forEach((c) => draw(c, 0.6, 0.18));
    return;
  }

  // Animate only cards in view.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const card = cards.find((c) => c.canvas.parentElement === e.target);
        if (card) card.visible = e.isIntersecting;
      });
    }, { rootMargin: '80px' });
    cards.forEach((c) => io.observe(c.canvas.parentElement));
  } else {
    cards.forEach((c) => { c.visible = true; });
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!document.hidden) {
      for (const c of cards) {
        if (!c.visible) continue;
        const speed = c.hover ? 0.34 : 0.14;
        c.phase += dt * speed;
        const pitch = Math.sin(c.phase * 0.6) * 0.16 + 0.12;
        draw(c, c.phase, pitch);
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
