export function normalizeDomain(input) {
  let str = input.trim().replace(/\/+$/, '');

  if (!/^https?:\/\//i.test(str)) {
    str = 'https://' + str;
  }

  let url;
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
