import Minesweeper from './Minesweeper.js';
import {El, stopwatch} from './util.js';
import VoronoiCells from './VoronoiCells.js';

// start a new game
let startInProgress = false;
const start = () => {
  if (startInProgress) {
    return;
  }
  stopwatch('initialize new game', () => {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        El.BOARD_CONTAINER.innerHTML = '<center><h1>loading...</h1></center>';
        requestAnimationFrame(() => {
          startInProgress = true;
          const cellGrid = new VoronoiCells();
          const game = new Minesweeper(cellGrid);
          requestAnimationFrame(() => startInProgress = false);
          resolve();
        });
      });
    });
  });
};

start();

const handleInputKeypress = (event) => {
  if (event.key === 'Enter') start();
};
El.NUM_CELLS_INPUT.addEventListener('keypress', handleInputKeypress);
El.DENSITY_INPUT.addEventListener('keypress', handleInputKeypress);
El.RESTART_BUTTON.addEventListener('click', start);
window.addEventListener('keydown', event => {
  if (event.key === 's') start();
});
