import dns from 'dns/promises';

const BLOCKED_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^::1$/,
  /^0\.0\.0\.0$/,
  /^169\.254\./,
  /^fc00:/i,
  /^fe80:/i,
];

function isBlockedIp(ip: string): boolean {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(ip));
}

export async function validateDomain(domain: string): Promise<{ valid: boolean }> {
  if (!domain || typeof domain !== 'string') {
    throw new Error('Invalid domain');
  }

  const hostnameRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  if (!hostnameRegex.test(domain)) {
    throw new Error('Invalid hostname format');
  }

  if (/^localhost$/i.test(domain)) {
    throw new Error('Scanning localhost is not allowed');
  }

  let addresses: string[];
  try {
    addresses = await dns.resolve(domain);
  } catch {
    // Also try resolve4/resolve6
    try {
      addresses = await dns.resolve4(domain);
    } catch {
      try {
        addresses = await dns.resolve6(domain);
      } catch {
        throw new Error(`Could not resolve domain: ${domain}`);
      }
    }
  }

  for (const ip of addresses) {
    if (isBlockedIp(ip)) {
      throw new Error(`Domain resolves to a blocked/private IP address: ${ip}`);
    }
  }

  return { valid: true };
}
