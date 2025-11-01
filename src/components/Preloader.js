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
        characters: ".content .char",
        "image-container": ".content .images",
      },
    });

    // easing helpers (unchanged)
    this.easePower3Out = (t) => 1 - Math.pow(1 - t, 3);
    this.easeExpoOut = (t) => (t === 0 ? 0 : 1 - Math.pow(2, -10 * t));
    this.easeBackOut =
      (s = 1.4) =>
      (t) => {
        const inv = 1 - t;
        return 1 - inv * inv * ((s + 1) * inv - s);
      };

    this.length = 0;
    this._done = false;
    this._loading_done = false;

    // optional: ensure chars start hidden/offset (no flash)
    try {
      GSAP.set(this.elements.get("characters"), { autoAlpha: 0, y: 10 });
    } catch {}

    // react to live changes of reduced motion
    if (window.matchMedia) {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener?.("change", (e) => {
        if (e.matches && !this._done) this.finishImmediately();
      });
    }

    this.createLoader();
  }

  // ---------- Reduced motion helpers ----------
  isReducedMotion() {
    return !!(
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  finishImmediately() {
    // progress → 100 instantly
    const indicator = this.elements.get("progress-indicator");
    if (indicator) indicator.style.setProperty("--progress", "100");

    // content visible at final pose
    const content = this.elements.get("content");
    if (content) {
      content.style.visibility = "visible";
      content.style.transform = "translate(-50%, -50%)";
      content.style.gap = "0";
      content.style.columnGap = "0";
      content.style.rowGap = "0";
    }

    // chars revealed
    try {
      GSAP.set(this.elements.get("characters"), { autoAlpha: 1, y: 0 });
    } catch {}

    // collapse the image container
    const imgWrap = this.elements.get("image-container");
    if (imgWrap) {
      Object.assign(imgWrap.style, {
        width: "0",
        minWidth: "0",
        paddingLeft: "0",
        paddingRight: "0",
        marginLeft: "0",
        marginRight: "0",
        overflow: "hidden",
      });
    }

    this._done = true;
    this._loading_done = true;
  }

  // ---------- Loader ----------
  async createLoader() {
    if (this.isReducedMotion()) {
      this.finishImmediately();
      return;
    }

    const imgs = this.elements.get("images");
    if (!imgs || imgs.length === 0) {
      await this.setProgressIndicator(1);
      if (!this._done) await this.onLoaded();
      return;
    }

    each(imgs, (el) => {
      el.onload = () => this.onAssetLoaded();
      const src = el.getAttribute("data-src") || el.src;
      if (el.src !== src) el.src = src;
      el.classList.add("loaded");
      // fire immediately if cached
      if (el.complete) el.onload?.();
    });
  }

  setProgressIndicator(percent) {
    const indicator = this.elements.get("progress-indicator");
    if (!indicator) return Promise.resolve();

    const target = Math.max(0, Math.min(percent * 100, 100));

    if (this.isReducedMotion()) {
      indicator.style.setProperty("--progress", String(target));
      return Promise.resolve();
    }

    const current =
      parseFloat(getComputedStyle(indicator).getPropertyValue("--progress")) ||
      0;
    const delta = Math.abs(target - current);

    // ~1.25s for 0→100, proportional otherwise
    const duration = Math.max(0.3, Math.min(1.25, delta / 80));

    this._progressTween?.kill();

    return new Promise((resolve) => {
      this._progressTween = GSAP.to(indicator, {
        "--progress": target,
        duration,
        ease: "power2.out",
        overwrite: "auto",
        onComplete: resolve,
      });
    });
  }

  async onAssetLoaded() {
    const total = this.elements.get("images").length || 1;
    this.length += 1;

    const percent = this.length / total;
    await this.setProgressIndicator(percent);

    if (this.length >= total && !this._loading_done) {
      this._loading_done = true;
      await this.setProgressIndicator(1);
      if (!this._done) await this.onLoaded();
    }
  }

  // ---------- Arc animation ----------
  animateArcBottomToCenterUnitsRAF(el, opts = {}) {
    if (this.isReducedMotion()) {
      this.finishImmediately();
      return Promise.resolve();
    }

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

      // end‑taper
      tailDrop = 0.06,
      tailWindow = 0.18,
      tailCurve = 2.0,

      // outro timeline options
      revealEase = "power3.out",
      revealDuration = 0.6,
      charStagger = 0.01,
      collapseDuration = 0.5,
      collapseEase = "power2.inOut",
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
      // initial pose
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
        if (!document.body.contains(el)) return resolve(); // guard if removed

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
          return;
          // outro timeline
          const chars = this.elements.get("characters");
          const imgWrap = this.elements.get("image-container");
          const content = this.elements.get("content");

          const tl = GSAP.timeline({
            defaults: { ease: revealEase, delay: 0.5 },
            onComplete: resolve,
          });

          tl.to(
            chars,
            {
              autoAlpha: 1,
              y: 0,
              duration: revealDuration,
              stagger: charStagger,
            },
            0
          )
            .to(
              content,
              {
                gap: 0,
                columnGap: 0,
                rowGap: 0,
                duration: collapseDuration,
                ease: collapseEase,
              },
              0
            )
            .to(
              imgWrap,
              {
                width: 0,
                minWidth: 0,
                paddingLeft: 0,
                paddingRight: 0,
                marginLeft: 0,
                marginRight: 0,
                duration: collapseDuration,
                ease: collapseEase,
                overflow: "hidden",
              },
              0
            );
        }
      };

      try {
        GSAP?.killTweensOf?.(el);
      } catch {}
      el.style.transition = "none";
      requestAnimationFrame(step);
    });
  }

  // ---------- math helpers ----------
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
    const target = Math.min(Math.max(targetPeakScale, minScale), maxScale);
    const normTargetPeak = (target - minScale) / (maxScale - minScale);
    let lo = 0.0,
      hi = 12.0,
      best = 1.70158;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      const peak = this.backOutPeakValue(mid);
      if (peak < normTargetPeak) lo = mid;
      else hi = mid;
      best = mid;
    }
    return (t) => this.backOut(t, best);
  }

  // ---------- entry ----------
  async onLoaded() {
    if (this._done) return;
    if (this.isReducedMotion()) {
      this.finishImmediately();
      return;
    }
    this._done = true;

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
      radius: 1200,
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

      revealEase: "power3.out",
      revealDuration: 0.6,
      charStagger: 0.01,
      collapseDuration: 0.5,
      collapseEase: "power2.inOut",
    });
  }

  destroy() {
    try {
      this._progressTween?.kill();
      GSAP.killTweensOf(this.elements.get("content"));
      GSAP.killTweensOf(this.elements.get("image-container"));
      GSAP.killTweensOf(this.elements.get("characters"));
    } catch {}
    this.element.parentNode?.removeChild?.(this.element);
  }
}
