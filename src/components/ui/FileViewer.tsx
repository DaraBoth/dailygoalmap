import React, { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Copy,
  File,
  FileText,
  ImageIcon,
  FileCode,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

// ─── Type helpers ──────────────────────────────────────────────────────────────

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
  bmp: "image/bmp", ico: "image/x-icon", avif: "image/avif",
  pdf: "application/pdf",
  txt: "text/plain", md: "text/markdown", csv: "text/csv",
  json: "application/json", xml: "text/xml",
  js: "text/javascript", ts: "text/typescript",
  html: "text/html", css: "text/css", yaml: "text/yaml", yml: "text/yaml",
};

function resolveMime(url: string, provided?: string): string {
  if (provided) return provided;
  const ext = url.split("?")[0].toLowerCase().split(".").pop() ?? "";
  return EXT_TO_MIME[ext] ?? "application/octet-stream";
}

type ViewerType = "image" | "pdf" | "text" | "unknown";

function viewerTypeOf(mime: string): ViewerType {
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("text/") || mime === "application/json" || mime === "application/xml")
    return "text";
  return "unknown";
}

function resolveFileName(url: string, provided?: string): string {
  if (provided) return provided;
  return url.split("?")[0].split("/").pop() || "file";
}

// ─── Image viewer ──────────────────────────────────────────────────────────────

const CHECKERBOARD: React.CSSProperties = {
  backgroundImage: `
    linear-gradient(45deg, #e0e0e0 25%, transparent 25%),
    linear-gradient(-45deg, #e0e0e0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e0e0e0 75%),
    linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)`,
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
};

const ImageViewer: React.FC<{ url: string }> = ({ url }) => {
  const [zoom, setZoom] = useState(1);
  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const bump = (delta: number) =>
    setZoom((z) => Math.min(8, Math.max(0.1, parseFloat((z + delta).toFixed(2)))));

  return (
    <div className="relative w-full h-full flex flex-col dark:bg-muted/20" style={CHECKERBOARD}>
      {/* Zoom controls */}
      <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-full border border-border/60 shadow-lg px-3 py-1.5">
        <Button
          variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => bump(-0.25)} title="Zoom out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs w-12 text-center tabular-nums select-none">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => bump(0.25)} title="Zoom in"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-4 bg-border/60 mx-1" />
        <Button
          variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => setZoom(1)} title="Reset zoom"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Image area */}
      <div className="flex-1 overflow-auto flex items-center justify-center min-h-0 p-6">
        {!loaded && !error && (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        )}
        {error && (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-8 w-8" />
            <span className="text-sm">Failed to load image</span>
          </div>
        )}
        <div
          style={{
            display: loaded ? "flex" : "none",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            width: zoom > 1 && naturalW ? naturalW * zoom : undefined,
            height: zoom > 1 && naturalH ? naturalH * zoom : undefined,
          }}
        >
          <img
            src={url}
            alt="Preview"
            draggable={false}
            onLoad={(e) => {
              const img = e.currentTarget;
              setNaturalW(img.naturalWidth);
              setNaturalH(img.naturalHeight);
              setLoaded(true);
            }}
            onError={() => setError(true)}
            style={{
              display: "block",
              width: zoom > 1 && naturalW ? naturalW * zoom : undefined,
              height: zoom > 1 && naturalH ? naturalH * zoom : undefined,
              maxWidth: zoom <= 1 ? "100%" : "none",
              maxHeight: zoom <= 1 ? "100%" : "none",
            }}
            className="rounded shadow-lg select-none"
          />
        </div>
      </div>
    </div>
  );
};

// ─── PDF viewer ────────────────────────────────────────────────────────────────

const PdfViewer: React.FC<{ url: string }> = ({ url }) => {
  const [failed, setFailed] = useState(false);

  return (
    <div className="w-full h-full flex flex-col">
      {failed ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm">Your browser cannot display this PDF inline.</p>
          <Button variant="outline" size="sm" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Open in new tab
            </a>
          </Button>
        </div>
      ) : (
        <iframe
          src={url}
          className="flex-1 w-full border-0"
          title="PDF viewer"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
};

// ─── Text viewer ───────────────────────────────────────────────────────────────

const TextViewer: React.FC<{ url: string; mimeType: string }> = ({ url, mimeType }) => {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isJson = mimeType === "application/json" || url.split("?")[0].endsWith(".json");

  useEffect(() => {
    setLoading(true);
    setError(false);
    setContent(null);
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.text();
      })
      .then((text) => {
        if (isJson) {
          try { setContent(JSON.stringify(JSON.parse(text), null, 2)); }
          catch { setContent(text); }
        } else {
          setContent(text);
        }
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [url]);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    toast({ title: "Copied", description: "File content copied to clipboard." });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 h-full text-muted-foreground">
        <AlertCircle className="h-8 w-8" />
        <p className="text-sm">Cannot load file preview.</p>
        <Button variant="outline" size="sm" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Open in new tab
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col bg-muted/20">
      <div className="absolute top-3 right-3 z-10">
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleCopy}>
          <Copy className="h-3 w-3" />
          Copy
        </Button>
      </div>
      <pre className="flex-1 overflow-auto p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words text-foreground">
        {content}
      </pre>
    </div>
  );
};

// ─── Unknown file ──────────────────────────────────────────────────────────────

const UnknownViewer: React.FC<{ url: string; fileName: string }> = ({ url, fileName }) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center text-muted-foreground h-full">
    <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center">
      <File className="h-7 w-7 text-muted-foreground/60" />
    </div>
    <div>
      <p className="text-sm font-medium text-foreground">{fileName}</p>
      <p className="text-xs mt-1">Preview not available for this file type.</p>
    </div>
    <Button variant="outline" size="sm" asChild>
      <a href={url} target="_blank" rel="noopener noreferrer" download={fileName}>
        <Download className="h-3.5 w-3.5 mr-1.5" />
        Download
      </a>
    </Button>
  </div>
);

// ─── File type icon ────────────────────────────────────────────────────────────

function FileTypeIcon({ type }: { type: ViewerType }) {
  if (type === "image") return <ImageIcon className="h-4 w-4 shrink-0 text-sky-500" />;
  if (type === "pdf")   return <FileText className="h-4 w-4 shrink-0 text-red-500" />;
  if (type === "text")  return <FileCode className="h-4 w-4 shrink-0 text-green-500" />;
  return <File className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

// ─── Public API ────────────────────────────────────────────────────────────────

export interface FileViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  fileName?: string;
  mimeType?: string;
}

const FileViewer: React.FC<FileViewerProps> = ({
  open,
  onOpenChange,
  url,
  fileName,
  mimeType,
}) => {
  const mime = resolveMime(url, mimeType);
  const type = viewerTypeOf(mime);
  const name = resolveFileName(url, fileName);
  const ext = name.split(".").pop()?.toUpperCase() ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/60 shrink-0 bg-card/80 backdrop-blur-sm pr-12">
          <FileTypeIcon type={type} />
          <span className="text-sm font-medium truncate flex-1 min-w-0">{name}</span>
          {ext && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
              {ext}
            </span>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" title="Open in new tab" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" title="Download" asChild>
            <a href={url} download={name} target="_blank" rel="noopener noreferrer">
              <Download className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {type === "image"   && <ImageViewer url={url} />}
          {type === "pdf"     && <PdfViewer url={url} />}
          {type === "text"    && <TextViewer url={url} mimeType={mime} />}
          {type === "unknown" && <UnknownViewer url={url} fileName={name} />}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileViewer;
