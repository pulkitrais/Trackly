# Trackly

A minimal, production-ready URL path and endpoint discovery tool.

## Features
- Live crawling of internal links
- Wordlist enumeration of common paths
- Wayback Machine historical URL discovery
- Sitemap.xml parsing
- Real-time progress updates
- SSRF protection (blocks private/internal IPs)
- CSV and JSON export
- No login required

## Stack
- **Frontend**: Next.js 14 + Tailwind CSS
- **Backend**: Express.js (Node.js)

## Setup

### Backend
```bash
cd backend
npm install
npm start   # Starts on port 3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev  # Starts on port 3000
```

Then open http://localhost:3000

## API

### Start a Scan
```
POST http://localhost:3001/scan
{"domain": "example.com"}
→ {"scan_id": "..."}
```

### Get Results
```
GET http://localhost:3001/scan/:id
→ {id, domain, status, progress, results}
```

### Export
```
GET http://localhost:3001/export/:id?format=csv
GET http://localhost:3001/export/:id?format=json
```