import Page from "../../classes/Page";

export default class Home extends Page {
  constructor({ lenis, sourcePreloader }) {
    super({
      id: "home",
      element: ".page--home",
      elements: {},
    });

    this.lenis = lenis;
    this.sourcePreloader = sourcePreloader;
  }

  create({ sourcePreloader }) {
    super.create();
    this.sourcePreloader = sourcePreloader;
    this.addEventListeners();

    console.log(`${this.id} page created`);
  }

  show() {
    super.show().then(() => {
      this.lenis.start();
    });
  }

  createAnimations() {}

  addEventListeners() {}

  removeEventListeners() {}

  destroy() {
    super.destroy();
  }
}
