import pLimit from 'p-limit';
import axios from 'axios';
import { crawl } from './crawler.js';
import { getWordlistPaths } from './wordlist.js';
import { fetchWaybackUrls } from './wayback.js';
import { parseSitemap } from './sitemap.js';

function normalizeUrlKey(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    let path = parsed.pathname.toLowerCase().replace(/\/+$/, '') || '/';
    return `${parsed.hostname}${path}${parsed.search}`;
  } catch {
    return url.toLowerCase();
  }
}

function deduplicateUrls(urlEntries) {
  const seen = new Set();
  const unique = [];
  for (const entry of urlEntries) {
    const key = normalizeUrlKey(entry.url);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(entry);
    }
  }
  return unique;
}

export async function checkUrl(url, retries = 2) {
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
        source: null, // will be set by caller
      };
    } catch (err) {
      if (attempt === retries) {
        return {
          url,
          status: null,
          responseTime: Date.now() - start,
          source: null,
          error: err.code || err.message,
        };
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  }
}

export async function runScan(scanId, domain, baseUrl, scans) {
  const update = (fields) => {
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
