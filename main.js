(() => {
'use strict';

// imports
const floor = Math.floor;
const min = Math.min;

// creates an element with the given text and CSS classes
const createMessageEl = (textContent, ...classNames) => {
  const el = document.createElement('div');
  el.innerText = textContent;
  el.classList.add(...classNames);
  return el;
};

// elements
const BOARD_CONTAINER = document.getElementById('board');
const DENSITY_INPUT = document.getElementById('density');
const NUM_CELLS_INPUT = document.getElementById('numCells');
const RESTART_BUTTON = document.getElementById('restart');
const FLAGS_EL = document.getElementById('numFlags');
const MINES_EL = document.getElementById('numMines');
const BOOM = createMessageEl('BOOM', 'boom');
const WINNER = createMessageEl('WINNER', 'winner');

// colors
const BORDER = [0, 0, 0];
const CONCEALED = [187, 187, 187];
const HOVER = [170, 170, 170];
const REVEALED = [255, 255, 255];
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

// random int in [0, n)
const rand = (n) => floor(Math.random() * n);

// Knuth shuffle
const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    let j = rand(i + 1);
    let temp = arr[j];
    arr[j] = arr[i];
    arr[i] = temp;
  }
  return arr;
};

// taxicab distance
const dist1 = (x1, y1, x2, y2) => {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
};
// Euclidean distance
const dist2 = (x1, y1, x2, y2) => {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
};
// cubic distance
const dist3 = (x1, y1, x2, y2) => {
  const dx = Math.abs(x1 - x2);
  const dy = Math.abs(y1 - y2);
  return dx * dx * dx + dy * dy * dy;
};

// store two positive shorts in one int
// technically, x in [0, 2**16), y in [0, 2**15)
const MASK = 2 ** 15 - 1;
const pair = (x, y) => (x << 15) + y;
const unpair = n => [n >> 15, n & MASK];

// times the execution of a function
const stopwatch = (label, fn) => {
  const start = performance.now();
  Promise.resolve(fn()).then(() => {
    const duration = performance.now() - start;
    console.log(label, `${duration.toFixed(1)} ms`);
  });
};


