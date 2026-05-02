import { Router } from 'express';
import { scans } from './scan.js';

const router = Router();

router.get('/export/:id', (req, res) => {
  const scan = scans.get(req.params.id);
  if (!scan) return res.status(404).json({ error: 'Scan not found' });

  const format = req.query.format === 'csv' ? 'csv' : 'json';
  const results = scan.results || [];

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="trackly-${scan.domain}-${scan.id.slice(0, 8)}.json"`
    );
    return res.json(results);
  }

  // CSV
  const header = 'url,status,responseTime,source';
  const rows = results.map((r) => {
    const url = `"${String(r.url || '').replace(/"/g, '""')}"`;
    const status = r.status ?? '';
    const responseTime = r.responseTime ?? '';
    const source = `"${String(r.source || '').replace(/"/g, '""')}"`;
    return `${url},${status},${responseTime},${source}`;
  });

  const csv = [header, ...rows].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="trackly-${scan.domain}-${scan.id.slice(0, 8)}.csv"`
  );
  return res.send(csv);
});

export default router;
