import pLimit from 'p-limit';
import axios from 'axios';
import { crawl } from './crawler';
import { getWordlistPaths } from './wordlist';
import { fetchWaybackUrls } from './wayback';
import { parseSitemap } from './sitemap';
import type { ScanResult, ScanState } from './store';

function normalizeUrlKey(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    const path = parsed.pathname.toLowerCase().replace(/\/+$/, '') || '/';
    return `${parsed.hostname}${path}${parsed.search}`;
  } catch {
    return url.toLowerCase();
  }
}

function deduplicateUrls(
  urlEntries: Array<{ url: string; source: string }>
): Array<{ url: string; source: string }> {
  const seen = new Set<string>();
  const unique: Array<{ url: string; source: string }> = [];
  for (const entry of urlEntries) {
    const key = normalizeUrlKey(entry.url);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(entry);
    }
  }
  return unique;
}

export async function checkUrl(url: string, retries = 2): Promise<ScanResult> {
  const start = Date.now();
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: 8000,
        maxRedirects: 5,
        validateStatus: () => true,
        headers: { 'User-Agent': 'Trackly/1.0' },
      });
      const responseTime = Date.now() - start;
      return {
        url,
        status: response.status,
        responseTime,
        source: '', // will be set by caller
      };
    } catch (err: unknown) {
      if (attempt === retries) {
        const e = err as { code?: string; message?: string };
        return {
          url,
          status: null,
          responseTime: Date.now() - start,
          source: '',
          error: e.code || e.message,
        };
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  // unreachable but satisfies TS
  return { url, status: null, responseTime: Date.now() - start, source: '' };
}

export async function runScan(
  scanId: string,
  domain: string,
  baseUrl: string,
  scans: Map<string, ScanState>
): Promise<void> {
  const update = (fields: Partial<ScanState>) => {
    const scan = scans.get(scanId);
    if (scan) Object.assign(scan, fields);
  };

  update({ status: 'running', progress: 5 });

  // Collect URLs from all sources concurrently
  const [crawlUrls, wordlistUrls, waybackUrls, sitemapUrls] = await Promise.allSettled([
    crawl(baseUrl, domain, 2),
    Promise.resolve(getWordlistPaths(baseUrl)),
    fetchWaybackUrls(domain),
    parseSitemap(baseUrl),
  ]);

  update({ progress: 20 });

  const allUrls = [
    ...(crawlUrls.status === 'fulfilled' ? crawlUrls.value : []),
    ...(wordlistUrls.status === 'fulfilled' ? wordlistUrls.value : []),
    ...(waybackUrls.status === 'fulfilled' ? waybackUrls.value : []),
    ...(sitemapUrls.status === 'fulfilled' ? sitemapUrls.value : []),
  ];

  const unique = deduplicateUrls(allUrls);
  const total = unique.length;

  if (total === 0) {
    update({ status: 'complete', progress: 100 });
    return;
  }

  const limit = pLimit(10);
  let completed = 0;

  const tasks = unique.map((entry) =>
    limit(async () => {
      const result = await checkUrl(entry.url);
      result.source = entry.source;

      const scan = scans.get(scanId);
      if (scan) {
        scan.results.push(result);
        completed++;
        scan.progress = Math.min(99, Math.round(20 + (completed / total) * 80));
      }

      // Rate-limit delay
      await new Promise((r) => setTimeout(r, 100));
    })
  );

  await Promise.all(tasks);

  update({ status: 'complete', progress: 100 });
}
