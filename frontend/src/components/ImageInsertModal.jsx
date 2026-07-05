import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuX, LuLink, LuUpload } from "react-icons/lu";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export default function ImageInsertModal({ open, onClose, onInsert, labels }) {
  const [mode, setMode] = useState("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setMode("url");
    setUrl("");
    setFile(null);
    setPreview("");
    setError("");
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }, [open]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  if (!open) return null;

  const handleFileChange = (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (!picked.type.startsWith("image/")) {
      setError(labels.imageFileTypeError);
      return;
    }
    if (picked.size > MAX_IMAGE_BYTES) {
      setError(labels.imageFileSizeError);
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
    setError("");
  };

  const handleSubmit = async () => {
    setError("");
    if (mode === "url") {
      const trimmed = url.trim();
      if (!trimmed) {
        setError(labels.imageUrlRequired);
        return;
      }
      onInsert(trimmed);
      onClose();
      return;
    }
    if (!file) {
      setError(labels.imageFileRequired);
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      onInsert(dataUrl);
      onClose();
    } catch {
      setError(labels.imageReadError);
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return createPortal(
    <div className="modal-overlay modal-overlay-top" onClick={onClose}>
      <div className="modal image-insert-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{labels.imageInsertTitle}</h3>
          <button type="button" className="btn-icon" onClick={onClose} aria-label={labels.cancel}>
            <LuX />
          </button>
        </div>

        <div className="modal-body">
          <div className="image-insert-tabs">
            <button
              type="button"
              className={`image-insert-tab ${mode === "url" ? "active" : ""}`}
              onClick={() => { setMode("url"); setError(""); }}
            >
              <LuLink /> {labels.imageFromUrl}
            </button>
            <button
              type="button"
              className={`image-insert-tab ${mode === "device" ? "active" : ""}`}
              onClick={() => { setMode("device"); setError(""); }}
            >
              <LuUpload /> {labels.imageFromDevice}
            </button>
          </div>

          {mode === "url" ? (
            <div className="form-group">
              <label htmlFor="image-url">{labels.imageUrlLabel}</label>
              <input
                id="image-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="https://..."
                autoFocus
              />
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="image-file">{labels.imageFileLabel}</label>
              <input
                ref={fileRef}
                id="image-file"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                onChange={handleFileChange}
              />
              {preview && (
                <div className="image-insert-preview">
                  <img src={preview} alt="" />
                </div>
              )}
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            {labels.cancel}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={busy}>
            {busy ? labels.inserting : labels.insert}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("read failed"));
    };
    reader.onerror = () => reject(reader.error || new Error("read failed"));
    reader.readAsDataURL(file);
  });
}
