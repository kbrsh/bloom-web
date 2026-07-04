// Bloom Seismic Visualization
// Modern web implementation faithful to original Flash version

const STATION = {
  network: "NN",
  station: "JVTV",
  location: "--",
  channel: "HNZ",
  label: "NN.JVTV..HNZ",
  units: "m/s^2",
  countsPerAcceleration: 160558,
};

const ACCELERATION_SCALE = {
  baselineAlpha: 0.001,
  bloomStart: 0.00005,
  fullBloom: 0.05,
  secondDerivative: 0.0005,
};

const DATA_SERVICE_URL = "https://service.earthscope.org/fdsnws/dataselect/1/query";
const POLL_INTERVAL_MS = 10000;
const DATA_LATENCY_MS = 30000;
const SYNTHETIC_SAMPLE_RATE = 50;
const SYNTHETIC_ACCELERATION_STD = 0.00008;

class BloomVisualization {
  constructor() {
    // Configuration variables from original documentation
    this.animationDelay = 150; // Animation speed (ms)
    this.maxBufferSize = 4000; // Circular buffer size
    this.maxNumFlowers = 30; // Max blooms on canvas
    this.clampPaddingRatio = 0.12;
    this.showClampBox = false;
    this.countsPerAcceleration = STATION.countsPerAcceleration;
    this.accelerationBaseline = null;
    this.maxObservedAcceleration = 0;
    this.baselineAlpha = ACCELERATION_SCALE.baselineAlpha;
    this.bloomStartAcceleration = ACCELERATION_SCALE.bloomStart;
    this.fullBloomAcceleration = ACCELERATION_SCALE.fullBloom;
    this.secondDerivativeScale = ACCELERATION_SCALE.secondDerivative;

    // Data structures
    this.samplesBuffer = new Array(this.maxBufferSize);
    this.bufferCount = 0;
    this.flowerIndex = 0;
    this.lastBreak = 0;

    // Canvas and rendering
    this.canvas = null;
    this.ctx = null;
    this.flowers = []; // Track active flowers

    // Color palette for sampling
    this.paletteCanvas = document.createElement("canvas");
    this.paletteCtx = this.paletteCanvas.getContext("2d");
    this.paletteReady = false;
    this.highlightColors = []; // Small set of prominent/interesting colors to mix in

    // Initialize with zeros
    for (let i = 0; i < this.maxBufferSize; i++) {
      this.samplesBuffer[i] = 0;
    }
  }

  init(canvasId, paletteImageId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");

    // Set canvas size to window with high-DPI backing store
    this.resizeCanvas();

    // Prepare palette for color extraction
    this.preparePalette(paletteImageId);

    // Handle window resize
    window.addEventListener("resize", () => {
      this.resizeCanvas();
    });
  }

  resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    this.pixelRatio = ratio;

