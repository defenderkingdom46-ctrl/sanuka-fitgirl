const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const axios = require('axios');
const archiver = require('archiver');
const fs = require('fs-extra');
const path = require('path');

puppeteer.use(StealthPlugin());

function normalizeUrl(u) {
  try { const url = new URL(u); url.search = ''; return url.toString(); }
  catch { return u; }
}

function createStore() { return {}; }

function addEndpoint(store, data) {
  const key = normalizeUrl(data.url);

  if (!store[key]) store[key] = { url: key, methods: {} };

  if (!store[key].methods[data.method]) {
    store[key].methods[data.method] = { count: 0, statuses: {} };
  }

  const m = store[key].methods[data.method];
  m.count++;
  m.statuses[data.status] = (m.statuses[data.status] || 0) + 1;
}

async function runProMaxForensic(url, tempDir, log) {
  const requestId = `CINEFy_${Date.now()}`;
  const zipPath = path.join(tempDir, `${requestId}.zip`);

  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();

  const endpoints = createStore();

  page.on("response", async (res) => {
    const req = res.request();
    const u = res.url();

    if (!u.includes('/api') && !u.includes('graphql')) return;

    addEndpoint(endpoints, {
      url: u,
      method: req.method(),
      status: res.status()
    });

    log({ type: 'log', msg: `${req.method()} ${u}` });
  });

  log({ type: 'step', msg: 'Loading page...' });

  await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 }).catch(() => {});

  const html = await page.content();

  await browser.close();

  log({ type: 'step', msg: 'Packaging data...' });

  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip');
  archive.pipe(output);

  archive.append(html, { name: 'index.html' });
  archive.append(JSON.stringify(endpoints, null, 2), { name: 'Endpoint_Map.json' });

  await archive.finalize();

  return { requestId, zipPath, report: endpoints };
}

module.exports = { runProMaxForensic };
