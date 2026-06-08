import React, { createContext, useContext, useState } from "react";
import FileViewer from "@/components/ui/FileViewer";

export interface FileViewerFile {
  url: string;
  fileName?: string;
  mimeType?: string;
}

interface FileViewerContextValue {
  openFile: (file: FileViewerFile) => void;
}

const FileViewerContext = createContext<FileViewerContextValue>({
  openFile: () => {},
});

export function FileViewerProvider({ children }: { children: React.ReactNode }) {
  const [file, setFile] = useState<FileViewerFile | null>(null);

  return (
    <FileViewerContext.Provider value={{ openFile: (f) => setFile(f) }}>
      {children}
      {file && (
        <FileViewer
          open
          onOpenChange={(open) => { if (!open) setFile(null); }}
          url={file.url}
          fileName={file.fileName}
          mimeType={file.mimeType}
        />
      )}
    </FileViewerContext.Provider>
  );
}

export function useFileViewer(): FileViewerContextValue {
  return useContext(FileViewerContext);
}
