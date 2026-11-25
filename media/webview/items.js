(function () {
  'use strict';

  const api = typeof acquireVsCodeApi === 'function'
    ? acquireVsCodeApi()
    : { postMessage: function () {}, getState: function () { return null; }, setState: function () {} };

  const initial = window.__KEIL__ || {};
  const state = {
    data: initial,
    activeTab: 'project',
    selection: { target: '', group: '', file: '' },
    fileMode: 'all',
    search: '',
    modified: false,
    busy: false,
    footer: null,
  };

  const app = document.getElementById('app');
  const icons = {
    folder: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"><path d="M2 4.2h4.1l1.1 1.5H14v6.9H2z"/><path d="M2 6h12" opacity=".65"/></svg>',
    target: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35"><circle cx="8" cy="8" r="5.1"/><circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke-linecap="round"/></svg>',
    file: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M4 2.2h5l3 3v8.6H4z"/><path d="M9 2.2v3h3"/></svg>',
    plus: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>',
    minus: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M3 8h10"/></svg>',
    up: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13V3M4 7l4-4 4 4"/></svg>',
    down: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v10M4 9l4 4 4-4"/></svg>',
    close: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
    external: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3H3v10h10V9.5"/><path d="M9 2.5h4.5V7M13.5 2.5L7.8 8.2"/></svg>',
    check: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.8 8.4l3.1 3.1 7.3-7.3"/></svg>',
  };

  function h(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function iconSvg(markup) {
    const span = h('span');
    span.innerHTML = markup;
    return span.firstChild;
  }

  function label(key, fallback) {
    const dict = (state.data && state.data.strings) || {};
    return dict[key] || fallback;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function targetList() { return state.data.targets || []; }
  function groupsFor(name) {
    const map = state.data.groupsByTarget || {};
    return map[name] || (name === state.data.targetName ? state.data.groups : []) || [];
  }
  function selectedTarget() { return targetList().find(function (t) { return t.name === state.selection.target; }) || null; }
  function selectedGroup() { return groupsFor(state.selection.target).find(function (g) { return g.name === state.selection.group; }) || null; }
  function selectedFile() {
    const g = selectedGroup();
    return g ? (g.files.find(function (f) { return f.name === state.selection.file; }) || null) : null;
  }
  function allFilesFor(targetName) {
    return groupsFor(targetName).reduce(function (out, group) {
      group.files.forEach(function (file) {
        out.push({ ...file, group: group.name });
      });
      return out;
    }, []);
  }
  function visibleFiles() {
    let files = state.fileMode === 'all'
      ? allFilesFor(state.selection.target)
      : (selectedGroup() ? selectedGroup().files : []);
    const q = (state.search || '').trim().toLowerCase();
    if (q) {
      files = files.filter(function (f) {
        return (f.name + ' ' + (f.path || '') + ' ' + (f.group || '')).toLowerCase().indexOf(q) >= 0;
      });
    }
    return files;
  }

  function ensureSelection() {
    const targets = targetList();
    if (!targets.length) {
      state.selection = { target: '', group: '', file: '' };
      return;
    }
    let target = targets.find(function (t) { return t.name === state.selection.target; });
    if (!target) target = targets.find(function (t) { return t.isCurrent; }) || targets[0];
    state.selection.target = target.name;
    const groups = groupsFor(target.name);
    let group = groups.find(function (g) { return g.name === state.selection.group; });
    if (!group) group = groups[0] || null;
    state.selection.group = group ? group.name : '';
    if (group) {
      const file = group.files.find(function (f) { return f.name === state.selection.file; });
      state.selection.file = file ? file.name : '';
    } else {
      state.selection.file = '';
    }
  }

  function buildTitle() {
    const bar = h('div', 'dlg-title');
    const ico = h('span', 'ico');
    ico.appendChild(iconSvg(icons.folder));
    bar.appendChild(ico);
    bar.appendChild(document.createTextNode(label('projectItems', '项目项')));
    return bar;
  }

  function buildTabs() {
    const tabs = h('div', 'dlg-tabs');
    (state.data.tabs || []).forEach(function (tab) {
      const btn = h('button', 'dlg-tab' + (tab.id === state.activeTab ? ' active' : ''), tab.label);
      btn.type = 'button';
      btn.dataset.tab = tab.id;
      btn.addEventListener('click', function () {
        state.activeTab = tab.id;
        Array.prototype.forEach.call(tabs.querySelectorAll('.dlg-tab'), function (n) {
          n.classList.toggle('active', n.dataset.tab === tab.id);
        });
        renderBody();
      });
      tabs.appendChild(btn);
    });
    return tabs;
  }

  function buildPane(options) {
    const pane = h('div', 'pane' + (options.files ? ' files-pane' : ''));
    const head = h('div', 'pane-head');
    head.appendChild(document.createTextNode(options.title));
    if (options.zh && options.zh !== options.title) head.appendChild(h('span', 'zh', options.zh));
    head.appendChild(h('span', 'spacer'));
    const tools = h('div', 'tools');
    (options.tools || []).forEach(function (tool) {
      const btn = h('button', 'tool' + (tool.danger ? ' danger' : ''));
      btn.type = 'button';
      btn.title = tool.title;
      btn.disabled = !!tool.disabled;
      btn.appendChild(iconSvg(icons[tool.icon] || icons.file));
      btn.addEventListener('click', tool.action);
      tools.appendChild(btn);
    });
    head.appendChild(tools);
    pane.appendChild(head);

    const list = h('div', 'listbox');
    if (!options.rows.length) list.appendChild(h('div', 'empty-list', label('empty', '这里还没有内容。')));
    options.rows.forEach(function (row) {
      const el = h('div', 'krow' + (row.id === options.selected ? ' selected' : ''));
      el.dataset.search = ((row.label || '') + ' ' + (row.meta || '') + ' ' + (row.badge || '') + ' ' + (row.tooltip || '')).toLowerCase();
      const ic = iconSvg(icons[row.icon] || icons.file);
      if (row.iconClass) ic.classList.add(row.iconClass);
      el.appendChild(ic);
      el.appendChild(h('span', 'name', row.label));
      if (row.meta) el.appendChild(h('span', 'meta', row.meta));
      if (row.badge) el.appendChild(h('span', 'badge ' + (row.badgeClass || ''), row.badge));
      el.title = row.tooltip || row.meta || row.label;
      el.addEventListener('click', function () { options.onSelect(row.id); });
      if (options.onDouble) el.addEventListener('dblclick', function () { options.onDouble(row.id); });
      list.appendChild(el);
    });
    pane.appendChild(list);
    return pane;
  }

  function buildProjectBody() {
    const wrap = h('div');
    const allCount = allFilesFor(state.selection.target).length;
    const toolbar = h('div', 'items-toolbar');
    const title = h('div', 'items-title');
    title.appendChild(h('b', null, label('projectItems', '项目项')));
    title.appendChild(h('span', null, ' · ' + allCount + ' ' + (state.data.language === 'en' ? 'files' : '个文件')));
    toolbar.appendChild(title);
    toolbar.appendChild(h('span', 'spacer'));
    const seg = h('div', 'file-mode');
    const allBtn = h('button', 'seg-btn' + (state.fileMode === 'all' ? ' active' : ''), label('allFiles', '全部文件'));
    allBtn.type = 'button';
    allBtn.addEventListener('click', function () { state.fileMode = 'all'; renderBody(); });
    const groupBtn = h('button', 'seg-btn' + (state.fileMode === 'group' ? ' active' : ''), label('currentGroup', '当前分组'));
    groupBtn.type = 'button';
    groupBtn.addEventListener('click', function () { state.fileMode = 'group'; renderBody(); });
    seg.appendChild(allBtn);
    seg.appendChild(groupBtn);
    toolbar.appendChild(seg);
    const searchWrap = h('div', 'items-search');
    const search = document.createElement('input');
    search.type = 'text';
    search.placeholder = label('searchFiles', '搜索文件 / 分组…');
    search.value = state.search || '';
    search.addEventListener('input', function () {
      state.search = search.value;
      applySearch();
    });
    searchWrap.appendChild(search);
    toolbar.appendChild(searchWrap);
    wrap.appendChild(toolbar);

    const panes = h('div', 'panes');

    panes.appendChild(buildPane({
      title: label('projectTargets', 'Project Targets'),
      zh: label('targets', '目标'),
      rows: targetList().map(function (t) {
        return {
          id: t.name,
          icon: 'target',
          label: t.name,
          meta: t.isCurrent ? '' : (t.device || ''),
          badge: t.isCurrent ? label('current', '当前') : '',
          badgeClass: 'current',
        };
      }),
      selected: state.selection.target,
      onSelect: function (name) {
        state.selection.target = name;
        const groups = groupsFor(name);
        state.selection.group = groups[0] ? groups[0].name : '';
        state.selection.file = '';
        render();
      },
      onDouble: function (name) { api.postMessage({ type: 'setCurrentTarget', targetName: name }); },
      tools: [
        { icon: 'plus', title: label('addTarget', '新增目标'), action: function () { api.postMessage({ type: 'addTarget', targetName: state.selection.target }); } },
        { icon: 'close', title: label('removeTarget', '删除目标'), danger: true, disabled: targetList().length <= 1, action: function () { api.postMessage({ type: 'removeTarget', targetName: state.selection.target }); } },
        { icon: 'up', title: label('moveUp', '上移'), disabled: !canMoveTarget(-1), action: function () { api.postMessage({ type: 'moveTarget', targetName: state.selection.target, direction: 'up' }); } },
        { icon: 'down', title: label('moveDown', '下移'), disabled: !canMoveTarget(1), action: function () { api.postMessage({ type: 'moveTarget', targetName: state.selection.target, direction: 'down' }); } },
      ],
    }));

    const groups = groupsFor(state.selection.target);
    panes.appendChild(buildPane({
      title: label('groups', 'Groups'),
      zh: label('groupsZh', '分组'),
      rows: groups.map(function (g) {
        return { id: g.name, icon: 'folder', label: g.name, meta: String(g.files.length) + (state.data.language === 'en' ? (g.files.length === 1 ? ' file' : ' files') : ' 个') };
      }),
      selected: state.selection.group,
      onSelect: function (name) {
        state.selection.group = name;
        state.selection.file = '';
        render();
      },
      tools: [
        { icon: 'plus', title: label('addGroup', '新增分组'), action: function () { api.postMessage({ type: 'addGroup', targetName: state.selection.target }); } },
        { icon: 'close', title: label('removeGroup', '删除分组'), danger: true, disabled: !state.selection.group, action: function () { api.postMessage({ type: 'removeGroup', targetName: state.selection.target, groupName: state.selection.group }); } },
        { icon: 'up', title: label('moveUp', '上移'), disabled: !canMoveGroup(-1), action: function () { api.postMessage({ type: 'moveGroup', targetName: state.selection.target, groupName: state.selection.group, direction: 'up' }); } },
        { icon: 'down', title: label('moveDown', '下移'), disabled: !canMoveGroup(1), action: function () { api.postMessage({ type: 'moveGroup', targetName: state.selection.target, groupName: state.selection.group, direction: 'down' }); } },
      ],
    }));

    const files = visibleFiles();
    const selectedFileInfo = files.find(function (f) { return f.name === state.selection.file; }) || null;
    panes.appendChild(buildPane({
      title: label('files', '文件') + ' · ' + files.length,
      zh: '',
      files: true,
      rows: files.map(function (f) {
        return {
          id: f.name,
          icon: 'file',
          iconClass: f.type === '2' ? 's' : (f.type === '5' ? 'h' : 'c'),
          label: f.name,
          meta: '',
          badge: state.fileMode === 'all' ? f.group : '',
          badgeClass: 'group',
          tooltip: f.absPath || f.path,
        };
      }),
      selected: state.selection.file,
      onSelect: function (name) {
        const file = visibleFiles().find(function (f) { return f.name === name; });
        state.selection.file = name;
        if (file && file.group) state.selection.group = file.group;
        render();
      },
      onDouble: function (name) {
        const file = visibleFiles().find(function (f) { return f.name === name; });
        if (file) api.postMessage({ type: 'openFile', path: file.absPath || file.path });
      },
      tools: [
        { icon: 'external', title: label('openFile', '打开文件'), disabled: !state.selection.file, action: function () { if (selectedFileInfo) api.postMessage({ type: 'openFile', path: selectedFileInfo.absPath || selectedFileInfo.path }); } },
        { icon: 'close', title: label('removeFile', '移除文件'), danger: true, disabled: !state.selection.file, action: function () { api.postMessage({ type: 'removeFile', targetName: state.selection.target, groupName: state.selection.group, fileName: state.selection.file }); } },
        { icon: 'up', title: label('moveUp', '上移'), disabled: !canMoveFile(-1), action: function () { api.postMessage({ type: 'moveFile', targetName: state.selection.target, groupName: state.selection.group, fileName: state.selection.file, direction: 'up' }); } },
        { icon: 'down', title: label('moveDown', '下移'), disabled: !canMoveFile(1), action: function () { api.postMessage({ type: 'moveFile', targetName: state.selection.target, groupName: state.selection.group, fileName: state.selection.file, direction: 'down' }); } },
      ],
    }));
    wrap.appendChild(panes);

    const bar = h('div', 'action-row');
    const setCurrent = h('button', 'btn small', label('setCurrent', 'Set as Current Target'));
    setCurrent.type = 'button';
    setCurrent.disabled = !state.selection.target || (selectedTarget() && selectedTarget().isCurrent);
    setCurrent.addEventListener('click', function () { api.postMessage({ type: 'setCurrentTarget', targetName: state.selection.target }); });
    bar.appendChild(setCurrent);
    bar.appendChild(h('span', 'spacer'));
    const addFiles = h('button', 'btn small', label('addFiles', 'Add Files…'));
    addFiles.type = 'button';
    addFiles.disabled = !state.selection.group;
    addFiles.addEventListener('click', function () { api.postMessage({ type: 'addFiles', targetName: state.selection.target, groupName: state.selection.group }); });
    bar.appendChild(addFiles);
    wrap.appendChild(bar);
    return wrap;
  }

  function applySearch() {
    const q = (state.search || '').trim().toLowerCase();
    Array.prototype.forEach.call(document.querySelectorAll('.files-pane .krow'), function (row) {
      row.style.display = (!q || (row.dataset.search || '').indexOf(q) >= 0) ? '' : 'none';
    });
  }

  function buildInfoBody() {
    const card = h('div', 'info-card');
    if (state.activeTab === 'folders') {
      card.appendChild(h('div', 'info-head', label('foldersExtensions', 'Folders / Extensions')));
      const list = state.data.extensions || [];
      if (!list.length) {
        card.appendChild(h('div', 'note', label('noExtensions', '工程文件中没有 Extensions 段。')));
      } else {
        const scroll = h('div', 'info-scroll');
        const table = document.createElement('table');
        table.className = 'table';
        const thead = document.createElement('thead');
        const tr = document.createElement('tr');
        tr.appendChild(h('th', null, label('name', '名称')));
        tr.appendChild(h('th', null, label('value', '值')));
        thead.appendChild(tr);
        table.appendChild(thead);
        const tbody = document.createElement('tbody');
        list.forEach(function (item) {
          const row = document.createElement('tr');
          row.appendChild(h('td', null, item.name));
          row.appendChild(h('td', null, item.value));
          tbody.appendChild(row);
        });
        table.appendChild(tbody);
        scroll.appendChild(table);
        card.appendChild(scroll);
      }
      card.appendChild(h('div', 'note', label('readonlyHint', '首版只读；这些扩展名由 Keil 的 Folders/Extensions 页签维护。')));
      return card;
    }
    if (state.activeTab === 'books') {
      card.appendChild(h('div', 'info-head', label('books', 'Books')));
      const list = state.data.books || [];
      if (!list.length) {
        card.appendChild(h('div', 'note', label('noBooks', '该工程没有 Books 配置。')));
      } else {
        const scroll = h('div', 'info-scroll');
        const table = document.createElement('table');
        table.className = 'table';
        const tbody = document.createElement('tbody');
        list.forEach(function (item) {
          const row = document.createElement('tr');
          row.appendChild(h('td', null, item.name));
          row.appendChild(h('td', null, item.value));
          tbody.appendChild(row);
        });
        table.appendChild(tbody);
        scroll.appendChild(table);
        card.appendChild(scroll);
      }
      return card;
    }
    card.appendChild(h('div', 'info-head', label('projectInfo', 'Project Info / Layer')));
    const info = state.data.info || {};
    const rows = [
      [label('projectFile', '工程文件'), state.data.projectPath || ''],
      [label('projectDir', '工程目录'), state.data.projectDir || ''],
      [label('schemaVersion', 'Schema'), info.schemaVersion || ''],
      [label('toolset', 'Toolset'), info.toolset || ''],
      [label('packId', 'Pack ID'), info.packId || ''],
      [label('device', 'Device'), info.device || ''],
      [label('targets', 'Targets'), String(info.targetCount || 0)],
      [label('optFile', 'Options 文件'), info.optPath || ''],
      [label('currentTarget', '当前目标'), state.data.currentTarget || ''],
    ];
    const scroll = h('div', 'info-scroll');
    const kv = h('div', 'kv');
    rows.forEach(function (pair) {
      kv.appendChild(h('div', null, pair[0]));
      kv.appendChild(h('div', null, pair[1]));
    });
    scroll.appendChild(kv);
    card.appendChild(scroll);
    card.appendChild(h('div', 'note', label('layerHint', 'Layer 与 RTE 组件在首版中保留原样，不做结构编辑。')));
    return card;
  }

  function buildBody() {
    const body = h('div', 'dlg-body');
    if (state.activeTab === 'project') {
      if (!targetList().length) {
        const empty = h('div', 'empty-list', label('noProject', '还没有打开的 Keil 工程。'));
        empty.style.height = '300px';
        body.appendChild(empty);
      } else {
        body.appendChild(buildProjectBody());
      }
    } else {
      body.appendChild(buildInfoBody());
    }
    return body;
  }

  function buildFoot() {
    const foot = h('div', 'dlg-foot');
    const ok = h('button', 'b primary', label('ok', 'OK'));
    ok.type = 'button';
    ok.addEventListener('click', function () {
      state.busy = true;
      updateFoot();
      api.postMessage({ type: 'ok' });
    });
    const cancel = h('button', 'b', label('cancel', 'Cancel'));
    cancel.type = 'button';
    cancel.addEventListener('click', function () { api.postMessage({ type: 'cancel' }); });
    const help = h('button', 'b', label('help', '帮助'));
    help.type = 'button';
    help.title = label('itemsHint', '双击目标可设为当前；修改先暂存在内存，点击确定后写回工程文件。');
    help.addEventListener('click', function () { api.postMessage({ type: 'help' }); });
    foot.appendChild(ok);
    foot.appendChild(cancel);
    foot.appendChild(help);
    foot.appendChild(h('span', 'spacer'));
    const hint = h('span', 'hint', state.modified
      ? label('unsaved', '有未保存的修改')
      : label('itemsUnchanged', '未修改工程文件'));
    foot.appendChild(hint);
    state.footer = { ok: ok, cancel: cancel, hint: hint };
    return foot;
  }

  function buildSyncStrip() {
    const strip = h('div', 'sync-strip');
    strip.appendChild(h('span', 'dot'));
    strip.appendChild(document.createTextNode(label('itemsSync', '与 Keil 双向同步 · 修改将原位写入 .uvprojx / .uvoptx')));
    const sync = state.data.sync || {};
    strip.appendChild(h('span', 'r', (sync.lastWrite ? label('lastWrite', '上次写入') + ' ' + sync.lastWrite : label('synced', '已同步')) + ' · ' + label('noConflicts', '0 冲突')));
    return strip;
  }

  function updateFoot() {
    if (!state.footer) return;
    state.footer.ok.disabled = state.busy;
    state.footer.cancel.disabled = state.busy;
    state.footer.hint.textContent = state.modified
      ? label('unsaved', '有未保存的修改')
      : label('itemsUnchanged', '未修改工程文件');
  }

  function canMoveTarget(direction) {
    const list = targetList();
    const i = list.findIndex(function (t) { return t.name === state.selection.target; });
    return i >= 0 && i + direction >= 0 && i + direction < list.length;
  }
  function canMoveGroup(direction) {
    const groups = groupsFor(state.selection.target);
    const i = groups.findIndex(function (g) { return g.name === state.selection.group; });
    return i >= 0 && i + direction >= 0 && i + direction < groups.length;
  }
  function canMoveFile(direction) {
    const group = selectedGroup();
    if (!group) return false;
    const i = group.files.findIndex(function (f) { return f.name === state.selection.file; });
    return i >= 0 && i + direction >= 0 && i + direction < group.files.length;
  }

  function renderBody() {
    const old = app.querySelector('.dlg-body');
    if (!old) return;
    const next = buildBody();
    old.parentNode.replaceChild(next, old);
    updateFoot();
  }

  function render() {
    ensureSelection();
    app.textContent = '';
    const dlg = h('div', 'dlg');
    dlg.appendChild(buildTitle());
    dlg.appendChild(buildTabs());
    dlg.appendChild(buildBody());
    dlg.appendChild(buildFoot());
    dlg.appendChild(buildSyncStrip());
    app.appendChild(dlg);
  }

  function showToast(message, isError) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = h('div', 'toast');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function () { toast.className = 'toast'; }, 3000);
  }

  function updateData(data) {
    state.data = data || state.data;
    state.busy = false;
    render();
  }

  window.addEventListener('message', function (event) {
    const msg = event.data || {};
    if (msg.type === 'update' || msg.type === 'refresh') {
      updateData(msg.data);
    } else if (msg.type === 'error') {
      state.busy = false;
      updateFoot();
      showToast(msg.message || '操作失败', true);
    } else if (msg.type === 'saved') {
      state.busy = false;
      state.modified = false;
      updateFoot();
      showToast(label('savedToast', '工程项已保存'));
    }
  });

  const origPost = api.postMessage.bind(api);
  api.postMessage = function (msg) {
    if (msg && ['addTarget', 'removeTarget', 'moveTarget', 'addGroup', 'removeGroup', 'moveGroup', 'addFiles', 'removeFile', 'moveFile', 'setCurrentTarget'].indexOf(msg.type) >= 0) {
      state.modified = true;
      updateFoot();
      origPost({ type: 'dirty', dirty: true });
    }
    origPost(msg);
  };

  render();
})();
