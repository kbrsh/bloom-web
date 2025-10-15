//var NUM_PALETTES = 10;
var NUM_RINGS_PER_BLOOM = 5; // 16
const PALETTE_FILES = [
  "palette1.jpg",
  "palette2.jpg",
  "palette3.jpg",
  "palette4.jpg",
  "palette5.jpg",
  "palette6.jpg",
  "palette7.jpg",
  "palette8.jpg",
  "palette9.jpg",
  "palette10.jpg",
];

const palettes = []; // will hold {canvas, context, width, height, image}

async function loadPalettes() {
  for (const fileName of PALETTE_FILES) {
    const img = await loadImage(fileName);
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    palettes.push({
      canvas,
      context: ctx,
      width: img.width,
      height: img.height,
      image: img,
    });
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function getRandomPalette() {
  return palettes[Math.floor(Math.random() * palettes.length)];
}

//PROCESS DATA
const pad = (num) => String(num).padStart(2, "0");
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

//Get seismometer data from server
const net = ["BK", "BP"];
const sta = ["BKS"];
const loc = "00";
const cha = ["BHE", "BHN", "BHZ"];
const interval = 10000;
let lastTime = Date.now() - interval;
async function poll() {
  const currentTime = Date.now();
  const url = `https://service.ncedc.org/fdsnws/dataselect/1/query?net=${net.join(",")}&sta=${sta.join(",")}&loc=${loc}&cha=${cha.join(",")}&start=${formatTime(lastTime)}&end=${formatTime(currentTime)}`;
  lastTime = currentTime;
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const dataRecords = miniseed.parseDataRecords(arrayBuffer);
  const segment = miniseed.createSeismogramSegment(dataRecords);
  window.seg = segment;
  processData(segment.y);
  setTimeout(poll, interval);
}
poll();

var time = 1; //Our current location in the array of smoothed data points. Used for determining x-coordinate/time.
var smoothedData = [];
var lastRawData = [0, 0, 0]; //for simplicity use 3 dummy data points of 0's in the beginning

function processData(data) {
  smoothedData.push(
    0.25 * lastRawData[0] +
      0.25 * lastRawData[1] +
      0.25 * lastRawData[2] +
      0.25 * data[0],
  );
  smoothedData.push(
    0.25 * lastRawData[1] +
      0.25 * lastRawData[2] +
      0.25 * data[0] +
      0.25 * data[1],
  );
  smoothedData.push(
    0.25 * lastRawData[2] + 0.25 * data[0] + 0.25 * data[1] + 0.25 * data[2],
  );
  for (i = 0; i < data.length - 3; i++) {
    smoothedData.push(
      0.25 * data[i] +
        0.25 * data[i + 1] +
        0.25 * data[i + 2] +
        0.25 * data[i + 3],
    );
  }
  lastRawData[2] = data[data.length - 1];
  lastRawData[1] = data[data.length - 2];
  lastRawData[0] = data[data.length - 3];
}

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

//var canvas = document.createElement("canvas");
//var ctx = canvas.getContext("2d");
//canvas.width = actual_canvas.width;
//canvas.height = actual_canvas.height;

//
// MAIN
//

var circle_array = new Array();

var count = 0;

var _args = {};
var yimmy =
  yimmy ||
  (function () {
    return {
      init: function (Args) {
        // Acquire args from HTML if necessary
        _args = Args;
      },
      start: async function () {
        // processData(a);
        //processData(b);
        await loadPalettes();
        setInterval(update2, 300); //was 600; 300 currently
        main();
        // BEGIN LOOP
        (function () {
          var requestAnimationFrame =
            window.requestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.msRequestAnimationFrame;
          window.requestAnimationFrame = requestAnimationFrame;
        })();
      },
    };
  })();

var counter = 0; //Number of blooms we've created so far; needed to keep track of the blooms

function update2() {
  var diff1 = smoothedData[time] - smoothedData[time - 1];
  var diff2 = smoothedData[time] - smoothedData[time + 1];
  var product = diff1 * diff2;

  if (product > 0) {
    createBloom(counter.toString(), time);
    counter = counter + 1;
  }
  time++;
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

//Default expected window size
var windowWidth = 1920;
var windowHeight = 1080;

function createBloom(counter, iParam) {
  windowHeight = canvas.height;
  windowWidth = canvas.width;
  var svgW = windowWidth;
  var svgH = windowHeight;

  var numRings = NUM_RINGS_PER_BLOOM;

  numRings = Math.floor((10 + Math.abs(smoothedData[iParam] / 10)) / 10);

  //Assume time differences between sensor readings are uniform
  var firstDerivative1 = smoothedData[iParam] - smoothedData[iParam - 1];
  var firstDerivative2 = smoothedData[iParam + 1] - smoothedData[iParam];
  //Y position of bloom  = second derivative scaled by some constant
  var secondDerivative = firstDerivative2 - firstDerivative1;
  //X position of bloom; change constant to modify ratio of time ticks to movement in x axis on screen
  var x = ((time / 3) * 300) % svgW;
  x = getRandomInt(0, svgW);

  //const palette = getRandomPalette();
  const palette = palettes[9];
  const randomContext = palette.context;
  let randomX = getRandomInt(0, palette.width);
  let randomY = getRandomInt(0, palette.height);
  const colors = [];

  for (let i = 0; i < numRings; i++) {
    randomX = mod(
      randomX - getRandomInt(0, Math.floor(palette.width / 3)),
      palette.width,
    );
    randomY = mod(
      randomY - getRandomInt(0, Math.floor(palette.height / 3)),
      palette.height,
    );

    let pixelData = randomContext.getImageData(randomX, randomY, 1, 1).data;
    while (!isColorValid(pixelData[0], pixelData[1], pixelData[2])) {
      randomX = mod(
        randomX - getRandomInt(0, Math.floor(palette.width / 3)),
        palette.width,
      );
      randomY = mod(
        randomY - getRandomInt(0, Math.floor(palette.height / 3)),
        palette.height,
      );
      pixelData = randomContext.getImageData(randomX, randomY, 1, 1).data;
    }
    colors.push(rgb2hsv(pixelData[0], pixelData[1], pixelData[2]));
  }

  colors.sort(sortByHue);
  for (i = 0; i < colors.length; i++) {
    colors[i] = {
      h: colors[i].h,
      s: Math.floor(colors[i].s + 50, 100),
      v: colors[i].v,
    };
  }

  var rgbColors = [];
  for (i = 0; i < colors.length; i++) {
    rgbColors.push(HSVtoRGB(colors[i]));
  }

  var init_r = 10;

  var y = (Math.abs(secondDerivative) * 3) % svgH; //maybe I should change this?
  var i = numRings;

  /*
    need to fix the g_circle_t
    */
  var max_radius = init_r + Math.abs(smoothedData[iParam] / 10);

  circle_array.push(
    new g_circle_t(
      counter,
      1 - ((Math.floor((numRings - 1 - i) / 3) + 1) / 3) * 0.5,
      (numRings - 1 - i) * 12 + Math.floor((numRings - 1 - i) / 3) * 16,
      x,
      y,
      init_r,
      init_r + (max_radius * ((2 * i) / 3 + 1 + (numRings - 1) / 3)) / numRings,
      rgbColors[i - 1].r,
      rgbColors[i - 1].g,
      rgbColors[i - 1].b,
      max_radius * 2,
      1,
    ),
  );

  var radius_of_largest_ring =
    (init_r +
      (max_radius * ((2 * (numRings - 1)) / 3 + 1 + (numRings - 1) / 3)) /
        numRings) *
    Math.log(21.5);
  x = Math.min(
    svgW - radius_of_largest_ring,
    Math.max(x, radius_of_largest_ring),
  );
  y = Math.min(
    svgH - radius_of_largest_ring,
    Math.max(y, radius_of_largest_ring),
  );

  //g_circle.max_r * Math.log(21.5)

  for (i = numRings - 1; i >= 0; i--) {
    /* fifth argument in the constructor for g_circle_t (which determines the maximum size of the bloom) as well as the last argument (which determines
            how long it takes the bloom to reach its maximum size) are subject to tweaking; current constants seem to be a good balance
        */

    circle_array.push(
      new g_circle_t(
        counter,
        1 - ((Math.floor((numRings - 1 - i) / 3) + 1) / 3) * 0.5,
        (numRings - 1 - i) * 12 + Math.floor((numRings - 1 - i) / 3) * 16 * 0,
        x,
        y,
        init_r,
        init_r +
          (max_radius * 2 * ((2 * (i * 0.1)) / 3 + 1 + (numRings - 1) / 3)) /
            numRings,
        rgbColors[i].r,
        rgbColors[i].g,
        rgbColors[i].b,
        max_radius * 2,
        0,
      ),
    );
    /*
        if (i == numRings - 1) {
            circle_array.push(new g_circle_t(counter, 1 - ((Math.floor((numRings - 1 - i) / 3)) + 1) / 3 * 0.5 , (numRings - 1 - i) * 12 + Math.floor((numRings - 1 - i) / 3) * 16, x, y, init_r, init_r + max_radius * (2 * i/3 + 1 + ((numRings - 1) / 3)) / numRings, rgbColors[i].r, rgbColors[i].g, rgbColors[i].b, max_radius * 2, 1));
        } else {
            circle_array.push(new g_circle_t(counter, 1 - ((Math.floor((numRings - 1 - i) / 3)) + 1) / 3 * 0.5 , (numRings - 1 - i) * 12 + Math.floor((numRings - 1 - i) / 3) * 16, x, y, init_r, init_r + max_radius * (2 * i/3 + 1 + ((numRings - 1) / 3)) / numRings, rgbColors[i].r, rgbColors[i].g, rgbColors[i].b, max_radius * 2, 0));
        }
        */
  }
}

function sortByHue(hsvColor1, hsvColor2) {
  return hsvColor1.h - hsvColor2.h;
}

function getImgWidth(number) {
  switch (number) {
    case 0:
      return 176;
    case 1:
      return 252;
    case 2:
      return 267;
    case 3:
      return 485;
    case 4:
      return 297;
    case 5:
      return 272;
    case 6:
      return 276;
    case 7:
      return 274;
    case 8:
      return 472;
    case 9:
      return 1920;
  }
}

function getImgHeight(number) {
  switch (number) {
    case 0:
      return 256;
    case 1:
      return 212;
    case 2:
      return 326;
    case 3:
      return 300;
    case 4:
      return 326;
    case 5:
      return 326;
    case 6:
      return 326;
    case 7:
      return 326;
    case 8:
      return 488;
    case 9:
      return 1080;
  }
}

function isColorValid(r, g, b) {
  var isWhite = r > 200 && g > 200 && b > 200;
  var isBlack = r < 70 && g < 70 && b < 70;
  var isGray =
    Math.abs(r - g) < 40 && Math.abs(r - b) < 40 && Math.abs(g - b) < 40;
  if (isWhite || isBlack || isGray) {
    return false;
  } else {
    return true;
  }
}

//Utility functions taken mostly from stackoverflow

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function rgb2hsv() {
  var rr,
    gg,
    bb,
    r = arguments[0] / 255,
    g = arguments[1] / 255,
    b = arguments[2] / 255,
    h,
    s,
    v = Math.max(r, g, b),
    diff = v - Math.min(r, g, b),
    diffc = function (c) {
      return (v - c) / 6 / diff + 1 / 2;
    };

  if (diff == 0) {
    h = s = 0;
  } else {
    s = diff / v;
    rr = diffc(r);
    gg = diffc(g);
    bb = diffc(b);

    if (r === v) {
      h = bb - gg;
    } else if (g === v) {
      h = 1 / 3 + rr - bb;
    } else if (b === v) {
      h = 2 / 3 + gg - rr;
    }
    if (h < 0) {
      h += 1;
    } else if (h > 1) {
      h -= 1;
    }
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  };
}

function HSVtoRGB(h, s, v) {
  var r, g, b, i, f, p, q, t;
  if (h && s === undefined && v === undefined) {
    (s = h.s), (v = h.v), (h = h.h);
  }
  h = h / 360.0;
  s = s / 100.0;
  v = v / 100.0;
  i = Math.floor(h * 6);
  f = h * 6 - i;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      (r = v), (g = t), (b = p);
      break;
    case 1:
      (r = q), (g = v), (b = p);
      break;
    case 2:
      (r = p), (g = v), (b = t);
      break;
    case 3:
      (r = p), (g = q), (b = v);
      break;
    case 4:
      (r = t), (g = p), (b = v);
      break;
    case 5:
      (r = v), (g = p), (b = q);
      break;
  }
  return {
    r: Math.floor(r * 255),
    g: Math.floor(g * 255),
    b: Math.floor(b * 255),
  };
}

function main() {
  // main is called immediately when the function begins
  // Write all initialization functions here //
  update();
}

//
// UPDATE LOOP
//

function update() {
  resize_canvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (var i = 0; i < circle_array.length; i++) {
    update_circle_state(circle_array[i]);
  }
  //actual_ctx.fillRect(0, 0, actual_canvas.width, actual_canvas.height);
  //actual_ctx.drawImage(canvas, 0, 0);

  requestAnimationFrame(update);
}

function g_circle_t(
  counter,
  opacity,
  wait,
  x,
  y,
  min_r,
  max_r,
  red,
  green,
  blue,
  max_time,
  invisflag,
) {
  // Center coordinates of the circle
  this.id = counter;

  this.x = x;
  this.y = y;

  this.invisflag = invisflag;

  this.opacity = opacity;

  /*
    // Speed of the growth of the circle by [rad/sec]
    this.speed = 3;
    */
  this.time = 0;
  this.max_time = max_time;

  // Radius of the circle
  this.max_r = max_r;
  this.r = 300;
  this.min_r = min_r;

  // Max radius of the circle before it starts shrinking

  this.is_fading_away = false;

  this.red = red;
  this.green = green;
  this.blue = blue;

  var radgrad = ctx.createRadialGradient(
    this.x,
    this.y,
    0,
    this.x,
    this.y,
    this.r,
  );
  radgrad.addColorStop(
    0,
    "rgba(" +
      this.red.toString() +
      "," +
      this.green.toString() +
      "," +
      this.blue.toString() +
      ",1)",
  );
  radgrad.addColorStop(
    0.8,
    "rgba(" +
      this.red.toString() +
      "," +
      this.green.toString() +
      "," +
      this.blue.toString() +
      ",1)",
  );
  radgrad.addColorStop(
    1,
    "rgba(" +
      this.red.toString() +
      "," +
      this.green.toString() +
      "," +
      this.blue.toString() +
      "," +
      "0" +
      ")",
  );

  radgrad =
    "rgba(" +
    this.red.toString() +
    "," +
    this.green.toString() +
    "," +
    this.blue.toString() +
    ",1)";

  this.gradient = radgrad;

  this.wait = wait;

  this.lineWidth = this.max_r / 12;
}

function g_circle_draw(g_circle) {
  ctx.beginPath();

  ctx.arc(g_circle.x, g_circle.y, g_circle.r, 0, 2 * Math.PI, false);

  ctx.fillStyle = g_circle.gradient;
  ctx.strokeStyle = g_circle.gradient;
  // ctx.fill();
  ctx.lineWidth = g_circle.lineWidth;
  ctx.stroke();
}

function update_circle_state(g_circle) {
  if (g_circle.wait <= 0) {
    var radgrad = ctx.createRadialGradient(
      g_circle.x,
      g_circle.y,
      0,
      g_circle.x,
      g_circle.y,
      g_circle.r,
    );
    if (g_circle.is_fading_away) {
      if (g_circle.time >= 2 * g_circle.max_time) {
        for (var i = circle_array.length - 1; i >= 0; i--) {
          if (circle_array[i].id == g_circle.id) {
            circle_array.splice(i, 1);
            return;
          }
        }
        return;
      } else {
        var blur =
          1 - (g_circle.time - g_circle.max_time) / (1 * g_circle.max_time);
        if (blur < 0) {
          blur = 0;
        }
        blur = 0;
        radgrad.addColorStop(
          0,
          "rgba(" +
            g_circle.red.toString() +
            "," +
            g_circle.green.toString() +
            "," +
            g_circle.blue.toString() +
            "," +
            blur.toString() +
            ")",
        );
        radgrad.addColorStop(
          0.8,
          "rgba(" +
            g_circle.red.toString() +
            "," +
            g_circle.green.toString() +
            "," +
            g_circle.blue.toString() +
            "," +
            blur.toString() +
            ")",
        );
        radgrad.addColorStop(
          0.85,
          "rgba(" +
            g_circle.red.toString() +
            "," +
            g_circle.green.toString() +
            "," +
            g_circle.blue.toString() +
            "," +
            blur.toString() +
            ")",
        );
        radgrad.addColorStop(
          0.9,
          "rgba(" +
            g_circle.red.toString() +
            "," +
            g_circle.green.toString() +
            "," +
            g_circle.blue.toString() +
            "," +
            blur.toString() +
            ")",
        );
        radgrad.addColorStop(
          0.95,
          "rgba(" +
            g_circle.red.toString() +
            "," +
            g_circle.green.toString() +
            "," +
            g_circle.blue.toString() +
            "," +
            blur.toString() +
            ")",
        );
        radgrad.addColorStop(
          1,
          "rgba(" +
            g_circle.red.toString() +
            "," +
            g_circle.green.toString() +
            "," +
            g_circle.blue.toString() +
            "," +
            blur.toString() +
            ")",
        );

        g_circle.gradient =
          "rgba(" +
          g_circle.red.toString() +
          "," +
          g_circle.green.toString() +
          "," +
          g_circle.blue.toString() +
          "," +
          blur.toString() +
          ")";
        if (g_circle.invisflag == 1) {
          g_circle.gradient =
            "rgba(" +
            g_circle.red.toString() +
            "," +
            g_circle.green.toString() +
            "," +
            g_circle.blue.toString() +
            "," +
            "0" +
            ")";
        }
      }
    } else {
      if (g_circle.time >= g_circle.max_time) {
        g_circle.is_fading_away = true;
        //change this later
      }
      //also speed in beginning might be too high? because of the way it goes from 10 to the next size?
      //I think the speed needs to slow down less, and the speed of subsequent rings needs to slow down even more because of compression
      //tried to use sqrt, didn't work...? lol
      g_circle.lineWidth += 0.05;
      g_circle.r =
        g_circle.max_r *
        Math.log(1.5 + (g_circle.time / g_circle.max_time) * 20); // 1 + g_circle.time / 5
      radgrad.addColorStop(
        0,
        "rgba(" +
          g_circle.red.toString() +
          "," +
          g_circle.green.toString() +
          "," +
          g_circle.blue.toString() +
          ",1)",
      );
      radgrad.addColorStop(
        0.8,
        "rgba(" +
          g_circle.red.toString() +
          "," +
          g_circle.green.toString() +
          "," +
          g_circle.blue.toString() +
          ",1)",
      );
      var blur = g_circle.time / g_circle.max_time;
      blur = (1 - g_circle.time / g_circle.max_time) * g_circle.opacity;
      radgrad.addColorStop(
        1,
        "rgba(" +
          g_circle.red.toString() +
          "," +
          g_circle.green.toString() +
          "," +
          g_circle.blue.toString() +
          "," +
          blur.toString() +
          ")",
      );

      g_circle.gradient =
        "rgba(" +
        g_circle.red.toString() +
        "," +
        g_circle.green.toString() +
        "," +
        g_circle.blue.toString() +
        "," +
        blur.toString() +
        ")";
      if (g_circle.invisflag == 1) {
        g_circle.gradient =
          "rgba(" +
          g_circle.red.toString() +
          "," +
          g_circle.green.toString() +
          "," +
          g_circle.blue.toString() +
          "," +
          "0" +
          ")";
      }
    }
    g_circle_draw(g_circle);
    //g_circle.gradient = radgrad;
    g_circle.time++;
  } else {
    g_circle.wait -= 1;
  }
}

//
// UTILITY FUNCTIONS
//

function resize_canvas() {
  if (canvas.width != window.innerWidth) {
    canvas.width = window.innerWidth;
  }
  if (canvas.height != window.innerHeight) {
    canvas.height = window.innerHeight;
  }
}
