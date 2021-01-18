import Minesweeper from './Minesweeper.js';
import {updateHighScores, hideHighScoresPanel} from './highscores.js';
import {createEl, El, formatMinSec} from './util.js';
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


// TEST
// setTimeout(() => {
//   let times = [];
//   for (let i = 0; i < 25; i++) {
//     let s = performance.now();
//     new VoronoiCells();
//     times.push(performance.now() - s);
//   }
//   console.log('times:', times);
//   console.log(
//       'avg', (times.reduce((sum, t) => sum + t, 0) / times.length).toFixed(0));
// }, 10);


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
