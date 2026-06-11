'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

interface Translation {
  id: number;
  original_text: string;
  translation: string;
  question: string | null;
}

function getTextNodes(container: HTMLElement): Text[] {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  const nodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) nodes.push(n as Text);
  return nodes;
}

function buildRegex(text: string) {
  const normalized = text.trim().replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ');
  return new RegExp(normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s*'), '');
}

function clearMarks(container: HTMLElement, attr: string) {
  container.querySelectorAll(`[${attr}]`).forEach((el) => {
    const parent = el.parentNode;
    if (parent) {
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    }
  });
  container.normalize();
}

function highlightText(container: HTMLElement, searchText: string) {
  clearMarks(container, 'data-hl');
  const textNodes = getTextNodes(container);
  const regex = buildRegex(searchText);
  const fullRaw = textNodes.map((n) => n.textContent || '').join('');
  const match = regex.exec(fullRaw);
  if (!match) return;

  let offset = 0;
  let remaining = match[0].length;
  let started = false;

  for (const tn of textNodes) {
    const len = (tn.textContent || '').length;
    if (!started && offset + len > match.index) {
      started = true;
      const start = match.index - offset;
      const take = Math.min(len - start, remaining);
      try {
        const range = document.createRange();
        range.setStart(tn, start);
        range.setEnd(tn, start + take);
        const mark = document.createElement('mark');
        mark.setAttribute('data-hl', 'true');
        mark.style.backgroundColor = '#facc15';
        mark.style.color = '#000';
        mark.style.borderRadius = '2px';
        range.surroundContents(mark);
        remaining -= take;
      } catch {}
    } else if (started && remaining > 0) {
      const take = Math.min(len, remaining);
      try {
        const range = document.createRange();
        range.setStart(tn, 0);
        range.setEnd(tn, take);
        const mark = document.createElement('mark');
        mark.setAttribute('data-hl', 'true');
        mark.style.backgroundColor = '#facc15';
        mark.style.color = '#000';
        mark.style.borderRadius = '2px';
        range.surroundContents(mark);
        remaining -= take;
      } catch {}
    }
    offset += len;
    if (remaining <= 0) break;
  }
}

function textExistsInContainer(container: HTMLElement, searchText: string): boolean {
  const textNodes = getTextNodes(container);
  const fullRaw = textNodes.map((n) => n.textContent || '').join('');
  return buildRegex(searchText).test(fullRaw);
}

export default function PublicProjectPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [project, setProject] = useState<{ name: string; content: string } | null>(null);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const translationsRef = useRef<Translation[]>([]);
  const localActiveIdRef = useRef<number | null>(null);
  const localSavedHtml = useRef<string | null>(null);
  const sseActiveIdRef = useRef<number | null>(null);
  const sseSavedHtml = useRef<string | null>(null);

  useEffect(() => { translationsRef.current = translations; }, [translations]);

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
    const container = contentRef.current;
    if (!container) return;

    let currentHoverId: number | null = null;

    const onMouseMove = (e: MouseEvent) => {
      if (!translationsRef.current.length) return;
      const x = e.clientX, y = e.clientY;
      const el = document.elementFromPoint(x, y);
      if (!el || !container.contains(el)) return;

      for (const t of translationsRef.current) {
        const searchText = localActiveIdRef.current === t.id ? t.translation : t.original_text;
        const textNodes = getTextNodes(container);
        const fullRaw = textNodes.map((n) => n.textContent || '').join('');
        const match = buildRegex(searchText).exec(fullRaw);
        if (!match) continue;

        let offset = 0;
        let started = false;
        let remaining = match[0].length;
        let found = false;

        for (const tn of textNodes) {
          const len = (tn.textContent || '').length;
          if (!started && offset + len > match.index) {
            started = true;
            const start = match.index - offset;
            const take = Math.min(len - start, remaining);
            try {
              const range = document.createRange();
              range.setStart(tn, start);
              range.setEnd(tn, start + take);
              const rect = range.getBoundingClientRect();
              if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                found = true; break;
              }
            } catch {}
            remaining -= take;
          } else if (started && remaining > 0) {
            const take = Math.min(len, remaining);
            try {
              const range = document.createRange();
              range.setStart(tn, 0);
              range.setEnd(tn, take);
              const rect = range.getBoundingClientRect();
              if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                found = true; break;
              }
            } catch {}
            remaining -= take;
          }
          offset += len;
          if (remaining <= 0) break;
        }

        if (found) {
          if (currentHoverId !== t.id) {
            currentHoverId = t.id;
            highlightText(container, searchText);
          }
          container.style.cursor = 'pointer';
          return;
        }
      }

      if (currentHoverId !== null) {
        currentHoverId = null;
        clearMarks(container, 'data-hl');
        container.style.cursor = 'default';
      }
    };

    const onMouseLeave = () => {
      currentHoverId = null;
      clearMarks(container, 'data-hl');
      container.style.cursor = 'default';
    };

    const onClick = (e: MouseEvent) => {
      if (currentHoverId === null) return;
      const tid = currentHoverId;
      const t = translationsRef.current.find((x) => x.id === tid);
      if (!t) return;

      clearMarks(container, 'data-hl');

      if (localActiveIdRef.current === tid) {
        if (localSavedHtml.current !== null) {
          container.innerHTML = localSavedHtml.current;
          localSavedHtml.current = null;
        }
        localActiveIdRef.current = null;
        setTimeout(() => highlightText(container, t.original_text), 50);
      } else {
        localSavedHtml.current = container.innerHTML;
        const textNodes = getTextNodes(container);
        const fullRaw = textNodes.map((n) => n.textContent || '').join('');
        const match = buildRegex(t.original_text).exec(fullRaw);
        if (!match) return;

        let offset = 0;
        let remaining = match[0].length;
        let started = false;
        const collected: { node: Text; start: number; take: number }[] = [];

        for (const tn of textNodes) {
          const len = (tn.textContent || '').length;
          if (!started && offset + len > match.index) {
            started = true;
            const start = match.index - offset;
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
          if (i === 0) range.insertNode(document.createTextNode(t.translation));
        }
        container.normalize();
        localActiveIdRef.current = tid;
        setTimeout(() => highlightText(container, t.translation), 50);
      }
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);
    container.addEventListener('click', onClick);
    return () => {
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
      container.removeEventListener('click', onClick);
    };
  }, [translations]);

  useEffect(() => {
    const es = new EventSource(`/api/live/${slug}`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      const container = contentRef.current;
      if (!container) return;

      if (data.type === 'highlight') {
        highlightText(container, data.text);
      } else if (data.type === 'clearHighlight') {
        clearMarks(container, 'data-hl');
      } else if (data.type === 'translate') {
        sseSavedHtml.current = container.innerHTML;
        const textNodes = getTextNodes(container);
        const fullRaw = textNodes.map((n) => n.textContent || '').join('');
        const match = buildRegex(data.original).exec(fullRaw);
        if (!match) return;
        let offset = 0, remaining = match[0].length, started = false;
        const collected: { node: Text; start: number; take: number }[] = [];
        for (const tn of textNodes) {
          const len = (tn.textContent || '').length;
          if (!started && offset + len > match.index) {
            started = true;
            const start = match.index - offset;
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
          if (i === 0) range.insertNode(document.createTextNode(data.translation));
        }
        container.normalize();
        sseActiveIdRef.current = data.translationId;
        setTimeout(() => highlightText(container, data.translation), 50);
      } else if (data.type === 'revert') {
        if (sseSavedHtml.current !== null) {
          container.innerHTML = sseSavedHtml.current;
          sseSavedHtml.current = null;
        }
        sseActiveIdRef.current = null;
        setTimeout(() => highlightText(container, data.original), 50);
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
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-white mb-8 pb-4 border-b border-slate-800">{project?.name}</h1>
        <div ref={contentRef} className="text-white text-base leading-relaxed cursor-default" />
      </div>
    </div>
  );
}
