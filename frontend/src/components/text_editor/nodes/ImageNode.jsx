import { useRef, useState, useCallback } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { DecoratorNode } from "lexical";

export function ImageComponent({ src, altText, width, alignment, nodeKey }) {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setIsSelected] = useState(false);
  const [currentWidth, setCurrentWidth] = useState(width || 400);
  const [currentAlignment, setCurrentAlignment] = useState(alignment || "center");
  const imgRef = useRef(null);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  // Sync alignment/width changes back into the node
  const updateNode = useCallback((newWidth, newAlignment) => {
    editor.update(() => {
      const node = editor.getEditorState()._nodeMap.get(nodeKey);
      if (node && node instanceof ImageNode) {
        const writable = node.getWritable();
        writable.__width = newWidth;
        writable.__alignment = newAlignment;
      }
    });
  }, [editor, nodeKey]);

  const startCornerResize = (corner, e) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = currentWidth;

    const isLeft = corner === "tl" || corner === "bl";

    const onMouseMove = (moveEvent) => {
      if (!isResizing.current) return;
      const delta = isLeft
        ? startX.current - moveEvent.clientX
        : moveEvent.clientX - startX.current;
      const newWidth = Math.max(60, Math.min(800, startWidth.current + delta));
      setCurrentWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizing.current = false;
      updateNode(currentWidth, currentAlignment);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const setAlignment = (align) => {
    setCurrentAlignment(align);
    updateNode(currentWidth, align);
  };

  // Compute outer container style based on text wrapping mode
  const getContainerStyle = (align) => {
    if (align === "left") {
      return {
        display: "inline-block",
        float: "left",
        marginRight: "8px",
        marginBottom: "4px",
        width: "fit-content",
        maxWidth: "100%",
        verticalAlign: "baseline",
      };
    }
    if (align === "right") {
      return {
        display: "inline-block",
        float: "right",
        marginLeft: "8px",
        marginBottom: "4px",
        width: "fit-content",
        maxWidth: "100%",
        verticalAlign: "baseline",
      };
    }
    if (align === "inline") {
      return {
        display: "inline-block",
        verticalAlign: "baseline",
        margin: "0 2px",
        width: "fit-content",
        maxWidth: "100%",
        lineHeight: "1",
      };
    }
    if (align === "infront") {
      return {
        display: "inline-block",
        position: "relative",
        zIndex: 30,
        margin: "0",
        width: "fit-content",
        maxWidth: "100%",
        verticalAlign: "baseline",
      };
    }
    if (align === "behind") {
      return {
        display: "inline-block",
        position: "relative",
        zIndex: 0,
        opacity: 0.75,
        margin: "0",
        width: "fit-content",
        maxWidth: "100%",
        verticalAlign: "baseline",
      };
    }
    // center — centered block wrapped tightly around image size
    return {
      display: "table",
      margin: "4px auto",
      clear: "both",
      width: "fit-content",
      maxWidth: "100%",
    };
  };

  const onDragStart = (e) => {
    e.dataTransfer.setData("lexical-node-key", nodeKey);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`relative select-none ${isSelected ? "cursor-move" : "cursor-pointer"}`}
      style={getContainerStyle(currentAlignment)}
      onClick={() => setIsSelected(true)}
      onBlur={() => setIsSelected(false)}
      tabIndex={-1}
    >
      {/* MS Word Text Wrapping Toolbar */}
      {isSelected && (
        <div
          className="absolute -top-11 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900/95 backdrop-blur-sm rounded-xl px-2 py-1 z-[100] shadow-2xl border border-slate-700/60 whitespace-nowrap animate-in fade-in duration-100"
          onMouseDown={(e) => e.preventDefault()}
        >
          {[
            { align: "inline", label: "Inline", title: "In Line with Text (អក្សរអមសងខាង)" },
            { align: "left", label: "Left", title: "Square Left (រុំខាងឆ្វេង)" },
            { align: "center", label: "Center", title: "Top & Bottom Center (កណ្តាល)" },
            { align: "right", label: "Right", title: "Square Right (រុំខាងស្តាំ)" },
            { align: "infront", label: "In Front", title: "In Front of Text (នៅពីលើអក្សរ)" },
            { align: "behind", label: "Behind", title: "Behind Text (នៅពីក្រោយអក្សរ)" },
          ].map(({ align, label, title }) => (
            <button
              key={align}
              type="button"
              onClick={() => setAlignment(align)}
              className={`px-2 py-1 text-[11px] rounded-md transition-colors font-medium ${
                currentAlignment === align
                  ? "bg-blue-600 text-white font-bold"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
              title={title}
            >
              {label}
            </button>
          ))}
          <div className="w-px h-4 bg-slate-700 mx-1" />
          <span className="text-slate-400 text-[11px] px-1 font-semibold">{currentWidth}px</span>
        </div>
      )}

      {/* Image with resize handles */}
      <div className="relative inline-block">
        <img
          ref={imgRef}
          src={src}
          alt={altText}
          draggable={false}
          style={{ width: `${currentWidth}px` }}
          className={`h-auto rounded-lg block border-none m-0 p-0 transition-all ${
            isSelected ? "ring-2 ring-blue-600 ring-offset-1" : ""
          }`}
        />
        {/* 4 Corner Resize Points */}
        {isSelected && (
          <>
            <div
              onMouseDown={(e) => startCornerResize("tl", e)}
              className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-blue-600 border-2 border-white rounded-full cursor-nwse-resize shadow-md z-20 hover:scale-125 transition-transform"
              title="Resize Top-Left"
            />
            <div
              onMouseDown={(e) => startCornerResize("tr", e)}
              className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-blue-600 border-2 border-white rounded-full cursor-nesw-resize shadow-md z-20 hover:scale-125 transition-transform"
              title="Resize Top-Right"
            />
            <div
              onMouseDown={(e) => startCornerResize("bl", e)}
              className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-blue-600 border-2 border-white rounded-full cursor-nesw-resize shadow-md z-20 hover:scale-125 transition-transform"
              title="Resize Bottom-Left"
            />
            <div
              onMouseDown={(e) => startCornerResize("br", e)}
              className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-blue-600 border-2 border-white rounded-full cursor-nwse-resize shadow-md z-20 hover:scale-125 transition-transform"
              title="Resize Bottom-Right"
            />
          </>
        )}
      </div>
    </div>
  );
}

export class ImageNode extends DecoratorNode {
  __src;
  __altText;
  __width;
  __alignment;

  static getType() { return "image"; }
  static clone(node) {
    return new ImageNode(node.__src, node.__altText, node.__width, node.__alignment, node.__key);
  }

  constructor(src, altText, width, alignment, key) {
    super(key);
    this.__src = src;
    this.__altText = altText || "Uploaded Image";
    this.__width = width || 400;
    this.__alignment = alignment || "center";
  }

  getSrc() { return this.__src; }
  getAltText() { return this.__altText; }
  getWidth() { return this.__width; }
  getAlignment() { return this.__alignment; }

  createDOM() {
    const span = document.createElement("span");
    span.style.display = "inline-block";
    span.style.maxWidth = "100%";
    return span;
  }
  updateDOM() { return false; }

  static importJSON(serializedNode) {
    return new ImageNode(
      serializedNode.src,
      serializedNode.altText,
      serializedNode.width || 400,
      serializedNode.alignment || "center"
    );
  }
  exportJSON() {
    return {
      type: "image", version: 1,
      src: this.__src, altText: this.__altText,
      width: this.__width, alignment: this.__alignment,
    };
  }

  exportDOM() {
    const img = document.createElement("img");
    img.src = this.__src;
    img.alt = this.__altText;
    const align = this.__alignment;
    const imgStyle = `width:${this.__width}px; height:auto; border-radius:6px; display:block;`;
    let wrapperStyle = "";
    if (align === "left") wrapperStyle = `float:left; margin-right:12px; margin-bottom:8px; display:inline-block;`;
    else if (align === "right") wrapperStyle = `float:right; margin-left:12px; margin-bottom:8px; display:inline-block;`;
    else if (align === "inline") wrapperStyle = `display:inline-block; vertical-align:bottom; margin:0 6px;`;
    else if (align === "infront") wrapperStyle = `display:inline-block; position:relative; z-index:30; margin:4px 8px;`;
    else if (align === "behind") wrapperStyle = `display:inline-block; position:relative; z-index:0; opacity:0.75; margin:4px 8px;`;
    else wrapperStyle = `text-align:center; clear:both; display:table; margin:8px auto;`;
    img.setAttribute("style", imgStyle);
    const wrapper = document.createElement("span");
    wrapper.setAttribute("style", wrapperStyle);
    wrapper.appendChild(img);
    return { element: wrapper };
  }

  static importDOM() {
    return {
      img: () => ({
        conversion: (domNode) => {
          if (domNode instanceof HTMLImageElement) {
            const styleStr = domNode.getAttribute("style") || "";
            const widthMatch = styleStr.match(/width:\s*(\d+)px/);
            const width = widthMatch ? parseInt(widthMatch[1]) : 400;
            const parent = domNode.parentElement;
            const parentStyle = parent?.getAttribute("style") || "";
            let alignment = "center";
            if (parentStyle.includes("float:left") || parentStyle.includes("float: left")) alignment = "left";
            else if (parentStyle.includes("float:right") || parentStyle.includes("float: right")) alignment = "right";
            else if (parentStyle.includes("z-index:30") || parentStyle.includes("z-index: 30")) alignment = "infront";
            else if (parentStyle.includes("z-index:0") || parentStyle.includes("z-index: 0")) alignment = "behind";
            else if (parentStyle.includes("inline-block")) alignment = "inline";
            else if (parent?.style?.textAlign) alignment = parent.style.textAlign;
            const node = new ImageNode(domNode.src, domNode.alt, width, alignment);
            return { node };
          }
          return null;
        },
        priority: 1,
      }),
    };
  }

  decorate(editor, config) {
    return (
      <ImageComponent
        src={this.__src}
        altText={this.__altText}
        width={this.__width}
        alignment={this.__alignment}
        nodeKey={this.__key}
      />
    );
  }

  isInline() { return true; }
}

export function $createImageNode(src, altText, width, alignment) {
  return new ImageNode(src, altText, width || 400, alignment || "inline");
}
