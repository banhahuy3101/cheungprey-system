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
  table: "តារាង",
  addRow: "បន្ថែមជួរ",
  addColumn: "បន្ថែមជួរឈរ",
  deleteRow: "លុបជួរ",
  deleteTable: "លុបតារាង",
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
    deleteTable: () => chain().deleteTable().run(),

    setLink: (url) => {
      if (!url) {
        chain().extendMarkRange("link").unsetLink().run();
        return;
      }
      chain().extendMarkRange("link").setLink({ href: url }).run();
    },
    unsetLink: () => chain().unsetLink().run(),

    insertImage: (src) => chain().setImage({ src }).run(),

    currentFont: () => editor.getAttributes("textStyle").fontFamily || DEFAULT_FONT,
    currentSize: () => editor.getAttributes("textStyle").fontSize || DEFAULT_FONT_SIZE,
    currentColor: () => editor.getAttributes("textStyle").color || "#0f172a",
  };
}

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
