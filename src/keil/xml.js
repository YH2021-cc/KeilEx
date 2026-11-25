'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');

class XmlError extends Error {
  constructor(message) {
    super(message);
    this.name = 'XmlError';
  }
}

function parseXml(text, label = 'XML') {
  const errors = [];
  const parser = new DOMParser({
    locator: {},
    onError: (level, msg) => {
      if (level !== 'warning') errors.push(String(msg));
    },
  });
  let doc;
  try {
    doc = parser.parseFromString(String(text || ''), 'text/xml');
  } catch (err) {
    throw new XmlError(`${label}: ${err && err.message ? err.message : err}`);
  }
  if (!doc || !doc.documentElement) {
    throw new XmlError(`${label}: 不是有效的 XML 文件`);
  }
  if (errors.length) {
    throw new XmlError(`${label}: ${errors[0]}`);
  }
  return doc;
}

function isElement(node) {
  return !!node && node.nodeType === 1;
}

function children(node, tag) {
  if (!node) return [];
  const out = [];
  const list = node.childNodes || [];
  for (let i = 0; i < list.length; i += 1) {
    const n = list[i];
    if (isElement(n) && (!tag || n.nodeName === tag)) out.push(n);
  }
  return out;
}

function child(node, tag) {
  if (!node) return null;
  const list = node.childNodes || [];
  for (let i = 0; i < list.length; i += 1) {
    const n = list[i];
    if (isElement(n) && n.nodeName === tag) return n;
  }
  return null;
}

function childAt(node, index) {
  const list = children(node);
  return list[index] || null;
}

function textOf(node, tag, fallback = '') {
  const c = tag ? child(node, tag) : node;
  if (!c) return fallback;
  const value = c.textContent;
  return value == null ? fallback : String(value);
}

function setText(parent, tag, value) {
  if (!parent) return null;
  let c = child(parent, tag);
  if (!c) {
    c = parent.ownerDocument.createElement(tag);
    parent.appendChild(c);
  }
  c.textContent = value == null ? '' : String(value);
  return c;
}

function setNodeText(node, value) {
  if (!node) return;
  node.textContent = value == null ? '' : String(value);
}

function boolOf(node, tag, fallback = false) {
  const raw = String(textOf(node, tag, fallback ? '1' : '0')).trim();
  return raw === '1' || raw.toLowerCase() === 'true';
}

function setBool(parent, tag, value) {
  return setText(parent, tag, value ? '1' : '0');
}

function ensureChild(parent, tag) {
  let c = child(parent, tag);
  if (!c) {
    c = parent.ownerDocument.createElement(tag);
    parent.appendChild(c);
  }
  return c;
}

function removeChild(parent, tag) {
  if (!parent) return false;
  const c = child(parent, tag);
  if (!c) return false;
  parent.removeChild(c);
  return true;
}

function removeNode(node) {
  if (node && node.parentNode) node.parentNode.removeChild(node);
}

function getNodeByPath(root, segments) {
  let node = root;
  for (const segment of segments || []) {
    node = child(node, segment);
    if (!node) return null;
  }
  return node;
}

function ensureNodeByPath(root, segments) {
  let node = root;
  for (const segment of segments || []) {
    node = ensureChild(node, segment);
  }
  return node;
}

function serializeXml(doc) {
  if (!doc) return '';
  let text = new XMLSerializer().serializeToString(doc);
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!/^\s*<\?xml\b/i.test(text)) {
    text = '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n' + text;
  }
  return text.replace(/\n/g, '\r\n');
}

function innerXml(node) {
  if (!node) return '';
  let text = '';
  const list = node.childNodes || [];
  const serializer = new XMLSerializer();
  for (let i = 0; i < list.length; i += 1) {
    text += serializer.serializeToString(list[i]);
  }
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function parseFragment(xml, label = 'XML fragment') {
  const wrapped = `<KeilFragment>${String(xml || '')}</KeilFragment>`;
  return parseXml(wrapped, label);
}

function replaceChildrenFromXml(targetNode, xml) {
  const fragmentDoc = parseFragment(xml, '目标 XML');
  const fragmentRoot = fragmentDoc.documentElement;
  const doc = targetNode.ownerDocument;
  while (targetNode.firstChild) targetNode.removeChild(targetNode.firstChild);
  const list = Array.from(fragmentRoot.childNodes || []);
  for (const n of list) {
    const imported = doc.importNode ? doc.importNode(n, true) : n.cloneNode(true);
    targetNode.appendChild(imported);
  }
}

async function readXmlFile(filePath) {
  const text = await fsp.readFile(filePath, 'utf8');
  return { text, doc: parseXml(text, path.basename(filePath)) };
}

async function backupFile(filePath) {
  const backupPath = `${filePath}.keil-studio.bak`;
  try {
    await fsp.access(backupPath, fs.constants.F_OK);
    return backupPath;
  } catch {
    try {
      await fsp.copyFile(filePath, backupPath);
      return backupPath;
    } catch {
      return null;
    }
  }
}

async function writeXmlFile(filePath, doc, options = {}) {
  const text = serializeXml(doc);
  // Validate before touching the original file.
  parseXml(text, path.basename(filePath));
  if (options.backup !== false) await backupFile(filePath);
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await fsp.writeFile(tmp, text, 'utf8');
  try {
    await fsp.copyFile(tmp, filePath);
  } finally {
    try {
      await fsp.unlink(tmp);
    } catch {
      /* ignore */
    }
  }
  return text;
}

function firstElement(node) {
  const list = node && node.childNodes ? node.childNodes : [];
  for (let i = 0; i < list.length; i += 1) {
    if (isElement(list[i])) return list[i];
  }
  return null;
}

module.exports = {
  XmlError,
  parseXml,
  isElement,
  child,
  children,
  childAt,
  firstElement,
  textOf,
  setText,
  setNodeText,
  boolOf,
  setBool,
  ensureChild,
  removeChild,
  removeNode,
  getNodeByPath,
  ensureNodeByPath,
  serializeXml,
  innerXml,
  parseFragment,
  replaceChildrenFromXml,
  readXmlFile,
  writeXmlFile,
  backupFile,
};
