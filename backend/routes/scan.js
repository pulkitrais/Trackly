import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { validateDomain } from '../utils/validator.js';
import { normalizeDomain } from '../utils/normalizer.js';
import { runScan } from '../utils/scanner.js';

const router = Router();
export const scans = new Map();

router.post('/scan', async (req, res) => {
  const { domain } = req.body;
  if (!domain || typeof domain !== 'string') {
    return res.status(400).json({ error: 'domain is required' });
  }

  let normalized;
  try {
    normalized = normalizeDomain(domain.trim());
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  try {
    await validateDomain(normalized.domain);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const scan_id = uuidv4();
  scans.set(scan_id, {
    id: scan_id,
    domain: normalized.domain,
    status: 'pending',
    progress: 0,
    results: [],
    error: null,
    createdAt: new Date().toISOString(),
  });

  // Fire and forget
  runScan(scan_id, normalized.domain, normalized.baseUrl, scans).catch((err) => {
    const scan = scans.get(scan_id);
    if (scan) {
      scan.status = 'error';
      scan.error = err.message;
    }
  });

  return res.json({ scan_id });
});

router.get('/scan/:id', (req, res) => {
  const scan = scans.get(req.params.id);
  if (!scan) return res.status(404).json({ error: 'Scan not found' });
  return res.json(scan);
});

export default router;
