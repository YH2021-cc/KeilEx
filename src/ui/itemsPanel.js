'use strict';

const path = require('path');
const vscode = require('vscode');
const { itemsHtml } = require('./webviewHtml');
const { strings } = require('../i18n');

function nonce() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i += 1) text += chars.charAt(Math.floor(Math.random() * chars.length));
  return text;
}

class ItemsPanel {
  static current = null;

  static show(controller) {
    if (ItemsPanel.current) {
      ItemsPanel.current.reveal();
      return ItemsPanel.current;
    }
    const panel = vscode.window.createWebviewPanel(
      'keilStudio.items',
      controller.t('projectItems'),
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [],
      },
    );
    ItemsPanel.current = new ItemsPanel(panel, controller);
    return ItemsPanel.current;
  }

  static close() {
    if (ItemsPanel.current) {
      ItemsPanel.current.saved = true;
      ItemsPanel.current.dispose();
      ItemsPanel.current = null;
    }
  }

  static rebuild(controller) {
    if (!ItemsPanel.current) return;
    const panel = ItemsPanel.current;
    panel.controller = controller;
    panel.language = controller.getLanguage();
    panel.data = panel.buildData();
    panel.panel.title = controller.t('projectItems');
    panel.panel.webview.html = panel.html();
    panel.postUpdate();
  }

  constructor(panel, controller) {
    this.panel = panel;
    this.controller = controller;
    this.language = controller.getLanguage();
    this.project = controller.getProject();
    this.targetName = this.project ? this.project.getCurrentTargetName() : '';
    this.disposed = false;
    this.saved = false;
    this.modified = false;
    this.data = this.buildData();

    this.panel.title = controller.t('projectItems');
    this.panel.webview.html = this.html();
    this.panel.iconPath = vscode.Uri.file(path.join(controller.context.extensionPath, 'media', 'keil.svg'));

    this.panel.webview.onDidReceiveMessage((msg) => this.onMessage(msg));
    this.panel.onDidDispose(() => {
      this.disposed = true;
      if (ItemsPanel.current === this) ItemsPanel.current = null;
      if (!this.saved) {
        // Discard staged changes when the tab is closed without OK.
        const project = this.controller.getProject();
        if (project) {
          project.reload().then(() => this.controller.afterProjectChanged()).catch(() => {});
        }
      }
    });
    this.postUpdate();
  }

  reveal() {
    this.panel.reveal(vscode.ViewColumn.Active);
  }

  buildData() {
    const project = this.controller.getProject();
    this.project = project;
    if (!project) {
      return {
        language: this.language,
        strings: strings(this.language),
        targets: [],
        groupsByTarget: {},
        groups: [],
        tabs: [],
      };
    }
    if (!project.getTarget(this.targetName)) {
      this.targetName = project.getCurrentTargetName();
    }
    const state = project.getItemsState(this.targetName);
    this.targetName = state.targetName;
    const allFiles = [];
    (state.groups || []).forEach((group) => {
      (group.files || []).forEach((file) => {
        allFiles.push({ ...file, group: group.name });
      });
    });
    return {
      ...state,
      allFiles,
      language: this.language,
      strings: strings(this.language),
      sync: this.controller.getSyncInfo(),
      tabs: [
        { id: 'project', label: this.controller.t('projectItems') },
        { id: 'folders', label: this.controller.t('foldersExtensions') },
        { id: 'books', label: this.controller.t('books') },
        { id: 'info', label: this.controller.t('projectInfo') },
      ],
    };
  }

  html() {
    return itemsHtml({
      extensionPath: this.controller.context.extensionPath,
      nonce: nonce(),
      cspSource: this.panel.webview.cspSource,
      data: this.data,
    });
  }

  postUpdate() {
    if (this.disposed) return;
    this.data = this.buildData();
    this.panel.title = this.controller.t('projectItems');
    this.panel.webview.postMessage({ type: 'update', data: this.data });
  }

  refreshFromProject() {
    if (this.disposed) return;
    this.data = this.buildData();
    this.panel.title = this.controller.t('projectItems');
    this.panel.webview.postMessage({ type: 'update', data: this.data });
  }

  async handleExternalChange() {
    if (this.disposed) return;
    const project = this.controller.getProject();
    if (project) await project.reload();
    this.refreshFromProject();
  }

  async confirm(message) {
    const yes = this.language === 'en' ? 'Delete' : '删除';
    const no = this.language === 'en' ? 'Cancel' : '取消';
    const result = await vscode.window.showWarningMessage(message, { modal: true }, yes, no);
    return result === yes;
  }

  async onMessage(msg) {
    if (!msg || !msg.type) return;
    const project = this.controller.getProject();
    if (!project) return;

    try {
      if (msg.type === 'dirty') {
        this.modified = !!msg.dirty;
        return;
      }
      if (msg.type === 'setLanguage') {
        await this.controller.setLanguage(msg.language);
        return;
      }
      if (msg.type === 'cancel') {
        this.saved = true;
        await project.reload();
        this.controller.afterProjectChanged();
        this.dispose();
        return;
      }
      if (msg.type === 'help') {
        vscode.window.showInformationMessage(this.controller.t('itemsHint'));
        return;
      }
      if (msg.type === 'openFile') {
        if (msg.path) await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(msg.path));
        return;
      }
      if (msg.type === 'ok') {
        await project.saveAll();
        this.saved = true;
        this.controller.afterProjectChanged();
        this.controller.toast(this.controller.t('itemsSaved'));
        this.panel.webview.postMessage({ type: 'saved', data: this.buildData() });
        setTimeout(() => this.dispose(), 120);
        return;
      }

      if (msg.targetName) this.targetName = msg.targetName;
      if (msg.type === 'setCurrentTarget') {
        project.setCurrentTarget(msg.targetName || this.targetName);
        this.targetName = project.getCurrentTargetName();
        this.controller.afterProjectChanged();
        this.postUpdate();
        return;
      }
      if (msg.type === 'addTarget') {
        const name = await vscode.window.showInputBox({
          title: this.controller.t('addTargetTitle'),
          prompt: this.controller.t('addTargetPrompt'),
          value: this.language === 'en' ? 'Target 2' : 'Target 2',
          validateInput: (value) => {
            if (!value || !value.trim()) return this.language === 'en' ? 'Name is required' : '名称不能为空';
            if (project.getTarget(value.trim())) return this.language === 'en' ? 'Target already exists' : '目标已存在';
            return '';
          },
        });
        if (!name) return;
        const created = project.addTarget(name.trim(), msg.targetName || this.targetName);
        this.targetName = created;
        this.controller.afterProjectChanged();
        this.postUpdate();
        return;
      }
      if (msg.type === 'removeTarget') {
        if (!(await this.confirm(this.controller.t('confirmRemoveTarget', msg.targetName)))) return;
        project.removeTarget(msg.targetName || this.targetName);
        this.targetName = project.getCurrentTargetName();
        this.controller.afterProjectChanged();
        this.postUpdate();
        return;
      }
      if (msg.type === 'moveTarget') {
        project.moveTarget(msg.targetName || this.targetName, msg.direction);
        this.controller.afterProjectChanged();
        this.postUpdate();
        return;
      }
      if (msg.type === 'addGroup') {
        const name = await vscode.window.showInputBox({
          title: this.controller.t('addGroupTitle'),
          prompt: this.controller.t('addGroupPrompt'),
          value: this.language === 'en' ? 'New Group' : 'New Group',
        });
        if (!name || !name.trim()) return;
        project.addGroup(msg.targetName || this.targetName, name.trim());
        this.controller.afterProjectChanged();
        this.postUpdate();
        return;
      }
      if (msg.type === 'removeGroup') {
        if (!(await this.confirm(this.controller.t('confirmRemoveGroup', msg.groupName)))) return;
        project.removeGroup(msg.targetName || this.targetName, msg.groupName);
        this.controller.afterProjectChanged();
        this.postUpdate();
        return;
      }
      if (msg.type === 'moveGroup') {
        project.moveGroup(msg.targetName || this.targetName, msg.groupName, msg.direction);
        this.controller.afterProjectChanged();
        this.postUpdate();
        return;
      }
      if (msg.type === 'addFiles') {
        const uris = await vscode.window.showOpenDialog({
          canSelectMany: true,
          canSelectFiles: true,
          canSelectFolders: false,
          title: this.controller.t('addFilesTitle'),
          filters: {
            [this.controller.t('addFilesFilter')]: ['c', 'h', 's', 'asm', 'cpp', 'cxx', 'cc', 'hpp', 'txt', 'md'],
            '*': ['*'],
          },
        });
        if (!uris || !uris.length) return;
        project.addFiles(msg.targetName || this.targetName, msg.groupName, uris.map((u) => u.fsPath));
        this.controller.afterProjectChanged();
        this.postUpdate();
        return;
      }
      if (msg.type === 'removeFile') {
        if (!(await this.confirm(this.controller.t('confirmRemoveFile', msg.fileName)))) return;
        project.removeFile(msg.targetName || this.targetName, msg.groupName, msg.fileName);
        this.controller.afterProjectChanged();
        this.postUpdate();
        return;
      }
      if (msg.type === 'moveFile') {
        project.moveFile(msg.targetName || this.targetName, msg.groupName, msg.fileName, msg.direction);
        this.controller.afterProjectChanged();
        this.postUpdate();
        return;
      }
      if (msg.type === 'refresh') {
        await project.reload();
        this.controller.afterProjectChanged();
        this.postUpdate();
      }
    } catch (err) {
      const message = String(err && err.message ? err.message : err);
      this.panel.webview.postMessage({ type: 'error', message });
      this.controller.showError(message);
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (ItemsPanel.current === this) ItemsPanel.current = null;
    this.panel.dispose();
  }

  isModified() {
    return !!this.modified;
  }
}

module.exports = { ItemsPanel };
