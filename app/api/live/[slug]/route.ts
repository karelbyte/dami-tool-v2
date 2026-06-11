import { NextRequest, NextResponse } from 'next/server';

const clients = new Map<string, Set<(data: string) => void>>();

export function addClient(slug: string, cb: (data: string) => void) {
  if (!clients.has(slug)) clients.set(slug, new Set());
  clients.get(slug)!.add(cb);
}

export function removeClient(slug: string, cb: (data: string) => void) {
  clients.get(slug)?.delete(cb);
}

export function emitToSlug(slug: string, data: object) {
  const cbs = clients.get(slug);
  if (!cbs) return;
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  cbs.forEach((cb) => cb(msg));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const stream = new ReadableStream({
    start(controller) {
      const cb = (data: string) => {
        try { controller.enqueue(new TextEncoder().encode(data)); } catch {}
      };
      addClient(slug, cb);
      req.signal.addEventListener('abort', () => {
        removeClient(slug, cb);
        controller.close();
      });
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
