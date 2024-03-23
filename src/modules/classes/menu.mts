export default class Menu<Item = any> {
  items: Item[];
  #index: number;

  constructor(items: Item[] = [], index = 0) {
    if (!Array.isArray(items)) {
      throw new TypeError("Expected an array of items");
    }
    this.items = items;
    this.#validateIndex(index);
    this.#index = index;
  }

  #validateIndex(index: number) {
    if (typeof index !== "number" || !Number.isInteger(index)) {
      throw new TypeError("Index must be a whole number");
    }
    if (index < 0 || (this.items.length !== 0 && index >= this.items.length)) {
      throw new RangeError("Index not in range of said items");
    }
  }

  get index() {
    return this.#index;
  }

  set index(index) {
    this.#validateIndex(index);
    this.#index = index;
  }

  get empty() {
    return this.items.length === 0;
  }

  get firstItem() {
    if (this.empty) return null;
    return this.items[(this.#index = 0)];
  }

  get previous() {
    return !this.empty && this.#index > 0;
  }

  get previousItem() {
    if (!this.previous) return null;
    return this.items[(this.#index -= 1)];
  }

  get currentItem() {
    if (this.empty) return null;
    return this.items[this.#index];
  }

  get next() {
    return !this.empty && this.index < this.items.length - 1;
  }

  get nextItem() {
    if (!this.next) return null;
    return this.items[(this.#index += 1)];
  }

  get lastItem() {
    if (this.empty) return null;
    return this.items[(this.#index = this.items.length - 1)];
  }

  get randomItem() {
    if (this.empty) return null;
    return this.items[
      (this.#index = Math.floor(Math.random() * this.items.length))
    ];
  }

  copy() {
    return new Menu(this.items, this.#index);
  }

  erase() {
    return delete (this as any).items;
  }
}
