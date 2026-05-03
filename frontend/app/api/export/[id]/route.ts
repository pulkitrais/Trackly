import { NextRequest, NextResponse } from 'next/server';
import scans from '@/lib/store';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scan = scans.get(id);
  if (!scan) return NextResponse.json({ error: 'Scan not found' }, { status: 404 });

  const format = req.nextUrl.searchParams.get('format') === 'csv' ? 'csv' : 'json';
  const results = scan.results || [];

  if (format === 'json') {
    return new NextResponse(JSON.stringify(results), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="trackly-${scan.domain}-${scan.id.slice(0, 8)}.json"`,
      },
    });
  }

  // CSV
  const header = 'url,status,responseTime,source';
  const rows = results.map((r) => {
    const url = `"${String(r.url || '').replace(/"/g, '""')}"`;
    const status = r.status ?? '';
    const responseTime = r.responseTime ?? '';
    const source = `"${String(r.source || '').replace(/"/g, '""')}"`;
    return `${url},${status},${responseTime},${source}`;
  });

  const csv = [header, ...rows].join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="trackly-${scan.domain}-${scan.id.slice(0, 8)}.csv"`,
    },
  });
}
