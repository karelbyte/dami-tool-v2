import { NextRequest, NextResponse } from 'next/server';
import { emitToSlug } from '../route';

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json();
  emitToSlug(slug, body);
  return NextResponse.json({ success: true });
}
