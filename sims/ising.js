/* Ising model of a magnet (1925), with the Metropolis algorithm. */
Sims.register({
  id: 'ising', file: 'ising', name: 'Ising magnet',
  desc: 'Tiny magnets copy their neighbours while heat shakes them.',
  cell: 4, fps: 15, warm: 120,
  params: [
    {id: 'T', label: 'Temperature', min: 1, max: 4, step: .01, value: 2.27},
  ],
  presets: [
    {name: 'Cold', set: {T: 1.6}},
    {name: 'Critical', set: {T: 2.27}},
    {name: 'Hot', set: {T: 3.4}},
  ],
  create(cols, rows) {
    const n = cols * rows, s = new Int8Array(n), out = new Float32Array(n);
    for (let i = 0; i < n; i++) s[i] = Math.random() < .5 ? 1 : -1;
    return {
      step(P) {
        const p4 = Math.exp(-4 / P.T), p8 = Math.exp(-8 / P.T);
        for (let k = 0; k < n; k++) {
          const x = Math.random() * cols | 0, y = Math.random() * rows | 0, i = y * cols + x;
          const sum = s[y * cols + (x + 1) % cols] + s[y * cols + (x + cols - 1) % cols]
            + s[((y + 1) % rows) * cols + x] + s[((y + rows - 1) % rows) * cols + x];
          const dE = 2 * s[i] * sum;
          if (dE <= 0 || (dE === 4 && Math.random() < p4) || (dE === 8 && Math.random() < p8)) s[i] = -s[i];
        }
      },
      field() {
        for (let i = 0; i < n; i++) out[i] = s[i] > 0 ? .75 : 0;
        return out;
      },
    };
  },
});
