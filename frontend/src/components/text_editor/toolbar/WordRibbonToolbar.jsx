import { useState, useCallback, useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $createTextNode,
  $createParagraphNode,
  $insertNodes,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
} from "lexical";
import { $setBlocksType, $patchStyleText } from "@lexical/selection";
import { HeadingNode, QuoteNode, $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { CodeNode, $createCodeNode } from "@lexical/code";
import {
  $isTableCellNode,
  $isTableNode,
  $getTableCellNodeFromLexicalNode,
  $createTableNodeWithDimensions,
  $insertTableRow__EXPERIMENTAL,
  $insertTableColumn__EXPERIMENTAL,
  $deleteTableRow__EXPERIMENTAL,
  $deleteTableColumn__EXPERIMENTAL,
  $unmergeCell,
  $isTableSelection,
} from "@lexical/table";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { $generateNodesFromDOM } from "@lexical/html";
import {
  LuFileText,
  LuSave,
  LuUndo,
  LuRedo,
  LuMaximize2,
  LuMinimize2,
} from "react-icons/lu";

import { HomeTab } from "./tabs/HomeTab.jsx";
import { InsertTab } from "./tabs/InsertTab.jsx";
import { ViewTab } from "./tabs/ViewTab.jsx";
import { LayoutTab } from "./tabs/LayoutTab.jsx";
import { DesignTab } from "./tabs/DesignTab.jsx";
import { TableTab } from "./tabs/TableTab.jsx";
import { WatermarkModal } from "../modals/WatermarkModal.jsx";
import { DropCapModal } from "../modals/DropCapModal.jsx";
import { LinkModal } from "../modals/LinkModal.jsx";
import { TableModal } from "../modals/TableModal.jsx";
import { FindReplaceBar } from "../modals/FindReplaceBar.jsx";
import { $createImageNode } from "../nodes/ImageNode.jsx";
import { $createDropCapNode } from "../nodes/DropCapNode.jsx";
import {
  OFFICIAL_KHMER_HEADER_HTML,
  REPORT_META_TABLE_HTML,
  SIGNATURE_BLOCK_HTML,
  RECIPIENTS_BLOCK_HTML,
} from "../constants/templates.js";

export function WordRibbonToolbar({
  activeTab,
  setActiveTab,
  zoomLevel,
  setZoomLevel,
  isFullscreen,
  setIsFullscreen,
  readOnly = false,
  showHeaderFooter,
  setShowHeaderFooter,
  pageBgColor,
  setPageBgColor,
  pageBorder,
  setPageBorder,
}) {
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
  const [showWatermarkMenu, setShowWatermarkMenu] = useState(false);
  const [watermarkText, setWatermarkText] = useState("");
  const [showDropCapMenu, setShowDropCapMenu] = useState(false);
  const [dropCapSize, setDropCapSize] = useState(3);
  const [dropCapSpacing, setDropCapSpacing] = useState(4);
  const [dropCapWeight, setDropCapWeight] = useState(700);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedLinkText, setSelectedLinkText] = useState("");
  const [showTableModal, setShowTableModal] = useState(false);
  const [saved, setSaved] = useState(false);

  // Keep a reference to the selected text before opening modals
  const selectedTextRef = useRef("");

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat("bold"));
      setIsItalic(selection.hasFormat("italic"));
      setIsUnderline(selection.hasFormat("underline"));
      setIsStrikethrough(selection.hasFormat("strikethrough"));
      setIsSubscript(selection.hasFormat("subscript"));
      setIsSuperscript(selection.hasFormat("superscript"));

      const text = selection.getTextContent();
      if (text) {
        selectedTextRef.current = text;
      }

      // Detect if cursor is inside a table cell
      const anchorNode = selection.anchor.getNode();
      let node = anchorNode;
      let inTable = false;
      while (node !== null) {
        if ($isTableCellNode(node)) {
          inTable = true;
          break;
        }
        const parent = node.getParent?.();
        if (parent === null || parent === undefined) break;
        node = parent;
      }
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

  const handleOpenTableModal = () => {
    setShowTableModal(true);
  };

  const handleApplyTable = (cols, rows) => {
    editor.update(() => {
      const selection = $getSelection();
      const tableNode = $createTableNodeWithDimensions(rows, cols, true);
      if ($isRangeSelection(selection)) {
        $insertNodes([tableNode]);
      } else {
        const root = $getRoot();
        root.append(tableNode);
      }
    });
  };

  const handleOpenLinkModal = () => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        setSelectedLinkText(selection.getTextContent() || "");
      } else {
        setSelectedLinkText("");
      }
    });
    setShowLinkModal(true);
  };

  const handleApplyLink = (url, linkText) => {
    editor.update(() => {
      const selection = $getSelection();
      const textToUse = linkText || url;
      const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#2563eb; text-decoration:underline;">${textToUse}</a>`;
      const parser = new DOMParser();
      const dom = parser.parseFromString(linkHtml, "text/html");
      const nodes = $generateNodesFromDOM(editor, dom);
      if ($isRangeSelection(selection)) {
        $insertNodes(nodes);
      } else {
        const root = $getRoot();
        root.append(...nodes);
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

  const handleOpenDropCapModal = () => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const text = selection.getTextContent();
        if (text) selectedTextRef.current = text;
      }
    });
    setShowDropCapMenu(true);
  };

  const applyDropCap = () => {
    editor.update(() => {
      const selection = $getSelection();
      let text = "";
      if ($isRangeSelection(selection) && !selection.isCollapsed()) {
        text = selection.getTextContent();
      } else if (selectedTextRef.current) {
        text = selectedTextRef.current;
      }

      if (text && text.length > 0) {
        const size = Math.max(1.5, Math.min(8, Number(dropCapSize) || 3));
        const spacing = Math.max(0, Math.min(32, Number(dropCapSpacing) || 0));
        const weight = Math.max(400, Math.min(900, Number(dropCapWeight) || 700));
        const nodes = [$createDropCapNode(text[0], size, spacing, weight)];
        const rest = text.slice(1);
        if (rest) nodes.push($createTextNode(rest));
        if ($isRangeSelection(selection)) {
          selection.insertNodes(nodes);
        } else {
          $getRoot().append(...nodes);
        }
      }
    });
    setShowDropCapMenu(false);
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

  const applyCellBgColor = (bgColor) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { "background-color": bgColor });
      }
    });
  };

  const insertDateTime = () => {
    const now = new Date();
    const kh = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
    const s = `ថ្ងៃទី${now.getDate()} ខែ${kh[now.getMonth()]} ឆ្នាំ${now.getFullYear()}`;
    editor.update(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) sel.insertNodes([$createTextNode(s)]);
    });
  };

  const applyWatermark = (text) => {
    const sheet = document.querySelector(".word-a4-sheet");
    if (!sheet) return;
    const old = sheet.querySelector(".watermark-overlay");
    if (old) old.remove();
    const label = String(text || "").trim();
    if (!label) return;
    const wm = document.createElement("div");
    wm.className = "watermark-overlay";
    wm.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0;opacity:0.08;font-size:5rem;font-weight:900;color:#000;transform:rotate(-30deg);user-select:none;text-align:center;white-space:pre-wrap";
    wm.textContent = label;
    sheet.style.position = "relative";
    sheet.appendChild(wm);
  };

  const insertHtmlBlock = (html) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const parser = new DOMParser();
      const dom = parser.parseFromString(html, "text/html");
      $insertNodes($generateNodesFromDOM(editor, dom));
    });
  };

  const insertOfficialHeader = () => insertHtmlBlock(OFFICIAL_KHMER_HEADER_HTML);
  const insertReportMetaTable = () => insertHtmlBlock(REPORT_META_TABLE_HTML);
  const insertSignatureBlock = () => insertHtmlBlock(SIGNATURE_BLOCK_HTML);
  const insertRecipientsBlock = () => insertHtmlBlock(RECIPIENTS_BLOCK_HTML);

  const insertPageBreak = () => {
    editor.update(() => {
      const s = $getSelection();
      if ($isRangeSelection(s)) {
        const p = new DOMParser();
        const d = p.parseFromString('<br style="page-break-after:always;" />', "text/html");
        $insertNodes($generateNodesFromDOM(editor, d));
      }
    });
  };

  const applyParagraphSpacing = (v) => {
    editor.update(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) {
        let block = sel.anchor.getNode();
        while (block && block.__type !== "paragraph" && block.__type !== "heading") {
          block = block.getParent?.() || null;
          if (!block) break;
        }
        if (block) {
          const w = block.getWritable();
          w.__style = (w.__style || "").replace(/margin-top:[^;]*;?/g, "").replace(/margin-bottom:[^;]*;?/g, "").trim();
          if (v !== "0") w.__style += `;margin-top:${v}pt;margin-bottom:${v}pt`;
        }
      }
    });
  };

  const handleFindNext = useCallback(() => {
    if (!findText) return;
    editor.update(() => {
      const root = $getRoot();
      if (!root.getTextContent().toLowerCase().includes(findText.toLowerCase())) return;
      const nodes = [];
      root.getDescendants().forEach((n) => {
        if (n.__type === "text") nodes.push(n);
      });
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

  // Table operations
  const insertRowAbove = () => editor.update(() => $insertTableRow__EXPERIMENTAL(false));
  const insertRowBelow = () => editor.update(() => $insertTableRow__EXPERIMENTAL(true));
  const deleteRow = () => editor.update(() => $deleteTableRow__EXPERIMENTAL());
  const insertColLeft = () => editor.update(() => $insertTableColumn__EXPERIMENTAL(false));
  const insertColRight = () => editor.update(() => $insertTableColumn__EXPERIMENTAL(true));
  const deleteCol = () => editor.update(() => $deleteTableColumn__EXPERIMENTAL());
  const deleteTable = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        let node = selection.anchor.getNode();
        while (node) {
          if ($isTableNode(node)) {
            node.remove();
            return;
          }
          node = node.getParent?.() ?? null;
        }
      }
    });
    setActiveTab("home");
  };

  const mergeCells = () => {
    editor.update(() => {
      const selection = $getSelection();
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
            addedColSpan += cell.getColSpan() || 1;
            cell.remove();
          }
          const firstSpan = firstCell.getColSpan() || 1;
          firstCell.setColSpan(firstSpan + addedColSpan);
          return;
        }
      }
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
  };

  const unmergeCell = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const cellNode = $getTableCellNodeFromLexicalNode(selection.anchor.getNode());
        if (cellNode) $unmergeCell();
      }
    });
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
          <button
            type="button"
            style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.78rem" }}
            onClick={() => {
              editor.update(() => {});
              setSaved(true);
              setTimeout(() => setSaved(false), 1500);
            }}
            title="Save"
          >
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
        {[
          { key: "home", label: "Home", color: "#185abd" },
          { key: "insert", label: "Insert", color: "#185abd" },
          { key: "view", label: "View", color: "#185abd" },
          { key: "layout", label: "Layout", color: "#185abd" },
          { key: "design", label: "Design", color: "#7c3aed" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.85rem",
              fontWeight: activeTab === tab.key ? "600" : "500",
              color: activeTab === tab.key ? tab.color : "#475569",
              borderBottom: activeTab === tab.key ? `2.5px solid ${tab.color}` : "2.5px solid transparent",
              background: "transparent",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}

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
          <HomeTab
            isBold={isBold}
            isItalic={isItalic}
            isUnderline={isUnderline}
            isStrikethrough={isStrikethrough}
            isSubscript={isSubscript}
            isSuperscript={isSuperscript}
            blockType={blockType}
            fontFamily={fontFamily}
            fontSize={fontSize}
            setFontSize={setFontSize}
            painterStyle={painterStyle}
            toggleFormatPainter={toggleFormatPainter}
            applyFontFamily={applyFontFamily}
            applyFontSize={applyFontSize}
            changeFontSizeBy={changeFontSizeBy}
            clearFormatting={clearFormatting}
            formatText={formatText}
            formatAlign={formatAlign}
            formatHeading={formatHeading}
            formatParagraph={formatParagraph}
            formatQuote={formatQuote}
            formatCodeBlock={formatCodeBlock}
            formatBulletList={formatBulletList}
            formatNumberedList={formatNumberedList}
            insertChecklist={insertChecklist}
            showParagraphMarks={showParagraphMarks}
            setShowParagraphMarks={setShowParagraphMarks}
            toggleTextDirection={toggleTextDirection}
            applyLineSpacing={applyLineSpacing}
            showBorders={showBorders}
            setShowBorders={setShowBorders}
            applyParagraphBorder={applyParagraphBorder}
            showCaseMenu={showCaseMenu}
            setShowCaseMenu={setShowCaseMenu}
            changeCase={changeCase}
            showHighlightSwatches={showHighlightSwatches}
            setShowHighlightSwatches={setShowHighlightSwatches}
            applyHighlightColor={applyHighlightColor}
            showColorSwatches={showColorSwatches}
            setShowColorSwatches={setShowColorSwatches}
            applyTextColor={applyTextColor}
            showFindReplace={showFindReplace}
            setShowFindReplace={setShowFindReplace}
            outdent={() => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)}
            indent={() => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)}
          />
        )}

        {activeTab === "insert" && (
          <InsertTab
            insertOfficialHeader={insertOfficialHeader}
            insertReportMetaTable={insertReportMetaTable}
            insertSignatureBlock={insertSignatureBlock}
            insertRecipientsBlock={insertRecipientsBlock}
            insertTable={handleOpenTableModal}
            insertLink={handleOpenLinkModal}
            handleImageUpload={handleImageUpload}
            insertHorizontalRule={insertHorizontalRule}
            insertPageBreak={insertPageBreak}
            setShowDropCapMenu={handleOpenDropCapModal}
            showSymbols={showSymbols}
            setShowSymbols={setShowSymbols}
            insertSymbol={insertSymbol}
            insertDateTime={insertDateTime}
            showHeaderFooter={showHeaderFooter}
            setShowHeaderFooter={setShowHeaderFooter}
          />
        )}

        {activeTab === "view" && (
          <ViewTab
            handlePrint={handlePrint}
            zoomLevel={zoomLevel}
            setZoomLevel={setZoomLevel}
          />
        )}

        {activeTab === "layout" && (
          <LayoutTab applyParagraphSpacing={applyParagraphSpacing} />
        )}

        {activeTab === "design" && (
          <DesignTab
            pageBgColor={pageBgColor}
            setPageBgColor={setPageBgColor}
            pageBorder={pageBorder}
            setPageBorder={setPageBorder}
            showWatermarkMenu={showWatermarkMenu}
            setShowWatermarkMenu={setShowWatermarkMenu}
          />
        )}

        {activeTab === "table" && isInTable && (
          <TableTab
            insertRowAbove={insertRowAbove}
            insertRowBelow={insertRowBelow}
            deleteRow={deleteRow}
            insertColLeft={insertColLeft}
            insertColRight={insertColRight}
            deleteCol={deleteCol}
            mergeCells={mergeCells}
            unmergeCell={unmergeCell}
            applyCellAlignment={applyCellAlignment}
            applyCellBgColor={applyCellBgColor}
            deleteTable={deleteTable}
          />
        )}
      </div>

      <FindReplaceBar
        showFindReplace={showFindReplace}
        setShowFindReplace={setShowFindReplace}
        findText={findText}
        setFindText={setFindText}
        replaceText={replaceText}
        setReplaceText={setReplaceText}
        onFindNext={handleFindNext}
        onReplaceOne={handleReplaceOne}
        onReplaceAll={handleReplaceAll}
      />

      <WatermarkModal
        isOpen={showWatermarkMenu}
        onClose={() => setShowWatermarkMenu(false)}
        watermarkText={watermarkText}
        setWatermarkText={setWatermarkText}
        onApply={applyWatermark}
      />

      <DropCapModal
        isOpen={showDropCapMenu}
        onClose={() => setShowDropCapMenu(false)}
        dropCapSize={dropCapSize}
        setDropCapSize={setDropCapSize}
        dropCapSpacing={dropCapSpacing}
        setDropCapSpacing={setDropCapSpacing}
        dropCapWeight={dropCapWeight}
        setDropCapWeight={setDropCapWeight}
        onApply={applyDropCap}
      />

      <LinkModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        initialText={selectedLinkText}
        onApply={handleApplyLink}
      />

      <TableModal
        isOpen={showTableModal}
        onClose={() => setShowTableModal(false)}
        onApply={handleApplyTable}
      />
    </div>
  );
}
