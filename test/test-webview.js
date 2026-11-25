'use strict';

const assert = require('assert');
const path = require('path');
const puppeteer = require('puppeteer-core');

const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const optionsUrl = 'file:///F:/KeilEx/test/preview-options.html';
const itemsUrl = 'file:///F:/KeilEx/test/preview-items.html';
const sidebarUrl = 'file:///F:/KeilEx/test/preview-sidebar.html';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: edge,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  });
  const errors = [];
  let messages;
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
    });
    await page.evaluateOnNewDocument(() => {
      window.__messages = [];
      window.acquireVsCodeApi = () => ({
        postMessage: (msg) => window.__messages.push(msg),
        getState: () => null,
        setState: () => {},
      });
    });
    await page.goto(optionsUrl, { waitUntil: 'load' });
    await page.waitForSelector('.tab');
    assert.strictEqual(await page.$$eval('.tab', (els) => els.length), 10, '10 option tabs');
    assert.strictEqual(await page.$eval('.tab.active', (el) => el.dataset.tab), 'target', 'target tab active');
    assert((await page.$$eval('.row, .check', (els) => els.length)) > 0, 'fields rendered');
    const compilerText = await page.$eval('#compilerSelect', (el) => el.textContent);
    assert(compilerText.includes('ARMCC'), 'ARM compiler choices');
    await page.click('.xml-btn');
    assert.strictEqual(await page.$eval('#rawOverlay', (el) => el.classList.contains('show')), true, 'raw XML modal');
    await page.click('.raw-title .x');
    await page.click('.tab[data-tab="c"]');
    assert.strictEqual(await page.$eval('.tab.active', (el) => el.dataset.tab), 'c', 'switch tab');
    assert((await page.$$eval('.path-row', (els) => els.length)) > 0, 'include paths listed');
    await page.click('.path-row .path-open');
    messages = await page.evaluate(() => window.__messages);
    assert(messages.some((m) => m.type === 'openIncludePath'), 'open include path message');
    await page.$eval('#f_c_cDefine', (el) => {
      el.value = 'A,B,C';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.click('.tab[data-tab="debug"]');
    await page.click('.panel[data-tab="debug"] .btn');
    assert.strictEqual(await page.$eval('.debug-overlay', (el) => el.classList.contains('show')), true, 'debug settings dialog');
    assert.strictEqual(await page.$$eval('.debug-tab', (els) => els.length), 4, 'debug tabs');
    await page.click('.debug-tab[data-tab="flash"]');
    assert(await page.$('.flash-table'), 'flash algorithm table');
    await page.click('.debug-foot button.primary');
    messages = await page.evaluate(() => window.__messages);
    const driverApply = messages.find((m) => m.type === 'applyDriverSetup');
    assert(driverApply && driverApply.settings && driverApply.settings.ramStart, 'driver setup apply message');
    assert.strictEqual(await page.$eval('.debug-overlay', (el) => el.classList.contains('show')), false, 'debug dialog closed');
    messages = await page.evaluate(() => window.__messages);
    assert(messages.some((m) => m.type === 'dirty' && m.dirty === true), 'dirty message');
    await page.evaluate(() => {
      const apply = Array.from(document.querySelectorAll('.footer .btn')).find((b) => b.textContent === '应用');
      apply.click();
    });
    messages = await page.evaluate(() => window.__messages);
    const apply = messages.find((m) => m.type === 'apply');
    assert(apply, 'apply message');
    assert(apply.values && apply.values.cDefine === 'A,B,C', 'apply values');
    console.log('PASS options webview');

    await page.goto(itemsUrl, { waitUntil: 'load' });
    await page.waitForSelector('.dlg');
    assert.strictEqual(await page.$$eval('.dlg-tab', (els) => els.length), 4, '4 item tabs');
    assert.strictEqual(await page.$$eval('.pane', (els) => els.length), 3, '3 panes');
    assert.strictEqual(await page.$$eval('.pane:nth-child(1) .krow', (els) => els.length), 1, 'one target');
    assert.strictEqual(await page.$$eval('.files-pane .krow', (els) => els.length), 18, 'all files listed');
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.pane:nth-child(2) .krow'));
      const user = rows.find((r) => r.textContent.includes('User'));
      user.click();
    });
    assert.strictEqual(await page.$$eval('.files-pane .krow', (els) => els.length), 18, 'all files remain visible');
    await page.click('.file-mode .seg-btn:nth-child(2)');
    assert.strictEqual(await page.$$eval('.files-pane .krow', (els) => els.length), 3, 'User group filter has 3 files');
    await page.evaluate(() => { window.__messages = []; });
    await page.evaluate(() => {
      const row = document.querySelector('.files-pane .krow');
      row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    });
    messages = await page.evaluate(() => window.__messages);
    assert(messages.some((m) => m.type === 'openFile'), 'double-click opens file');
    await page.click('.action-row .btn:last-child');
    messages = await page.evaluate(() => window.__messages);
    assert(messages.some((m) => m.type === 'addFiles' && m.groupName === 'User'), 'addFiles message');
    await page.click('.dlg-tab[data-tab="folders"]');
    assert(await page.$('.table'), 'folders table');
    console.log('PASS items webview');

    await page.goto(sidebarUrl, { waitUntil: 'load' });
    await page.waitForSelector('.project-card');
    assert.strictEqual(await page.$$eval('.abtn', (els) => els.length), 3, '3 sidebar actions');
    assert.strictEqual(await page.$$eval('.sbtn', (els) => els.length), 3, '3 sidebar subactions');
    assert((await page.$eval('.tree', (el) => el.textContent)).includes('Template'), 'tree target');
    await page.evaluate(() => { window.__messages = []; });
    await page.click('.abtn');
    messages = await page.evaluate(() => window.__messages);
    assert(messages.some((m) => m.type === 'build' && m.mode === 'build'), 'sidebar build message');
    await page.click('.tree-mode:nth-child(2)');
    messages = await page.evaluate(() => window.__messages);
    assert(messages.some((m) => m.type === 'readDir'), 'directory tree requests readDir');
    const rootDir = await page.evaluate(() => window.__KEIL__.projectDir);
    await page.evaluate((root) => {
      window.postMessage({
        type: 'dirEntries',
        path: root,
        entries: [
          { name: 'Src', path: root + '\\Src', kind: 'dir' },
          { name: 'main.c', path: root + '\\main.c', kind: 'file' },
        ],
      }, '*');
    }, rootDir);
    assert.strictEqual(await page.$$eval('.fs-tree .row.dir', (els) => els.length), 2, 'directory tree root and subdir');
    assert.strictEqual(await page.$$eval('.fs-tree .row.fs-file', (els) => els.length), 1, 'directory tree file');
    await page.evaluate(() => { window.__messages = []; });
    await page.click('.fs-tree .row.fs-file');
    messages = await page.evaluate(() => window.__messages);
    assert(messages.some((m) => m.type === 'openFile'), 'directory tree file opens');
    await page.evaluate(() => { window.__messages = []; });
    await page.click('.side-head .icons button:last-child');
    messages = await page.evaluate(() => window.__messages);
    assert(messages.some((m) => m.type === 'closeProject'), 'sidebar close project message');
    console.log('PASS sidebar webview');

    assert.deepStrictEqual(errors, [], `no webview errors: ${errors.join('; ')}`);
    console.log('ALL WEBVIEW PASS');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('FAIL', err);
  process.exitCode = 1;
});
