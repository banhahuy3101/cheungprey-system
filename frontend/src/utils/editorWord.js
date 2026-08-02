import { Extension, mergeAttributes, ResizableNodeView } from "@tiptap/core";
import Image from "@tiptap/extension-image";

/** Word-style font size via textStyle mark (px). */
export const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (el) => el.style.fontSize?.replace("px", "") || null,
            renderHTML: (attrs) => {
              if (!attrs.fontSize) return {};
              return { style: `font-size: ${attrs.fontSize}px` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize) =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

/** Line height via textStyle mark. */
export const LineHeight = Extension.create({
  name: "lineHeight",
  addOptions() {
    return { types: ["textStyle"], defaults: ["1", "1.15", "1.5", "2", "2.5", "3"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (el) => el.style.lineHeight || null,
            renderHTML: (attrs) => {
              if (!attrs.lineHeight) return {};
              return { style: `line-height: ${attrs.lineHeight}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLineHeight:
        (lineHeight) =>
        ({ chain }) =>
          chain().setMark("textStyle", { lineHeight }).run(),
      unsetLineHeight:
        () =>
        ({ chain }) =>
          chain().setMark("textStyle", { lineHeight: null }).removeEmptyTextStyle().run(),
    };
  },
});

/** Paragraph indent via paragraph node attribute. */
export const ParagraphIndent = Extension.create({
  name: "paragraphIndent",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (el) => parseInt(el.style.marginLeft || "0", 10) / 40 || 0,
            renderHTML: (attrs) => {
              const lvl = attrs.indent || 0;
              if (lvl <= 0) return {};
              return { style: `margin-left: ${lvl * 40}px` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      indentParagraph:
        () =>
        ({ state, commands }) => {
          const pos = state.selection.$from;
          const node = pos.node();
          if (!node || !node.type.isBlock) return false;
          if (["paragraph", "heading"].includes(node.type.name)) {
            const current = node.attrs.indent || 0;
            return commands.updateAttributes(node.type.name, { indent: current + 1 });
          }
          return false;
        },
      outdentParagraph:
        () =>
        ({ state, commands }) => {
          const pos = state.selection.$from;
          const node = pos.node();
          if (!node || !node.type.isBlock) return false;
          if (["paragraph", "heading"].includes(node.type.name)) {
            const current = node.attrs.indent || 0;
            if (current <= 0) return false;
            return commands.updateAttributes(node.type.name, { indent: current - 1 });
          }
          return false;
        },
    };
  },
});

export const KHMER_FONT_STACK = '"Kantumruy Pro", "Noto Sans Khmer", "Battambang", "Khmer OS", sans-serif';

export const KHMER_FONTS = [
  { label: "— Khmer —", value: "", disabled: true },
  { label: "Kantumruy Pro", value: "Kantumruy Pro" },
  { label: "Noto Sans Khmer", value: "Noto Sans Khmer" },
  { label: "Battambang", value: "Battambang" },
  { label: "Moul", value: "Moul" },
  { label: "Siemreap", value: "Siemreap" },
  { label: "Content", value: "Content" },
  { label: "Suwannaphum", value: "Suwannaphum" },
  { label: "Dangrek", value: "Dangrek" },
  { label: "— Popular —", value: "", disabled: true },
  { label: "Roboto", value: "Roboto" },
  { label: "Open Sans", value: "Open Sans" },
  { label: "Lato", value: "Lato" },
  { label: "Poppins", value: "Poppins" },
  { label: "Inter", value: "Inter" },
  { label: "Noto Sans", value: "Noto Sans" },
  { label: "Montserrat", value: "Montserrat" },
];

export const DEFAULT_FONT = "Kantumruy Pro";
export const DEFAULT_FONT_SIZE = "14";
export const WORD_FONT_SIZES = ["10", "11", "12", "14", "16", "18", "20", "24", "28", "36"];

export const TOOLBAR_LABELS = {
  undo: "មិនធ្វើ",
  redo: "ធ្វើឡើងវិញ",
  normal: "អត្ថបទធម្មតា",
  heading1: "ចំណងជើង ១",
  heading2: "ចំណងជើង ២",
  heading3: "ចំណងជើង ៣",
  heading4: "ចំណងជើង ៤",
  fontFamily: "ពុម្ពអក្សរ",
  fontSize: "ទំហំ",
  bold: "ដិត",
  italic: "ទ្រេត",
  underline: "គូសបន្ទាត់",
  strike: "ឆូត",
  code: "កូដ",
  subscript: "លិខិតតូច",
  superscript: "លិខិតធំ",
  alignLeft: "ចាកឆ្វេង",
  alignCenter: "កណ្តាល",
  alignRight: "ចាកស្តា",
  alignJustify: "ពេញបន្ទាត់",
  bulletList: "បញ្ជី",
  orderedList: "បញ្ជីលេខ",
  blockquote: "សូនាយត្រជ័យ",
  codeBlock: "ប្លុកកូដ",
  horizontalRule: "បន្ទាត់ផ្តេក",
  link: "តំណ",
  unlink: "ដកតំណ",
  image: "រូបភាព",
  deleteImage: "លុបរូបភាព",
  table: "តារាង",
  addRow: "បន្ថែមជួរ",
  addColumn: "បន្ថែមជួរឈរ",
  deleteRow: "លុបជួរ",
  deleteColumn: "លុបជួរឈរ",
  deleteTable: "លុបតារាង",
  mergeCells: "បញ្ចូលក្រឡា",
  splitCell: "បំបែកក្រឡា",
  borderStyle: "ស្ទីលស៊ុម",
  borderWidth: "កម្រាស់ស៊ុម",
  borderColor: "ពណ៌ស៊ុម",
  indent: "បន្ថែមចូល",
  outdent: "ដកចេញ",
  lineHeight: "គម្លាតបន្ទាត់",
  wordCount: "ចំនួនពាក្យ",
  textColor: "ពណ៌អក្សរ",
  highlight: "បន្លុះ",
  clearHighlight: "លុបបន្លុះ",
  pageNumbers: "លេខទំព័រ",
  clearFormatting: "សម្អាតទ្រង់ទ្រាយ",
  linkPrompt: "URL តំណ",
  imagePrompt: "URL រូបភាព",
  imageInsertTitle: "បញ្ចូលរូបភាព",
  imageFromUrl: "ពី URL",
  imageFromDevice: "ពីឧបករណ៍",
  imageUrlLabel: "URL រូបភាព",
  imageFileLabel: "ជ្រើសរើសរូបភាព",
  imageUrlRequired: "សូមបញ្ចូល URL",
  imageFileRequired: "សូមជ្រើសរើសរូបភាព",
  imageFileTypeError: "សូមជ្រើសរើសឯកសាររូបភាព (JPG, PNG, GIF, WebP)",
  imageFileSizeError: "រូបភាពត្រូវតែតូចជាង 5MB",
  imageReadError: "អានរូបភាពមិនបាន",
  cancel: "បោះបង់",
  insert: "បញ្ចូល",
  inserting: "កំពុងបញ្ចូល...",
};


/** Strip pasted inline fonts so Khmer stack applies (Word default font behavior). */
export function normalizePastedHtml(html) {
  return html
    .replace(/font-family\s*:\s*[^;}"']+;?/gi, "")
    .replace(/font-size\s*:\s*[^;}"']+;?/gi, "");
}

/** Word-like command helpers — one chain per toolbar action. */
export function wordCommands(editor) {
  const chain = () => editor.chain().focus();

  return {
    undo: () => chain().undo().run(),
    redo: () => chain().redo().run(),
    canUndo: () => editor.can().undo(),
    canRedo: () => editor.can().redo(),

    /** Word "Normal" paragraph style */
    normalText: () =>
      chain()
        .setParagraph()
        .unsetAllMarks()
        .unsetHighlight()
        .setFontFamily(DEFAULT_FONT)
        .setFontSize(DEFAULT_FONT_SIZE)
        .run(),

    setHeading: (level) => chain().toggleHeading({ level }).run(),
    isHeading: (level) => editor.isActive("heading", { level }),

    toggleBold: () => chain().toggleBold().run(),
    toggleItalic: () => chain().toggleItalic().run(),
    toggleUnderline: () => chain().toggleUnderline().run(),
    toggleStrike: () => chain().toggleStrike().run(),
    toggleCode: () => chain().toggleCode().run(),

    /** Word: subscript and superscript are mutually exclusive */
    toggleSubscript: () => {
      if (editor.isActive("superscript")) {
        chain().unsetMark("superscript").toggleSubscript().run();
        return;
      }
      chain().toggleSubscript().run();
    },
    toggleSuperscript: () => {
      if (editor.isActive("subscript")) {
        chain().unsetMark("subscript").toggleSuperscript().run();
        return;
      }
      chain().toggleSuperscript().run();
    },

    setAlign: (align) => chain().setTextAlign(align).run(),
    isAlign: (align) => editor.isActive({ textAlign: align }),

    toggleBulletList: () => chain().toggleBulletList().run(),
    toggleOrderedList: () => chain().toggleOrderedList().run(),
    toggleBlockquote: () => chain().toggleBlockquote().run(),
    toggleCodeBlock: () => chain().toggleCodeBlock().run(),
    horizontalRule: () => chain().setHorizontalRule().run(),

    setFontFamily: (family) => chain().setFontFamily(family).run(),
    setFontSize: (size) => chain().setFontSize(size).run(),
    setColor: (color) => chain().setColor(color).run(),
    toggleHighlight: (color) => chain().toggleHighlight({ color }).run(),
    unsetHighlight: () => chain().unsetHighlight().run(),

    /** Word Clear All Formatting */
    clearFormatting: () =>
      chain()
        .unsetAllMarks()
        .unsetHighlight()
        .clearNodes()
        .setParagraph()
        .setTextAlign("left")
        .setFontFamily(DEFAULT_FONT)
        .setFontSize(DEFAULT_FONT_SIZE)
        .run(),

    insertTable: () =>
      chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    addRowAfter: () => chain().addRowAfter().run(),
    addColumnAfter: () => chain().addColumnAfter().run(),
    deleteRow: () => chain().deleteRow().run(),
    deleteColumn: () => chain().deleteColumn().run(),
    deleteTable: () => chain().deleteTable().run(),
    mergeCells: () => chain().mergeCells().run(),
    canMergeCells: () => editor.can().mergeCells(),
    splitCell: () => chain().splitCell().run(),
    canSplitCell: () => editor.can().splitCell(),

    setCellBorderStyle: (style) => editor.chain().focus().setCellBorderStyle(style).run(),
    setCellBorderWidth: (width) => editor.chain().focus().setCellBorderWidth(width).run(),
    setCellBorderColor: (color) => editor.chain().focus().setCellBorderColor(color).run(),

    setLink: (url) => {
      if (!url) {
        chain().extendMarkRange("link").unsetLink().run();
        return;
      }
      chain().extendMarkRange("link").setLink({ href: url }).run();
    },
    unsetLink: () => chain().unsetLink().run(),

    insertImage: (src) => chain().setImage({ src }).run(),

    setImageAlign: (align) =>
      editor
        .chain()
        .focus()
        .setTextAlign(align)
        .run(),

    currentFont: () => editor.getAttributes("textStyle").fontFamily || DEFAULT_FONT,
    currentSize: () => editor.getAttributes("textStyle").fontSize || DEFAULT_FONT_SIZE,
    currentColor: () => editor.getAttributes("textStyle").color || "#0f172a",
    currentLineHeight: () => editor.getAttributes("textStyle").lineHeight || "",

    setLineHeight: (lh) => editor.chain().focus().setLineHeight(lh).run(),
    unsetLineHeight: () => editor.chain().focus().unsetLineHeight().run(),

    indentParagraph: () => editor.chain().focus().indentParagraph().run(),
    outdentParagraph: () => editor.chain().focus().outdentParagraph().run(),
    canIndent: () => editor.can().indentParagraph(),
    canOutdent: () => editor.can().outdentParagraph(),

    wordCount: () => {
      const text = editor.state.doc.textContent;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const chars = text.length;
      return { words, chars };
    },
  };
}

/** Table cell border extension — adds border style/color/width attributes. */
export const TableCellBorder = Extension.create({
  name: "tableCellBorder",
  addGlobalAttributes() {
    return [
      {
        types: ["tableCell", "tableHeader"],
        attributes: {
          cellBorderStyle: {
            default: "solid",
            parseHTML: (el) => el.getAttribute("data-cell-border-style") || "solid",
            renderHTML: (attrs) => {
              const v = attrs.cellBorderStyle || "solid";
              return { "data-cell-border-style": v };
            },
          },
          cellBorderWidth: {
            default: 1,
            parseHTML: (el) => parseInt(el.getAttribute("data-cell-border-width") || "1", 10),
            renderHTML: (attrs) => {
              const w = attrs.cellBorderWidth ?? 1;
              if (w === 0) return { "data-cell-border-width": "0", style: "border-width: 0" };
              return {
                "data-cell-border-width": String(w),
                style: `border-width: ${w}px`,
              };
            },
          },
          cellBorderColor: {
            default: "#d1d5db",
            parseHTML: (el) => {
              const c = el.style.borderColor || el.style.borderBottomColor || "";
              return c || "#d1d5db";
            },
            renderHTML: (attrs) => {
              const c = attrs.cellBorderColor || "#d1d5db";
              if (c === "transparent") return { style: "border-color: transparent" };
              return { style: `border-color: ${c}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setCellBorderStyle:
        (style) =>
        ({ commands }) => {
          const attrStyle = { cellBorderStyle: style };
          if (style === "none") attrStyle.cellBorderWidth = 0;
          commands.updateAttributes("tableCell", attrStyle);
          commands.updateAttributes("tableHeader", attrStyle);
          return true;
        },
      setCellBorderWidth:
        (width) =>
        ({ commands }) => {
          const attrWidth = { cellBorderWidth: width };
          if (width === 0) attrWidth.cellBorderStyle = "none";
          commands.updateAttributes("tableCell", attrWidth);
          commands.updateAttributes("tableHeader", attrWidth);
          return true;
        },
      setCellBorderColor:
        (color) =>
        ({ commands }) => {
          commands.updateAttributes("tableCell", { cellBorderColor: color });
          commands.updateAttributes("tableHeader", { cellBorderColor: color });
          return true;
        },
    };
  },
});

/** Image with resize handles + click selection border (selectNode on custom node view). */
export const ResizableImage = Image.extend({
  selectable: true,

  addNodeView() {
    if (!this.options.resize?.enabled || typeof document === "undefined") {
      return null;
    }

    const { directions, minWidth, minHeight, alwaysPreserveAspectRatio } = this.options.resize;
    const extensionName = this.name;
    const htmlAttributes = this.options.HTMLAttributes;

    return ({ node, getPos, HTMLAttributes, editor }) => {
      const el = document.createElement("img");
      el.draggable = false;

      const mergedAttributes = mergeAttributes(htmlAttributes, HTMLAttributes);
      Object.entries(mergedAttributes).forEach(([key, value]) => {
        if (value == null || key === "width" || key === "height") return;
        el.setAttribute(key, value);
      });
      if (mergedAttributes.src != null) {
        el.src = mergedAttributes.src;
      }

      const nodeView = new ResizableNodeView({
        element: el,
        editor,
        node,
        getPos,
        onResize: (width, height) => {
          el.style.width = `${width}px`;
          el.style.height = `${height}px`;
        },
        onCommit: (width, height) => {
          const pos = getPos();
          if (pos === undefined) return;
          editor
            .chain()
            .setNodeSelection(pos)
            .updateAttributes(extensionName, { width, height })
            .run();
        },
        onUpdate: (updatedNode) => updatedNode.type === node.type,
        options: {
          directions,
          min: { width: minWidth, height: minHeight },
          preserveAspectRatio: alwaysPreserveAspectRatio === true,
        },
      });

      const dom = nodeView.dom;
      dom.setAttribute("data-drag-handle", "");
      dom.style.visibility = "hidden";
      dom.style.pointerEvents = "none";
      el.onload = () => {
        dom.style.visibility = "";
        dom.style.pointerEvents = "";
      };

      return Object.assign(nodeView, {
        selectNode() {
          dom.classList.add("ProseMirror-selectednode");
        },
        deselectNode() {
          dom.classList.remove("ProseMirror-selectednode");
        },
      });
    };
  },
});
