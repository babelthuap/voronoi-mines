import {El} from './util.js';

/**
 * a canvas that fills the board container and whose pixels can be written to
 * individually
 */
export default function Bitmap() {
  // adjust board container height to not overlap controls
  El.BOARD_CONTAINER.style.height =
      (window.innerHeight - El.CONTROLS.offsetHeight -
       El.SCORE_CONTAINER.offsetHeight) +
      'px';

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
  let data = imageData.data;
  ctx.font = '24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

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

    get offsetLeft() {
      return canvas.offsetLeft;
    },

    get offsetTop() {
      return canvas.offsetTop;
    },

    attachToDom() {
      [...El.BOARD_CONTAINER.children].forEach((child) => child.remove());
      El.BOARD_CONTAINER.appendChild(canvas);
    },

    repaint() {
      ctx.putImageData(imageData, 0, 0);
    },

    rasterize() {
      imageData = ctx.getImageData(0, 0, width, height);
      data = imageData.data;
    },

    getPixelR(pixelIndex) {
      return data[pixelIndex << 2];
    },

    setPixel(pixelIndex, rgb) {
      const red = pixelIndex << 2;
      data[red] = rgb[0];
      data[red + 1] = rgb[1];
      data[red + 2] = rgb[2];
    },

    setRow(leftIndex, rightIndex, rgb) {
      for (let i = (leftIndex << 2); i < (rightIndex << 2) + 1; i += 4) {
        if (data[i] !== 0) {  // check for border
          data[i] = rgb[0];
          data[i + 1] = rgb[1];
          data[i + 2] = rgb[2];
        }
      }
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
