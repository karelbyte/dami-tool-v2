'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Head from 'next/head';
import TextEditor, { TextEditorHandle } from '@/components/TextEditor';
import Sidebar from '@/components/Sidebar';

interface Project {
  id: number;
  name: string;
  content: string;
  public_slug: string;
}

export default function ProjectEditorPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [translationRefresh, setTranslationRefresh] = useState(0);
  const [remoteActiveId, setRemoteActiveId] = useState<number | null>(null);
  const editorHandle = useRef<TextEditorHandle>(null);
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  useEffect(() => {
    if (project) {
      document.title = project.name;
    }
  }, [project]);

  useEffect(() => {
    if (!project?.public_slug) return;
    const es = new EventSource(`/api/live/${project.public_slug}`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'highlight') {
        editorHandle.current?.highlightText(data.text);
      } else if (data.type === 'clearHighlight') {
        editorHandle.current?.clearHighlight();
      } else if (data.type === 'translate') {
        editorHandle.current?.replaceText(data.original, data.translation);
        setRemoteActiveId(data.translationId);
        setTimeout(() => editorHandle.current?.highlightText(data.translation), 50);
      } else if (data.type === 'revert') {
        editorHandle.current?.replaceText(data.translation, data.original);
        setRemoteActiveId(null);
        setTimeout(() => editorHandle.current?.highlightText(data.original), 50);
      }
    };
    return () => es.close();
  }, [project?.public_slug]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      } else if (response.status === 401) {
        router.push('/login');
      } else {
        router.push('/projects');
      }
    } catch (error) {
      console.error('Error al obtener proyecto:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (content: string) => {
    setIsSaving(true);
    setMessage('');

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        setMessage('Guardado exitosamente');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Error al guardar');
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      setMessage('Error de conexión');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-slate-950">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-400">Cargando proyecto...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-screen overflow-hidden bg-slate-950">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-400">Proyecto no encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar projectId={projectId} refreshKey={translationRefresh} editorRef={editorHandle} publicSlug={project.public_slug} remoteActiveId={remoteActiveId} />
      <div className="flex-1 overflow-hidden">
        <TextEditor
          ref={editorHandle}
          initialContent={project.content}
          onSave={handleSave}
          projectName={project.name}
          onBack={() => router.push('/projects')}
          projectId={projectId}
          publicSlug={project.public_slug}
          onTranslationSaved={() => setTranslationRefresh((k) => k + 1)}
        />
      </div>
    </div>
  );
}
