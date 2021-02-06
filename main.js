import {hideHighScoresPanel, updateHighScores} from './highscores.js';
import Minesweeper from './Minesweeper.js';
import {createEl, El, formatMinSec0, formatMinSec2, SEC_PER_MS} from './util.js';
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
    if (timerRunning) {
      currentGameDuration = performance.now() - start;
      const newElapsedSeconds = Math.floor(currentGameDuration * SEC_PER_MS);
      if (newElapsedSeconds > elapsedSeconds) {
        elapsedSeconds = newElapsedSeconds;
        El.TIMER.innerText = formatMinSec0(newElapsedSeconds);
      }
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
    const winner = createEl('div', '', 'winner');
    winner.innerHTML = `WINNER<div>${formatMinSec2(currentGameDuration)}</div>`;
    El.BOARD_CONTAINER.appendChild(winner);
    return new Promise(resolve => {
      setTimeout(() => {
        updateHighScores(numCells, density, currentGameDuration).then(resolve);
      }, 500);
    });
  } else {
    El.BOARD_CONTAINER.appendChild(El.BOOM);
    return Promise.resolve();
  }
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
  // reset score tracking
  startInProgress = true;
  timerRunning = false;
  currentGameDuration = 0;
  hideHighScoresPanel(/* reset= */ true);
  // validate game parameters
  let numCells = El.NUM_CELLS_INPUT.value;
  if (!validateNumCells(numCells)) {
    numCells = El.NUM_CELLS_INPUT.value = 200;
  }
  let density = El.DENSITY_INPUT.value;
  if (!validateDensity(density)) {
    density = El.DENSITY_INPUT.value = 15;
  }
  // start game
  return (nextGame || Promise.resolve(new Minesweeper(new VoronoiCells())))
      .then(game => {
        nextGame = undefined;
        game.attachToDom();
        game.onStart(startTimer);
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
  const numCells = parseInt(El.NUM_CELLS_INPUT.value);
  if (validateNumCells(numCells)) {
    localStorage.voronoiMinesweeperNumCells = El.NUM_CELLS_INPUT.value;
  }
});
El.DENSITY_INPUT.addEventListener('change', () => {
  nextGame = undefined;
  const density = parseInt(El.DENSITY_INPUT.value);
  if (validateDensity(density)) {
    localStorage.voronoiMinesweeperDensity = El.DENSITY_INPUT.value;
  }
});

function validateNumCells(numCells) {
  return numCells > 0 && numCells < 0xffff;
}

function validateDensity(density) {
  return density > 0 && density < 90;
}

/**
 * enable changing metric via dropdown menu
 */
El.METRIC_SELECT.addEventListener('change', () => {
  window.location = '?metric=' + El.METRIC_SELECT.value;
});
