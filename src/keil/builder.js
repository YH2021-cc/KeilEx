'use strict';

const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');
const { spawn, execFile } = require('child_process');

const COMMON_UV4_PATHS = [
  'C:\\Keil_v5\\UV4\\UV4.exe',
  'C:\\Keil\\UV4\\UV4.exe',
  'D:\\Keil_v5\\UV4\\UV4.exe',
  'D:\\Keil\\UV4\\UV4.exe',
  'E:\\Keil_v5\\UV4\\UV4.exe',
  'E:\\Keil\\UV4\\UV4.exe',
  'F:\\KEIL\\UV4\\UV4.exe',
  'F:\\Keil_v5\\UV4\\UV4.exe',
  'D:\\KEIL\\UV4\\UV4.exe',
];

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function execFileText(file, args, timeout = 4000) {
  return new Promise((resolve) => {
    execFile(file, args, { windowsHide: true, timeout, encoding: 'utf8' }, (err, stdout, stderr) => {
      resolve({ err, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

async function detectUv4Path(configured) {
  const candidates = [];
  if (configured) candidates.push(configured);
  if (process.env.KEIL_UV4) candidates.push(process.env.KEIL_UV4);
  candidates.push(...COMMON_UV4_PATHS);
  for (const candidate of candidates) {
    if (candidate && fileExists(candidate)) return path.resolve(candidate);
  }

  if (process.platform === 'win32') {
    for (const key of [
      'HKLM\\SOFTWARE\\WOW6432Node\\Keil\\Products\\MDK',
      'HKLM\\SOFTWARE\\Keil\\Products\\MDK',
      'HKCU\\SOFTWARE\\Keil\\Products\\MDK',
    ]) {
      const { stdout } = await execFileText('reg', ['query', key, '/v', 'Path']);
      const match = stdout.match(/Path\s+REG_SZ\s+(.+)/i);
      if (!match) continue;
      const armPath = match[1].trim();
      const uv4 = path.join(path.dirname(armPath), 'UV4', 'UV4.exe');
      if (fileExists(uv4)) return uv4;
    }
  }
  if (process.platform === 'win32') {
    const { stdout } = await execFileText('where', ['UV4.exe']);
    for (const line of stdout.split(/\r?\n/)) {
      const candidate = line.trim();
      if (candidate && fileExists(candidate)) return path.resolve(candidate);
    }
  }
  return '';
}

async function countKeilProcesses() {
  if (process.platform !== 'win32') return 0;
  const { stdout } = await execFileText('tasklist', ['/FI', 'IMAGENAME eq UV4.exe', '/FO', 'CSV', '/NH']);
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^"UV4\.exe"/i.test(line)).length;
}

function psQuote(value) {
  return `'${String(value == null ? '' : value).replace(/'/g, "''")}'`;
}

function buildPowerShellScript(exe, args, cwd, options = {}) {
  const lines = ['$ErrorActionPreference = "Stop"'];
  const argList = `@(${args.map(psQuote).join(',')})`;
  if (options.wait) {
    if (options.pidFile) {
      lines.push(
        `$p = Start-Process -FilePath ${psQuote(exe)} -ArgumentList ${argList} -WorkingDirectory ${psQuote(cwd)} -PassThru -WindowStyle Hidden`,
      );
      lines.push(`Set-Content -LiteralPath ${psQuote(options.pidFile)} -Value $p.Id -Encoding ASCII`);
      lines.push('$p.WaitForExit()');
      lines.push('exit $p.ExitCode');
    } else {
      lines.push(
        `$p = Start-Process -FilePath ${psQuote(exe)} -ArgumentList ${argList} -WorkingDirectory ${psQuote(cwd)} -PassThru -Wait -WindowStyle Hidden`,
      );
      lines.push('exit $p.ExitCode');
    }
  } else {
    lines.push(
      `Start-Process -FilePath ${psQuote(exe)} -ArgumentList ${argList} -WorkingDirectory ${psQuote(cwd)} -WindowStyle Normal`,
    );
    lines.push('exit 0');
  }
  return lines.join('\r\n');
}

function runPowerShell(script, options = {}) {
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
      windowsHide: true,
      cwd: options.cwd || undefined,
      stdio: 'ignore',
    });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code == null ? -1 : code, child }));
  });
}

