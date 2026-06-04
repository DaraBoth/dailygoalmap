import React, { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Markdown } from "tiptap-markdown";
import { common, createLowlight } from "lowlight";
import {
  Bold,
  Italic,
  Strikethrough,
  Code as CodeIcon,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadTaskImage } from "./taskAttachments";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MarkdownEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
  contentClassName?: string;
  minHeight?: string;
}

const lowlight = createLowlight(common);

type ToolbarBtnProps = {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
};

const ToolbarBtn: React.FC<ToolbarBtnProps> = ({ onClick, active, disabled, title, children }) => (
  <button
    type="button"
    onClick={(e) => {
      e.preventDefault();
      onClick();
    }}
    onMouseDown={(e) => e.preventDefault()}
    disabled={disabled}
    title={title}
    aria-label={title}
    className={cn(
      "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
      active && "bg-accent text-foreground",
      disabled && "opacity-50 cursor-not-allowed"
    )}
  >
    {children}
  </button>
);

const Divider: React.FC = () => <div className="mx-1 h-5 w-px bg-border" aria-hidden />;

const Toolbar: React.FC<{
  editor: Editor;
  onPickImage: () => void;
  isUploadingImage: boolean;
}> = ({ editor, onPickImage, isUploadingImage }) => {
  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  return (
    <div className="flex items-center gap-0.5 border-b border-border/60 bg-muted/30 px-2 py-1.5 rounded-t-md overflow-x-auto no-scrollbar md:flex-wrap md:overflow-visible whitespace-nowrap">
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarBtn>
      <Divider />
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive("code")}
        title="Inline code"
      >
        <CodeIcon className="h-4 w-4" />
      </ToolbarBtn>
      <Divider />
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Bullet list"
      >
        <List className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Numbered list"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive("codeBlock")}
        title="Code block"
      >
        <Code2 className="h-4 w-4" />
      </ToolbarBtn>
      <Divider />
      <ToolbarBtn onClick={setLink} active={editor.isActive("link")} title="Link">
        <LinkIcon className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn onClick={onPickImage} title="Image" disabled={isUploadingImage}>
        {isUploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
      </ToolbarBtn>
    </div>
  );
};

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = "Write something, or paste an image…",
  className,
  contentClassName,
  minHeight = "360px",
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const isUpdatingFromProp = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({ inline: false, allowBase64: false, HTMLAttributes: { class: "rounded-lg max-w-full" } }),
      CodeBlockLowlight.configure({ lowlight }),
      Markdown.configure({
        html: false,
        breaks: true,
        linkify: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: value || "",
    onUpdate({ editor }) {
      if (isUpdatingFromProp.current) return;
      const md = (editor.storage as any).markdown?.getMarkdown?.() ?? editor.getText();
      onChange(md);
    },
    editorProps: {
      attributes: {
        class: "tiptap-content focus:outline-none",
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              void uploadAndInsert(file);
              event.preventDefault();
              return true;
            }
          }
        }
        return false;
      },
      handleDrop: (_view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const imageFile = Array.from(files).find((f) => f.type.startsWith("image/"));
        if (imageFile) {
          void uploadAndInsert(imageFile);
          event.preventDefault();
          return true;
        }
        return false;
      },
    },
  });

  // Keep the editor in sync if the external `value` changes (e.g. when the Detail view
  // is re-opened with a different task).
  useEffect(() => {
    if (!editor) return;
    const currentMd = (editor.storage as any).markdown?.getMarkdown?.() ?? "";
    if (value === currentMd) return;
    isUpdatingFromProp.current = true;
    editor.commands.setContent(value || "", { emitUpdate: false });
    isUpdatingFromProp.current = false;
  }, [editor, value]);

  const uploadAndInsert = useCallback(
    async (file: File) => {
      if (!editor) return;
      try {
        setIsUploadingImage(true);
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id;
        if (!userId) {
          toast({ title: "Sign in required", description: "Please sign in to upload images.", variant: "destructive" });
          return;
        }
        const url = await uploadTaskImage(file, userId);
        editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      } catch (error: any) {
        console.error("Image upload failed:", error);
        toast({
          title: "Upload failed",
          description: error?.message || "Could not upload image. Make sure the 'task-attachments' bucket exists.",
          variant: "destructive",
        });
      } finally {
        setIsUploadingImage(false);
      }
    },
    [editor, toast]
  );

  const onPickImage = () => fileInputRef.current?.click();

  const onFileChosen = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void uploadAndInsert(file);
    }
    event.target.value = "";
  };

  if (!editor) {
    return (
      <div
        className={cn(
          "rounded-md border border-border/60 bg-background/60 animate-pulse",
          className
        )}
        style={{ minHeight }}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-md border border-border/60 bg-background/60 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0 overflow-hidden",
        className
      )}
    >
      <Toolbar editor={editor} onPickImage={onPickImage} isUploadingImage={isUploadingImage} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChosen}
      />
      <div
        className={cn(
          "prose prose-sm dark:prose-invert max-w-none px-4 py-3 leading-relaxed text-[15px] focus-within:outline-none",
          contentClassName
        )}
        style={{ minHeight }}
        onClick={() => editor.chain().focus().run()}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default MarkdownEditor;
