import axios from 'axios';
import * as cheerio from 'cheerio';

function resolveUrl(base, href) {
  if (!href) return null;
  try {
    const resolved = new URL(href, base);
    resolved.hash = '';
    return resolved.href;
  } catch {
    return null;
  }
}

function isSameDomain(url, domain) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}

export async function crawl(baseUrl, domain, maxDepth = 2) {
  const visited = new Set();
  const queue = [{ url: baseUrl, depth: 0 }];
  const results = [];
  const MAX_URLS = 100;

  while (queue.length > 0 && results.length < MAX_URLS) {
    const { url, depth } = queue.shift();

    const normalized = url.replace(/#.*$/, '').replace(/\/$/, '') || url;
    if (visited.has(normalized)) continue;
    visited.add(normalized);

    if (depth > 0) {
      results.push({ url, source: 'crawl' });
    }

    if (depth >= maxDepth) continue;

    let html;
    try {
      // Only request URLs on the validated domain to prevent SSRF
      if (!isSameDomain(url, domain)) continue;
      const response = await axios.get(url, {
        timeout: 10000,
        maxRedirects: 5,
        headers: { 'User-Agent': 'Trackly/1.0 (+https://github.com/trackly)' },
        validateStatus: () => true,
      });
      html = response.data;
    } catch {
      continue;
    }

    if (typeof html !== 'string') continue;

    const $ = cheerio.load(html);
    const links = new Set();

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

    for (const link of links) {
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
