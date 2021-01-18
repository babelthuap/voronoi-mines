import Bitmap from './Bitmap.js';
import {calculateBorderGuesses, dist, El, pair, rand, sortLattice, unpair} from './util.js';


// color
const BORDER = Uint8ClampedArray.from([0, 0, 0]);

// read (from localStorage) or sort lattice
const SORTED_LATTICE = (() => {
  const start = performance.now();
  const sortedLattice = sortLattice();
  const duration = performance.now() - start;
  console.log(`read or sort lattice ${duration.toFixed(1)} ms`);
  return sortedLattice;
})();

/** naive algorithm to find closest cell for a pixel */
const findClosestCell = (pixelIndex, width, cells) => {
  const x = pixelIndex % width;
  const y = (pixelIndex - x) / width;
  let closestCellIndex;
  let minDist = Infinity;
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const d = dist(x, y, cell.x, cell.y);
    if (d < minDist) {
      minDist = d;
      closestCellIndex = i;
    }
  }
  return closestCellIndex;
};

/** renders a row using binary search for cell borders */
const renderRow =
    (y, width, borderGuesses, cells, coordsToCellId, getOrCalculatePixel) => {
      const rowOffset = width * y;
      const rowEnd = rowOffset + width;
      let left = rowOffset;
      let guessI = 0;
      while (left < rowEnd) {
        // fill in un-partitioned pixels: starting at left, search for the
        // border with next color in this row, then fill the pixels in between
        const cellIndex = getOrCalculatePixel(left);

        // make an educated guess about where the next cell will be
        while (rowOffset + borderGuesses[guessI] <= left &&
               guessI < borderGuesses.length - 1) {
          guessI++;
        }
        let right = rowOffset + borderGuesses[guessI];
        while (getOrCalculatePixel(right) === cellIndex &&
               guessI < borderGuesses.length - 1) {
          guessI++;
          right = rowOffset + borderGuesses[guessI];
        }

        // search for border
        if (getOrCalculatePixel(right) !== cellIndex) {
          let step = Math.max((right - left) >> 1, 1);
          do {
            if (coordsToCellId[right] === cellIndex) {
              right += step;
            } else {
              right -= step;
            }
            if (step > 1) {
              step >>= 1;
            }
          } while (getOrCalculatePixel(right) !== cellIndex ||
                   getOrCalculatePixel(right + 1) === cellIndex);
        }

        // fill line of same-color pixels
        for (let pixelIndex = left; pixelIndex <= right; pixelIndex++) {
          coordsToCellId[pixelIndex] = cellIndex;
        }

        left = right + 1;
      }
    };

/**
 * a rendered set of cells with adjacency determined by voronoi rules
 */
export default function VoronoiCells() {
  const startInitialRender = performance.now();

  // init bitmap
  const bitmap = new Bitmap();
  const width = bitmap.width;
  const height = bitmap.height;

  // place cells
  const cells = (() => {
    const numCells = parseInt(El.NUM_CELLS_INPUT.value);
    const cells = new Array(numCells);
    const centers = new Set();
    for (let id = 0; id < numCells; id++) {
      let x = rand(width);
      let y = rand(height);
      while (centers.has(pair(x, y))) {
        x = rand(width);
        y = rand(height);
      }
      centers.add(pair(x, y));
      cells[id] = {
        x,
        y,
        minY: undefined,
        rows: [],
        neighbors: new Set(),
        geometricCenter: new Array(2),
      };
    }
    return cells;
  })();

  // partition cells
  const coordsToCellId = (() => {
    const coordsToCellId = new Array(height * width);

    // expanding circles method
    const thisSeemsToWork =
        Math.floor(2.34 * (width + height) ** 2 / cells.length);
    const expandArea = Math.min(thisSeemsToWork, SORTED_LATTICE.length);
    for (let i = 0; i < expandArea; i += 2) {
      const dx = SORTED_LATTICE[i];
      const dy = SORTED_LATTICE[i + 1];
      for (let id = 0; id < cells.length; id++) {
        const cell = cells[id];
        const y = cell.y + dy;
        if (y < height && y >= 0) {
          const x = cell.x + dx;
          if (x >= 0 && x < width) {
            const pixelIndex = x + width * y;
            if (coordsToCellId[pixelIndex] === undefined) {
              coordsToCellId[pixelIndex] = id;
            }
          }
        }
      }
    }

    // fill in the gaps
    const borderGuesses = calculateBorderGuesses(width, height, cells.length);
    const getOrCalculatePixel = (pixelIndex) => {
      const cellIndex = coordsToCellId[pixelIndex];
      return cellIndex === undefined ?
          coordsToCellId[pixelIndex] =
              findClosestCell(pixelIndex, width, cells) :
          cellIndex;
    };
    for (let y = 0; y < height; y++) {
      renderRow(
          y, width, borderGuesses, cells, coordsToCellId, getOrCalculatePixel);
    }

    return coordsToCellId;
  })();

  // draw borders, detect neighbors, calculate cell rows
  const borderPixels = (() => {
    const borderPixels = new Set();
    // extract this to make it maybe faster
    const checkNeighborsAndBorders = (pixelIndex, id, cell) => {
      const rightNbrId = coordsToCellId[pixelIndex + 1];
      if (rightNbrId !== id) {
        borderPixels.add(pixelIndex);
        bitmap.setPixel(pixelIndex, BORDER);
        cell.neighbors.add(rightNbrId);
        cells[rightNbrId].neighbors.add(id);
      }
      const bottomNbrId = coordsToCellId[pixelIndex + width];
      if (bottomNbrId !== id) {
        borderPixels.add(pixelIndex);
        bitmap.setPixel(pixelIndex, BORDER);
        cell.neighbors.add(bottomNbrId);
        cells[bottomNbrId].neighbors.add(id);
      }
    };
    for (let y = 0; y < height - 1; y++) {
      const rowOffset = width * y;
      for (let x = 0; x < width - 1; x++) {
        const pixelIndex = rowOffset + x;
        const id = coordsToCellId[pixelIndex];
        const cell = cells[id];
        // neighbors & borders
        checkNeighborsAndBorders(pixelIndex, id, cell);
        // cell rows
        if (cell.minY === undefined) {
          cell.minY = y;
        }
        const yOffset = y - cell.minY;
        const cellRow = cell.rows[yOffset] || (cell.rows[yOffset] = []);
        cellRow.push(x);
      }
    }
    // right edge
    for (let index = width - 1; index < width * height; index += width) {
      bitmap.setPixel(index, BORDER);
    }
    // bottom edge
    for (let index = width * (height - 1); index < width * height; index++) {
      bitmap.setPixel(index, BORDER);
    }
    bitmap.repaint();
    return borderPixels;
  })();

  console.log(`initial render: ${
      Math.round(performance.now() - startInitialRender)} ms`);

  // calculate geometric centers
  requestAnimationFrame(() => {
    for (let id = 0; id < cells.length; id++) {
      const {minY, rows, geometricCenter} = cells[id];
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
        for (let dy = 0; dy < rows.length; dy++) {
          const row = rows[dy];
          if (row !== undefined) {
            const y = minY + dy;
            const rowOffset = width * y;
            for (let i = 0; i < row.length; i++) {
              const pixelIndex = rowOffset + row[i];
              if (!borderPixels.has(pixelIndex)) {
                bitmap.setPixel(pixelIndex, color);
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
          const cell = coordsToCellId[layerX + width * layerY];
          callback(event, cell);
        } else {
          callback(event, null);
        }
      });
    }
  };
}
