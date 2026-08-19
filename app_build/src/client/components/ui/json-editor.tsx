import Editor from "@monaco-editor/react";
import { useState } from "react";

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  className?: string;
}

export function JsonEditor({
  value,
  onChange,
  readOnly = false,
  className = "",
}: JsonEditorProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      className={`relative w-full h-full bg-[#1e1e1e] rounded-xl overflow-hidden transition-all duration-200 ${
        isFocused ? "ring-2 ring-primary" : "ring-1 ring-border"
      } ${className}`}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        // Only blur if the focus is completely outside the editor container
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsFocused(false);
        }
      }}
    >
      <div className="absolute top-0 left-0 w-full h-full py-2">
        <Editor
          height="100%"
          defaultLanguage="json"
          value={value}
          onChange={(val) => onChange(val || "")}
          theme="vs-dark"
          loading={
            <div className="flex w-full h-full items-center justify-center text-xs text-slate-500">
              Chargement de l'éditeur...
            </div>
          }
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily:
              '"Fira Code", "JetBrains Mono", "SF Mono", Consolas, monospace',
            wordWrap: "on",
            formatOnPaste: true,
            formatOnType: true,
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            folding: true,
            renderLineHighlight: "all",
            padding: { top: 8, bottom: 8 },
            tabSize: 2,
            scrollbar: {
              vertical: "visible",
              horizontal: "hidden",
              verticalScrollbarSize: 8,
              useShadows: false,
            },
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
          }}
        />
      </div>
    </div>
  );
}
