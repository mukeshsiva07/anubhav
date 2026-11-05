'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Mark, mergeAttributes } from '@tiptap/core';
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
  Image as ImageIcon,
  Undo2,
  Redo2,
  Mic,
  MicOff,
  Upload,
  FileText,
  FileSpreadsheet,
  File,
  X,
  ExternalLink,
  Edit,
  Trash2,
  Copy,
  Scissors,
  Move,
  ChevronDown,
  AlertCircle,
  Crop,
} from 'lucide-react';
import { PhotoEditorModal } from './PhotoEditorModal';
import { EntryAttachment } from '@/lib/types';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

// Custom Font Size Mark
const FontSize = Mark.create({
  name: 'fontSize',
  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: (attributes) => {
          if (!attributes.size) return {};
          return { style: `font-size: ${attributes.size}` };
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[style*="font-size"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }: any) => {
          return chain().setMark('fontSize', { size }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }: any) => {
          return chain().unsetMark('fontSize').run();
        },
    } as any;
  },
});

// Custom Extended Image supporting free position & wrap attributes
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      width: { default: null },
      height: { default: null },
      'data-wrap': { default: 'inline' },
      'data-x': { default: 0 },
      'data-y': { default: 0 },
      style: {
        default: null,
        renderHTML: (attributes) => {
          const isFree = attributes['data-wrap'] === 'free';
          const x = attributes['data-x'] || 0;
          const y = attributes['data-y'] || 0;
          const w = attributes.width ? `width: ${attributes.width};` : '';

          if (isFree) {
            return {
              style: `position: relative; left: ${x}px; top: ${y}px; display: inline-block; cursor: move; ${w}`,
              class: 'floating-doc-image rounded-2xl border-2 border-emerald-500 shadow-lg',
            };
          }

          return {
            style: w,
            class: 'rounded-2xl max-w-full my-3 border border-slate-200 shadow-md',
          };
        },
      },
    };
  },
});

interface TipTapEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  attachments?: EntryAttachment[];
  onAttachmentsChange?: (attachments: EntryAttachment[]) => void;
}

