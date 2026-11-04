/* Runs one simulation at a time and draws it in 1-bit dots (Bayer 4x4 dithering).
   Each file in sims/ calls Sims.register(...). The engine builds the controls from what it finds there. */
(() => {
  const SIMS = [];
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const DOT = 4;
  const SPEED = {id: 'speed', label: 'Speed', min: .25, max: 3, step: .25, value: 1};

  /* ---- random palettes: any hue, three kinds of page, text always readable ---- */
  const toHex = (h, s, l) => {
    h = ((h % 360) + 360) % 360;
    const a = s * Math.min(l, 1 - l);
    const f = n => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0'); };
    return '#' + f(0) + f(8) + f(4);
  };
  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const luminance = hex => {
    const [r, g, b] = rgb(hex).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
    return .2126 * r + .7152 * g + .0722 * b;
  };
  const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
  /* moves lightness away from the other colour until the contrast is reached */
  const fit = (h, s, l, other, min, step) => {
    let hex = toHex(h, s, l);
    while (contrast(hex, other) < min && l > .02 && l < .98) { l += step; hex = toHex(h, s, l); }
    return hex;
  };
  function makePalette(seed, preferDark) {
    let t = (seed * 2654435761 + 1) >>> 0;
    const rnd = () => { t = (t + 0x6D2B79F5) >>> 0; let z = t; z = Math.imul(z ^ (z >>> 15), z | 1); z ^= z + Math.imul(z ^ (z >>> 7), z | 61); return ((z ^ (z >>> 14)) >>> 0) / 4294967296; };
    const h = rnd() * 360, kind = preferDark ? 'deep' : ['mid', 'deep', 'pale'][rnd() * 3 | 0];
    let p;
    if (kind === 'mid') {
      const s = .55 + rnd() * .35, on = '#ffffff', ground = fit(h, s, .62, on, 4.7 + rnd() * .8, -.005);
      const bar = fit(h + 20, .7, .16, ground, 2.8, -.005);
      p = {ground, on, dot: bar, paper: toHex(h, .3, .985), ink: toHex(h + 10, .55, .11), bar, barfg: toHex(h, .4, .96), alpha: .74};
    } else if (kind === 'deep') {
      const s = .5 + rnd() * .3, ground = toHex(h, s, .1 + rnd() * .08), on = fit(h, .45, .9, ground, 7, .01);
      const bar = fit(h + 18, .6, .6 + rnd() * .12, ground, 5, .01), paper = toHex(h, .45, .15);
      p = {ground, on, dot: bar, paper, ink: fit(h, .35, .94, paper, 7, .01), bar, barfg: fit(h, .6, .08, bar, 4.7, -.01), alpha: .82};
    } else {
      const s = .4 + rnd() * .35, ground = toHex(h, s, .8 + rnd() * .09), on = fit(h, .55, .15, ground, 7, -.01);
      const bar = fit(h, .6, .2, ground, 4, -.01);
      p = {ground, on, dot: bar, paper: toHex(h, .4, .985), ink: on, bar, barfg: toHex(h, .4, .96), alpha: .72};
    }
    if (contrast(p.barfg, p.bar) < 4.6) p.barfg = contrast('#ffffff', p.bar) > contrast('#000000', p.bar) ? '#ffffff' : '#000000';
    p.glass = 'rgba(' + rgb(p.paper).join(',') + ',' + p.alpha + ')';
    return p;
  }
  function applyPalette(p) {
    const root = document.documentElement.style, set = (names, value) => names.forEach(n => root.setProperty('--' + n, value));
    set(['bg', 'ground'], p.ground); set(['text', 'on', 'head'], p.on); set(['dot'], p.dot); set(['ink'], p.ink);
    set(['paper'], p.paper); set(['frame', 'barbg'], p.bar); set(['barfg'], p.barfg); set(['glass'], p.glass);
  }

  function mount({stage, canvas, panel, title, codeUrl, ink}) {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const query = new URLSearchParams(location.search);
    let sim = SIMS.find(s => s.id === query.get('sim')) || SIMS[0];
    let P = {}, world = null, dcols = 0, drows = 0, cols = 0, rows = 0;
    let ctx, img, px, colour = 0, last = 0, onScreen = true;
    const dark = matchMedia('(prefers-color-scheme: dark)');
    const seedInUrl = parseInt(query.get('pal'), 10);
    let palSeed = Number.isFinite(seedInUrl) ? seedInUrl : null;
    const allParams = () => [...sim.params, SPEED];

    function readColour() {
      const hex = ink().replace('#', '');
      const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
      colour = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
    }
    function defaults(useQuery) {
      P = {};
      for (const p of allParams()) {
        const raw = useQuery ? parseFloat(query.get(p.id)) : NaN;
        P[p.id] = Number.isFinite(raw) ? Math.min(p.max, Math.max(p.min, raw)) : p.value;
      }
    }
    function saveUrl() {
      const q = new URLSearchParams({sim: sim.id});
      if (palSeed !== null) q.set('pal', palSeed);
      for (const p of allParams()) if (P[p.id] !== p.value) q.set(p.id, P[p.id]);
      try { history.replaceState(null, '', location.pathname + '?' + q); } catch (e) { /* opened from a local file */ }
    }
    function paint() {
      px.fill(0);
      const f = world.field(P), W = canvas.width, s = sim.cell / DOT;
      for (let j = 0; j < drows; j++) {
        for (let i = 0; i < dcols; i++) {
          let v;
          if (s === 1) v = f[j * cols + i];
          else {
            const x = i / s, y = j / s, x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0;
            const x1 = (x0 + 1) % cols, y1 = (y0 + 1) % rows, a = y0 * cols, b = y1 * cols;
            v = (f[a + x0] * (1 - fx) + f[a + x1] * fx) * (1 - fy) + (f[b + x0] * (1 - fx) + f[b + x1] * fx) * fy;
          }
          if (v * 16 > BAYER[(j & 3) * 4 + (i & 3)] + .5) px[2 * j * W + 2 * i] = colour;
        }
      }
      ctx.putImageData(img, 0, 0);
    }
    function restart() {
      dcols = Math.floor(stage.clientWidth / DOT); drows = Math.floor(stage.clientHeight / DOT);
      canvas.width = dcols * 2; canvas.height = drows * 2;
      canvas.style.width = dcols * DOT + 'px'; canvas.style.height = drows * DOT + 'px';
      ctx = canvas.getContext('2d');
      img = ctx.createImageData(canvas.width, canvas.height);
      px = new Uint32Array(img.data.buffer);
      const s = sim.cell / DOT;
      cols = Math.ceil(dcols / s); rows = Math.ceil(drows / s);
      world = sim.create(cols, rows, P);
      const t0 = performance.now();
      for (let n = 0; n < (sim.warm || 0) && performance.now() - t0 < 300; n++) world.step(P);
      paint();
    }
    function buildPanel() {
      panel.innerHTML = '';
      title.textContent = sim.file + '.sim';
      const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
      const select = el('select', 'sim-select');
      select.setAttribute('aria-label', 'Simulation');
      SIMS.forEach(s => { const o = el('option', '', s.name); o.value = s.id; o.selected = s === sim; select.append(o); });
      select.onchange = () => { sim = SIMS.find(s => s.id === select.value); defaults(false); buildPanel(); saveUrl(); restart(); };
      panel.append(select, el('p', 'sim-desc', sim.desc));
      const settings = el('details', 'sim-settings');
      settings.open = stage.clientWidth >= 700;
      settings.append(el('summary', '', 'Settings'));
      const inputs = {};
      if (sim.presets && sim.presets.length) {
        const row = el('div', 'sim-presets');
        sim.presets.forEach(pr => {
          const b = el('button', '', pr.name); b.type = 'button';
          b.onclick = () => {
            for (const k of Object.keys(pr.set)) { P[k] = pr.set[k]; if (inputs[k]) inputs[k](); }
            saveUrl(); restart();
          };
          row.append(b);
        });
        settings.append(row);
      }
      for (const p of allParams()) {
        const label = el('label', 'sim-param');
        const name = el('span', '', p.label), value = el('output'), input = el('input');
        input.type = 'range'; input.min = p.min; input.max = p.max; input.step = p.step;
        const decimals = (String(p.step).split('.')[1] || '').length;
        const show = () => {
          value.textContent = (+P[p.id]).toFixed(decimals);
          input.style.setProperty('--pct', (P[p.id] - p.min) / (p.max - p.min) * 100 + '%');
        };
        inputs[p.id] = () => { input.value = P[p.id]; show(); };
        inputs[p.id]();
        input.oninput = () => {
          P[p.id] = +input.value; show(); saveUrl();
          if (p.restart || reduce) restart();
        };
        label.append(name, input, value);
        settings.append(label);
      }
      panel.append(settings);
      const actions = el('div', 'sim-actions');
      const reload = el('button', 'sim-reload', 'Reload'); reload.type = 'button';
      reload.title = 'Start again with new colours';
      reload.onclick = () => {
        palSeed = Math.random() * 1e6 | 0;
        applyPalette(makePalette(palSeed, dark.matches));
        readColour(); saveUrl(); restart();
      };
      const code = el('a', 'sim-code', 'Code');
      code.href = codeUrl + '/blob/main/sims/' + sim.file + '.js'; code.target = '_blank'; code.rel = 'noopener';
      actions.append(reload, code);
      panel.append(actions);
    }
    function frame(t) {
      requestAnimationFrame(frame);
      if (!onScreen || document.hidden || t - last < 1000 / (sim.fps * P.speed)) return;
      last = t;
      for (let n = 0; n < (sim.steps || 1); n++) world.step(P);
      if (world.after) world.after(P);
      paint();
    }
    if (palSeed !== null) applyPalette(makePalette(palSeed, dark.matches));
    readColour();
    defaults(true);
    buildPanel();
    restart();
    if (!reduce) {
      new IntersectionObserver(e => { onScreen = e[0].isIntersecting; }).observe(stage);
      requestAnimationFrame(frame);
    }
    let timer;
    addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (Math.floor(stage.clientWidth / DOT) !== dcols || Math.floor(stage.clientHeight / DOT) !== drows) restart();
      }, 200);
    });
    dark.addEventListener('change', () => {
      if (palSeed !== null) applyPalette(makePalette(palSeed, dark.matches));
      readColour(); paint();
    });
  }
  window.Sims = {register: s => SIMS.push(s), mount, list: SIMS, makePalette, contrast};
})();