    const cssWidth = window.innerWidth;
    const cssHeight = window.innerHeight;
    this.canvasCssWidth = cssWidth;
    this.canvasCssHeight = cssHeight;

    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    this.canvas.width = Math.floor(cssWidth * ratio);
    this.canvas.height = Math.floor(cssHeight * ratio);

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(ratio, ratio);
  }
  preparePalette(imageId) {
    const img = document.getElementById(imageId);
    if (img && img.complete) {
      this.paletteCanvas.width = img.width;
      this.paletteCanvas.height = img.height;
      this.paletteCtx.drawImage(img, 0, 0);
      this.extractHighlights();
      this.paletteReady = true;
    } else if (img) {
      img.onload = () => {
        this.paletteCanvas.width = img.width;
        this.paletteCanvas.height = img.height;
        this.paletteCtx.drawImage(img, 0, 0);
        this.extractHighlights();
        this.paletteReady = true;
      };
    }
  }

  // Extract a small set of highlight/accent colors that might be underrepresented
  extractHighlights() {
    const width = this.paletteCanvas.width;
    const height = this.paletteCanvas.height;

    const candidates = [];

    // Sample the image to find interesting colors
    const sampleStep = 5;
    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        const imageData = this.paletteCtx.getImageData(x, y, 1, 1);
        const [r, g, b, a] = imageData.data;

        if (a < 128) continue;

        const { h, s, l } = this.rgbToHsl(r, g, b);

        // Only keep highly saturated or bright colors (the "interesting" ones)
        if (s > 0.5 || (l > 0.6 && s > 0.3)) {
          candidates.push({
            h,
            s,
            l,
            score: s * 2 + l,
          });
        }
      }
    }

    // Sort by score and pick diverse highlights
    candidates.sort((a, b) => b.score - a.score);

    const selected = [];
    const minDistance = 0.2;

    for (const c of candidates) {
      const isDifferent = selected.every((sel) => {
        const hDist = Math.min(
          Math.abs(c.h - sel.h),
          1 - Math.abs(c.h - sel.h),
        );
        const dist = Math.sqrt(
          hDist * hDist * 4 + (c.s - sel.s) ** 2 + (c.l - sel.l) ** 2,
        );
        return dist > minDistance;
      });

      if (isDifferent) {
        const minSat = 0.4;
        const boostedS = Math.max(c.s, minSat);
        const { r, g, b } = this.hslToRgb(c.h, boostedS, c.l);
        selected.push({
          h: c.h,
          s: boostedS,
          l: c.l,
          color: `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`,
        });

        if (selected.length >= 15) break;
      }
    }

    this.highlightColors = selected.map((c) => c.color);
    console.log(
      `Extracted ${this.highlightColors.length} highlight colors:`,
      this.highlightColors,
    );
  }

  // Section 3.0.21: Get color from palette using two random parameters
  // Random sampling for proportional representation, with occasional highlights mixed in
  getColor(c, d) {
    if (!this.paletteReady) {
      // Fallback colors if palette not ready
      const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"];
      return colors[Math.floor(Math.random() * colors.length)];
    }

    // 20% chance to use a highlight color (ensures accents appear)
    if (this.highlightColors.length > 0 && Math.random() < 0.2) {
      return this.highlightColors[
        Math.floor(Math.random() * this.highlightColors.length)
      ];
    }

    // Otherwise, sample randomly from palette image (proportional representation)
    const x = Math.floor(c * this.paletteCanvas.width);
    const y = Math.floor(d * this.paletteCanvas.height);
    const imageData = this.paletteCtx.getImageData(x, y, 1, 1);
    const [r, g, b] = imageData.data;

    // Apply saturation boost
    const { h, s, l } = this.rgbToHsl(r, g, b);
    const minSat = 0.35;
    const sat = Math.max(s, minSat);
    const light = l;

    const { r: nr, g: ng, b: nb } = this.hslToRgb(h, sat, light);
    return `rgb(${Math.round(nr)}, ${Math.round(ng)}, ${Math.round(nb)})`;
  }

  // Section 3.0.23: Circular random access from series
  value(series, n) {
    const index =
      ((n % this.maxBufferSize) + this.maxBufferSize) % this.maxBufferSize;
    return series[index] || 0;
  }

  // Section 3.0.24: Minimax - detect local maxima only
  // Returns amplitude if current spot is a peak, 0 otherwise
  // Note: Original Flash version only triggered on maxima, not minima
  minmax(series, i) {
    const current = this.value(series, i);
    const prev = this.value(series, i - 1);
    const next = this.value(series, i + 1);

    // Check if local maximum only
    if (
      Math.abs(current) > Math.abs(prev) &&
      Math.abs(current) > Math.abs(next)
    ) {
      return current;
    }

    return 0;
  }

  // Section 3.0.18: Main visualization timer function
  // Determines size, frequency, and position of each flower
  onFlowerTimer() {
    // Check if current spot is a peak
    const amp = this.minmax(this.samplesBuffer, this.flowerIndex);

    const spacing =
      (this.flowerIndex - this.lastBreak + this.maxBufferSize) %
      this.maxBufferSize;

    // Only draw if we have a peak and enough spacing from last bloom
    if (amp !== 0 && spacing > 5) {
      // Size blooms from calibrated acceleration.
      const absAcceleration = Math.abs(amp);
      const physicalScale = this.accelerationToBloomScale(absAcceleration);

      // Calculate second derivative for Y position
      const secondDeriv =
        this.value(this.samplesBuffer, this.flowerIndex - 2) -
        2 * this.value(this.samplesBuffer, this.flowerIndex - 1) +
        this.value(this.samplesBuffer, this.flowerIndex);

      // Calculate size based on viewport min dimension
      const minDim = Math.min(this.canvasCssWidth, this.canvasCssHeight);
      const minSize = minDim * 0.03;
      const maxSize = minDim * 0.5;
      let size = minSize + physicalScale * (maxSize - minSize);

      // Calculate position (bottom-to-top sweep)
      let fY =
        this.canvasCssHeight -
        ((5 * (this.flowerIndex + 100)) % this.canvasCssHeight);
      const clampedSecondDeriv = Math.max(
        -1,
        Math.min(1, secondDeriv / this.secondDerivativeScale),
      );
      const normSecondDeriv =
        Math.sign(clampedSecondDeriv) *
        Math.pow(Math.abs(clampedSecondDeriv), 0.75);

      const clampPadding = Math.round(
        Math.min(this.canvasCssWidth, this.canvasCssHeight) *
          this.clampPaddingRatio,
      );
      const centerX = this.canvasCssWidth / 2;
      const maxOffset = centerX - clampPadding;
      let fX = centerX + normSecondDeriv * maxOffset;

      // Clamp positions to canvas bounds
      fY = this.remap(
        fY,
        0,
        this.canvasCssHeight,
        clampPadding,
        this.canvasCssHeight - clampPadding,
      );
      fX = this.remap(
        fX,
        0,
        this.canvasCssWidth,
        clampPadding,
        this.canvasCssWidth - clampPadding,
      );
      size = Math.max(minSize, Math.min(maxSize, size));

      // Draw flower if size is significant
      if (this.lastBreak === 0) {
        this.drawFlower(fX, fY, minSize);
      } else if (physicalScale > 0) {
        this.drawFlower(fX, fY, size);
      }

      this.lastBreak = this.flowerIndex;
    }

    this.flowerIndex = (this.flowerIndex + 1) % this.maxBufferSize;

    // Clean up old flowers
    this.removeOldFlowers();
  }

  // Section 3.0.20: Draw flower with concentric circles
  drawFlower(x, y, size) {
    // Recalculate stripe widths based on canvas size (from original documentation)
    const thinStripe = (1 / 100) * this.canvasCssHeight;
    const regularStripe = 2 * thinStripe;

    // Calculate number of stripes based on size
    let numStripes =
      Math.floor((Math.random() * (size - thinStripe)) / regularStripe) + 2;

    if (numStripes <= 3) numStripes += 1;
    if (numStripes <= 5) {
      numStripes += Math.random() > 0.5 ? 1 : 0;
      numStripes += Math.random() > 0.5 ? 1 : 0;
      numStripes += Math.random() > 0.5 ? 1 : 0;
    }

    // Create flower object
    const flower = {
      x: x,
      y: y,
      size: size,
      circles: [],
      createdAt: Date.now(),
      opacity: 1.0,
      currentSize: 0,
      targetSize: 1.0,
      blur: 0,
      cacheCanvas: null,
      cacheSize: 0,
    };

    // Build circles with colors
    for (let i = 0; i < numStripes * 1.5; i++) {
      let curSize =
        size - (i > 0 ? thinStripe : 0) - (i > 1 ? (i - 1) * regularStripe : 0);

      if (curSize < thinStripe) {
        break;
      }

      let color;
      if (i % 2 === 0) {
        color = this.getColor(
          (this.bufferCount % this.maxBufferSize) / this.maxBufferSize,
          Math.random(),
        );
      } else {
        color = this.getColor(
          Math.random(),
          (this.bufferCount % this.maxBufferSize) / this.maxBufferSize,
        );
      }

      flower.circles.push({ radius: curSize, color: color });
    }

    this.flowers.push(flower);

    // Remove oldest flower if we exceed max
    if (this.flowers.length > this.maxNumFlowers) {
      this.flowers.shift();
    }

    this.buildFlowerCache(flower);
  }

  buildFlowerCache(flower) {
    const padding = 12; // Extra room for blur edges.
    const cacheSize = Math.ceil(flower.size * 2 + padding * 2);
    const ratio = this.pixelRatio || 1;
    const cacheCanvas = document.createElement("canvas");
    cacheCanvas.width = Math.ceil(cacheSize * ratio);
    cacheCanvas.height = Math.ceil(cacheSize * ratio);
    const cacheCtx = cacheCanvas.getContext("2d");
    cacheCtx.scale(ratio, ratio);

    const center = cacheSize / 2;
    for (let i = 0; i < flower.circles.length; i++) {
      const circle = flower.circles[i];
      const radius = circle.radius;
      if (radius <= 0 || !isFinite(radius)) continue;

      cacheCtx.fillStyle = circle.color;
      cacheCtx.beginPath();
      cacheCtx.arc(center, center, radius, 0, Math.PI * 2);
      cacheCtx.fill();
    }

    flower.cacheCanvas = cacheCanvas;
    flower.cacheSize = cacheSize;
  }

  // Easing function for flower bloom - ease-out-back with overshoot
  easeOutBack(t) {
    const c1 = 1.2;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  renderScene(ctx, width, height, includeClampBox) {
    // Clear canvas with slight trail effect for blur
    ctx.fillStyle = "rgba(255, 255, 255, 1)";
    ctx.fillRect(0, 0, width, height);

    const now = Date.now();

    if (this.showClampBox && includeClampBox) {
      ctx.save();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 1;
      const clampPadding = Math.round(
        Math.min(width, height) * this.clampPaddingRatio,
      );
      ctx.strokeRect(
        clampPadding,
        clampPadding,
        width - clampPadding * 2,
        height - clampPadding * 2,
      );
      ctx.restore();
    }

    this.flowers.forEach((flower) => {
      const age = now - flower.createdAt;

      // Zoom effect (400ms + size * 10) with easing
      const zoomDuration = 280 + flower.size * 7; // 30% faster
      if (age < zoomDuration) {
        const t = age / zoomDuration;
        flower.currentSize = this.easeOutBack(t);
      } else {
        flower.currentSize = 1.0;
      }

      // Blur effect starts at 400ms + size * 20
      const blurStart = 400 + flower.size * 20;
      const blurDuration = 3000;
      if (age > blurStart && age < blurStart + blurDuration) {
        const t = (age - blurStart) / blurDuration;
        const eased = t * (2 - t); // ease-out
        flower.blur = 8 * eased;
      } else if (age >= blurStart + blurDuration) {
        flower.blur = 8;
      }

      // Fade effect starts at 400ms + size * 20, duration 25000ms
      const fadeStart = 400 + flower.size * 20;
      if (age > fadeStart) {
        const fadeProgress = (age - fadeStart) / 25000;
        flower.opacity = Math.max(1.0 - fadeProgress, 0);
      }

      // Draw the flower
      ctx.save();

      // Apply blur if needed
      if (flower.blur > 0) {
        ctx.filter = `blur(${flower.blur}px)`;
      }

      ctx.globalAlpha = flower.opacity;

      // Draw cached flower bitmap scaled to current size
      if (flower.cacheCanvas && flower.cacheSize > 0) {
        const drawSize = flower.cacheSize * flower.currentSize;
        const drawX = flower.x - drawSize / 2;
        const drawY = flower.y - drawSize / 2;
        ctx.drawImage(flower.cacheCanvas, drawX, drawY, drawSize, drawSize);
      }

      ctx.restore();
    });
  }

  // Animation loop to render all flowers with effects
  render() {
    this.renderScene(this.ctx, this.canvasCssWidth, this.canvasCssHeight, true);
  }

  captureSnapshot(scale = 2) {
    const width = this.canvasCssWidth;
    const height = this.canvasCssHeight;

    const captureCanvas = document.createElement("canvas");
    captureCanvas.width = Math.floor(width * scale);
    captureCanvas.height = Math.floor(height * scale);
    const captureCtx = captureCanvas.getContext("2d");
    captureCtx.scale(scale, scale);

    this.renderScene(captureCtx, width, height, false);

    const link = document.createElement("a");
    link.href = captureCanvas.toDataURL("image/png");
    link.download = `rebloom-snapshot-${Date.now()}.png`;
    link.click();
  }

  removeOldFlowers() {
    const now = Date.now();

    this.flowers = this.flowers.filter((flower) => {
      // Each flower has different lifecycle based on its size
      const maxAge = 25000 + flower.size * 20; // Fade duration + size-dependent delay
      return now - flower.createdAt < maxAge;
    });
  }

  remap(value, inMin, inMax, outMin, outMax) {
    if (inMax === inMin) return outMin;
    const t = (value - inMin) / (inMax - inMin);
    return outMin + t * (outMax - outMin);
  }

  // Start the animation
  start() {
    setInterval(() => {
      this.onFlowerTimer();
    }, this.animationDelay);

    // Render loop
    const renderLoop = () => {
      this.render();
      requestAnimationFrame(renderLoop);
    };
    renderLoop();
  }

  addCounts(counts) {
    this.addAcceleration(counts / this.countsPerAcceleration);
  }

  addAcceleration(acceleration) {
    if (!Number.isFinite(acceleration)) return;

    if (this.accelerationBaseline === null) {
      this.accelerationBaseline = acceleration;
    }

    this.accelerationBaseline +=
      (acceleration - this.accelerationBaseline) * this.baselineAlpha;

    const detrendedAcceleration = acceleration - this.accelerationBaseline;
    this.maxObservedAcceleration = Math.max(
      this.maxObservedAcceleration * 0.999,
      Math.abs(detrendedAcceleration),
    );
    this.samplesBuffer[this.bufferCount % this.maxBufferSize] =
      detrendedAcceleration;
    this.bufferCount = (this.bufferCount + 1) % this.maxBufferSize;

    if (this.canvas && this.bufferCount % 100 === 0) {
      this.canvas.dataset.bufferCount = String(this.bufferCount);
      this.canvas.dataset.latestAcceleration =
        detrendedAcceleration.toExponential(4);
      this.canvas.dataset.maxObservedAcceleration =
        this.maxObservedAcceleration.toExponential(4);
      this.canvas.dataset.units = STATION.units;
    }
  }

  accelerationToBloomScale(absAcceleration) {
    if (absAcceleration <= this.bloomStartAcceleration) return 0;

    const minLog = Math.log10(this.bloomStartAcceleration);
    const maxLog = Math.log10(this.fullBloomAcceleration);
    const valueLog = Math.log10(absAcceleration);
    const t = Math.max(
      0,
      Math.min(1, (valueLog - minLog) / (maxLog - minLog)),
    );

    return t * t * (3 - 2 * t);
  }

  // Utility: RGB ↔ HSL conversion
  rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h,
      s,
      l = (max + min) / 2;

    if (max === min) {
      h = s = 0; // gray
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return { h, s, l };
  }

  hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l; // gray
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r: r * 255, g: g * 255, b: b * 255 };
  }
}

