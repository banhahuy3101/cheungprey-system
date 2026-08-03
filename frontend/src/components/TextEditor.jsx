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
  $insertTableRow__EXPERIMENTAL,
  $insertTableColumn__EXPERIMENTAL,
  $deleteTableRow__EXPERIMENTAL,
  $deleteTableColumn__EXPERIMENTAL,
  $unmergeCell,
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
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  DecoratorNode,
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

  const onMouseDownResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = currentWidth;

    const onMouseMove = (moveEvent) => {
      if (!isResizing.current) return;
      const delta = moveEvent.clientX - startX.current;
      const newWidth = Math.max(80, Math.min(760, startWidth.current + delta));
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

  // Compute outer container style based on alignment
  const getContainerStyle = (align) => {
    if (align === "left") return { float: "left", marginRight: "12px", marginBottom: "8px", marginTop: "4px" };
    if (align === "right") return { float: "right", marginLeft: "12px", marginBottom: "8px", marginTop: "4px" };
    if (align === "inline") return { display: "inline-block", verticalAlign: "top", margin: "4px 8px" };
    // center — full-width block row, clears floats
    return { display: "block", margin: "8px auto", clear: "both" };
  };

  return (
    <div
      style={{ position: "relative", userSelect: "none", ...getContainerStyle(currentAlignment) }}
      onClick={() => setIsSelected(true)}
      onBlur={() => setIsSelected(false)}
      tabIndex={-1}
    >
      {/* Alignment + delete toolbar */}
      {isSelected && (
        <div
          style={{
            position: "absolute", top: -38, left: "50%", transform: "translateX(-50%)",
            display: "flex", gap: "4px", background: "#1e293b", borderRadius: "8px",
            padding: "4px 8px", zIndex: 100, boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            alignItems: "center",
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {[
            { align: "left", label: "◀", title: "Float Left (text wraps right)" },
            { align: "center", label: "▮", title: "Center block (text above/below)" },
            { align: "right", label: "▶", title: "Float Right (text wraps left)" },
            { align: "inline", label: "⬜", title: "Inline (text on both sides)" },
          ].map(({ align, label, title }) => (
            <button
              key={align}
              type="button"
              onClick={() => setAlignment(align)}
              style={{
                background: currentAlignment === align ? "#3b82f6" : "transparent",
                border: "none", color: "#fff", borderRadius: "5px",
                width: "28px", height: "26px", cursor: "pointer", fontSize: "12px",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              title={title}
            >
              {label}
            </button>
          ))}
          <div style={{ width: "1px", height: "18px", background: "#475569", margin: "0 2px" }} />
          <span style={{ color: "#94a3b8", fontSize: "11px", padding: "0 4px" }}>{currentWidth}px</span>
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
            borderRadius: "6px",
            display: "block",
            border: isSelected ? "2px solid #3b82f6" : "2px solid transparent",
            cursor: "pointer",
            transition: "border-color 0.15s ease",
          }}
        />
        {/* Resize handle — bottom-right corner */}
        {isSelected && (
          <div
            onMouseDown={onMouseDownResize}
            style={{
              position: "absolute", bottom: -5, right: -5,
              width: 14, height: 14,
              background: "#3b82f6", border: "2px solid #fff",
              borderRadius: "3px", cursor: "nwse-resize",
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
              zIndex: 10,
            }}
          />
        )}
        {/* Resize handle — bottom-left corner */}
        {isSelected && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              isResizing.current = true;
              startX.current = e.clientX;
              startWidth.current = currentWidth;
              const onMouseMove = (me) => {
                const delta = startX.current - me.clientX; // inverted for left handle
                const newWidth = Math.max(80, Math.min(760, startWidth.current + delta));
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
            }}
            style={{
              position: "absolute", bottom: -5, left: -5,
              width: 14, height: 14,
              background: "#3b82f6", border: "2px solid #fff",
              borderRadius: "3px", cursor: "nesw-resize",
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
              zIndex: 10,
            }}
          />
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

  createDOM() {
    const span = document.createElement("span");
    span.style.display = "block";
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
    if (align === "left") wrapperStyle = `float:left; margin-right:12px; margin-bottom:8px;`;
    else if (align === "right") wrapperStyle = `float:right; margin-left:12px; margin-bottom:8px;`;
    else if (align === "inline") wrapperStyle = `display:inline-block; vertical-align:top; margin:4px 8px;`;
    else wrapperStyle = `text-align:center; clear:both;`;
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

  isInline() { return false; }
}

function $createImageNode(src, altText, width, alignment) {
  return new ImageNode(src, altText, width || 400, alignment || "center");
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

// MS Word Ribbon Toolbar Plugin
function WordRibbonToolbar({ activeTab, setActiveTab, zoomLevel, setZoomLevel }) {
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
      setIsInTable(inTable);
    }
  }, []);

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
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const parser = new DOMParser();
        const tableHtml = `<table style="width:100%; border-collapse:collapse; border:1px solid #cbd5e1; margin:1rem 0;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="border:1px solid #cbd5e1; padding:8px;">ក្បាល ១</th>
              <th style="border:1px solid #cbd5e1; padding:8px;">ក្បាល ២</th>
              <th style="border:1px solid #cbd5e1; padding:8px;">ក្បាល ៣</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border:1px solid #cbd5e1; padding:8px;">ទិន្នន័យ ១</td>
              <td style="border:1px solid #cbd5e1; padding:8px;">ទិន្នន័យ ២</td>
              <td style="border:1px solid #cbd5e1; padding:8px;">ទិន្នន័យ ៣</td>
            </tr>
            <tr>
              <td style="border:1px solid #cbd5e1; padding:8px;">ទិន្នន័យ ៤</td>
              <td style="border:1px solid #cbd5e1; padding:8px;">ទិន្នន័យ ៥</td>
              <td style="border:1px solid #cbd5e1; padding:8px;">ទិន្នន័យ ៦</td>
            </tr>
          </tbody>
        </table><p></p>`;
        const dom = parser.parseFromString(tableHtml, "text/html");
        const nodes = $generateNodesFromDOM(editor, dom);
        $insertNodes(nodes);
      }
    });
  };

  const insertLink = () => {
    const url = prompt("សូមបញ្ចូលតំណភ្ជាប់ (URL):", "https://");
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
        const imageNode = $createImageNode(src, file.name);
        const paragraphAfter = $createParagraphNode();
        const root = $getRoot();
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $insertNodes([imageNode, paragraphAfter]);
        } else {
          // Append at end of document
          root.append(imageNode);
          root.append(paragraphAfter);
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
          <span>របាយការណ៍ - Microsoft Word Workspace</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button type="button" style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }} onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} title="Undo">
            <LuUndo size={14} />
          </button>
          <button type="button" style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }} onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} title="Redo">
            <LuRedo size={14} />
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
          ទំព័រដើម (Home)
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
          បញ្ចូល (Insert)
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
          ទិដ្ឋភាព (View)
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
            🗃 តារាង (Table)
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
                  onChange={(e) => applyFontSize(e.target.value)}
                  className="form-select"
                  style={{ fontSize: "0.78rem", padding: "0.2rem 0.3rem", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                >
                  <option value="12px">12</option>
                  <option value="14px">14</option>
                  <option value="16px">16</option>
                  <option value="18px">18</option>
                  <option value="20px">20</option>
                  <option value="24px">24</option>
                  <option value="28px">28</option>
                  <option value="32px">32</option>
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
                <option value="paragraph">អត្ថបទធម្មតា (Normal Text)</option>
                <option value="h1">ចំណងជើងធំ (Title / H1)</option>
                <option value="h2">ចំណងជើងរង (Subtitle / H2)</option>
                <option value="h3">ក្បាលរឿង ១ (Heading 1)</option>
                <option value="h4">ក្បាលរឿង ២ (Heading 2)</option>
                <option value="h5">ក្បាលរឿង ៣ (Heading 3)</option>
                <option value="quote">សម្រង់សម្តី (Quote)</option>
                <option value="code">កូដសរសេរ (Code Block)</option>
              </select>
            </div>
          </>
        )}

        {activeTab === "insert" && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={insertTable} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <LuTable size={15} /> បញ្ចូលតារាង
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={insertLink} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <LuLink size={15} /> បញ្ចូលតំណភ្ជាប់
            </button>
            <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <LuImage size={15} /> បញ្ចូលរូបភាព
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ width: 0, height: 0, opacity: 0, position: "absolute" }} />
            </label>
            <button type="button" className="btn btn-secondary btn-sm" onClick={insertHorizontalRule} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <LuMinus size={15} /> បន្ទាត់ខណ្ឌ
            </button>
          </div>
        )}

        {activeTab === "view" && (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handlePrint} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <LuPrinter size={15} /> ទិដ្ឋភាពបោះពុម្ព
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.8rem", color: "#64748b" }}>ទំហំពង្រីក៖</span>
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

        {/* TABLE TAB — appears only when cursor is inside a table */}
        {activeTab === "table" && isInTable && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
            {/* Rows group */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem", paddingRight: "0.75rem", borderRight: "1px solid #cbd5e1" }}>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                <button type="button" className="btn btn-secondary btn-sm"
                  onClick={() => editor.update(() => $insertTableRow__EXPERIMENTAL(false))}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem" }}>
                  ⬆ បន្ថែមជួរ↑
                </button>
                <button type="button" className="btn btn-secondary btn-sm"
                  onClick={() => editor.update(() => $insertTableRow__EXPERIMENTAL(true))}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem" }}>
                  ⬇ បន្ថែមជួរ↓
                </button>
              </div>
              <button type="button"
                onClick={() => editor.update(() => $deleteTableRow__EXPERIMENTAL())}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "4px", padding: "0.2rem 0.5rem", cursor: "pointer" }}>
                🗑 លុបជួរ
              </button>
              <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>ជួរ (Rows)</span>
            </div>
            {/* Columns group */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem", paddingRight: "0.75rem", borderRight: "1px solid #cbd5e1" }}>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                <button type="button" className="btn btn-secondary btn-sm"
                  onClick={() => editor.update(() => $insertTableColumn__EXPERIMENTAL(false))}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem" }}>
                  ⬅ ជួរឈរ←
                </button>
                <button type="button" className="btn btn-secondary btn-sm"
                  onClick={() => editor.update(() => $insertTableColumn__EXPERIMENTAL(true))}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem" }}>
                  ➡ ជួរឈរ→
                </button>
              </div>
              <button type="button"
                onClick={() => editor.update(() => $deleteTableColumn__EXPERIMENTAL())}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "4px", padding: "0.2rem 0.5rem", cursor: "pointer" }}>
                🗑 លុបជួរឈរ
              </button>
              <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>ជួរឈរ (Columns)</span>
            </div>
            {/* Cell color group */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem", paddingRight: "0.75rem", borderRight: "1px solid #cbd5e1" }}>
              <label style={{ fontSize: "0.78rem", color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                🎨 ពណ៌ក្រឡ
                <input type="color" defaultValue="#fef9c3"
                  onChange={(e) => {
                    editor.update(() => {
                      const selection = $getSelection();
                      if ($isRangeSelection(selection)) {
                        $patchStyleText(selection, { "background-color": e.target.value });
                      }
                    });
                  }}
                  style={{ width: 28, height: 24, border: "1px solid #cbd5e1", borderRadius: 4, cursor: "pointer", padding: 0 }}
                />
              </label>
              <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>ក្រឡ (Cell)</span>
            </div>
            {/* Unmerge / Header group */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem", paddingRight: "0.75rem", borderRight: "1px solid #cbd5e1" }}>
              <button type="button" className="btn btn-secondary btn-sm"
                onClick={() => {
                  editor.update(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                      const cellNode = $getTableCellNodeFromLexicalNode(selection.anchor.getNode());
                      if (cellNode) $unmergeCell();
                    }
                  });
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem" }}>
                ⊠ បំបែកក្រឡ
              </button>
              <button type="button" className="btn btn-secondary btn-sm"
                onClick={() => {
                  editor.update(() => {
                    const selection = $getSelection();
                    if ($isRangeSelection(selection)) {
                      let node = selection.anchor.getNode();
                      while (node) {
                        if ($isTableCellNode(node)) {
                          const writable = node.getWritable();
                          // Toggle header state (1 = row header, 0 = none)
                          writable.__headerState = writable.__headerState === 1 ? 0 : 1;
                          return;
                        }
                        node = node.getParent?.() ?? null;
                      }
                    }
                  });
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem" }}>
                ☰ ក្បាលជួរ
              </button>
              <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>ក្រឡ (Merge)</span>
            </div>
            {/* Delete table */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem" }}>
              <button type="button"
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
                style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "4px", padding: "0.3rem 0.65rem", cursor: "pointer" }}>
                🗑 លុបតារាង
              </button>
              <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>តារាង (Table)</span>
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
    <div className={`text-editor text-editor-word-app text-editor-${variant}`} style={{ border: "1px solid #cbd5e1", borderRadius: "8px", background: "#e2e8f0", overflow: "hidden" }} lang="km">
      <LexicalComposer initialConfig={initialConfig}>
        <WordRibbonToolbar activeTab={activeTab} setActiveTab={setActiveTab} zoomLevel={zoomLevel} setZoomLevel={setZoomLevel} />

        {/* A4 FLOATING CANVAS SHEET */}
        <div className="word-paper-canvas" style={{ padding: "2rem 1rem", minHeight: "600px", overflowX: "auto", display: "flex", justifyContent: "center" }}>
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
              transform: `scale(${zoomLevel})`,
              transformOrigin: "top center",
              transition: "transform 0.15s ease",
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
            <HtmlInitialLoaderPlugin initialHtml={value} />
            <HtmlOnChangePlugin onChange={onChange} setStats={setStats} />
          </div>
        </div>

        {/* MS WORD BOTTOM STATUS BAR */}
        <div style={{ background: "#f8fafc", borderTop: "1px solid #cbd5e1", padding: "0.35rem 1rem", fontSize: "0.75rem", color: "#64748b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: "1.25rem" }}>
            <span>ទំព័រ ១ នៃ ១</span>
            <span>ចំនួនពាក្យ៖ {stats.words}</span>
            <span>ចំនួនតួអក្សរ៖ {stats.chars}</span>
          </div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <span>ភាសាខ្មែរ (កម្ពុជា)</span>
            <span>{Math.round(zoomLevel * 100)}%</span>
          </div>
        </div>
      </LexicalComposer>
    </div>
  );
}
