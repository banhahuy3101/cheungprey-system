import { useState, useCallback, useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND } from "lexical";
import { LuBold, LuItalic, LuUnderline, LuStrikethrough } from "react-icons/lu";

export function FloatingSelectionToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [coords, setCoords] = useState(null);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);

  const updateFloatingToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection) && !selection.isCollapsed()) {
      const domSelection = window.getSelection();
      if (domSelection && domSelection.rangeCount > 0) {
        const range = domSelection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          // Position nicely above the selection
          setCoords({
            top: Math.max(10, rect.top - 42),
            left: Math.max(10, rect.left + rect.width / 2 - 64),
          });
          setIsBold(selection.hasFormat("bold"));
          setIsItalic(selection.hasFormat("italic"));
          setIsUnderline(selection.hasFormat("underline"));
          setIsStrikethrough(selection.hasFormat("strikethrough"));
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
        display: "flex",
        alignItems: "center",
        gap: "2px",
        background: "#0f172a",
        padding: "3px 5px",
        borderRadius: "8px",
        boxShadow: "0 10px 25px -3px rgba(0, 0, 0, 0.45), 0 4px 6px -4px rgba(0, 0, 0, 0.2)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        userSelect: "none",
        animation: "fadeIn 0.12s ease-out",
      }}
      onMouseDown={(e) => {
        // Prevent clicking toolbar buttons from blurring the editor selection
        e.preventDefault();
      }}
    >
      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        style={{
          width: "26px",
          height: "26px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "5px",
          border: "none",
          background: isBold ? "#2563eb" : "transparent",
          color: isBold ? "#ffffff" : "#cbd5e1",
          cursor: "pointer",
          transition: "all 0.12s ease",
        }}
        title="Bold (Ctrl+B)"
      >
        <LuBold size={13} />
      </button>

      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        style={{
          width: "26px",
          height: "26px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "5px",
          border: "none",
          background: isItalic ? "#2563eb" : "transparent",
          color: isItalic ? "#ffffff" : "#cbd5e1",
          cursor: "pointer",
          transition: "all 0.12s ease",
        }}
        title="Italic (Ctrl+I)"
      >
        <LuItalic size={13} />
      </button>

      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
        style={{
          width: "26px",
          height: "26px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "5px",
          border: "none",
          background: isUnderline ? "#2563eb" : "transparent",
          color: isUnderline ? "#ffffff" : "#cbd5e1",
          cursor: "pointer",
          transition: "all 0.12s ease",
        }}
        title="Underline (Ctrl+U)"
      >
        <LuUnderline size={13} />
      </button>

      <button
        type="button"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}
        style={{
          width: "26px",
          height: "26px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "5px",
          border: "none",
          background: isStrikethrough ? "#2563eb" : "transparent",
          color: isStrikethrough ? "#ffffff" : "#cbd5e1",
          cursor: "pointer",
          transition: "all 0.12s ease",
        }}
        title="Strikethrough"
      >
        <LuStrikethrough size={13} />
      </button>
    </div>
  );
}
