import React, { useRef, useState } from "react";
import { UploadCloud, FileText, Image as ImageIcon, X, ExternalLink, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import api from "../api/axios.js";
import { assetUrl, formatBytes, isImageFile } from "../utils/assetUrl.js";
import { getErrorMessage } from "../utils/apiError.js";

const DEFAULT_ACCEPT = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];

/**
 * Reusable drag-and-drop file upload module.
 *
 * Controlled component: `value` is the file metadata object
 * ({ url, originalName, mimeType, size, pending? }) or null, and `onChange`
 * receives the new metadata (or null when removed). The upload itself is
 * posted to `uploadUrl` as multipart field "file" and is expected to respond
 * with `{ file: {...} }`.
 *
 * `pending` marks a file that has been uploaded but not yet saved to the
 * profile — if the user replaces/removes it we ask the server to discard it.
 */
const FileUploader = ({
  value,
  onChange,
  uploadUrl = "/profile/certificate-file",
  discardUrl = "/profile/certificate-file",
  accept = DEFAULT_ACCEPT,
  maxSizeMB = 5,
  hint,
}) => {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(null); // null = idle, 0-100 = uploading
  const [error, setError] = useState("");

  const uploading = progress !== null;
  const acceptLabel = accept.map((a) => a.replace(".", "").toUpperCase()).filter((v, i, arr) => arr.indexOf(v) === i).join(", ");

  const discardIfPending = (file) => {
    if (file?.pending && file.url) {
      api.delete(discardUrl, { params: { url: file.url } }).catch(() => {});
    }
  };

  const validate = (file) => {
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (!accept.includes(ext)) return `Unsupported file type. Allowed: ${acceptLabel}.`;
    if (file.size > maxSizeMB * 1024 * 1024) return `File is too large (${formatBytes(file.size)}). Max ${maxSizeMB}MB.`;
    if (file.size === 0) return "That file is empty.";
    return "";
  };

  const upload = async (file) => {
    if (!file || uploading) return;
    setError("");
    const problem = validate(file);
    if (problem) {
      setError(problem);
      return;
    }

    const body = new FormData();
    body.append("file", file);
    setProgress(0);
    try {
      const { data } = await api.post(uploadUrl, body, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
        },
      });
      discardIfPending(value); // replaced an unsaved upload
      onChange({ ...data.file, pending: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = ""; // allow re-selecting the same file
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    upload(e.dataTransfer.files?.[0]);
  };

  const remove = () => {
    discardIfPending(value);
    setError("");
    onChange(null);
  };

  const openPicker = () => !uploading && inputRef.current?.click();

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      accept={accept.join(",")}
      onChange={(e) => upload(e.target.files?.[0])}
      style={{ display: "none" }}
    />
  );

  return (
    <div>
      {hiddenInput}

      {value?.url && !uploading ? (
        <div className="file-card">
          <div className="file-card-icon">
            {isImageFile(value) ? (
              <img src={assetUrl(value.url)} alt="" />
            ) : (
              <FileText size={22} />
            )}
          </div>
          <div className="file-card-body">
            <div className="file-card-name" title={value.originalName}>{value.originalName || "Certificate"}</div>
            <div className="file-card-meta">
              {isImageFile(value) ? <ImageIcon size={12} /> : <FileText size={12} />}
              {(value.mimeType || "").split("/")[1]?.toUpperCase() || "FILE"}
              {value.size ? ` · ${formatBytes(value.size)}` : ""}
              {value.pending ? (
                <span className="file-card-flag"><AlertCircle size={12} /> Save profile to keep this file</span>
              ) : (
                <span className="file-card-flag ok"><CheckCircle2 size={12} /> Saved</span>
              )}
            </div>
          </div>
          <div className="file-card-actions">
            <a href={assetUrl(value.url)} target="_blank" rel="noreferrer" className="icon-btn" title="View file" aria-label="View file">
              <ExternalLink size={15} />
            </a>
            <button type="button" className="icon-btn" onClick={openPicker} title="Replace file" aria-label="Replace file">
              <RefreshCw size={15} />
            </button>
            <button type="button" className="icon-btn danger" onClick={remove} title="Remove file" aria-label="Remove file">
              <X size={15} />
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`dropzone ${dragOver ? "dragover" : ""} ${uploading ? "uploading" : ""}`}
          role="button"
          tabIndex={0}
          aria-label="Upload certificate file"
          onClick={openPicker}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openPicker())}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <div className="dropzone-icon"><UploadCloud size={22} /></div>
          {uploading ? (
            <>
              <div className="dropzone-title">Uploading… {progress}%</div>
              <div className="upload-track"><div className="upload-fill" style={{ width: `${progress}%` }} /></div>
            </>
          ) : (
            <>
              <div className="dropzone-title">
                Drag & drop your file here, or <span className="gradient-text">browse</span>
              </div>
              <div className="dropzone-hint">{hint || `${acceptLabel} · up to ${maxSizeMB}MB`}</div>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="hint" style={{ marginTop: 8, fontSize: 12, color: "var(--danger)", display: "flex", gap: 4, alignItems: "center" }}>
          <AlertCircle size={13} /> {error}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
