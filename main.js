import Minesweeper from './Minesweeper.js';
import {El, stopwatch} from './util.js';
import VoronoiCells from './VoronoiCells.js';

/**
 * starts a new game
 */
let startInProgress = false;
const start = () => {
  if (startInProgress) {
    return;
  }
  startInProgress = true;
  stopwatch('initialize new game', () => {
    console.log('\n### START NEW GAME ###');
    return new Promise((resolve) => {
      const cellGrid = new VoronoiCells();
      const game = new Minesweeper(cellGrid);
      requestAnimationFrame(() => startInProgress = false);
      resolve();
    });
  });
};

// initialize the first game on page load
start();

/**
 * listen for inputs that trigger a new game
 */
const handleInputKeypress = (event) => {
  if (event.key === 'Enter') start();
};
El.NUM_CELLS_INPUT.addEventListener('keypress', handleInputKeypress);
El.DENSITY_INPUT.addEventListener('keypress', handleInputKeypress);
El.RESTART_BUTTON.addEventListener('click', start);
window.addEventListener('keydown', event => {
  if (event.key === 's') start();
});

/**
 * persist # cells and density %
 */
El.NUM_CELLS_INPUT.addEventListener('change', () => {
  localStorage.voronoiMinesweeperNumCells = El.NUM_CELLS_INPUT.value;
});
El.DENSITY_INPUT.addEventListener('change', () => {
  localStorage.voronoiMinesweeperDensity = El.DENSITY_INPUT.value;
});


/**
 * enable changing metric via dropdown menu
 */
El.METRIC_SELECT.addEventListener('change', () => {
  window.location = '?metric=' + El.METRIC_SELECT.value;
});
