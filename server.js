const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Parse URL
  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './index.html';
  }
  
  // Handle API endpoint for price updates
  if (req.url === '/api/update-prices' && req.method === 'POST') {
    // Trigger price update
    const { loadLivePrices } = require('./load-live-prices');
    
    loadLivePrices()
      .then(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Prices updated' }));
      })
      .catch(error => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      });
    return;
  }
  
  // Serve static files
  const extname = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - File Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`, 'utf-8');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                 LLM PRICING SERVER RUNNING                  ║
╠════════════════════════════════════════════════════════════╣
║                                                              ║
║  🌐 Web Interface:  http://localhost:${PORT}                     ║
║  📊 JSON API:       http://localhost:${PORT}/data/llm-pricing.json ║
║  📖 API Docs:       http://localhost:${PORT}/api.html              ║
║                                                              ║
║  Press Ctrl+C to stop the server                            ║
║                                                              ║
╚════════════════════════════════════════════════════════════╝
  `);
});