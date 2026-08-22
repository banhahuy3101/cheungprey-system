import { useEffect, useRef, useState, useCallback } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

import { HeadingNode, QuoteNode, $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import {
  TableNode, TableCellNode, TableRowNode,
  $isTableCellNode, $isTableRowNode, $isTableNode,
  $getTableRowIndexFromTableCellNode,
  $getTableColumnIndexFromTableCellNode,
  $getTableCellNodeFromLexicalNode,
  $createTableNodeWithDimensions,
  $insertTableRow__EXPERIMENTAL,
  $insertTableColumn__EXPERIMENTAL,
  $deleteTableRow__EXPERIMENTAL,
  $deleteTableColumn__EXPERIMENTAL,
  $unmergeCell,
  $isTableSelection,
} from "@lexical/table";
import { ListItemNode, ListNode, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND } from "@lexical/list";
import { CodeNode, $createCodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";

import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import {
  $getRoot,
  $insertNodes,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  DecoratorNode,
  PASTE_COMMAND,
  DROP_COMMAND,
  COMMAND_PRIORITY_HIGH,
} from "lexical";
import { $setBlocksType, $patchStyleText } from "@lexical/selection";

import {
  LuBold,
  LuItalic,
  LuUnderline,
  LuStrikethrough,
  LuSubscript,
  LuSuperscript,
  LuList,
  LuListOrdered,
  LuAlignLeft,
  LuAlignCenter,
  LuAlignRight,
  LuAlignJustify,
  LuIndentIncrease,
  LuIndentDecrease,
  LuUndo,
  LuRedo,
  LuHeading1,
  LuHeading2,
  LuHeading3,
  LuPilcrow,
  LuQuote,
  LuCode,
  LuHighlighter,
  LuPalette,
  LuRemoveFormatting,
  LuMinus,
  LuTable,
  LuImage,
  LuLink,
  LuPrinter,
  LuPaintbrush,
  LuPlus,
  LuSquareCheck,
  LuFileText,
  LuSave,
  LuMaximize2,
  LuMinimize2,
  LuArrowUp,
  LuArrowDown,
  LuArrowLeft,
  LuArrowRight,
  LuTrash2,
  LuSplit,
  LuCombine,
  LuSearch,
} from "react-icons/lu";

const theme = {
  paragraph: "editor-paragraph",
  heading: {
    h1: "editor-h1",
    h2: "editor-h2",
    h3: "editor-h3",
    h4: "editor-h4",
    h5: "editor-h5",
    h6: "editor-h6",
  },
  list: {
    ul: "editor-ul",
    ol: "editor-ol",
    listitem: "editor-listitem",
  },
  text: {
    bold: "editor-text-bold",
    italic: "editor-text-italic",
    underline: "editor-text-underline",
    strikethrough: "editor-text-strikethrough",
    subscript: "editor-text-subscript",
    superscript: "editor-text-superscript",
  },
  table: "word-editor-table",
  tableCell: "word-editor-table-cell",
  tableCellHeader: "word-editor-table-cell-header",
  tableCellSelected: "word-editor-table-cell-selected",
  tableRow: "word-editor-table-row",
};

// ===== Interactive ImageComponent (resizable + alignable) =====
function ImageComponent({ src, altText, width, alignment, nodeKey }) {
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

  // Compute outer container style based on text wrapping mode (fits tightly without extra spacing)
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
      style={{ position: "relative", userSelect: "none", cursor: isSelected ? "move" : "pointer", ...getContainerStyle(currentAlignment) }}
      onClick={() => setIsSelected(true)}
      onBlur={() => setIsSelected(false)}
      tabIndex={-1}
    >
      {/* MS Word Text Wrapping Toolbar */}
      {isSelected && (
        <div
          style={{
            position: "absolute", top: -42, left: "50%", transform: "translateX(-50%)",
            display: "flex", gap: "3px", background: "#0f172a", borderRadius: "8px",
            padding: "4px 6px", zIndex: 100, boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
            alignItems: "center", whiteSpace: "nowrap"
          }}
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
              style={{
                background: currentAlignment === align ? "#2563eb" : "transparent",
                border: "none", color: "#fff", borderRadius: "4px",
                padding: "3px 7px", height: "24px", cursor: "pointer", fontSize: "11px",
                fontWeight: currentAlignment === align ? "700" : "500",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              title={title}
            >
              {label}
            </button>
          ))}
          <div style={{ width: "1px", height: "18px", background: "#334155", margin: "0 2px" }} />
          <span style={{ color: "#94a3b8", fontSize: "11px", padding: "0 4px", fontWeight: "600" }}>{currentWidth}px</span>
        </div>
      )}

      {/* Image with resize handle */}
      <div style={{ position: "relative", display: "inline-block" }}>
        <img
          ref={imgRef}
          src={src}
          alt={altText}
          draggable={false}
          style={{
            width: `${currentWidth}px`,
            height: "auto",
            borderRadius: "4px",
            display: "block",
            outline: isSelected ? "2px solid #2563eb" : "none",
            outlineOffset: "0px",
            border: "none",
            margin: 0,
            padding: 0,
            cursor: "pointer",
          }}
        />
        {/* 4 Corner Resize Points (Top-Left, Top-Right, Bottom-Left, Bottom-Right) */}
        {isSelected && (
          <>
            {/* Top-Left Point (TL) */}
            <div
              onMouseDown={(e) => startCornerResize("tl", e)}
              style={{
                position: "absolute", top: -5, left: -5,
                width: 10, height: 10,
                background: "#2563eb", border: "2px solid #ffffff",
                borderRadius: "50%", cursor: "nwse-resize",
                boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                zIndex: 20,
              }}
              title="Resize Top-Left"
            />
            {/* Top-Right Point (TR) */}
            <div
              onMouseDown={(e) => startCornerResize("tr", e)}
              style={{
                position: "absolute", top: -5, right: -5,
                width: 10, height: 10,
                background: "#2563eb", border: "2px solid #ffffff",
                borderRadius: "50%", cursor: "nesw-resize",
                boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                zIndex: 20,
              }}
              title="Resize Top-Right"
            />
            {/* Bottom-Left Point (BL) */}
            <div
              onMouseDown={(e) => startCornerResize("bl", e)}
              style={{
                position: "absolute", bottom: -5, left: -5,
                width: 10, height: 10,
                background: "#2563eb", border: "2px solid #ffffff",
                borderRadius: "50%", cursor: "nesw-resize",
                boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                zIndex: 20,
              }}
              title="Resize Bottom-Left"
            />
            {/* Bottom-Right Point (BR) */}
            <div
              onMouseDown={(e) => startCornerResize("br", e)}
              style={{
                position: "absolute", bottom: -5, right: -5,
                width: 10, height: 10,
                background: "#2563eb", border: "2px solid #ffffff",
                borderRadius: "50%", cursor: "nwse-resize",
                boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                zIndex: 20,
              }}
              title="Resize Bottom-Right"
            />
          </>
        )}
      </div>
    </div>
  );
}

// ===== Custom ImageNode for Lexical =====
class ImageNode extends DecoratorNode {
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

  // Export to HTML for storage / PDF
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

  // Re-import from saved HTML
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

function $createImageNode(src, altText, width, alignment) {
  return new ImageNode(src, altText, width || 400, alignment || "inline");
}


function onError(error) {
  console.error("Lexical Error:", error);
}

function HtmlInitialLoaderPlugin({ initialHtml }) {
  const [editor] = useLexicalComposerContext();
  const isLoaded = useRef(false);

  useEffect(() => {
    if (isLoaded.current || !initialHtml) return;
    isLoaded.current = true;

    editor.update(() => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(initialHtml, "text/html");
      const nodes = $generateNodesFromDOM(editor, dom);
      const root = $getRoot();
      root.clear();
      root.append(...nodes);
    });
  }, [editor, initialHtml]);

  return null;
}

