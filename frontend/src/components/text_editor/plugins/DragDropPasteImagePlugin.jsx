import { useCallback, useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $insertNodes,
  $getNodeByKey,
  PASTE_COMMAND,
  DROP_COMMAND,
  COMMAND_PRIORITY_HIGH,
} from "lexical";
import { ImageNode, $createImageNode } from "../nodes/ImageNode.jsx";

export function DragDropPasteImagePlugin() {
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
