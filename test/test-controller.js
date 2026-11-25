'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const { createMock } = require('./mock-vscode');

const repo = path.resolve(__dirname, '..');
const source = path.join(repo, 'test-project');
const tmpRoot = path.join(repo, 'test', '.tmp-controller');
const work = path.join(tmpRoot, 'project');
const projectPath = path.join(work, 'Projects', 'MDK-ARM', 'atk_f103.uvprojx');

async function main() {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
  fs.mkdirSync(tmpRoot, { recursive: true });
  fs.cpSync(source, work, { recursive: true });

  const mock = createMock(projectPath);
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === 'vscode') return mock;
    return originalLoad.call(this, request, parent, isMain);
  };

  const { Controller } = require('../src/controller');
  const { OptionsPanel } = require('../src/ui/optionsPanel');
  const { ItemsPanel } = require('../src/ui/itemsPanel');

  const context = {
    subscriptions: [],
    extensionPath: repo,
    workspaceState: mock.workspace.workspaceState,
  };

  const controller = new Controller(context);
  await controller.start();
  assert(controller.project, 'project loaded');
  assert.strictEqual(controller.project.getCurrentTargetName(), 'Template');
  assert(controller.sidebar, 'sidebar provider');
  assert(mock.__state.webviewViews.length === 1, 'one webview view');
  const provider = mock.__state.webviewViews[0];
  const view = {
    webview: {
      html: '',
      cspSource: 'vscode-resource://test',
      options: {},
      onDidReceiveMessage() { return new mock.Disposable(); },
      postMessage() { return Promise.resolve(true); },
    },
    onDidDispose() { return new mock.Disposable(); },
    show() {},
  };
  await provider.provider.resolveWebviewView(view, {});
  assert(view.webview.html.includes('KEIL 工程'), 'sidebar html rendered');
  assert(provider.id === 'keilStudio.project', 'sidebar view id');
  assert(mock.__state.statusItems.length === 4, 'four status items');
  console.log('PASS controller start');

  await controller.switchTarget({ kind: 'target', target: { name: 'Template' } });
  assert(controller.project.optDoc, 'opt doc exists');
  console.log('PASS controller target');

  await controller.openOptions();
  assert(OptionsPanel.current, 'options panel open');
  const optionsPanel = OptionsPanel.current;
  assert(optionsPanel.panel.webview.html.includes('Options for Target') || optionsPanel.panel.webview.html.includes('目标选项'));
  await optionsPanel.panel.receive({ type: 'dirty', dirty: true });
  assert(optionsPanel.isDirty(), 'options dirty');
  await controller.toggleLanguage();
  assert.strictEqual(mock.__state.settings.language, 'zh', 'language guard');
  await optionsPanel.panel.receive({ type: 'dirty', dirty: false });
  await optionsPanel.panel.receive({ type: 'apply', values: { xtal: '20' }, close: false });
  assert.strictEqual(controller.project.getOptionValue('Template', 'opt', ['TargetOption', 'CLKADS']), '20000000');
  assert(mock.__state.panels.length === 1, 'one webview panel');
  optionsPanel.dispose();
  console.log('PASS controller options');

  await controller.manageItems();
  assert(ItemsPanel.current, 'items panel open');
  const itemsPanel = ItemsPanel.current;
  await itemsPanel.panel.receive({ type: 'dirty', dirty: true });
  assert(itemsPanel.isModified(), 'items modified');
  await controller.toggleLanguage();
  assert.strictEqual(mock.__state.settings.language, 'zh', 'language guard items');
  await itemsPanel.panel.receive({ type: 'cancel' });
  assert(!ItemsPanel.current, 'items panel closed on cancel');
  console.log('PASS controller items');

  await controller.closeProject();
  assert.strictEqual(controller.project, null, 'project closed');
  controller.dispose();
  fs.rmSync(tmpRoot, { recursive: true, force: true });
  console.log('ALL CONTROLLER PASS');
}

main().catch((err) => {
  console.error('FAIL', err);
  process.exitCode = 1;
});
