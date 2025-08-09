import EventEmitter from "events";
import each from "lodash/each";

export default class Component extends EventEmitter {
  constructor({ id, element, elements }) {
    super();
    this.selector = element;
    this.selectorChildren = {
      ...elements,
    };

    this.create();
    this.addEventListeners();
  }

  create() {
    if (this.selector instanceof window.HTMLElement) {
      this.element = this.selector;
    } else {
      this.element = document.querySelector(this.selector);
    }

    this.elements = new Map();

    each(this.selectorChildren, (selector, key) => {
      if (
        selector instanceof window.HTMLElement ||
        selector instanceof window.NodeList
      ) {
        this.elements.set(key, selector);
      } else if (Array.isArray(selector)) {
        this.elements.set(key, selector);
      } else {
        this.elements.set(key, document.querySelectorAll(selector));

        if (this.elements.get(key).length === 0) {
          this.elements.set(key, null);
        } else if (this.elements.get(key).length === 1) {
          this.elements.set(key, document.querySelector(selector));
        }
      }
    });
  }

  addEventListeners() {}

  removeEventListeners() {}
}
