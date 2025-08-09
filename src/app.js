import Lenis from "lenis";

// [page imports]
import Home from "./templates/home";
import About from "./templates/about";

class App {
  constructor() {
    console.log("App initialized");

    this.initLenis();
    this.createContent();

    this.createTemplates();
  }

  createContent() {
    this.content = document.querySelector("#content");
    this.template = this.content.getAttribute("data-template");

    console.log("Content created", this.content, this.template);
  }

  initLenis() {
    window.scrollTo(0, 0);
    this.lenis = new Lenis({
      easing: (x) => {
        return -(Math.cos(Math.PI * x) - 1) / 2;
      },
    });

    this.raf = this.raf.bind(this);
    requestAnimationFrame(this.raf);

    this.lenis.stop();
  }

  raf(time) {
    this.lenis.raf(time);
    requestAnimationFrame(this.raf);
  }

  suspendScroll() {
    this.lenis.stop();
  }

  resumeScroll() {
    this.lenis.start();
  }

  createTemplates() {
    this.templates = new Map();

    this.templates.set(
      "home",
      new Home({
        lenis: this.lenis,
      })
    );

    this.templates.set(
      "page.about",
      new About({
        lenis: this.lenis,
      })
    );

    this.template = this.templates.get(this.template);
    this.template.create({
      sourcePreloader: true,
    });

    this.template.show();
  }

  createPreloader() {
    this.preloader = new Preloader();
    this.preloader.once("completed", this.onPreloaded.bind(this));
  }

  async onChange({ url, push = true }) {
    if (url === window.location.href) return;

    window.scrollTo(0, 0);

    this.page.hide();
    this.page.destroy();

    const request = await window.fetch(url);

    if (request.status === 200) {
      const html = await request.text();
      const div = document.createElement("div");
      if (push) {
        window.history.pushState({}, "", url);
      }
      div.innerHTML = html;
      const divContent = div.querySelector("#content");
      this.template = divContent.getAttribute("data-template");

      this.content.setAttribute(
        "data-template",
        divContent.getAttribute("data-template")
      );

      this.content.innerHTML = divContent.innerHTML;

      this.page = this.templates.get(this.template);
      this.page.create();
      this.page.show();
      this.addLinkListeners();
    } else {
      console.log(404);
    }
  }

  onPreloaded() {
    window.scrollTo(0, 0);
    this.preloader.destroy();
    this.page.show();
  }

  async onPopState() {
    await this.onChange({ url: window.location.pathname, push: false });
  }

  addEventListeners() {
    window.addEventListener("popstate", this.onPopState.bind(this));
  }

  removeEventListeners() {
    window.removeEventListener("popstate", this.onPopState.bind(this));
  }

  addLinkListeners() {
    const allLinks = document.querySelectorAll("a");

    each(allLinks, (link) => {
      link.onclick = (event) => {
        event.preventDefault();
        const { href } = link;

        this.onChange({ url: href });
      };
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new App();
});
