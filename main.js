import {hideHighScoresPanel, updateHighScores} from './highscores.js';
import Minesweeper from './Minesweeper.js';
import {createEl, El, formatMinSec0, SEC_PER_MS} from './util.js';
import VoronoiCells from './VoronoiCells.js';

let timerRunning = false;
let currentGameDuration;

/**
 * starts the game timer
 */
const startTimer = () => {
  timerRunning = true;
  const start = performance.now();
  let elapsedSeconds = 0;
  const updateTimer = () => {
    currentGameDuration = performance.now() - start;
    const newElapsedSeconds = Math.floor(currentGameDuration * SEC_PER_MS);
    if (newElapsedSeconds > elapsedSeconds) {
      elapsedSeconds = newElapsedSeconds;
      El.TIMER.innerText = formatMinSec0(newElapsedSeconds);
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
  return win ? updateHighScores(numCells, density, currentGameDuration) :
               Promise.resolve();
};

// pre-rendered next game
let nextGame = undefined;

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
  return (nextGame || Promise.resolve(new Minesweeper(new VoronoiCells())))
      .then(game => {
        nextGame = undefined;
        game.attachToDom();
        game.onStart(startTimer);
        const numCells = El.NUM_CELLS_INPUT.value;
        const density = El.DENSITY_INPUT.value;
        game.onEnd(win => {
          handleGameEnd(win, numCells, density).then(() => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                // pre-render next game
                nextGame = Promise.resolve(new Minesweeper(new VoronoiCells()));
              });
            });
          });
        });
        requestAnimationFrame(() => {
          startInProgress = false;
          El.TIMER.innerText = '0:00';
        });
      });
};

// initialize the first game on page load
start();

/**
 * listen for inputs that trigger a new game
 */
const handleInputKeypress = (event) => {
  if (event.key === 'Enter') {
    nextGame = undefined;
    start();
  }
};
El.NUM_CELLS_INPUT.addEventListener('keypress', handleInputKeypress);
El.DENSITY_INPUT.addEventListener('keypress', handleInputKeypress);
El.RESTART_BUTTON.addEventListener('click', start);
window.addEventListener('keydown', event => {
  switch (event.key) {
    case 's':
      start();
      break;
    case 'Escape':
      hideHighScoresPanel();
      break;
  }
});

/**
 * persist # cells and density %
 */
El.NUM_CELLS_INPUT.addEventListener('change', () => {
  nextGame = undefined;
  localStorage.voronoiMinesweeperNumCells = El.NUM_CELLS_INPUT.value;
});
El.DENSITY_INPUT.addEventListener('change', () => {
  nextGame = undefined;
  localStorage.voronoiMinesweeperDensity = El.DENSITY_INPUT.value;
});
window.addEventListener('resize', () => {
  nextGame = undefined;
});

/**
 * enable changing metric via dropdown menu
 */
El.METRIC_SELECT.addEventListener('change', () => {
  window.location = '?metric=' + El.METRIC_SELECT.value;
});
