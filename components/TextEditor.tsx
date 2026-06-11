'use client';

import { useRef, useState, useEffect } from 'react';
import { FiBold, FiItalic, FiUnderline, FiImage, FiSave, FiRotateCcw, FiRotateCw, FiAlignLeft, FiAlignCenter, FiAlignRight } from 'react-icons/fi';

interface TextEditorProps {
  initialContent?: string;
  onSave?: (content: string) => void;
}

export default function TextEditor({ initialContent = '', onSave }: TextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
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
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (editorRef.current && initialContent) {
      editorRef.current.innerHTML = initialContent;
      setLastSavedContent(initialContent);
      attachImageListeners();
    }
  }, [initialContent]);

  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (hasUnsavedChanges && editorRef.current) {
        performAutoSave();
      }
    }, 60000);

    return () => clearInterval(autoSaveInterval);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingImg) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      const aspectRatio = startWidth / startHeight;

      const newWidth = Math.max(50, startWidth + deltaX);
      const newHeight = newWidth / aspectRatio;

      resizingImg.style.width = newWidth + 'px';
      resizingImg.style.height = newHeight + 'px';
    };

    const handleMouseUp = () => {
      setResizingImg(null);
    };

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
    const images = editorRef.current?.querySelectorAll('img');
    images?.forEach((img) => {
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
    
    if (document.queryCommandState('justifyLeft')) {
      setAlignment('left');
    } else if (document.queryCommandState('justifyCenter')) {
      setAlignment('center');
    } else if (document.queryCommandState('justifyRight')) {
      setAlignment('right');
    }

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      let node = range.commonAncestorContainer;
      
      if (node.nodeType === 3) {
        node = node.parentNode as Node;
      }
      
      const element = node as HTMLElement;
      if (element) {
        const computedStyle = window.getComputedStyle(element);
        const size = computedStyle.fontSize;
        const sizeInPx = size.replace('px', '');
        
        if (sizeInPx) {
          setFontSize(sizeInPx);
        }
      }
    }
  };

  const handleEditorClick = () => {
    setTimeout(updateButtonStates, 0);
  };

  const handleEditorKeyUp = () => {
    updateButtonStates();
    checkForChanges();
  };

  const checkForChanges = () => {
    const currentContent = editorRef.current?.innerHTML || '';
    if (currentContent !== lastSavedContent) {
      setHasUnsavedChanges(true);
    }
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
            const range = selection.getRangeAt(0);
            range.insertNode(img);
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
      <div className="bg-slate-800 p-4 border-b border-slate-700 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center flex-1">
        <button
          onClick={() => applyStyle('undo')}
          className="px-3 py-1 bg-slate-700 border border-slate-600 rounded hover:bg-slate-600 text-white transition"
          title="Deshacer (Ctrl+Z)"
        >
          <FiRotateCcw size={16} />
        </button>
        <button
          onClick={() => applyStyle('redo')}
          className="px-3 py-1 bg-slate-700 border border-slate-600 rounded hover:bg-slate-600 text-white transition"
          title="Rehacer (Ctrl+Y)"
        >
          <FiRotateCw size={16} />
        </button>

        <div className="border-l border-slate-600 mx-2" />

        <button
          onClick={() => applyStyle('bold')}
          className={`px-3 py-1 border border-slate-600 rounded font-bold transition ${
            isBold
              ? 'bg-blue-600 text-white border-blue-500'
              : 'bg-slate-700 hover:bg-slate-600 text-white'
          }`}
          title="Negrita (Ctrl+B)"
        >
          <FiBold size={16} />
        </button>
        <button
          onClick={() => applyStyle('italic')}
          className={`px-3 py-1 border border-slate-600 rounded italic transition ${
            isItalic
              ? 'bg-blue-600 text-white border-blue-500'
              : 'bg-slate-700 hover:bg-slate-600 text-white'
          }`}
          title="Itálica (Ctrl+I)"
        >
          <FiItalic size={16} />
        </button>
        <button
          onClick={() => applyStyle('underline')}
          className={`px-3 py-1 border border-slate-600 rounded underline transition ${
            isUnderline
              ? 'bg-blue-600 text-white border-blue-500'
              : 'bg-slate-700 hover:bg-slate-600 text-white'
          }`}
          title="Subrayado (Ctrl+U)"
        >
          <FiUnderline size={16} />
        </button>

        <div className="border-l border-slate-600 mx-2" />

        <button
          onClick={() => applyStyle('justifyLeft')}
          className={`px-3 py-1 border border-slate-600 rounded transition ${
            alignment === 'left'
              ? 'bg-blue-600 text-white border-blue-500'
              : 'bg-slate-700 hover:bg-slate-600 text-white'
          }`}
          title="Alinear a la izquierda"
        >
          <FiAlignLeft size={16} />
        </button>
        <button
          onClick={() => applyStyle('justifyCenter')}
          className={`px-3 py-1 border border-slate-600 rounded transition ${
            alignment === 'center'
              ? 'bg-blue-600 text-white border-blue-500'
              : 'bg-slate-700 hover:bg-slate-600 text-white'
          }`}
          title="Centrar"
        >
          <FiAlignCenter size={16} />
        </button>
        <button
          onClick={() => applyStyle('justifyRight')}
          className={`px-3 py-1 border border-slate-600 rounded transition ${
            alignment === 'right'
              ? 'bg-blue-600 text-white border-blue-500'
              : 'bg-slate-700 hover:bg-slate-600 text-white'
          }`}
          title="Alinear a la derecha"
        >
          <FiAlignRight size={16} />
        </button>

        <div className="border-l border-slate-600 mx-2" />

        <select
          value={fontSize}
          onChange={(e) => {
            const newSize = e.target.value;
            setFontSize(newSize);
            
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              if (!range.collapsed) {
                document.execCommand('fontSize', false, '7');
                const fontElements = editorRef.current?.querySelectorAll('font[size="7"]');
                fontElements?.forEach((el) => {
                  const span = document.createElement('span');
                  span.style.fontSize = newSize + 'px';
                  while (el.firstChild) {
                    span.appendChild(el.firstChild);
                  }
                  el.parentNode?.replaceChild(span, el);
                });
              }
            }
            editorRef.current?.focus();
            updateButtonStates();
          }}
          className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white"
        >
          <option value="12">12px</option>
          <option value="14">14px</option>
          <option value="16">16px</option>
          <option value="18">18px</option>
          <option value="20">20px</option>
          <option value="24">24px</option>
          <option value="28">28px</option>
        </select>

        <input
          type="color"
          value={color}
          onChange={(e) => {
            setColor(e.target.value);
            applyStyle('foreColor', e.target.value);
          }}
          className="w-10 h-8 border border-slate-600 rounded cursor-pointer"
          title="Color de texto"
        />

        <button
          onClick={insertImage}
          className="px-3 py-1 bg-slate-700 border border-slate-600 rounded hover:bg-slate-600 text-white transition"
          title="Insertar imagen"
        >
          <FiImage size={16} />
        </button>

        <div className="border-l border-slate-600 mx-2" />

        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`px-4 py-1 text-white border rounded hover:bg-blue-700 font-medium transition flex items-center gap-2 ${
            hasUnsavedChanges
              ? 'bg-orange-600 border-orange-500'
              : 'bg-blue-600 border-blue-500'
          } disabled:opacity-50`}
        >
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
      </div>

      <div
        ref={editorRef}
        contentEditable
        onClick={handleEditorClick}
        onKeyUp={handleEditorKeyUp}
        onMouseUp={handleEditorClick}
        className="flex-1 p-6 overflow-auto focus:outline-none text-base text-white bg-slate-950"
        style={{ 
          minHeight: '400px',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          cursor: resizingImg ? 'ew-resize' : 'text'
        }}
        suppressContentEditableWarning
      />
    </div>
  );
}
