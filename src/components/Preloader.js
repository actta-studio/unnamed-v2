import each from "lodash/each";
import GSAP from "gsap";
import Component from "../classes/Component";

export default class Preloader extends Component {
  constructor() {
    super({
      element: ".preloader",
      elements: {
        stage: ".preloader__stage",
        "image-container": ".image-container",
        progress: ".preloader__progress",
        images: null,
      },
    });

    this.easePower3Out = (t) => 1 - Math.pow(1 - t, 3);
    this.easeExpoOut = (t) => (t === 0 ? 0 : 1 - Math.pow(2, -10 * t));
    this.easeBackOut =
      (s = 1.4) =>
      (t) => {
        const inv = 1 - t;
        return 1 - inv * inv * ((s + 1) * inv - s);
      };

    // this.elements.set(
    //   "images",
    //   this.element.querySelectorAll(".preloader__image")
    // );

    this.length = 0;
    this.createLoader();
  }

  createLoader() {
    // if (this.elements.get("images").length === 0) {
    //   this.elements.get("progress").innerHTML = "100%";
    //   this.onLoaded();
    //   return;
    // } else {
    //   each(
    //     this.elements.get("images"),
    //     (element) => {
    //       setTimeout(() => {
    //         element.onload = (_) => this.onAssetLoaded(element);
    //         element.src = element.getAttribute("data-src");
    //         element.classList.add("loaded");
    //       });
    //     },
    //     2000
    //   );
    // }

    this.onLoaded();
  }

  onAssetLoaded(image) {
    this.length += 1;
    const percent = this.length / (this.elements.get("images").length ?? 1);

    const clampedPercent = Math.max(0, Math.min(percent * 100, 100));

    this.elements.get("progress").innerHTML = Math.round(clampedPercent) + "%";

    if (percent === 1) {
      this.onLoaded();
    }
  }

  animateArcBottomToCenterUnitsRAF(el, opts = {}) {
    const {
      bottomUnits = 200,
      extraUnits = 0,
      liftUnits = 0,

      startDeg = 300,
      endDeg = 360,
      radius = 500,

      minScale = 0.82,
      maxScale = 1.08,
      depthStrength = 700,
      minRot = -75,
      maxRot = 0,

      duration = 1500,
      easeY = (t) => t,
      easeScale = (t) => t,
      easeRot = (t) => t,
    } = opts;

    if (!el) return Promise.resolve();

    const images = Array.from(el.querySelectorAll("img"));
    const imgCount = images.length;
    images.forEach((img, i) => {
      img.style.position = "absolute";
      img.style.inset = "0";
      img.style.opacity = i === 0 ? "1" : "0";
      img.style.visibility = "visible";
      img.style.pointerEvents = "none";
    });

    const toRad = (d) => (d * Math.PI) / 180;
    const lerp = (a, b, t) => a + (b - a) * t;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    const t0 = toRad(startDeg);
    const t1 = toRad(endDeg);

    const yArc = (t) => radius * Math.cos(t);
    const zArc = (t) => radius * Math.sin(t);

    const y0 = yArc(t0),
      y1 = yArc(t1);
    const startU = bottomUnits - liftUnits + extraUnits;
    const endU = 0;
    const A = (endU - startU) / (y1 - y0);
    const B = endU - A * y1;
    const yUnits = (t) => A * yArc(t) + B;

    const zMin = Math.min(zArc(t0), zArc(t1));
    const zMax = Math.max(zArc(t0), zArc(t1));
    const depth01 = (t) => (zArc(t) - zMin) / (zMax - zMin);

    const unitToPx = window.innerHeight / 2 / bottomUnits;

    el.style.transformOrigin = "50% 50%";
    el.style.willChange = "transform";
    const baseTranslate = "translate(-50%, -50%)";

    {
      const d0 = clamp(depth01(t0), 0, 1);
      const s0 = lerp(minScale, maxScale, easeScale(d0));
      const u0 = yUnits(t0);
      const y0px = u0 * unitToPx;
      const z0px = -depthStrength * (1 - d0);
      const r0 = lerp(minRot, maxRot, easeRot(d0));

      el.style.transform =
        `${baseTranslate} translate3d(0, ${y0px}px, ${z0px}px) ` +
        `scale(${s0 * 0.98}, ${s0}) rotateX(${r0}deg)`;

      el.style.visibility = "visible";
    }

    return new Promise((resolve) => {
      const tStart = performance.now();
      let lastIndex = 0;

      const step = (now) => {
        const elapsed = now - tStart;
        const pTime = clamp(elapsed / duration, 0, 1);
        const pY = typeof easeY === "function" ? easeY(pTime) : pTime;

        const theta = lerp(t0, t1, pY);

        const pMotion = clamp((theta - t0) / (t1 - t0), 0, 1);
        if (imgCount > 1) {
          const seg = Math.floor(pMotion * imgCount);
          if (seg !== lastIndex) {
            images.forEach((img, i) => {
              img.style.opacity = i === seg ? "1" : "0";
            });
            lastIndex = seg;
          }
        }

        const u = yUnits(theta);
        const ypx = u * unitToPx;

        const d = clamp(depth01(theta), 0, 1);
        const s = lerp(minScale, maxScale, easeScale(d));
        const rX = lerp(minRot, maxRot, easeRot(d));
        const zpx = -depthStrength * (1 - d);

        el.style.transform =
          `${baseTranslate} translate3d(0, ${ypx}px, ${zpx}px) ` +
          `scale(${s * 0.98}, ${s}) rotateX(${rX}deg)`;

        if (pTime < 1) {
          requestAnimationFrame(step);
        } else {
          const sEnd = lerp(minScale, maxScale, 1);
          el.style.transform =
            `${baseTranslate} translate3d(0, ${endU * unitToPx}px, 0px) ` +
            `scale(${sEnd * 0.98}, ${sEnd}) rotateX(0deg)`;

          if (imgCount > 0) {
            images.forEach(
              (img, i) => (img.style.opacity = i === imgCount - 1 ? "1" : "0")
            );
          }
          resolve();
        }
      };

      try {
        GSAP && GSAP.killTweensOf && GSAP.killTweensOf(el);
      } catch {}
      el.style.transition = "none";
      requestAnimationFrame(step);
    });
  }

