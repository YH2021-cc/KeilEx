'use strict';

const { child, children, textOf, setText, ensureChild } = require('./xml');

function hexValue(value) {
  const text = String(value == null ? '' : value).trim();
  if (!text) return '';
  return text.replace(/^0x/i, '').toUpperCase();
}

function displayHex(value) {
  const text = String(value == null ? '' : value).trim();
  if (!text) return '';
  const hex = text.replace(/^0x/i, '');
  return `0x${hex.padStart(8, '0').toUpperCase()}`;
}

function findRegistryEntry(project, targetName) {
  const target = project.getTarget(targetName);
  if (!target || !target.optElement) return null;
  const targetOption = child(target.optElement, 'TargetOption');
  if (!targetOption) return null;
  const registry = child(targetOption, 'TargetDriverDllRegistry');
  if (!registry) return null;
  const entries = children(registry, 'SetRegEntry');
  const debugOpt = child(targetOption, 'DebugOpt');
  const mon = debugOpt ? textOf(debugOpt, 'pMon') : '';
  const driver = String(mon || '').split(/[\\/]/).pop().replace(/\.dll$/i, '').toLowerCase();
  let fallback = null;
  for (const entry of entries) {
    const name = textOf(entry, 'Name');
    if (!name) continue;
    const key = textOf(entry, 'Key').toLowerCase();
    if (driver && key && (key.includes(driver) || driver.includes(key))) return { entry, name };
    if (!fallback && /(?:^|\s)-F[ON]/.test(name)) fallback = { entry, name };
  }
  if (fallback) return fallback;
  return entries.length ? { entry: entries[0], name: textOf(entries[0], 'Name') } : null;
}

function readDriverSetup(project, targetName) {
  const found = findRegistryEntry(project, targetName);
  if (!found || !found.name) return null;
  const text = found.name;
  const pick = (flag) => {
    const match = new RegExp(`(?:^|\\s)-${flag}([^\\s]+)`).exec(text);
    return match ? match[1] : '';
  };
  return {
    ramStart: displayHex(pick('FD')),
    ramSize: displayHex(pick('FC')),
    algorithm: (/-FF0([^\s]+)/.exec(text) || [])[1] || '',
    algorithmStart: displayHex(pick('FS')),
    algorithmSize: displayHex(pick('FL')),
    flashOptions: pick('FO'),
    connect: pick('C'),
    reset: pick('A'),
    raw: text,
  };
}

async function applyDriverSetup(project, targetName, settings) {
  const found = findRegistryEntry(project, targetName);
  if (!found || !found.entry) return 0;
  let text = found.name || '';
  let changed = 0;
  const replaceFlag = (flag, value, digitsOnly) => {
    if (value == null || value === '') return;
    const next = digitsOnly ? hexValue(value) : String(value).replace(/\s+/g, '');
    if (!next) return;
    const re = new RegExp(`(?:^|\\s)-${flag}([^\\s]+)`);
    if (re.test(text)) {
      const before = text;
      text = text.replace(re, (match, oldValue) => {
        const prefix = match.slice(0, match.length - oldValue.length);
        return prefix + next;
      });
      if (text !== before) changed += 1;
    } else {
      text += ` -${flag}${next}`;
      changed += 1;
    }
  };
  replaceFlag('FD', settings.ramStart, true);
  replaceFlag('FC', settings.ramSize, true);
  replaceFlag('FF0', settings.algorithm, false);
  replaceFlag('FS', settings.algorithmStart, true);
  replaceFlag('FL', settings.algorithmSize, true);
  if (changed) {
    setText(found.entry, 'Name', text);
    await project.saveOptions();
  }
  return {
    changed,
    unsupported: ['connect', 'reset', 'erase', 'program', 'verify', 'resetRun'],
  };
}

module.exports = { readDriverSetup, applyDriverSetup };
