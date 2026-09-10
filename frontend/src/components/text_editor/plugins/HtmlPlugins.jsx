import { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { $getRoot } from "lexical";

export function HtmlInitialLoaderPlugin({ initialHtml }) {
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

export function HtmlOnChangePlugin({ onChange, setStats, setPageCount }) {
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