  backOut(t, s) {
    const c3 = s + 1;
    const x = t - 1;
    return 1 + c3 * x * x * x + s * x * x;
  }

  backOutPeakValue(s, samples = 200) {
    let peak = 0;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const v = this.backOut(t, s);
      if (v > peak) peak = v;
    }
    return peak;
  }

  createBackOvershootEaseForPeak(minScale, maxScale, targetPeakScale) {
    const normTargetPeak = (targetPeakScale - minScale) / (maxScale - minScale);

    let lo = 0.0,
      hi = 12.0,
      best = 1.70158;
    for (let iter = 0; iter < 20; iter++) {
      const mid = (lo + hi) / 2;
      const peak = this.backOutPeakValue(mid);
      if (peak < normTargetPeak) {
        lo = mid;
      } else {
        hi = mid;
      }
      best = mid;
    }
    return (t) => this.backOut(t, best);
  }

  async onLoaded() {
    if (this._done) return;
    this._done = true;

    const el = this.element.querySelector(".image-container");
    if (!el) return;

    el.style.transform = "translate(-50%, -50%)";
    el.style.visibility = "hidden";

    const unitToPx = window.innerHeight / 2 / 200;
    const extraPx = el.offsetHeight / 2 + 90;
    const extraUnits = extraPx / unitToPx;

    await this.animateArcBottomToCenterUnitsRAF(el, {
      bottomUnits: 200,

      startDeg: 300,
      endDeg: 360,

      radius: 1000,
      extraUnits,
      liftUnits: 0,

      depthStrength: 2000,
      minScale: 0.62,
      maxScale: 1,
      minRot: -90,
      maxRot: 0,

      bottomUnits: 200,
      startDeg: 300,
      endDeg: 360,

      radius: 500,
      extraUnits,
      liftUnits: 0,

      depthStrength: 400,
      minScale: 0.82,
      maxScale: 1.08,
      minRot: 85,
      maxRot: 0,
      duration: 1200,

      duration: 1700,
      easeY: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
      easeScale: this.createBackOvershootEaseForPeak(0.62, 1.0, 1),
      easeRot: (t) =>
        t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,
    });
  }

  destroy() {
    this.element.parentNode.removeChild(this.element);
  }
}
