export interface ScanResult {
  url: string;
  status: number | null;
  responseTime: number;
  source: string;
  error?: string;
}

export interface ScanState {
  id: string;
  domain: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  progress: number;
  results: ScanResult[];
  error: string | null;
  createdAt: string;
}

// Module-level store — persists across requests within the same serverless instance
const scans = new Map<string, ScanState>();

export default scans;
