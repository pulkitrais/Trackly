import axios from 'axios';
import xml2js from 'xml2js';

const parser = new xml2js.Parser();

async function fetchXml(url: string, allowedBaseUrl: string | null): Promise<string> {
  // Parse and validate the URL before fetching to prevent SSRF.
  // Only allow requests to the same hostname as the original target.
  let parsedTarget: URL;
  try {
    parsedTarget = new URL(url);
  } catch {
    throw new Error(`Invalid sitemap URL: ${url}`);
  }
  if (allowedBaseUrl) {
    const parsedBase = new URL(allowedBaseUrl);
    const targetHost = parsedTarget.hostname;
    const baseHost = parsedBase.hostname;
    if (targetHost !== baseHost && !targetHost.endsWith(`.${baseHost}`)) {
      throw new Error(`Blocked off-domain sitemap fetch: ${url}`);
    }
  }
  // Use the reconstructed href from the parsed URL object
  const safeUrl = parsedTarget.href;
  const response = await axios.get(safeUrl, {
    timeout: 10000,
    headers: { 'User-Agent': 'Trackly/1.0' },
    validateStatus: (s) => s < 400,
  });
  return response.data;
}

async function parseSitemapXml(
  xmlStr: string,
  depth = 0,
  allowedBaseUrl: string | null = null
): Promise<Array<{ url: string; source: string }>> {
  if (depth > 3) return [];
  const results: Array<{ url: string; source: string }> = [];

  let parsed: Record<string, unknown>;
  try {
    parsed = await parser.parseStringPromise(xmlStr);
  } catch {
    return [];
  }

  // sitemapindex
  if (parsed.sitemapindex && (parsed.sitemapindex as Record<string, unknown>).sitemap) {
    const sitemaps = (parsed.sitemapindex as Record<string, Array<{ loc: string[] }>>).sitemap;
    for (const sm of sitemaps.slice(0, 10)) {
      const loc = sm.loc && sm.loc[0];
      if (!loc) continue;
      try {
        const xml = await fetchXml(loc, allowedBaseUrl);
        const nested = await parseSitemapXml(xml, depth + 1, allowedBaseUrl);
        results.push(...nested);
      } catch {
        // skip failed nested sitemaps
      }
    }
    return results;
  }

  // urlset
  if (parsed.urlset && (parsed.urlset as Record<string, unknown>).url) {
    for (const entry of (parsed.urlset as Record<string, Array<{ loc: string[] }>>).url) {
      const loc = entry.loc && entry.loc[0];
      if (loc) results.push({ url: loc, source: 'sitemap' });
    }
  }

  return results;
}

export async function parseSitemap(baseUrl: string): Promise<Array<{ url: string; source: string }>> {
  const base = baseUrl.replace(/\/$/, '');
  const candidates = [`${base}/sitemap.xml`, `${base}/sitemap_index.xml`];
  const results: Array<{ url: string; source: string }> = [];

  for (const url of candidates) {
    try {
      const xml = await fetchXml(url, baseUrl);
      const entries = await parseSitemapXml(xml, 0, baseUrl);
      results.push(...entries);
    } catch {
      // continue to next candidate
    }
  }

  return results;
}
