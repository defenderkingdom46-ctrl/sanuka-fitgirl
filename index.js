const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { runProMaxForensic } = require('./engine');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const TEMP_DIR = path.join(__dirname, 'temp');
fs.ensureDirSync(TEMP_DIR);

// SSE clients
let clients = [];

app.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.flushHeaders();

  clients.push(res);

  req.on('close', () => {
    clients = clients.filter(c => c !== res);
  });
});

function sendLog(msg) {
  clients.forEach(c => c.write(`data: ${JSON.stringify(msg)}\n\n`));
}

// API
app.post('/api/extract', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).send("URL required");

  try {
    sendLog({ type: 'info', msg: `Starting scan: ${url}` });

    const result = await runProMaxForensic(url, TEMP_DIR, sendLog);

    sendLog({ type: 'success', msg: 'Scan complete' });

    setTimeout(() => {
      if (fs.existsSync(result.zipPath)) fs.unlinkSync(result.zipPath);
    }, 8 * 60 * 1000);

    res.json({
      success: true,
      download: `/api/download/${result.requestId}`,
      report: result.report
    });

  } catch (err) {
    sendLog({ type: 'error', msg: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/download/:id', (req, res) => {
  const file = path.join(TEMP_DIR, `${req.params.id}.zip`);
  if (!fs.existsSync(file)) return res.status(404).send("Expired");
  res.download(file);
});

app.listen(3000, () => console.log("🔥 CINEFy GOD Dashboard running"));
