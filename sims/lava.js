/* A lava lamp made of metaballs: blobs melt together when they get close. */
Sims.register({
  id: 'lava', file: 'lava', name: 'Lava',
  desc: 'Blobs of wax drift, meet and melt together.',
  cell: 4, fps: 30, warm: 0,
  params: [
    {id: 'blobs', label: 'Blobs', min: 3, max: 20, step: 1, value: 9, restart: true},
    {id: 'pace', label: 'Drift', min: .1, max: 2, step: .1, value: .4},
    {id: 'thresh', label: 'Tightness', min: .4, max: 1.4, step: .05, value: .85},
  ],
  presets: [
    {name: 'Busy', set: {blobs: 14, pace: .9, thresh: .85}},
    {name: 'Soft', set: {blobs: 9, pace: .4, thresh: .55}},
    {name: 'Big', set: {blobs: 5, pace: .3, thresh: .5}},
  ],
  create(cols, rows, P0) {
    const n = cols * rows, out = new Float32Array(n), unit = Math.min(rows / 16, cols / 96);
    const B = Array.from({length: P0.blobs}, () => ({
      x: Math.random() * cols, y: Math.random() * rows,
      vx: (Math.random() * 2 - 1) * .45 * unit, vy: (Math.random() * 2 - 1) * .2 * unit,
      r: (2.5 + Math.random() * 2.5) * unit,
    }));
    return {
      step(P) {
        for (const b of B) {
          b.x += b.vx * P.pace; b.y += b.vy * P.pace;
          if (b.x < 0 || b.x > cols) b.vx = -b.vx;
          if (b.y < 0 || b.y > rows) b.vy = -b.vy;
        }
      },
      field(P) {
        const low = .55, high = .85;
        for (let y = 0, i = 0; y < rows; y++) for (let x = 0; x < cols; x++, i++) {
          let f = 0;
          for (const b of B) { const dx = x - b.x, dy = y - b.y; f += b.r * b.r / (dx * dx + dy * dy + 1); }
          const q = (f / P.thresh - low) / (high - low);
          out[i] = q < 0 ? 0 : q > 1 ? 1 : q;
        }
        return out;
      },
    };
  },
});