// Seismic data fetching from EarthScope for NN.JVTV..HNZ.
let lastTime = Date.now() - DATA_LATENCY_MS - POLL_INTERVAL_MS;
const syntheticState = {
  value: 0,
  velocity: 0,
  spike: 0,
  std: SYNTHETIC_ACCELERATION_STD,
};

function formatTime(timestamp) {
  return new Date(timestamp).toISOString().replace(/\.\d{3}Z$/, "");
}

async function poll(bloom) {
  const currentTime = Date.now() - DATA_LATENCY_MS;
  const params = new URLSearchParams({
    net: STATION.network,
    sta: STATION.station,
    loc: STATION.location,
    cha: STATION.channel,
    start: formatTime(lastTime),
    end: formatTime(currentTime),
    nodata: "404",
  });
  const url = `${DATA_SERVICE_URL}?${params}`;
  lastTime = currentTime;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const dataRecords = miniseed.parseDataRecords(arrayBuffer);
    const segment = miniseed.createSeismogramSegment(dataRecords);
    segment.y.forEach((sample) => bloom.addCounts(sample));
    updateDataStatus("live", segment.y.length);
  } catch (error) {
    console.error("Error fetching seismic data:", error);
    updateDataStatus("synthetic", feedSyntheticSamples(bloom));
  }

  setTimeout(() => poll(bloom), POLL_INTERVAL_MS);
}

