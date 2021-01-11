// creates an element with the given text and CSS classes
const createMessageEl = (textContent, ...classNames) => {
  const el = document.createElement('div');
  el.innerText = textContent;
  el.classList.add(...classNames);
  return el;
};

// dom elements
export const El = {
  BOARD_CONTAINER: document.getElementById('board'),
  BOOM: createMessageEl('BOOM', 'boom'),
  DENSITY_INPUT: document.getElementById('density'),
  FLAGS_EL: document.getElementById('numFlags'),
  METRIC_SELECT: document.getElementById('metric'),
  MINES_EL: document.getElementById('numMines'),
  NUM_CELLS_INPUT: document.getElementById('numCells'),
  RESTART_BUTTON: document.getElementById('restart'),
  WINNER: createMessageEl('WINNER', 'winner'),
};

// random int in [0, n)
export const rand = (n) => Math.floor(Math.random() * n);

// Knuth shuffle
export const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    let j = rand(i + 1);
    let temp = arr[j];
    arr[j] = arr[i];
    arr[i] = temp;
  }
  return arr;
};

// distance function
const possibleMetics = {
  1: 1,
  2: 2,
  3: 3,
};
const metric =
    possibleMetics[new URLSearchParams(location.search).get('metric')] || 2;

export const dist = (metric == 1) ?
    // taxicab distance
    ((x1, y1, x2, y2) => Math.abs(x1 - x2) + Math.abs(y1 - y2)) :
    ((metric == 3) ? ((x1, y1, x2, y2) => {
      // cubic distance
      const dx = Math.abs(x1 - x2);
      const dy = Math.abs(y1 - y2);
      return dx * dx * dx + dy * dy * dy;
    }) :
                     ((x1, y1, x2, y2) => {
                       // euclidean distance
                       const dx = x1 - x2;
                       const dy = y1 - y2;
                       return dx * dx + dy * dy;
                     }));

// store two positive shorts in one int
// technically, x in [0, 2**16), y in [0, 2**15)
const MASK = 2 ** 15 - 1;
export const pair = (x, y) => (x << 15) + y;
export const unpair = n => [n >> 15, n & MASK];

/**
 * times the execution of a function
 */
export const stopwatch = (label, fn) => {
  const start = performance.now();
  Promise.resolve(fn()).then(() => {
    const duration = performance.now() - start;
    console.log(label, `${duration.toFixed(1)} ms`);
  });
};

/**
 * sorts a lattice of points by their distance from the origin, breaking ties by
 * comparing polar angles. the output array is of the form [x0, y0, x1, y1, ...]
 */
const LATTICE_RADIUS = 127;
export const sortLattice = () => {
  const name = 'sortedLattice' + metric;
  const serialized = localStorage[name];
  if (serialized) {
    return JSON.parse(serialized);
  } else {
    // clean up old version
    localStorage.removeItem('sortedLattice');
  }

  const quadrant = (x, y) => {
    if (x > 0 && y >= 0) return 1;
    if (x <= 0 && y > 0) return 2;
    if (x < 0 && y <= 0) return 3;
    if (x >= 0 && y < 0) return 4;
    return NaN;
  };

  const points = [];
  switch (metric) {
    case 1:
      for (let i = 0, x = -LATTICE_RADIUS; x <= LATTICE_RADIUS; x++) {
        const absX = Math.abs(x);
        const maxY = LATTICE_RADIUS - absX;
        for (let y = -maxY; y <= maxY; y++) {
          points[i++] = {x, y, n: absX + Math.abs(y), q: quadrant(x, y)};
        }
      }
      break;
    case 3:
      const r3 = LATTICE_RADIUS * LATTICE_RADIUS * LATTICE_RADIUS;
      for (let i = 0, x = -LATTICE_RADIUS; x <= LATTICE_RADIUS; x++) {
        const x3 = Math.abs(x * x * x);
        const maxY = Math.floor(Math.pow(Math.abs(r3 - x3), 1 / 3));
        for (let y = -maxY; y <= maxY; y++) {
          points[i++] = {x, y, n: x3 + Math.abs(y * y * y), q: quadrant(x, y)};
        }
      }
      break;
    case 2:
    default:
      const r2 = LATTICE_RADIUS * LATTICE_RADIUS;
      for (let i = 0, x = -LATTICE_RADIUS; x <= LATTICE_RADIUS; x++) {
        const x2 = x * x;
        const maxY = Math.floor(Math.sqrt(r2 - x2));
        for (let y = -maxY; y <= maxY; y++) {
          points[i++] = {x, y, n: x2 + y * y, q: quadrant(x, y)};
        }
      }
  }

  const compare = (A, B) => {
    if (A.n === B.n) {
      if (A.q === B.q) {
        return A.y * B.x - B.y * A.x;
      } else {
        return A.q - B.q;
      }
    } else {
      return A.n - B.n;
    }
  };

  const sortedLattice = points.sort(compare).flatMap(({x, y}) => [x, y]);
  setTimeout(() => {
    localStorage[name] = JSON.stringify(sortedLattice);
  }, 1000);

  return sortedLattice;
};
