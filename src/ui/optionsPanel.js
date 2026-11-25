'use strict';

const path = require('path');
const vscode = require('vscode');
const { getOptionsData, applyOptions } = require('../keil/optionsSchema');
const { readDriverSetup, applyDriverSetup } = require('../keil/driverSetup');
const { optionsHtml } = require('./webviewHtml');
const { strings } = require('../i18n');

function nonce() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i += 1) text += chars.charAt(Math.floor(Math.random() * chars.length));
  return text;
}

class OptionsPanel {
  static current = null;

  static show(controller) {
    if (OptionsPanel.current) {
      OptionsPanel.current.reveal();
      return OptionsPanel.current;
    }
    const panel = vscode.window.createWebviewPanel(
      'keilStudio.options',
      controller.t('optionsForTarget'),
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [],
      },
    );
    OptionsPanel.current = new OptionsPanel(panel, controller);
    return OptionsPanel.current;
  }

  static close() {
    if (OptionsPanel.current) {
      OptionsPanel.current.dispose();
      OptionsPanel.current = null;
    }
  }

  static rebuild(controller) {
    if (!OptionsPanel.current) return;
    const panel = OptionsPanel.current;
    panel.controller = controller;
    panel.language = controller.getLanguage();
    panel.dirty = false;
    panel.data = panel.buildData();
    panel.panel.title = panel.title();
    panel.panel.webview.html = panel.html();
    panel.postUpdate(true);
  }

  constructor(panel, controller) {
    this.panel = panel;
    this.controller = controller;
    this.language = controller.getLanguage();
    this.project = controller.getProject();
    this.targetName = this.project ? this.project.getCurrentTargetName() : '';
    this.disposed = false;
    this.dirty = false;
    this.data = this.buildData();

    this.panel.title = this.title();
    this.panel.webview.html = this.html();
    this.panel.iconPath = vscode.Uri.file(path.join(controller.context.extensionPath, 'media', 'wand.svg'));

    this.panel.webview.onDidReceiveMessage((msg) => this.onMessage(msg));
    this.panel.onDidDispose(() => {
      this.disposed = true;
      if (OptionsPanel.current === this) OptionsPanel.current = null;
    });
    this.postUpdate(true);
  }

  title() {
    return this.controller.t('optionsForTarget');
  }

  reveal() {
    this.panel.reveal(vscode.ViewColumn.Active);
  }

  buildData() {
    const project = this.controller.getProject();
    this.project = project;
    this.targetName = project ? project.getCurrentTargetName() : '';
    if (!project) {
      return { tabs: [], fields: [], language: this.language, strings: strings(this.language) };
    }
    const base = getOptionsData(project, this.targetName, this.language);
    let driverSetup = null;
    try {
      driverSetup = readDriverSetup(project, this.targetName);
    } catch {
      driverSetup = null;
    }
    return {
      ...base,
      language: this.language,
      strings: strings(this.language),
      sync: this.controller.getSyncInfo(),
      compilers: this.controller.getCompilers ? this.controller.getCompilers() : [],
      projectDir: project.projDir,
      driverSetup,
    };
  }

  html() {
    const cspSource = this.panel.webview.cspSource;
    return optionsHtml({
      extensionPath: this.controller.context.extensionPath,
      nonce: nonce(),
      cspSource,
      data: this.data,
    });
  }

  postUpdate(force) {
    if (this.disposed) return;
    this.panel.webview.postMessage({ type: 'update', data: this.data, force: !!force });
  }

  async refresh(force = true) {
    if (this.disposed) return;
    try {
      const project = this.controller.getProject();
      if (project) await project.reload();
      this.language = this.controller.getLanguage();
      this.data = this.buildData();
      this.panel.title = this.title();
      if (force) {
        this.dirty = false;
        this.panel.webview.html = this.html();
      } else this.postUpdate(false);
    } catch (err) {
      this.panel.webview.postMessage({ type: 'error', message: String(err && err.message ? err.message : err) });
    }
  }

  async notifyExternalChange() {
    if (this.disposed) return;
    try {
      const project = this.controller.getProject();
      if (project) await project.reload();
      this.language = this.controller.getLanguage();
      const data = this.buildData();
      this.data = data;
      this.panel.webview.postMessage({ type: 'externalChange', data });
    } catch (err) {
      this.panel.webview.postMessage({ type: 'error', message: String(err && err.message ? err.message : err) });
    }
  }

  refreshFromProject() {
    if (this.disposed) return;
    this.language = this.controller.getLanguage();
    this.data = this.buildData();
    this.panel.title = this.title();
    this.panel.webview.postMessage({ type: 'externalChange', data: this.data });
  }

  async onMessage(msg) {
    if (!msg || !msg.type) return;
    if (msg.type === 'ready') {
      this.postUpdate(true);
      return;
    }
    if (msg.type === 'dirty') {
      this.dirty = !!msg.dirty;
      return;
    }
    if (msg.type === 'cancel') {
      this.dispose();
      return;
    }
    if (msg.type === 'reset') {
      try {
        const project = this.controller.getProject();
        if (project) await project.reload();
        this.dirty = false;
        this.language = this.controller.getLanguage();
        this.data = this.buildData();
        this.panel.webview.postMessage({ type: 'update', data: this.data, force: true });
        this.controller.afterProjectChanged();
      } catch (err) {
        this.panel.webview.postMessage({ type: 'error', message: String(err && err.message ? err.message : err) });
      }
      return;
    }
    if (msg.type === 'setLanguage') {
      await this.controller.setLanguage(msg.language);
      return;
    }
    if (msg.type === 'browseInclude') {
      const uris = await vscode.window.showOpenDialog({
        canSelectMany: false,
        canSelectFiles: false,
        canSelectFolders: true,
        title: this.language === 'en' ? 'Select include folder' : '选择包含路径文件夹',
      });
      if (uris && uris[0]) {
        this.panel.webview.postMessage({ type: 'includePathPicked', path: uris[0].fsPath, insert: !!msg.insert });
      }
      return;
    }
    if (msg.type === 'openIncludePath') {
      const project = this.controller.getProject();
      if (!project) return;
      const raw = String(msg.path || '').trim();
      if (!raw) return;
      const abs = path.isAbsolute(raw) ? raw : path.resolve(project.projDir, raw.replace(/\\/g, '/'));
      try {
        await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(abs));
      } catch (err) {
        this.panel.webview.postMessage({ type: 'error', message: String(err && err.message ? err.message : err) });
      }
      return;
    }
    if (msg.type === 'applyDriverSetup') {
      try {
        const project = this.controller.getProject();
        if (!project) throw new Error('没有打开的工程');
        const result = await applyDriverSetup(project, this.targetName, msg.settings || {});
        const changed = result && result.changed ? result.changed : 0;
        this.data = this.buildData();
        this.panel.webview.postMessage({
          type: 'driverSaved',
          data: this.data,
          changed,
          unsupported: result && result.unsupported ? result.unsupported : [],
        });
        this.controller.afterProjectChanged();
        if (changed) this.controller.toast(this.controller.t('optionsSaved'));
      } catch (err) {
        this.panel.webview.postMessage({ type: 'error', message: String(err && err.message ? err.message : err) });
      }
      return;
    }
    if (msg.type === 'apply') {
      try {
        const project = this.controller.getProject();
        if (!project) throw new Error('没有打开的工程');
        const changed = await applyOptions(project, this.targetName, msg.values || {});
        this.dirty = false;
        this.language = this.controller.getLanguage();
        this.data = this.buildData();
        this.panel.webview.postMessage({ type: 'saved', data: this.data, changed });
        this.controller.afterProjectChanged();
        await this.controller.syncIntelliSense(false);
        if (changed) {
          this.controller.toast(this.controller.t('optionsSaved'));
        }
        if (msg.close) {
          this.dispose();
        }
      } catch (err) {
        this.panel.webview.postMessage({
          type: 'error',
          message: String(err && err.message ? err.message : err),
        });
      }
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (OptionsPanel.current === this) OptionsPanel.current = null;
    this.panel.dispose();
  }

  isDirty() {
    return !!this.dirty;
  }
}

module.exports = { OptionsPanel };
