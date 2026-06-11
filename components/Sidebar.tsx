'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';

interface Translation {
  id: number;
  original_text: string;
  translation: string;
  question: string | null;
  created_at: string;
}

interface SidebarProps {
  projectId?: string;
  refreshKey?: number;
  editorRef?: React.RefObject<import('./TextEditor').TextEditorHandle | null>;
}

export default function Sidebar({ projectId, refreshKey, editorRef }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [activeTranslationId, setActiveTranslationId] = useState<number | null>(null);

  useEffect(() => {
    if (projectId) {
      fetch(`/api/projects/${projectId}/translations`, { credentials: 'include' })
        .then((r) => r.json())
        .then((data) => setTranslations(Array.isArray(data) ? data : []));
    }
  }, [projectId, refreshKey]);

  const handleDelete = async (tid: number) => {
    await fetch(`/api/projects/${projectId}/translations/${tid}`, { method: 'DELETE' });
    setTranslations((prev) => prev.filter((t) => t.id !== tid));
  };

  return (
    <div className="w-72 bg-slate-900 border-r border-slate-800 h-screen flex flex-col flex-shrink-0">
      <div className="py-[21px] px-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">D</span>
          </div>
          <span className="text-white font-bold">Dami</span>
        </div>
      </div>

      {projectId ? (
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Traducciones</span>
            <span className="text-slate-500 text-xs">{translations.length}</span>
          </div>
          {translations.length === 0 && (
            <p className="text-slate-500 text-xs text-center mt-4">Sin traducciones aún</p>
          )}
          {translations.map((t) => (
            <div
              key={t.id}
              className={`bg-slate-800 border rounded-lg p-3 flex flex-col gap-2 group cursor-pointer transition ${activeTranslationId === t.id ? 'border-blue-500' : 'border-slate-700 hover:border-slate-500'}`}
              onMouseEnter={() => editorRef?.current?.highlightText(t.original_text)}
              onMouseLeave={() => editorRef?.current?.clearHighlight()}
              onClick={() => {
                if (activeTranslationId === t.id) {
                  editorRef?.current?.replaceText(t.translation, t.original_text);
                  setActiveTranslationId(null);
                } else {
                  editorRef?.current?.clearHighlight();
                  editorRef?.current?.replaceText(t.original_text, t.translation);
                  setActiveTranslationId(t.id);
                }
              }}
            >
              <p className="text-slate-400 text-xs italic border-l-2 border-slate-600 pl-2">{t.original_text}</p>
              <div>
                <span className="text-slate-500 text-xs uppercase tracking-wider">Traducción</span>
                <p className="text-white text-xs mt-0.5">{t.translation}</p>
              </div>
              {t.question && (
                <div>
                  <span className="text-slate-500 text-xs uppercase tracking-wider">Pregunta</span>
                  <p className="text-blue-400 text-xs mt-0.5">{t.question}</p>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={() => setConfirmDeleteId(t.id)}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded transition opacity-0 group-hover:opacity-100"
                  title="Eliminar"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/projects"
            className={`w-full px-4 py-2 rounded-lg flex items-center gap-2 transition ${
              pathname === '/projects' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <span>📁</span>
            <span>Proyectos</span>
          </Link>
        </nav>
      )}

      <div className="p-4 border-t border-slate-800 text-slate-500 text-xs text-center">
        Dami Tool
      </div>

      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-6 w-72">
            <p className="text-white text-sm font-medium mb-4">¿Eliminar esta traducción?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-slate-300 hover:text-white transition text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => { handleDelete(confirmDeleteId); setConfirmDeleteId(null); }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
