import { NodeSelection } from "@tiptap/pm/state";
import { useEffect, useMemo, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import {
  LuBold,
  LuItalic,
  LuStrikethrough,
  LuUnderline,
  LuHeading1,
  LuHeading2,
  LuHeading3,
  LuHeading4,
  LuList,
  LuListOrdered,
  LuQuote,
  LuMinus,
  LuUndo2,
  LuRedo2,
  LuAlignLeft,
  LuAlignCenter,
  LuAlignRight,
  LuAlignJustify,
  LuLink,
  LuUnlink,
  LuImage,
  LuTable,
  LuCode,
  LuCodeXml,
  LuSubscript,
  LuSuperscript,
  LuEraser,
  LuRows3,
  LuTrash2,
  LuColumns3,
  LuPilcrow,
  LuBookmark,
} from "react-icons/lu";
import {
  FontSize,
  ResizableImage,
  KHMER_FONTS,
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  WORD_FONT_SIZES,
  TOOLBAR_LABELS,
  normalizePastedHtml,
  wordCommands,
} from "../utils/editorWord";
import ImageInsertModal from "./ImageInsertModal";

const PageNumber = Node.create({
  name: "pageNumber",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  parseHTML() {
    return [{ tag: "span[data-page-number]" }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", { ...HTMLAttributes, "data-page-number": "", class: "page-number-marker" }, "ទំព័រ #"]
  },

  addCommands() {
    return {
      insertPageNumber: () => ({ commands }) => commands.insertContent({ type: "pageNumber" }),
    }
  },
})

const TEXT_COLORS = [
  "#0f172a", "#dc2626", "#ea580c", "#ca8a04", "#16a34a",
  "#2563eb", "#7c3aed", "#db2777", "#64748b",
];

const HIGHLIGHT_COLORS = [
  "#fef08a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#fed7aa", "#e2e8f0",
];

function ToolbarButton({ active, disabled, onClick, title, children }) {
  return (
    <button type="button" className={active ? "active" : ""} onClick={onClick} title={title} disabled={disabled}>
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="text-editor-toolbar-divider" />;
}

function WordSelect({ label, value, onChange, options, className = "" }) {
  return (
    <label className={`text-editor-word-select ${className}`}>
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} title={label} aria-label={label}>
        {options.map((opt) => {
          const val = opt.value ?? opt;
          const lbl = opt.label ?? opt;
          return (
            <option key={val} value={val} disabled={opt.disabled}>
              {lbl}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function EditorToolbar({ editor }) {
  const [, refresh] = useState(0);
  const [imageModalOpen, setImageModalOpen] = useState(false);

  useEffect(() => {
    if (!editor) return undefined;
    const bump = () => refresh((n) => n + 1);
    editor.on("selectionUpdate", bump);
    editor.on("transaction", bump);
    return () => {
      editor.off("selectionUpdate", bump);
      editor.off("transaction", bump);
    };
  }, [editor]);

  if (!editor) return null;

  const cmd = wordCommands(editor);
  const inTable = editor.isActive("table");
  const isNormal =
    !editor.isActive("heading") &&
    !editor.isActive("blockquote") &&
    !editor.isActive("codeBlock");

  const setLink = () => {
    const prev = editor.getAttributes("link").href;
    const url = window.prompt(TOOLBAR_LABELS.linkPrompt, prev || "https://");
    if (url === null) return;
    cmd.setLink(url.trim());
  };

  const addImage = () => setImageModalOpen(true);

  const L = TOOLBAR_LABELS;

  return (
    <>
    <div className="text-editor-toolbar text-editor-toolbar-word">
      {/* Clipboard — Word: Undo / Redo */}
      <div className="text-editor-toolbar-row">
        <div className="text-editor-toolbar-group">
          <ToolbarButton onClick={cmd.undo} disabled={!cmd.canUndo()} title={L.undo}>
            <LuUndo2 />
          </ToolbarButton>
          <ToolbarButton onClick={cmd.redo} disabled={!cmd.canRedo()} title={L.redo}>
            <LuRedo2 />
          </ToolbarButton>
        </div>

        <ToolbarDivider />

        {/* Font — Word: family + size + style */}
        <div className="text-editor-toolbar-group text-editor-font-group">
          <WordSelect
            label={L.fontFamily}
            value={cmd.currentFont()}
            onChange={cmd.setFontFamily}
            options={KHMER_FONTS}
            className="text-editor-font-family"
          />
          <WordSelect
            label={L.fontSize}
            value={cmd.currentSize()}
            onChange={cmd.setFontSize}
            options={WORD_FONT_SIZES.map((s) => ({ value: s, label: s }))}
            className="text-editor-font-size"
          />
          <ToolbarButton active={editor.isActive("bold")} onClick={cmd.toggleBold} title={L.bold}>
            <LuBold />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("italic")} onClick={cmd.toggleItalic} title={L.italic}>
            <LuItalic />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("underline")} onClick={cmd.toggleUnderline} title={L.underline}>
            <LuUnderline />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("strike")} onClick={cmd.toggleStrike} title={L.strike}>
            <LuStrikethrough />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("subscript")} onClick={cmd.toggleSubscript} title={L.subscript}>
            <LuSubscript />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("superscript")} onClick={cmd.toggleSuperscript} title={L.superscript}>
            <LuSuperscript />
          </ToolbarButton>
        </div>

        <ToolbarDivider />

        {/* Colors */}
        <div className="text-editor-toolbar-group text-editor-color-group">
          <label className="text-editor-color-label" title={L.textColor}>
            <span>A</span>
            <input type="color" value={cmd.currentColor()} onChange={(e) => cmd.setColor(e.target.value)} />
          </label>
          <div className="text-editor-swatches">
            {TEXT_COLORS.map((c) => (
              <button key={c} type="button" className="text-editor-swatch" style={{ background: c }} title={c} onClick={() => cmd.setColor(c)} />
            ))}
          </div>
        </div>

        <div className="text-editor-toolbar-group text-editor-color-group">
          <span className="text-editor-highlight-label" title={L.highlight}>HL</span>
          <div className="text-editor-swatches">
            {HIGHLIGHT_COLORS.map((c) => (
              <button key={c} type="button" className="text-editor-swatch text-editor-swatch-highlight" style={{ background: c }} title={c} onClick={() => cmd.toggleHighlight(c)} />
            ))}
            <ToolbarButton onClick={cmd.unsetHighlight} title={L.clearHighlight}>
              <LuEraser />
            </ToolbarButton>
          </div>
        </div>
      </div>

      <div className="text-editor-toolbar-row">
        {/* Styles — Word: Normal + Heading 1–4 */}
        <div className="text-editor-toolbar-group">
          <ToolbarButton active={isNormal} onClick={cmd.normalText} title={L.normal}>
            <LuPilcrow />
          </ToolbarButton>
          <ToolbarButton active={cmd.isHeading(1)} onClick={() => cmd.setHeading(1)} title={L.heading1}>
            <LuHeading1 />
          </ToolbarButton>
          <ToolbarButton active={cmd.isHeading(2)} onClick={() => cmd.setHeading(2)} title={L.heading2}>
            <LuHeading2 />
          </ToolbarButton>
          <ToolbarButton active={cmd.isHeading(3)} onClick={() => cmd.setHeading(3)} title={L.heading3}>
            <LuHeading3 />
          </ToolbarButton>
          <ToolbarButton active={cmd.isHeading(4)} onClick={() => cmd.setHeading(4)} title={L.heading4}>
            <LuHeading4 />
          </ToolbarButton>
        </div>

        <ToolbarDivider />

        {/* Paragraph — Word: align + lists */}
        <div className="text-editor-toolbar-group">
          <ToolbarButton active={cmd.isAlign("left")} onClick={() => cmd.setAlign("left")} title={L.alignLeft}>
            <LuAlignLeft />
          </ToolbarButton>
          <ToolbarButton active={cmd.isAlign("center")} onClick={() => cmd.setAlign("center")} title={L.alignCenter}>
            <LuAlignCenter />
          </ToolbarButton>
          <ToolbarButton active={cmd.isAlign("right")} onClick={() => cmd.setAlign("right")} title={L.alignRight}>
            <LuAlignRight />
          </ToolbarButton>
          <ToolbarButton active={cmd.isAlign("justify")} onClick={() => cmd.setAlign("justify")} title={L.alignJustify}>
            <LuAlignJustify />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("bulletList")} onClick={cmd.toggleBulletList} title={L.bulletList}>
            <LuList />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("orderedList")} onClick={cmd.toggleOrderedList} title={L.orderedList}>
            <LuListOrdered />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("blockquote")} onClick={cmd.toggleBlockquote} title={L.blockquote}>
            <LuQuote />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("codeBlock")} onClick={cmd.toggleCodeBlock} title={L.codeBlock}>
            <LuCodeXml />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive("code")} onClick={cmd.toggleCode} title={L.code}>
            <LuCode />
          </ToolbarButton>
          <ToolbarButton onClick={cmd.horizontalRule} title={L.horizontalRule}>
            <LuMinus />
          </ToolbarButton>
        </div>

        <ToolbarDivider />

        {/* Insert — Word: link, image, table */}
        <div className="text-editor-toolbar-group">
          <ToolbarButton active={editor.isActive("link")} onClick={setLink} title={L.link}>
            <LuLink />
          </ToolbarButton>
          <ToolbarButton onClick={cmd.unsetLink} disabled={!editor.isActive("link")} title={L.unlink}>
            <LuUnlink />
          </ToolbarButton>
          <ToolbarButton onClick={addImage} title={L.image}>
            <LuImage />
          </ToolbarButton>
          <ToolbarButton onClick={cmd.insertTable} title={L.table}>
            <LuTable />
          </ToolbarButton>
        </div>

        {inTable && (
          <>
            <ToolbarDivider />
            <div className="text-editor-toolbar-group">
              <ToolbarButton onClick={cmd.addRowAfter} title={L.addRow}>
                <LuRows3 />
              </ToolbarButton>
              <ToolbarButton onClick={cmd.addColumnAfter} title={L.addColumn}>
                <LuColumns3 />
              </ToolbarButton>
              <ToolbarButton onClick={cmd.deleteRow} title={L.deleteRow}>
                <LuTrash2 />
              </ToolbarButton>
              <ToolbarButton onClick={cmd.deleteTable} title={L.deleteTable}>
                <LuTable />
              </ToolbarButton>
            </div>
          </>
        )}

        <ToolbarDivider />

        <div className="text-editor-toolbar-group">
          <ToolbarButton onClick={() => editor.chain().focus().insertPageNumber().run()} title={L.pageNumbers}>
            <LuBookmark />
          </ToolbarButton>
        </div>

        <ToolbarDivider />

        <div className="text-editor-toolbar-group">
          <ToolbarButton onClick={cmd.clearFormatting} title={L.clearFormatting}>
            <LuEraser />
          </ToolbarButton>
        </div>
      </div>
    </div>
    <ImageInsertModal
      open={imageModalOpen}
      onClose={() => setImageModalOpen(false)}
      onInsert={(src) => cmd.insertImage(src)}
      labels={L}
    />
    </>
  );
}

