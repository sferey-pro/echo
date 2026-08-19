import Prism from "prismjs";
import "prismjs/components/prism-json";
import "prismjs/themes/prism-tomorrow.css"; // Un thème sombre élégant
import { useState } from "react";
import EditorModule from "react-simple-code-editor";

// Gérer l'export ESM/CJS de Vite/Bun
const EditorObj = (EditorModule as any).default || EditorModule;

const Editor = (props: any) => {
  return <EditorObj {...props} />;
};

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
      className={`relative w-full h-full bg-[#1d1f21] rounded-xl overflow-hidden transition-all duration-200 ${
        isFocused ? "ring-2 ring-primary" : "ring-1 ring-border"
      } ${className}`}
    >
      <div className="absolute top-0 left-0 w-full h-full overflow-auto custom-scrollbar">
        <Editor
          value={value}
          onValueChange={onChange}
          highlight={(code: string) =>
            Prism.highlight(code, Prism.languages.json!, "json")
          }
          padding={16}
          disabled={readOnly}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            fontFamily:
              '"Fira Code", "JetBrains Mono", "SF Mono", Consolas, monospace',
            fontSize: 14,
            minHeight: "100%",
            color: "#c5c8c6", // Base color pour le texte
          }}
          className="min-h-full"
          textareaClassName="focus:outline-none"
        />
      </div>
    </div>
  );
}