export function TipTapEditor({
  content,
  onChange,
  placeholder = 'Describe the shop-floor symptom, acoustic cue, thermal behavior, or step-by-step resolution...',
  attachments = [],
  onAttachmentsChange,
}: TipTapEditorProps) {
  // Voice dictation state
  const [dictationLang, setDictationLang] = useState<'en' | 'ta'>('en');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [dictationError, setDictationError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Files & Attachments
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageUploadInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Photo Editor Modal state
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false);
  const [photoEditorTargetUrl, setPhotoEditorTargetUrl] = useState('');

  // Selected image in document for context menu
  const [selectedImgEl, setSelectedImgEl] = useState<HTMLImageElement | null>(null);
  const [imgMenuPos, setImgMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingImg, setIsDraggingImg] = useState(false);
  const dragStartPos = useRef<{ mouseX: number; mouseY: number; imgX: number; imgY: number } | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      CustomImage,
      Placeholder.configure({ placeholder }),
      FontSize as any,
    ],
    content,
    editorProps: {
      attributes: {
        class: 'tiptap-content p-4 sm:p-6 focus:outline-none min-h-[280px] text-sm text-slate-800 leading-relaxed relative',
      },
      handleClickOn: (view, pos, node) => {
        if (node.type.name === 'image') {
          return true;
        }
        return false;
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

  // Handle click on images inside editor to display context toolbar
  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'IMG' && target.closest('.tiptap-content')) {
        const img = target as HTMLImageElement;
        setSelectedImgEl(img);
        const rect = img.getBoundingClientRect();
        setImgMenuPos({ x: rect.left, y: rect.top - 46 });
      } else if (!target.closest('.image-context-menu')) {
        setSelectedImgEl(null);
        setImgMenuPos(null);
      }
    }

    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, []);

  // Free dragging for floating image
  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDraggingImg || !dragStartPos.current || !selectedImgEl) return;
      const dx = e.clientX - dragStartPos.current.mouseX;
      const dy = e.clientY - dragStartPos.current.mouseY;
      const newX = dragStartPos.current.imgX + dx;
      const newY = dragStartPos.current.imgY + dy;

      selectedImgEl.style.position = 'relative';
      selectedImgEl.style.left = `${newX}px`;
      selectedImgEl.style.top = `${newY}px`;
      selectedImgEl.setAttribute('data-x', String(newX));
      selectedImgEl.setAttribute('data-y', String(newY));
      selectedImgEl.setAttribute('data-wrap', 'free');

      if (editor) {
        onChange(editor.getHTML());
      }
    }

    function handleMouseUp() {
      setIsDraggingImg(false);
      dragStartPos.current = null;
    }

    if (isDraggingImg) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingImg, selectedImgEl, editor, onChange]);

  // Voice Dictation: MediaRecorder -> /api/voice/transcribe
  async function startDictation() {
    setDictationError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setDictationError('Voice recording is not supported on this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (audioBlob.size > 0) {
          await transcribeDictation(audioBlob);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setDictationError('Microphone permission denied. Please allow microphone access in browser settings.');
      } else {
        setDictationError('Unable to access microphone.');
      }
    }
  }

  function stopDictation() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  async function transcribeDictation(blob: Blob) {
    setIsTranscribing(true);
    setDictationError(null);

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'dictation.webm');

      const res = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setDictationError(data.error || 'Transcription failed.');
      } else if (data.transcript && editor) {
        // Punctuation clean-up & insert at cursor
        let text = data.transcript.trim();
        if (text && !/[.!?]$/.test(text)) {
          text += '. ';
        } else {
          text += ' ';
        }
        editor.chain().focus().insertContent(text).run();
      } else {
        setDictationError('No speech detected. Please speak clearly into the microphone.');
      }
    } catch {
      setDictationError('Network error while transcribing voice.');
    } finally {
      setIsTranscribing(false);
    }
  }

  // File Upload via Signed URLs
  async function uploadSingleFile(file: File): Promise<EntryAttachment | null> {
    try {
      // 1. Request signed URL from server route
      const signedRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });

      const signedData = await signedRes.json();
      if (!signedRes.ok || !signedData.signedUrl) {
        // Fallback to direct multipart upload
        const fallbackForm = new FormData();
        fallbackForm.append('file', file);
        const fbRes = await fetch('/api/upload', { method: 'POST', body: fallbackForm });
        const fbData = await fbRes.json();
        if (fbRes.ok && fbData.url) {
          return {
            name: file.name,
            url: fbData.url,
            type: file.type || 'application/octet-stream',
            size: file.size,
          };
        }
        throw new Error(signedData.error || 'Failed to create upload URL');
      }

      // 2. Upload file directly from browser to Storage via signed URL
      const uploadRes = await fetch(signedData.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Storage upload failed');
      }

      return {
        name: file.name,
        url: signedData.publicUrl,
        type: file.type || 'application/octet-stream',
        size: file.size,
      };
    } catch (err) {
      console.error('File upload failed:', err);
      return null;
    }
  }

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingFiles(true);
    const newAttachments: EntryAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) {
        alert(`File "${file.name}" exceeds 10 MB limit and was skipped.`);
        continue;
      }

      const uploaded = await uploadSingleFile(file);
      if (uploaded) {
        newAttachments.push(uploaded);
      }
    }

    if (onAttachmentsChange && newAttachments.length > 0) {
      onAttachmentsChange([...attachments, ...newAttachments]);
    }
    setUploadingFiles(false);
  }

  // Insert image directly into editor with Photo Editor dialog
  async function handleInsertImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    const uploaded = await uploadSingleFile(file);
    if (uploaded && uploaded.url) {
      // Prompt user with photo editor before or after placing
      setPhotoEditorTargetUrl(uploaded.url);
      setPhotoEditorOpen(true);
    }
  }

  function handlePhotoEditorSave(editedUrl: string) {
    if (selectedImgEl && editor) {
      selectedImgEl.src = editedUrl;
      onChange(editor.getHTML());
    } else if (editor) {
      editor.chain().focus().setImage({ src: editedUrl, alt: 'Diagnostic Photo' }).run();
    }
    setPhotoEditorOpen(false);
    setSelectedImgEl(null);
  }

  function handleRemoveAttachment(index: number) {
    if (!onAttachmentsChange) return;
    const updated = attachments.filter((_, i) => i !== index);
    onAttachmentsChange(updated);
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getFileIcon(type: string, name: string) {
    if (type.includes('pdf') || name.endsWith('.pdf')) {
      return <FileText className="w-4 h-4 text-red-600" />;
    }
    if (type.includes('sheet') || type.includes('excel') || /\.(xlsx|xls|csv)$/.test(name)) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
    }
    if (type.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4 text-blue-600" />;
    }
    return <File className="w-4 h-4 text-slate-500" />;
  }

  if (!editor) return null;

  const fontSizes = ['12px', '14px', '16px', '18px', '24px', '32px'];

  return (
    <div className="border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-soft transition-all focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 relative">
      {/* TOOLBAR */}
      <div className="p-2 sm:p-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-1.5 text-slate-600">
        {/* Undo / Redo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 rounded-lg hover:bg-slate-200/70 disabled:opacity-30 transition-colors"
          title="Undo"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 rounded-lg hover:bg-slate-200/70 disabled:opacity-30 transition-colors"
          title="Redo"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-slate-300 mx-1" />

        {/* Text Size Dropdown (12, 14, 16, 18, 24, 32 px) */}
        <div className="flex items-center">
          <select
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'default') {
                (editor.commands as any).unsetFontSize?.();
              } else {
                (editor.commands as any).setFontSize?.(val);
              }
            }}
            defaultValue="14px"
            className="px-2 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            title="Text Size"
          >
            <option value="default">Size</option>
            {fontSizes.map((sz) => (
              <option key={sz} value={sz}>
                {sz.replace('px', '')} pt
              </option>
            ))}
          </select>
        </div>

        <div className="w-[1px] h-5 bg-slate-300 mx-1" />

        {/* Headings */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
            editor.isActive('heading', { level: 1 }) ? 'bg-emerald-600 text-white' : 'hover:bg-slate-200/70'
          }`}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
            editor.isActive('heading', { level: 2 }) ? 'bg-emerald-600 text-white' : 'hover:bg-slate-200/70'
          }`}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
            editor.isActive('heading', { level: 3 }) ? 'bg-emerald-600 text-white' : 'hover:bg-slate-200/70'
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
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded-lg transition-colors ${
            editor.isActive('italic') ? 'bg-emerald-600 text-white' : 'hover:bg-slate-200/70'
          }`}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded-lg transition-colors ${
            editor.isActive('underline') ? 'bg-emerald-600 text-white' : 'hover:bg-slate-200/70'
          }`}
          title="Underline"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          className={`p-1.5 rounded-lg transition-colors ${
            editor.isActive('highlight') ? 'bg-amber-400 text-slate-900' : 'hover:bg-slate-200/70'
          }`}
          title="Highlight"
        >
          <Highlighter className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-slate-300 mx-1" />

        {/* Alignment */}
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

        <div className="w-[1px] h-5 bg-slate-300 mx-1" />

        {/* Image insertion (opens file picker -> photo editor) */}
        <button
          type="button"
          onClick={() => imageUploadInputRef.current?.click()}
          className="p-1.5 rounded-lg hover:bg-slate-200/70 transition-colors text-slate-700 flex items-center gap-1 text-xs font-semibold"
          title="Insert Machine Image"
        >
          <ImageIcon className="w-4 h-4 text-emerald-600" />
          <span className="hidden sm:inline">Add Image</span>
        </button>
        <input
          ref={imageUploadInputRef}
          type="file"
          accept="image/*"
          onChange={handleInsertImageFile}
          className="hidden"
        />

        <div className="w-[1px] h-5 bg-slate-300 mx-1" />

        {/* Voice Dictation (English / Tamil) */}
        <div className="flex items-center gap-1">
          <select
            value={dictationLang}
            onChange={(e) => setDictationLang(e.target.value as 'en' | 'ta')}
            disabled={isRecording || isTranscribing}
            className="px-2 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none"
            title="Dictation Language"
          >
            <option value="en">English (en-IN)</option>
            <option value="ta">தமிழ் (ta-IN)</option>
          </select>

          <button
            type="button"
            onClick={isRecording ? stopDictation : startDictation}
            disabled={isTranscribing}
            className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold ${
              isRecording
                ? 'bg-red-600 text-white animate-pulse shadow-sm'
                : isTranscribing
                ? 'bg-amber-100 text-amber-800'
                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
            }`}
            title={isRecording ? 'Click to stop dictation' : 'Speak to dictate text at cursor'}
          >
            {isRecording ? (
              <>
                <MicOff className="w-3.5 h-3.5" />
                <span>Listening...</span>
              </>
            ) : isTranscribing ? (
              <>
                <span className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                <span>Transcribing...</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                <span>Dictate</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dictation error banner */}
      {dictationError && (
        <div className="p-2.5 bg-red-50 border-b border-red-200 text-red-700 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{dictationError}</span>
          </div>
          <button type="button" onClick={() => setDictationError(null)} className="p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* IMAGE CONTEXT POPUP MENU */}
      {selectedImgEl && imgMenuPos && (
        <div
          className="image-context-menu fixed z-50 bg-slate-900 text-white text-xs rounded-xl shadow-2xl p-1.5 flex items-center gap-1 animate-in fade-in duration-100"
          style={{ top: `${Math.max(10, imgMenuPos.y)}px`, left: `${Math.max(10, imgMenuPos.x)}px` }}
        >
          {/* Edit in Photo Editor */}
          <button
            type="button"
            onClick={() => {
              setPhotoEditorTargetUrl(selectedImgEl.src);
              setPhotoEditorOpen(true);
            }}
            className="px-2.5 py-1 rounded-lg hover:bg-slate-800 flex items-center gap-1 text-emerald-400 font-bold"
            title="Crop, rotate, label in photo editor"
          >
            <Crop className="w-3.5 h-3.5" />
            <span>Edit Photo</span>
          </button>

          <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

          {/* Toggle Wrap / Position: Inline vs Free */}
          <button
            type="button"
            onClick={() => {
              const currentWrap = selectedImgEl.getAttribute('data-wrap') || 'inline';
              if (currentWrap === 'inline') {
                selectedImgEl.setAttribute('data-wrap', 'free');
                selectedImgEl.style.position = 'relative';
                selectedImgEl.style.cursor = 'move';
              } else {
                selectedImgEl.setAttribute('data-wrap', 'inline');
                selectedImgEl.style.position = 'static';
                selectedImgEl.style.left = '0px';
                selectedImgEl.style.top = '0px';
                selectedImgEl.style.cursor = 'default';
              }
              onChange(editor.getHTML());
            }}
            className="px-2 py-1 rounded-lg hover:bg-slate-800 text-slate-200"
            title="Toggle between inline and free floating position"
          >
            {selectedImgEl.getAttribute('data-wrap') === 'free' ? 'Set Inline' : 'Free Position'}
          </button>

          {/* Drag handle if free */}
          {selectedImgEl.getAttribute('data-wrap') === 'free' && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsDraggingImg(true);
                const currentX = parseInt(selectedImgEl.getAttribute('data-x') || '0', 10);
                const currentY = parseInt(selectedImgEl.getAttribute('data-y') || '0', 10);
                dragStartPos.current = {
                  mouseX: e.clientX,
                  mouseY: e.clientY,
                  imgX: currentX,
                  imgY: currentY,
                };
              }}
              className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-bold flex items-center gap-1 cursor-grab"
              title="Click and drag to position image"
            >
              <Move className="w-3.5 h-3.5" />
              <span>Drag</span>
            </button>
          )}

          {/* Resize preset: 50%, 100% */}
          <button
            type="button"
            onClick={() => {
              selectedImgEl.style.width = '50%';
              selectedImgEl.setAttribute('width', '50%');
              onChange(editor.getHTML());
            }}
            className="px-2 py-1 rounded-lg hover:bg-slate-800 text-slate-300"
          >
            50%
          </button>
          <button
            type="button"
            onClick={() => {
              selectedImgEl.style.width = '100%';
              selectedImgEl.setAttribute('width', '100%');
              onChange(editor.getHTML());
            }}
            className="px-2 py-1 rounded-lg hover:bg-slate-800 text-slate-300"
          >
            100%
          </button>

          <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

          {/* Remove Image */}
          <button
            type="button"
            onClick={() => {
              selectedImgEl.remove();
              setSelectedImgEl(null);
              setImgMenuPos(null);
              onChange(editor.getHTML());
            }}
            className="p-1 rounded-lg hover:bg-red-900/60 text-red-400"
            title="Delete Image"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TIPTAP EDITOR WRAPPER */}
      <EditorContent editor={editor} />

      {/* ATTACHMENTS & DRAG-AND-DROP SECTION */}
      <div
        className={`p-4 bg-slate-50 border-t border-slate-200 transition-colors ${
          isDraggingOver ? 'bg-emerald-50 border-emerald-400' : ''
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingOver(false);
          handleFilesSelected(e.dataTransfer.files);
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h4 className="text-xs font-bold text-slate-800">
              Attached Documents &amp; Reference Files ({attachments.length})
            </h4>
            <p className="text-[11px] text-slate-400">
              PDF, DOCX, XLSX, PPTX, TXT, PNG, JPG (Max 10 MB per file)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFiles}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>{uploadingFiles ? 'Uploading...' : 'Add Files'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.xlsx,.pptx,.txt,.png,.jpg,.jpeg,.webp"
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />
          </div>
        </div>

        {/* Attachment List */}
        {attachments.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-xl bg-slate-50 border border-slate-100 shrink-0">
                    {getFileIcon(att.type, att.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate" title={att.name}>
                      {att.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {formatFileSize(att.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-slate-100"
                    title="Open / Download"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(idx)}
                    className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                    title="Remove"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PHOTO EDITOR DIALOG MODAL */}
      {photoEditorOpen && (
        <PhotoEditorModal
          isOpen={photoEditorOpen}
          imageUrl={photoEditorTargetUrl}
          onClose={() => setPhotoEditorOpen(false)}
          onSave={handlePhotoEditorSave}
        />
      )}
    </div>
  );
}
