import { NextRequest, NextResponse } from 'next/server';
import { getDb, generatePublicSlug } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const db = getDb();
    const projects = db.prepare('SELECT id, name, public_slug, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY created_at DESC').all(userId);

    return NextResponse.json(projects);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener proyectos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Nombre del proyecto requerido' }, { status: 400 });
    }

    const db = getDb();
    const slug = generatePublicSlug(name);
    const result = db.prepare('INSERT INTO projects (user_id, name, content, public_slug) VALUES (?, ?, ?, ?)').run(userId, name, '', slug);

    return NextResponse.json({ id: result.lastInsertRowid, name, public_slug: slug, created_at: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear proyecto' }, { status: 500 });
  }
}
