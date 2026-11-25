(function () {
  'use strict';

  const api = typeof acquireVsCodeApi === 'function'
    ? acquireVsCodeApi()
    : { postMessage: function () {}, getState: function () { return null; }, setState: function () {} };

  const initial = window.__KEIL__ || {};
  const state = {
    data: initial,
    expandedTargets: new Set(),
    expandedGroups: new Set(),
    selectedFile: '',
    initialized: false,
    revealPath: '',
    treeMode: 'project',
    expandedDirs: new Set(),
    dirCache: {},
    loadingDirs: new Set(),
    dirError: '',
    fsInitialized: false,
  };

  const app = document.getElementById('app');
  const icons = {
    chevD: '<svg class="chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>',
    chevR: '<svg class="chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4l4 4-4 4"/></svg>',
    target: '<svg class="tgt" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="5.2"/><circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke-linecap="round"/></svg>',
    folder: '<svg class="folder" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M2 4.2h4.1l1.1 1.5H14v6.9H2z"/><path d="M2 6h12" opacity=".7"/></svg>',
    file: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"><path d="M4 2.2h5l3 3v8.6H4z"/><path d="M9 2.2v3h3"/></svg>',
    build: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"><path d="M3 13l6.2-6.2 2 2L5 15H3z"/><path d="M9.4 3.4l3.2 3.2 1.5-1.5-3.2-3.2z"/></svg>',
    rebuild: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M13 8a5 5 0 1 1-1.5-3.6"/><path d="M13 3v3h-3"/><path d="M8 5.5v3l2 1.2"/></svg>',
    download: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v7.2"/><path d="M4.8 6.4L8 9.6l3.2-3.2"/><path d="M3 13h10"/></svg>',
    wand: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13l7-7"/><path d="M8.6 3.2l1-1 3.2 3.2-1 1z"/><path d="M11.4 5.4l1.8 1.8"/><path d="M3 3.2v2M2 4.2h2M12.2 12v2M11.2 13h2"/></svg>',
    external: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3H3v10h10V9.5"/><path d="M9 2.5h4.5V7M13.5 2.5L7.8 8.2"/></svg>',
    items: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"><path d="M2 4.2h4.1l1.1 1.5H14v6.9H2z"/><path d="M2 6h12" opacity=".65"/></svg>',
    refresh: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M13 8a5 5 0 1 1-1.5-3.6"/><path d="M13 3v3h-3"/></svg>',
    more: '<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="3.5" cy="8" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="12.5" cy="8" r="1"/></svg>',
    close: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
    cache: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5h10"/><path d="M5 4.5V3h6v1.5"/><path d="M4.5 4.5l.6 8.2h5.8l.6-8.2"/><path d="M6.7 7v3.4M9.3 7v3.4"/></svg>',
    chip: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"><rect x="4" y="4" width="8" height="8" rx="1.2"/><rect x="6.2" y="6.2" width="3.6" height="3.6" rx=".6"/><path d="M6 4V2.2M10 4V2.2M6 14v-1.8M10 14v-1.8M4 6H2.2M4 10H2.2M14 6h-1.8M14 10h-1.8" stroke-linecap="round"/></svg>',
  };

  function h(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function svg(markup) {
    const span = h('span');
    span.innerHTML = markup;
    return span.firstChild;
  }

  function label(key, fallback) {
    const dict = (state.data && state.data.strings) || {};
    return dict[key] || fallback;
  }

  function post(message) { api.postMessage(message); }

  function fileClass(type) {
    if (type === '2') return 's';
    if (type === '5') return 't';
    if (type === '4' || type === '3') return 'h';
    return 'c';
  }

  function buildHead() {
    const head = h('div', 'side-head');
    head.appendChild(h('span', null, state.data.language === 'en' ? 'KEIL PROJECT / PROJECT' : 'KEIL 工程 / 项目'));
    const tools = h('div', 'icons');
    const refresh = h('button');
    refresh.type = 'button';
    refresh.title = label('refreshDone', '刷新工程');
    refresh.appendChild(svg(icons.refresh));
    refresh.addEventListener('click', function () { post({ type: 'refresh' }); });
    const lang = h('button', 'lang-btn', state.data.language === 'en' ? 'EN' : '中');
    lang.type = 'button';
    lang.title = label('switchLanguage', '切换中英文');
    lang.addEventListener('click', function () { post({ type: 'toggleLanguage' }); });
    const cache = h('button');
    cache.type = 'button';
    cache.title = label('clearIntelliSenseCache', '清理 C/C++ 缓存');
    cache.appendChild(svg(icons.cache));
    cache.addEventListener('click', function () { post({ type: 'clearIntelliSenseCache' }); });
    const close = h('button');
    close.type = 'button';
    close.title = label('closeProject', '关闭工程');
    close.appendChild(svg(icons.close));
    close.addEventListener('click', function () { post({ type: 'closeProject' }); });
    tools.appendChild(refresh);
    tools.appendChild(lang);
    tools.appendChild(cache);
    tools.appendChild(close);
    head.appendChild(tools);
    return head;
  }

  function buildProjectCard() {
    const data = state.data;
    const card = h('div', 'project-card');
    const icon = h('div', 'proj-icon');
    icon.appendChild(svg(icons.chip));
    card.appendChild(icon);
    const meta = h('div', 'proj-meta');
    meta.appendChild(h('div', 'proj-name', (data.projectName || '—').replace(/\.uvprojx$/i, '')));
    meta.appendChild(h('div', 'proj-sub', 'MDK-ARM · ' + (data.device || 'STM32')));
    card.appendChild(meta);
    const live = h('div', 'live' + (data.keilRunning ? '' : ' off'));
    live.appendChild(h('i'));
    live.appendChild(document.createTextNode(data.keilRunning
      ? label('live', '在线')
      : label('idle', '离线')));
    live.title = data.keilRunning ? label('keilDetected', 'Keil 进程运行中') : label('keilNotDetected', 'Keil 未运行');
    card.appendChild(live);
    return card;
  }

  function buildTargetBox() {
    const data = state.data;
    const box = h('div', 'target-box');
    const cap = h('div', 'target-cap');
    cap.appendChild(h('span', null, state.data.language === 'en' ? 'CURRENT TARGET' : '当前目标'));
    cap.appendChild(h('b', null, `${(data.targets || []).length} ${data.language === 'en' ? 'targets' : '个目标'}`));
    box.appendChild(cap);
    const wrap = h('div', 'target-select');
    wrap.appendChild(svg(icons.target));
    const select = document.createElement('select');
    (data.targets || []).forEach(function (target) {
      const option = document.createElement('option');
      option.value = target.name;
      option.textContent = target.name;
      option.selected = target.isCurrent;
      select.appendChild(option);
    });
    select.addEventListener('change', function () { post({ type: 'switchTarget', targetName: select.value }); });
    wrap.appendChild(select);
    const cv = svg(icons.chevD);
    cv.classList.add('cv');
    wrap.appendChild(cv);
    box.appendChild(wrap);
    return box;
  }

  function buildActions() {
    const actions = h('div', 'actions');
    const items = [
      { mode: 'build', icon: 'build', zh: '编译', en: 'Build', tagZh: '构建 · F7', tagEn: 'BUILD · F7', primary: true },
      { mode: 'rebuild', icon: 'rebuild', zh: '重建', en: 'Rebuild', tagZh: '重新构建', tagEn: 'REBUILD' },
      { mode: 'download', icon: 'download', zh: '下载', en: 'Flash', tagZh: '烧录', tagEn: 'FLASH' },
    ];
    items.forEach(function (item) {
      const btn = h('button', 'abtn' + (item.primary ? ' primary' : ''));
      btn.type = 'button';
      btn.appendChild(svg(icons[item.icon]));
      btn.appendChild(h('b', null, state.data.language === 'en' ? item.en : item.zh));
      btn.appendChild(h('small', null, state.data.language === 'en' ? item.tagEn : item.tagZh));
      btn.addEventListener('click', function () { post({ type: 'build', mode: item.mode }); });
      actions.appendChild(btn);
    });
    return actions;
  }

  function buildSubactions() {
    const wrap = h('div', 'subactions');
    const wand = h('button', 'sbtn');
    wand.type = 'button';
    wand.appendChild(svg(icons.wand));
    wand.appendChild(document.createTextNode(state.data.language === 'en' ? 'Magic Wand' : '魔法棒'));
    wand.addEventListener('click', function () { post({ type: 'openOptions' }); });
    const items = h('button', 'sbtn');
    items.type = 'button';
    items.appendChild(svg(icons.items));
    items.appendChild(document.createTextNode(state.data.language === 'en' ? 'Project Items' : '项目项'));
    items.addEventListener('click', function () { post({ type: 'manageItems' }); });
    const keil = h('button', 'sbtn');
    keil.type = 'button';
    keil.appendChild(svg(icons.external));
    keil.appendChild(document.createTextNode(state.data.language === 'en' ? 'Open in Keil' : '在 Keil 打开'));
    keil.addEventListener('click', function () { post({ type: 'openInKeil' }); });
    wrap.appendChild(wand);
    wrap.appendChild(items);
    wrap.appendChild(keil);
    return wrap;
  }

  function buildTreeSwitch() {
    const wrap = h('div', 'tree-switch');
    const project = h('button', 'tree-mode' + (state.treeMode === 'project' ? ' active' : ''), state.data.language === 'en' ? 'Project' : '工程');
    project.type = 'button';
    project.addEventListener('click', function () { state.treeMode = 'project'; render(); });
    const files = h('button', 'tree-mode' + (state.treeMode === 'files' ? ' active' : ''), state.data.language === 'en' ? 'All Files' : '全部文件');
    files.type = 'button';
    files.addEventListener('click', function () { state.treeMode = 'files'; render(); });
    wrap.appendChild(project);
    wrap.appendChild(files);
    return wrap;
  }

  function baseName(value) {
    const text = String(value || '').replace(/[\\/]+$/, '');
    const parts = text.split(/[\\/]/);
    return parts[parts.length - 1] || text;
  }

  function projectDir() {
    const data = state.data || {};
    if (data.projectDir) return data.projectDir;
    const projectPath = data.projectPath || '';
    return projectPath.replace(/[\\/][^\\/]+$/, '');
  }

  function fileClassByName(name) {
    const ext = String(name || '').toLowerCase().replace(/^.*\./, '');
    if (ext === 's' || ext === 'asm') return 's';
    if (ext === 'h' || ext === 'hpp') return 'h';
    if (ext === 'txt' || ext === 'md') return 't';
    return 'c';
  }

  function requestDir(dirPath) {
    if (!dirPath || state.dirCache[dirPath] || state.loadingDirs.has(dirPath)) return;
    state.loadingDirs.add(dirPath);
    post({ type: 'readDir', path: dirPath });
  }

  function buildFsTree() {
    const tree = h('div', 'tree fs-tree');
    const root = projectDir();
    if (!root) {
      tree.appendChild(h('div', 'empty', label('noProject', '还没有打开的 Keil 工程。')));
      return tree;
    }
    if (!state.fsInitialized) {
      state.fsInitialized = true;
      state.expandedDirs.add(root);
      requestDir(root);
    }
    const expanded = state.expandedDirs.has(root);
    const rootRow = h('div', 'row dir root');
    rootRow.appendChild(svg(expanded ? icons.chevD : icons.chevR));
    rootRow.appendChild(svg(icons.folder));
    rootRow.appendChild(h('span', 'name', baseName(root)));
    rootRow.title = root;
    rootRow.addEventListener('click', function () {
      if (expanded) state.expandedDirs.delete(root);
      else { state.expandedDirs.add(root); requestDir(root); }
      render();
    });
    tree.appendChild(rootRow);
    if (!expanded) return tree;
    if (state.dirError) {
      tree.appendChild(h('div', 'dir-note error', state.dirError));
      return tree;
    }
    const entries = state.dirCache[root];
    if (!entries) {
      tree.appendChild(h('div', 'dir-note', label('loading', '加载中…')));
      return tree;
    }
    appendDirEntries(tree, entries, 1);
    return tree;
  }

  function appendDirEntries(tree, entries, depth) {
    entries.forEach(function (entry) {
      if (entry.kind === 'dir') {
        const expanded = state.expandedDirs.has(entry.path);
        const row = h('div', 'row dir');
        row.style.paddingLeft = (8 + depth * 14) + 'px';
        row.appendChild(svg(expanded ? icons.chevD : icons.chevR));
        row.appendChild(svg(icons.folder));
        row.appendChild(h('span', 'name', entry.name));
        row.title = entry.path;
        row.addEventListener('click', function () {
          if (expanded) state.expandedDirs.delete(entry.path);
          else { state.expandedDirs.add(entry.path); requestDir(entry.path); }
          render();
        });
        tree.appendChild(row);
        if (expanded) {
          const children = state.dirCache[entry.path];
          if (children) appendDirEntries(tree, children, depth + 1);
          else if (!state.loadingDirs.has(entry.path)) requestDir(entry.path);
          else tree.appendChild(h('div', 'dir-note', label('loading', '加载中…')));
        }
      } else {
        const selected = state.selectedFile === entry.path;
        const row = h('div', 'row file fs-file' + (selected ? ' selected' : ''));
        row.style.paddingLeft = (8 + depth * 14) + 'px';
        row.dataset.path = entry.path;
        const ic = svg(icons.file);
        ic.classList.add(fileClassByName(entry.name));
        row.appendChild(ic);
        row.appendChild(h('span', 'name', entry.name));
        row.title = entry.path;
        row.addEventListener('click', function () {
          state.selectedFile = entry.path;
          render();
          post({ type: 'openFile', path: entry.path });
        });
        tree.appendChild(row);
      }
    });
  }

  function buildTree() {
    if (state.treeMode === 'files') return buildFsTree();
    const tree = h('div', 'tree');
    const targets = state.data.targets || [];
    targets.forEach(function (target) {
      const expanded = state.expandedTargets.has(target.name);
      const row = h('div', 'row target' + (target.isCurrent ? ' current' : '') + (target.isCurrent ? '' : ' dim'));
      row.style.paddingLeft = '4px';
      row.appendChild(svg(expanded ? icons.chevD : icons.chevR));
      row.appendChild(svg(icons.target));
      row.appendChild(h('span', 'name', target.name));
      if (target.isCurrent) row.appendChild(h('span', 'cur', label('current', '当前')));
      row.title = target.name;
      row.addEventListener('click', function (event) {
        if (event.detail === 2) {
          if (!target.isCurrent) post({ type: 'switchTarget', targetName: target.name });
          return;
        }
        if (expanded) state.expandedTargets.delete(target.name);
        else state.expandedTargets.add(target.name);
        render();
      });
      tree.appendChild(row);
      if (!expanded) return;
      (target.groups || []).forEach(function (group) {
        const key = target.name + '::' + group.name;
        const gExpanded = state.expandedGroups.has(key);
        const grow = h('div', 'row group');
        grow.style.paddingLeft = '18px';
        grow.appendChild(svg(gExpanded ? icons.chevD : icons.chevR));
        grow.appendChild(svg(icons.folder));
        grow.appendChild(h('span', 'name', group.name));
        grow.appendChild(h('span', 'count', String((group.files || []).length)));
        grow.addEventListener('click', function () {
          if (gExpanded) state.expandedGroups.delete(key);
          else state.expandedGroups.add(key);
          render();
        });
        tree.appendChild(grow);
        if (!gExpanded) return;
        (group.files || []).forEach(function (file) {
          const selected = state.selectedFile === (file.absPath || file.path);
          const frow = h('div', 'row file' + (selected ? ' selected' : ''));
          frow.style.paddingLeft = '34px';
          frow.dataset.path = file.absPath || file.path;
          const ic = svg(icons.file);
          ic.classList.add(fileClass(file.type));
          frow.appendChild(ic);
          frow.appendChild(h('span', 'name', file.name));
          frow.title = file.path;
          frow.addEventListener('click', function () {
            state.selectedFile = file.absPath || file.path;
            render();
            post({ type: 'openFile', path: file.absPath || file.path });
          });
          tree.appendChild(frow);
        });
      });
    });
    if (!targets.length) {
      tree.appendChild(h('div', 'empty', label('noProject', '还没有打开的 Keil 工程。')));
    }
    return tree;
  }

  function formatUsed(value) {
    const n = Number(value) || 0;
    if (n < 1024 * 1024) return n.toLocaleString('en-US') + ' B';
    return (n / (1024 * 1024)).toFixed(2) + ' MB';
  }
  function formatTotal(value) {
    const n = Number(value) || 0;
    if (!n) return '0 B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';
    return (n / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function buildFoot() {
    const foot = h('div', 'side-foot');
    const last = state.data.lastBuild || null;
    const flashPercent = last && last.flashPercent != null ? last.flashPercent : 0;
    const ramPercent = last && last.ramPercent != null ? last.ramPercent : 0;
    const mk = (name, percent, ram, used, total) => {
      const row = h('div', 'mem');
      const head = h('div', 'mem-head');
      head.appendChild(h('b', null, name));
      head.appendChild(h('span', 'mem-size', last ? `${formatUsed(used)} / ${formatTotal(total)}` : '—'));
      head.appendChild(h('span', 'val', percent.toFixed(1) + '%'));
      row.appendChild(head);
      const bar = h('div', 'bar');
      const fill = h('i', ram ? 'ram' : '');
      fill.style.width = Math.max(0, Math.min(100, percent)) + '%';
      bar.appendChild(fill);
      row.appendChild(bar);
      row.title = last ? `${name}: ${formatUsed(used)} / ${formatTotal(total)}` : name;
      return row;
    };
    foot.appendChild(mk('FLASH', flashPercent, false, last && last.flashUsed, last && last.flashSize));
    foot.appendChild(mk('RAM', ramPercent, true, last && last.ramUsed, last && last.ramSize));
    const line = h('div', 'last-build');
    if (last) {
      line.appendChild(h('span', 'dot'));
      line.appendChild(h('span', null, label('lastBuild', '上次构建')));
      if (last.success) line.appendChild(h('span', 'ok', `${last.errors || 0} ${state.data.language === 'en' ? 'errors' : '错误'}`));
      else line.appendChild(h('span', 'er', `${last.errors || 0} ${state.data.language === 'en' ? 'errors' : '错误'}`));
      line.appendChild(h('span', null, `· ${(last.durationMs / 1000).toFixed(1)}${state.data.language === 'en' ? 's' : ' 秒'}`));
    } else {
      line.appendChild(h('span', null, label('notBuilt', '尚未构建')));
    }
    foot.appendChild(line);
    return foot;
  }

  function buildEmpty() {
    const empty = h('div', 'empty');
    empty.appendChild(svg(icons.chip));
    empty.appendChild(h('p', null, label('noProject', '还没有打开的 Keil 工程。')));
    const btn = h('button', null, label('openProject', '打开 Keil 工程'));
    btn.type = 'button';
    btn.addEventListener('click', function () { post({ type: 'openProject' }); });
    empty.appendChild(btn);
    return empty;
  }

  function render() {
    app.textContent = '';
    if (!state.data || !state.data.projectName || !(state.data.targets || []).length) {
      app.appendChild(buildHead());
      app.appendChild(buildEmpty());
      return;
    }
    app.appendChild(buildHead());
    app.appendChild(buildProjectCard());
    app.appendChild(buildTargetBox());
    app.appendChild(buildActions());
    app.appendChild(buildSubactions());
    app.appendChild(buildTreeSwitch());
    app.appendChild(buildTree());
    app.appendChild(buildFoot());
    if (state.revealPath) {
      const target = app.querySelector(`[data-path="${cssEscape(state.revealPath)}"]`);
      if (target) {
        state.selectedFile = state.revealPath;
        target.classList.add('selected');
        target.scrollIntoView({ block: 'nearest' });
      }
      state.revealPath = '';
    }
  }

  function cssEscape(value) {
    if (window.CSS && CSS.escape) return CSS.escape(value);
    return String(value).replace(/["\\]/g, '\\$&');
  }

  function rememberExpansion(data) {
    if (!state.initialized) {
      const current = (data.targets || []).find(function (t) { return t.isCurrent; });
      if (current) {
        state.expandedTargets.add(current.name);
        const first = (current.groups || [])[0];
        if (first) state.expandedGroups.add(current.name + '::' + first.name);
      }
      state.initialized = true;
    }
  }

  function updateData(data, revealPath) {
    if (!data) return;
    const previousDir = projectDir();
    state.data = data;
    const nextDir = projectDir();
    if (nextDir !== previousDir) {
      state.dirCache = {};
      state.loadingDirs = new Set();
      state.expandedDirs = new Set();
      state.dirError = '';
      state.fsInitialized = false;
    }
    if (revealPath) state.revealPath = revealPath;
    rememberExpansion(data);
    if (revealPath) {
      (data.targets || []).forEach(function (target) {
        (target.groups || []).forEach(function (group) {
          (group.files || []).forEach(function (file) {
            if ((file.absPath || file.path) === revealPath) {
              state.expandedTargets.add(target.name);
              state.expandedGroups.add(target.name + '::' + group.name);
              state.selectedFile = revealPath;
            }
          });
        });
      });
    }
    render();
  }

  window.addEventListener('message', function (event) {
    const msg = event.data || {};
    if (msg.type === 'update') {
      updateData(msg.data, msg.revealPath);
    } else if (msg.type === 'revealFile') {
      updateData(msg.data || state.data, msg.path);
    } else if (msg.type === 'dirEntries') {
      if (msg.path) {
        state.dirCache[msg.path] = msg.entries || [];
        state.loadingDirs.delete(msg.path);
      }
      state.dirError = '';
      render();
    } else if (msg.type === 'dirError') {
      if (msg.path) state.loadingDirs.delete(msg.path);
      state.dirError = msg.message || '读取目录失败';
      render();
    }
  });

  rememberExpansion(state.data);
  render();
})();