import {createEl, El, formatMinSec} from './util.js';

const highScores = localStorage.voronoiMinesweeperHighScores ?
    JSON.parse(localStorage.voronoiMinesweeperHighScores) :
    {
      200: {
        15: [
          {time: 113530, date: 1610433291132, name: 'Nicholas'},
          {time: 120703, date: 1610432637986, name: 'Nicholas'},
          {time: 133804, date: 1610433915576, name: 'Nicholas'},
        ],
      },
    };
let name = localStorage.voronoiMinesweeperName;


/**
 * renders a list of high scores
 */
const renderHighScoresTable = (scores, date) => {
  El.HIGH_SCORES_TABLE.innerHTML = '';
  for (let i = 0; i < scores.length; i++) {
    const score = scores[i];
    const tr = document.createElement('tr');
    tr.appendChild(createEl('td', i + 1));
    tr.appendChild(createEl('td', score.name));
    const formattedTime = formatMinSec(score.time) +
        ((score.time / 1000) % 1).toFixed(2).slice(1);
    tr.appendChild(createEl('td', formattedTime));
    tr.appendChild(
        createEl('td', new Date(score.date).toLocaleString(undefined, {
          dateStyle: 'short',
          timeStyle: 'short',
        })));
    if (date === score.date) {
      tr.classList.add('highlight');
    }
    El.HIGH_SCORES_TABLE.appendChild(tr);
  }
};


/**
 * displays the high scores
 */
const displayHighScoresPanel = (numCells, density, date) => {
  El.CELLS_KEY_SELECT.innerHTML = '';
  El.DENSITY_KEY_SELECT.innerHTML = '';
  let scoresToRender;
  let isNumCellsValid = numCells in highScores;
  const sortedEntries = Object.entries(highScores).sort((a, b) => a[0] - b[0]);
  for (const [n, densities] of sortedEntries) {
    if (!isNumCellsValid) {
      numCells = n;
      isNumCellsValid = true;
    }
    // update cellKey select menu
    const cellsKeyOption = createEl('option', n);
    cellsKeyOption.value = n;
    El.CELLS_KEY_SELECT.appendChild(cellsKeyOption);
    // if this cellKey is selected, then render all its associated density keys
    if (n == numCells) {
      let isDensityValid = density in densities;
      const sortedDensities =
          Object.entries(densities).sort((a, b) => a[0] - b[0]);
      for (const [d, scores] of sortedDensities) {
        if (!isDensityValid) {
          density = d;
          isDensityValid = true;
        }
        const densityOption = createEl('option', d);
        densityOption.value = d;
        if (d == density) {
          scoresToRender = scores;
        }
        El.DENSITY_KEY_SELECT.appendChild(densityOption);
      }
    }
  }
  if (scoresToRender) {
    El.CELLS_KEY_SELECT.value = numCells;
    El.DENSITY_KEY_SELECT.value = density;
    renderHighScoresTable(scoresToRender, date);
  }
  document.body.classList.add('showHighScores');
};


/**
 * hides the high scores
 */
export const hideHighScoresPanel = () => {
  document.body.classList.remove('showHighScores');
};


/**
 * updates the high scores
 */
export const updateHighScores = (numCells, density, gameDuration) => {
  const densities = highScores[numCells] || (highScores[numCells] = {});
  const scores = densities[density] || (densities[density] = []);
  const time = Math.round(gameDuration || 0);
  if (scores.length < 10 || time < scores[9].time) {
    return new Promise(resolve => {
      const date = Date.now();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!name) {
            name = prompt('your name?');
          }
          if (name) {
            localStorage.voronoiMinesweeperName = name;
          }
          scores.push({time, date, name: name || '[anonymous]'});
          scores.sort((a, b) => (a.time - b.time) || (a.date - b.date));
          if (scores.length > 10) {
            scores.length = 10;
          }
          displayHighScoresPanel(numCells, density, date);
          localStorage.voronoiMinesweeperHighScores =
              JSON.stringify(highScores);
          resolve();
        });
      });
    });
  } else {
    return Promise.resolve();
  }
};

// enable animation
El.HIGH_SCORES_PANEL.classList.add('ease-transition');

// open and close panel
El.VIEW_HIGH_SCORES.addEventListener('click', () => {
  displayHighScoresPanel(El.NUM_CELLS_INPUT.value, El.DENSITY_INPUT.value);
});
El.HIGH_SCORES_PANEL.querySelector('.close').addEventListener('click', () => {
  hideHighScoresPanel();
});
El.BACKDROP.addEventListener('click', hideHighScoresPanel);

// change table within panel
El.CELLS_KEY_SELECT.addEventListener('change', () => {
  requestAnimationFrame(() => {
    displayHighScoresPanel(El.CELLS_KEY_SELECT.value, /* density= */ null);
  });
});
El.DENSITY_KEY_SELECT.addEventListener('change', () => {
  requestAnimationFrame(() => {
    displayHighScoresPanel(
        El.CELLS_KEY_SELECT.value, El.DENSITY_KEY_SELECT.value);
  });
});
