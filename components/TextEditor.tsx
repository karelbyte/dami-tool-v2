'use client';

import { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { FiBold, FiItalic, FiUnderline, FiImage, FiSave, FiRotateCcw, FiRotateCw, FiAlignLeft, FiAlignCenter, FiAlignRight } from 'react-icons/fi';
import AddTranslationModal from './AddTranslationModal';

interface TextEditorProps {
  initialContent?: string;
  onSave?: (content: string) => void;
  projectName?: string;
  onBack?: () => void;
  projectId?: string;
  onTranslationSaved?: () => void;
}

export interface TextEditorHandle {
  highlightText: (text: string) => void;
  clearHighlight: () => void;
  replaceText: (original: string, replacement: string) => void;
}

function findTextNodesInEditor(editor: HTMLDivElement, searchText: string): { node: Text; start: number; take: number }[] {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
  const textNodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    textNodes.push(node as Text);
  }

  const normalizedSearch = searchText.trim().replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ');
  const searchRegex = new RegExp(normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s*'), '');

  const fullRaw = textNodes.map((n) => n.textContent || '').join('');
  const match = searchRegex.exec(fullRaw);
  if (!match) return [];
  const idx = match.index;

  const result: { node: Text; start: number; take: number }[] = [];
  let offset = 0;
  let remaining = match[0].length;
  let started = false;

  for (const tn of textNodes) {
    const len = (tn.textContent || '').length;
    const nodeEnd = offset + len;

    if (!started && nodeEnd > idx) {
      started = true;
      const start = idx - offset;
      const take = Math.min(len - start, remaining);
      result.push({ node: tn, start, take });
      remaining -= take;
    } else if (started && remaining > 0) {
      const take = Math.min(len, remaining);
      result.push({ node: tn, start: 0, take });
      remaining -= take;
    }

    offset += len;
    if (remaining <= 0) break;
  }

  return result;
}

const TextEditor = forwardRef<TextEditorHandle, TextEditorProps>(function TextEditor(
  { initialContent = '', onSave, projectName, onBack, projectId, onTranslationSaved },
  ref
) {
  const editorRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [fontSize, setFontSize] = useState('16');
  const [color, setColor] = useState('#ffffff');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [alignment, setAlignment] = useState('left');
  const [resizingImg, setResizingImg] = useState<HTMLImageElement | null>(null);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [startHeight, setStartHeight] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [showTranslationBtn, setShowTranslationBtn] = useState(false);
  const [translationBtnPos, setTranslationBtnPos] = useState({ x: 0, y: 0 });
  const [showTranslationModal, setShowTranslationModal] = useState(false);

  const savedHtmlRef = useRef<string | null>(null);

  useImperativeHandle(ref, () => ({
    highlightText(text: string) {
      if (!editorRef.current) return;
      clearHighlightInternal();
      const nodes = findTextNodesInEditor(editorRef.current, text);
      if (!nodes.length) return;

      for (const { node, start, take } of nodes) {
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, start + take);
        const mark = document.createElement('mark');
        mark.dataset.translationHighlight = 'true';
        mark.style.backgroundColor = '#facc15';
        mark.style.color = '#000';
        mark.style.borderRadius = '2px';
        range.surroundContents(mark);
      }
    },
    clearHighlight() {
      clearHighlightInternal();
    },
    replaceText(original: string, replacement: string) {
      if (!editorRef.current) return;
      clearHighlightInternal();

      if (savedHtmlRef.current === null) {
        savedHtmlRef.current = editorRef.current.innerHTML;
        const nodes = findTextNodesInEditor(editorRef.current, original);
        if (!nodes.length) { savedHtmlRef.current = null; return; }
        for (let i = nodes.length - 1; i >= 0; i--) {
          const { node, start, take } = nodes[i];
          const range = document.createRange();
          range.setStart(node, start);
          range.setEnd(node, start + take);
          range.deleteContents();
          if (i === 0) range.insertNode(document.createTextNode(replacement));
        }
        editorRef.current.normalize();
      } else {
        editorRef.current.innerHTML = savedHtmlRef.current;
        savedHtmlRef.current = null;
        attachImageListeners();
      }
    },
  }));

  const clearHighlightInternal = () => {
    if (!editorRef.current) return;
    const marks = editorRef.current.querySelectorAll('mark[data-translation-highlight]');
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (parent) {
        while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
        parent.removeChild(mark);
      }
    });
    editorRef.current.normalize();
  };

  useEffect(() => {
    if (editorRef.current && initialContent) {
      editorRef.current.innerHTML = initialContent;
      setLastSavedContent(initialContent);
      attachImageListeners();
    }
    const savedColor = localStorage.getItem('lastSelectedColor');
    if (savedColor) setColor(savedColor);
  }, [initialContent]);

  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (hasUnsavedChanges && editorRef.current) performAutoSave();
    }, 60000);
    return () => clearInterval(autoSaveInterval);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingImg) return;
      const aspectRatio = startWidth / startHeight;
      const newWidth = Math.max(50, startWidth + (e.clientX - startX));
      const newHeight = newWidth / aspectRatio;
      resizingImg.style.width = newWidth + 'px';
      resizingImg.style.height = newHeight + 'px';
    };
    const handleMouseUp = () => setResizingImg(null);
    if (resizingImg) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingImg, startX, startY, startWidth, startHeight]);

  const attachImageListeners = () => {
    editorRef.current?.querySelectorAll('img').forEach((img) => {
      img.addEventListener('mousedown', handleImageMouseDown);
    });
  };

  const handleImageMouseDown = (e: MouseEvent) => {
    const img = e.target as HTMLImageElement;
    setResizingImg(img);
    setStartX(e.clientX);
    setStartY(e.clientY);
    setStartWidth(img.offsetWidth);
    setStartHeight(img.offsetHeight);
  };

  const applyStyle = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateButtonStates();
  };

  const updateButtonStates = () => {
    setIsBold(document.queryCommandState('bold'));
    setIsItalic(document.queryCommandState('italic'));
    setIsUnderline(document.queryCommandState('underline'));
    if (document.queryCommandState('justifyLeft')) setAlignment('left');
    else if (document.queryCommandState('justifyCenter')) setAlignment('center');
    else if (document.queryCommandState('justifyRight')) setAlignment('right');

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      let node = range.commonAncestorContainer;
      if (node.nodeType === 3) node = node.parentNode as Node;
      const element = node as HTMLElement;
      if (element) {
        const size = window.getComputedStyle(element).fontSize.replace('px', '');
        if (size) setFontSize(size);
      }
    }
  };

  const handleEditorClick = () => setTimeout(updateButtonStates, 0);

  const handleMouseUp = () => {
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (text && text.length > 0) {
        const range = selection!.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelectedText(text);
        setTranslationBtnPos({ x: rect.left + rect.width / 2, y: rect.top - 10 });
        setShowTranslationBtn(true);
      } else {
        setShowTranslationBtn(false);
        setSelectedText('');
      }
    }, 10);
  };

  const handleEditorKeyUp = () => {
    updateButtonStates();
    checkForChanges();
  };

  const checkForChanges = () => {
    const currentContent = editorRef.current?.innerHTML || '';
    if (currentContent !== lastSavedContent) setHasUnsavedChanges(true);
  };

  const performAutoSave = async () => {
    if (!editorRef.current) return;
    setIsSaving(true);
    const content = editorRef.current.innerHTML;
    if (onSave) {
      await onSave(content);
      setLastSavedContent(content);
      setHasUnsavedChanges(false);
    }
    setIsSaving(false);
  };

  const insertImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          const img = document.createElement('img');
          img.src = base64;
          img.style.maxWidth = '100%';
          img.style.height = 'auto';
          img.style.cursor = 'move';
          img.style.display = 'block';
          img.style.margin = '10px 0';
          img.addEventListener('mousedown', handleImageMouseDown);
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            selection.getRangeAt(0).insertNode(img);
          }
          editorRef.current?.focus();
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleSave = async () => {
    if (editorRef.current && onSave) {
      setIsSaving(true);
      const content = editorRef.current.innerHTML;
      await onSave(content);
      setLastSavedContent(content);
      setHasUnsavedChanges(false);
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-900">
      <div className="bg-slate-800 p-4 border-b border-slate-700 flex flex-wrap gap-2 items-center justify-between flex-shrink-0">
        {projectName && <span className="text-white font-semibold text-sm mr-4">{projectName}</span>}
        <div className="flex flex-wrap gap-2 items-center flex-1">
          <button onClick={() => applyStyle('undo')} className="px-3 py-1 bg-slate-700 border border-slate-600 rounded hover:bg-slate-600 text-white transition" title="Deshacer"><FiRotateCcw size={16} /></button>
          <button onClick={() => applyStyle('redo')} className="px-3 py-1 bg-slate-700 border border-slate-600 rounded hover:bg-slate-600 text-white transition" title="Rehacer"><FiRotateCw size={16} /></button>
          <div className="border-l border-slate-600 mx-2" />
          <button onClick={() => applyStyle('bold')} className={`px-3 py-1 border border-slate-600 rounded font-bold transition ${isBold ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-700 hover:bg-slate-600 text-white'}`} title="Negrita"><FiBold size={16} /></button>
          <button onClick={() => applyStyle('italic')} className={`px-3 py-1 border border-slate-600 rounded italic transition ${isItalic ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-700 hover:bg-slate-600 text-white'}`} title="Itálica"><FiItalic size={16} /></button>
          <button onClick={() => applyStyle('underline')} className={`px-3 py-1 border border-slate-600 rounded underline transition ${isUnderline ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-700 hover:bg-slate-600 text-white'}`} title="Subrayado"><FiUnderline size={16} /></button>
          <div className="border-l border-slate-600 mx-2" />
          <button onClick={() => applyStyle('justifyLeft')} className={`px-3 py-1 border border-slate-600 rounded transition ${alignment === 'left' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}><FiAlignLeft size={16} /></button>
          <button onClick={() => applyStyle('justifyCenter')} className={`px-3 py-1 border border-slate-600 rounded transition ${alignment === 'center' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}><FiAlignCenter size={16} /></button>
          <button onClick={() => applyStyle('justifyRight')} className={`px-3 py-1 border border-slate-600 rounded transition ${alignment === 'right' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}><FiAlignRight size={16} /></button>
          <div className="border-l border-slate-600 mx-2" />
          <select value={fontSize} onChange={(e) => {
            const newSize = e.target.value;
            setFontSize(newSize);
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              if (!range.collapsed) {
                document.execCommand('fontSize', false, '7');
                editorRef.current?.querySelectorAll('font[size="7"]').forEach((el) => {
                  const span = document.createElement('span');
                  span.style.fontSize = newSize + 'px';
                  while (el.firstChild) span.appendChild(el.firstChild);
                  el.parentNode?.replaceChild(span, el);
                });
              }
            }
            editorRef.current?.focus();
            updateButtonStates();
          }} className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white">
            <option value="12">12px</option>
            <option value="14">14px</option>
            <option value="16">16px</option>
            <option value="18">18px</option>
            <option value="20">20px</option>
            <option value="24">24px</option>
            <option value="28">28px</option>
          </select>
          <div className="relative inline-block">
            <button
              onClick={(e) => { e.preventDefault(); const sel = window.getSelection(); if (sel && sel.toString().length > 0) applyStyle('foreColor', color); editorRef.current?.focus(); }}
              onDoubleClick={(e) => { e.preventDefault(); colorInputRef.current?.click(); }}
              className="w-10 h-[28px] border mt-2 border-slate-600 rounded hover:opacity-80 transition cursor-pointer"
              style={{ backgroundColor: color }}
              title="Click: aplicar color | Doble click: cambiar color"
            />
            <input ref={colorInputRef} type="color" value={color} onChange={(e) => { const c = e.target.value; setColor(c); localStorage.setItem('lastSelectedColor', c); }} className="absolute inset-0 w-0 h-0 opacity-0 pointer-events-none top-6" />
          </div>
          <button onClick={insertImage} className="px-3 py-1 bg-slate-700 border border-slate-600 rounded hover:bg-slate-600 text-white transition" title="Insertar imagen"><FiImage size={16} /></button>
          <div className="border-l border-slate-600 mx-2" />
          <button onClick={handleSave} disabled={isSaving} className={`px-4 py-1 text-white border rounded hover:bg-blue-700 font-medium transition flex items-center gap-2 ${hasUnsavedChanges ? 'bg-orange-600 border-orange-500' : 'bg-blue-600 border-blue-500'} disabled:opacity-50`}>
            <FiSave size={16} />
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
          {hasUnsavedChanges && !isSaving && (
            <div className="flex items-center gap-2 text-orange-400 text-sm">
              <div className="w-2 h-2 bg-orange-400 rounded-full" />
              Cambios no guardados
            </div>
          )}
          {isSaving && (
            <div className="flex items-center gap-2 text-blue-400 text-sm">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              Guardando automáticamente...
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="px-3 py-1 bg-slate-700 border border-slate-600 text-white rounded hover:bg-slate-600 transition text-sm">← Volver</button>
          )}
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable
        onClick={handleEditorClick}
        onKeyUp={handleEditorKeyUp}
        onMouseUp={handleMouseUp}
        className="flex-1 p-6 overflow-y-auto focus:outline-none text-base text-white bg-slate-950"
        style={{ minHeight: '400px', wordWrap: 'break-word', overflowWrap: 'break-word', cursor: resizingImg ? 'ew-resize' : 'text' }}
        suppressContentEditableWarning
      />

      {showTranslationBtn && projectId && (
        <button
          onMouseDown={(e) => { e.preventDefault(); setShowTranslationBtn(false); setShowTranslationModal(true); }}
          className="fixed z-40 bg-blue-600 text-white text-xs px-3 py-1 rounded-full shadow-lg hover:bg-blue-700 transition -translate-x-1/2 -translate-y-full"
          style={{ left: translationBtnPos.x, top: translationBtnPos.y }}
        >
          + Añadir Traducción
        </button>
      )}

      {showTranslationModal && projectId && (
        <AddTranslationModal
          selectedText={selectedText}
          projectId={projectId}
          onClose={() => setShowTranslationModal(false)}
          onSaved={() => { onTranslationSaved?.(); }}
        />
      )}
    </div>
  );
});

export default TextEditor;
