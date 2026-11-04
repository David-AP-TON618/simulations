/* Cyclic cellular automaton (Griffeath): each state is eaten by the next one, and spirals appear. */
Sims.register({
  id: 'cyclic', file: 'cyclic', name: 'Cyclic spirals',
  desc: 'Each state is eaten by the next one, and spirals appear from noise.',
  cell: 4, fps: 15, warm: 900,
  params: [
    {id: 'states', label: 'States', min: 3, max: 24, step: 1, value: 14, restart: true},
    {id: 'threshold', label: 'Threshold', min: 1, max: 2, step: 1, value: 1},
  ],
  presets: [
    {name: 'Spirals', set: {states: 14, threshold: 1}},
    {name: 'Crystals', set: {states: 4, threshold: 2}},
  ],
  create(cols, rows, P0) {
    const n = cols * rows, S = P0.states;
    let a = new Uint8Array(n), b = new Uint8Array(n);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) a[i] = Math.random() * S | 0;
    return {
      step(P) {
        for (let y = 0, i = 0; y < rows; y++) {
          const u = ((y + rows - 1) % rows) * cols, m = y * cols, d = ((y + 1) % rows) * cols;
          for (let x = 0; x < cols; x++, i++) {
            const l = (x + cols - 1) % cols, r = (x + 1) % cols, s = a[i], e = (s + 1) % S;
            const c = (a[u + x] === e) + (a[m + l] === e) + (a[m + r] === e) + (a[d + x] === e);
            b[i] = c >= P.threshold ? e : s;
          }
        }
        [a, b] = [b, a];
      },
      field() {
        for (let i = 0; i < n; i++) out[i] = a[i] / (S - 1);
        return out;
      },
    };
  },
});
