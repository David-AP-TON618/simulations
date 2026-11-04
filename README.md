# Simulations

Small simulations that run in the browser and draw themselves in 1-bit dots. Choose one, move its parameters, press Reload for a new start and new colours.

Open `index.html`. There is nothing to install or build.

| Simulation | What it does | Code |
|---|---|---|
| Gray-Scott | Two chemicals spread and react. (Pearson 1993) | [gray-scott.js](sims/gray-scott.js) |
| Lenia | A smooth cousin of the Game of Life. (Chan 2019) | [lenia.js](sims/lenia.js) |
| Flow | Dye carried by a slowly changing current. | [flow.js](sims/flow.js) |
| Lava | Blobs of wax drift, meet and melt together. | [lava.js](sims/lava.js) |
| Brian's Brain | Cells fire, rest, then can fire again. (Silverman) | [brain.js](sims/brain.js) |
| Slime mould | Agents follow their own trail and build a network. (Jones 2010) | [physarum.js](sims/physarum.js) |
| Cyclic spirals | Each state is eaten by the next one. (Griffeath) | [cyclic.js](sims/cyclic.js) |
| Ising magnet | Tiny magnets copy their neighbours while heat shakes them. (Ising 1925) | [ising.js](sims/ising.js) |
| Forest fire | Trees grow, lightning strikes, and fire spreads. (Drossel and Schwabl 1992) | [forest-fire.js](sims/forest-fire.js) |

## Add a simulation

Add a file in `sims/`, then a `<script>` line in `index.html`:

```js
Sims.register({
  id: 'noise', file: 'noise', name: 'Noise',
  desc: 'One short sentence.',
  cell: 4, fps: 15,                 // cell size in pixels (a multiple of 4), frames per second
  params: [{id: 'p', label: 'Density', min: 0, max: 1, step: .01, value: .5}],
  create(cols, rows) {
    const out = new Float32Array(cols * rows);
    return {
      step(P) { for (let i = 0; i < out.length; i++) out[i] = Math.random() < P.p ? 1 : 0; },
      field: () => out,             // values from 0 to 1, one per cell
    };
  },
});
```

The controls come from `params`. The current choice is kept in the address, so a link reopens the same simulation with the same parameters and colours.

MIT licence.
