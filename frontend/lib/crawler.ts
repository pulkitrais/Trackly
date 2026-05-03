import axios from 'axios';
import * as cheerio from 'cheerio';

function resolveUrl(base: string, href: string | undefined): string | null {
  if (!href) return null;
  try {
    const resolved = new URL(href, base);
    resolved.hash = '';
    return resolved.href;
  } catch {
    return null;
  }
}

function isSameDomain(url: string, domain: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}

export async function crawl(
  baseUrl: string,
  domain: string,
  maxDepth = 2
): Promise<Array<{ url: string; source: string }>> {
  const visited = new Set<string>();
  const queue: Array<{ url: string; depth: number }> = [{ url: baseUrl, depth: 0 }];
  const results: Array<{ url: string; source: string }> = [];
  const MAX_URLS = 100;

  while (queue.length > 0 && results.length < MAX_URLS) {
    const { url, depth } = queue.shift()!;

    const normalized = url.replace(/#.*$/, '').replace(/\/$/, '') || url;
    if (visited.has(normalized)) continue;
    visited.add(normalized);

    if (depth > 0) {
      results.push({ url, source: 'crawl' });
    }

    if (depth >= maxDepth) continue;

    let html: unknown;
    try {
      // Only request URLs on the validated domain to prevent SSRF.
      // Parse the URL and verify the hostname before fetching.
      let parsedFetchUrl: URL;
      try {
        parsedFetchUrl = new URL(url);
      } catch {
        continue;
      }
      const hostname = parsedFetchUrl.hostname;
      if (hostname !== domain && !hostname.endsWith(`.${domain}`)) continue;
      // Reconstruct from parsed URL object to avoid raw user-input string going to axios
      const safeUrl = parsedFetchUrl.href;
      const response = await axios.get(safeUrl, {
        timeout: 10000,
        maxRedirects: 5,
        headers: { 'User-Agent': 'Trackly/1.0' },
        validateStatus: () => true,
      });
      html = response.data;
    } catch {
      continue;
    }

    if (typeof html !== 'string') continue;

    const $ = cheerio.load(html);
    const links = new Set<string>();

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      const resolved = resolveUrl(url, href);
      if (resolved) links.add(resolved);
    });

    $('link[href]').each((_, el) => {
      const href = $(el).attr('href');
      const resolved = resolveUrl(url, href);
      if (resolved) links.add(resolved);
    });

    $('script[src]').each((_, el) => {
      const src = $(el).attr('src');
      const resolved = resolveUrl(url, src);
      if (resolved) links.add(resolved);
    });

    $('img[src]').each((_, el) => {
      const src = $(el).attr('src');
      const resolved = resolveUrl(url, src);
      if (resolved) links.add(resolved);
    });

    $('form[action]').each((_, el) => {
      const action = $(el).attr('action');
      const resolved = resolveUrl(url, action);
      if (resolved) links.add(resolved);
    });

    for (const link of Array.from(links)) {
      if (isSameDomain(link, domain)) {
        const norm = link.replace(/#.*$/, '').replace(/\/$/, '') || link;
        if (!visited.has(norm)) {
          queue.push({ url: link, depth: depth + 1 });
        }
      }
    }
  }

  return results.slice(0, MAX_URLS);
}