async function tryDirectSpawn(exe, args, cwd) {
  return new Promise((resolve) => {
    let settled = false;
    const child = spawn(exe, args, { windowsHide: true, cwd, stdio: 'ignore' });
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    child.on('error', (err) => finish({ ok: false, error: err, child }));
    child.on('close', (code) => finish({ ok: true, code: code == null ? -1 : code, child }));
  });
}

function resolveDiagnosticPath(file, projectDir) {
  const raw = String(file || '').trim().replace(/^"|"$/g, '');
  if (!raw) return '';
  if (/^[a-zA-Z]:[\\/]/.test(raw)) return raw;
  return path.resolve(projectDir, raw.replace(/\\/g, '/'));
}

function parseDiagnostics(logText, projectDir) {
  const diagnostics = [];
  const seen = new Set();
  const lines = String(logText || '').split(/\r?\n/);
  const patterns = [
    {
      re: /^(.+?)\((\d+)\):\s+(error|warning|fatal error):\s*(?:#([\w.-]+):\s*)?(.*)$/i,
      map: (m) => ({ file: m[1], line: m[2], column: 1, severity: m[3], code: m[4] || '', message: m[5] }),
    },
    {
      re: /^(.+?):(\d+):(\d+):\s+(error|warning|fatal error):\s*(.*)$/i,
      map: (m) => ({ file: m[1], line: m[2], column: m[3], severity: m[4], code: '', message: m[5] }),
    },
    {
      re: /^(.+?)\((\d+)\):\s+(error|warning):\s*(.*)$/i,
      map: (m) => ({ file: m[1], line: m[2], column: 1, severity: m[3], code: '', message: m[4] }),
    },
  ];
  for (const line of lines) {
    const text = line.trim();
    if (!text) continue;
    for (const pattern of patterns) {
      const m = text.match(pattern.re);
      if (!m) continue;
      const parsed = pattern.map(m);
      const message = String(parsed.message || '').trim();
      if (!message) continue;
      const file = resolveDiagnosticPath(parsed.file, projectDir);
      const lineNo = Number(parsed.line) || 1;
      const colNo = Number(parsed.column) || 1;
      const severity = String(parsed.severity || '').toLowerCase().includes('warning') ? 'warning' : 'error';
      const key = `${file}:${lineNo}:${colNo}:${severity}:${message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      diagnostics.push({
        file,
        line: lineNo,
        column: colNo,
        severity,
        code: String(parsed.code || '').replace(/^#/, ''),
        message,
        raw: text,
      });
      break;
    }
  }
  return diagnostics;
}

function readMapSize(project, targetName) {
  if (!project) return null;
  const name = targetName || project.getCurrentTargetName();
  const candidates = [
    path.join(project.projDir, name, `${name}.map`),
    path.join(project.projDir, `${name}.map`),
    path.join(project.projDir, `${project.projName}.map`),
  ];
  for (const file of candidates) {
    if (!fileExists(file)) continue;
    try {
      const text = fs.readFileSync(file, 'utf8');
      const ro = text.match(/Total\s+RO\s+Size\s+\(Code\s*\+\s*RO\s+Data\)\s+(\d+)/i);
      const rw = text.match(/Total\s+RW\s+Size\s+\(RW\s+Data\s*\+\s*ZI\s+Data\)\s+(\d+)/i);
      if (ro || rw) {
        return {
          ro: ro ? Number(ro[1]) : 0,
          rw: rw ? Number(rw[1]) : 0,
          file,
        };
      }
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

function parseBuildSummary(logText) {
  const text = String(logText || '');
  const result = {
    errors: 0,
    warnings: 0,
    programSize: '',
    buildTime: '',
  };
  const summary = text.match(/(-?\d+)\s+Error\(s\),\s*(\d+)\s+Warning\(s\)/i);
  if (summary) {
    result.errors = Math.abs(Number(summary[1])) || 0;
    result.warnings = Number(summary[2]) || 0;
  }
  const size = text.match(/Program Size:\s*([^\r\n]+)/i);
  if (size) result.programSize = size[1].trim();
  const detail = text.match(/Code=(\d+)\s+RO-data=(\d+)\s+RW-data=(\d+)\s+ZI-data=(\d+)/i);
  if (detail) {
    result.code = Number(detail[1]);
    result.ro = Number(detail[2]);
    result.rw = Number(detail[3]);
    result.zi = Number(detail[4]);
  }
  const time = text.match(/Build Time Elapsed:\s*([^\r\n]+)/i);
  if (time) result.buildTime = time[1].trim();
  return result;
}

class KeilBuilder {
  constructor(options = {}) {
    this.project = options.project;
    this.uv4Path = options.uv4Path || '';
    this.onLine = options.onLine || (() => {});
    this.child = null;
    this.psChild = null;
    this.pidFile = '';
    this.running = false;
    this.lastLaunch = '';
  }

  get projectDir() {
    return this.project ? this.project.projDir : process.cwd();
  }

  async run(mode, targetName) {
    if (this.running) throw new Error('已有构建正在运行');
    if (!this.project) throw new Error('没有打开的 Keil 工程');
    if (!this.uv4Path) throw new Error('未找到 UV4.exe，请设置 keilStudio.uv4Path');
    const command = {
      build: '-b',
      rebuild: '-r',
      clean: '-c',
      download: '-f',
    }[mode];
    if (!command) throw new Error(`不支持的构建模式：${mode}`);

    const logFile = path.join(os.tmpdir(), `keil-studio-${process.pid}-${Date.now()}.log`);
    const args = [command, this.project.projPath, '-j0', '-o', logFile];
    if (targetName) args.push('-t', targetName);
    this.onLine(`> "${this.uv4Path}" ${args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ')}`);
    const start = Date.now();
    this.running = true;
    this.onLine(`[KeilEx] ${mode} · ${targetName || this.project.getCurrentTargetName()}`);
    try {
      const launch = await this._execute(args);
      const code = launch.code;
      const durationMs = Date.now() - start;
      let logText = '';
      try {
        logText = await fsp.readFile(logFile, 'utf8');
      } catch {
        logText = '';
      }
      if (logText) {
        for (const line of logText.split(/\r?\n/)) {
          if (line !== '') this.onLine(line);
        }
      } else {
        this.onLine('[KeilEx] 没有读到构建日志。请检查 UV4 是否能正常启动，或 Keil 是否正忙。');
      }
      const diagnostics = parseDiagnostics(logText, this.project.projDir);
      const summary = parseBuildSummary(logText);
      if (!summary.code || !summary.rw) {
        const mapSize = readMapSize(this.project, targetName);
        if (mapSize) {
          summary.code = mapSize.ro;
          summary.ro = 0;
          summary.rw = mapSize.rw;
          summary.zi = 0;
          summary.mapFile = mapSize.file;
        }
      }
      const success = code === 0 || code === 1;
      return {
        code,
        success,
        durationMs,
        log: logText,
        diagnostics,
        summary,
        mode,
        target: targetName || this.project.getCurrentTargetName(),
        logFile,
        launch: launch.usedPowerShell ? 'powershell' : 'direct',
      };
    } finally {
      this.running = false;
      this.child = null;
      this.psChild = null;
      if (this.pidFile) {
        try {
          await fsp.unlink(this.pidFile);
        } catch {
          /* ignore */
        }
        this.pidFile = '';
      }
      try {
        await fsp.unlink(logFile);
      } catch {
        /* ignore */
      }
    }
  }

  async _execute(args) {
    const direct = await tryDirectSpawn(this.uv4Path, args, this.project.projDir);
    if (direct.ok) {
      this.child = direct.child;
      this.lastLaunch = 'direct';
      return { code: direct.code, usedPowerShell: false };
    }
    const reason = direct.error && direct.error.code ? direct.error.code : 'unknown';
    this.onLine(`[KeilEx] 直接启动 UV4 失败（${reason}），改用 PowerShell Start-Process。`);
    const pidFile = path.join(os.tmpdir(), `keil-studio-${process.pid}-${Date.now()}.pid`);
    this.pidFile = pidFile;
    const script = buildPowerShellScript(this.uv4Path, args, this.project.projDir, { wait: true, pidFile });
    this.lastLaunch = 'powershell';
    const result = await runPowerShell(script, { cwd: this.project.projDir });
    return { code: result.code, usedPowerShell: true };
  }

  async cancel() {
    let pid = 0;
    if (this.pidFile) {
      try {
        const text = await fsp.readFile(this.pidFile, 'utf8');
        pid = Number(text.trim()) || 0;
      } catch {
        pid = 0;
      }
    }
    if (!pid && this.child) pid = this.child.pid;
    if (!pid) return false;
    try {
      if (process.platform === 'win32') {
        await execFileText('taskkill', ['/PID', String(pid), '/T', '/F'], 5000);
      } else {
        process.kill(pid, 'SIGTERM');
      }
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = {
  KeilBuilder,
  detectUv4Path,
  countKeilProcesses,
  parseDiagnostics,
  parseBuildSummary,
  fileExists,
};
