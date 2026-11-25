'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');
const { createMock } = require('./mock-vscode');

const repo = path.resolve(__dirname, '..');
const source = path.join(repo, 'test-project');
const tmpRoot = path.join(repo, 'test', '.tmp-dist');
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

  const extension = require('../dist/extension.js');
  const context = {
    subscriptions: [],
    extensionPath: repo,
    workspaceState: mock.workspace.workspaceState,
  };
  extension.activate(context);
  await new Promise((resolve) => setTimeout(resolve, 800));
  assert(mock.__state.webviewViews.length === 1, 'sidebar webview view created');
  assert(mock.__state.statusItems.length === 4, 'status items created');
  assert(mock.__state.commands.has('keilStudio.build'), 'build command registered');
  extension.deactivate();
  fs.rmSync(tmpRoot, { recursive: true, force: true });
  console.log('DIST ACTIVATE PASS');
}

main().catch((err) => {
  console.error('FAIL', err);
  process.exitCode = 1;
});
