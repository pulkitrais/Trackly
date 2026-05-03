import axios from 'axios';

export async function fetchWaybackUrls(domain) {
  try {
    const response = await axios.get(
      `https://web.archive.org/cdx/search/cdx`,
      {
        params: {
          url: `${domain}/*`,
          output: 'json',
          fl: 'original',
          collapse: 'urlkey',
          limit: 500,
        },
        timeout: 15000,
        headers: { 'User-Agent': 'Trackly/1.0' },
      }
    );

    const data = response.data;
    if (!Array.isArray(data) || data.length < 2) return [];

    // First row is headers, skip it
    const urls = data.slice(1).map((row) => ({
      url: row[0],
      source: 'archive',
    }));

    return urls;
  } catch {
    return [];
  }
}
