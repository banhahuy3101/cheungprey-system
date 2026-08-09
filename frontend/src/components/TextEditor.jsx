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

function HtmlOnChangePlugin({ onChange, setStats }) {
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
  }, [editor, onChange, setStats]);

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
function WordRibbonToolbar({ activeTab, setActiveTab, zoomLevel, setZoomLevel, isFullscreen, setIsFullscreen, readOnly = false }) {
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
              <button type="button" className="btn-icon btn-sm" onClick={clearFormatting} title="Clear Formatting">
                <LuRemoveFormatting size={15} />
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

              <label className="btn-icon btn-sm" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center" }} title="Text Color">
                <LuPalette size={15} />
                <input type="color" onChange={(e) => applyTextColor(e.target.value)} style={{ width: 0, height: 0, opacity: 0, position: "absolute" }} />
              </label>

              <label className="btn-icon btn-sm" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center" }} title="Highlight Color">
                <LuHighlighter size={15} />
                <input type="color" onChange={(e) => applyHighlightColor(e.target.value)} style={{ width: 0, height: 0, opacity: 0, position: "absolute" }} />
              </label>
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

              <select onChange={(e) => applyLineSpacing(e.target.value)} className="form-select" defaultValue="1.5" style={{ fontSize: "0.78rem", padding: "0.2rem 0.3rem", borderRadius: "4px", border: "1px solid #cbd5e1" }}>
                <option value="1.0">1.0</option>
                <option value="1.15">1.15</option>
                <option value="1.5">1.5</option>
                <option value="2.0">2.0</option>
              </select>
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
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    namespace: "CheungPreyReportEditor",
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
        />

        {/* A4 FLOATING CANVAS SHEET */}
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
              maxWidth: "816px",
              minHeight: "1056px",
              background: "#ffffff",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
              borderRadius: "2px",
              padding: "3rem 3.5rem",
              boxSizing: "border-box",
              zoom: zoomLevel,
            }}
          >
            <RichTextPlugin
              contentEditable={<ContentEditable style={{ outline: "none", minHeight: "950px" }} />}
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
            <HtmlOnChangePlugin onChange={onChange} setStats={setStats} />
          </div>
        </div>

        {/* MS WORD BOTTOM STATUS BAR */}
        <div style={{ background: "#f8fafc", borderTop: "1px solid #cbd5e1", padding: "0.35rem 1rem", fontSize: "0.75rem", color: "#64748b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "1.25rem" }}>
            <span>Page 1 of 1</span>
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
