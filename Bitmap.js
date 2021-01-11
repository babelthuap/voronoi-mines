import {El} from './util.js';

/**
 * a canvas that fills the board container and whose pixels can be written to
 * individually
 */
export default function Bitmap() {
  // fill the entire container
  const width = El.BOARD_CONTAINER.offsetWidth;
  const height = El.BOARD_CONTAINER.offsetHeight;

  // create the canvas element
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#bbb';
  ctx.fillRect(0, 0, width, height);
  let imageData = ctx.getImageData(0, 0, width, height);
  ctx.font = '24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // attach to dom
  [...El.BOARD_CONTAINER.children].forEach((child) => child.remove());
  El.BOARD_CONTAINER.appendChild(canvas);

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
