import Minesweeper from './Minesweeper.js';
import {updateHighScores, hideHighScoresPanel} from './highscores.js';
import {createEl, El, formatMinSec, stopwatch} from './util.js';
import VoronoiCells from './VoronoiCells.js';

let timerRunning = false;
let currentGameDuration;


/**
 * starts the game timer
 */
const startTimer = () => {
  timerRunning = true;
  const start = performance.now();
  let formattedTime = '0:00';
  const updateTimer = () => {
    currentGameDuration = performance.now() - start;
    let newFormattedTime = formatMinSec(currentGameDuration);
    if (newFormattedTime !== formattedTime) {
      El.TIMER.innerText = newFormattedTime;
      formattedTime = newFormattedTime;
    }
    if (timerRunning) {
      requestAnimationFrame(updateTimer);
    }
  };
  requestAnimationFrame(updateTimer);
};


/**
 * handles the end of a game
 */
const handleGameEnd = (win, numCells, density) => {
  timerRunning = false;
  if (win) {
    updateHighScores(numCells, density, currentGameDuration);
  }
};


/**
 * starts a new game
 */
let startInProgress = false;
const start = () => {
  if (startInProgress) {
    return;
  }
  startInProgress = true;
  timerRunning = false;
  currentGameDuration = 0;
  hideHighScoresPanel();
  stopwatch('initialize new game', () => {
    console.log('\n### START NEW GAME ###');
    return new Promise((resolve) => {
      const cellGrid = new VoronoiCells();
      const game = new Minesweeper(cellGrid);
      game.onStart(startTimer);
      const numCells = El.NUM_CELLS_INPUT.value;
      const density = El.DENSITY_INPUT.value;
      game.onEnd(win => handleGameEnd(win, numCells, density));
      requestAnimationFrame(() => {
        startInProgress = false;
        El.TIMER.innerText = '0:00';
      });
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