function HtmlOnChangePlugin({ onChange, setStats, setPageCount }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const root = $getRoot();
        const text = root.getTextContent();
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;
        setStats?.({ words, chars });
        const html = $generateHtmlFromNodes(editor, null);
        onChange?.(html);
      });
    });
  }, [editor, onChange, setStats, setPageCount]);

  useEffect(() => {
    const el = editor.getRootElement();
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const contentH = el.scrollHeight;
      const pageH = 984;
      const pages = Math.max(1, Math.ceil(contentH / pageH));
      setPageCount?.(pages);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [editor, setPageCount]);

  return null;
}

// MS Word Floating Selection Mini Toolbar (appears above highlighted text)
function FloatingSelectionToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [coords, setCoords] = useState(null);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  const updateFloatingToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection) && !selection.isCollapsed()) {
      const domSelection = window.getSelection();
      if (domSelection && domSelection.rangeCount > 0) {
        const range = domSelection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setCoords({
            top: Math.max(10, rect.top - 46),
            left: Math.max(10, rect.left + rect.width / 2 - 80),
          });
          setIsBold(selection.hasFormat("bold"));
          setIsItalic(selection.hasFormat("italic"));
          setIsUnderline(selection.hasFormat("underline"));
          return;
        }
      }
    }
    setCoords(null);
  }, []);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateFloatingToolbar();
      });
    });
  }, [editor, updateFloatingToolbar]);

  if (!coords) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: coords.top,
        left: coords.left,
        zIndex: 10000,
        background: "#0f172a",
        color: "#ffffff",
        borderRadius: "8px",
        padding: "4px 8px",
        display: "flex",
        alignItems: "center",
        gap: "4px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
      }}
    >
      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        style={{
          background: isBold ? "#2563eb" : "transparent",
          border: "none",
          color: "#fff",
          padding: "3px 8px",
          borderRadius: "4px",
          cursor: "pointer",
          fontWeight: "bold",
          fontSize: "12px",
        }}
        title="Bold"
      >
        B
      </button>
      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        style={{
          background: isItalic ? "#2563eb" : "transparent",
          border: "none",
          color: "#fff",
          padding: "3px 8px",
          borderRadius: "4px",
          cursor: "pointer",
          fontStyle: "italic",
          fontSize: "12px",
        }}
        title="Italic"
      >
        I
      </button>
      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
        style={{
          background: isUnderline ? "#2563eb" : "transparent",
          border: "none",
          color: "#fff",
          padding: "3px 8px",
          borderRadius: "4px",
          cursor: "pointer",
          textDecoration: "underline",
          fontSize: "12px",
        }}
        title="Underline"
      >
        U
      </button>
    </div>
  );
}



// Drag & Drop / Clipboard Paste Plugin for Image files
function DragDropPasteImagePlugin() {
  const [editor] = useLexicalComposerContext();

  const handleImageFiles = useCallback((files) => {
    const imageFiles = Array.from(files || []).filter(f => f.type && f.type.startsWith("image/"));
    if (imageFiles.length === 0) return false;

    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target.result;
        editor.update(() => {
          const imageNode = $createImageNode(src, file.name, 400, "inline");
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $insertNodes([imageNode]);
          } else {
            const root = $getRoot();
            root.append(imageNode);
          }
        });
      };
      reader.readAsDataURL(file);
    });
    return true;
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;
        if (handleImageFiles(clipboardData.files)) {
          event.preventDefault();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH
    );
  }, [editor, handleImageFiles]);

  useEffect(() => {
    return editor.registerCommand(
      DROP_COMMAND,
      (event) => {
        const dataTransfer = event.dataTransfer;
        if (!dataTransfer) return false;

        // Internal Image Node Move (reposition inside editor)
        const draggedNodeKey = dataTransfer.getData("lexical-node-key");
        if (draggedNodeKey) {
          event.preventDefault();
          editor.update(() => {
            const existingNode = $getNodeByKey(draggedNodeKey);
            if (existingNode && existingNode instanceof ImageNode) {
              const src = existingNode.getSrc();
              const altText = existingNode.getAltText();
              const width = existingNode.getWidth();
              const alignment = existingNode.getAlignment();

              existingNode.remove();

              const newImageNode = $createImageNode(src, altText, width, alignment);
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                $insertNodes([newImageNode]);
              } else {
                const root = $getRoot();
                root.append(newImageNode);
              }
            }
          });
          return true;
        }

        // External Image Files Drop
        if (handleImageFiles(dataTransfer.files)) {
          event.preventDefault();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH
    );
  }, [editor, handleImageFiles]);

  return null;
}

