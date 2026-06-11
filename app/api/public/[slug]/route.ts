import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();
  const project = db.prepare('SELECT id, name, content FROM projects WHERE public_slug = ?').get(slug) as { id: number; name: string; content: string } | undefined;
  if (!project) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  const translations = db.prepare('SELECT id, original_text, translation, question FROM translations WHERE project_id = ? ORDER BY created_at ASC').all(project.id);
  return NextResponse.json({ ...project, translations });
}
