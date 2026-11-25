'use strict';

class Disposable {
  constructor(fn) {
    this.fn = fn;
  }
  dispose() {
    if (this.fn) this.fn();
    this.fn = null;
  }
}

class EventEmitter {
  constructor() {
    this.listeners = [];
    this.event = (listener) => {
      this.listeners.push(listener);
      return new Disposable(() => {
        this.listeners = this.listeners.filter((l) => l !== listener);
      });
    };
  }
  fire(value) {
    for (const listener of this.listeners.slice()) listener(value);
  }
}

class TreeItem {
  constructor(label, collapsibleState) {
    this.label = label;
    this.collapsibleState = collapsibleState;
  }
}

class ThemeIcon {
  constructor(id) {
    this.id = id;
  }
}

class Range {
  constructor(startLine, startColumn, endLine, endColumn) {
    this.start = { line: startLine, character: startColumn };
    this.end = { line: endLine, character: endColumn };
  }
}

class Diagnostic {
  constructor(range, message, severity) {
    this.range = range;
    this.message = message;
    this.severity = severity;
  }
}

class Uri {
  constructor(fsPath) {
    this.fsPath = fsPath;
    this.path = fsPath;
    this.scheme = 'file';
  }
  static file(fsPath) {
    return new Uri(fsPath);
  }
  toString() {
    return this.fsPath;
  }
}

class RelativePattern {
  constructor(base, pattern) {
    this.base = base;
    this.pattern = pattern;
  }
}

function createMock(projectPath) {
  const settings = {
    uv4Path: 'F:/KEIL/UV4/UV4.exe',
    language: 'zh',
    buildBeforeDownload: true,
    showBuildOutput: false,
    autoRefresh: true,
    warnWhenKeilRunning: false,
    keilPollSeconds: 0,
  };
  const state = new Map();
  const commands = new Map();
  const panels = [];
  const treeViews = [];
  const webviewViews = [];
  const statusItems = [];
  const outputs = [];
  const diagnostics = [];

  const config = {
    get(key, def) {
      const short = String(key).replace(/^keilStudio\./, '');
      return Object.prototype.hasOwnProperty.call(settings, short) ? settings[short] : def;
    },
    inspect() {
      return { workspaceValue: undefined };
    },
    async update(key, value) {
      settings[String(key).replace(/^keilStudio\./, '')] = value;
    },
  };

  const window = {
    createOutputChannel(name) {
      const channel = {
        name,
        lines: [],
        appendLine(line) { this.lines.push(String(line)); },
        show() {},
        dispose() {},
      };
      outputs.push(channel);
      return channel;
    },
    createStatusBarItem(alignment, priority) {
      const item = {
        alignment,
        priority,
        text: '',
        tooltip: '',
        command: '',
        visible: false,
        show() { this.visible = true; },
        hide() { this.visible = false; },
        dispose() {},
      };
      statusItems.push(item);
      return item;
    },
    createTreeView(id, options) {
      const view = {
        id,
        options,
        badge: undefined,
        message: '',
        async reveal() {},
        dispose() {},
      };
      treeViews.push(view);
      return view;
    },
    registerWebviewViewProvider(id, provider, options) {
      webviewViews.push({ id, provider, options });
      return new Disposable(() => {
        const index = webviewViews.findIndex((item) => item.provider === provider);
        if (index >= 0) webviewViews.splice(index, 1);
      });
    },
    createWebviewPanel(type, title, column, options) {
      let messageHandler = null;
      let disposeHandler = null;
      const panel = {
        type,
        title,
        column,
        options,
        iconPath: null,
        messages: [],
        webview: {
          html: '',
          cspSource: 'vscode-resource://test',
          postMessage(message) {
            panel.messages.push(message);
            return Promise.resolve(true);
          },
          onDidReceiveMessage(handler) {
            messageHandler = handler;
            return new Disposable();
          },
          onDidDispose(handler) {
            disposeHandler = handler;
            return new Disposable();
          },
        },
        onDidDispose(handler) {
          disposeHandler = handler;
          return new Disposable();
        },
        reveal() {},
        dispose() {
          if (disposeHandler) disposeHandler();
        },
        async receive(message) {
          if (messageHandler) await messageHandler(message);
        },
      };
      panels.push(panel);
      return panel;
    },
    setStatusBarMessage() { return new Disposable(); },
    async showInformationMessage() { return undefined; },
    async showErrorMessage() { return undefined; },
    async showWarningMessage() { return undefined; },
    async showOpenDialog() { return []; },
    async showQuickPick(items) { return items && items[0]; },
    async showInputBox() { return 'Test'; },
    activeTextEditor: undefined,
  };

  const workspace = {
    getConfiguration() { return config; },
    async findFiles() { return [Uri.file(projectPath)]; },
    createFileSystemWatcher() {
      return {
        onDidChange() { return new Disposable(); },
        onDidCreate() { return new Disposable(); },
        onDidDelete() { return new Disposable(); },
        dispose() {},
      };
    },
    onDidChangeConfiguration() { return new Disposable(); },
    asRelativePath(uri) { return uri.fsPath; },
    workspaceState: {
      get(key) { return state.get(key); },
      async update(key, value) { state.set(key, value); },
    },
    onDidChangeWorkspaceFolders() { return new Disposable(); },
  };

  const mock = {
    Disposable,
    EventEmitter,
    TreeItem,
    ThemeIcon,
    Range,
    Diagnostic,
    Uri,
    RelativePattern,
    StatusBarAlignment: { Left: 1, Right: 2 },
    ViewColumn: { Active: -1, One: 1 },
    ConfigurationTarget: { Global: 1, Workspace: 2 },
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    window,
    workspace,
    commands: {
      registerCommand(id, fn) {
        commands.set(id, fn);
        return new Disposable(() => commands.delete(id));
      },
      async executeCommand() {},
    },
    languages: {
      createDiagnosticCollection(name) {
        const collection = {
          name,
          map: new Map(),
          clear() { this.map.clear(); },
          set(uri, list) { this.map.set(uri, list); },
          dispose() {},
        };
        diagnostics.push(collection);
        return collection;
      },
    },
    env: { language: 'zh-cn' },
    extensions: {
      getExtension() { return { extensionPath: 'F:/KeilEx' }; },
    },
  };
  mock.__state = { settings, commands, panels, treeViews, webviewViews, statusItems, outputs, diagnostics };
  return mock;
}

module.exports = { createMock };
