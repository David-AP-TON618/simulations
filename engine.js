/* Runs one simulation at a time and draws it in 1-bit dots (Bayer 4x4 dithering).
   Each file in sims/ calls Sims.register(...). The engine builds the controls from what it finds there. */
(() => {
  const SIMS = [];
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const DOT = 4;
  const SPEED = {id: 'speed', label: 'Speed', min: .25, max: 3, step: .25, value: 1};

  function mount({stage, canvas, panel, title, codeUrl, ink}) {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const query = new URLSearchParams(location.search);
    let sim = SIMS.find(s => s.id === query.get('sim')) || SIMS[0];
    let P = {}, world = null, dcols = 0, drows = 0, cols = 0, rows = 0;
    let ctx, img, px, colour = 0, last = 0, onScreen = true;
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
        panel.append(row);
      }
      for (const p of allParams()) {
        const label = el('label', 'sim-param');
        const name = el('span', '', p.label), value = el('output'), input = el('input');
        input.type = 'range'; input.min = p.min; input.max = p.max; input.step = p.step;
        const decimals = (String(p.step).split('.')[1] || '').length;
        inputs[p.id] = () => { input.value = P[p.id]; value.textContent = (+P[p.id]).toFixed(decimals); };
        inputs[p.id]();
        input.oninput = () => {
          P[p.id] = +input.value; value.textContent = (+input.value).toFixed(decimals); saveUrl();
          if (p.restart || reduce) restart();
        };
        label.append(name, value, input);
        panel.append(label);
      }
      const actions = el('div', 'sim-actions');
      const reload = el('button', 'sim-reload', 'Reload'); reload.type = 'button'; reload.onclick = restart;
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
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readColour(); paint(); });
  }
  window.Sims = {register: s => SIMS.push(s), mount, list: SIMS};
})();
