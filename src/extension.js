'use strict';

const vscode = require('vscode');
const { Controller } = require('./controller');

let controller = null;

function activate(context) {
  controller = new Controller(context);
  context.subscriptions.push(controller);
  controller.start().catch((err) => {
    vscode.window.showErrorMessage(`KeilEx: ${err && err.message ? err.message : err}`);
  });
}

function deactivate() {
  if (controller) {
    controller.dispose();
    controller = null;
  }
}

module.exports = { activate, deactivate };
