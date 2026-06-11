import { NextRequest, NextResponse } from 'next/server';
import { emitToSlug } from '../route';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;
  if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();
  emitToSlug(slug, body);
  return NextResponse.json({ success: true });
}
