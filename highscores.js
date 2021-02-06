import {createEl, El, formatMinSec2} from './util.js';

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

let mostRecentWinDate = NaN;


/**
 * renders a list of high scores
 */
const renderHighScoresTable = (scores) => {
  El.HIGH_SCORES_TABLE.innerHTML = '';
  let highlightedIndex, highlightedRow;
  for (let i = 0; i < scores.length; i++) {
    const score = scores[i];
    const tr = document.createElement('tr');
    tr.appendChild(createEl('td', i + 1));
    tr.appendChild(createEl('td', score.name));
    tr.appendChild(createEl('td', formatMinSec2(score.time)));
    tr.appendChild(
        createEl('td', new Date(score.date).toLocaleString(undefined, {
          dateStyle: 'short',
          timeStyle: 'short',
        })));
    if (score.date === mostRecentWinDate) {
      tr.classList.add('highlight');
      highlightedIndex = i;
      highlightedRow = tr;
    }
    El.HIGH_SCORES_TABLE.appendChild(tr);
  }
  if (highlightedRow && highlightedRow.scrollIntoView && highlightedIndex > 9) {
    setTimeout(
        () => highlightedRow.scrollIntoView({behavior: 'smooth', block: 'end'}),
        500);
  }
};


/**
 * displays the high scores
 */
const displayHighScoresPanel = (numCells, density) => {
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
  // render the selected list of scores
  if (scoresToRender) {
    El.CELLS_KEY_SELECT.value = numCells;
    El.DENSITY_KEY_SELECT.value = density;
    renderHighScoresTable(scoresToRender);
  }
  // constrain the table height to only show the top 10 scores without scrolling
  if (!El.TABLE_CONTAINER.style.maxHeight) {
    El.TABLE_CONTAINER.style.maxHeight =
        `${El.TABLE_CONTAINER.querySelector('tr').clientHeight * 11 + 1}px`;
  }
  document.body.classList.add('showHighScores');
};


/**
 * hides the high scores
 */
export const hideHighScoresPanel = (reset = false) => {
  document.body.classList.remove('showHighScores');
  if (reset) {
    mostRecentWinDate = NaN;
  }
};


/**
 * updates the high scores
 */
export const updateHighScores = (numCells, density, gameDuration) => {
  const densities = highScores[numCells] || (highScores[numCells] = {});
  const scores = densities[density] || (densities[density] = []);
  const time = Math.round(gameDuration || 0);
  // keep only the top 1000 scores
  if (scores.length < 1000 || time < scores[999].time) {
    const date = Date.now();
    return new Promise(resolve => {
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
          if (scores.length > 1000) {
            scores.length = 1000;
          }
          mostRecentWinDate = date;
          displayHighScoresPanel(numCells, density);
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
El.BACKDROP.addEventListener('click', () => hideHighScoresPanel());

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