export default function TextEditor({
  value = "",
  onChange,
  readOnly = false,
  variant = "default",
  placeholder = "សូមបញ្ចូលខ្លឹមសាររបាយការណ៍...",
}) {
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
        underline: false,
        link: false,
      }),
      Underline,
      Subscript,
      Superscript,
      TextStyle,
      Color,
      FontFamily.configure({ types: ["textStyle"] }),
      FontSize,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
        resize: {
          enabled: true,
          directions: ["bottom-right", "bottom-left", "top-right", "top-left"],
          minWidth: 80,
          minHeight: 80,
          alwaysPreserveAspectRatio: true,
        },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder }),
      PageNumber,
    ],
    [placeholder],
  );

  const editor = useEditor({
    extensions,
    content: value || "",
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: "tiptap",
        lang: "km",
        spellcheck: "true",
      },
      transformPastedHTML: normalizePastedHtml,
      handleClickOn(_view, _pos, node, nodePos) {
        if (node.type.name === "image") {
          _view.dispatch(_view.state.tr.setSelection(NodeSelection.create(_view.state.doc, nodePos)));
          return true;
        }
        return false;
      },
    },
    onCreate: ({ editor: ed }) => {
      ed.commands.setFontFamily(DEFAULT_FONT);
      ed.commands.setFontSize(DEFAULT_FONT_SIZE);
    },
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    try {
      const current = editor.getHTML();
      const next = value || "";
      if (current !== next) {
        editor.commands.setContent(next, false);
      }
    } catch {
      // editor schema not ready yet
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor || readOnly) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  if (readOnly) {
    return (
      <div
        className={`text-editor text-editor-readonly text-editor-${variant}`}
        lang="km"
        dangerouslySetInnerHTML={{ __html: value || '<p class="text-editor-empty">—</p>' }}
      />
    );
  }

  if (!editor) {
    return <div className={`text-editor text-editor-loading text-editor-${variant}`}>កំពុងផ្ទុក...</div>;
  }

  return (
    <div className={`text-editor text-editor-${variant}`} lang="km">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} className="text-editor-content" />
    </div>
  );
}
