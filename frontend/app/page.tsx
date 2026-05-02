'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ScanResult {
  url: string;
  status: number | null;
  responseTime: number;
  source: string;
  error?: string;
}

interface ScanState {
  id: string;
  domain: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  progress: number;
  results: ScanResult[];
  error: string | null;
}

function StatusBadge({ status }: { status: number | null }) {
  if (status === null) {
    return (
      <span className="inline-block px-2 py-0.5 text-xs font-mono rounded" style={{ background: '#e5e5e5', color: '#000' }}>
        ERR
      </span>
    );
  }
  if (status >= 200 && status < 300) {
    return (
      <span className="inline-block px-2 py-0.5 text-xs font-mono rounded" style={{ background: '#000', color: '#fff' }}>
        {status}
      </span>
    );
  }
  if (status >= 300 && status < 400) {
    return (
      <span className="inline-block px-2 py-0.5 text-xs font-mono rounded" style={{ background: '#555', color: '#fff' }}>
        {status}
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 text-xs font-mono rounded" style={{ background: '#e5e5e5', color: '#000' }}>
      {status}
    </span>
  );
}

export default function Home() {
  const [domain, setDomain] = useState('');
  const [scanId, setScanId] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanState | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputError, setInputError] = useState('');
  const [sortField, setSortField] = useState<keyof ScanResult>('url');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterText, setFilterText] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollScan = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/scan/${id}`);
        if (!res.ok) {
          stopPolling();
          return;
        }
        const data: ScanState = await res.json();
        setScan(data);
        if (data.status === 'complete' || data.status === 'error') {
          stopPolling();
          setLoading(false);
        }
      } catch {
        stopPolling();
        setLoading(false);
      }
    },
    [stopPolling]
  );

  useEffect(() => {
    if (scanId) {
      stopPolling();
      pollRef.current = setInterval(() => pollScan(scanId), 1500);
    }
    return () => stopPolling();
  }, [scanId, pollScan, stopPolling]);

  const handleScan = useCallback(async () => {
    const trimmed = domain.trim();
    if (!trimmed) {
      setInputError('Please enter a domain or URL.');
      return;
    }
    setInputError('');
    setLoading(true);
    setScan(null);
    setScanId(null);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInputError(data.error || 'Scan failed.');
        setLoading(false);
        return;
      }
      setScanId(data.scan_id);
    } catch {
      setInputError('Could not connect to the backend. Make sure it is running on port 3001.');
      setLoading(false);
    }
  }, [domain]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleScan();
  };

  const handleNewScan = () => {
    stopPolling();
    setScan(null);
    setScanId(null);
    setDomain('');
    setInputError('');
    setLoading(false);
    setFilterText('');
  };

  const handleExport = (format: 'csv' | 'json') => {
    if (!scanId) return;
    window.open(`/api/export/${scanId}?format=${format}`, '_blank');
  };

  const handleSort = (field: keyof ScanResult) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const results = scan?.results ?? [];
  const filtered = results.filter(
    (r) =>
      !filterText ||
      r.url.toLowerCase().includes(filterText.toLowerCase()) ||
      String(r.status ?? '').includes(filterText) ||
      (r.source ?? '').toLowerCase().includes(filterText.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortField] ?? '';
    const vb = b[sortField] ?? '';
    if (va < vb) return sortDir === 'asc' ? -1 : 1;
    if (va > vb) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const active = results.filter((r) => r.status !== null && r.status >= 200 && r.status < 300).length;
  const redirects = results.filter((r) => r.status !== null && r.status >= 300 && r.status < 400).length;
  const errors = results.filter((r) => r.status === null || r.status >= 400).length;

  const SortIcon = ({ field }: { field: keyof ScanResult }) => {
    if (sortField !== field) return <span className="ml-1 opacity-30">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <main className="min-h-screen" style={{ background: '#ffffff', color: '#000000' }}>
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold tracking-tight font-mono mb-2">Trackly</h1>
          <p className="text-base" style={{ color: '#555' }}>
            Endpoint &amp; Path Discovery Tool
          </p>
        </div>

        {/* Input Section */}
        {!scan && (
          <div className="max-w-xl mx-auto">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter domain or URL (e.g. example.com)"
                disabled={loading}
                className="flex-1 px-4 py-3 text-sm border rounded outline-none focus:ring-2 focus:ring-black"
                style={{ borderColor: '#e5e5e5', background: '#fff' }}
              />
              <button
                onClick={handleScan}
                disabled={loading}
                className="px-6 py-3 text-sm font-medium rounded transition-opacity"
                style={{ background: '#000', color: '#fff', opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Starting…' : 'Scan'}
              </button>
            </div>
            {inputError && (
              <p className="text-sm mt-1" style={{ color: '#cc0000' }}>
                {inputError}
              </p>
            )}
            <p className="text-xs mt-3 text-center" style={{ color: '#999' }}>
              For authorized testing only. Do not scan systems you don&apos;t own.
            </p>
          </div>
        )}

        {/* Progress Section */}
        {scan && (scan.status === 'pending' || scan.status === 'running') && (
          <div className="max-w-xl mx-auto mt-4">
            <p className="text-sm font-medium mb-3">Scanning {scan.domain}…</p>
            <div className="w-full rounded-full h-2 mb-3" style={{ background: '#e5e5e5' }}>
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${scan.progress}%`, background: '#000' }}
              />
            </div>
            <p className="text-xs" style={{ color: '#555' }}>
              {results.length} paths found &middot; {active} active &middot; {scan.progress}% complete
            </p>
          </div>
        )}

        {/* Error */}
        {scan && scan.status === 'error' && (
          <div className="max-w-xl mx-auto mt-4">
            <p className="text-sm mb-3" style={{ color: '#cc0000' }}>
              Scan error: {scan.error}
            </p>
            <button
              onClick={handleNewScan}
              className="px-4 py-2 text-sm rounded border"
              style={{ borderColor: '#e5e5e5', background: '#f5f5f5', cursor: 'pointer' }}
            >
              New Scan
            </button>
          </div>
        )}

        {/* Results Section */}
        {scan && scan.status === 'complete' && (
          <div className="mt-6">
            {/* Stats + Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex gap-4 text-sm font-medium">
                <span>
                  <span className="inline-block w-3 h-3 rounded-full mr-1" style={{ background: '#000', verticalAlign: 'middle' }} />
                  {active} Active
                </span>
                <span>
                  <span className="inline-block w-3 h-3 rounded-full mr-1" style={{ background: '#555', verticalAlign: 'middle' }} />
                  {redirects} Redirects
                </span>
                <span>
                  <span className="inline-block w-3 h-3 rounded-full mr-1" style={{ background: '#e5e5e5', border: '1px solid #ccc', verticalAlign: 'middle' }} />
                  {errors} Errors
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('csv')}
                  className="px-3 py-1.5 text-xs rounded border"
                  style={{ borderColor: '#e5e5e5', background: '#f5f5f5', cursor: 'pointer' }}
                >
                  Download CSV
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="px-3 py-1.5 text-xs rounded border"
                  style={{ borderColor: '#e5e5e5', background: '#f5f5f5', cursor: 'pointer' }}
                >
                  Download JSON
                </button>
                <button
                  onClick={handleNewScan}
                  className="px-3 py-1.5 text-xs rounded font-medium"
                  style={{ background: '#000', color: '#fff', cursor: 'pointer' }}
                >
                  New Scan
                </button>
              </div>
            </div>

            {/* Filter */}
            <div className="mb-3">
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter results…"
                className="px-3 py-2 text-sm border rounded outline-none w-full max-w-xs focus:ring-2 focus:ring-black"
                style={{ borderColor: '#e5e5e5' }}
              />
            </div>

            {/* Table */}
            <div className="border rounded overflow-hidden" style={{ borderColor: '#e5e5e5' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: '#f9f9f9', borderBottom: '1px solid #e5e5e5' }}>
                      <th
                        className="text-left px-4 py-3 font-medium cursor-pointer select-none"
                        onClick={() => handleSort('url')}
                      >
                        URL Path <SortIcon field="url" />
                      </th>
                      <th
                        className="text-left px-4 py-3 font-medium cursor-pointer select-none w-24"
                        onClick={() => handleSort('status')}
                      >
                        Status <SortIcon field="status" />
                      </th>
                      <th
                        className="text-left px-4 py-3 font-medium cursor-pointer select-none w-32"
                        onClick={() => handleSort('responseTime')}
                      >
                        Response Time <SortIcon field="responseTime" />
                      </th>
                      <th
                        className="text-left px-4 py-3 font-medium cursor-pointer select-none w-28"
                        onClick={() => handleSort('source')}
                      >
                        Source <SortIcon field="source" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-sm" style={{ color: '#999' }}>
                          No results found.
                        </td>
                      </tr>
                    )}
                    {sorted.map((r, i) => (
                      <tr
                        key={i}
                        style={{ borderTop: i > 0 ? '1px solid #f0f0f0' : undefined }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                      >
                        <td className="px-4 py-2.5 font-mono text-xs break-all">
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                            style={{ color: '#000' }}
                          >
                            {r.url}
                          </a>
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs" style={{ color: '#555' }}>
                          {r.responseTime != null ? `${r.responseTime}ms` : '—'}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className="inline-block px-2 py-0.5 text-xs rounded font-mono"
                            style={{ background: '#f5f5f5', color: '#333' }}
                          >
                            {r.source ?? '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-xs mt-2" style={{ color: '#999' }}>
              Showing {sorted.length} of {results.length} results
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
