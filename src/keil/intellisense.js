'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function stripJsonc(text) {
  let out = '';
  let inString = false;
  let quote = '';
  let lineComment = false;
  let blockComment = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (lineComment) {
      if (ch === '\n') { lineComment = false; out += ch; }
      continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') { blockComment = false; i += 1; }
      continue;
    }
    if (inString) {
      out += ch;
      if (ch === '\\') { out += next || ''; i += 1; continue; }
      if (ch === quote) inString = false;
      continue;
    }
    if (ch === '"') { inString = true; quote = ch; out += ch; continue; }
    if (ch === '/' && next === '/') { lineComment = true; i += 1; continue; }
    if (ch === '/' && next === '*') { blockComment = true; i += 1; continue; }
    out += ch;
  }
  return out.replace(/,\s*([}\]])/g, '$1');
}

function readConfig(file) {
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  try {
    return JSON.parse(text);
  } catch {
    return JSON.parse(stripJsonc(text));
  }
}

function splitList(value) {
  return String(value || '')
    .split(/[;,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(list) {
  const seen = new Set();
  return list.filter((item) => {
    if (!item) return false;
    const key = String(item).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function resolveIncludes(project, targetName) {
  const raw = project.getOptionValue(targetName, 'proj', [
    'TargetOption', 'TargetArmAds', 'Cads', 'VariousControls', 'IncludePath',
  ]);
  const result = [];
  splitList(raw).forEach((value) => {
    const normalized = String(value).replace(/\$PROJ_DIR\$/gi, project.projDir).replace(/\\/g, '/');
    const absolute = path.isAbsolute(normalized) ? path.normalize(normalized) : path.resolve(project.projDir, normalized);
    result.push(absolute.replace(/\\/g, '/'));
  });
  return unique(result);
}

function getDefines(project, targetName) {
  const raw = project.getOptionValue(targetName, 'proj', [
    'TargetOption', 'TargetArmAds', 'Cads', 'VariousControls', 'Define',
  ]);
  return unique(splitList(raw));
}

function getArmccIncludes() {
  const result = [];
  const roots = [
    'F:\\KEIL\\ARM\\ARMCC\\include',
    'C:\\Keil_v5\\ARM\\ARMCC\\include',
    'C:\\Keil\\ARM\\ARMCC\\include',
    'D:\\Keil_v5\\ARM\\ARMCC\\include',
  ];
  roots.forEach((dir) => {
    if (fs.existsSync(dir)) result.push(dir, path.join(dir, 'rw'));
  });
  return result;
}

function findArmGcc(configured) {
  const candidates = [
    configured ? String(configured).trim() : '',
    'D:\\EmbeddedTool\\arm-none-eabi\\bin\\arm-none-eabi-gcc.exe',
    'C:\\ST\\STM32CubeCLT_1.18.0\\GNU-tools-for-STM32\\bin\\arm-none-eabi-gcc.exe',
    'C:\\ST\\STM32CubeCLT_1.17.0\\GNU-tools-for-STM32\\bin\\arm-none-eabi-gcc.exe',
  ].filter(Boolean);
  for (const exe of candidates) {
    if (!fs.existsSync(exe)) continue;
    const includes = [];
    const add = (p) => {
      if (!p) return;
      const clean = String(p).trim();
      if (clean && fs.existsSync(clean)) includes.push(clean.replace(/\\/g, '/'));
    };
    const root = path.dirname(path.dirname(exe));
    add(path.join(root, 'arm-none-eabi', 'include'));
    try {
      add(execFileSync(exe, ['-print-file-name=include'], { encoding: 'utf8', timeout: 5000 }));
      add(execFileSync(exe, ['-print-file-name=include-fixed'], { encoding: 'utf8', timeout: 5000 }));
    } catch {
      /* toolchain query failed; keep known paths */
    }
    return { compilerPath: exe.replace(/\\/g, '/'), includes: unique(includes) };
  }
  return null;
}

function buildConfigName(project, targetName) {
  const projectName = path.basename(project.projPath || project.projDir || 'Project', path.extname(project.projPath || ''));
  const name = `${projectName}_${targetName || 'Target'}`.replace(/[\\/:*?"<>|]/g, '_');
  return name || 'KeilEx';
}

/**
 * Keil Assistant-style configuration:
 * - one config per project + target
 * - Keil IncludePath + ARMCC system includes + ${default}
 * - no project-root injection, so duplicate headers resolve exactly like Keil
 * - intelliSenseMode ${default}, no ARMCC macro guessing
 */
async function syncKeilIntelliSense(project, targetName, workspaceRoot, options = {}) {
  if (!project) return null;
  const target = targetName || project.getCurrentTargetName();
  const armGcc = findArmGcc(options.armGccPath);
  const includePath = unique([
    ...resolveIncludes(project, target),
    ...(armGcc ? armGcc.includes : getArmccIncludes()),
    '${default}',
  ]);
  const defines = getDefines(project, target);
  const configName = buildConfigName(project, target);
  const configDir = workspaceRoot || project.projDir;
  const configPath = path.join(configDir, '.vscode', 'c_cpp_properties.json');
  const forcedPath = path.join(configDir, '.vscode', 'keilex_compiler_types.h');
  try {
    if (fs.existsSync(forcedPath)) fs.unlinkSync(forcedPath);
  } catch {
    /* best effort cleanup */
  }
  let config = null;
  try {
    config = readConfig(configPath);
  } catch {
    return { path: configPath, error: '无法解析现有 c_cpp_properties.json' };
  }
  if (!config || !Array.isArray(config.configurations)) {
    config = { configurations: [], version: 4 };
  }
  config.configurations = config.configurations.filter((item) => {
    return !item || item.name !== 'KeilEx' || configName === 'KeilEx';
  });
  let entry = config.configurations.find((item) => item && item.name === configName);
  if (!entry) {
    entry = { name: configName };
    config.configurations.push(entry);
  }
  entry.includePath = includePath;
  entry.defines = defines;
  delete entry.forcedInclude;
  if (armGcc) {
    entry.compilerPath = armGcc.compilerPath;
    entry.intelliSenseMode = 'gcc-arm';
  } else {
    delete entry.compilerPath;
    entry.intelliSenseMode = '${default}';
  }
  config.version = 4;
  const text = JSON.stringify(config, null, 2) + '\n';
  const old = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
  let removed = '';
  if (path.resolve(configDir) !== path.resolve(project.projDir)) {
    const stale = path.join(project.projDir, '.vscode', 'c_cpp_properties.json');
    if (fs.existsSync(stale)) {
      try {
        const backup = stale + '.keilex.bak';
        fs.copyFileSync(stale, backup);
        fs.unlinkSync(stale);
        removed = stale;
      } catch {
        /* ignore locked/stale config */
      }
    }
  }
  if (old === text) {
    return { path: configPath, changed: false, includePath, defines, configName, removed };
  }
  await fs.promises.mkdir(path.dirname(configPath), { recursive: true });
  await fs.promises.writeFile(configPath, text, 'utf8');
  return { path: configPath, changed: true, includePath, defines, configName, removed };
}

module.exports = { syncKeilIntelliSense };
