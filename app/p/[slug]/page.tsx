'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

interface Translation {
  id: number;
  original_text: string;
  translation: string;
  question: string | null;
}

function findAndHighlight(container: HTMLElement, searchText: string) {
  clearHighlight(container);
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  const textNodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) textNodes.push(node as Text);

  const normalizedSearch = searchText.trim().replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ');
  const searchRegex = new RegExp(normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s*'), '');
  const fullRaw = textNodes.map((n) => n.textContent || '').join('');
  const match = searchRegex.exec(fullRaw);
  if (!match) return;

  const idx = match.index;
  let offset = 0;
  let remaining = match[0].length;
  let started = false;

  for (const tn of textNodes) {
    const len = (tn.textContent || '').length;
    if (!started && offset + len > idx) {
      started = true;
      const start = idx - offset;
      const take = Math.min(len - start, remaining);
      const range = document.createRange();
      range.setStart(tn, start);
      range.setEnd(tn, start + take);
      const mark = document.createElement('mark');
      mark.dataset.liveHighlight = 'true';
      mark.style.backgroundColor = '#facc15';
      mark.style.color = '#000';
      mark.style.borderRadius = '2px';
      range.surroundContents(mark);
      remaining -= take;
    } else if (started && remaining > 0) {
      const take = Math.min(len, remaining);
      const range = document.createRange();
      range.setStart(tn, 0);
      range.setEnd(tn, take);
      const mark = document.createElement('mark');
      mark.dataset.liveHighlight = 'true';
      mark.style.backgroundColor = '#facc15';
      mark.style.color = '#000';
      mark.style.borderRadius = '2px';
      range.surroundContents(mark);
      remaining -= take;
    }
    offset += len;
    if (remaining <= 0) break;
  }
}

function clearHighlight(container: HTMLElement) {
  container.querySelectorAll('mark[data-live-highlight]').forEach((mark) => {
    const parent = mark.parentNode;
    if (parent) {
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
    }
  });
  container.normalize();
}

function replaceText(container: HTMLElement, original: string, replacement: string, savedHtml: React.MutableRefObject<string | null>) {
  clearHighlight(container);
  if (savedHtml.current === null) {
    savedHtml.current = container.innerHTML;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) textNodes.push(node as Text);

    const normalizedSearch = original.trim().replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ');
    const searchRegex = new RegExp(normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s*'), '');
    const fullRaw = textNodes.map((n) => n.textContent || '').join('');
    const match = searchRegex.exec(fullRaw);
    if (!match) { savedHtml.current = null; return; }

    const idx = match.index;
    let offset = 0;
    let remaining = match[0].length;
    let started = false;
    const collected: { node: Text; start: number; take: number }[] = [];

    for (const tn of textNodes) {
      const len = (tn.textContent || '').length;
      if (!started && offset + len > idx) {
        started = true;
        const start = idx - offset;
        const take = Math.min(len - start, remaining);
        collected.push({ node: tn, start, take });
        remaining -= take;
      } else if (started && remaining > 0) {
        const take = Math.min(len, remaining);
        collected.push({ node: tn, start: 0, take });
        remaining -= take;
      }
      offset += len;
      if (remaining <= 0) break;
    }

    for (let i = collected.length - 1; i >= 0; i--) {
      const { node, start, take } = collected[i];
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, start + take);
      range.deleteContents();
      if (i === 0) range.insertNode(document.createTextNode(replacement));
    }
    container.normalize();
  } else {
    container.innerHTML = savedHtml.current;
    savedHtml.current = null;
  }
}

export default function PublicProjectPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [project, setProject] = useState<{ name: string; content: string } | null>(null);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const savedHtml = useRef<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/${slug}`)
      .then((r) => { if (!r.ok) { setNotFound(true); return null; } return r.json(); })
      .then((data) => { if (data) { setProject(data); setTranslations(data.translations || []); } })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (project && contentRef.current) {
      contentRef.current.innerHTML = project.content;
    }
  }, [project]);

  useEffect(() => {
    const es = new EventSource(`/api/live/${slug}`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (!contentRef.current) return;
      if (data.type === 'highlight') {
        findAndHighlight(contentRef.current, data.text);
      } else if (data.type === 'clearHighlight') {
        clearHighlight(contentRef.current);
      } else if (data.type === 'translate') {
        replaceText(contentRef.current, data.original, data.translation, savedHtml);
        setActiveId(data.translationId);
        setTimeout(() => { if (contentRef.current) findAndHighlight(contentRef.current, data.translation); }, 50);
      } else if (data.type === 'revert') {
        replaceText(contentRef.current, data.translation, data.original, savedHtml);
        setActiveId(null);
        setTimeout(() => { if (contentRef.current) findAndHighlight(contentRef.current, data.original); }, 50);
      }
    };
    return () => es.close();
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <p className="text-slate-400">Cargando...</p>
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <p className="text-slate-400">Proyecto no encontrado</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <div className="flex-1 max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-white mb-8 pb-4 border-b border-slate-800">{project?.name}</h1>
        <div
          ref={contentRef}
          className="text-white text-base leading-relaxed"
        />
      </div>

      {translations.length > 0 && (
        <div className="w-72 bg-slate-900 border-l border-slate-800 flex flex-col flex-shrink-0 p-3 gap-2 overflow-y-auto">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Traducciones</span>
          {translations.map((t) => (
            <div
              key={t.id}
              className={`bg-slate-800 border rounded-lg p-3 flex flex-col gap-2 cursor-pointer transition ${activeId === t.id ? 'border-blue-500' : 'border-slate-700 hover:border-slate-500'}`}
              onMouseEnter={() => { if (contentRef.current) findAndHighlight(contentRef.current, activeId === t.id ? t.translation : t.original_text); }}
              onMouseLeave={() => { if (contentRef.current) clearHighlight(contentRef.current); }}
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
