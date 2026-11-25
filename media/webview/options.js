(function () {
  'use strict';

  const api = typeof acquireVsCodeApi === 'function'
    ? acquireVsCodeApi()
    : { postMessage: function () {}, getState: function () { return null; }, setState: function () {} };

  const initial = window.__KEIL__ || { tabs: [], fields: [], language: 'zh' };
  const fieldsById = {};
  (initial.fields || []).forEach(function (field) { fieldsById[field.id] = field; });
  const tabs = (initial.tabs || []).filter(function (tab) { return tab.id !== 'advanced'; });

  const state = {
    data: initial,
    fieldsById,
    tabs,
    activeTab: 'target',
    values: {},
    dirty: false,
    busy: false,
    banner: null,
    controls: {},
    compilers: initial.compilers || [],
    driverSetup: initial.driverSetup || null,
    driverBase: null,
    driverUnsupportedChanged: false,
    includePaths: [],
    selectedPath: 0,
    pathList: null,
    driver: {
      connect: 'Normal',
      reset: 'Autodetect',
      erase: 'sectors',
      program: true,
      verify: true,
      resetRun: true,
      ramStart: '0x20000000',
      ramSize: '0x00001000',
      algorithmStart: '',
      algorithmSize: '',
      algorithm: '',
    },
  };

  const app = document.getElementById('app');
  const icons = {
    wand: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13l7-7"/><path d="M8.6 3.2l1-1 3.2 3.2-1 1z"/><path d="M11.4 5.4l1.8 1.8"/><path d="M3 3.2v2M2 4.2h2M12.2 12v2M11.2 13h2"/></svg>',
    info: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35"><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 5.1v.1" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.8 8.4l3.1 3.1 7.3-7.3"/></svg>',
    code: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 4L2 8l3.5 4M10.5 4L14 8l-3.5 4"/></svg>',
    folder: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"><path d="M2 4.2h4.1l1.1 1.5H14v6.9H2z"/><path d="M2 6h12" opacity=".65"/></svg>',
    open: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3H3v10h10V9.5"/><path d="M9 2.5h4.5V7M13.5 2.5L7.8 8.2"/></svg>',
    chev: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>',
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
  function fieldOf(id) { return state.fieldsById[id] || null; }
  function valueOf(id) {
    if (Object.prototype.hasOwnProperty.call(state.values, id)) return state.values[id];
    return fieldOf(id) ? fieldOf(id).value : '';
  }
  function uniqueId(field) { return 'f_' + field.tab + '_' + field.id; }
  function markDirty() {
    if (!state.dirty) {
      state.dirty = true;
      api.postMessage({ type: 'dirty', dirty: true });
    }
    updateFooter();
  }
  function setValue(id, value) {
    state.values[id] = value;
    (state.controls[id] || []).forEach(function (control) {
      if (control === document.activeElement) return;
      if (control.type === 'checkbox') control.checked = !!value;
      else control.value = value == null ? '' : String(value);
    });
    markDirty();
  }

  function buildControl(field) {
    let input;
    if (field.type === 'select') {
      input = document.createElement('select');
      (field.options || []).forEach(function (opt) {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        input.appendChild(option);
      });
      const value = valueOf(field.id) == null ? '' : String(valueOf(field.id));
      if (!Array.prototype.some.call(input.options, function (o) { return o.value === value; })) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value === '' ? '—' : value;
        input.appendChild(option);
      }
      input.value = value;
    } else if (field.type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = Math.max(2, Number(field.rows) || 2);
      input.value = valueOf(field.id) == null ? '' : String(valueOf(field.id));
      input.spellcheck = false;
    } else {
      input = document.createElement('input');
      input.type = field.type === 'number' ? 'number' : 'text';
      if (field.step) input.step = field.step;
      input.value = valueOf(field.id) == null ? '' : String(valueOf(field.id));
      input.spellcheck = false;
    }
    input.id = uniqueId(field);
    input.dataset.field = field.id;
    input.disabled = !!field.readonly;
    input.addEventListener('input', function () { setValue(field.id, input.value); });
    input.addEventListener('change', function () { setValue(field.id, input.value); });
    if (!state.controls[field.id]) state.controls[field.id] = [];
    state.controls[field.id].push(input);
    return input;
  }

  function buildCheckbox(field, labelText) {
    const wrap = h('label', 'check' + (field.readonly ? ' readonly' : ''));
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = uniqueId(field);
    input.dataset.field = field.id;
    input.checked = !!valueOf(field.id);
    input.disabled = !!field.readonly;
    input.addEventListener('change', function () { setValue(field.id, input.checked); });
    wrap.appendChild(input);
    wrap.appendChild(document.createTextNode(labelText || field.label));
    if (!state.controls[field.id]) state.controls[field.id] = [];
    state.controls[field.id].push(input);
    return wrap;
  }

  function section(title, children, className) {
    const sec = h('div', 'section' + (className ? ' ' + className : ''));
    sec.appendChild(h('h3', null, title));
    (children || []).forEach(function (child) { if (child) sec.appendChild(child); });
    return sec;
  }

  function rowField(id, options) {
    const field = fieldOf(id);
    if (!field) return null;
    const opts = options || {};
    const wide = field.type === 'textarea' || opts.wide;
    const row = h('div', 'row' + (wide ? ' wide' : ''));
    const labelEl = h('label', null, opts.label || field.label);
    labelEl.htmlFor = uniqueId(field);
    row.appendChild(labelEl);
    row.appendChild(buildControl(field));
    if (field.hint) row.appendChild(h('div', 'hint', field.hint));
    return row;
  }
  function checkField(id) {
    const field = fieldOf(id);
    return field ? buildCheckbox(field) : null;
  }

  function compilerLabel(raw) {
    const value = String(raw == null ? '' : raw);
    const parts = value.split('::');
    if (parts.length >= 3) return `${parts[2]} ${parts[1]}`;
    return value;
  }

  function compilerRow() {
    const field = fieldOf('compiler');
    if (!field) return null;
    const row = h('div', 'row');
    row.appendChild(h('label', null, field.label));
    const select = document.createElement('select');
    select.id = 'compilerSelect';
    const list = (state.data.compilers || []).slice();
    const current = String(valueOf('compiler') || '');
    if (current && !list.some(function (c) { return c.value === current; })) {
      list.push({ value: current, label: compilerLabel(current) });
    }
    if (!list.length) list.push({ value: current, label: compilerLabel(current) || '—' });
    list.forEach(function (c) {
      const option = document.createElement('option');
      option.value = c.value;
      option.textContent = c.label || compilerLabel(c.value);
      select.appendChild(option);
    });
    select.value = current || (list[0] && list[0].value) || '';
    select.addEventListener('change', function () { setValue('compiler', select.value); });
    row.appendChild(select);
    row.appendChild(h('div', 'hint', label('compilerHint', '从 Keil 安装目录读取可用编译器；切换后写入 pCCUsed 和 uAC6。')));
    return row;
  }

  function memorySection(title, prefix, name, name2) {
    const start = fieldOf(prefix + 'Start');
    const size = fieldOf(prefix + 'Size');
    if (!start || !size) return null;
    const sec = h('div', 'section');
    sec.appendChild(h('h3', null, title));
    const head = h('div', 'mem-grid head');
    head.appendChild(h('span'));
    head.appendChild(h('span', null, label('startAddress', '起始地址')));
    head.appendChild(h('span', null, label('size', '大小')));
    sec.appendChild(head);
    const row1 = h('div', 'mem-grid');
    const enable = fieldOf(prefix + 'Enable');
    if (enable) row1.appendChild(buildCheckbox(enable, name));
    else row1.appendChild(h('span'));
    row1.appendChild(buildControl(start));
    row1.appendChild(buildControl(size));
    sec.appendChild(row1);
    const row2 = h('div', 'mem-grid');
    const disabled = h('label', 'check readonly');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.disabled = true;
    disabled.appendChild(cb);
    disabled.appendChild(document.createTextNode(name2));
    row2.appendChild(disabled);
    const empty1 = document.createElement('input');
    empty1.disabled = true;
    empty1.placeholder = '—';
    const empty2 = document.createElement('input');
    empty2.disabled = true;
    empty2.placeholder = '—';
    row2.appendChild(empty1);
    row2.appendChild(empty2);
    sec.appendChild(row2);
    return sec;
  }

  function buildTargetPanel() {
    const panel = h('div', 'panel active');
    panel.dataset.tab = 'target';
    const inner = h('div', 'body-inner');
    const cols = h('div', 'cols');
    const left = h('div', 'col');
    const right = h('div', 'col');
    const clockGroup = fieldOf('xtal') ? fieldOf('xtal').group : '时钟与代码生成';
    const outputGroup = fieldOf('outputName') ? fieldOf('outputName').group : '输出文件';

    left.appendChild(section(clockGroup, [
      rowField('xtal'),
      compilerRow(),
      checkField('crossModule'),
      checkField('microLib'),
      checkField('bigEndian'),
    ]));
    left.appendChild(section(outputGroup, [
      rowField('outputName'),
      rowField('outputDirectory'),
      checkField('createHex'),
      checkField('debugInfo'),
    ]));
    right.appendChild(memorySection(label('romArea', '只读存储区'), 'irom', 'IROM1', 'IROM2'));
    right.appendChild(memorySection(label('ramArea', '读写存储区'), 'iram', 'IRAM1', 'IRAM2'));
    const note = h('div', 'note');
    note.appendChild(iconSvg(icons.info));
    note.appendChild(h('span', null, label('optionsNote', '保存时按 XML 节点原位写回，保留 RTE 组件与未知字段；Keil 打开中的冲突会被拦截。')));
    right.appendChild(note);
    cols.appendChild(left);
    cols.appendChild(right);
    inner.appendChild(cols);
    inner.appendChild(section(label('moreTargetOptions', '更多目标选项'), [
      h('div', 'more-grid', ''),
    ], 'wide'));
    const more = inner.querySelector('.more-grid');
    ['toolset', 'startup', 'rtos'].forEach(function (id) {
      const node = rowField(id);
      if (node) more.appendChild(node);
    });
    panel.appendChild(inner);
    return panel;
  }

  function buildGenericPanel(tab) {
    const panel = h('div', 'panel');
    panel.dataset.tab = tab.id;
    const fields = (state.data.fields || []).filter(function (f) { return f.tab === tab.id; });
    if (!fields.length) {
      panel.appendChild(h('div', 'empty', label('noFields', '这个页签暂时没有可编辑字段。')));
      return panel;
    }
    const inner = h('div', 'body-inner');
    if (tab.id === 'output') {
      const sec = section(fields[0].group || '输出文件', fields.map(function (field) {
        return field.type === 'checkbox' ? checkField(field.id) : rowField(field.id);
      }), 'wide');
      inner.appendChild(sec);
      panel.appendChild(inner);
      return panel;
    }
    const cols = h('div', 'cols');
    const left = h('div', 'col');
    const right = h('div', 'col');
    let column = left;
    let currentGroup = null;
    let sec = null;
    let count = 0;
    fields.forEach(function (field) {
      if (field.group !== currentGroup) {
        currentGroup = field.group;
        sec = section(field.group || '', []);
        column.appendChild(sec);
        column = column === left ? right : left;
        count += 1;
      }
      if (!sec) return;
      const node = field.type === 'checkbox' ? checkField(field.id) : rowField(field.id);
      if (node) sec.appendChild(node);
    });
    if (!count) {
      panel.appendChild(h('div', 'empty', label('noFields', '这个页签暂时没有可编辑字段。')));
      return panel;
    }
    cols.appendChild(left);
    cols.appendChild(right);
    inner.appendChild(cols);
    panel.appendChild(inner);
    return panel;
  }

  function pathRow(pathValue, index) {
    const row = h('div', 'path-row' + (index === state.selectedPath ? ' sel' : ''));
    row.title = pathValue;
    row.appendChild(iconSvg(icons.folder));
    row.appendChild(h('span', null, pathValue));
    const open = h('button', 'path-open');
    open.type = 'button';
    open.title = label('openPath', '打开路径');
    open.appendChild(iconSvg(icons.open));
    open.addEventListener('click', function (event) {
      event.stopPropagation();
      api.postMessage({ type: 'openIncludePath', path: pathValue });
    });
    row.appendChild(open);
    row.addEventListener('click', function () { state.selectedPath = index; refreshPathList(); });
    row.addEventListener('dblclick', function () { api.postMessage({ type: 'openIncludePath', path: pathValue }); });
    return row;
  }

  function refreshPathList() {
    if (!state.pathList) return;
    state.pathList.textContent = '';
    state.includePaths.forEach(function (pathValue, index) {
      state.pathList.appendChild(pathRow(pathValue, index));
    });
  }

  function syncIncludePaths() {
    state.values.cInclude = state.includePaths.join(';');
    markDirty();
  }

  function buildPathEditor() {
    const wrap = h('div', 'path-editor');
    const tools = h('div', 'path-tools');
    const add = function (text, action) {
      const btn = h('button', null, text);
      btn.type = 'button';
      btn.addEventListener('click', action);
      tools.appendChild(btn);
    };
    add(label('newPath', '新建'), function () { api.postMessage({ type: 'browseInclude', insert: false }); });
    add(label('insertPath', '插入'), function () { api.postMessage({ type: 'browseInclude', insert: true }); });
    add(label('deletePath', '删除'), function () {
      if (state.selectedPath >= 0 && state.selectedPath < state.includePaths.length) {
        state.includePaths.splice(state.selectedPath, 1);
        state.selectedPath = Math.max(0, Math.min(state.selectedPath, state.includePaths.length - 1));
        syncIncludePaths();
        refreshPathList();
      }
    });
    add(label('moveUp', '上移'), function () {
      const i = state.selectedPath;
      if (i > 0 && i < state.includePaths.length) {
        const tmp = state.includePaths[i - 1];
        state.includePaths[i - 1] = state.includePaths[i];
        state.includePaths[i] = tmp;
        state.selectedPath = i - 1;
        syncIncludePaths();
        refreshPathList();
      }
    });
    add(label('moveDown', '下移'), function () {
      const i = state.selectedPath;
      if (i >= 0 && i < state.includePaths.length - 1) {
        const tmp = state.includePaths[i + 1];
        state.includePaths[i + 1] = state.includePaths[i];
        state.includePaths[i] = tmp;
        state.selectedPath = i + 1;
        syncIncludePaths();
        refreshPathList();
      }
    });
    add(label('openPath', '打开'), function () {
      const p = state.includePaths[state.selectedPath];
      if (p) api.postMessage({ type: 'openIncludePath', path: p });
    });
    tools.appendChild(h('span', 'spacer'));
    add(label('browse', '浏览…'), function () { api.postMessage({ type: 'browseInclude', insert: false }); });
    wrap.appendChild(tools);
    const list = h('div', 'path-list');
    list.id = 'includePathList';
    state.pathList = list;
    wrap.appendChild(list);
    refreshPathList();
    return wrap;
  }

  function buildCPanel() {
    const panel = h('div', 'panel');
    panel.dataset.tab = 'c';
    const inner = h('div', 'body-inner');
    const cols = h('div', 'cols');
    const left = h('div', 'col');
    const right = h('div', 'col');
    left.appendChild(section(fieldOf('cDefine') ? fieldOf('cDefine').group : '预处理符号', [
      rowField('cDefine'),
      rowField('cUndefine'),
      (function () {
        const row = h('div', 'row wide');
        row.appendChild(h('label', null, fieldOf('cInclude') ? fieldOf('cInclude').label : '包含路径'));
        row.appendChild(buildPathEditor());
        row.appendChild(h('div', 'hint', label('includePathsHint', '与 Keil 的 C/C++ → Include Paths 一致；双击路径或点右侧打开按钮可在资源管理器中定位。')));
        return row;
      }()),
      rowField('cMisc'),
    ]));
    left.appendChild(section(fieldOf('optim') ? fieldOf('optim').group : '语言与优化', [
      rowField('optim'), checkField('optimTime'), rowField('wLevel'),
      checkField('c99'), checkField('gnu'), rowField('cStd'), rowField('cppStd'),
    ]));
    const codegen = h('div', 'check-grid');
    ['interw', 'oneElfS', 'splitLS', 'strict', 'enumInt', 'plainCh', 'ropi', 'rwpi',
      'thumb', 'surpInc', 'useXO', 'shortEn', 'shortWch', 'lto', 'wte', 'rtti'].forEach(function (id) {
      const node = checkField(id);
      if (node) codegen.appendChild(node);
    });
    right.appendChild(section(fieldOf('interw') ? fieldOf('interw').group : '代码生成', [codegen]));
    right.appendChild(section('编译器控制字符串', [
      (function () {
        const row = h('div', 'row wide');
        const ta = document.createElement('textarea');
        ta.readOnly = true;
        ta.rows = 2;
        ta.value = '--c99 -O0 --cpu Cortex-M3 -D__MICROLIB';
        row.appendChild(ta);
        row.appendChild(h('div', 'hint', '由 Keil 根据上方选项生成，只读。'));
        return row;
      }()),
    ]));
    cols.appendChild(left);
    cols.appendChild(right);
    inner.appendChild(cols);
    panel.appendChild(inner);
    return panel;
  }

  function buildDebugPanel() {
    const panel = h('div', 'panel');
    panel.dataset.tab = 'debug';
    const inner = h('div', 'body-inner');
    const cols = h('div', 'cols');
    const left = h('div', 'col');
    const right = h('div', 'col');
    const settings = h('button', 'btn small', label('debugSettings', '设置…'));
    settings.type = 'button';
    settings.addEventListener('click', function () { showDebugDialog('debug'); });
    const settingsRow = h('div', 'row');
    settingsRow.appendChild(h('label', null, '驱动设置'));
    settingsRow.appendChild(settings);
    left.appendChild(section(fieldOf('useSim') ? fieldOf('useSim').group : '调试模式', [
      checkField('useSim'), checkField('useTarget'),
      rowField('driverDll'), rowField('driverIndex'), settingsRow,
    ]));
    left.appendChild(section(fieldOf('loadApp') ? fieldOf('loadApp').group : '启动行为', [
      checkField('loadApp'), checkField('runToMain'), rowField('initFile'), rowField('targetInitFile'),
    ]));
    left.appendChild(section(fieldOf('simDll') ? fieldOf('simDll').group : '驱动', [
      rowField('simDll'), rowField('simDllParams'), rowField('targetDll'), rowField('targetDllParams'),
    ]));
    right.appendChild(section(fieldOf('debugEnable') ? fieldOf('debugEnable').group : '调试描述', [
      checkField('debugEnable'), checkField('flashSeq'), rowField('debugProtocol'), rowField('debugClock'),
    ]));
    const note = h('div', 'note');
    note.appendChild(iconSvg(icons.info));
    note.appendChild(h('span', null, '点击“设置…”打开 Cortex-M 目标驱动设置，包含调试、跟踪、Flash 下载与器件包页签。'));
    right.appendChild(note);
    cols.appendChild(left);
    cols.appendChild(right);
    inner.appendChild(cols);
    panel.appendChild(inner);
    return panel;
  }

  function buildUtilitiesPanel() {
    const panel = h('div', 'panel');
    panel.dataset.tab = 'utilities';
    const inner = h('div', 'body-inner');
    const cols = h('div', 'cols');
    const left = h('div', 'col');
    const right = h('div', 'col');
    const settings = h('button', 'btn small', label('debugSettings', '设置…'));
    settings.type = 'button';
    settings.addEventListener('click', function () { showDebugDialog('flash'); });
    const settingsRow = h('div', 'row');
    settingsRow.appendChild(h('label', null, '驱动设置'));
    settingsRow.appendChild(settings);
    left.appendChild(section(fieldOf('utilDriverIndex') ? fieldOf('utilDriverIndex').group : 'Flash 下载', [
      rowField('utilDriverIndex'), rowField('utilDriverDll'), checkField('utilFlashSeq'),
      rowField('utilProtocol'), rowField('utilClock'), settingsRow,
    ]));
    const note = h('div', 'note');
    note.appendChild(iconSvg(icons.info));
    note.appendChild(h('span', null, 'Flash 算法由 Keil 的 TargetDriverDllRegistry 管理；高级私有字段可在右上角 </> XML 中编辑。'));
    right.appendChild(note);
    cols.appendChild(left);
    cols.appendChild(right);
    inner.appendChild(cols);
    panel.appendChild(inner);
    return panel;
  }

  function buildHeader() {
    const header = h('div', 'header');
    const badge = h('div', 'wand-badge');
    badge.innerHTML = icons.wand;
    header.appendChild(badge);
    const title = h('div', 'head-title');
    const h1 = h('h1');
    h1.appendChild(document.createTextNode(label('optionsForTarget', '目标选项') + " '" + (state.data.targetName || '') + "' "));
    const brand = h('span', 'brand', 'KeilEx');
    h1.appendChild(brand);
    title.appendChild(h1);
    title.appendChild(h('p', null, label('optionsSubtitle', '魔法棒 · 10 个页签 · 修改保存到 .uvprojx / .uvoptx')));
    header.appendChild(title);
    header.appendChild(h('div', 'head-spacer'));
    const sync = state.data.sync || {};
    const syncBadge = h('div', 'sync-badge' + (sync.keilRunning ? ' warn' : ''));
    syncBadge.appendChild(h('i'));
    syncBadge.appendChild(document.createTextNode(label('synced', '已同步')));
    syncBadge.appendChild(h('span', 'conf', label('noConflicts', '0 冲突')));
    syncBadge.title = sync.keilRunning ? label('keilRunningHint', 'Keil 正在运行。保存后请在 Keil 中重新加载工程以看到修改。') : label('syncedHint', '工程文件与磁盘一致。');
    header.appendChild(syncBadge);
    if (fieldOf('rawTargetOption')) {
      const xmlBtn = h('button', 'xml-btn', '</>');
      xmlBtn.type = 'button';
      xmlBtn.title = label('advancedXml', '高级 XML');
      xmlBtn.addEventListener('click', openRawModal);
      header.appendChild(xmlBtn);
    }
    return header;
  }

  function buildTabs() {
    const tabsEl = h('div', 'tabs');
    state.tabs.forEach(function (tab) {
      const btn = h('button', 'tab' + (tab.id === state.activeTab ? ' active' : ''), tab.label);
      btn.type = 'button';
      btn.dataset.tab = tab.id;
      btn.addEventListener('click', function () {
        state.activeTab = tab.id;
        Array.prototype.forEach.call(tabsEl.querySelectorAll('.tab'), function (n) {
          n.classList.toggle('active', n.dataset.tab === tab.id);
        });
        Array.prototype.forEach.call(app.querySelectorAll('.panel'), function (p) {
          p.classList.toggle('active', p.dataset.tab === tab.id);
        });
        const body = app.querySelector('.body');
        if (body) body.scrollTop = 0;
      });
      tabsEl.appendChild(btn);
    });
    return tabsEl;
  }

  function buildBody() {
    const body = h('div', 'body');
    state.controls = {};
    state.pathList = null;
    state.tabs.forEach(function (tab) {
      let panel;
      if (tab.id === 'target') panel = buildTargetPanel();
      else if (tab.id === 'c') panel = buildCPanel();
      else if (tab.id === 'debug') panel = buildDebugPanel();
      else if (tab.id === 'utilities') panel = buildUtilitiesPanel();
      else panel = buildGenericPanel(tab);
      body.appendChild(panel);
    });
    return body;
  }

  function buildFooter() {
    const footer = h('div', 'footer');
    const note = h('div', 'footer-note');
    note.appendChild(iconSvg(icons.check));
    footer.appendChild(note);
    footer.appendChild(h('div', 'footer-spacer'));
    const reset = h('button', 'btn', label('reset', '重置'));
    reset.type = 'button';
    reset.addEventListener('click', function () {
      api.postMessage({ type: 'reset' });
      state.dirty = false;
      state.values = {};
      updateFooter();
      closeRawModal();
    });
    const cancel = h('button', 'btn', label('cancel', '取消'));
    cancel.type = 'button';
    cancel.addEventListener('click', function () { api.postMessage({ type: 'cancel' }); });
    const apply = h('button', 'btn', label('apply', '应用'));
    apply.type = 'button';
    apply.addEventListener('click', function () { applyChanges(false); });
    const ok = h('button', 'btn primary', label('ok', '确定'));
    ok.type = 'button';
    ok.addEventListener('click', function () { applyChanges(true); });
    footer.appendChild(reset);
    footer.appendChild(cancel);
    footer.appendChild(apply);
    footer.appendChild(ok);
    state.footer = { note: note, reset: reset, cancel: cancel, apply: apply, ok: ok };
    return footer;
  }

  function updateFooter() {
    if (!state.footer) return;
    const sync = state.data.sync || {};
    const lastWrite = sync.lastWrite || '—';
    const stateText = sync.keilRunning ? label('keilRunningShort', 'Keil 运行中，保存后需重载') : label('keilConnected', 'Keil 已连接');
    const dirtyPrefix = state.dirty ? '<span style="color:#e2c08d">●</span> ' : '';
    state.footer.note.innerHTML = dirtyPrefix + escapeHtml(label('lastWrite', '上次写入')) + ' <b>.uvprojx</b> ' + escapeHtml(lastWrite) + ' · ' + escapeHtml(stateText);
    state.footer.apply.disabled = !state.dirty || state.busy;
    state.footer.ok.disabled = state.busy;
    state.footer.reset.disabled = state.busy;
    state.footer.cancel.disabled = state.busy;
  }

  function applyChanges(close) {
    if (state.busy) return;
    state.busy = true;
    updateFooter();
    api.postMessage({ type: 'apply', values: state.values, close: !!close });
  }

  function debugRow(labelText, control) {
    const row = h('div', 'dbg-row');
    row.appendChild(h('label', null, labelText));
    row.appendChild(control);
    return row;
  }
  function debugCheck(labelText, checked) {
    const l = h('label', 'dbg-check');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!checked;
    l.appendChild(input);
    l.appendChild(document.createTextNode(labelText));
    return l;
  }
  function debugSelect(labelText, current, options, onSelect) {
    const wrap = h('div', 'dbg-select');
    const button = h('button', 'dbg-select-btn');
    button.type = 'button';
    const value = h('span', null, current);
    button.appendChild(value);
    button.appendChild(iconSvg(icons.chev));
    const menu = h('div', 'dbg-menu');
    options.forEach(function (option) {
      const item = h('button', null, option);
      item.type = 'button';
      item.addEventListener('click', function (e) {
        e.stopPropagation();
        value.textContent = option;
        wrap.classList.remove('open');
        if (onSelect) onSelect(option);
      });
      menu.appendChild(item);
    });
    button.addEventListener('click', function (e) {
      e.stopPropagation();
      document.querySelectorAll('.dbg-select.open').forEach(function (n) { if (n !== wrap) n.classList.remove('open'); });
      wrap.classList.toggle('open');
    });
    wrap.appendChild(button);
    wrap.appendChild(menu);
    const row = h('div', 'dbg-row');
    row.appendChild(h('label', null, labelText));
    row.appendChild(wrap);
    return row;
  }
  function debugGroup(title, children) {
    const group = h('div', 'dbg-group');
    group.appendChild(h('span', 'legend', title));
    (children || []).forEach(function (c) { if (c) group.appendChild(c); });
    return group;
  }

  function buildDebugDialog() {
    state.driverBase = JSON.parse(JSON.stringify(state.driver));
    const overlay = h('div', 'debug-overlay');
    overlay.id = 'debugOverlay';
    const dialog = h('div', 'debug-dialog');
    const title = h('div', 'debug-title');
    title.appendChild(iconSvg(icons.code));
    title.appendChild(document.createTextNode(label('debugSetupTitle', 'Cortex-M 目标驱动设置')));
    dialog.appendChild(title);

    const tabsEl = h('div', 'debug-tabs');
    const defs = [
      ['debug', label('debugTab', '调试')],
      ['trace', label('traceTab', '跟踪')],
      ['flash', label('flashTab', 'Flash 下载')],
      ['pack', label('packTab', '器件包')],
    ];
    const body = h('div', 'debug-body');
    const panels = {};
    defs.forEach(function (def, index) {
      const btn = h('button', 'debug-tab' + (index === 0 ? ' active' : ''), def[1]);
      btn.type = 'button';
      btn.dataset.tab = def[0];
      btn.addEventListener('click', function () {
        Array.prototype.forEach.call(tabsEl.querySelectorAll('.debug-tab'), function (n) { n.classList.toggle('active', n === btn); });
        Object.keys(panels).forEach(function (key) { panels[key].classList.toggle('active', key === def[0]); });
      });
      tabsEl.appendChild(btn);
    });
    dialog.appendChild(tabsEl);

    const dbgPanel = h('div', 'debug-panel active');
    dbgPanel.dataset.panel = 'debug';
    dbgPanel.appendChild(debugGroup('调试适配器', [
      debugRow('单元', (function () { const s = document.createElement('select'); ['ST-Link', 'J-Link', 'ULINK2'].forEach(function (v) { const o = document.createElement('option'); o.textContent = v; s.appendChild(o); }); return s; }())),
      debugCheck('共享 ST-Link', false),
      debugRow('序列号', (function () { const i = document.createElement('input'); i.value = '31FF6A064D55333940202343'; return i; }())),
      (function () { const r = h('div', 'dbg-pair'); const a = document.createElement('input'); a.value = 'HW: V2.J37'; const b = document.createElement('input'); b.value = 'FW: V2.J37'; r.appendChild(a); r.appendChild(b); return r; }()),
      debugCheck('启动时检查版本', true),
    ]));
    dbgPanel.appendChild(debugGroup('目标通信', [
      debugRow('端口', (function () { const s = document.createElement('select'); ['SW', 'JTAG'].forEach(function (v) { const o = document.createElement('option'); o.textContent = v; s.appendChild(o); }); return s; }())),
      debugCheck('SWD 多核', false),
      debugRow('时钟', (function () { const r = h('div', 'dbg-pair'); const a = document.createElement('input'); a.value = '请求 10 MHz'; const b = document.createElement('input'); b.value = '选中 0 MHz'; r.appendChild(a); r.appendChild(b); return r; }())),
    ]));
    dbgPanel.appendChild(debugGroup('调试', [
      debugSelect(label('debugConnect', '连接'), state.driver.connect, ['Normal', 'with Pre-reset', 'under Reset', 'Hw reset pulse without Stop'], function (v) { state.driver.connect = v; }),
      debugSelect(label('debugReset', '复位'), state.driver.reset, ['Autodetect', 'HW RESET', 'SYSRESETREQ', 'VECTRESET'], function (v) { state.driver.reset = v; }),
      debugCheck('连接后复位', true),
      debugCheck('复位后停止', false),
      debugRow('复位延时', (function () { const i = document.createElement('input'); i.value = '0 ms'; return i; }())),
    ]));
    dbgPanel.appendChild(debugGroup('SW 设备', [
      (function () {
        const table = h('div', 'dbg-table');
        const th = h('div', 'dbg-th'); th.appendChild(h('span', null, '错误')); th.appendChild(h('span', null, 'SWDIO')); table.appendChild(th);
        const tr = h('div', 'dbg-tr'); tr.appendChild(h('span', null, 'ST-LINK 连接错误')); tr.appendChild(h('span', null, '')); table.appendChild(tr);
        return table;
      }()),
      debugCheck('自动检测', true),
      debugCheck('手动配置', false),
      debugRow('ID CODE', (function () { const i = document.createElement('input'); return i; }())),
      debugRow('器件名称', (function () { const i = document.createElement('input'); return i; }())),
      (function () { const r = h('div', 'dbg-actions'); ['添加', '删除', '更新', '上移', '下移'].forEach(function (v) { const b = h('button', null, v); b.type = 'button'; r.appendChild(b); }); return r; }()),
    ]));
    dbgPanel.appendChild(debugGroup('缓存选项', [debugCheck('缓存代码', true), debugCheck('缓存存储器', true)]));
    dbgPanel.appendChild(debugGroup('下载选项', [debugCheck('校验代码下载', false), debugCheck('下载到 Flash', false)]));
    panels.debug = dbgPanel;
    body.appendChild(dbgPanel);

    const tracePanel = h('div', 'debug-panel');
    tracePanel.dataset.panel = 'trace';
    tracePanel.appendChild(debugGroup('跟踪', [debugCheck('启用跟踪', true), debugRow('核心时钟', (function () { const i = document.createElement('input'); i.value = '8 MHz'; return i; }())), debugRow('跟踪时钟', (function () { const i = document.createElement('input'); i.value = '2 MHz'; return i; }()))]));
    panels.trace = tracePanel;
    body.appendChild(tracePanel);

    const flashPanel = h('div', 'debug-panel');
    flashPanel.dataset.panel = 'flash';
    const flashTop = h('div', 'flash-top');
    flashTop.appendChild(debugGroup(label('downloadFunction', '下载功能'), [
      (function () {
        const wrap = h('div', 'flash-download');
        const icon = h('div', 'flash-icon'); icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M8 2.5v2.5M12 2.5v2.5M16 2.5v2.5M8 19v2.5M12 19v2.5M16 19v2.5M2.5 8H5M2.5 12H5M2.5 16H5M19 8h2.5M19 12h2.5M19 16h2.5" stroke-linecap="round"/></svg>';
        wrap.appendChild(icon);
        const radios = h('div', 'flash-radios');
        [['full', label('eraseFull', '擦除全片')], ['sectors', label('eraseSectors', '擦除扇区')], ['none', label('doNotErase', '不擦除')]].forEach(function (item) {
          const l = h('label', 'dbg-check');
          const r = document.createElement('input'); r.type = 'radio'; r.name = 'eraseMode'; r.checked = state.driver.erase === item[0];
          r.addEventListener('change', function () { if (r.checked) state.driver.erase = item[0]; });
          l.appendChild(r); l.appendChild(document.createTextNode(item[1])); radios.appendChild(l);
        });
        wrap.appendChild(radios);
        const checks = h('div', 'flash-checks');
        [['program', '编程'], ['verify', '校验'], ['resetRun', '复位并运行']].forEach(function (item) {
          const l = h('label', 'dbg-check');
          const c = document.createElement('input'); c.type = 'checkbox'; c.checked = !!state.driver[item[0]];
          c.addEventListener('change', function () { state.driver[item[0]] = c.checked; });
          l.appendChild(c); l.appendChild(document.createTextNode(item[1])); checks.appendChild(l);
        });
        wrap.appendChild(checks);
        return wrap;
      }()),
    ]));
    flashTop.appendChild(debugGroup(label('ramForAlgorithm', 'RAM 用于算法'), [
      (function () {
        const r = h('div', 'flash-ram');
        const a = document.createElement('label'); a.appendChild(document.createTextNode('起始 ')); const ia = document.createElement('input'); ia.value = state.driver.ramStart; ia.addEventListener('change', function () { state.driver.ramStart = ia.value; }); a.appendChild(ia);
        const b = document.createElement('label'); b.appendChild(document.createTextNode('大小 ')); const ib = document.createElement('input'); ib.value = state.driver.ramSize; ib.addEventListener('change', function () { state.driver.ramSize = ib.value; }); b.appendChild(ib);
        r.appendChild(a); r.appendChild(b); return r;
      }()),
    ]));
    flashPanel.appendChild(flashTop);
    flashPanel.appendChild(debugGroup(label('programmingAlgorithm', '编程算法'), [
      (function () {
        const table = h('table', 'flash-table');
        const thead = document.createElement('thead');
        const tr = document.createElement('tr');
        [label('description', '描述'), label('deviceSize', '器件容量'), label('deviceType', '器件类型'), label('addressRange', '地址范围')].forEach(function (t) { tr.appendChild(h('th', null, t)); });
        thead.appendChild(tr); table.appendChild(thead);
        const tbody = document.createElement('tbody');
        const row = document.createElement('tr');
        ['STM32F10x High-density Flash', '512k', 'On-chip Flash', '08000000H - 0807FFFFH'].forEach(function (t) { row.appendChild(h('td', null, t)); });
        tbody.appendChild(row); table.appendChild(tbody);
        return table;
      }()),
      (function () {
        const r = h('div', 'flash-algo-foot');
        const a = document.createElement('label');
        a.appendChild(document.createTextNode('起始 '));
        const start = document.createElement('input');
        start.id = 'driverAlgoStart';
        start.value = state.driver.algorithmStart || '';
        start.addEventListener('change', function () { state.driver.algorithmStart = start.value; });
        a.appendChild(start);
        const b = document.createElement('label');
        b.appendChild(document.createTextNode('大小 '));
        const size = document.createElement('input');
        size.id = 'driverAlgoSize';
        size.value = state.driver.algorithmSize || '';
        size.addEventListener('change', function () { state.driver.algorithmSize = size.value; });
        b.appendChild(size);
        r.appendChild(a); r.appendChild(b); return r;
      }()),
    ]));
    const flashButtons = h('div', 'flash-buttons');
    const addBtn = h('button', null, label('addAlgorithm', '添加')); addBtn.type = 'button';
    const removeBtn = h('button', null, label('removeAlgorithm', '删除')); removeBtn.type = 'button'; removeBtn.disabled = true;
    flashButtons.appendChild(addBtn); flashButtons.appendChild(removeBtn);
    flashPanel.appendChild(flashButtons);
    panels.flash = flashPanel;
    body.appendChild(flashPanel);

    const packPanel = h('div', 'debug-panel');
    packPanel.dataset.panel = 'pack';
    packPanel.appendChild(debugGroup('器件包', [debugRow('器件包', (function () { const i = document.createElement('input'); i.value = 'Keil.STM32F1xx_DFP.2.3.0'; return i; }())), debugRow('器件', (function () { const i = document.createElement('input'); i.value = 'STM32F103ZE'; return i; }())), debugRow('厂商', (function () { const i = document.createElement('input'); i.value = 'STMicroelectronics'; return i; }()))]));
    panels.pack = packPanel;
    body.appendChild(packPanel);
    dialog.appendChild(body);

    const foot = h('div', 'debug-foot');
    const cancel = h('button', null, label('cancel', '取消'));
    cancel.type = 'button';
    cancel.addEventListener('click', closeDebugDialog);
    const ok = h('button', 'primary', label('ok', '确定'));
    ok.type = 'button';
    ok.addEventListener('click', function () {
      const keys = ['connect', 'reset', 'erase', 'program', 'verify', 'resetRun'];
      state.driverUnsupportedChanged = keys.some(function (key) {
        return state.driverBase && state.driver[key] !== state.driverBase[key];
      });
      api.postMessage({
        type: 'applyDriverSetup',
        settings: {
          ramStart: state.driver.ramStart,
          ramSize: state.driver.ramSize,
          algorithm: state.driverSetup ? state.driverSetup.algorithm : state.driver.algorithm,
          algorithmStart: state.driver.algorithmStart,
          algorithmSize: state.driver.algorithmSize,
          connect: state.driver.connect,
          reset: state.driver.reset,
          erase: state.driver.erase,
          program: state.driver.program,
          verify: state.driver.verify,
          resetRun: state.driver.resetRun,
        },
      });
      closeDebugDialog();
    });
    const apply = h('button', null, '应用(A)');
    apply.type = 'button';
    apply.disabled = true;
    foot.appendChild(cancel); foot.appendChild(ok); foot.appendChild(apply);
    dialog.appendChild(foot);
    overlay.appendChild(dialog);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeDebugDialog(); });
    state.debugPanels = panels;
    return overlay;
  }

  function showDebugDialog(tab) {
    const overlay = document.getElementById('debugOverlay');
    if (!overlay) return;
    overlay.classList.add('show');
    if (tab) {
      const btn = overlay.querySelector('.debug-tab[data-tab="' + tab + '"]');
      if (btn) btn.click();
    }
  }
  function closeDebugDialog() {
    const overlay = document.getElementById('debugOverlay');
    if (overlay) overlay.classList.remove('show');
  }

  function buildRawModal() {
    const field = fieldOf('rawTargetOption');
    if (!field) return null;
    const overlay = h('div', 'raw-overlay');
    overlay.id = 'rawOverlay';
    const dialog = h('div', 'raw-dialog');
    const title = h('div', 'raw-title');
    title.appendChild(iconSvg(icons.code));
    title.appendChild(document.createTextNode(label('advancedXmlTitle', 'Advanced XML · TargetOption')));
    const x = h('button', 'x', '×');
    x.type = 'button';
    x.addEventListener('click', closeRawModal);
    title.appendChild(x);
    dialog.appendChild(title);
    const body = h('div', 'raw-body');
    body.appendChild(h('div', 'raw-note', label('advancedXmlNote', '高级编辑：保存前会校验 XML。用于覆盖本页未暴露的 Keil 字段。')));
    const textarea = document.createElement('textarea');
    textarea.id = 'rawXml';
    textarea.value = field.value || '';
    textarea.spellcheck = false;
    body.appendChild(textarea);
    dialog.appendChild(body);
    const foot = h('div', 'raw-foot');
    const cancel = h('button', 'btn', label('cancel', '取消'));
    cancel.type = 'button';
    cancel.addEventListener('click', closeRawModal);
    const apply = h('button', 'btn primary', label('apply', '应用'));
    apply.type = 'button';
    apply.addEventListener('click', function () {
      state.values.rawTargetOption = textarea.value;
      markDirty();
      closeRawModal();
    });
    foot.appendChild(cancel);
    foot.appendChild(apply);
    dialog.appendChild(foot);
    overlay.appendChild(dialog);
    return overlay;
  }
  function openRawModal() {
    const overlay = document.getElementById('rawOverlay');
    const field = fieldOf('rawTargetOption');
    if (!overlay || !field) return;
    const textarea = overlay.querySelector('#rawXml');
    if (textarea) textarea.value = state.values.rawTargetOption != null ? state.values.rawTargetOption : (field.value || '');
    overlay.classList.add('show');
  }
  function closeRawModal() {
    const overlay = document.getElementById('rawOverlay');
    if (overlay) overlay.classList.remove('show');
  }

  function showToast(message, isError) {
    let toast = document.querySelector('.toast');
    if (!toast) { toast = h('div', 'toast'); document.body.appendChild(toast); }
    toast.textContent = message;
    toast.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function () { toast.className = 'toast'; }, 3200);
  }

  function syncDriverSetup(data) {
    const setup = data && data.driverSetup;
    state.driverSetup = setup || null;
    if (!setup) return;
    if (setup.ramStart) state.driver.ramStart = setup.ramStart;
    if (setup.ramSize) state.driver.ramSize = setup.ramSize;
    if (setup.algorithmStart) state.driver.algorithmStart = setup.algorithmStart;
    if (setup.algorithmSize) state.driver.algorithmSize = setup.algorithmSize;
    if (setup.algorithm) state.driver.algorithm = setup.algorithm;
  }

  function updateData(data, force) {
    if (!data) return;
    if (state.dirty && !force) {
      showToast(label('syncConflict', '工程文件已被外部修改；当前面板有未保存内容'), true);
      return;
    }
    state.data = data;
    state.fieldsById = {};
    (data.fields || []).forEach(function (field) { state.fieldsById[field.id] = field; });
    state.tabs = (data.tabs || []).filter(function (tab) { return tab.id !== 'advanced'; });
    state.compilers = data.compilers || [];
    syncDriverSetup(data);
    if (!state.tabs.some(function (tab) { return tab.id === state.activeTab; })) state.activeTab = 'target';
    const includeField = fieldOf('cInclude');
    state.includePaths = includeField && includeField.value
      ? String(includeField.value).split(';').map(function (s) { return s.trim(); }).filter(Boolean)
      : [];
    state.selectedPath = 0;
    state.values = {};
    state.dirty = false;
    state.busy = false;
    api.postMessage({ type: 'dirty', dirty: false });
    render();
    showToast(label('reloaded', '已从工程文件重新加载'));
  }

  function render() {
    app.textContent = '';
    state.controls = {};
    state.pathList = null;
    app.appendChild(buildHeader());
    app.appendChild(buildTabs());
    app.appendChild(buildBody());
    app.appendChild(buildFooter());
    const raw = buildRawModal();
    if (raw) app.appendChild(raw);
    app.appendChild(buildDebugDialog());
    updateFooter();
  }

  window.addEventListener('message', function (event) {
    const msg = event.data || {};
    if (msg.type === 'update' || msg.type === 'refresh') {
      updateData(msg.data, !!msg.force);
    } else if (msg.type === 'externalChange') {
      if (!state.dirty && msg.data) updateData(msg.data, true);
    } else if (msg.type === 'saved') {
      state.dirty = false;
      state.busy = false;
      api.postMessage({ type: 'dirty', dirty: false });
      updateFooter();
      showToast(label('savedToast', '已保存并写回 Keil 工程文件'));
      if (msg.data) {
        state.data = msg.data;
        state.compilers = msg.data.compilers || state.compilers;
        const includeField = msg.data.fields && msg.data.fields.find(function (f) { return f.id === 'cInclude'; });
        if (includeField) state.includePaths = String(includeField.value || '').split(';').filter(Boolean);
      }
    } else if (msg.type === 'includePathPicked') {
      const p = msg.path;
      if (p) {
        if (msg.insert) state.includePaths.splice(state.selectedPath + 1, 0, p);
        else state.includePaths.push(p);
        state.selectedPath = msg.insert ? state.selectedPath + 1 : state.includePaths.length - 1;
        syncIncludePaths();
        refreshPathList();
      }
    } else if (msg.type === 'driverSaved') {
      if (msg.data) {
        state.data = msg.data;
        state.compilers = msg.data.compilers || state.compilers;
        syncDriverSetup(msg.data);
      }
      showToast(state.driverUnsupportedChanged
        ? label('driverPartial', '已保存 RAM/算法；Connect/Reset/擦除由 Keil 驱动注册表管理，未写回。')
        : label('savedToast', '已保存并写回 Keil 工程文件'));
      state.driverUnsupportedChanged = false;
    } else if (msg.type === 'error') {
      state.busy = false;
      updateFooter();
      showToast(msg.message || '操作失败', true);
    }
  });

  const includeField = fieldOf('cInclude');
  state.includePaths = includeField && includeField.value
    ? String(includeField.value).split(';').map(function (s) { return s.trim(); }).filter(Boolean)
    : [];
  syncDriverSetup(initial);
  render();
})();
