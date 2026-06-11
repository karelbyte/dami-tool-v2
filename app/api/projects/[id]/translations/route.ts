import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const db = getDb();
  const translations = db.prepare('SELECT * FROM translations WHERE project_id = ? ORDER BY created_at ASC').all(Number(id));
  return NextResponse.json(translations);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { original_text, translation, question } = await req.json();
  if (!original_text || !translation) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });

  const db = getDb();
  const result = db.prepare('INSERT INTO translations (project_id, original_text, translation, question) VALUES (?, ?, ?, ?)').run(Number(id), original_text, translation, question || null);
  const created = db.prepare('SELECT * FROM translations WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(created, { status: 201 });
}
