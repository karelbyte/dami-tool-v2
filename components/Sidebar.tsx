'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    router.push('/login');
  };

  return (
    <div className="w-48 bg-slate-900 border-r border-slate-800 min-h-screen flex flex-col">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">D</span>
          </div>
          <span className="text-white font-bold">Dami</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <Link
          href="/projects"
          className={`w-full px-4 py-2 rounded-lg flex items-center gap-2 transition ${
            pathname === '/projects'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          <span>📁</span>
          <span>Proyectos</span>
        </Link>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
