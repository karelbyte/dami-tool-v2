import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Credenciales requeridas' }, { status: 400 });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);

    if (!user) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, user: { id: (user as any).id, username: (user as any).username } });
    response.cookies.set('userId', String((user as any).id), { httpOnly: true, maxAge: 86400 });
    
    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Error al autenticar' }, { status: 500 });
  }
}
