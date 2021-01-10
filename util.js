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
const metric = new URLSearchParams(location.search).get('metric');
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

// time the execution of a function
export const stopwatch = (label, fn) => {
  const start = performance.now();
  Promise.resolve(fn()).then(() => {
    const duration = performance.now() - start;
    console.log(label, `${duration.toFixed(1)} ms`);
  });
};
