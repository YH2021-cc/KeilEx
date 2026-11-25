'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function runVersion(exe, args) {
  try {
    return execFileSync(exe, args, {
      encoding: 'utf8',
      timeout: 4000,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    return String((err && (err.stdout || err.stderr)) || '');
  }
}

function armccEntry(exe) {
  const output = runVersion(exe, ['--vsn']);
  const match = /ARM Compiler\s+(\d+)\.(\d+)(?:\s+update\s+(\d+))?\s+\(build\s+(\d+)\)/i.exec(output);
  if (!match) return null;
  const major = match[1];
  const minor = match[2];
  const update = match[3] || '';
  const build = match[4] || '0';
  const version = `V${major}.${minor}${update ? ` update ${update}` : ''} (build ${build})`;
  const code = `${major}${minor.padStart(2, '0')}${build.padStart(4, '0')}`;
  return {
    value: `${code}::${version}::ARMCC`,
    label: `ARMCC ${version}`,
    kind: 'ARMCC',
    exe,
    code,
  };
}

function armclangEntry(exe) {
  const output = runVersion(exe, ['--version']);
  const match = /Arm Compiler for Embedded\s+(\d+)\.(\d+)(?:\.(\d+))?/i.exec(output);
  if (!match) return null;
  const major = match[1];
  const minor = match[2];
  const patch = match[3] || '0';
  const version = `V${major}.${minor}${match[3] ? `.${match[3]}` : ''}`;
  const code = `${major}${minor.padStart(2, '0')}0000`;
  return {
    value: `${code}::${version}::ARMCLANG`,
    label: `ARMCLANG ${version}`,
    kind: 'ARMCLANG',
    exe,
    code,
  };
}

function detectCompilers(uv4Path, options = {}) {
  const roots = [];
  if (uv4Path) {
    const install = path.dirname(path.dirname(uv4Path));
    roots.push(path.join(install, 'ARM'));
  }
  roots.push(
    'F:\\KEIL\\ARM',
    'F:\\Keil_v5\\ARM',
    'C:\\Keil_v5\\ARM',
    'C:\\Keil\\ARM',
    'D:\\Keil_v5\\ARM',
    'E:\\Keil_v5\\ARM',
  );
  const result = [];
  const seen = new Set();
  const add = (entry) => {
    if (entry && !seen.has(entry.value)) {
      seen.add(entry.value);
      result.push(entry);
    }
  };
  const manualArmcc = String(options.armccPath || '').trim();
  if (manualArmcc && fs.existsSync(manualArmcc)) add(armccEntry(fs.statSync(manualArmcc).isDirectory() ? path.join(manualArmcc, 'armcc.exe') : manualArmcc));
  const manualArmclang = String(options.armclangPath || '').trim();
  if (manualArmclang && fs.existsSync(manualArmclang)) add(armclangEntry(fs.statSync(manualArmclang).isDirectory() ? path.join(manualArmclang, 'armclang.exe') : manualArmclang));
  for (const root of roots) {
    if (!root || !fs.existsSync(root)) continue;
    const armcc = path.join(root, 'ARMCC', 'bin', 'armcc.exe');
    if (fs.existsSync(armcc)) add(armccEntry(armcc));
    const armclang = path.join(root, 'ARMCLANG', 'bin', 'armclang.exe');
    if (fs.existsSync(armclang)) add(armclangEntry(armclang));
  }
  return result;
}

module.exports = { detectCompilers };