function updateDataStatus(source, sampleCount) {
  document.body.dataset.seismicSource = source;
  document.body.dataset.seismicStation = STATION.label;
  document.body.dataset.seismicUnits = STATION.units;
  document.body.dataset.seismicSampleCount = String(sampleCount);
  document.body.dataset.seismicUpdatedAt = new Date().toISOString();
}

function feedSyntheticSamples(bloom) {
  const sampleCount = Math.max(
    1,
    Math.round((POLL_INTERVAL_MS / 1000) * SYNTHETIC_SAMPLE_RATE),
  );
  const synthetic = generateSyntheticSamples(sampleCount);
  synthetic.forEach((sample) => bloom.addAcceleration(sample));
  return sampleCount;
}

function generateSyntheticSamples(count) {
  const samples = new Array(count);
  for (let i = 0; i < count; i += 1) {
    // Low-frequency drift with gentle damping.
    syntheticState.velocity += randn() * (syntheticState.std * 0.02);
    syntheticState.velocity *= 0.92;
    syntheticState.value += syntheticState.velocity;
    syntheticState.value *= 0.95;

    // Occasional acceleration spikes to mimic nearby seismic motion.
    if (syntheticState.spike === 0 && Math.random() < 0.003) {
      syntheticState.spike =
        randn() * (syntheticState.std * (5 + Math.random() * 25));
    }
    let spike = 0;
    if (syntheticState.spike !== 0) {
      spike = syntheticState.spike;
      syntheticState.spike *= 0.8;
      if (Math.abs(syntheticState.spike) < syntheticState.std * 0.02) {
        syntheticState.spike = 0;
      }
    }

    const noise = randn() * (syntheticState.std * 0.15);
    samples[i] = syntheticState.value + noise + spike;
  }
  return samples;
}

function randn() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Initialize the visualization when page loads
let bloom;

window.addEventListener("DOMContentLoaded", () => {
  bloom = new BloomVisualization();
  bloom.init("bloomCanvas", "paletteImage");
  bloom.start();

  // Start fetching real seismic data
  poll(bloom);
});

// Network downtime monitoring
let downtimeStartMs = null;

window.addEventListener("offline", () => {
  if (downtimeStartMs === null) {
    downtimeStartMs = Date.now();
  }
});

window.addEventListener("online", () => {
  if (downtimeStartMs === null || !navigator.onLine) return;
  const downtimeMs = Date.now() - downtimeStartMs;
  posthog.captureException("seismic_data_fetch_error", {
    downtimeSeconds: Math.round(downtimeMs / 1000),
  });
  downtimeStartMs = null;
});
