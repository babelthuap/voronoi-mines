import {El, rand, shuffle} from './util.js';


// colors
const CONCEALED = Uint8ClampedArray.of(187, 187, 187);
const REVEALED = Uint8ClampedArray.of(255, 255, 255);
const DEFAULT_LABEL_COLOR = '#010000';  // because R=0 is reserved for borders
const NUM_COLOR_MAP = {
  1: '#00d',
  2: '#0b0',
  3: '#d00',
  4: '#d0d',
  5: '#da0',
  6: '#009',
  7: '#080',
  8: '#900',
};


/**
 * Minesweeper-specific cell data
 */
function MinesweeperData(hasMine) {
  this.adjacentMines = 0;
  this.hasMine = hasMine;
  this.isFlagged = false;
  this.isRevealed = false;
  this.hover = false;
}
MinesweeperData.prototype.getColor = function() {
  const color = this.isRevealed ? REVEALED : CONCEALED;
  return this.hover ? color.map((val, i) => val - i * 32) : color;
};
MinesweeperData.prototype.getLabel = function() {
  if (this.isRevealed) {
    return this.hasMine ? '💣' : (this.adjacentMines || '');
  } else {
    return this.isFlagged ? 'F' : '';
  }
};
MinesweeperData.prototype.getLabelColor = function() {
  if (this.isRevealed && !this.hasMine) {
    return NUM_COLOR_MAP[this.adjacentMines] || DEFAULT_LABEL_COLOR;
  } else {
    return DEFAULT_LABEL_COLOR;
  }
};


/**
 * logic for a Minesweeper game on a grid of cells
 * the cell grid must implement:
 *   - attachToDom()
 *   - getSize()
 *   - getAdjacentIds(id)
 *   - renderCells([{id, color, label, labelColor}])
 *   - addListener(name, callback), where callback takes (event, cellId)
 */
