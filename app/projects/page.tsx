'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiEdit2, FiCopy, FiTrash2, FiPlus, FiLogOut } from 'react-icons/fi';
import { MdDescription } from 'react-icons/md';
import CreateProjectModal from '@/components/CreateProjectModal';

interface Project {
  id: number;
  name: string;
  public_slug: string;
  created_at: string;
  updated_at: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      } else if (response.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error al obtener proyectos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (name: string) => {
    setCreating(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        const newProject = await response.json();
        setProjects([newProject, ...projects]);
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Error al crear proyecto:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (!confirm('¿Deseas eliminar este proyecto?')) return;

    try {
      const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setProjects(projects.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error('Error al eliminar proyecto:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE', credentials: 'include' });
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="flex justify-between items-center">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium text-sm flex items-center gap-2"
          >
            <FiPlus size={16} />
            Nuevo Proyecto
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition font-medium text-sm flex items-center gap-2"
          >
            <FiLogOut size={16} />
            Cerrar Sesión
          </button>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Mis Proyectos</h1>
          <p className="text-slate-400 text-sm mt-1">Crea y gestiona tus documentos con anotaciones de búsqueda</p>
        </div>

        {loading ? (
          <p className="text-center text-slate-400">Cargando proyectos...</p>
        ) : projects.length === 0 ? (
          <p className="text-center text-slate-400">No hay proyectos aún. Crea uno para comenzar.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group relative bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-all overflow-hidden cursor-pointer hover:bg-slate-800/80 block"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-transparent rounded-t-lg scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                
                <div className="p-4 space-y-3 flex flex-col h-full">
                  <div className="flex items-start justify-between flex-shrink-0">
                    <div className="w-14 h-14 bg-slate-700 rounded-lg flex items-center justify-center group-hover:bg-slate-600 transition">
                      <MdDescription size={28} className="text-blue-400" />
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-sm hover:text-blue-400 transition line-clamp-2">
                      {project.name}
                    </h3>
                    <p className="text-slate-500 text-xs mt-2">{formatDate(project.created_at)}</p>
                  </div>

                  <div 
                    className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 justify-end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigator.clipboard.writeText(`${window.location.origin}/p/${project.public_slug}`);
                      }}
                      className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-blue-400 transition"
                      title="Copiar enlace público"
                    >
                      <FiCopy size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-blue-400 transition"
                      title="Editar"
                    >
                      <FiEdit2 size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteProject(project.id);
                      }}
                      className="p-1.5 bg-slate-700 hover:bg-red-900/50 rounded-lg text-slate-400 hover:text-red-400 transition"
                      title="Eliminar"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateProject}
        isCreating={creating}
      />
    </div>
  );
}
