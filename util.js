// creates an element with the given text and CSS classes
export const createEl = (name, textContent, ...classNames) => {
  const el = document.createElement(name);
  el.innerText = textContent;
  el.classList.add(...classNames);
  return el;
};

// dom elements
export const El = {
  BACKDROP: document.getElementById('backdrop'),
  BOARD_CONTAINER: document.getElementById('board'),
  BOOM: createEl('div', 'BOOM', 'boom'),
  CELLS_KEY_SELECT: document.getElementById('cellsKey'),
  CONTROLS: document.getElementById('controls'),
  DENSITY_INPUT: document.getElementById('density'),
  DENSITY_KEY_SELECT: document.getElementById('densityKey'),
  FLAGS_EL: document.getElementById('numFlags'),
  HIGH_SCORES_PANEL: document.getElementById('highScoresPanel'),
  HIGH_SCORES_TABLE: document.getElementById('highScoresTable'),
  METRIC_SELECT: document.getElementById('metric'),
  MINES_EL: document.getElementById('numMines'),
  NUM_CELLS_INPUT: document.getElementById('numCells'),
  RESTART_BUTTON: document.getElementById('restart'),
  SCORE_CONTAINER: document.getElementById('scoreContainer'),
  TIMER: document.getElementById('timer'),
  VIEW_HIGH_SCORES: document.getElementById('viewHighScores'),
  WINNER: createEl('div', 'WINNER', 'winner'),
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

// formats time as min:sec
const SEC_PER_MS = 1 / 1000;
const MIN_PER_SEC = 1 / 60;
export const formatMinSec = (ms) => {
  const sec = Math.floor(ms * SEC_PER_MS);
  const min = Math.floor(sec * MIN_PER_SEC);
  return `${min}:${(sec % 60).toString().padStart(2, '0')}`;
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
export const pair = (x, y) => (x << 15) | y;
export const unpair = n => [n >> 15, n & MASK];

// guesses for the locations of cell borders
const borderGuessesMemo = new Map();
export const calculateBorderGuesses = (width, height, numCells) => {
  const key = `${width},${height},${numCells}`;
  let borderGuesses = borderGuessesMemo.get(key);
  if (borderGuesses !== undefined) {
    return borderGuesses;
  }
  const expectedCellsPerRow = Math.floor(Math.sqrt(width * numCells / height));
  borderGuesses = new Array(expectedCellsPerRow);
  for (let i = 0; i < expectedCellsPerRow; i++) {
    borderGuesses[i] = Math.round((i + 1) * width / expectedCellsPerRow) - 1;
  }
  borderGuessesMemo.set(key, borderGuesses);
  return borderGuesses;
};

/** smallest color offsets */
function ColorOffsets() {
  const r = 0x010000;
  const g = 0x000100;
  const b = 0x000001;
  const offsets = [0];
  let maxSetIndex = 0;
  this.get = function(numDistinct) {
    while (offsets.length < numDistinct) {
      // generate more
      const next = new Set();
      for (let i = maxSetIndex; i < offsets.length; i++) {
        const color = offsets[i];
        next.add(color + r);
        next.add(color + g);
        next.add(color + b);
      }
      maxSetIndex = offsets.length;
      offsets.push(...next);
    }
    return offsets;
  };
}

export const colorOffsets = new ColorOffsets();

export const HEX_MASK = 0xff;
export const hexToRgb =
    (hex) => [hex >> 16, (hex >> 8) & HEX_MASK, hex & HEX_MASK];
export const rgbToHex = (r, g, b) => (r << 16) | (g << 8) | b;

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
