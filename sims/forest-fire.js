/* Forest-fire model (Drossel and Schwabl 1992). */
Sims.register({
  id: 'fire', file: 'forest-fire', name: 'Forest fire',
  desc: 'Trees grow, lightning strikes, and fire spreads to the neighbours.',
  cell: 8, fps: 15, warm: 700,
  params: [
    {id: 'grow', label: 'Tree growth', min: .001, max: .05, step: .001, value: .01},
    {id: 'strike', label: 'Lightning', min: .00001, max: .002, step: .00001, value: .0002},
  ],
  create(cols, rows) {
    const n = cols * rows, EMPTY = 0, TREE = 1, FIRE = 2;
    let a = new Uint8Array(n), b = new Uint8Array(n);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) a[i] = Math.random() < .5 ? TREE : EMPTY;
    return {
      step(P) {
        for (let y = 0, i = 0; y < rows; y++) {
          const u = ((y + rows - 1) % rows) * cols, m = y * cols, d = ((y + 1) % rows) * cols;
          for (let x = 0; x < cols; x++, i++) {
            const s = a[i], l = (x + cols - 1) % cols, r = (x + 1) % cols;
            if (s === FIRE) b[i] = EMPTY;
            else if (s === TREE) {
              const burn = a[u + x] === FIRE || a[d + x] === FIRE || a[m + l] === FIRE || a[m + r] === FIRE
                || a[u + l] === FIRE || a[u + r] === FIRE || a[d + l] === FIRE || a[d + r] === FIRE;
              b[i] = burn || Math.random() < P.strike ? FIRE : TREE;
            } else b[i] = Math.random() < P.grow ? TREE : EMPTY;
          }
        }
        [a, b] = [b, a];
      },
      field() {
        for (let i = 0; i < n; i++) out[i] = a[i] === FIRE ? 1 : a[i] === TREE ? .6 : 0;
        return out;
      },
    };
  },
});
