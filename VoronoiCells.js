import Bitmap from './Bitmap.js';
import {dist, El, pair, rand, stopwatch, unpair} from './util.js';


// color
const BORDER = [0, 0, 0];

// pixel offsets
const NBR_OFFSETS = [[0, 1], [1, 0]];  // right, down


// a rendered set of cells with adjacency determined by voronoi rules
export default function VoronoiCells() {
  // init bitmap
  const bitmap = new Bitmap();

  // place cells
  const cells = (() => {
    const cells = new Map();
    const numCells = parseInt(El.NUM_CELLS_INPUT.value);
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
          const d = dist(x, y, idX, idY);
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

  // detect/draw borders and neighbors
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
  requestAnimationFrame(() => {
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
  });

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
        const {layerX, layerY} = event;
        if (0 <= layerX && layerX < bitmap.width && 0 <= layerY &&
            layerY < bitmap.height) {
          const cell = coordsToCellId[layerY][layerX];
          callback(event, cell);
        } else {
          callback(event, null);
        }
      });
    }
  };
}
