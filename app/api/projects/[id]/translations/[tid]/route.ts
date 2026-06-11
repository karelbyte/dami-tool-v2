import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cookies } from 'next/headers';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; tid: string }> }) {
  const { tid } = await params;
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const db = getDb();
  db.prepare('DELETE FROM translations WHERE id = ?').run(Number(tid));
  return NextResponse.json({ success: true });
}
