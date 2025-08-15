import each from "lodash/each";
import GSAP from "gsap";
import Component from "../classes/Component";

export default class Preloader extends Component {
  constructor() {
    super({
      element: ".preloader",
      elements: {
        stage: ".preloader__stage",
        content: ".content",
        "progress-indicator": ".preloader__progress-indicator",
        images: document.querySelectorAll("img"),
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

    this.length = 0;
    this.createLoader();

    this._loading_done = false;
  }

  async createLoader() {
    if (this.elements.get("images").length === 0) {
      await this.setProgressIndicator(1);
      if (!this._done) this.onLoaded();
      return;
    } else {
      each(
        this.elements.get("images"),
        (element) => {
          setTimeout(() => {
            element.onload = (_) => this.onAssetLoaded(element);
            element.src = element.getAttribute("data-src");
            element.classList.add("loaded");
          });
        },
        2000
      );
    }
  }

  setProgressIndicator(percent) {
    const progressIndicator = this.elements.get("progress-indicator");
    if (!progressIndicator) return Promise.resolve();

    const currentValue =
      parseFloat(
        getComputedStyle(progressIndicator).getPropertyValue("--progress")
      ) || 0;

    const targetValue = Math.max(0, Math.min(percent * 100, 100));
    const delta = Math.abs(targetValue - currentValue);

    const duration = Math.max(0.3, Math.min(1.2, delta / 80));

    if (this._progressTween) this._progressTween.kill();

    return new Promise((resolve) => {
      this._progressTween = GSAP.to(progressIndicator, {
        "--progress": targetValue,
        duration,
        ease: "power2.out",
        onComplete: resolve,
      });
    });
  }

  async onAssetLoaded() {
    this.length += 1;
    const percent = this.length / (this.elements.get("images").length ?? 1);

    const clampedPercent = Math.max(0, Math.min(percent * 100, 100));

    this.setProgressIndicator(percent);

    if (clampedPercent == 100 && !this._loading_done) {
      await this.setProgressIndicator(1);
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

      tailDrop = 0.06,
      tailWindow = 0.18,
      tailCurve = 2.0,
    } = opts;

    if (!el) return Promise.resolve();

    const toRad = (d) => (d * Math.PI) / 180;
    const lerp = (a, b, t) => a + (b - a) * t;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const smoothstep = (t) => t * t * (3 - 2 * t);
    const powmix = (t, k) => (k <= 1 ? t : Math.pow(t, k));

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

      const step = (now) => {
        const elapsed = now - tStart;
        const pTime = clamp(elapsed / duration, 0, 1);
        const pY = typeof easeY === "function" ? easeY(pTime) : pTime;

        const theta = lerp(t0, t1, pY);
        const u = yUnits(theta);
        const ypx = u * unitToPx;
        const d = clamp(depth01(theta), 0, 1);

        const baseS = lerp(minScale, maxScale, easeScale(d));

        let taper = 1;
        if (tailDrop > 0 && tailWindow > 0) {
          const startTail = 1 - tailWindow;
          if (pTime >= startTail) {
            const uTail = clamp((pTime - startTail) / tailWindow, 0, 1);
            const shaped = powmix(smoothstep(uTail), tailCurve);
            taper = 1 - tailDrop * shaped;
          }
        }

        const s = baseS * taper;
        const rX = lerp(minRot, maxRot, easeRot(d));
        const zpx = -depthStrength * (1 - d);

        el.style.transform =
          `${baseTranslate} translate3d(0, ${ypx}px, ${zpx}px) ` +
          `scale(${s * 0.98}, ${s}) rotateX(${rX}deg)`;

        if (pTime < 1) {
          requestAnimationFrame(step);
        } else {
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
      if (peak < normTargetPeak) lo = mid;
      else hi = mid;
      best = mid;
    }
    return (t) => this.backOut(t, best);
  }

  async onLoaded() {
    const el = this.elements.get("content");
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
      radius: 500,
      extraUnits,
      liftUnits: 0,
      depthStrength: 400,
      minScale: 0.82,
      maxScale: 1.08,
      minRot: 85,
      maxRot: 0,
      duration: 1700,
      easeY: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
      easeScale: this.createBackOvershootEaseForPeak(0.82, 1.08, 1.08),
      easeRot: (t) =>
        t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,
      tailDrop: 0.03,
      tailWindow: 0.18,
      tailCurve: 2.0,
    });
  }

  destroy() {
    this.element.parentNode.removeChild(this.element);
  }
}
