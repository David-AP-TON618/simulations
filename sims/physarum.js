/* Physarum, a slime mould model (Jones 2010): agents follow the trail they leave. */
Sims.register({
  id: 'physarum', file: 'physarum', name: 'Slime mould',
  desc: 'Thousands of agents follow their own trail and build a network.',
  cell: 4, fps: 30, warm: 200,
  params: [
    {id: 'agents', label: 'Agents', min: 1000, max: 12000, step: 500, value: 6000, restart: true},
    {id: 'angle', label: 'Sensor angle', min: 10, max: 90, step: 1, value: 45},
    {id: 'fade', label: 'Trail life', min: .8, max: .98, step: .01, value: .92},
  ],
  create(cols, rows, P0) {
    const n = cols * rows, N = P0.agents, DIST = 9, TURN = .785;
    let t = new Float32Array(n), t2 = new Float32Array(n);
    const out = new Float32Array(n);
    const X = new Float32Array(N), Y = new Float32Array(N), A = new Float32Array(N);
    for (let i = 0; i < N; i++) { X[i] = Math.random() * cols; Y[i] = Math.random() * rows; A[i] = Math.random() * 6.283; }
    const at = (x, y) => t[(((y | 0) + rows) % rows) * cols + (((x | 0) + cols) % cols)];
    return {
      step(P) {
        const sa = P.angle * Math.PI / 180;
        for (let i = 0; i < N; i++) {
          const a = A[i], x = X[i], y = Y[i];
          const f = at(x + Math.cos(a) * DIST, y + Math.sin(a) * DIST);
          const l = at(x + Math.cos(a - sa) * DIST, y + Math.sin(a - sa) * DIST);
          const r = at(x + Math.cos(a + sa) * DIST, y + Math.sin(a + sa) * DIST);
          if (f < l || f < r) A[i] += l > r ? -TURN : l < r ? TURN : (Math.random() < .5 ? -TURN : TURN);
          X[i] = (x + Math.cos(A[i]) + cols) % cols;
          Y[i] = (y + Math.sin(A[i]) + rows) % rows;
          t[(Y[i] | 0) * cols + (X[i] | 0)] += 1;
        }
        for (let y = 0, i = 0; y < rows; y++) {
          const u = ((y + rows - 1) % rows) * cols, m = y * cols, d = ((y + 1) % rows) * cols;
          for (let x = 0; x < cols; x++, i++) {
            const l = (x + cols - 1) % cols, r = (x + 1) % cols;
            t2[i] = (t[u + l] + t[u + x] + t[u + r] + t[m + l] + t[i] + t[m + r] + t[d + l] + t[d + x] + t[d + r]) / 9 * P.fade;
          }
        }
        [t, t2] = [t2, t];
      },
      field() {
        let mean = 0;
        for (let i = 0; i < n; i++) mean += t[i];
        const scale = n / (mean * 3 + 1e-6);
        for (let i = 0; i < n; i++) out[i] = Math.min(1, t[i] * scale);
        return out;
      },
    };
  },
});
