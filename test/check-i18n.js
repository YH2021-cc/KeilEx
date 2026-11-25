const fs = require('fs');
const { STRINGS } = require('../src/i18n');
const files = [
  'src/controller.js',
  'src/ui/optionsPanel.js',
  'src/ui/itemsPanel.js',
  'media/webview/options.js',
  'media/webview/items.js',
];
const keys = new Set();
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(/(?:\bt|label)\(['"]([A-Za-z0-9_]+)['"]/g)) keys.add(match[1]);
}
const missing = [...keys].filter((key) => !STRINGS.zh[key]);
console.log('keys', keys.size, 'missing', missing);