// MS Word Ribbon Toolbar Plugin
function WordRibbonToolbar({ activeTab, setActiveTab, zoomLevel, setZoomLevel, isFullscreen, setIsFullscreen, readOnly = false, showHeaderFooter, setShowHeaderFooter, headerText, setHeaderText, footerText, setFooterText }) {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isSubscript, setIsSubscript] = useState(false);
  const [isSuperscript, setIsSuperscript] = useState(false);
  const [blockType, setBlockType] = useState("paragraph");
  const [fontFamily, setFontFamily] = useState("Khmer OS Battambang");
  const [fontSize, setFontSize] = useState(16);
  const [painterStyle, setPainterStyle] = useState(null);
  const [isInTable, setIsInTable] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [showCaseMenu, setShowCaseMenu] = useState(false);
  const [showColorSwatches, setShowColorSwatches] = useState(false);
  const [showHighlightSwatches, setShowHighlightSwatches] = useState(false);
  const [showBorders, setShowBorders] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);
  const [showParagraphMarks, setShowParagraphMarks] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat("bold"));
      setIsItalic(selection.hasFormat("italic"));
      setIsUnderline(selection.hasFormat("underline"));
      setIsStrikethrough(selection.hasFormat("strikethrough"));
      setIsSubscript(selection.hasFormat("subscript"));
      setIsSuperscript(selection.hasFormat("superscript"));

      // Detect if cursor is inside a table cell
      const anchorNode = selection.anchor.getNode();
      let node = anchorNode;
      let inTable = false;
      while (node !== null) {
        if ($isTableCellNode(node)) { inTable = true; break; }
        const parent = node.getParent?.();
        if (parent === null || parent === undefined) break;
        node = parent;
      }
      // Auto-switch to Table tab when cursor enters a table
      setIsInTable(inTable);
      if (inTable && activeTab !== "table") {
        setActiveTab("table");
      }
    }
  }, [activeTab, setActiveTab]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [editor, updateToolbar]);

  const handlePrint = () => {
    window.print();
  };

  const toggleFormatPainter = () => {
    if (painterStyle) {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $patchStyleText(selection, painterStyle);
        }
      });
      setPainterStyle(null);
    } else {
      setPainterStyle({
        "font-family": fontFamily,
        "font-size": `${fontSize}px`,
      });
    }
  };

  const formatText = (format) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatAlign = (alignment) => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment);
  };

  const formatHeading = (headingTag) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createHeadingNode(headingTag));
      }
    });
    setBlockType(headingTag);
  };

  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode());
      }
    });
    setBlockType("paragraph");
  };

  const formatQuote = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createQuoteNode());
      }
    });
    setBlockType("quote");
  };

  const formatCodeBlock = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $setBlocksType(selection, () => $createCodeNode());
      }
    });
    setBlockType("code");
  };

  const formatBulletList = () => {
    if (blockType !== "ul") {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
      setBlockType("ul");
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
      setBlockType("paragraph");
    }
  };

  const formatNumberedList = () => {
    if (blockType !== "ol") {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
      setBlockType("ol");
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
      setBlockType("paragraph");
    }
  };

  const insertChecklist = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const parser = new DOMParser();
        const checkHtml = `<p style="margin:0.25rem 0;"><input type="checkbox" style="margin-right:8px; cursor:pointer;" /> <span>កិច្ចការថ្មី...</span></p>`;
        const dom = parser.parseFromString(checkHtml, "text/html");
        const nodes = $generateNodesFromDOM(editor, dom);
        $insertNodes(nodes);
      }
    });
  };

  const applyFontFamily = (family) => {
    setFontFamily(family);
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { "font-family": family });
      }
    });
  };

  const applyFontSize = (sizePx) => {
    const val = parseInt(sizePx, 10);
    if (!isNaN(val) && val > 0) {
      setFontSize(val);
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $patchStyleText(selection, { "font-size": `${val}px` });
        }
      });
    }
  };

  const changeFontSizeBy = (delta) => {
    const nextSize = Math.max(8, fontSize + delta);
    applyFontSize(nextSize);
  };

  const applyLineSpacing = (spacing) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { "line-height": spacing });
      }
    });
  };

  const applyTextColor = (color) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { color });
      }
    });
  };

  const applyHighlightColor = (bgColor) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { "background-color": bgColor });
      }
    });
  };

  const insertHorizontalRule = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const parser = new DOMParser();
        const dom = parser.parseFromString("<hr/>", "text/html");
        const nodes = $generateNodesFromDOM(editor, dom);
        $insertNodes(nodes);
      }
    });
  };

  const insertTable = () => {
    const input = prompt("Enter table dimensions (Cols x Rows):", "3x3");
    let cols = 3;
    let rows = 3;
    if (input && input.includes("x")) {
      const parts = input.toLowerCase().split("x");
      cols = parseInt(parts[0], 10) || 3;
      rows = parseInt(parts[1], 10) || 3;
    } else if (input && !isNaN(parseInt(input, 10))) {
      cols = parseInt(input, 10);
      rows = parseInt(input, 10);
    } else if (input === null) {
      return;
    }

    cols = Math.max(1, Math.min(20, cols));
    rows = Math.max(1, Math.min(50, rows));

    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const tableNode = $createTableNodeWithDimensions(rows, cols, true);
        $insertNodes([tableNode]);
      }
    });
  };

  const insertLink = () => {
    const url = prompt("Enter Link URL:", "https://");
    if (!url) return;
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const parser = new DOMParser();
        const text = selection.getTextContent() || url;
        const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#2563eb; text-decoration:underline;">${text}</a>`;
        const dom = parser.parseFromString(linkHtml, "text/html");
        const nodes = $generateNodesFromDOM(editor, dom);
        $insertNodes(nodes);
      }
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target.result;
      editor.update(() => {
        const imageNode = $createImageNode(src, file.name, 400, "inline");
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $insertNodes([imageNode]);
        } else {
          const root = $getRoot();
          root.append(imageNode);
        }
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const changeCase = (caseType) => {
    setShowCaseMenu(false);
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || selection.isCollapsed()) return;
      const text = selection.getTextContent();
      let result = text;
      switch (caseType) {
        case "sentence": result = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase(); break;
        case "lower": result = text.toLowerCase(); break;
        case "upper": result = text.toUpperCase(); break;
        case "capitalize": result = text.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\B[A-Z]/g, (c) => c.toLowerCase()); break;
        case "toggle": result = text.split("").map((c) => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join(""); break;
      }
      if (result !== text) {
        selection.insertNodes([$createTextNode(result)]);
      }
    });
  };

  const applyParagraphBorder = (borderStyle) => {
    setShowBorders(false);
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        let block = selection.anchor.getNode();
        while (block && block.__type !== "paragraph" && block.__type !== "heading" && block.__type !== "quote") {
          block = block.getParent?.() || null;
          if (!block) break;
        }
        if (block) {
          const writable = block.getWritable();
          if (!writable.__style) writable.__style = "";
          writable.__style = writable.__style.replace(/border[^;]*;?/g, "").trim();
          if (borderStyle === "bottom") writable.__style += ";border-bottom:1px solid #000";
          else if (borderStyle === "top") writable.__style += ";border-top:1px solid #000";
          else if (borderStyle === "all") writable.__style += ";border:1px solid #000";
          else if (borderStyle === "outside") writable.__style += ";border:1px solid #000;border-bottom:none;border-top:none";
        }
      }
    });
  };

  const insertSymbol = (symbol) => {
    setShowSymbols(false);
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) selection.insertNodes([$createTextNode(symbol)]);
    });
  };

  const insertDropCap = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const text = selection.getTextContent();
        if (text.length > 0) {
          const dropHtml = `<span style="float:left;font-size:3em;line-height:1;margin-right:4px;font-weight:700">${text[0]}</span>${text.slice(1)}`;
          const parser = new DOMParser();
          const dom = parser.parseFromString(dropHtml, "text/html");
          const nodes = $generateNodesFromDOM(editor, dom);
          $insertNodes(nodes);
        }
      }
    });
  };

  const toggleTextDirection = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        let block = selection.anchor.getNode();
        while (block && block.__type !== "paragraph" && block.__type !== "heading" && block.__type !== "quote") {
          block = block.getParent?.() || null;
          if (!block) break;
        }
        if (block) {
          const writable = block.getWritable();
          if (!writable.__style) writable.__style = "";
          const isRtl = writable.__style.includes("direction:rtl");
          writable.__style = writable.__style.replace(/direction:[^;]*;?/g, "").trim();
          writable.__style += isRtl ? ";direction:ltr" : ";direction:rtl";
        }
      }
    });
  };

  const applyCellAlignment = (valign) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const cellNode = $getTableCellNodeFromLexicalNode(selection.anchor.getNode());
        if (cellNode) {
          const writable = cellNode.getWritable();
          if (!writable.__style) writable.__style = "";
          writable.__style = writable.__style.replace(/vertical-align:[^;]*;?/g, "").replace(/text-align:[^;]*;?/g, "").trim();
          writable.__style += `;vertical-align:${valign};text-align:center`;
        }
      }
    });
  };

  const insertDateTime = () => {
    const now = new Date();
    const kh = ["មករា","កុម្ភៈ","មីនា","មេសា","ឧសភា","មិថុនា","កក្កដា","សីហា","កញ្ញា","តុលា","វិច្ឆិកា","ធ្នូ"];
    const s = `ថ្ងៃទី${now.getDate()} ខែ${kh[now.getMonth()]} ឆ្នាំ${now.getFullYear()}`;
    editor.update(() => { const sel = $getSelection(); if ($isRangeSelection(sel)) sel.insertNodes([$createTextNode(s)]); });
  };

  const handleFindNext = useCallback(() => {
    if (!findText) return;
    editor.update(() => {
      const root = $getRoot();
      if (!root.getTextContent().toLowerCase().includes(findText.toLowerCase())) return;
      const nodes = [];
      root.getDescendants().forEach((n) => { if (n.__type === "text") nodes.push(n); });
      const sel = window.getSelection();
      let startFrom = 0;
      if (sel?.rangeCount > 0 && sel.getRangeAt(0).startContainer.textContent)
        startFrom = sel.getRangeAt(0).startOffset + 1;
      let found = false;
      for (const node of nodes) {
        const text = node.getTextContent();
        const idx = text.toLowerCase().indexOf(findText.toLowerCase(), startFrom);
        if (idx >= 0) {
          const el = editor.getElementByKey(node.getKey());
          if (el) {
            try {
              const range = document.createRange();
              const child = el.firstChild || el;
              range.setStart(child, idx);
              range.setEnd(child, idx + findText.length);
              sel.removeAllRanges();
              sel.addRange(range);
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              found = true;
            } catch (_) {}
          }
          break;
        }
        startFrom = 0;
      }
      if (!found && nodes.length > 0) {
        const node = nodes[0];
        const el = editor.getElementByKey(node.getKey());
        const text = node.getTextContent();
        const idx = text.toLowerCase().indexOf(findText.toLowerCase());
        if (el && idx >= 0) {
          try {
            const range = document.createRange();
            range.setStart(el.firstChild || el, idx);
            range.setEnd(el.firstChild || el, idx + findText.length);
            sel.removeAllRanges();
            sel.addRange(range);
          } catch (_) {}
        }
      }
    });
  }, [editor, findText]);

  const handleReplaceOne = useCallback(() => {
    if (!findText) return;
    const sel = window.getSelection();
    if (sel?.toString().toLowerCase() === findText.toLowerCase()) {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) selection.insertNodes([$createTextNode(replaceText)]);
      });
    }
    handleFindNext();
  }, [editor, findText, replaceText, handleFindNext]);

  const handleReplaceAll = useCallback(() => {
    if (!findText) return;
    editor.update(() => {
      const root = $getRoot();
      const escaped = findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "gi");
      root.getDescendants().forEach((node) => {
        if (node.__type === "text") {
          const text = node.getTextContent();
          if (regex.test(text)) {
            regex.lastIndex = 0;
            node.getWritable().__text = text.replace(regex, replaceText);
          }
        }
      });
    });
  }, [editor, findText, replaceText]);

  const clearFormatting = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, {
          color: null,
          "background-color": null,
          "font-family": null,
          "font-size": null,
          "line-height": null,
        });
        $setBlocksType(selection, () => $createParagraphNode());
      }
    });
    setBlockType("paragraph");
  };

  return (
    <div className="word-ribbon-container" style={{ background: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
      {/* WORD APP TOP TITLE BAR */}
      <div style={{ background: "#185abd", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.4rem 1rem", fontSize: "0.85rem", fontWeight: "500" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <LuFileText size={18} />
          <span>Report Document - Microsoft Word</span>
          {saved && <span style={{ background: "#22c55e", color: "#fff", fontSize: "0.72rem", padding: "0.1rem 0.5rem", borderRadius: "999px", fontWeight: "600", transition: "opacity 0.3s" }}>Saved</span>}
          {readOnly && (
            <span style={{ background: "rgba(255, 255, 255, 0.22)", color: "#fff", fontSize: "0.75rem", padding: "0.15rem 0.55rem", borderRadius: "999px", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
              🔒 Read-Only Mode (Disabled Editing)
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <button type="button" style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }} onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} title="Undo">
            <LuUndo size={14} />
          </button>
          <div style={{ width: "1px", height: "14px", background: "rgba(255, 255, 255, 0.3)" }} />
          <button type="button" style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem" }} onClick={() => {
            editor.update(() => {});
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
          }} title="Save">
            <LuSave size={14} /> Save
          </button>
          <button type="button" style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }} onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} title="Redo">
            <LuRedo size={14} />
          </button>
          <div style={{ width: "1px", height: "14px", background: "rgba(255, 255, 255, 0.3)" }} />
          <button
            type="button"
            onClick={() => setIsFullscreen?.(!isFullscreen)}
            style={{
              background: isFullscreen ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "4px",
              color: "#ffffff",
              cursor: "pointer",
              padding: "0.2rem 0.55rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.78rem",
              fontWeight: "600",
              transition: "all 0.2s ease"
            }}
            title={isFullscreen ? "Exit Fullscreen" : "Full Screen Frame Mode"}
          >
            {isFullscreen ? <LuMinimize2 size={15} /> : <LuMaximize2 size={15} />}
            <span>{isFullscreen ? "Exit" : "Full Screen"}</span>
          </button>
        </div>
      </div>

      {/* RIBBON TABS BAR */}
      <div style={{ display: "flex", background: "#ffffff", borderBottom: "1px solid #e2e8f0", paddingLeft: "0.5rem" }}>
        <button
          type="button"
          onClick={() => setActiveTab("home")}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.85rem",
            fontWeight: activeTab === "home" ? "600" : "500",
            color: activeTab === "home" ? "#185abd" : "#475569",
            borderBottom: activeTab === "home" ? "2.5px solid #185abd" : "2.5px solid transparent",
            background: "transparent",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
          }}
        >
          Home
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("insert")}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.85rem",
            fontWeight: activeTab === "insert" ? "600" : "500",
            color: activeTab === "insert" ? "#185abd" : "#475569",
            borderBottom: activeTab === "insert" ? "2.5px solid #185abd" : "2.5px solid transparent",
            background: "transparent",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
          }}
        >
          Insert
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("view")}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.85rem",
            fontWeight: activeTab === "view" ? "600" : "500",
            color: activeTab === "view" ? "#185abd" : "#475569",
            borderBottom: activeTab === "view" ? "2.5px solid #185abd" : "2.5px solid transparent",
            background: "transparent",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
          }}
        >
          View
        </button>
        <button type="button" onClick={() => setActiveTab("layout")} style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", fontWeight: activeTab === "layout" ? "600" : "500", color: activeTab === "layout" ? "#185abd" : "#475569", borderBottom: activeTab === "layout" ? "2.5px solid #185abd" : "2.5px solid transparent", background: "transparent", borderTop: "none", borderLeft: "none", borderRight: "none", cursor: "pointer" }}>Layout</button>
        <button type="button" onClick={() => setActiveTab("design")} style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", fontWeight: activeTab === "design" ? "600" : "500", color: activeTab === "design" ? "#7c3aed" : "#475569", borderBottom: activeTab === "design" ? "2.5px solid #7c3aed" : "2.5px solid transparent", background: "transparent", borderTop: "none", borderLeft: "none", borderRight: "none", cursor: "pointer" }}>Design</button>
        {/* Table tab — shown only when cursor is inside a table */}
        {isInTable && (
          <button
            type="button"
            onClick={() => setActiveTab("table")}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.85rem",
              fontWeight: activeTab === "table" ? "600" : "500",
              color: activeTab === "table" ? "#0f766e" : "#475569",
              borderBottom: activeTab === "table" ? "2.5px solid #0f766e" : "2.5px solid transparent",
              background: activeTab === "table" ? "#f0fdf4" : "transparent",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              cursor: "pointer",
            }}
          >
            🗃 Table Tools
          </button>
        )}
      </div>

      {/* RIBBON TOOLBAR ACTION GROUPS */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem", padding: "0.5rem 1rem", background: "#f8fafc" }}>
        {activeTab === "home" && (
          <>
            {/* CLIPBOARD GROUP */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", paddingRight: "0.6rem", borderRight: "1px solid #cbd5e1" }}>
              <button type="button" className={`btn-icon btn-sm ${painterStyle ? "active" : ""}`} onClick={toggleFormatPainter} title="Format Painter">
                <LuPaintbrush size={15} />
              </button>
            </div>

            {/* FONT GROUP */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", paddingRight: "0.6rem", borderRight: "1px solid #cbd5e1" }}>
              <select
                value={fontFamily}
                onChange={(e) => applyFontFamily(e.target.value)}
                className="form-select"
                style={{ fontSize: "0.78rem", padding: "0.2rem 0.4rem", borderRadius: "4px", border: "1px solid #cbd5e1" }}
              >
                <option value="Khmer OS Battambang">Khmer OS Battambang</option>
                <option value="Khmer OS Muol Light">Khmer OS Muol Light</option>
                <option value="Khmer OS Siemreap">Khmer OS Siemreap</option>
                <option value="Khmer OS Moul">Khmer OS Moul</option>
                <option value="Inter">Inter</option>
                <option value="Roboto">Roboto</option>
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
              </select>

              <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                <button type="button" className="btn-icon btn-sm" onClick={() => changeFontSizeBy(-2)} title="Decrease Font Size">
                  <LuMinus size={12} />
                </button>
                <select
                  value={`${fontSize}px`}
                  onChange={(e) => {
                    const sizeNum = parseInt(e.target.value, 10);
                    setFontSize(sizeNum);
                    applyFontSize(e.target.value);
                  }}
                  className="form-select"
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: "600",
                    padding: "0.2rem 0.3rem",
                    borderRadius: "4px",
                    border: "1px solid #cbd5e1",
                    width: "58px",
                    textAlign: "center",
                    background: "#ffffff",
                    cursor: "pointer"
                  }}
                  title="Font Size"
                >
                  <option value="8px">8</option>
                  <option value="9px">9</option>
                  <option value="10px">10</option>
                  <option value="11px">11</option>
                  <option value="12px">12</option>
                  <option value="14px">14</option>
                  <option value="16px">16</option>
                  <option value="18px">18</option>
                  <option value="20px">20</option>
                  <option value="22px">22</option>
                  <option value="24px">24</option>
                  <option value="26px">26</option>
                  <option value="28px">28</option>
                  <option value="36px">36</option>
                  <option value="48px">48</option>
                  <option value="72px">72</option>
                </select>
                <button type="button" className="btn-icon btn-sm" onClick={() => changeFontSizeBy(2)} title="Increase Font Size">
                  <LuPlus size={12} />
                </button>
              </div>

              <button type="button" className="btn-icon btn-sm" onClick={clearFormatting} title="Clear Formatting">
                <LuRemoveFormatting size={15} />
              </button>

              <button type="button" className={`btn-icon btn-sm ${isBold ? "active" : ""}`} onClick={() => formatText("bold")} title="Bold">
                <LuBold size={15} />
              </button>
              <button type="button" className={`btn-icon btn-sm ${isItalic ? "active" : ""}`} onClick={() => formatText("italic")} title="Italic">
                <LuItalic size={15} />
              </button>
              <button type="button" className={`btn-icon btn-sm ${isUnderline ? "active" : ""}`} onClick={() => formatText("underline")} title="Underline">
                <LuUnderline size={15} />
              </button>
               <button type="button" className={`btn-icon btn-sm ${isStrikethrough ? "active" : ""}`} onClick={() => formatText("strikethrough")} title="Strikethrough">
                 <LuStrikethrough size={15} />
               </button>
              <button type="button" className={`btn-icon btn-sm ${isSubscript ? "active" : ""}`} onClick={() => formatText("subscript")} title="Subscript">
                <LuSubscript size={15} />
              </button>
              <button type="button" className={`btn-icon btn-sm ${isSuperscript ? "active" : ""}`} onClick={() => formatText("superscript")} title="Superscript">
                <LuSuperscript size={15} />
              </button>
              <div style={{ position: "relative" }}>
                <button type="button" className={`btn-icon btn-sm ${showCaseMenu ? "active" : ""}`} onClick={() => setShowCaseMenu(!showCaseMenu)} title="Change Case">
                  <span style={{ fontWeight: 700, fontSize: "14px" }}>Aa</span>
                </button>
                {showCaseMenu && (
                  <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 50, background: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)", minWidth: 190, padding: "0.25rem 0" }} onMouseLeave={() => setShowCaseMenu(false)}>
                    {["sentence","lower","upper","capitalize","toggle"].map((k) => {
                      const labels = { sentence: { l: "Sentence case.", d: "This is an example." }, lower: { l: "lowercase", d: "this is an example." }, upper: { l: "UPPERCASE", d: "THIS IS AN EXAMPLE." }, capitalize: { l: "Capitalize Each Word", d: "This Is An Example." }, toggle: { l: "tOGGLE cASE", d: "tHIS IS AN EXAMPLE." } };
                      return (<div key={k} onClick={() => changeCase(k)} style={{ padding: "0.4rem 0.85rem", cursor: "pointer", fontSize: "0.8rem" }} onMouseEnter={(e) => e.currentTarget.style.background = "#eff6ff"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}><div style={{ fontWeight: 600 }}>{labels[k].l}</div><div style={{ color: "#888", fontSize: "0.72rem" }}>{labels[k].d}</div></div>);
                    })}
                  </div>
                )}
              </div>
              <div style={{ position: "relative" }}>
                <button type="button" className={`btn-icon btn-sm ${showHighlightSwatches ? "active" : ""}`} onClick={() => { setShowHighlightSwatches(!showHighlightSwatches); setShowColorSwatches(false); }} title="Highlight">
                  <div style={{ position: "relative", display: "flex" }}><LuHighlighter size={15} /><div style={{ width: 10, height: 3, background: "#ffff00", position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", borderRadius: 2 }} /></div>
                </button>
                {showHighlightSwatches && (
                  <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 50, background: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "0.5rem", boxShadow: "0 10px 25px rgba(0,0,0,0.15)", display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px", width: 210 }} onMouseLeave={() => setShowHighlightSwatches(false)}>
                    {["#ffff00","#33ff33","#33ffff","#ff66ff","#6699ff","#ff3333","#333366","#009999","#990099","#993300","#996600","#808080","#ffffff","none"].map((c) => (
                      <div key={c} onClick={() => { applyHighlightColor(c === "none" ? "transparent" : c); setShowHighlightSwatches(false); }} style={{ width: 24, height: 24, background: c === "none" ? "linear-gradient(45deg, #fff 45%, #ccc 50%, #fff 55%)" : c, border: "1px solid #ddd", borderRadius: "3px", cursor: "pointer" }} title={c === "none" ? "No Color" : c} />
                    ))}
                  </div>
                )}
              </div>
              <div style={{ position: "relative" }}>
                <button type="button" className={`btn-icon btn-sm ${showColorSwatches ? "active" : ""}`} onClick={() => { setShowColorSwatches(!showColorSwatches); setShowHighlightSwatches(false); }} title="Font Color">
                  <div style={{ position: "relative", display: "flex" }}><LuPalette size={15} /><div style={{ width: 10, height: 3, background: "#cc0000", position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", borderRadius: 2 }} /></div>
                </button>
                {showColorSwatches && (
                  <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 50, background: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px", padding: "0.5rem", boxShadow: "0 10px 25px rgba(0,0,0,0.15)", display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: "3px", width: 240 }} onMouseLeave={() => setShowColorSwatches(false)}>
                    {["#000000","#333333","#555555","#777777","#999999","#bbbbbb","#dddddd","#ffffff","#cc0000","#ff6600","#ffcc00","#33cc33","#0099ff","#3333cc","#9900ff","#ff00ff","#990000","#cc6600","#999900","#339933","#0066cc","#333399","#660066","#cc3399","#ff9999","#ff9966","#99cc33","#33cccc","#99ccff","#cc66ff","#ff99cc","#eeeeee"].map((c) => (
                      <div key={c} onClick={() => { applyTextColor(c); setShowColorSwatches(false); }} style={{ width: 24, height: 24, background: c, border: c === "#ffffff" ? "1px solid #ddd" : "1px solid transparent", borderRadius: "3px", cursor: "pointer" }} title={c} />
                    ))}
                    <div style={{ gridColumn: "1 / -1", borderTop: "1px solid #e5e7eb", marginTop: "4px", paddingTop: "4px" }}><label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.72rem", cursor: "pointer", color: "#64748b" }}><LuPalette size={12} /> More Colors...<input type="color" onChange={(e) => { applyTextColor(e.target.value); setShowColorSwatches(false); }} style={{ width: 0, height: 0, opacity: 0, position: "absolute" }} /></label></div>
                  </div>
                )}
              </div>
            </div>

            {/* PARAGRAPH GROUP */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", paddingRight: "0.6rem", borderRight: "1px solid #cbd5e1" }}>
              <button type="button" className={`btn-icon btn-sm ${blockType === "ul" ? "active" : ""}`} onClick={formatBulletList} title="Bulleted List">
                <LuList size={15} />
              </button>
              <button type="button" className={`btn-icon btn-sm ${blockType === "ol" ? "active" : ""}`} onClick={formatNumberedList} title="Numbered List">
                <LuListOrdered size={15} />
              </button>
              <button type="button" className="btn-icon btn-sm" onClick={insertChecklist} title="Checklist">
                <LuSquareCheck size={15} />
              </button>

              <button type="button" className="btn-icon btn-sm" onClick={() => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)} title="Decrease Indent">
                <LuIndentDecrease size={15} />
              </button>
              <button type="button" className="btn-icon btn-sm" onClick={() => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)} title="Increase Indent">
                <LuIndentIncrease size={15} />
              </button>
              <button type="button" className={`btn-icon btn-sm ${showParagraphMarks ? "active" : ""}`} onClick={() => setShowParagraphMarks(!showParagraphMarks)} title="Show/Hide ¶">
                <LuPilcrow size={15} />
              </button>
              <button type="button" className="btn-icon btn-sm" onClick={() => formatAlign("left")} title="Align Left">
                <LuAlignLeft size={15} />
              </button>
              <button type="button" className="btn-icon btn-sm" onClick={() => formatAlign("center")} title="Align Center">
                <LuAlignCenter size={15} />
              </button>
              <button type="button" className="btn-icon btn-sm" onClick={() => formatAlign("right")} title="Align Right">
                <LuAlignRight size={15} />
              </button>
              <button type="button" className="btn-icon btn-sm" onClick={() => formatAlign("justify")} title="Align Justify">
                <LuAlignJustify size={15} />
              </button>
              <button type="button" className="btn-icon btn-sm" onClick={toggleTextDirection} title="Text Direction (LTR ↔ RTL)">
                <span style={{ fontSize: "13px", fontWeight: 700 }}>⇄</span>
              </button>

              <select onChange={(e) => applyLineSpacing(e.target.value)} className="form-select" defaultValue="1.5" style={{ fontSize: "0.78rem", padding: "0.2rem 0.3rem", borderRadius: "4px", border: "1px solid #cbd5e1" }}>
                <option value="1.0">1.0</option>
                <option value="1.15">1.15</option>
                <option value="1.5">1.5</option>
                <option value="2.0">2.0</option>
                <option value="2.5">2.5</option>
                <option value="3.0">3.0</option>
              </select>
              <div style={{ position: "relative" }}>
                <button type="button" className={`btn-icon btn-sm ${showBorders ? "active" : ""}`} onClick={() => setShowBorders(!showBorders)} title="Borders">
                  <span style={{ border: "2px solid #334155", padding: "0 4px", fontSize: "11px", fontWeight: 700, borderRadius: "2px", lineHeight: "16px" }}>田</span>
                </button>
                {showBorders && (
                  <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 50, background: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)", padding: "0.5rem", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "4px", width: 160 }} onMouseLeave={() => setShowBorders(false)}>
                    {[{ v: "bottom", t: "Bottom\n━━━" },{ v: "top", t: "Top\n━━━" },{ v: "all", t: "All\n▣" },{ v: "outside", t: "Outside\n▯" },{ v: "none", t: "None\n✕" }].map(({ v, t }) => (
                      <button key={v} type="button" onClick={() => applyParagraphBorder(v)} style={{ padding: "0.35rem 0.5rem", fontSize: "0.7rem", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "4px", cursor: "pointer", textAlign: "center", whiteSpace: "pre-line", lineHeight: 1.3 }}>{t}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* STYLES GROUP */}
            <div>
              <select
                value={blockType}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "paragraph") formatParagraph();
                  else if (val === "quote") formatQuote();
                  else if (val === "code") formatCodeBlock();
                  else formatHeading(val);
                }}
                className="form-select"
                style={{ fontSize: "0.78rem", padding: "0.2rem 0.4rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontWeight: "600" }}
              >
                <option value="paragraph">Normal Text</option>
                <option value="h1">Title (H1)</option>
                <option value="h2">Subtitle (H2)</option>
                <option value="h3">Heading 1</option>
                <option value="h4">Heading 2</option>
                <option value="h5">Heading 3</option>
                <option value="quote">Quote</option>
                <option value="code">Code Block</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <button type="button" onClick={() => setShowFindReplace(!showFindReplace)} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.3rem 0.65rem", fontSize: "0.78rem", fontWeight: "600", background: showFindReplace ? "#fef3c7" : "#ffffff", border: `1px solid ${showFindReplace ? "#f59e0b" : "#cbd5e1"}`, borderRadius: "5px", cursor: "pointer", color: showFindReplace ? "#92400e" : "#334155" }} title="Find & Replace (Ctrl+F)">
                <LuSearch size={14} /> Find
              </button>
            </div>
          </>
        )}

        {activeTab === "insert" && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={insertTable} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <LuTable size={15} /> Table
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={insertLink} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <LuLink size={15} /> Link
            </button>
            <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <LuImage size={15} /> Image
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ width: 0, height: 0, opacity: 0, position: "absolute" }} />
            </label>
            <button type="button" className="btn btn-secondary btn-sm" onClick={insertHorizontalRule} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <LuMinus size={15} /> Line
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { editor.update(() => { const s = $getSelection(); if ($isRangeSelection(s)) { const p = new DOMParser(); const d = p.parseFromString('<br style="page-break-after:always;" />', "text/html"); $insertNodes($generateNodesFromDOM(editor, d)); } }); }} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <LuFileText size={15} /> Page Break
            </button>
            <div style={{ width: "1px", height: "20px", background: "#cbd5e1" }} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={insertDropCap} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ fontWeight: 700, fontSize: "15px" }}>A</span><span style={{ fontSize: "10px" }}>a</span> Drop Cap
            </button>
            <div style={{ position: "relative" }}>
              <button type="button" className={`btn btn-secondary btn-sm ${showSymbols ? "active" : ""}`} onClick={() => setShowSymbols(!showSymbols)} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>Ω Symbol</button>
              {showSymbols && (
                <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 50, background: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)", padding: "0.6rem", display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: "3px", width: 320 }} onMouseLeave={() => setShowSymbols(false)}>
                  {["©","®","™","€","£","¥","¢","°","±","×","÷","≈","≠","≤","≥","∞","√","∑","∫","∂","∆","←","→","↑","↓","↔","♥","★","☆","♦","♣","♠","•","◦","‣","‹","›","«","»","—","–","‾","…","¶","§","†","‡","↵"].map((s) => (
                    <div key={s} onClick={() => insertSymbol(s)} style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem", cursor: "pointer", borderRadius: "3px", border: "1px solid transparent" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.borderColor = "#93c5fd"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>{s}</div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ width: "1px", height: "20px", background: "#cbd5e1" }} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={insertDateTime} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              📅 Date & Time
            </button>
            <button type="button" className={`btn btn-secondary btn-sm ${showHeaderFooter ? "active" : ""}`} onClick={() => setShowHeaderFooter(!showHeaderFooter)} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              📄 Header/Footer
            </button>
          </div>
        )}

        {activeTab === "view" && (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handlePrint} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <LuPrinter size={15} /> Print View
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Zoom:</span>
              <select value={zoomLevel} onChange={(e) => setZoomLevel(parseFloat(e.target.value))} className="form-select" style={{ fontSize: "0.8rem", padding: "0.2rem 0.4rem" }}>
                <option value={0.75}>75%</option>
                <option value={0.9}>90%</option>
                <option value={1.0}>100% (A4 Standard)</option>
                <option value={1.25}>125%</option>
                <option value={1.5}>150%</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === "layout" && (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", paddingRight: "0.85rem", borderRight: "1px solid #cbd5e1" }}>
              <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Columns:</span>
              {[{ cols: 1, label: "One" },{ cols: 2, label: "Two" },{ cols: 3, label: "Three" }].map(({ cols, label }) => (
                <button key={cols} type="button" className="btn btn-secondary btn-sm" style={{ fontSize: "0.78rem" }}>{label}</button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", paddingRight: "0.85rem", borderRight: "1px solid #cbd5e1" }}>
              <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Margins:</span>
              {[{ v: "1in", label: "Normal" },{ v: "0.5in", label: "Narrow" },{ v: "2in", label: "Wide" }].map(({ v, label }) => (
                <button key={v} type="button" className="btn btn-secondary btn-sm" style={{ fontSize: "0.78rem" }}>{label}</button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Paper:</span>
              <select className="form-select" defaultValue="A4" style={{ fontSize: "0.78rem", padding: "0.2rem 0.4rem", borderRadius: "4px", border: "1px solid #cbd5e1" }}>
                <option>A4 (210x297mm)</option><option>Letter (8.5x11in)</option><option>Legal (8.5x14in)</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Spacing:</span>
              <select className="form-select" defaultValue="0" style={{ fontSize: "0.78rem", padding: "0.2rem 0.4rem", borderRadius: "4px", border: "1px solid #cbd5e1", width: 90 }} onChange={(e) => {
                const v = e.target.value;
                editor.update(() => {
                  const sel = $getSelection();
                  if ($isRangeSelection(sel)) {
                    let block = sel.anchor.getNode();
                    while (block && block.__type !== "paragraph" && block.__type !== "heading") { block = block.getParent?.() || null; if (!block) break; }
                    if (block) { const w = block.getWritable(); w.__style = (w.__style || "").replace(/margin-top:[^;]*;?/g, "").replace(/margin-bottom:[^;]*;?/g, "").trim(); if (v !== "0") w.__style += `;margin-top:${v}pt;margin-bottom:${v}pt`; }
                  }
                });
              }}>
                <option value="0">0 pt</option><option value="6">6 pt</option><option value="12">12 pt</option><option value="18">18 pt</option><option value="24">24 pt</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === "design" && (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", paddingRight: "0.85rem", borderRight: "1px solid #cbd5e1" }}>
              <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Page Color:</span>
              {["#ffffff","#fef3c7","#fce7f3","#e0f2fe","#dcfce7","#f3e8ff","#fef2f2","#f0fdf4","#f8fafc","#e2e8f0"].map((c) => (
                <div key={c} onClick={() => { const el = document.querySelector(".word-a4-sheet"); if (el) el.style.background = c; }}
                  style={{ width: 22, height: 22, borderRadius: "4px", border: "1px solid #d1d5db", background: c, cursor: "pointer" }} />
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", paddingRight: "0.85rem", borderRight: "1px solid #cbd5e1" }}>
              <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Watermark:</span>
              {["None","DRAFT","CONFIDENTIAL","DO NOT COPY","SAMPLE"].map((w) => (
                <button key={w} type="button" className="btn btn-secondary btn-sm" style={{ fontSize: "0.78rem" }} onClick={() => {
                  const sheet = document.querySelector(".word-a4-sheet");
                  if (!sheet) return;
                  const old = sheet.querySelector(".watermark-overlay");
                  if (old) old.remove();
                  if (w === "None") return;
                  const wm = document.createElement("div");
                  wm.className = "watermark-overlay";
                  wm.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0;opacity:0.08;font-size:5rem;font-weight:900;color:#000;transform:rotate(-30deg);user-select:none";
                  wm.textContent = w;
                  sheet.style.position = "relative";
                  sheet.appendChild(wm);
                }}>{w}</button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Page Border:</span>
              <select className="form-select" defaultValue="none" style={{ fontSize: "0.78rem", padding: "0.2rem 0.4rem", borderRadius: "4px", border: "1px solid #cbd5e1" }} onChange={(e) => {
                const sheet = document.querySelector(".word-a4-sheet");
                if (sheet) sheet.style.border = e.target.value === "none" ? "none" : e.target.value;
              }}>
                <option value="none">None</option><option value="1px solid #000">Box</option><option value="3px double #1e40af">Blue Double</option><option value="2px solid #dc2626">Red Line</option>
              </select>
            </div>
          </div>
        )}

        {/* TABLE TAB — appears when cursor is inside a table */}
        {activeTab === "table" && isInTable && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.85rem", padding: "0.2rem 0" }}>
            {/* ROWS GROUP */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", paddingRight: "0.85rem", borderRight: "1px solid #cbd5e1" }}>
              <button
                type="button"
                onClick={() => editor.update(() => $insertTableRow__EXPERIMENTAL(false))}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", padding: "0.25rem 0.6rem", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "5px", cursor: "pointer", fontWeight: "500", color: "#334155" }}
                title="Insert Row Above"
              >
                <LuArrowUp size={14} /> Row Above
              </button>
              <button
                type="button"
                onClick={() => editor.update(() => $insertTableRow__EXPERIMENTAL(true))}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", padding: "0.25rem 0.6rem", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "5px", cursor: "pointer", fontWeight: "500", color: "#334155" }}
                title="Insert Row Below"
              >
                <LuArrowDown size={14} /> Row Below
              </button>
              <button
                type="button"
                onClick={() => editor.update(() => $deleteTableRow__EXPERIMENTAL())}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", padding: "0.25rem 0.6rem", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "5px", cursor: "pointer", fontWeight: "600" }}
                title="Delete Row"
              >
                <LuTrash2 size={14} /> Delete Row
              </button>
            </div>

            {/* COLUMNS GROUP */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", paddingRight: "0.85rem", borderRight: "1px solid #cbd5e1" }}>
              <button
                type="button"
                onClick={() => editor.update(() => $insertTableColumn__EXPERIMENTAL(false))}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", padding: "0.25rem 0.6rem", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "5px", cursor: "pointer", fontWeight: "500", color: "#334155" }}
                title="Insert Column Left"
              >
                <LuArrowLeft size={14} /> Col Left
              </button>
              <button
                type="button"
                onClick={() => editor.update(() => $insertTableColumn__EXPERIMENTAL(true))}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", padding: "0.25rem 0.6rem", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "5px", cursor: "pointer", fontWeight: "500", color: "#334155" }}
                title="Insert Column Right"
              >
                <LuArrowRight size={14} /> Col Right
              </button>
              <button
                type="button"
                onClick={() => editor.update(() => $deleteTableColumn__EXPERIMENTAL())}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", padding: "0.25rem 0.6rem", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "5px", cursor: "pointer", fontWeight: "600" }}
                title="Delete Column"
              >
                <LuTrash2 size={14} /> Delete Col
              </button>
            </div>

            {/* MERGE & STYLING GROUP */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", paddingRight: "0.85rem", borderRight: "1px solid #cbd5e1" }}>
              <button
                type="button"
                onClick={() => {
                  editor.update(() => {
                    const selection = $getSelection();

                    // Multi-cell selection (dragging across cells)
                    if ($isTableSelection(selection)) {
                      const nodes = selection.getNodes().filter($isTableCellNode);
                      if (nodes.length > 1) {
                        const firstCell = nodes[0];
                        let addedColSpan = 0;
                        for (let i = 1; i < nodes.length; i++) {
                          const cell = nodes[i];
                          const content = cell.getTextContent();
                          if (content && content.trim()) {
                            const p = $createParagraphNode();
                            p.append($createTextNode(" " + content));
                            firstCell.append(p);
                          }
                          addedColSpan += (cell.getColSpan() || 1);
                          cell.remove();
                        }
                        const firstSpan = firstCell.getColSpan() || 1;
                        firstCell.setColSpan(firstSpan + addedColSpan);
                        return;
                      }
                    }

                    // Single cell range selection (merge with cell to right)
                    if ($isRangeSelection(selection)) {
                      const anchorNode = selection.anchor.getNode();
                      const cellNode = $getTableCellNodeFromLexicalNode(anchorNode);
                      if (cellNode) {
                        const nextCell = cellNode.getNextSibling();
                        if (nextCell && $isTableCellNode(nextCell)) {
                          const content = nextCell.getTextContent();
                          if (content && content.trim()) {
                            const p = $createParagraphNode();
                            p.append($createTextNode(" " + content));
                            cellNode.append(p);
                          }
                          const currentSpan = cellNode.getColSpan() || 1;
                          const nextSpan = nextCell.getColSpan() || 1;
                          cellNode.setColSpan(currentSpan + nextSpan);
                          nextCell.remove();
                        }
                      }
                    }
                  });
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", padding: "0.25rem 0.6rem", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "5px", cursor: "pointer", fontWeight: "500", color: "#334155" }}
                title="Merge Selected Cells"
              >
                <LuCombine size={14} /> Merge Cells
              </button>

              <button
                type="button"
                onClick={() => {
                  editor.update(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                      const cellNode = $getTableCellNodeFromLexicalNode(selection.anchor.getNode());
                      if (cellNode) $unmergeCell();
                    }
                  });
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", padding: "0.25rem 0.6rem", background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "5px", cursor: "pointer", fontWeight: "500", color: "#334155" }}
                title="Unmerge Cell (បំបែកក្រឡ)"
              >
                 <LuSplit size={14} /> Unmerge Cell
               </button>
               <div style={{ width: "1px", height: "18px", background: "#cbd5e1", margin: "0 2px" }} />
               <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>V-Align:</span>
               {[{ a: "top", i: "⊤" },{ a: "middle", i: "⊟" },{ a: "bottom", i: "⊥" }].map(({ a, i }) => (
                 <button key={a} type="button" onClick={() => applyCellAlignment(a)} style={{ fontSize: "0.78rem", padding: "0.2rem 0.45rem", background: "#fff", border: "1px solid #cbd5e1", borderRadius: "5px", cursor: "pointer", fontWeight: "500", color: "#334155", minWidth: 26 }}>{i}</button>
               ))}

              <label
                style={{
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  fontSize: "0.78rem",
                  padding: "0.25rem 0.6rem",
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "5px",
                  fontWeight: "500",
                  color: "#334155"
                }}
                title="Cell Fill Color"
              >
                <LuPalette size={14} /> Fill Color
                <input
                  type="color"
                  defaultValue="#185abd"
                  onChange={(e) => {
                    editor.update(() => {
                      const selection = $getSelection();
                      if ($isRangeSelection(selection)) {
                        $patchStyleText(selection, { "background-color": e.target.value });
                      }
                    });
                  }}
                  style={{ width: 18, height: 18, border: "1px solid #cbd5e1", borderRadius: 3, cursor: "pointer", padding: 0 }}
                />
              </label>
            </div>

            {/* DELETE TABLE GROUP */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => {
                  editor.update(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                      let node = selection.anchor.getNode();
                      while (node) {
                        if ($isTableNode(node)) { node.remove(); return; }
                        node = node.getParent?.() ?? null;
                      }
                    }
                  });
                  setActiveTab("home");
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", background: "#dc2626", color: "#ffffff", border: "none", borderRadius: "5px", padding: "0.3rem 0.65rem", cursor: "pointer", fontWeight: "700" }}
                title="Delete Whole Table"
              >
                <LuTrash2 size={14} /> Delete Table
              </button>
            </div>
          </div>
        )}
      </div>

      {showFindReplace && (
        <div style={{ background: "#fef3c7", borderTop: "2px solid #f59e0b", padding: "0.55rem 1rem", display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          <input placeholder="Find..." value={findText} onChange={(e) => setFindText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleFindNext(); }} style={{ width: 200, padding: "0.25rem 0.5rem", fontSize: "0.82rem", border: "1px solid #d97706", borderRadius: "4px" }} autoFocus />
          <button type="button" className="btn btn-sm" style={{ background: "#fff", border: "1px solid #d1d5db", fontSize: "0.78rem" }} onClick={handleFindNext}>Find Next</button>
          <input placeholder="Replace..." value={replaceText} onChange={(e) => setReplaceText(e.target.value)} style={{ width: 200, padding: "0.25rem 0.5rem", fontSize: "0.82rem", border: "1px solid #d1d5db", borderRadius: "4px" }} />
          <button type="button" className="btn btn-sm" style={{ background: "#fff", border: "1px solid #d1d5db", fontSize: "0.78rem" }} onClick={handleReplaceOne}>Replace</button>
          <button type="button" className="btn btn-sm" style={{ background: "#fff", border: "1px solid #d1d5db", fontSize: "0.78rem" }} onClick={handleReplaceAll}>Replace All</button>
          <div style={{ flex: 1 }} />
          <button type="button" className="btn-icon btn-sm" onClick={() => setShowFindReplace(false)} style={{ border: "none", color: "#92400e" }}><LuX size={14} /></button>
        </div>
      )}
    </div>
  );
}

export default function TextEditor({
  value = "",
  onChange,
  readOnly = false,
  variant = "default",
  placeholder = "សូមបញ្ចូលខ្លឹមសាររបាយការណ៍...",
}) {
  const [activeTab, setActiveTab] = useState("home");
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [stats, setStats] = useState({ words: 0, chars: 0 });
  const [pageCount, setPageCount] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHeaderFooter, setShowHeaderFooter] = useState(false);
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");

  // Esc key listener to exit full screen mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  if (readOnly) {
    return (
      <div
        className={`text-editor text-editor-readonly text-editor-${variant}`}
        lang="km"
        dangerouslySetInnerHTML={{ __html: value || '<p class="text-editor-empty">—</p>' }}
      />
    );
  }

  const initialConfig = {
    namespace: "ReportEditor",
    theme,
    onError,
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      AutoLinkNode,
      LinkNode,
      ImageNode,
    ],
  };

  return (
    <div
      className={`text-editor text-editor-word-app text-editor-${variant}`}
      style={
        isFullscreen
          ? {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 9999,
            borderRadius: 0,
            border: "none",
            background: "#e2e8f0",
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
          }
          : {
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            background: "#e2e8f0",
            overflow: "hidden",
          }
      }
      lang="km"
    >
      <LexicalComposer initialConfig={initialConfig}>
        <WordRibbonToolbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          isFullscreen={isFullscreen}
          setIsFullscreen={setIsFullscreen}
          readOnly={readOnly}
          showHeaderFooter={showHeaderFooter}
          setShowHeaderFooter={setShowHeaderFooter}
          headerText={headerText}
          setHeaderText={setHeaderText}
          footerText={footerText}
          setFooterText={setFooterText}
        />

        {/* A4 FLOATING CANVAS SHEET */}
        {showHeaderFooter && (
          <div style={{ background: "#e2e8f0", padding: "0.5rem 1rem", display: "flex", gap: "0.75rem", alignItems: "center", borderBottom: "1px solid #cbd5e1" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Header:</span>
            <input value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder="Header text..." style={{ flex: 1, padding: "0.25rem 0.5rem", fontSize: "0.82rem", border: "1px solid #cbd5e1", borderRadius: "4px" }} />
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Footer:</span>
            <input value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="Footer text..." style={{ flex: 1, padding: "0.25rem 0.5rem", fontSize: "0.82rem", border: "1px solid #cbd5e1", borderRadius: "4px" }} />
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setHeaderText(""); setFooterText(""); }}>Clear</button>
          </div>
        )}
        <div
          className="word-paper-canvas"
          style={{
            padding: "2rem 1rem",
            minHeight: "600px",
            flex: isFullscreen ? 1 : "initial",
            overflowY: "auto",
            overflowX: "auto",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            className="word-a4-sheet"
            style={{
              width: "100%",
              maxWidth: "794px",
              minHeight: `${1123 * pageCount}px`,
              background: "#ffffff",
              position: "relative",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
              borderRadius: "2px",
              padding: "3rem 3.5rem",
              boxSizing: "border-box",
              zoom: zoomLevel,
            }}
          >
            {Array.from({ length: Math.max(0, pageCount - 1) }).map((_, i) => (
              <div key={i} style={{ position: "absolute", left: 0, right: 0, top: `${1123 * (i + 1)}px`, textAlign: "center", pointerEvents: "none", zIndex: 1 }}>
                <div style={{ position: "absolute", left: 0, right: 0, top: -1, height: 2, background: "#e2e8f0" }} />
                <span style={{ background: "#f1f5f9", color: "#94a3b8", fontSize: "0.7rem", padding: "0 0.5rem", position: "relative", top: -8 }}>Page {i + 2}</span>
              </div>
            ))}
            {showHeaderFooter && <div style={{ borderBottom: "1px solid #cbd5e1", paddingBottom: "0.5rem", marginBottom: "1rem", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>{headerText || "Header"}</div>}
            <RichTextPlugin
              contentEditable={<ContentEditable style={{ outline: "none", minHeight: "800px" }} />}
              placeholder={
                <div style={{ position: "absolute", top: "3rem", left: "3.5rem", color: "#94a3b8", pointerEvents: "none" }}>
                  {placeholder}
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            <HistoryPlugin />
            <ListPlugin />
            <LinkPlugin />
            <TablePlugin />
            <DragDropPasteImagePlugin />
            <FloatingSelectionToolbarPlugin />
            <HtmlInitialLoaderPlugin initialHtml={value} />
            <HtmlOnChangePlugin onChange={onChange} setStats={setStats} setPageCount={setPageCount} />
            {showHeaderFooter && <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "0.5rem", marginTop: "1rem", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>{footerText || "Footer"}</div>}
          </div>
        </div>

        {/* MS WORD BOTTOM STATUS BAR */}
        <div style={{ background: "#f8fafc", borderTop: "1px solid #cbd5e1", padding: "0.35rem 1rem", fontSize: "0.75rem", color: "#64748b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "1.25rem" }}>
            <span>Page 1 of {pageCount}</span>
            <span>Words: {stats.words}</span>
            <span>Characters: {stats.chars}</span>
          </div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <span>English / Khmer</span>
            <span>{Math.round(zoomLevel * 100)}%</span>
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              style={{
                background: isFullscreen ? "#cbd5e1" : "transparent",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                color: "#334155",
                cursor: "pointer",
                padding: "2px 6px",
                fontSize: "0.72rem",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
              title={isFullscreen ? "Exit Full Frame (Esc)" : "Full Page Frame"}
            >
              {isFullscreen ? <LuMinimize2 size={13} /> : <LuMaximize2 size={13} />}
              <span>{isFullscreen ? "Exit Fullscreen" : "Full Frame"}</span>
            </button>
          </div>
        </div>
      </LexicalComposer>
    </div>
  );
}
