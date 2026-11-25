'use strict';

const fs = require('fs');
const path = require('path');
const vscode = require('vscode');
const { sidebarHtml } = require('./webviewHtml');

function nonce() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i += 1) text += chars.charAt(Math.floor(Math.random() * chars.length));
  return text;
}

class SidebarView {
  constructor(controller) {
    this.controller = controller;
    this.view = null;
    this.data = controller.getSidebarData();
    this.pendingReveal = '';
    this.disposed = false;
  }

  async resolveWebviewView(webviewView) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [],
    };
    webviewView.webview.html = sidebarHtml({
      extensionPath: this.controller.context.extensionPath,
      nonce: nonce(),
      cspSource: webviewView.webview.cspSource,
      data: this.data,
    });
    webviewView.webview.onDidReceiveMessage((msg) => this.onMessage(msg));
    webviewView.onDidDispose(() => {
      this.view = null;
    });
    if (this.pendingReveal) {
      const path = this.pendingReveal;
      this.pendingReveal = '';
      this.data = this.controller.getSidebarData();
      webviewView.webview.postMessage({ type: 'revealFile', data: this.data, path });
    }
  }

  async onMessage(msg) {
    if (!msg || !msg.type) return;
    const controller = this.controller;
    try {
      if (msg.type === 'build') {
        await controller.build(msg.mode || 'build');
      } else if (msg.type === 'switchTarget') {
        await controller.switchTarget({ kind: 'target', target: { name: msg.targetName } });
      } else if (msg.type === 'openOptions') {
        await controller.openOptions();
      } else if (msg.type === 'manageItems') {
        await controller.manageItems();
      } else if (msg.type === 'openInKeil') {
        await controller.openInKeil();
      } else if (msg.type === 'refresh') {
        await controller.refresh();
      } else if (msg.type === 'toggleLanguage') {
        await controller.toggleLanguage();
      } else if (msg.type === 'clearIntelliSenseCache') {
        await controller.clearIntelliSenseCache(true);
      } else if (msg.type === 'openProject') {
        await controller.openProject();
      } else if (msg.type === 'closeProject') {
        await controller.closeProject();
      } else if (msg.type === 'readDir') {
        await this.readDir(msg.path || '', msg.requestId || '');
      } else if (msg.type === 'openFile') {
        if (msg.path) await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(msg.path));
      }
    } catch (err) {
      const message = String(err && err.message ? err.message : err);
      if (msg.type === 'readDir' && this.view) {
        this.view.webview.postMessage({ type: 'dirError', path: msg.path || '', message });
      } else {
        controller.showError(message);
      }
    }
  }

  refresh(data) {
    if (data) this.data = data;
    if (!this.data) this.data = this.controller.getSidebarData();
    if (this.view) this.view.webview.postMessage({ type: 'update', data: this.data });
  }

  async readDir(requestPath, requestId) {
    const project = this.controller.getProject();
    if (!project) throw new Error('no project');
    const root = project.projDir;
    const target = path.isAbsolute(requestPath) ? path.resolve(requestPath) : path.resolve(root, requestPath || '.');
    const relative = path.relative(root, target);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('路径超出工程目录');
    const entries = await fs.promises.readdir(target, { withFileTypes: true });
    const list = entries.map((entry) => ({
      name: entry.name,
      path: path.join(target, entry.name),
      kind: entry.isDirectory() ? 'dir' : 'file',
    })).sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
    if (this.view) {
      this.view.webview.postMessage({
        type: 'dirEntries',
        path: target,
        root,
        requestId,
        entries: list,
      });
    }
  }

  async revealFile(filePath) {
    if (!this.view) {
      this.pendingReveal = filePath;
      try {
        await vscode.commands.executeCommand('keilStudio.project.focus');
      } catch {
        /* ignore */
      }
      if (!this.view) return;
    }
    this.data = this.controller.getSidebarData();
    if (this.view) this.view.webview.postMessage({ type: 'revealFile', data: this.data, path: filePath });
  }

  dispose() {
    this.disposed = true;
    this.view = null;
  }
}

module.exports = { SidebarView };
