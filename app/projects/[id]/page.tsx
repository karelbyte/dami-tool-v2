'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import TextEditor from '@/components/TextEditor';
import Sidebar from '@/components/Sidebar';

interface Project {
  id: number;
  name: string;
  content: string;
}

export default function ProjectEditorPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

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
      <div className="flex min-h-screen bg-slate-950">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-400">Cargando proyecto...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen bg-slate-950">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-400">Proyecto no encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="bg-slate-900 border-b border-slate-800 p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-white">{project.name}</h1>
            <div className="flex items-center gap-4">
              {message && <p className="text-green-400 text-sm">{message}</p>}
              <button
                onClick={() => router.push('/projects')}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition font-medium"
              >
                ← Volver
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4">
          <div className="bg-slate-900 rounded-lg overflow-hidden border border-slate-800 h-full flex flex-col">
            <TextEditor initialContent={project.content} onSave={handleSave} />
          </div>
        </div>
      </div>
    </div>
  );
}
