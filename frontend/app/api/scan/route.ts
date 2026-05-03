import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { v4 as uuidv4 } from 'uuid';
import { validateDomain } from '@/lib/validator';
import { normalizeDomain } from '@/lib/normalizer';
import { runScan } from '@/lib/scanner';
import scans from '@/lib/store';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { domain } = body;

  if (!domain || typeof domain !== 'string') {
    return NextResponse.json({ error: 'domain is required' }, { status: 400 });
  }

  let normalized: { domain: string; baseUrl: string };
  try {
    normalized = normalizeDomain(domain.trim());
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  try {
    await validateDomain(normalized.domain);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const scan_id = uuidv4();
  scans.set(scan_id, {
    id: scan_id,
    domain: normalized.domain,
    status: 'pending',
    progress: 0,
    results: [],
    error: null,
    createdAt: new Date().toISOString(),
  });

  waitUntil(
    runScan(scan_id, normalized.domain, normalized.baseUrl, scans).catch((err: Error) => {
      const scan = scans.get(scan_id);
      if (scan) {
        scan.status = 'error';
        scan.error = err.message;
      }
    })
  );

  return NextResponse.json({ scan_id });
}
