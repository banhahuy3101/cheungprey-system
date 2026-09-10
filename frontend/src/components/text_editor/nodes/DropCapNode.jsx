import { DecoratorNode } from "lexical";

export class DropCapNode extends DecoratorNode {
  __letter;
  __size;
  __spacing;
  __weight;

  static getType() { return "drop-cap"; }
  static clone(node) {
    return new DropCapNode(node.__letter, node.__size, node.__spacing, node.__weight, node.__key);
  }

  constructor(letter, size, spacing, weight, key) {
    super(key);
    this.__letter = letter || "";
    this.__size = size || 3;
    this.__spacing = spacing || 4;
    this.__weight = weight || 700;
  }

  createDOM() {
    const span = document.createElement("span");
    span.style.display = "inline";
    return span;
  }

  updateDOM() { return false; }
  isInline() { return true; }

  exportJSON() {
    return {
      type: "drop-cap",
      version: 1,
      letter: this.__letter,
      size: this.__size,
      spacing: this.__spacing,
      weight: this.__weight,
    };
  }

  static importJSON(serializedNode) {
    return new DropCapNode(
      serializedNode.letter,
      serializedNode.size,
      serializedNode.spacing,
      serializedNode.weight,
    );
  }

  exportDOM() {
    const span = document.createElement("span");
    span.textContent = this.__letter;
    span.dataset.dropCap = "true";
    span.setAttribute("style", `float:left;font-size:${this.__size}em;line-height:1;margin-right:${this.__spacing}px;font-weight:${this.__weight}`);
    return { element: span };
  }

  static importDOM() {
    return {
      span: (domNode) => {
        if (!(domNode instanceof HTMLSpanElement) || domNode.dataset.dropCap !== "true") return null;
        return {
          conversion: (node) => {
            const style = node.style;
            const size = parseFloat(style.fontSize) || 3;
            const spacing = parseInt(style.marginRight, 10) || 4;
            const weight = parseInt(style.fontWeight, 10) || 700;
            return { node: new DropCapNode(node.textContent || "", size, spacing, weight) };
          },
          priority: 2,
        };
      },
    };
  }

  decorate() {
    return (
      <span
        data-drop-cap="true"
        style={{
          float: "left",
          fontSize: `${this.__size}em`,
          lineHeight: 1,
          marginRight: `${this.__spacing}px`,
          fontWeight: this.__weight,
        }}
      >
        {this.__letter}
      </span>
    );
  }
}

export function $createDropCapNode(letter, size, spacing, weight) {
  return new DropCapNode(letter, size, spacing, weight);
}
