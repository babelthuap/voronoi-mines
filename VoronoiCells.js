import Bitmap from './Bitmap.js';
import {dist, El, pair, rand, sortLattice, stopwatch, unpair} from './util.js';


// color
const BORDER = Uint8ClampedArray.from([0, 0, 0]);

// pixel offsets
const NBR_OFFSETS = [[0, 1], [1, 0]];  // right, down

// read (from localStorage) or sort lattice
const SORTED_LATTICE = (() => {
  const start = performance.now();
  const sortedLattice = sortLattice();
  const duration = performance.now() - start;
  console.log(`read or sort lattice ${duration.toFixed(1)} ms`);
  return sortedLattice;
})();

/**
 * a rendered set of cells with adjacency determined by voronoi rules
 */
export default function VoronoiCells() {
  // init bitmap
  const bitmap = new Bitmap();
  const width = bitmap.width;
  const height = bitmap.height;

  // place cells
  const cells = (() => {
    const start = performance.now();

    const numCells = parseInt(El.NUM_CELLS_INPUT.value);
    const cells = new Array(numCells);
    const centers = new Set();
    for (let i = 0; i < numCells; i++) {
      let x = rand(width);
      let y = rand(height);
      while (centers.has(pair(x, y))) {
        x = rand(width);
        y = rand(height);
      }
      centers.add(pair(x, y));
      cells[i] = {
        x,
        y,
        minY: undefined,
        rows: [],
        neighbors: new Set(),
        geometricCenter: new Array(2),
      };
    }

    const duration = performance.now() - start;
    console.log('place cells', `${duration.toFixed(1)} ms`);
    return cells;
  })();

  // partition cells
  const coordsToCellId = (() => {
    const coordsToCellId = new Array(height).fill().map(() => new Array(width));

    // expanding circles method
    (() => {
      const start = performance.now();
      const thisSeemsToWork =
          Math.floor(2.34 * (width + height) ** 2 / cells.length);
      const expandArea = Math.min(thisSeemsToWork, SORTED_LATTICE.length);
      for (let i = 0; i < expandArea; i += 2) {
        const dx = SORTED_LATTICE[i];
        const dy = SORTED_LATTICE[i + 1];
        for (let id = 0; id < cells.length; id++) {
          const cell = cells[id];
          const x = cell.x + dx;
          const y = cell.y + dy;
          if (0 <= y && y < height && 0 <= x && x < width &&
              coordsToCellId[y][x] === undefined) {
            coordsToCellId[y][x] = id;
          }
        }
      }
      const duration = performance.now() - start;
      console.log('expanding circles method', `${duration.toFixed(1)} ms`);
    })();

    // fill in the gaps
    (() => {
      const start = performance.now();
      let gaps = 0;
      for (let y = 0; y < height; y++) {
        const row = coordsToCellId[y];
        for (let x = 0; x < width; x++) {
          let closestId = row[x];
          if (closestId === undefined) {
            gaps++;
            let minDistance = Infinity;
            for (let id = 0; id < cells.length; id++) {
              const cell = cells[id];
              const d = dist(x, y, cell.x, cell.y);
              if (d < minDistance) {
                minDistance = d;
                closestId = id;
              }
            }
            row[x] = closestId;
          }
        }
      }
      const duration = performance.now() - start;
      console.log('fill in the gaps', `${duration.toFixed(1)} ms`);
    })();

    return coordsToCellId;
  })();

  // draw borders, detect neighbors, calculate cell rows
  const borderPixels = (() => {
    const start = performance.now();
    const borderPixels = new Set();
    // extract this to make it maybe faster
    const checkNeighborsAndBorders = (x, y, id, cell) => {
      const rightNbrId = coordsToCellId[y][x + 1];
      if (rightNbrId !== id) {
        borderPixels.add(pair(x, y));
        bitmap.setPixel(x, y, BORDER);
        cell.neighbors.add(rightNbrId);
        cells[rightNbrId].neighbors.add(id);
      }
      const bottomNbrId = coordsToCellId[y + 1][x];
      if (bottomNbrId !== id) {
        borderPixels.add(pair(x, y));
        bitmap.setPixel(x, y, BORDER);
        cell.neighbors.add(bottomNbrId);
        cells[bottomNbrId].neighbors.add(id);
      }
    };
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const id = coordsToCellId[y][x];
        const cell = cells[id];
        // neighbors & borders
        checkNeighborsAndBorders(x, y, id, cell);
        // cell rows
        if (cell.minY === undefined) {
          cell.minY = y;
        }
        const yOffset = y - cell.minY;
        const cellRow = cell.rows[yOffset] || (cell.rows[yOffset] = []);
        cellRow.push(x);
      }
    }
    const rightEdge = width - 1;
    for (let y = 0; y < height; y++) {
      bitmap.setPixel(rightEdge, y, BORDER);
    }
    const bottomEdge = height - 1;
    for (let x = 0; x < width - 1; x++) {
      bitmap.setPixel(x, bottomEdge, BORDER);
    }
    bitmap.repaint();
    const duration = performance.now() - start;
    console.log('borders and neighbors', `${duration.toFixed(1)} ms`);
    return borderPixels;
  })();

  // calculate geometric centers
  requestAnimationFrame(() => {
    stopwatch('calculate geometric centers', () => {
      for (const [id, {minY, rows, geometricCenter}] of cells.entries()) {
        let num = 0;
        let xTotal = 0;
        let yTotal = 0;
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (row !== undefined) {
            const y = i + minY;
            num += row.length;
            xTotal += row.length * (row.length + 2 * row[0] - 1) / 2;
            yTotal += y * row.length;
          }
        }
        geometricCenter[0] = Math.round(xTotal / num);
        geometricCenter[1] = Math.round(yTotal / num);
      }
    });
  });

  // methods
  return {
    getSize() {
      return cells.length;
    },

    getIds() {
      return cells.map((_, i) => i);
    },

    getAdjacentIds(id) {
      return [...cells[id].neighbors];
    },

    attachToDom() {
      bitmap.attachToDom();
    },

    renderCells(idColorLabelArr) {
      // color backgrounds
      for (const {id, color} of idColorLabelArr) {
        const {minY, rows} = cells[id];
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (row !== undefined) {
            const y = i + minY;
            for (const x of row) {
              if (!borderPixels.has(pair(x, y))) {
                bitmap.setPixel(x, y, color);
              }
            }
          }
        }
      }
      bitmap.repaint();

      // print labels, if necessary
      let labelPrinted = false;
      for (const {id, label, labelColor} of idColorLabelArr) {
        if (label) {
          const [x, y] = cells[id].geometricCenter;
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
        const {layerX, layerY} = event;
        if (0 <= layerX && layerX < width && 0 <= layerY && layerY < height) {
          const cell = coordsToCellId[layerY][layerX];
          callback(event, cell);
        } else {
          callback(event, null);
        }
      });
    }
  };
}
