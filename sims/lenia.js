/* Lenia, a continuous cellular automaton (Bert Chan 2019). */
Sims.register({
  id: 'lenia', file: 'lenia', name: 'Lenia',
  desc: 'A smooth cousin of the Game of Life. Shapes drift like small creatures.',
  cell: 8, fps: 15, warm: 120,
  params: [
    {id: 'mu', label: 'Growth centre', min: .08, max: .25, step: .001, value: .135},
    {id: 'sigma', label: 'Growth width', min: .008, max: .04, step: .001, value: .015},
    {id: 'dt', label: 'Time step', min: .02, max: .2, step: .01, value: .08},
    {id: 'R', label: 'Radius', min: 4, max: 12, step: 1, value: 9, restart: true},
  ],
  presets: [
    {name: 'Amoebas', set: {mu: .135, sigma: .015}},
    {name: 'Cells', set: {mu: .170, sigma: .022}},
    {name: 'Boiling', set: {mu: .140, sigma: .020}},
  ],
  create(cols, rows, P0) {
    const n = cols * rows, R = P0.R;
    let a = new Float32Array(n), b = new Float32Array(n);
    const dxs = [], dys = [], ws = [];
    let sum = 0;
    for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
      const r = Math.hypot(x, y) / R;
      if (r <= 0 || r >= 1) continue;
      const w = Math.exp(4 - 1 / (r * (1 - r)));
      dxs.push(x); dys.push(y); ws.push(w); sum += w;
    }
    const K = ws.length, W = Float32Array.from(ws, w => w / sum);
    const xw = new Int32Array(cols + 2 * R), yw = new Int32Array(rows + 2 * R);
    for (let i = 0; i < xw.length; i++) xw[i] = (i - R + cols) % cols;
    for (let i = 0; i < yw.length; i++) yw[i] = ((i - R + rows) % rows) * cols;
    const seed = () => {
      a.fill(0);
      const patches = Math.max(6, Math.round(n / 900));
      for (let s = 0; s < patches; s++) {
        const cx = Math.random() * cols | 0, cy = Math.random() * rows | 0, r = R * 2;
        for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
          if (x * x + y * y > r * r) continue;
          a[((cy + y + rows) % rows) * cols + ((cx + x + cols) % cols)] = Math.random();
        }
      }
    };
    seed();
    let mass = 1, calm = 0, moved = 0;
    return {
      step(P) {
        const twoS2 = 2 * P.sigma * P.sigma;
        let m = 0, change = 0;
        for (let y = 0, i = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++, i++) {
            let u = 0;
            for (let k = 0; k < K; k++) u += W[k] * a[yw[y + dys[k] + R] + xw[x + dxs[k] + R]];
            const d = u - P.mu, g = 2 * Math.exp(-d * d / twoS2) - 1;
            let next = a[i] + P.dt * g;
            next = next < 0 ? 0 : next > 1 ? 1 : next;
            b[i] = next; m += next; change += Math.abs(next - a[i]);
          }
        }
        [a, b] = [b, a];
        mass = m / n; moved = change / n;
      },
      /* If everything dies, or the world fills up or stops, start again. */
      after() {
        calm = moved < 1e-4 ? calm + 1 : 0;
        if (mass < .002 || mass > .6 || calm > 120) { calm = 0; seed(); }
      },
      field: () => a,
    };
  },
});
