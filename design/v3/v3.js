(function () {
  'use strict';

  const toast = document.getElementById('toast');
  function showToast(html) {
    toast.innerHTML = html;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () { toast.classList.remove('show'); }, 2600);
  }

  /* main tabs */
  const tabs = Array.prototype.slice.call(document.querySelectorAll('.otab'));
  const panels = Array.prototype.slice.call(document.querySelectorAll('.tab-panel'));
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.toggle('active', t === tab); });
      panels.forEach(function (p) { p.classList.toggle('active', p.dataset.panel === tab.dataset.tab); });
      const body = document.querySelector('.magic-view .opt-body');
      if (body) body.scrollTop = 0;
    });
  });

  /* sidebar views */
  const sideButtons = Array.prototype.slice.call(document.querySelectorAll('.sbtn[data-view]'));
  const views = Array.prototype.slice.call(document.querySelectorAll('.view'));
  const vTabs = Array.prototype.slice.call(document.querySelectorAll('.vtab[data-view]'));
  function switchView(name) {
    sideButtons.forEach(function (b) { b.classList.toggle('active', b.dataset.view === name); });
    views.forEach(function (v) { v.classList.toggle('active', v.dataset.view === name); });
    vTabs.forEach(function (t) { t.classList.toggle('active', t.dataset.view === name); });
    const crumb = document.getElementById('crumbPath');
    const status = document.getElementById('statusView');
    if (name === 'items') {
      if (crumb) crumb.textContent = '项目项';
      if (status) status.textContent = '项目项';
    } else {
      if (crumb) crumb.textContent = '目标选项';
      if (status) status.textContent = '目标选项';
    }
  }
  sideButtons.forEach(function (b) {
    b.addEventListener('click', function () { switchView(b.dataset.view); });
  });
  vTabs.forEach(function (t) {
    t.addEventListener('click', function () { switchView(t.dataset.view); });
  });

  /* include path editor */
  const pathList = document.getElementById('pathList');
  const pathButtons = Array.prototype.slice.call(document.querySelectorAll('[data-path-action]'));
  function selectedPath() {
    return pathList ? pathList.querySelector('.path-row.sel') : null;
  }
  function selectPath(row) {
    Array.prototype.forEach.call(pathList.querySelectorAll('.path-row'), function (r) {
      r.classList.toggle('sel', r === row);
    });
  }
  function openPath(row) {
    if (!row) { showToast('请先选择一个路径'); return; }
    const text = row.querySelector('span');
    showToast('<b>打开路径</b> · ' + (text ? text.textContent : '') + '<br><span style="color:#9aa4ae">原型里显示提示；正式版会在资源管理器中定位该文件夹。</span>');
  }
  if (pathList) {
    pathList.addEventListener('click', function (e) {
      const open = e.target.closest('.path-open');
      if (open) {
        e.stopPropagation();
        openPath(open.closest('.path-row'));
        return;
      }
      const row = e.target.closest('.path-row');
      if (row) selectPath(row);
    });
    pathList.addEventListener('dblclick', function (e) {
      const row = e.target.closest('.path-row');
      if (row) { e.preventDefault(); openPath(row); }
    });
    pathButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const action = btn.dataset.pathAction;
        const row = selectedPath();
        if (action === 'browse') { showToast('<b>浏览文件夹</b> · 打开 Keil 风格的目录选择器'); return; }
        if (action === 'open') { openPath(row); return; }
        if (action === 'new') {
          const div = document.createElement('div');
          div.className = 'path-row';
          div.title = '双击打开此路径';
          div.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"><path d="M2 4.2h4.1l1.1 1.5H14v6.9H2z"/></svg><span>..\\..\\NewFolder</span><button class="path-open" title="打开此路径"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3H3v10h10V9.5"/><path d="M9 2.5h4.5V7M13.5 2.5L7.8 8.2"/></svg></button>';
          pathList.appendChild(div);
          selectPath(div);
          return;
        }
        if (action === 'insert') {
          const div = document.createElement('div');
          div.className = 'path-row';
          div.title = '双击打开此路径';
          div.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"><path d="M2 4.2h4.1l1.1 1.5H14v6.9H2z"/></svg><span>..\\..\\Inserted</span><button class="path-open" title="打开此路径"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3H3v10h10V9.5"/><path d="M9 2.5h4.5V7M13.5 2.5L7.8 8.2"/></svg></button>';
          if (row) pathList.insertBefore(div, row.nextSibling); else pathList.appendChild(div);
          selectPath(div);
          return;
        }
        if (!row) { showToast('请先选择一个路径'); return; }
        if (action === 'delete') { row.remove(); return; }
        if (action === 'up' && row.previousElementSibling) pathList.insertBefore(row, row.previousElementSibling);
        if (action === 'down' && row.nextElementSibling) pathList.insertBefore(row.nextElementSibling, row);
      });
    });
  }

  /* custom Keil dropdowns */
  const kdSelects = Array.prototype.slice.call(document.querySelectorAll('.kd-select'));
  function closeKdSelects(except) {
    kdSelects.forEach(function (sel) { if (sel !== except) sel.classList.remove('open'); });
  }
  kdSelects.forEach(function (sel) {
    const button = sel.querySelector('.kd-select-btn');
    const value = sel.querySelector('.kd-select-btn span');
    if (button) {
      button.addEventListener('click', function (e) {
        e.stopPropagation();
        const open = sel.classList.contains('open');
        closeKdSelects(sel);
        sel.classList.toggle('open', !open);
      });
    }
    sel.querySelectorAll('.kd-menu button').forEach(function (option) {
      option.addEventListener('click', function (e) {
        e.stopPropagation();
        if (value) value.textContent = option.dataset.value;
        sel.classList.remove('open');
      });
    });
  });
  document.addEventListener('click', function () { closeKdSelects(null); });

  /* debug settings */
  const debugModal = document.getElementById('debugModal');
  document.querySelectorAll('[data-open-debug]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      debugModal.classList.add('show');
      const workspace = document.querySelector('.workspace');
      if (workspace) workspace.classList.add('modal-open');
      const tab = btn.dataset.openDebug;
      if (tab) switchKdTab(tab);
    });
  });
  document.querySelectorAll('[data-close-debug]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      debugModal.classList.remove('show');
      const workspace = document.querySelector('.workspace');
      if (workspace) workspace.classList.remove('modal-open');
    });
  });
  if (debugModal) {
    debugModal.addEventListener('click', function (e) {
      if (e.target === debugModal) {
        debugModal.classList.remove('show');
        const workspace = document.querySelector('.workspace');
        if (workspace) workspace.classList.remove('modal-open');
      }
    });
  }
  const kdTabs = Array.prototype.slice.call(document.querySelectorAll('.kd-tab'));
  const kdPanels = Array.prototype.slice.call(document.querySelectorAll('.kd-panel'));
  function switchKdTab(name) {
    kdTabs.forEach(function (t) { t.classList.toggle('active', t.dataset.kd === name); });
    kdPanels.forEach(function (p) { p.classList.toggle('active', p.dataset.kd === name); });
  }
  kdTabs.forEach(function (t) {
    t.addEventListener('click', function () { switchKdTab(t.dataset.kd); });
  });

  /* files / actions */
  const fileTable = document.getElementById('fileTable');
  const search2 = document.getElementById('search2');
  const search = document.getElementById('search');
  let fileMode = 'all';
  let activeGroup = 'Core';
  function applyFileFilter() {
    if (!fileTable) return;
    const q = ((search2 && search2.value) || (search && search.value) || '').toLowerCase();
    let visible = 0;
    Array.prototype.forEach.call(fileTable.querySelectorAll('.frow'), function (row) {
      const show = (fileMode === 'all' || row.dataset.group === activeGroup) && (!q || row.textContent.toLowerCase().includes(q));
      row.style.display = show ? '' : 'none';
      if (show) visible += 1;
    });
    const count = document.querySelector('.files-head .num');
    if (count) count.textContent = String(visible);
  }
  if (search2) search2.addEventListener('input', applyFileFilter);
  if (search) search.addEventListener('input', function () {
    if (search2) search2.value = search.value;
    applyFileFilter();
  });
  document.querySelectorAll('#fileMode button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#fileMode button').forEach(function (b) { b.classList.toggle('active', b === btn); });
      fileMode = btn.dataset.mode;
      applyFileFilter();
    });
  });
  document.querySelectorAll('#groupList .trow').forEach(function (row) {
    row.addEventListener('click', function () {
      document.querySelectorAll('#groupList .trow').forEach(function (r) { r.classList.toggle('selected', r === row); });
      activeGroup = row.dataset.group;
      fileMode = 'group';
      document.querySelectorAll('#fileMode button').forEach(function (b) { b.classList.toggle('active', b.dataset.mode === 'group'); });
      applyFileFilter();
    });
  });
  document.querySelectorAll('.frow').forEach(function (row) {
    row.addEventListener('click', function () {
      document.querySelectorAll('.frow').forEach(function (r) { r.classList.toggle('selected', r === row); });
    });
    row.addEventListener('dblclick', function () {
      const name = row.querySelector('.fname span');
      showToast('<b>打开 ' + (name ? name.textContent : '文件') + '</b> · 在 VS Code 编辑器中打开并可直接修改');
    });
  });
  document.querySelectorAll('.open-btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const row = btn.closest('.frow');
      const name = row ? row.querySelector('.fname span') : null;
      showToast('<b>打开 ' + (name ? name.textContent : '文件') + '</b> · 在 VS Code 编辑器中打开并可直接修改');
    });
  });
  const setCurrent = document.getElementById('setCurrent');
  if (setCurrent) setCurrent.addEventListener('click', function () { showToast('<b>设为当前目标</b> · Target 1'); });
  applyFileFilter();
  document.querySelectorAll('[data-toast]').forEach(function (btn) {
    btn.addEventListener('click', function () { showToast(btn.dataset.toast); });
  });
  document.getElementById('xmlBtn').addEventListener('click', function () {
    showToast('<b>高级 XML</b> · 打开 TargetOption 原始 XML 编辑（用于少数驱动私有字段）');
  });

  switchView('magic');
})();
