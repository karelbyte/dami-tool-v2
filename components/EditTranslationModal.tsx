'use client';

import { useState } from 'react';

interface EditTranslationModalProps {
  translationId: number;
  projectId: string;
  originalText: string;
  initialTranslation: string;
  initialQuestion: string | null;
  onClose: () => void;
  onSaved: (updated: { translation: string; question: string | null }) => void;
}

export default function EditTranslationModal({
  translationId,
  projectId,
  originalText,
  initialTranslation,
  initialQuestion,
  onClose,
  onSaved,
}: EditTranslationModalProps) {
  const [translation, setTranslation] = useState(initialTranslation);
  const [question, setQuestion] = useState(initialQuestion || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!translation.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/projects/${projectId}/translations/${translationId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ translation, question }),
    });
    const updated = await res.json();
    setSaving(false);
    onSaved({ translation: updated.translation, question: updated.question });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 rounded-lg border border-slate-700 shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-white font-semibold text-lg">Editar Traducción</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition text-xl">✕</button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 text-slate-300 text-sm italic">
            {originalText}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Traducción</label>
            <textarea
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-blue-500 h-24"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Pregunta <span className="text-slate-500 normal-case font-normal">— opcional</span></label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ej: ¿Qué significa esta expresión?"
              className="bg-slate-800 border border-slate-600 rounded-lg p-3 text-white text-sm resize-none focus:outline-none focus:border-blue-500 h-24"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white transition text-sm">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!translation.trim() || saving}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