export default function Minesweeper(cellGrid) {
  let gameInProgress = true;
  let isFirstMove = true;
  let numFlags = 0;
  let numMines;
  let tilesLeftToReveal;

  const startHandlers = [];
  const endHandlers = [];

  const updateCounters = () => {
    El.FLAGS_EL.innerText = numFlags;
    El.MINES_EL.innerText = numMines;
  };

  // init cell data map
  const cellData = (() => {
    // init mines locations
    const numCells = cellGrid.getSize();
    numMines = Math.min(
        Math.floor(parseInt(El.DENSITY_INPUT.value) * numCells / 100),
        numCells - 1);
    updateCounters();
    tilesLeftToReveal = numCells - numMines;
    // shuffle array to determine mine indices
    const mineIndices = new Array(numCells);
    for (let i = 0; i < numMines; ++i) {
      mineIndices[i] = true;
    }
    shuffle(mineIndices);
    // assign mine info while constructing the cell data map
    const cellData = [];
    for (let id = 0; id < cellGrid.getSize(); ++id) {
      const hasMine = mineIndices[id] === true;
      const data = new MinesweeperData(hasMine);
      cellData[id] = data;
    }
    // init cell labels
    for (let id = 0; id < cellData.length; ++id) {
      const data = cellData[id];
      for (const nbrId of cellGrid.getAdjacentIds(id)) {
        if (cellData[nbrId].hasMine) {
          ++data.adjacentMines;
        }
      }
    }
    return cellData;
  })();

  /**
   * swaps the mine in the given cell with a randomly selected open cell and
   * updates the cell labels accordingly
   */
  const swapMine = (originalId) => {
    let numOpenTiles = cellGrid.getSize() - numMines;
    let indexToSwap = rand(numOpenTiles);
    let i = 0;
    for (let id = 0; id < cellData.length; ++id) {
      const data = cellData[id];
      if (!data.hasMine) {
        if (i === indexToSwap) {
          data.hasMine = true;
          for (const nbrId of cellGrid.getAdjacentIds(id)) {
            ++cellData[nbrId].adjacentMines;
          }
          cellData[originalId].hasMine = false;
          for (const nbrId of cellGrid.getAdjacentIds(originalId)) {
            --cellData[nbrId].adjacentMines;
          }
          return;
        }
        ++i;
      }
    }
  };

  /**
   * renders the specified cells
   */
  const renderCells = (ids, showAllMines = false) => {
    const idColorLabelArr = [];
    for (const id of ids) {
      const data = cellData[id];
      let label = data.getLabel();
      if (showAllMines) {
        if (data.hasMine) {
          label = '💣';
        } else if (data.isFlagged) {
          label = '_';
        } else {
          continue;  // only need to update mines and false flags
        }
      }
      idColorLabelArr.push({
        id: id,
        color: data.getColor(),
        label: label,
        labelColor: data.getLabelColor(),
      });
    }
    cellGrid.renderCells(idColorLabelArr);
  };

  /**
   * toggles flag on a cell
   */
  const flag = (id) => {
    const data = cellData[id];
    if (!data.isRevealed) {
      data.isFlagged = !data.isFlagged;
      requestAnimationFrame(() => {
        renderCells([id]);
        numFlags += data.isFlagged ? 1 : -1;
        updateCounters();
      });
    }
  };

  /**
   * rock raiders (recursive helper for `reveal`)
   */
  const revealRecursive = (id, updatedIds = new Set()) => {
    const data = cellData[id];
    if (data.isRevealed) {
      return;
    }
    if (data.isFlagged) {
      data.isFlagged = false;
      --numFlags;
    }
    data.isRevealed = true;
    --tilesLeftToReveal;
    updatedIds.add(id);
    if (data.adjacentMines === 0) {
      // a new cavern has been discovered
      for (const nbrId of cellGrid.getAdjacentIds(id)) {
        if (!updatedIds.has(nbrId)) {
          revealRecursive(nbrId, updatedIds);
        }
      }
    }
    return updatedIds;
  };

  /**
   * handles revealing a cell
   */
  const reveal = (clickedId) => {
    const data = cellData[clickedId];
    if (data.isRevealed || data.isFlagged) {
      return;
    }
    if (data.hasMine) {
      if (isFirstMove) {
        // don't allow player to lose on the first move
        swapMine(clickedId);
      } else {
        gameInProgress = false;
        requestAnimationFrame(() => {
          data.isRevealed = true;
          renderCells(cellData.keys(), /* showAllMines= */ true);
        });
        endHandlers.forEach(fn => fn(false));
        return;
      }
    }
    if (isFirstMove) {
      isFirstMove = false;
      startHandlers.forEach(fn => fn());
    }
    const updatedIds = revealRecursive(clickedId);
    renderCells(updatedIds);
    updateCounters();
    if (tilesLeftToReveal === 0) {
      gameInProgress = false;
      endHandlers.forEach(fn => fn(true));
    }
  };

  /**
   * handles hover
   */
  let hoverId = null;
  let hoverRenderPromise = null;
  cellGrid.addListener('mousemove', (event, cellId) => {
    if (cellId === hoverId || cellId === null || hoverRenderPromise ||
        !gameInProgress) {
      return;
    }
    hoverRenderPromise = new Promise((resolve) => {
      const updatedIds = new Set();
      // reset old hover cells
      if (hoverId !== null) {
        cellData[hoverId].hover = false;
        updatedIds.add(hoverId);
        for (const nbrId of cellGrid.getAdjacentIds(hoverId)) {
          cellData[nbrId].hover = false;
          updatedIds.add(nbrId);
        }
      }
      // highlight new hover cells
      const hoverCellData = cellData[cellId];
      hoverCellData.hover = true;
      updatedIds.add(cellId);
      for (const nbrId of cellGrid.getAdjacentIds(cellId)) {
        cellData[nbrId].hover = true;
        if (updatedIds.has(nbrId)) {
          // we just un-highlighted and are now trying to re-highlight. the net
          // effect is to do nothing; hence, no need to update this cell.
          updatedIds.delete(nbrId);
        } else {
          updatedIds.add(nbrId);
        }
      }
      requestAnimationFrame(() => {
        // update cursor to indicate whether user can reveal cell
        if (hoverCellData.isRevealed || hoverCellData.isFlagged) {
          El.BOARD_CONTAINER.classList.remove('pointer');
        } else {
          El.BOARD_CONTAINER.classList.add('pointer');
        }
        renderCells(updatedIds);
        hoverId = cellId;
        resolve();
        hoverRenderPromise = null;
      });
    });
  });

  /**
   * disables hover highlight when mouse leaves board
   */

  cellGrid.addListener('mouseleave', () => {
    if (!gameInProgress) {
      return;
    }
    Promise.resolve(hoverRenderPromise).then(() => {
      const updatedIds = new Set();
      // reset old hover cells
      if (hoverId !== null) {
        cellData[hoverId].hover = false;
        updatedIds.add(hoverId);
        for (const nbrId of cellGrid.getAdjacentIds(hoverId)) {
          cellData[nbrId].hover = false;
          updatedIds.add(nbrId);
        }
        // re-render
        renderCells(updatedIds);
        // reset cursor
        El.BOARD_CONTAINER.classList.remove('pointer');
        // reset hoverId
        hoverId = null;
      }
    });
  });

  /**
   * handles clicks
   */
  cellGrid.addListener('mousedown', (event, cellId) => {
    if (!gameInProgress) {
      return;
    }
    // left or right click?
    if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey) {
      flag(cellId);
    } else {
      reveal(cellId);
    }
    if (hoverId !== null) {
      // update cursor to indicate whether user can reveal cell
      const hoverCellData = cellData[cellId];
      if (hoverCellData.isRevealed || hoverCellData.isFlagged) {
        El.BOARD_CONTAINER.classList.remove('pointer');
      } else {
        El.BOARD_CONTAINER.classList.add('pointer');
      }
    }
  });

  // disable pointer on game end
  endHandlers.push(() => {
    requestAnimationFrame(() => {
      El.BOARD_CONTAINER.classList.remove('pointer');
    });
  });

  return {
    attachToDom() {
      cellGrid.attachToDom();
    },
    onStart(fn) {
      startHandlers.push(fn);
    },
    onEnd(fn) {
      endHandlers.push(fn);
    },
  };
}
