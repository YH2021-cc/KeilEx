'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const vscode = require('vscode');
const { KeilProject } = require('./keil/project');
const { KeilBuilder, detectUv4Path, countKeilProcesses } = require('./keil/builder');
const { detectCompilers } = require('./keil/compilers');
const { syncKeilIntelliSense } = require('./keil/intellisense');
const { OptionsPanel } = require('./ui/optionsPanel');
const { ItemsPanel } = require('./ui/itemsPanel');
const { SidebarView } = require('./ui/sidebarView');
const { resolveLanguage, t, strings } = require('./i18n');

function psQuote(value) {
  return `'${String(value == null ? '' : value).replace(/'/g, "''")}'`;
}

function launchUv4Interactive(exe, projectPath, cwd) {
  return new Promise((resolve, reject) => {
    const script = [
      `$p = Start-Process -FilePath ${psQuote(exe)} -ArgumentList @(${psQuote(projectPath)}) -WorkingDirectory ${psQuote(cwd)} -PassThru -WindowStyle Normal`,
      'if (-not $p) { exit 2 }',
      'exit 0',
    ].join('\r\n');
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `PowerShell exited with code ${code}`));
    });
  });
}

class Controller {
  constructor(context) {
    this.context = context;
    this.project = null;
    this.uv4Path = '';
    this.compilers = [];
    this.keilRunning = false;
    this.building = false;
    this.currentBuilder = null;
    this.lastBuildResult = null;
    this.lastWrite = '';
    this.watchers = [];
    this.pollTimer = null;
    this.externalTimer = null;
    this.suppressWatcherUntil = 0;
    this.promptedFolder = false;
    this.followTimer = null;
    this.disposed = false;

    this.output = vscode.window.createOutputChannel('KeilEx');
    this.diagnostics = vscode.languages.createDiagnosticCollection('keil');
    this.sidebar = new SidebarView(this);
    this.sidebarRegistration = vscode.window.registerWebviewViewProvider(
      'keilStudio.project',
      this.sidebar,
      { webviewOptions: { retainContextWhenHidden: true } },
    );
    this.context.subscriptions.push(this.sidebarRegistration);

    this.langItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.targetItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.buildItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    this.keilItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
    this.langItem.command = 'keilStudio.toggleLanguage';
    this.targetItem.command = 'keilStudio.switchTarget';
    this.buildItem.command = 'keilStudio.build';
    this.keilItem.command = 'keilStudio.openInKeil';
    this.langItem.show();

    this.registerCommands();
    this.registerConfigListener();
    if (typeof vscode.window.onDidChangeActiveTextEditor === 'function') {
      this.context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => {
        if (this.followTimer) clearTimeout(this.followTimer);
        this.followTimer = setTimeout(() => {
          this.followActiveEditor().catch(() => {});
        }, 350);
      }));
    }
    this.updateStatus();
  }

  get config() {
    return vscode.workspace.getConfiguration('keilStudio');
  }

  getLanguage() {
    return resolveLanguage(this.config.get('language', 'zh'), vscode.env.language);
  }

  getProject() {
    return this.project;
  }

  getCompilers() {
    if (!this.compilers || !this.compilers.length) {
      this.compilers = detectCompilers(this.uv4Path, {
      armccPath: this.config.get('armccPath', ''),
      armclangPath: this.config.get('armclangPath', ''),
    });
    }
    return this.compilers || [];
  }

  t(key, ...args) {
    return t(this.getLanguage(), key, ...args);
  }

  toast(message) {
    vscode.window.setStatusBarMessage(`$(check) ${message}`, 3200);
  }

  showError(message) {
    this.output.appendLine(`[错误] ${message}`);
    vscode.window.showErrorMessage(message);
  }

  async start() {
    await this.autoDetect();
    this.startPolling();
    this.refreshKeilStatus().catch(() => {});
  }

  async autoDetect() {
    const stored = this.context.workspaceState.get('keilStudio.activeProject');
    try {
      if (stored && fs.existsSync(stored) && /\.uvprojx$/i.test(stored)) {
        if (await this.openFolderForProjectIfNeeded(stored)) return;
        await this.loadProject(vscode.Uri.file(stored));
        return;
      }
      const files = (await this.findProjectFiles()).filter((uri) => {
        return !/^tmp\.uvprojx$/i.test(path.basename(uri.fsPath));
      });
      const active = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document.uri.fsPath : '';
      if (files.length === 0 && active) {
        const found = await this.findProjectForFile(active);
        if (found) {
          if (!(vscode.workspace.workspaceFolders || []).length) {
            if (!this.promptedFolder) {
              this.promptedFolder = true;
              const action = await vscode.window.showInformationMessage(
                this.t('openProjectFolderHint', path.dirname(found)),
                this.t('openProjectFolder'),
              );
              if (action) await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(path.dirname(found)), true);
            }
            return;
          }
          if (await this.openFolderForProjectIfNeeded(found)) return;
          await this.loadProject(vscode.Uri.file(found));
          return;
        }
      }
      if (files.length === 1) {
        if (await this.openFolderForProjectIfNeeded(files[0].fsPath)) return;
        await this.loadProject(files[0]);
        return;
      }
      if (active) {
        const nearest = this.nearestProject(active, files);
        if (nearest) {
          if (await this.openFolderForProjectIfNeeded(nearest)) return;
          await this.loadProject(vscode.Uri.file(nearest));
          return;
        }
      }
      if (files.length > 1) {
        const folder = (vscode.workspace.workspaceFolders || [])[0];
        if (folder) {
          const name = path.basename(folder.uri.fsPath).toLowerCase();
          const exact = files.find((uri) => path.basename(uri.fsPath, '.uvprojx').toLowerCase() === name);
          if (exact) {
            if (await this.openFolderForProjectIfNeeded(exact.fsPath)) return;
            await this.loadProject(exact);
            return;
          }
        }
        this.output.appendLine(`[KeilEx] 检测到 ${files.length} 个 .uvprojx；请使用“打开 Keil 工程”选择，或打开具体工程文件夹。`);
      }
      this.updateStatus();
    } catch (err) {
      this.output.appendLine(`[KeilEx] 自动检测失败：${err && err.message ? err.message : err}`);
      this.updateStatus();
    }
  }

  nearestProject(activeFile, files) {
    const active = path.resolve(activeFile).toLowerCase();
    const candidates = (files || [])
      .map((uri) => path.resolve(uri.fsPath))
      .filter((file) => !path.basename(file).toLowerCase().startsWith('tmp.'))
      .map((file) => ({ file, dir: path.dirname(file) }))
      .filter((item) => active === item.dir.toLowerCase() || active.startsWith(item.dir.toLowerCase() + path.sep))
      .sort((a, b) => b.dir.length - a.dir.length);
    return candidates.length ? candidates[0].file : '';
  }

  async findProjectForFile(activeFile) {
    let dir = path.dirname(path.resolve(activeFile));
    const folders = (vscode.workspace.workspaceFolders || []).map((folder) => path.resolve(folder.uri.fsPath));
    const stop = folders.find((folder) => dir.toLowerCase().startsWith(folder.toLowerCase() + path.sep)) || path.parse(dir).root;
    for (let i = 0; i < 12; i += 1) {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        const projects = entries
          .filter((entry) => entry.isFile() && /\.uvprojx$/i.test(entry.name) && !entry.name.toLowerCase().startsWith('tmp.'))
          .map((entry) => path.join(dir, entry.name));
        if (projects.length) return projects[0];
      } catch {
        /* ignore */
      }
      const parent = path.dirname(dir);
      if (dir.toLowerCase() === stop.toLowerCase() || parent === dir) break;
      dir = parent;
    }
    return '';
  }

  async findProjectFiles() {
    try {
      return await vscode.workspace.findFiles(
        '**/*.uvprojx',
        '**/{node_modules,.git,.vscode,.pack,build,Objects,Listings}/**',
        80,
      );
    } catch {
      return [];
    }
  }

  async pickProject() {
    const files = await this.findProjectFiles();
    if (files.length === 1) return files[0];
    if (files.length > 1) {
      const items = files.map((uri) => ({
        label: path.basename(uri.fsPath),
        description: vscode.workspace.asRelativePath(uri),
        detail: uri.fsPath,
        uri,
      }));
      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: this.t('openProject'),
      });
      return picked ? picked.uri : null;
    }
    const uris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      canSelectFiles: true,
      canSelectFolders: false,
      title: this.t('openProjectTitle'),
      filters: {
        'Keil uVision Project': ['uvprojx'],
        'All Files': ['*'],
      },
    });
    return uris && uris[0] ? uris[0] : null;
  }

  async ensureProject() {
    if (this.project) return this.project;
    const uri = await this.pickProject();
    if (!uri) {
      vscode.window.showInformationMessage(this.t('noActiveProject'));
      return null;
    }
    await this.loadProject(uri);
    return this.project;
  }

  async followActiveEditor() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !editor.document || editor.document.uri.scheme !== 'file') return;
    const active = editor.document.uri.fsPath;
    const found = await this.findProjectForFile(active);
    if (!found) return;
    if (this.project && path.resolve(this.project.projPath).toLowerCase() === path.resolve(found).toLowerCase()) {
      return;
    }
    const projectRoot = this.projectWorkspaceRoot(path.dirname(found));
    const folders = vscode.workspace.workspaceFolders || [];
    if (this.config.get('autoOpenProjectFolder', true) && folders.length && !this.isProjectFolderOpen(projectRoot)) {
      await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(projectRoot), false);
      return;
    }
    await this.loadProject(vscode.Uri.file(found));
  }

  async loadProject(uri) {
    if (this.building) throw new Error(this.t('buildBusy'));
    const filePath = typeof uri === 'string' ? uri : uri.fsPath;
    if (!/\.uvprojx$/i.test(filePath)) {
      throw new Error('首版只支持 .uvprojx（MDK-ARM）');
    }
    const project = await KeilProject.load(filePath);
    if (!project.targets.length) throw new Error('工程中没有 Target');
    this.disposeWatchers();
    this.project = project;
    this.lastBuildResult = null;
    const buildKey = `keilStudio.lastBuild.${project.projPath}`;
    const savedBuild = this.context.workspaceState.get(buildKey);
    if (savedBuild && savedBuild.summary && savedBuild.target === project.getCurrentTargetName()) {
      this.lastBuildResult = savedBuild;
    }
    this.lastWrite = '';
    this.diagnostics.clear();
    this.uv4Path = await detectUv4Path(this.config.get('uv4Path', ''));
    this.compilers = detectCompilers(this.uv4Path, {
      armccPath: this.config.get('armccPath', ''),
      armclangPath: this.config.get('armclangPath', ''),
    });
    this.context.workspaceState.update('keilStudio.activeProject', project.projPath);
    this.setupWatcher();
    this.startPolling();
    this.refreshKeilStatus().catch(() => {});
    this.updateStatus();
    this.syncIntelliSense(false).catch(() => {});
    this.output.appendLine(`[KeilEx] 已加载 ${project.projPath}`);
    this.output.appendLine(`[KeilEx] 目标：${project.getTargetNames().join(', ')}；当前：${project.getCurrentTargetName()}`);
    if (!project.optDoc) this.output.appendLine('[KeilEx] 未找到 .uvoptx；切换目标时会自动创建最小配置。');
    if (!this.uv4Path) this.output.appendLine('[KeilEx] 未找到 UV4.exe；编译前请设置 keilStudio.uv4Path。');
    if (OptionsPanel.current) OptionsPanel.rebuild(this);
    if (ItemsPanel.current) ItemsPanel.rebuild(this);
    this.toast(this.t('projectLoaded', project.projName));
    return project;
  }

  async openProject() {
    const uris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      canSelectFiles: true,
      canSelectFolders: false,
      title: this.t('openProjectTitle'),
      filters: {
        'Keil uVision Project': ['uvprojx'],
        'All Files': ['*'],
      },
    });
    if (!uris || !uris[0]) return;
    try {
      await this.openProjectUri(uris[0]);
    } catch (err) {
      this.showError(this.t('projectLoadFailed', err && err.message ? err.message : err));
    }
  }

  async openProjectUri(uri) {
    const projectDir = path.dirname(uri.fsPath);
    const projectRoot = this.projectWorkspaceRoot(projectDir);
    if (this.config.get('autoOpenProjectFolder', true) && !this.isProjectFolderOpen(projectRoot)) {
      await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(projectRoot), false);
      return;
    }
    await this.loadProject(uri);
  }

  isProjectFolderOpen(projectDir) {
    const target = path.resolve(projectDir).toLowerCase();
    return (vscode.workspace.workspaceFolders || []).some((folder) => {
      return path.resolve(folder.uri.fsPath).toLowerCase() === target;
    });
  }

  projectWorkspaceRoot(projectDir) {
    const dir = path.resolve(projectDir);
    if (/^(mdk-arm|mdk|mdk5|arm)$/i.test(path.basename(dir))) {
      const parent = path.dirname(dir);
      for (const name of ['Core', 'Drivers', '.ioc']) {
        if (fs.existsSync(path.join(parent, name))) return parent;
      }
    }
    return dir;
  }

  async openFolderForProjectIfNeeded(projectFile) {
    if (!this.config.get('autoOpenProjectFolder', true)) return false;
    const folders = vscode.workspace.workspaceFolders || [];
    if (!folders.length) return false;
    const projectRoot = this.projectWorkspaceRoot(path.dirname(projectFile));
    if (this.isProjectFolderOpen(projectRoot)) return false;
    await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(projectRoot), false);
    return true;
  }

  async ensureUv4() {
    if (this.uv4Path && fs.existsSync(this.uv4Path)) return this.uv4Path;
    this.uv4Path = await detectUv4Path(this.config.get('uv4Path', ''));
    if (!this.uv4Path) {
      const action = await vscode.window.showErrorMessage(this.t('uv4NotFound'), this.t('uv4NotFoundAction'));
      if (action) vscode.commands.executeCommand('workbench.action.openSettings', 'keilStudio.uv4Path');
      return '';
    }
    return this.uv4Path;
  }

  async build(mode, arg) {
    if (this.building) {
      vscode.window.showInformationMessage(this.t('buildBusy'));
      return null;
    }
    const project = await this.ensureProject();
    if (!project) return null;
    const uv4 = await this.ensureUv4();
    if (!uv4) return null;
    const target = arg && arg.kind === 'target' && arg.target ? arg.target.name : undefined;
    if (mode === 'download' && this.config.get('buildBeforeDownload', true)) {
      const pre = await this.executeBuild('build', target);
      if (!pre || !pre.success) return pre;
    }
    return this.executeBuild(mode, target);
  }

  async executeBuild(mode, targetOverride) {
    if (this.building) return null;
    const project = this.project;
    if (!project) return null;
    const uv4 = this.uv4Path || (await this.ensureUv4());
    if (!uv4) return null;
    const target = targetOverride || project.getCurrentTargetName();
    if (!project.getTarget(target)) {
      this.showError(`目标不存在：${target}`);
      return null;
    }

    this.building = true;
    this.updateStatus();
    this.output.appendLine('');
    this.output.appendLine(`===== ${mode.toUpperCase()} · ${target} · ${new Date().toLocaleTimeString()} =====`);
    if (this.config.get('showBuildOutput', true)) this.output.show(true);

    if (this.config.get('warnWhenKeilRunning', true)) {
      const running = await countKeilProcesses().catch(() => 0);
      if (running > 0) {
        this.output.appendLine(`[KeilEx] ⚠ ${this.t('keilRunningWarning')}`);
      }
    }

    const builder = new KeilBuilder({
      project,
      uv4Path: uv4,
      onLine: (line) => this.output.appendLine(line),
    });
    this.currentBuilder = builder;
    try {
      const result = await builder.run(mode, target);
      this.lastBuildResult = result;
      this.context.workspaceState.update(`keilStudio.lastBuild.${project.projPath}`, {
        success: result.success,
        code: result.code,
        durationMs: result.durationMs,
        mode: result.mode,
        target: result.target || target,
        summary: result.summary || {},
      });
      this.applyDiagnostics(result.diagnostics);
      this.output.appendLine(
        `[KeilEx] 完成：${result.success ? '成功' : '失败'} · 退出码 ${result.code} · ${(result.durationMs / 1000).toFixed(1)}s`,
      );
      if (result.summary.programSize) this.output.appendLine(`[KeilEx] ${result.summary.programSize}`);
      this.building = false;
      this.currentBuilder = null;
      this.suppressWatcherUntil = Date.now() + 1500;
      this.lastWrite = new Date().toLocaleTimeString();
      this.updateStatus();
      await this.handleBuildNotification(mode, result, target);
      return result;
    } catch (err) {
      this.building = false;
      this.currentBuilder = null;
      this.updateStatus();
      this.showError(String(err && err.message ? err.message : err));
      return null;
    }
  }

  async handleBuildNotification(mode, result, target) {
    const seconds = (result.durationMs / 1000).toFixed(1);
    if (mode === 'download') {
      if (result.success) this.toast(this.t('downloadSucceeded'));
      else {
        const action = await vscode.window.showErrorMessage(this.t('downloadFailed', result.code), this.t('buildOutput'));
        if (action) this.output.show();
      }
      return;
    }
    if (mode === 'clean') {
      if (result.success) this.toast(this.t('cleanDone'));
      else {
        const action = await vscode.window.showErrorMessage(this.t('buildFailed', result.code), this.t('buildOutput'));
        if (action) this.output.show();
      }
      return;
    }
    if (result.success) {
      const detail = `${result.summary.errors} errors · ${result.summary.warnings} warnings · ${seconds}s`;
      this.toast(this.t('buildSucceeded', detail));
      if (OptionsPanel.current) OptionsPanel.current.refreshFromProject();
      if (ItemsPanel.current) ItemsPanel.current.refreshFromProject();
    } else {
      const action = await vscode.window.showErrorMessage(this.t('buildFailed', result.code), this.t('buildOutput'));
      if (action) this.output.show();
    }
  }

  applyDiagnostics(items) {
    this.diagnostics.clear();
    const map = new Map();
    for (const item of items || []) {
      if (!item.file) continue;
      const uri = vscode.Uri.file(item.file);
      const line = Math.max(0, (item.line || 1) - 1);
      const column = Math.max(0, (item.column || 1) - 1);
      const range = new vscode.Range(line, column, line, column + 1);
      const severity = item.severity === 'warning' ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Error;
      const diagnostic = new vscode.Diagnostic(range, item.message, severity);
      diagnostic.source = 'Keil';
      if (item.code) diagnostic.code = item.code;
      if (!map.has(uri)) map.set(uri, []);
      map.get(uri).push(diagnostic);
    }
    for (const [uri, list] of map.entries()) this.diagnostics.set(uri, list);
  }

  async cancelBuild() {
    if (!this.building || !this.currentBuilder) {
      this.toast(this.t('noBuildRunning'));
      return;
    }
    const ok = await this.currentBuilder.cancel();
    if (ok) this.toast(this.t('buildCancelled'));
  }

  async switchTarget(arg) {
    if (this.building) {
      vscode.window.showInformationMessage(this.t('buildBusy'));
      return;
    }
    const project = await this.ensureProject();
    if (!project) return;
    let targetName = arg && arg.kind === 'target' && arg.target ? arg.target.name : '';
    if (!targetName) {
      const items = project.targets.map((target) => ({
        label: target.name,
        description: target.isCurrent ? this.t('current') : target.device || '',
        target,
      }));
      const picked = await vscode.window.showQuickPick(items, { placeHolder: this.t('selectTarget') });
      if (!picked) return;
      targetName = picked.target.name;
    }
    try {
      project.setCurrentTarget(targetName);
      await project.saveOptions();
      this.lastWrite = new Date().toLocaleTimeString();
      this.afterProjectChanged();
      if (OptionsPanel.current) OptionsPanel.current.refreshFromProject();
      if (ItemsPanel.current) ItemsPanel.current.refreshFromProject();
      this.toast(this.t('targetSwitched', targetName));
      if (this.keilRunning) this.output.appendLine(`[KeilEx] ${this.t('savedReloadHint')}`);
    } catch (err) {
      this.showError(this.t('targetSwitchFailed', err && err.message ? err.message : err));
    }
  }

  async openOptions(arg) {
    const project = await this.ensureProject();
    if (!project) return;
    if (arg && arg.kind === 'target' && arg.target && arg.target.name !== project.getCurrentTargetName()) {
      try {
        project.setCurrentTarget(arg.target.name);
        await project.saveOptions();
        this.afterProjectChanged();
      } catch (err) {
        this.showError(String(err && err.message ? err.message : err));
        return;
      }
    }
    OptionsPanel.show(this);
  }

  async manageItems() {
    const project = await this.ensureProject();
    if (!project) return;
    ItemsPanel.show(this);
  }

  async openInKeil() {
    const project = await this.ensureProject();
    if (!project) return;
    const uv4 = await this.ensureUv4();
    if (!uv4) return;
    try {
      await launchUv4Interactive(uv4, project.projPath, project.projDir);
      this.output.appendLine(`[KeilEx] 已在 Keil 中打开：${project.projPath}`);
      this.toast(this.t('keilLaunched'));
    } catch (err) {
      this.showError(this.t('openInKeilFailed', err && err.message ? err.message : err));
    }
  }

  async refresh() {
    if (!this.project) {
      await this.autoDetect();
      return;
    }
    try {
      await this.project.reload();
      this.updateStatus();
      if (OptionsPanel.current) OptionsPanel.current.refreshFromProject();
      if (ItemsPanel.current) ItemsPanel.current.refreshFromProject();
      this.syncIntelliSense(false).catch(() => {});
      this.toast(this.t('refreshDone'));
    } catch (err) {
      this.showError(String(err && err.message ? err.message : err));
    }
  }

  async clearIntelliSenseCache(showToast) {
    const base = process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'Microsoft', 'vscode-cpptools', 'ipch')
      : '';
    if (base && fs.existsSync(base)) {
      try {
        fs.rmSync(base, { recursive: true, force: true });
        this.output.appendLine(`[KeilEx] 已清理 C/C++ 缓存：${base}`);
      } catch (err) {
        this.output.appendLine(`[KeilEx] 清理 C/C++ 缓存失败：${err && err.message ? err.message : err}`);
      }
    }
    try {
      await vscode.commands.executeCommand('C_Cpp.ResetDatabase');
    } catch {
      /* C/C++ extension not installed */
    }
    if (showToast) this.toast(this.t('intelliSenseCacheCleared'));
  }

  async syncIntelliSense(notify) {
    if (!this.project) return null;
    if (!this.config.get('syncIntelliSense', true)) return null;
    try {
      const projectDir = path.resolve(this.project.projDir);
      const root = this.projectWorkspaceRoot(projectDir);
      const result = await syncKeilIntelliSense(this.project, this.project.getCurrentTargetName(), root, {
        armGccPath: this.config.get('armGccPath', ''),
      });
      if (result && result.error) {
        this.output.appendLine(`[KeilEx] IntelliSense 同步失败：${result.error}`);
        if (notify) this.showError(result.error);
        return result;
      }
      if (result && result.configName) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        let selected = false;
        for (let attempt = 0; attempt < 3 && !selected; attempt += 1) {
          try {
            await vscode.commands.executeCommand('C_Cpp.ConfigurationSelect', result.configName);
            selected = true;
          } catch {
            await new Promise((resolve) => setTimeout(resolve, 400));
          }
        }
        this.output.appendLine(
          selected
            ? `[KeilEx] C/C++ 配置已切换：${result.configName}`
            : `[KeilEx] C/C++ 配置切换失败：${result.configName}`,
        );
      }
      try {
        await vscode.commands.executeCommand('C_Cpp.ResetDatabase');
      } catch {
        /* C/C++ extension not installed */
      }
      if (result && result.changed) {
        this.output.appendLine(`[KeilEx] 已同步 IntelliSense：${result.configName}，${result.includePath.length} 个包含路径，${result.defines.length} 个宏`);
        if (result.removed) this.output.appendLine(`[KeilEx] 已清理旧配置：${result.removed}`);
        if (notify) this.toast(this.t('intelliSenseSynced'));
      }
      return result;
    } catch (err) {
      const message = String(err && err.message ? err.message : err);
      this.output.appendLine(`[KeilEx] IntelliSense 同步失败：${message}`);
      if (notify) this.showError(message);
      return { error: message };
    }
  }

  async closeProject() {
    if (this.building) {
      vscode.window.showInformationMessage(this.t('buildBusy'));
      return;
    }
    this.disposeWatchers();
    OptionsPanel.close();
    ItemsPanel.close();
    this.project = null;
    this.lastBuildResult = null;
    this.context.workspaceState.update('keilStudio.activeProject', undefined);
    this.updateStatus();
    this.toast(this.t('projectClosed'));
  }

  async revealInProject(arg) {
    let uri = null;
    if (arg && arg.kind === 'file' && arg.file) uri = vscode.Uri.file(arg.file.absPath);
    else if (vscode.window.activeTextEditor) uri = vscode.window.activeTextEditor.document.uri;
    if (!uri) return;
    try {
      await this.sidebar.revealFile(uri.fsPath);
    } catch {
      /* ignore */
    }
  }

  async setLanguage(lang) {
    if (lang !== 'zh' && lang !== 'en') return;
    const inspect = this.config.inspect('language');
    const target = inspect && inspect.workspaceValue !== undefined
      ? vscode.ConfigurationTarget.Workspace
      : vscode.ConfigurationTarget.Global;
    await this.config.update('language', lang, target);
  }

  async toggleLanguage() {
    if ((OptionsPanel.current && OptionsPanel.current.isDirty()) || (ItemsPanel.current && ItemsPanel.current.isModified())) {
      vscode.window.showInformationMessage(this.t('applyBeforeLanguage'));
      return;
    }
    await this.setLanguage(this.getLanguage() === 'zh' ? 'en' : 'zh');
  }

  afterProjectChanged() {
    this.suppressWatcherUntil = Date.now() + 1500;
    this.updateStatus();
  }

  updateStatus() {
    const project = this.project;
    const lang = this.getLanguage();
    this.langItem.text = `$(globe) ${lang === 'zh' ? '中' : 'EN'}`;
    this.langItem.tooltip = this.t('switchLanguage');
    this.langItem.show();

    if (!project) {
      this.targetItem.hide();
      this.buildItem.hide();
      this.keilItem.hide();
      this.sidebar.refresh(this.getSidebarData());
      vscode.commands.executeCommand('setContext', 'keilStudio.hasProject', false);
      vscode.commands.executeCommand('setContext', 'keilStudio.hasMultipleTargets', false);
      return;
    }

    const target = project.getCurrentTargetName();
    this.targetItem.text = `$(target) ${target}`;
    this.targetItem.tooltip = `${this.t('statusTarget')}: ${target}`;
    this.targetItem.show();

    if (this.building) {
      this.buildItem.text = `$(sync~spin) ${lang === 'zh' ? '编译中' : 'Building'}`;
      this.buildItem.tooltip = this.t('buildRunning', target);
    } else if (this.lastBuildResult) {
      this.buildItem.text = this.lastBuildResult.success ? `$(check) ${lang === 'zh' ? '编译' : 'Build'}` : `$(error) ${lang === 'zh' ? '编译' : 'Build'}`;
      const s = this.lastBuildResult.summary || {};
      this.buildItem.tooltip = `${s.errors || 0} errors · ${s.warnings || 0} warnings`;
    } else {
      this.buildItem.text = `$(tools) ${lang === 'zh' ? '编译' : 'Build'}`;
      this.buildItem.tooltip = this.t('statusBuild');
    }
    this.buildItem.show();

    this.keilItem.text = this.keilRunning ? '$(check) Keil' : '$(plug) Keil';
    this.keilItem.tooltip = this.keilRunning ? this.t('keilDetected') : this.t('keilNotDetected');
    this.keilItem.show();

    this.sidebar.refresh(this.getSidebarData());
    vscode.commands.executeCommand('setContext', 'keilStudio.hasProject', true);
    vscode.commands.executeCommand('setContext', 'keilStudio.hasMultipleTargets', project.targets.length > 1);
  }

  async refreshKeilStatus() {
    try {
      const count = await countKeilProcesses();
      const running = count > 0;
      if (running !== this.keilRunning) {
        this.keilRunning = running;
        this.updateStatus();
      }
    } catch {
      /* ignore */
    }
  }

  startPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
    const seconds = Number(this.config.get('keilPollSeconds', 8)) || 0;
    if (seconds > 0) {
      this.pollTimer = setInterval(() => {
        this.refreshKeilStatus().catch(() => {});
      }, Math.min(60, Math.max(1, seconds)) * 1000);
    }
  }

  setupWatcher() {
    this.disposeWatchers();
    if (!this.project || !this.config.get('autoRefresh', true)) return;
    const root = vscode.Uri.file(this.project.projDir);
    for (const pattern of ['*.uvprojx', '*.uvoptx']) {
      const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(root, pattern));
      const schedule = () => this.scheduleExternalChange();
      watcher.onDidChange(schedule);
      watcher.onDidCreate(schedule);
      watcher.onDidDelete(schedule);
      this.watchers.push(watcher);
    }
  }

  disposeWatchers() {
    for (const watcher of this.watchers) watcher.dispose();
    this.watchers = [];
  }

  scheduleExternalChange() {
    if (Date.now() < this.suppressWatcherUntil) return;
    if (this.externalTimer) clearTimeout(this.externalTimer);
    this.externalTimer = setTimeout(() => {
      this.externalTimer = null;
      this.handleExternalChange().catch(() => {});
    }, 420);
  }

  async handleExternalChange() {
    if (!this.project || this.disposed) return;
    if (Date.now() < this.suppressWatcherUntil) return;
    if (ItemsPanel.current && ItemsPanel.current.isModified()) {
      // Staged project-item edits live in the in-memory DOM; don't reload them away.
      this.toast(this.t('syncConflict'));
      return;
    }
    try {
      await this.project.reload();
      this.updateStatus();
      if (OptionsPanel.current) OptionsPanel.current.refreshFromProject();
      if (ItemsPanel.current) ItemsPanel.current.refreshFromProject();
      this.toast(this.t('externalSynced'));
    } catch (err) {
      this.output.appendLine(`[KeilEx] 同步失败：${err && err.message ? err.message : err}`);
    }
  }

  getSidebarData() {
    const language = this.getLanguage();
    const project = this.project;
    if (!project) {
      return {
        projectName: '',
        projectPath: '',
        projectDir: '',
        device: '',
        targetName: '',
        targets: [],
        keilRunning: this.keilRunning,
        lastBuild: null,
        language,
        strings: strings(language),
      };
    }
    const current = project.getCurrentTargetName();
    let lastBuild = null;
    if (this.lastBuildResult) {
      const result = this.lastBuildResult;
      const summary = result.summary || {};
      const targetName = result.target || current;
      const memory = project.getMemoryInfo(targetName);
      const flashUsed = (summary.code || 0) + (summary.ro || 0);
      const ramUsed = (summary.rw || 0) + (summary.zi || 0);
      lastBuild = {
        success: !!result.success,
        errors: summary.errors || 0,
        warnings: summary.warnings || 0,
        durationMs: result.durationMs || 0,
        mode: result.mode || 'build',
        target: targetName,
        programSize: summary.programSize || '',
        flashUsed,
        flashSize: memory.irom.size,
        ramUsed,
        ramSize: memory.iram.size,
        flashPercent: memory.irom.size ? Math.min(100, (flashUsed / memory.irom.size) * 100) : 0,
        ramPercent: memory.iram.size ? Math.min(100, (ramUsed / memory.iram.size) * 100) : 0,
      };
    }
    return {
      projectName: project.projName,
      projectPath: project.projPath,
      projectDir: project.projDir,
      device: project.getTargetDevice(current),
      targetName: current,
      targets: project.targets.map((target) => ({
        name: target.name,
        isCurrent: target.name === current,
        device: project.getTargetDevice(target.name),
        groups: target.groups.map((group) => ({
          name: group.name,
          files: group.files.map((file) => ({
            name: file.name,
            path: file.path,
            absPath: file.absPath,
            type: file.type,
          })),
        })),
      })),
      keilRunning: this.keilRunning,
      lastBuild,
      language,
      strings: strings(language),
    };
  }

  getSyncInfo() {
    return {
      keilRunning: this.keilRunning,
      uv4Path: this.uv4Path,
      lastWrite: this.lastWrite,
      hasOpt: this.project ? !!this.project.optDoc : false,
      optPath: this.project ? this.project.optPath : '',
    };
  }

  registerConfigListener() {
    const sub = vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration('keilStudio')) return;
      if (event.affectsConfiguration('keilStudio.language')) {
        this.updateStatus();
        if (OptionsPanel.current) OptionsPanel.rebuild(this);
        if (ItemsPanel.current) ItemsPanel.rebuild(this);
      }
      if (event.affectsConfiguration('keilStudio.uv4Path')) {
        detectUv4Path(this.config.get('uv4Path', '')).then((p) => {
          this.uv4Path = p;
          this.compilers = detectCompilers(this.uv4Path, {
            armccPath: this.config.get('armccPath', ''),
            armclangPath: this.config.get('armclangPath', ''),
          });
          this.updateStatus();
        });
      }
      if (event.affectsConfiguration('keilStudio.armccPath') || event.affectsConfiguration('keilStudio.armclangPath')) {
        this.compilers = detectCompilers(this.uv4Path, {
          armccPath: this.config.get('armccPath', ''),
          armclangPath: this.config.get('armclangPath', ''),
        });
        this.updateStatus();
        if (OptionsPanel.current) OptionsPanel.current.refreshFromProject();
      }
      if (event.affectsConfiguration('keilStudio.autoRefresh')) {
        this.setupWatcher();
      }
      if (event.affectsConfiguration('keilStudio.keilPollSeconds')) {
        this.startPolling();
      }
    });
    this.context.subscriptions.push(sub);
  }

  registerCommands() {
    const reg = (id, fn) => {
      this.context.subscriptions.push(vscode.commands.registerCommand(id, fn));
    };
    reg('keilStudio.openProject', () => this.openProject().catch((err) => this.showError(String(err))));
    reg('keilStudio.openProjectFile', (uri) => {
      if (uri && uri.fsPath) {
        this.openProjectUri(uri).catch((err) => this.showError(this.t('projectLoadFailed', err && err.message ? err.message : err)));
      }
    });
    reg('keilStudio.refresh', () => this.refresh().catch((err) => this.showError(String(err))));
    reg('keilStudio.build', (arg) => this.build('build', arg).catch((err) => this.showError(String(err))));
    reg('keilStudio.rebuild', (arg) => this.build('rebuild', arg).catch((err) => this.showError(String(err))));
    reg('keilStudio.clean', (arg) => this.build('clean', arg).catch((err) => this.showError(String(err))));
    reg('keilStudio.download', (arg) => this.build('download', arg).catch((err) => this.showError(String(err))));
    reg('keilStudio.switchTarget', (arg) => this.switchTarget(arg).catch((err) => this.showError(String(err))));
    reg('keilStudio.openOptions', (arg) => this.openOptions(arg).catch((err) => this.showError(String(err))));
    reg('keilStudio.manageItems', () => this.manageItems().catch((err) => this.showError(String(err))));
    reg('keilStudio.openInKeil', () => this.openInKeil().catch((err) => this.showError(String(err))));
    reg('keilStudio.syncIntelliSense', () => this.syncIntelliSense(true).catch((err) => this.showError(String(err))));
    reg('keilStudio.clearIntelliSenseCache', () => this.clearIntelliSenseCache(true).catch((err) => this.showError(String(err))));
    reg('keilStudio.toggleLanguage', () => this.toggleLanguage().catch((err) => this.showError(String(err))));
    reg('keilStudio.showOutput', () => this.output.show());
    reg('keilStudio.closeProject', () => this.closeProject().catch((err) => this.showError(String(err))));
    reg('keilStudio.revealInProject', (arg) => this.revealInProject(arg).catch(() => {}));
    reg('keilStudio.cancelBuild', () => this.cancelBuild().catch((err) => this.showError(String(err))));
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.disposeWatchers();
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.externalTimer) clearTimeout(this.externalTimer);
    OptionsPanel.close();
    ItemsPanel.close();
    this.diagnostics.dispose();
    this.output.dispose();
    this.langItem.dispose();
    this.targetItem.dispose();
    this.buildItem.dispose();
    this.keilItem.dispose();
    this.sidebar.dispose();
  }
}

module.exports = { Controller };
