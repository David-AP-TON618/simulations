/* Brian Silverman's Brain: three states, and almost everything keeps moving. */
Sims.register({
  id: 'brain', file: 'brain', name: "Brian's Brain",
  desc: 'Cells fire, rest, then can fire again. Sparks race across the grid.',
  cell: 8, fps: 10, warm: 30,
  params: [
    {id: 'density', label: 'Start density', min: .05, max: .5, step: .01, value: .2, restart: true},
  ],
  create(cols, rows, P0) {
    const n = cols * rows, OFF = 0, FIRE = 1, REST = 2;
    let a = new Uint8Array(n), b = new Uint8Array(n);
    const out = new Float32Array(n);
    const seed = () => { for (let i = 0; i < n; i++) a[i] = Math.random() < P0.density ? FIRE : OFF; };
    seed();
    let alive = 1;
    return {
      step() {
        alive = 0;
        for (let y = 0, i = 0; y < rows; y++) {
          const u = ((y + rows - 1) % rows) * cols, m = y * cols, d = ((y + 1) % rows) * cols;
          for (let x = 0; x < cols; x++, i++) {
            const l = (x + cols - 1) % cols, r = (x + 1) % cols, s = a[i];
            let next = OFF;
            if (s === FIRE) next = REST;
            else if (s === OFF) {
              const c = (a[u + l] === FIRE) + (a[u + x] === FIRE) + (a[u + r] === FIRE) + (a[m + l] === FIRE)
                + (a[m + r] === FIRE) + (a[d + l] === FIRE) + (a[d + x] === FIRE) + (a[d + r] === FIRE);
              if (c === 2) next = FIRE;
            }
            b[i] = next;
            if (next === FIRE) alive++;
          }
        }
        [a, b] = [b, a];
      },
      after() { if (!alive) seed(); },
      field() {
        for (let i = 0; i < n; i++) out[i] = a[i] === FIRE ? 1 : a[i] === REST ? .4 : 0;
        return out;
      },
    };
  },
});
