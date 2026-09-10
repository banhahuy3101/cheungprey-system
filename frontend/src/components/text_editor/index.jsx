import { useState, useEffect } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";

import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableNode, TableCellNode, TableRowNode } from "@lexical/table";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeNode } from "@lexical/code";
import { AutoLinkNode, LinkNode } from "@lexical/link";

import { theme } from "./constants/editorTheme.js";
import { ImageNode } from "./nodes/ImageNode.jsx";
import { DropCapNode } from "./nodes/DropCapNode.jsx";
import { HtmlInitialLoaderPlugin, HtmlOnChangePlugin } from "./plugins/HtmlPlugins.jsx";
import { FloatingSelectionToolbarPlugin } from "./plugins/FloatingToolbarPlugin.jsx";
import { DragDropPasteImagePlugin } from "./plugins/DragDropPasteImagePlugin.jsx";
import { WordRibbonToolbar } from "./toolbar/WordRibbonToolbar.jsx";
import { WordStatusBar } from "./toolbar/WordStatusBar.jsx";

function onError(error) {
  console.error("Lexical Error:", error);
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
  const [pageBgColor, setPageBgColor] = useState("#ffffff");
  const [pageBorder, setPageBorder] = useState("none");
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
      DropCapNode,
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
          pageBgColor={pageBgColor}
          setPageBgColor={setPageBgColor}
          pageBorder={pageBorder}
          setPageBorder={setPageBorder}
        />

        {/* HEADER / FOOTER EDIT BAR */}
        {showHeaderFooter && (
          <div style={{ background: "#e2e8f0", padding: "0.5rem 1rem", display: "flex", gap: "0.75rem", alignItems: "center", borderBottom: "1px solid #cbd5e1" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Header:</span>
            <input
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
              placeholder="Header text..."
              style={{ flex: 1, padding: "0.25rem 0.5rem", fontSize: "0.82rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
            />
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>Footer:</span>
            <input
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="Footer text..."
              style={{ flex: 1, padding: "0.25rem 0.5rem", fontSize: "0.82rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setHeaderText("");
                setFooterText("");
              }}
            >
              Clear
            </button>
          </div>
        )}

        {/* A4 FLOATING CANVAS SHEET */}
        <div
          className="word-paper-canvas"
          style={{
            background: "#e2e8f0",
            padding: "2.5rem 1rem",
            minHeight: "650px",
            flex: isFullscreen ? 1 : "initial",
            overflowY: "auto",
            overflowX: "auto",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            className="word-pages-container"
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "794px",
              zoom: zoomLevel,
            }}
          >
            {/* Unified Seamless A4 Paper Sheet Card */}
            <div
              className="word-a4-sheet"
              style={{
                width: "100%",
                maxWidth: "794px",
                minHeight: "1123px",
                position: "relative",
                zIndex: 1,
                padding: "3.5rem 4rem",
                boxSizing: "border-box",
                background: pageBgColor,
                border: pageBorder === "none" ? "1px solid #cbd5e1" : pageBorder,
                borderRadius: "4px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04)",
              }}
            >
              {showHeaderFooter && (
                <div style={{ borderBottom: "1px solid #cbd5e1", paddingBottom: "0.5rem", marginBottom: "1.5rem", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
                  {headerText || "Header"}
                </div>
              )}
              <RichTextPlugin
                contentEditable={<ContentEditable style={{ outline: "none", minHeight: "960px" }} />}
                placeholder={
                  <div style={{ position: "absolute", top: "3.5rem", left: "4rem", color: "#94a3b8", pointerEvents: "none" }}>
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
              {showHeaderFooter && (
                <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "0.5rem", marginTop: "1.5rem", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
                  {footerText || "Footer"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MS WORD BOTTOM STATUS BAR */}
        <WordStatusBar
          pageCount={pageCount}
          stats={stats}
          zoomLevel={zoomLevel}
          isFullscreen={isFullscreen}
          setIsFullscreen={setIsFullscreen}
        />
      </LexicalComposer>
    </div>
  );
}
