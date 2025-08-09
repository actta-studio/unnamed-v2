import each from "lodash/each";
import GSAP from "gsap";
import Component from "../classes/Component";

export default class Preloader extends Component {
  constructor() {
    super({
      element: ".preloader",
      elements: {
        images: document.querySelectorAll("img"),
        progress: ".preloader__progress",
      },
    });

    this.length = 0;

    this.createLoader();
  }

  createLoader() {
    if (this.elements.get("images").length === 0) {
      this.elements.get("progress").innerHTML = "100%";
      // this.onLoaded();
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

  onAssetLoaded(image) {
    this.length += 1;
    const percent = this.length / (this.elements.get("images").length ?? 1);

    const clampedPercent = Math.max(0, Math.min(percent * 100, 100));

    this.elements.get("progress").innerHTML = Math.round(clampedPercent) + "%";

    if (percent === 1) {
      // this.onLoaded();
    }
  }

  onLoaded() {
    return new Promise((resolve) => {
      this.animateOut = GSAP.timeline({
        defaults: {
          delay: 1.5,
        },
      });

      let prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      );

      this.animateOut.to(".preloader", {
        // y: "100vh",
      });

      this.animateOut.call((_) => this.emit("completed"));
    });
  }

  destroy() {
    this.element.parentNode.removeChild(this.element);
  }
}
