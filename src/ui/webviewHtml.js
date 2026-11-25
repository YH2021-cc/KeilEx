'use strict';

const fs = require('fs');
const path = require('path');

function readAsset(extensionPath, name) {
  return fs.readFileSync(path.join(extensionPath, 'media', 'webview', name), 'utf8');
}

function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function pageShell(options) {
  const { title, css, js, data, nonce, cspSource, language } = options;
  return `<!DOCTYPE html>
<html lang="${language === 'en' ? 'en' : 'zh-CN'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${cspSource};">
<title>${escapeHtml(title)}</title>
<style>
${css}
</style>
</head>
<body>
<div id="app" class="app"></div>
<script nonce="${nonce}">window.__KEIL__ = ${safeJson(data)};</script>
<script nonce="${nonce}">
${js}
</script>
</body>
</html>`;
}

function optionsHtml({ extensionPath, nonce, cspSource, data }) {
  return pageShell({
    title: 'KeilEx · 目标选项',
    css: readAsset(extensionPath, 'options.css'),
    js: readAsset(extensionPath, 'options.js'),
    data,
    nonce,
    cspSource,
    language: data.language,
  });
}

function itemsHtml({ extensionPath, nonce, cspSource, data }) {
  return pageShell({
    title: 'KeilEx · 项目项',
    css: readAsset(extensionPath, 'items.css'),
    js: readAsset(extensionPath, 'items.js'),
    data,
    nonce,
    cspSource,
    language: data.language,
  });
}

function sidebarHtml({ extensionPath, nonce, cspSource, data }) {
  return pageShell({
    title: 'KeilEx · 工程',
    css: readAsset(extensionPath, 'sidebar.css'),
    js: readAsset(extensionPath, 'sidebar.js'),
    data,
    nonce,
    cspSource,
    language: data.language,
  });
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { optionsHtml, itemsHtml, sidebarHtml };
