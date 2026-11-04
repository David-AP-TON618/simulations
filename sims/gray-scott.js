/* Gray-Scott reaction-diffusion (Pearson 1993). */
Sims.register({
  id: 'scott', file: 'gray-scott', name: 'Gray-Scott',
  desc: 'Two chemicals spread and react.',
  cell: 4, fps: 15, steps: 6, warm: 900,
  params: [
    {id: 'F', label: 'Feed', min: .01, max: .09, step: .001, value: .060},
    {id: 'k', label: 'Kill', min: .045, max: .07, step: .001, value: .062},
  ],
  presets: [
    {name: 'Blobs', set: {F: .060, k: .062}},
    {name: 'Spots', set: {F: .030, k: .062}},
    {name: 'Stripes', set: {F: .046, k: .063}},
    {name: 'Waves', set: {F: .025, k: .060}},
  ],
  create(cols, rows) {
    const DU = .16, DV = .08, n = cols * rows;
    let u = new Float32Array(n).fill(1), v = new Float32Array(n), nu = new Float32Array(n), nv = new Float32Array(n);
    const out = new Float32Array(n);
    let moved = 0, calm = 0, drop = null;
    const blob = (cx, cy) => {
      const r = 3 + (Math.random() * 3 | 0);
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
        if (x * x + y * y > r * r) continue;
        const i = ((cy + y + rows) % rows) * cols + ((cx + x + cols) % cols);
        u[i] = .5; v[i] = .25 + Math.random() * .1;
      }
    };
    const count = Math.max(12, Math.round(n / 450));
    for (let s = 0; s < count; s++) blob(Math.random() * cols | 0, Math.random() * rows | 0);
    return {
      step(P) {
        moved = 0;
        for (let y = 0, i = 0; y < rows; y++) {
          const up = ((y + rows - 1) % rows) * cols, down = ((y + 1) % rows) * cols, row = y * cols;
          for (let x = 0; x < cols; x++, i++) {
            const l = row + (x + cols - 1) % cols, r = row + (x + 1) % cols, t = up + x, d = down + x;
            const U = u[i], V = v[i], uvv = U * V * V;
            const next = V + DV * (v[l] + v[r] + v[t] + v[d] - 4 * V) + uvv - (P.F + P.k) * V;
            nu[i] = U + DU * (u[l] + u[r] + u[t] + u[d] - 4 * U) - uvv + P.F * (1 - U);
            nv[i] = next;
            moved += Math.abs(next - V);
          }
        }
        [u, nu] = [nu, u]; [v, nv] = [nv, v];
      },
      /* When the pattern stops moving, a patch dissolves and grows back. */
      after() {
        calm = moved / n < 2e-5 ? calm + 1 : 0;
        if (drop) {
          const {x: cx, y: cy, r, max} = drop;
          for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
            if (x * x + y * y > r * r) continue;
            const i = ((cy + y + rows) % rows) * cols + ((cx + x + cols) % cols);
            u[i] = 1; v[i] = 0;
          }
          if (++drop.r > max) {
            for (let s = 0; s < 6; s++) {
              const a = Math.random() * 6.283, d = Math.random() * max * .8;
              blob((cx + Math.round(Math.cos(a) * d) + cols) % cols, (cy + Math.round(Math.sin(a) * d) + rows) % rows);
            }
            drop = null;
          }
        } else if (calm > 150) {
          calm = 0;
          drop = {x: Math.random() * cols | 0, y: Math.random() * rows | 0, r: 2, max: Math.max(8, rows * .35 | 0)};
        }
      },
      field() {
        for (let i = 0; i < n; i++) out[i] = Math.min(1, v[i] / .32);
        return out;
      },
    };
  },
});
