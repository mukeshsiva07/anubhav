'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Link as LinkIcon,
  Image as ImageIcon,
  Minus,
  Undo2,
  Redo2,
  Mic,
  MicOff,
  Upload,
} from 'lucide-react';

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function TipTapEditor({
  content,
  onChange,
  placeholder = 'Describe the shop-floor symptom, acoustic cue, thermal behavior, or step-by-step resolution...',
}: TipTapEditorProps) {
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-emerald-700 underline underline-offset-2',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-2xl max-w-full my-4 border border-slate-200 shadow-md',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'tiptap-content p-4 sm:p-6 focus:outline-none min-h-[260px] text-sm text-slate-800 leading-relaxed',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  // Keep editor content in sync when loaded from props
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Speech Recognition (Web Speech API) Detection & Setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        setIsSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              transcript += event.results[i][0].transcript + ' ';
            }
          }
          if (transcript.trim() && editor) {
            editor.commands.insertContent(transcript);
          }
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [editor]);

  function toggleDictation() {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  }

  // Handle Image Upload
  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.url) {
        editor.chain().focus().setImage({ src: data.url, alt: file.name }).run();
      } else {
        alert(data.error || 'Failed to upload image');
      }
    } catch {
      alert('Upload failed due to network error');
    } finally {
      setUploadingImage(false);
    }
  }

  function handleSetLink() {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Enter reference URL:', previousUrl);

    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  if (!editor) return null;

  // Word and character counts
  const text = editor.getText();
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  return (
    <div className="border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-soft transition-all focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20">
      {/* TOOLBAR */}
      <div className="p-2 sm:p-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-1 text-slate-600">
        {/* Undo / Redo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 rounded-lg hover:bg-slate-200/70 disabled:opacity-30 transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 rounded-lg hover:bg-slate-200/70 disabled:opacity-30 transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-slate-300 mx-1" />

        {/* Headings */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
            editor.isActive('heading', { level: 1 })
              ? 'bg-emerald-600 text-white'
              : 'hover:bg-slate-200/70'
          }`}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-emerald-600 text-white'
              : 'hover:bg-slate-200/70'
          }`}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-emerald-600 text-white'
              : 'hover:bg-slate-200/70'
          }`}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-slate-300 mx-1" />

        {/* Formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded-lg transition-colors ${
            editor.isActive('bold') ? 'bg-emerald-600 text-white' : 'hover:bg-slate-200/70'
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded-lg transition-colors ${
            editor.isActive('italic') ? 'bg-emerald-600 text-white' : 'hover:bg-slate-200/70'
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded-lg transition-colors ${
            editor.isActive('underline') ? 'bg-emerald-600 text-white' : 'hover:bg-slate-200/70'
          }`}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={`p-1.5 rounded-lg transition-colors ${
            editor.isActive('highlight') ? 'bg-amber-400 text-slate-900' : 'hover:bg-slate-200/70'
          }`}
          title="Highlight Text"
        >
          <Highlighter className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-slate-300 mx-1" />

        {/* Text Alignment */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`p-1.5 rounded-lg transition-colors ${
            editor.isActive({ textAlign: 'left' }) ? 'bg-emerald-600 text-white' : 'hover:bg-slate-200/70'
          }`}
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`p-1.5 rounded-lg transition-colors ${
            editor.isActive({ textAlign: 'center' }) ? 'bg-emerald-600 text-white' : 'hover:bg-slate-200/70'
          }`}
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`p-1.5 rounded-lg transition-colors ${
            editor.isActive({ textAlign: 'right' }) ? 'bg-emerald-600 text-white' : 'hover:bg-slate-200/70'
          }`}
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-slate-300 mx-1" />

        {/* Lists & Quotes */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded-lg transition-colors ${
            editor.isActive('bulletList') ? 'bg-emerald-600 text-white' : 'hover:bg-slate-200/70'
          }`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded-lg transition-colors ${
            editor.isActive('orderedList') ? 'bg-emerald-600 text-white' : 'hover:bg-slate-200/70'
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded-lg transition-colors ${
            editor.isActive('blockquote') ? 'bg-emerald-600 text-white' : 'hover:bg-slate-200/70'
          }`}
          title="Callout Quote"
        >
          <Quote className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-1.5 rounded-lg transition-colors ${
            editor.isActive('codeBlock') ? 'bg-emerald-600 text-white' : 'hover:bg-slate-200/70'
          }`}
          title="G-Code / Diagnostic Block"
        >
          <Code className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-1.5 rounded-lg hover:bg-slate-200/70 transition-colors"
          title="Divider Line"
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-slate-300 mx-1" />

        {/* Link and Image */}
        <button
          type="button"
          onClick={handleSetLink}
          className={`p-1.5 rounded-lg transition-colors ${
            editor.isActive('link') ? 'bg-emerald-600 text-white' : 'hover:bg-slate-200/70'
          }`}
          title="Insert Link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImage}
          className="p-1.5 rounded-lg hover:bg-slate-200/70 transition-colors text-slate-600"
          title="Upload Machine Photo or Diagnostic Image"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageFile}
          className="hidden"
        />

        {/* Speech Dictation Button (Web Speech API) */}
        {isSpeechSupported && (
          <>
            <div className="w-[1px] h-5 bg-slate-300 mx-1" />
            <button
              type="button"
              onClick={toggleDictation}
              className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse shadow-sm'
                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
              }`}
              title={isListening ? 'Stop recording voice' : 'Dictate with Voice (Web Speech)'}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span className="hidden sm:inline">Listening...</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span className="hidden sm:inline">Voice Dictation</span>
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* TIPTAP EDITOR WRAPPER */}
      <EditorContent editor={editor} />

      {/* BOTTOM EDITOR STATUS BAR (Word count, character count, auto-save prompt) */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-4">
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-700 font-sans font-medium text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Rich Text Formatted</span>
        </div>
      </div>
    </div>
  );
}

