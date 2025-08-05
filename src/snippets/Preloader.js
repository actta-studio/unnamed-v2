export default class Preloader {
  constructor({ el }) {
    this.el = el;
    this.init();
  }

  init() {
    console.log("Preloader initialized", this.el);
  }
}
