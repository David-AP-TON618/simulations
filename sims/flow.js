/* Dye carried by a curl-noise velocity field: the fluid does not compress. */
Sims.register({
  id: 'flow', file: 'flow', name: 'Flow',
  desc: 'Dye carried by a slowly changing current.',
  cell: 8, fps: 30, warm: 240,
  params: [
    {id: 'scale', label: 'Eddy size', min: .02, max: .08, step: .001, value: .04},
    {id: 'drift', label: 'Change', min: .002, max: .03, step: .001, value: .012},
    {id: 'vel', label: 'Velocity', min: 10, max: 60, step: 1, value: 36},
    {id: 'decay', label: 'Dye life', min: .95, max: .998, step: .001, value: .992},
  ],
  presets: [
    {name: 'Calm', set: {scale: .03, drift: .006, vel: 18}},
    {name: 'Busy', set: {scale: .055, drift: .018, vel: 45}},
  ],
  create(cols, rows) {
    const n = cols * rows, ANISO = 1.6, FLOOR = .002, SPLATS = .4;
    let dye = new Float32Array(n), next = new Float32Array(n);
    const psi = new Float32Array(n);
    let t = Math.random() * 100;
    const perm = new Uint8Array(512);
    const base = Array.from({length: 256}, (_, i) => i);
    for (let i = 255; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [base[i], base[j]] = [base[j], base[i]]; }
    for (let i = 0; i < 512; i++) perm[i] = base[i & 255];
    const val = Float32Array.from({length: 256}, () => Math.random());
    const fade = q => q * q * (3 - 2 * q);
    const noise = (x, y, z) => {
      const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
      const fx = fade(x - X), fy = fade(y - Y), fz = fade(z - Z);
      const h = (i, j, k) => val[perm[(perm[(perm[(X + i) & 255] + Y + j) & 255] + Z + k) & 255]];
      const lerp = (p, q, s) => p + (q - p) * s;
      return lerp(
        lerp(lerp(h(0, 0, 0), h(1, 0, 0), fx), lerp(h(0, 1, 0), h(1, 1, 0), fx), fy),
        lerp(lerp(h(0, 0, 1), h(1, 0, 1), fx), lerp(h(0, 1, 1), h(1, 1, 1), fx), fy), fz);
    };
    const splat = () => {
      const cx = Math.random() * cols | 0, cy = Math.random() * rows | 0, r = 4 + (Math.random() * 5 | 0);
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
        if (x * x + y * y > r * r) continue;
        dye[((cy + y + rows) % rows) * cols + ((cx + x + cols) % cols)] = 1;
      }
    };
    for (let s = 0; s < 40; s++) splat();
    return {
      step(P) {
        t += P.drift;
        for (let y = 0, i = 0; y < rows; y++) for (let x = 0; x < cols; x++, i++) {
          psi[i] = noise(x * P.scale, y * P.scale * ANISO, t);
        }
        for (let y = 0, i = 0; y < rows; y++) {
          const up = ((y + rows - 1) % rows) * cols, down = ((y + 1) % rows) * cols, row = y * cols;
          for (let x = 0; x < cols; x++, i++) {
            const l = (x + cols - 1) % cols, r = (x + 1) % cols;
            const vx = P.vel * (psi[down + x] - psi[up + x]) * .5, vy = -P.vel * (psi[row + r] - psi[row + l]) * .5;
            const sx = (x - vx + cols) % cols, sy = (y - vy + rows) % rows;
            const x0 = sx | 0, y0 = sy | 0, fx = sx - x0, fy = sy - y0;
            const x1 = (x0 + 1) % cols, y1 = (y0 + 1) % rows, a = y0 * cols, b = y1 * cols;
            const d = (dye[a + x0] * (1 - fx) + dye[a + x1] * fx) * (1 - fy) + (dye[b + x0] * (1 - fx) + dye[b + x1] * fx) * fy;
            const faded = d * P.decay - FLOOR;
            next[i] = faded > 0 ? faded : 0;
          }
        }
        [dye, next] = [next, dye];
        if (Math.random() < SPLATS) splat();
      },
      field: () => dye,
    };
  },
});
