import axios from 'axios';
import xml2js from 'xml2js';

const parser = new xml2js.Parser();

function isSameDomainUrl(url, baseUrl) {
  try {
    const base = new URL(baseUrl);
    const target = new URL(url);
    return target.hostname === base.hostname || target.hostname.endsWith(`.${base.hostname}`);
  } catch {
    return false;
  }
}

async function fetchXml(url, allowedBaseUrl) {
  if (allowedBaseUrl && !isSameDomainUrl(url, allowedBaseUrl)) {
    throw new Error(`Blocked off-domain sitemap fetch: ${url}`);
  }
  const response = await axios.get(url, {
    timeout: 10000,
    headers: { 'User-Agent': 'Trackly/1.0' },
    validateStatus: (s) => s < 400,
  });
  return response.data;
}

async function parseSitemapXml(xmlStr, depth = 0, allowedBaseUrl = null) {
  if (depth > 3) return [];
  const results = [];

  let parsed;
  try {
    parsed = await parser.parseStringPromise(xmlStr);
  } catch {
    return [];
  }

  // sitemapindex
  if (parsed.sitemapindex && parsed.sitemapindex.sitemap) {
    const sitemaps = parsed.sitemapindex.sitemap;
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
  if (parsed.urlset && parsed.urlset.url) {
    for (const entry of parsed.urlset.url) {
      const loc = entry.loc && entry.loc[0];
      if (loc) results.push({ url: loc, source: 'sitemap' });
    }
  }

  return results;
}

export async function parseSitemap(baseUrl) {
  const base = baseUrl.replace(/\/$/, '');
  const candidates = [`${base}/sitemap.xml`, `${base}/sitemap_index.xml`];
  const results = [];

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