// a canvas that fills the board container and whose pixels can be written to
// individually
function Bitmap() {
  // fill the entire container
  const width = BOARD_CONTAINER.offsetWidth;
  const height = BOARD_CONTAINER.offsetHeight;

  // create the canvas element
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#bbb';
  ctx.fillRect(0, 0, width, height);
  let imageData = ctx.getImageData(0, 0, width, height);
  ctx.font = `${24}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // attach to dom
  [...BOARD_CONTAINER.children].forEach((child) => child.remove());
  BOARD_CONTAINER.appendChild(canvas);

  // disable context menu so we can handle right click
  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    return false;
  });

  // methods
  return {
    get width() {
      return width;
    },

    get height() {
      return height;
    },

    repaint() {
      ctx.putImageData(imageData, 0, 0);
    },

    rasterize() {
      imageData = ctx.getImageData(0, 0, width, height);
    },

    setPixel(x, y, rgb) {
      const red = 4 * (x + width * y);
      imageData.data[red] = rgb[0];
      imageData.data[red + 1] = rgb[1];
      imageData.data[red + 2] = rgb[2];
    },

    fillText(text, color, x, y) {
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    },

    addEventListener(...args) {
      canvas.addEventListener(...args);
    },
  };
}


const NBR_OFFSETS = [[0, 1], [1, 1], [1, 0]];  // right, down, & diagonal

// a rendered set of cells with adjacency determined by voronoi rules
function VoronoiCells() {
  // init bitmap
  const bitmap = new Bitmap();

  // place cells
  const cells = (() => {
    const cells = new Map();
    const numCells = parseInt(NUM_CELLS_INPUT.value);
    while (cells.size < numCells) {
      const x = rand(bitmap.width);
      const y = rand(bitmap.height);
      const id = pair(x, y);
      cells.set(id, {
        rows: new Map(),
        neighbors: new Set(),
        geometricCenter: new Array(2),
      });
    }
    return cells;
  })();

  // color cells
  // TODO: optimize the heck out of this
  const coordsToCellId = (() => {
    const coordsToCellId = new Array(bitmap.height);
    for (let y = 0; y < bitmap.height; y++) {
      coordsToCellId[y] = new Array(bitmap.width);
      for (let x = 0; x < bitmap.width; x++) {
        let closestId;
        let minDistance = Infinity;
        for (const id of cells.keys()) {
          const [idX, idY] = unpair(id);
          const d = dist3(x, y, idX, idY);
          if (d < minDistance) {
            minDistance = d;
            closestId = id;
          }
        }
        coordsToCellId[y][x] = closestId;
        if (y < bitmap.height - 1 && x < bitmap.width - 1) {
          const rowsMap = cells.get(closestId).rows;
          if (rowsMap.has(y)) {
            rowsMap.get(y).push(x);
          } else {
            rowsMap.set(y, [x]);
          }
        }
      }
    }
    return coordsToCellId;
  })();

  // detect borders and neighbors
  const borderPixels = (() => {
    const borderPixels = new Set();
    for (let y = 0; y < bitmap.height - 1; y++) {
      for (let x = 0; x < bitmap.width - 1; x++) {
        const id = coordsToCellId[y][x];
        for (const [dx, dy] of NBR_OFFSETS) {
          const nbrX = x + dx;
          const nbrY = y + dy;
          const nbrId = coordsToCellId[nbrY][nbrX];
          if (nbrId !== id) {
            borderPixels.add(pair(x, y));
            bitmap.setPixel(x, y, BORDER);
            cells.get(id).neighbors.add(nbrId);
            cells.get(nbrId).neighbors.add(id);
          }
        }
      }
    }
    const rightEdge = bitmap.width - 1;
    for (let y = 0; y < bitmap.height; y++) {
      bitmap.setPixel(rightEdge, y, BORDER);
    }
    const bottomEdge = bitmap.height - 1;
    for (let x = 0; x < bitmap.width - 1; x++) {
      bitmap.setPixel(x, bottomEdge, BORDER);
    }
    bitmap.repaint();
    return borderPixels;
  })();

  // calculate geometric centers
  setTimeout(() => {
    stopwatch('calculate geometric centers', () => {
      for (const [id, {rows, geometricCenter}] of cells.entries()) {
        let num = 0;
        let xTotal = 0;
        let yTotal = 0;
        for (const [y, row] of rows.entries()) {
          num += row.length;
          xTotal += row.length * (row.length + 2 * row[0] - 1) / 2;
          yTotal += y * row.length;
        }
        geometricCenter[0] = Math.round(xTotal / num);
        geometricCenter[1] = Math.round(yTotal / num);
      }
    });
  }, 0);

  // methods
  return {
    getSize() {
      return cells.size;
    },

    getIds() {
      return cells.keys();
    },

    getAdjacentIds(id) {
      return cells.get(id).neighbors;
    },

    renderCells(idColorLabelArr) {
      // color backgrounds
      for (const {id, color} of idColorLabelArr) {
        for (const [y, row] of cells.get(id).rows.entries()) {
          for (const x of row) {
            if (!borderPixels.has(pair(x, y))) {
              bitmap.setPixel(x, y, color);
            }
          }
        }
      }
      bitmap.repaint();

      // print labels, if necessary
      let labelPrinted = false;
      for (const {id, label, labelColor} of idColorLabelArr) {
        if (label) {
          const [x, y] = cells.get(id).geometricCenter;
          bitmap.fillText(label, labelColor, x, y);
          labelPrinted = true;
        }
      }
      if (labelPrinted) {
        bitmap.rasterize();
      }
    },

    addListener(name, callback) {
      bitmap.addEventListener(name, (event) => {
        if (event.layerX < bitmap.width && event.layerY < bitmap.height) {
          const cell = coordsToCellId[event.layerY][event.layerX];
          callback(event, cell);
        }
      });
    }
  };
}


// Minesweeper-specific cell data
function MinesweeperData(hasMine) {
  this.adjacentMines = 0;
  this.hasMine = hasMine;
  this.isFlagged = false;
  this.isRevealed = false;
  this.hover = false;
}
MinesweeperData.prototype.getColor = function() {
  const color = this.isRevealed ? REVEALED : CONCEALED;
  return this.hover ? [color[0], color[1] - 32, color[2] - 64] : color
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
    return NUM_COLOR_MAP[this.adjacentMines] || '#000';
  } else {
    return '#000';
  }
};


// logic for a Minesweeper game on a grid of cells
// the cell grid must implement:
//   - getSize()
//   - getIds()
//   - getAdjacentIds(id)
//   - renderCells([{id, color, label}])
//   - addListener(name, callback), where callback takes (event, cellId)
function Minesweeper(cellGrid) {
  this.gameInProgress = true;
  let numFlags = 0;
  let numMines;
  let tilesLeftToReveal;

  const updateCounters = () => {
    FLAGS_EL.innerText = numFlags;
    MINES_EL.innerText = numMines;
  };

  // init cell data map
  const cellData = (() => {
    // init mines locations
    const numCells = cellGrid.getSize();
    numMines = min(
        floor(parseInt(DENSITY_INPUT.value) * numCells / 100), numCells - 1);
    updateCounters();
    tilesLeftToReveal = numCells - numMines;
    // shuffle array to determine mine indices
    const mineIndices = new Array(numCells).fill(false);
    for (let i = 0; i < numMines; i++) {
      mineIndices[i] = true;
    }
    shuffle(mineIndices);
    // assign mine info while constructing the cell data map
    const cellData = new Map();
    let i = 0;
    for (const id of cellGrid.getIds()) {
      const hasMine = mineIndices[i++];
      const data = new MinesweeperData(hasMine);
      cellData.set(id, data);
    }
    // init cell labels
    for (const [id, data] of cellData) {
      for (const nbrId of cellGrid.getAdjacentIds(id)) {
        if (cellData.get(nbrId).hasMine) {
          data.adjacentMines++;
        }
      }
    }
    return cellData;
  })();

  // toggle flag
  const flag = (id) => {
    const data = cellData.get(id);
    if (!data.isRevealed) {
      data.isFlagged = !data.isFlagged;
      cellGrid.renderCells([{
        id: id,
        color: data.getColor(),
        label: data.getLabel(),
        labelColor: data.getLabelColor(),
      }]);
      numFlags += data.isFlagged ? 1 : -1;
      updateCounters();
    }
  };

  // rock raiders
  const revealRecursive = (id, updatedIds = new Set()) => {
    const data = cellData.get(id);
    if (data.isRevealed) {
      return;
    }
    if (data.isFlagged) {
      data.isFlagged = false;
      numFlags--;
    }
    data.isRevealed = true;
    tilesLeftToReveal--;
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

  const reveal = (clickedId) => {
    const data = cellData.get(clickedId);
    if (data.isRevealed || data.isFlagged) {
      return;
    }
    if (data.hasMine) {
      // TODO: don't allow player to lose on the first move
      data.isRevealed = true;
      cellGrid.renderCells([{
        id: clickedId,
        color: data.getColor(),
        label: data.getLabel(),
        labelColor: data.getLabelColor(),
      }]);
      this.gameInProgress = false;
      BOARD_CONTAINER.appendChild(BOOM);
      return;
    }
    const updatedIds = revealRecursive(clickedId);
    const idColorLabelArr = [...updatedIds].map(id => {
      const data = cellData.get(id);
      return {
        id: id,
        color: data.getColor(),
        label: data.getLabel(),
        labelColor: data.getLabelColor(),
      };
    });
    cellGrid.renderCells(idColorLabelArr);
    updateCounters();
    if (tilesLeftToReveal === 0) {
      this.gameInProgress = false;
      BOARD_CONTAINER.appendChild(WINNER);
    }
  };

  // handle hover
  let hoverId = null;
  cellGrid.addListener('mousemove', (event, cellId) => {
    if (cellId === hoverId) {
      return;
    }
    stopwatch('hover', () => {
      const updatedIds = new Set();
      // reset old hover cells
      if (hoverId !== null) {
        cellData.get(hoverId).hover = false;
        updatedIds.add(hoverId);
        for (const nbrId of cellGrid.getAdjacentIds(hoverId)) {
          cellData.get(nbrId).hover = false;
          updatedIds.add(nbrId);
        }
      }
      // highlight new hover cells
      const hoverCellData = cellData.get(cellId);
      hoverCellData.hover = true;
      updatedIds.add(cellId);
      for (const nbrId of cellGrid.getAdjacentIds(cellId)) {
        cellData.get(nbrId).hover = true;
        if (updatedIds.has(nbrId)) {
          // we just un-highlighted and are now trying to re-highlight. the net
          // effect is to do nothing; hence, no need to update this cell.
          updatedIds.delete(nbrId);
        } else {
          updatedIds.add(nbrId);
        }
      }
      // update cursor to indicate whether user can reveal tile
      if (hoverCellData.isRevealed || hoverCellData.isFlagged) {
        BOARD_CONTAINER.classList.remove('pointer');
      } else {
        BOARD_CONTAINER.classList.add('pointer');
      }
      // re-render all updated cells
      const idColorLabelArr = [...updatedIds].map(id => {
        const data = cellData.get(id);
        return {
          id: id,
          color: data.getColor(),
          label: data.getLabel(),
          labelColor: data.getLabelColor(),
        };
      });
      cellGrid.renderCells(idColorLabelArr);
      hoverId = cellId;
    });
  });

  // handle clicks
  cellGrid.addListener('mousedown', (event, cellId) => {
    if (this.gameInProgress) {
      stopwatch('handle click', () => {
        // left or right click?
        if (event.button !== 0 || event.altKey || event.ctrlKey ||
            event.metaKey) {
          flag(cellId);
        } else {
          reveal(cellId);
        }
        // update cursor to indicate whether user can reveal tile
        if (hoverId !== null) {
          const hoverCellData = cellData.get(cellId);
          if (hoverCellData.isRevealed || hoverCellData.isFlagged) {
            BOARD_CONTAINER.classList.remove('pointer');
          } else {
            BOARD_CONTAINER.classList.add('pointer');
          }
        }
      });
    }
  });
}


// handle the game start/stop
let startInProgress = false;
const start = () => {
  if (startInProgress) {
    return;
  }
  startInProgress = true;
  stopwatch('initialize new game', () => {
    const cellGrid = new VoronoiCells();
    const game = new Minesweeper(cellGrid);
    startInProgress = false;
  });
};
const handleInputKeypress = (event) => {
  if (event.key === 'Enter') start();
};
NUM_CELLS_INPUT.addEventListener('keypress', handleInputKeypress);
DENSITY_INPUT.addEventListener('keypress', handleInputKeypress);
RESTART_BUTTON.addEventListener('click', start);
window.addEventListener('keydown', event => {
  if (event.key === 's') start();
});
start();
})();
