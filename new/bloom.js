// Bloom Seismic Visualization
// Modern web implementation faithful to original Flash version

class BloomVisualization {
  constructor() {
    // Configuration variables from original documentation
    this.animationDelay = 150; // Animation speed (ms)
    this.maxBufferSize = 4000; // Circular buffer size
    this.maxNumFlowers = 30; // Max blooms on canvas
    this.thinStripe = 10; // Thin stripe width
    this.regularStripe = 30; // Regular stripe width
    this.zoomDuration = 600; // Zoom effect duration
    this.bloomScale = 100; // TunableParameters.BLOOM_SCALE from original (default 100)
    this.clampPadding = 150;
    this.showClampBox = false;

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

    // Animation timer
    this.animationTimer = null;

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

    // Initialize stripe sizes based on canvas height
    this.thinStripe = (1 / 100) * this.canvasCssHeight;
    this.regularStripe = 2 * this.thinStripe;
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

    this.thinStripe = (1 / 100) * cssHeight;
    this.regularStripe = 2 * this.thinStripe;
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

    const { r: nr, g: ng, b: nb } = this.hslToRgb(h, sat, l);
    return `rgb(${Math.round(nr)}, ${Math.round(ng)}, ${Math.round(nb)})`;
  }

  // Section 3.0.23: Circular random access from series
  value(series, n) {
    const index =
      ((n % this.maxBufferSize) + this.maxBufferSize) % this.maxBufferSize;
    return series[index] || 0;
  }

  // Section 3.0.22: Standard windowed running average
  runningAverage(series, c, windowSize = 50) {
    let sum = 0;
    let count = 0;

    for (let i = 0; i < windowSize; i++) {
      const idx = c - i;
      if (idx >= 0) {
        sum += Math.abs(this.value(series, idx));
        count++;
      }
    }

    return count > 0 ? sum / count : 1;
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
    const avg = this.runningAverage(this.samplesBuffer, this.flowerIndex);

    // Only draw if we have a peak and enough spacing from last bloom
    if (amp !== 0 && this.flowerIndex - this.lastBreak > 5) {
      // Calculate relative height
      const relativeHeight = Math.abs(amp) / avg;

      // Calculate second derivative for Y position
      const secondDeriv =
        this.value(this.samplesBuffer, this.flowerIndex - 2) -
        2 * this.value(this.samplesBuffer, this.flowerIndex - 1) +
        this.value(this.samplesBuffer, this.flowerIndex);

      // Calculate size (from documentation formula)
      let size = relativeHeight * 65.0 * (this.bloomScale / 100);

      // Calculate position (bottom-to-top sweep)
      let fY =
        this.canvasCssHeight -
        ((5 * (this.flowerIndex + 100)) % this.canvasCssHeight);
      let fX = (Math.abs(secondDeriv) * 10) % this.canvasCssWidth;
      // let fY = this.canvas.height / 2 + secondDeriv * (avg * 10);

      // Clamp positions to canvas bounds
      fY = Math.max(
        this.clampPadding,
        Math.min(this.canvasCssHeight - this.clampPadding, fY),
      );
      fX = Math.max(
        this.clampPadding,
        Math.min(this.canvasCssWidth - this.clampPadding, fX),
      );
      size = Math.max(4, Math.min(375, size));

      // Draw flower if size is significant
      if (this.lastBreak === 0) {
        this.drawFlower(fX, fY, 20);
      } else {
        if (size > 4) {
          this.drawFlower(fX, fY, size);
        }
      }

      this.lastBreak = this.flowerIndex;
    }

    this.flowerIndex++;

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
  }

  // Easing function for flower bloom - ease-out-back with overshoot
  easeOutBack(t) {
    const c1 = 1.2;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  // Animation loop to render all flowers with effects
  render() {
    // Clear canvas with slight trail effect for blur
    this.ctx.fillStyle = "rgba(255, 255, 255, 1)";
    this.ctx.fillRect(0, 0, this.canvasCssWidth, this.canvasCssHeight);

    const now = Date.now();

    if (this.showClampBox) {
      this.ctx.save();
      this.ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
      this.ctx.setLineDash([6, 6]);
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(
        this.clampPadding,
        this.clampPadding,
        this.canvasCssWidth - this.clampPadding * 2,
        this.canvasCssHeight - this.clampPadding * 2,
      );
      this.ctx.restore();
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
      this.ctx.save();

      // Apply blur if needed
      if (flower.blur > 0) {
        this.ctx.filter = `blur(${flower.blur}px)`;
      }

      this.ctx.globalAlpha = flower.opacity;

      // Draw circles from smallest to largest (so largest is on bottom)
      for (let i = 0; i < flower.circles.length; i++) {
        const circle = flower.circles[i];
        const radius = circle.radius * flower.currentSize;

        // Skip if radius is invalid
        if (radius <= 0 || !isFinite(radius)) continue;

        this.ctx.fillStyle = circle.color;
        this.ctx.beginPath();
        this.ctx.arc(flower.x, flower.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    });
  }

  removeOldFlowers() {
    const now = Date.now();

    this.flowers = this.flowers.filter((flower) => {
      // Each flower has different lifecycle based on its size
      const maxAge = 25000 + flower.size * 20; // Fade duration + size-dependent delay
      return now - flower.createdAt < maxAge;
    });
  }

  // Start the animation
  start() {
    this.animationTimer = setInterval(() => {
      this.onFlowerTimer();
    }, this.animationDelay);

    // Render loop
    const renderLoop = () => {
      this.render();
      requestAnimationFrame(renderLoop);
    };
    renderLoop();
  }

  // Stop the animation
  stop() {
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
    }
  }

  // Add new seismic data to buffer
  addData(value) {
    this.samplesBuffer[this.bufferCount % this.maxBufferSize] = value;
    this.bufferCount++;
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

// Seismic data fetching from NCEDC
const net = ["BK", "BP"];
const sta = ["BKS"];
const loc = "00";
const cha = ["BHE", "BHN", "BHZ"];
const interval = 10000;
let lastTime = Date.now() - interval;

function formatTime(timestamp) {
  const pad = (num) => String(num).padStart(2, "0");
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function poll(bloom) {
  const currentTime = Date.now();
  const url = `https://service.ncedc.org/fdsnws/dataselect/1/query?net=${net.join(",")}&sta=${sta.join(",")}&loc=${loc}&cha=${cha.join(",")}&start=${formatTime(lastTime)}&end=${formatTime(currentTime)}`;
  lastTime = currentTime;

  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const dataRecords = miniseed.parseDataRecords(arrayBuffer);
    const segment = miniseed.createSeismogramSegment(dataRecords);
    segment.y.forEach((sample) => bloom.addData(sample));
  } catch (error) {
    console.error("Error fetching seismic data:", error);
  }

  setTimeout(() => poll(bloom), interval);
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
