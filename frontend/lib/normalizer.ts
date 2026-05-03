export function normalizeDomain(input: string): { domain: string; baseUrl: string } {
  if (typeof input !== 'string' || input.length > 2048) {
    throw new Error('Invalid domain input');
  }
  // Remove trailing slashes without backtracking regex
  let str = input.trim();
  while (str.endsWith('/')) str = str.slice(0, -1);

  if (!/^https?:\/\//i.test(str)) {
    str = 'https://' + str;
  }

  let url: URL;
  try {
    url = new URL(str);
  } catch {
    throw new Error('Invalid domain or URL');
  }

  const domain = url.hostname.toLowerCase();
  if (!domain) throw new Error('Could not extract hostname');

  const baseUrl = `${url.protocol}//${domain}`;
  return { domain, baseUrl };
}
