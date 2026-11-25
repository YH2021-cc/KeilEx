'use strict';

const fs = require('fs');
const path = require('path');
const { KeilProject } = require('../../src/keil/project');
const { getOptionsData } = require('../../src/keil/optionsSchema');

const root = __dirname;
const css = fs.readFileSync(path.join(root, 'v3.css'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'v3-extra.css'), 'utf8');
const clientJs = fs.readFileSync(path.join(root, 'v3.js'), 'utf8');

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const files = [
  { name: 'main.c', group: 'Core', path: '..\\..\\User\\main.c', type: 'c' },
  { name: 'mg_system_config.c', group: 'Core', path: '..\\..\\User\\mg_system_config.c', type: 'c' },
  { name: 'mg_uart.c', group: 'Core', path: '..\\..\\User\\mg_uart.c', type: 'c' },
  { name: 'stm32f10x_it.c', group: 'Core', path: '..\\..\\User\\stm32f10x_it.c', type: 'c' },
  { name: 'startup_stm32f10x_hd.s', group: 'CMSIS', path: '..\\..\\Startup\\startup_stm32f10x_hd.s', type: 's' },
  { name: 'system_stm32f10x.c', group: 'CMSIS', path: '..\\..\\CMSIS\\system_stm32f10x.c', type: 'c' },
  { name: 'misc.c', group: 'StdPeriph', path: '..\\..\\Library\\misc.c', type: 'c' },
  { name: 'stm32f10x_gpio.c', group: 'StdPeriph', path: '..\\..\\Library\\stm32f10x_gpio.c', type: 'c' },
  { name: 'stm32f10x_rcc.c', group: 'StdPeriph', path: '..\\..\\Library\\stm32f10x_rcc.c', type: 'c' },
  { name: 'stm32f10x_usart.c', group: 'StdPeriph', path: '..\\..\\Library\\stm32f10x_usart.c', type: 'c' },
  { name: 'stm32f10x_tim.c', group: 'StdPeriph', path: '..\\..\\Library\\stm32f10x_tim.c', type: 'c' },
  { name: 'stm32f10x_adc.c', group: 'StdPeriph', path: '..\\..\\Library\\stm32f10x_adc.c', type: 'c' },
  { name: 'stm32f10x_dma.c', group: 'StdPeriph', path: '..\\..\\Library\\stm32f10x_dma.c', type: 'c' },
];

function iconFile(type) {
  const cls = type === 's' ? 's' : 'c';
  return `<svg class="${cls}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M4 2.2h5l3 3v8.6H4z"/><path d="M9 2.2v3h3"/></svg>`;
}
function iconFolder() {
  return '<svg class="folder" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"><path d="M2 4.2h4.1l1.1 1.5H14v6.9H2z"/><path d="M2 6h12" opacity=".65"/></svg>';
}
function iconTarget() {
  return '<svg class="tgt" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="5.1"/><circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke-linecap="round"/></svg>';
}
function iconChevDown() {
  return '<svg class="chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>';
}
function iconChevRight() {
  return '<svg class="chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4l4 4-4 4"/></svg>';
}
function iconWand() {
  return '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13l7-7"/><path d="M8.6 3.2l1-1 3.2 3.2-1 1z"/><path d="M11.4 5.4l1.8 1.8"/><path d="M3 3.2v2M2 4.2h2M12.2 12v2M11.2 13h2"/></svg>';
}
function iconExternal() {
  return '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3H3v10h10V9.5"/><path d="M9 2.5h4.5V7M13.5 2.5L7.8 8.2"/></svg>';
}
function iconBuild() {
  return '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"><path d="M3 13l6.2-6.2 2 2L5 15H3z"/><path d="M9.4 3.4l3.2 3.2 1.5-1.5-3.2-3.2z"/></svg>';
}
function iconRebuild() {
  return '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M13 8a5 5 0 1 1-1.5-3.6"/><path d="M13 3v3h-3"/><path d="M8 5.5v3l2 1.2"/></svg>';
}
function iconDownload() {
  return '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v7.2"/><path d="M4.8 6.4L8 9.6l3.2-3.2"/><path d="M3 13h10"/></svg>';
}

async function main() {
  const project = await KeilProject.load(path.resolve(__dirname, '../../test-project/Projects/MDK-ARM/atk_f103.uvprojx'));
  const target = project.getCurrentTargetName();
  const data = getOptionsData(project, target, 'zh');
  const fields = data.fields.filter((f) => f.tab !== 'advanced');
  const byId = {};
  fields.forEach((f) => { byId[f.id] = f; });

  const overrides = {
    device: 'STM32F103ZE',
    vendor: 'STMicroelectronics',
    packId: 'Keil.STM32F1xx_DFP.2.3.0',
    xtal: '8.0',
    outputName: 'USART',
    outputDirectory: '..\\..\\Output\\',
    iromStart: '0x08000000',
    iromSize: '0x80000',
    iramStart: '0x20000000',
    iramSize: '0x10000',
    startup: '8',
    rtos: '0',
    toolset: 'ARM-ADS',
    cDefine: 'USE_STDPERIPH_DRIVER,STM32F10X_HD',
    cInclude: '..\\..\\User;..\\..\\Library;..\\..\\CMSIS;..\\..\\Startup',
    optim: '2',
    wLevel: '1',
    cStd: '3',
    cppStd: '1',
    debugProtocol: 'SWD',
  };
  const boolOverrides = {
    microLib: true,
    crossModule: false,
    bigEndian: false,
    iromEnable: true,
    iramEnable: true,
    createExecutable: true,
    createHex: true,
    debugInfo: true,
    browseInfo: true,
    c99: true,
    interw: true,
    oneElfS: true,
    shortEn: true,
    shortWch: true,
    useTarget: true,
    loadApp: true,
    runToMain: true,
    debugEnable: true,
    flashSeq: true,
    utilFlashSeq: true,
  };
  fields.forEach((f) => {
    if (Object.prototype.hasOwnProperty.call(overrides, f.id)) f.value = overrides[f.id];
    if (Object.prototype.hasOwnProperty.call(boolOverrides, f.id)) f.value = boolOverrides[f.id];
  });

  function field(id) { return byId[id]; }
  function isCheck(id) { const f = field(id); return f && f.type === 'checkbox'; }
  function val(id) { const f = field(id); return f ? f.value : ''; }
  function label(id) { const f = field(id); return f ? displayLabel(f) : id; }
  const zhLabels = {
    interw: 'ARM/Thumb 交互',
    aInterw: 'ARM/Thumb 交互',
    xoBase: 'XO 基址',
    packId: '器件包 ID',
    deviceId: '器件 ID',
    targetIncludePath: '目标包含路径',
    rtos: 'RTOS（实时操作系统）',
    wte: 'WTE',
    rtti: 'RTTI（运行时类型信息）',
  };
  function displayLabel(f) {
    return zhLabels[f.id] || f.label;
  }

  function control(id, options) {
    const f = field(id);
    if (!f) return '';
    const opts = options || {};
    if (f.type === 'checkbox') {
      return `<label class="check"><input type="checkbox" ${f.value ? 'checked' : ''} ${f.readonly ? 'disabled' : ''}> ${esc(opts.label || displayLabel(f))}</label>`;
    }
    if (f.type === 'select') {
      const optionsHtml = (f.options || []).map((o) => `<option ${String(o.value) === String(f.value) ? 'selected' : ''}>${esc(o.label)}</option>`).join('');
      return `<select ${f.readonly ? 'disabled' : ''}>${optionsHtml}</select>`;
    }
    if (f.type === 'textarea') {
      return `<textarea ${f.readonly ? 'disabled' : ''} rows="${opts.rows || 2}">${esc(f.value)}</textarea>`;
    }
    return `<input type="${f.type === 'number' ? 'number' : 'text'}" value="${esc(f.value)}" ${f.readonly ? 'disabled' : ''} ${opts.placeholder ? `placeholder="${esc(opts.placeholder)}"` : ''}>`;
  }
  function row(id, options) {
    const f = field(id);
    if (!f) return '';
    const opts = options || {};
    if (f.type === 'checkbox') return control(id, opts);
    if (id === 'cpu') {
      return `<div class="row wide"><label>${esc(displayLabel(f))}</label><textarea readonly rows="2">${esc(f.value)}</textarea></div>`;
    }
    const wide = f.type === 'textarea';
    const lbl = opts.label || displayLabel(f);
    const hint = opts.hint || f.hint;
    return `<div class="row${wide ? ' wide' : ''}"><label>${esc(lbl)}</label>${control(id, opts)}${hint ? `<div class="hint-line">${esc(hint)}</div>` : ''}</div>`;
  }
  function checks(ids, className) {
    return `<div class="check-grid ${className || ''}">${ids.map((id) => {
      const f = field(id);
      return f ? `<label class="check"><input type="checkbox" ${f.value ? 'checked' : ''} ${f.readonly ? 'disabled' : ''}> ${esc(displayLabel(f))}</label>` : '';
    }).join('')}</div>`;
  }
  function section(title, content, className) {
    return `<div class="section${className ? ' ' + className : ''}"><h3>${esc(title)}</h3>${content}</div>`;
  }
  function compilerRow() {
    const f = field('compiler');
    const current = f ? String(f.value) : '';
    const options = [
      'ARMCC V5.06 update 6 (build 750)',
      'ARMCLANG V6.19',
      'ARMCLANG V6.21',
      '使用 Keil 当前选择',
    ];
    return `<div class="row"><label>ARM 编译器</label><select>${options.map((o) => `<option ${current.includes('ARMCC') && o.startsWith('ARMCC') ? 'selected' : ''}>${o}</option>`).join('')}</select></div><div class="compiler-hint">从 Keil 安装目录读取可用编译器；切换后写入 uAC6 / pCCUsed。</div>`;
  }

  /* ---------------- Target ---------------- */
  const targetPanel = `
    <div class="body-inner">
      <div class="cols">
        <div class="col">
          ${section('时钟与代码生成', [
            row('xtal'),
            compilerRow(),
            row('crossModule'),
            row('microLib'),
            row('bigEndian'),
          ].join(''))}
          ${section('输出文件', [
            row('outputName'),
            row('outputDirectory'),
            row('createHex'),
            row('debugInfo'),
          ].join(''))}
        </div>
        <div class="col">
          <div class="section">
            <h3>存储区</h3>
            <div class="mem head"><span></span><span>起始地址</span><span>大小</span></div>
            <div class="mem"><label class="check"><input type="checkbox" checked> IROM1</label>${control('iromStart')}${control('iromSize')}</div>
            <div class="mem"><label class="check"><input type="checkbox"> IROM2</label><input value=""><input value=""></div>
            <div class="mem"><label class="check"><input type="checkbox" checked> IRAM1</label>${control('iramStart')}${control('iramSize')}</div>
            <div class="mem"><label class="check"><input type="checkbox"> IRAM2</label><input value=""><input value=""></div>
          </div>
          <div class="note"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35"><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 5.1v.1" stroke-linecap="round"/></svg><span>保存时按 XML 节点原位写回，保留 RTE 组件与未知字段；Keil 打开中的冲突会被拦截。</span></div>
        </div>
      </div>
      ${section('更多目标选项', `<div class="more-grid">${row('toolset')}${row('startup')}${row('rtos')}</div>`, 'wide')}
    </div>`;

  function renderGeneric(tab, options) {
    const opts = options || {};
    const list = fields.filter((f) => f.tab === tab);
    if (opts.wide) {
      return `<div class="body-inner">${section(list[0] ? list[0].group : '', `<div class="wide-fields">${list.map((f) => f.type === 'checkbox' ? control(f.id) : row(f.id)).join('')}</div>`, 'wide')}</div>`;
    }
    const groups = [];
    list.forEach((f) => {
      let group = groups.find((g) => g.title === f.group);
      if (!group) { group = { title: f.group, fields: [] }; groups.push(group); }
      group.fields.push(f);
    });
    const left = [];
    const right = [];
    let index = 0;
    groups.forEach((g) => {
      const content = g.fields.map((f) => f.type === 'checkbox' ? control(f.id) : row(f.id)).join('');
      const html = section(g.title, content);
      (index % 2 === 0 ? left : right).push(html);
      index += 1;
    });
    return `<div class="body-inner"><div class="cols"><div class="col">${left.join('')}</div><div class="col">${right.join('')}</div></div></div>`;
  }

  const devicePanel = renderGeneric('device');
  const outputPanel = `<div class="body-inner">${section('输出文件', `<div class="wide-fields">${[
    'outputName', 'outputDirectory', 'createExecutable', 'createLib', 'createHex',
    'debugInfo', 'browseInfo', 'createBatch', 'listingPath', 'hexFormat', 'merge32k',
  ].map((id) => (field(id) && field(id).type === 'checkbox' ? control(id) : row(id))).join('')}</div>`, 'wide')}</div>`;
  const listingPanel = renderGeneric('listing');
  const userPanel = renderGeneric('user');
  const asmPanel = renderGeneric('asm');
  const linkerPanel = renderGeneric('linker');

  /* ---------------- C/C++ ---------------- */
  const includePaths = String(val('cInclude') || '').split(';').filter(Boolean);
  const pathRows = includePaths.map((p) => `<div class="path-row" data-path="${esc(p)}" title="双击打开此路径"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"><path d="M2 4.2h4.1l1.1 1.5H14v6.9H2z"/><path d="M2 6h12" opacity=".65"/></svg><span>${esc(p)}</span><button class="path-open" title="打开此路径">${iconExternal()}</button></div>`).join('');
  const pathEditor = `
    <div class="path-editor">
      <div class="path-tools">
        <button data-path-action="new">新建</button>
        <button data-path-action="insert">插入</button>
        <button data-path-action="delete">删除</button>
        <button data-path-action="up">上移</button>
        <button data-path-action="down">下移</button>
        <button data-path-action="open">打开</button>
        <span class="spacer"></span>
        <button data-path-action="browse">浏览…</button>
      </div>
      <div class="path-list" id="pathList">${pathRows}</div>
    </div><div class="hint-line">与 Keil 的 C/C++ → Include Paths 一致；双击路径或点右侧打开按钮可在资源管理器中定位。</div>`;
  const cPanel = `
    <div class="body-inner">
      <div class="cols">
        <div class="col">
          ${section('预处理符号', [
            row('cDefine'),
            row('cUndefine'),
            `<div class="row wide"><label>包含路径</label>${pathEditor}</div>`,
            row('cMisc'),
          ].join(''))}
          ${section('语言与优化', [
            row('optim'),
            row('optimTime'),
            row('wLevel'),
            row('c99'),
            row('gnu'),
            row('cStd'),
            row('cppStd'),
          ].join(''))}
        </div>
        <div class="col">
          ${section('代码生成', checks([
            'interw','oneElfS','splitLS','strict','enumInt','plainCh','ropi','rwpi',
            'thumb','surpInc','useXO','shortEn','shortWch','lto','wte','rtti',
          ]))}
          ${section('编译器控制字符串', `<div class="row wide"><textarea readonly rows="2">--c99 -O0 --cpu Cortex-M3 -D__MICROLIB</textarea></div><div class="hint-line">由 Keil 根据上方选项生成，只读。</div>`)}
        </div>
      </div>
    </div>`;

  /* ---------------- Debug ---------------- */
  const driverOptions = ['ST-Link Debugger', 'J-LINK / J-TRACE Cortex', 'ULINK2/ME', 'CMSIS-DAP Debugger'];
  const driverSelect = `<div class="row"><label>调试驱动</label><select>${driverOptions.map((o) => `<option ${o === 'ST-Link Debugger' ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
  const debugPanel = `
    <div class="body-inner">
      <div class="cols">
        <div class="col">
          ${section('调试模式', [
            row('useSim'),
            row('useTarget'),
            driverSelect,
            row('driverIndex'),
            `<div class="row"><label>驱动设置</label><button class="btn" data-open-debug="debug">设置…</button></div>`,
          ].join(''))}
          ${section('启动行为', [
            row('loadApp'),
            row('runToMain'),
            row('initFile'),
            row('targetInitFile'),
          ].join(''))}
          ${section('驱动', [
            row('simDll'),
            row('simDllParams'),
            row('targetDll'),
            row('targetDllParams'),
          ].join(''))}
        </div>
        <div class="col">
          ${section('调试描述', [
            row('debugEnable'),
            row('flashSeq'),
            `<div class="row"><label>协议</label><select><option ${String(val('debugProtocol')).toUpperCase() === 'SWD' ? 'selected' : ''}>SWD</option><option ${String(val('debugProtocol')).toUpperCase() === 'JTAG' ? 'selected' : ''}>JTAG</option></select></div>`,
            row('debugClock'),
          ].join(''))}
          <div class="note"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35"><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 5.1v.1" stroke-linecap="round"/></svg><span>点击“设置…”打开 Cortex-M 目标驱动设置，包含调试、跟踪、Flash 下载与器件包页签。</span></div>
        </div>
      </div>
    </div>`;

  /* ---------------- Utilities ---------------- */
  const utilitiesPanel = `
    <div class="body-inner">
      <div class="cols">
        <div class="col">
          ${section('Flash 下载', [
            row('utilDriverIndex'),
            `<div class="row"><label>Flash 驱动</label><select><option selected>ST-Link Debugger</option><option>J-LINK / J-TRACE Cortex</option><option>ULINK2/ME</option><option>CMSIS-DAP Debugger</option></select></div>`,
            row('utilFlashSeq'),
            `<label class="check"><input type="checkbox" checked> 使用目标驱动进行 Flash 编程</label>`,
            `<label class="check"><input type="checkbox" checked> 更新目标前调试</label>`,
            `<div class="row"><label>初始化文件</label><input value=""></div>`,
            `<div class="row"><label>协议</label><select><option>SWD</option><option>JTAG</option></select></div>`,
            row('utilClock'),
          ].join(''))}
        </div>
        <div class="col">
          ${section('Flash 算法', [
            `<div class="row"><label>算法</label><select><option selected>STM32F10x High-density Flash</option><option>STM32F10x Med-density Flash</option></select></div>`,
            `<div class="row"><label>起始地址</label><input value="0x08000000"></div>`,
            `<div class="row"><label>大小</label><input value="0x80000"></div>`,
            `<div class="row"><label>驱动设置</label><button class="btn" data-open-debug="flash">设置…</button></div>`,
          ].join(''))}
          <div class="note"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35"><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 5.1v.1" stroke-linecap="round"/></svg><span>Flash 算法由 Keil 的 TargetDriverDllRegistry 管理；高级私有字段可在右上角 </> XML 中编辑。</span></div>
        </div>
      </div>
    </div>`;

  /* ---------------- Debug dialog ---------------- */
  function kdGroup(title, content) {
    return `<div class="kd-group"><span class="legend">${esc(title)}</span>${content}</div>`;
  }
  function kdRow(label, control) {
    return `<div class="kd-row"><label>${esc(label)}</label>${control}</div>`;
  }
  function kdCheck(label, checked) {
    return `<label class="kd-check"><input type="checkbox" ${checked ? 'checked' : ''}> ${esc(label)}</label>`;
  }
  function kdRadio(label, checked, name) {
    return `<label class="kd-check"><input type="radio" name="${esc(name)}" ${checked ? 'checked' : ''}> ${esc(label)}</label>`;
  }
  function kdSelect(id, current, options) {
    return `<div class="kd-select" data-select="${esc(id)}"><button type="button" class="kd-select-btn"><span>${esc(current)}</span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg></button><div class="kd-menu">${options.map((o) => `<button type="button" data-value="${esc(o)}">${esc(o)}</button>`).join('')}</div></div>`;
  }
  const debugDialog = `
    <div class="modal-overlay" id="debugModal">
      <div class="keil-dialog">
        <div class="kd-title"><span class="ico"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35"><rect x="3.5" y="3.5" width="9" height="10" rx="2"/><path d="M6 6.5l4 2.5-4 2.5z" fill="currentColor"/></svg></span>Cortex-M 目标驱动设置<span class="win"><span>—</span><span>□</span><span>×</span></span></div>
        <div class="kd-tabs">
          <button class="kd-tab active" data-kd="debug">调试</button>
          <button class="kd-tab" data-kd="trace">跟踪</button>
          <button class="kd-tab" data-kd="flash">Flash 下载</button>
          <button class="kd-tab" data-kd="pack">器件包</button>
        </div>
        <div class="kd-body">
          <div class="kd-panel active" data-kd="debug">
            ${kdGroup('调试适配器', `
              ${kdRow('单元', '<select><option>ST-Link</option><option>J-Link</option><option>ULINK2</option></select>')}
              ${kdCheck('共享 ST-Link', false)}
              ${kdRow('序列号', '<input value="31FF6A064D55333940202343">')}
              <div class="kd-row"><label>版本</label><div class="pair"><input value="HW: V2.J37" style="flex:1"><input value="FW: V2.J37" style="flex:1"></div></div>
              ${kdCheck('启动时检查版本', true)}
            `)}
            ${kdGroup('目标通信', `
              ${kdRow('端口', '<select><option>SW</option><option>JTAG</option></select>')}
              ${kdCheck('SWD 多核', false)}
              <div class="kd-row"><label>时钟</label><div class="pair"><input value="请求 10 MHz" style="flex:1"><input value="选中 0 MHz" style="flex:1"></div></div>
            `)}
            ${kdGroup('调试', `
              ${kdRow('连接', kdSelect('connect', 'Normal', ['Normal', 'with Pre-reset', 'under Reset', 'Hw reset pulse without Stop']))}
              ${kdRow('复位', kdSelect('reset', 'Autodetect', ['Autodetect', 'HW RESET', 'SYSRESETREQ', 'VECTRESET']))}
              ${kdCheck('连接后复位', true)}
              ${kdCheck('复位后停止', false)}
              ${kdRow('复位延时', '<input value="0 ms">')}
            `)}
            ${kdGroup('SW 设备', `
              <div class="kd-table"><div class="th"><span>错误</span><span>SWDIO</span></div><div class="tr"><span>ST-LINK 连接错误</span><span></span></div></div>
              ${kdRadio('自动检测', true, 'swdetect')}
              ${kdRadio('手动配置', false, 'swdetect')}
              ${kdRow('ID CODE', '<input value="">')}
              ${kdRow('器件名称', '<input value="">')}
              <div class="kd-actions"><button>添加</button><button>删除</button><button>更新</button><button>上移</button><button>下移</button></div>
              <div class="kd-row"><label>IR len</label><div class="pair"><input value="" style="flex:1"><input value="AP: 0" style="flex:1"></div></div>
            `)}
            ${kdGroup('缓存选项', `${kdCheck('缓存代码', true)}${kdCheck('缓存存储器', true)}`)}
            ${kdGroup('下载选项', `${kdCheck('校验代码下载', false)}${kdCheck('下载到 Flash', false)}`)}
          </div>
          <div class="kd-panel" data-kd="trace">
            ${kdGroup('跟踪', `${kdCheck('启用跟踪', true)}${kdRow('核心时钟', '<input value="8 MHz">')}${kdRow('跟踪时钟', '<input value="2 MHz">')}${kdRow('端口宽度', '<select><option>1 位</option><option>2 位</option><option>4 位</option></select>')}${kdRow('SWO 引脚', '<select><option>PB3</option><option>PA10</option></select>')}`)}
            ${kdGroup('时间戳与缓存', `${kdCheck('时间戳', true)}${kdRow('跟踪缓存', '<input value="64 KB">')}`)}
          </div>
          <div class="kd-panel kd-flash" data-kd="flash">
            <div class="flash-top">
              ${kdGroup('下载功能', `
                <div class="flash-download">
                  <div class="flash-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M8 2.5v2.5M12 2.5v2.5M16 2.5v2.5M8 19v2.5M12 19v2.5M16 19v2.5M2.5 8H5M2.5 12H5M2.5 16H5M19 8h2.5M19 12h2.5M19 16h2.5" stroke-linecap="round"/></svg></div>
                  <div class="flash-radios">
                    <label class="kd-check"><input type="radio" name="eraseMode"> 擦除全片</label>
                    <label class="kd-check"><input type="radio" name="eraseMode" checked> 擦除扇区</label>
                    <label class="kd-check"><input type="radio" name="eraseMode"> 不擦除</label>
                  </div>
                  <div class="flash-checks">
                    <label class="kd-check"><input type="checkbox" checked> 编程</label>
                    <label class="kd-check"><input type="checkbox" checked> 校验</label>
                    <label class="kd-check"><input type="checkbox" checked> 复位并运行</label>
                  </div>
                </div>
              `)}
              ${kdGroup('RAM 用于算法', `
                <div class="flash-ram">
                  <label>起始 <input value="0x20000000"></label>
                  <label>大小 <input value="0x00001000"></label>
                </div>
              `)}
            </div>
            ${kdGroup('编程算法', `
              <table class="flash-table">
                <thead><tr><th>描述</th><th>器件容量</th><th>器件类型</th><th>地址范围</th><th></th></tr></thead>
                <tbody><tr><td>STM32F10x High-density Flash</td><td>512k</td><td>On-chip Flash</td><td>08000000H - 0807FFFFH</td><td></td></tr></tbody>
              </table>
              <div class="flash-algo-foot"><label>起始 <input></label><label>大小 <input></label></div>
            `)}
            <div class="flash-buttons"><button>添加</button><button disabled>删除</button></div>
          </div>
          <div class="kd-panel" data-kd="pack">
            ${kdGroup('器件包', `${kdRow('器件包', '<input value="Keil.STM32F1xx_DFP.2.3.0">')}${kdRow('器件', '<input value="STM32F103ZE">')}${kdRow('厂商', '<input value="STMicroelectronics">')}`)}
            ${kdGroup('路径', `<div class="kd-row"><label>Pack 路径</label><input value="F:\\KEIL\\PACK\\Keil\\STM32F1xx_DFP\\2.3.0"></div>`)}
          </div>
        </div>
        <div class="kd-foot"><button data-close-debug>确定</button><button data-close-debug>取消</button><button disabled>应用(A)</button></div>
      </div>
    </div>`;

  /* ---------------- Sidebar ---------------- */
  const sidebar = `
    <aside class="sidebar">
      <div class="side-head"><span>KEIL 工程 / 项目</span><div class="icons"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M13 8a5 5 0 1 1-1.5-3.6"/><path d="M13 3v3h-3"/></svg><svg viewBox="0 0 16 16" fill="currentColor"><circle cx="3.5" cy="8" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="12.5" cy="8" r="1"/></svg></div></div>
      <div class="project-card"><div class="proj-icon"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35"><rect x="4" y="4" width="8" height="8" rx="1.2"/><rect x="6.2" y="6.2" width="3.6" height="3.6" rx=".6"/><path d="M6 4V2.2M10 4V2.2M6 14v-1.8M10 14v-1.8M4 6H2.2M4 10H2.2M14 6h-1.8M14 10h-1.8" stroke-linecap="round"/></svg></div><div><div class="proj-name">USART</div><div class="proj-sub">MDK-ARM · STM32F103ZE</div></div><div class="live">在线</div></div>
      <div class="target-box"><div class="target-cap"><span>当前目标</span><b>1 个目标</b></div><div class="target-select">${iconTarget()}<select><option>Target 1</option></select><svg class="cv" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg></div></div>
      <div class="actions"><button class="abtn primary">${iconBuild()}<b>编译</b><small>构建 · F7</small></button><button class="abtn">${iconRebuild()}<b>重建</b><small>重新构建</small></button><button class="abtn">${iconDownload()}<b>下载</b><small>烧录</small></button></div>
      <div class="subactions">
        <button class="sbtn active" data-view="magic">${iconWand()}魔法棒</button>
        <button class="sbtn" data-view="items"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"><path d="M2 4.2h4.1l1.1 1.5H14v6.9H2z"/><path d="M2 6h12" opacity=".65"/></svg>项目项</button>
        <button class="sbtn" data-toast="<b>在 Keil 中打开</b> · 启动 uVision">${iconExternal()}在 Keil 打开</button>
      </div>
      <div class="tree">
        <div class="trow target current">${iconChevDown()}${iconTarget()}<span class="name">Target 1</span><span class="cur">当前</span></div>
        <div class="trow">${iconChevDown()}${iconFolder()}<span class="name">Core</span><span class="count">4</span></div>
        <div class="trow" style="padding-left:34px">${iconFile('c')}<span class="name">main.c</span></div>
        <div class="trow" style="padding-left:34px">${iconFile('c')}<span class="name">mg_system_config.c</span></div>
        <div class="trow" style="padding-left:34px">${iconFile('c')}<span class="name">mg_uart.c</span></div>
        <div class="trow" style="padding-left:34px">${iconFile('c')}<span class="name">stm32f10x_it.c</span></div>
        <div class="trow">${iconChevRight()}${iconFolder()}<span class="name">CMSIS</span><span class="count">2</span></div>
        <div class="trow">${iconChevRight()}${iconFolder()}<span class="name">StdPeriph</span><span class="count">7</span></div>
      </div>
      <div class="side-foot"><div class="mem"><b>FLASH</b><div class="bar"><i style="width:8.1%"></i></div><span class="val">8.1%</span></div><div class="mem"><b>RAM</b><div class="bar"><i class="ram" style="width:6.4%"></i></div><span class="val">6.4%</span></div><div class="last"><span style="width:5px;height:5px;border-radius:50%;background:#4ec95b;display:inline-block"></span><span>上次构建</span><span class="ok">0 错误</span><span>· 15.2 秒</span></div></div>
    </aside>`;

  /* ---------------- Project Items view ---------------- */
  const groupCounts = {};
  files.forEach((f) => { groupCounts[f.group] = (groupCounts[f.group] || 0) + 1; });
  const fileRows = files.map((f, idx) => `<div class="frow${idx === 0 ? ' selected' : ''}" data-group="${esc(f.group)}"><div class="fname">${iconFile(f.type)}<span>${esc(f.name)}</span></div><span class="fgroup">${esc(f.group)}</span><span class="fpath" title="${esc(f.path)}">${esc(f.path)}</span><button class="open-btn" title="在 VS Code 中打开"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3H3v10h10V9.5"/><path d="M9 2.5h4.5V7M13.5 2.5L7.8 8.2"/></svg></button></div>`).join('');
  const itemsView = `
    <div class="items-shell">
      <div class="items-tools"><span class="title">项目项</span><span class="sub">USART · Target 1 · 13 个文件 · 3 个分组</span><span class="spacer"></span><div class="seg" id="fileMode"><button class="active" data-mode="all">全部 13</button><button data-mode="group">当前分组</button></div><div class="search"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="7" cy="7" r="4.2"/><path d="M10.2 10.2L14 14" stroke-linecap="round"/></svg><input id="search" placeholder="搜索文件 / 分组…"></div></div>
      <div class="items-grid">
        <div class="pane"><div class="pane-head"><b>工程目标</b><span class="spacer"></span><div class="tools"><button class="tool">+</button><button class="tool">×</button><button class="tool">↑</button><button class="tool">↓</button></div></div><div class="list"><div class="trow selected">${iconTarget()}<span class="name">Target 1</span><span class="badge cur">当前</span></div></div></div>
        <div class="pane"><div class="pane-head"><b>分组</b><span class="spacer"></span><div class="tools"><button class="tool">+</button><button class="tool">×</button><button class="tool">↑</button><button class="tool">↓</button></div></div><div class="list" id="groupList">
          <div class="trow selected" data-group="Core">${iconFolder()}<span class="name">Core</span><span class="count">4</span></div>
          <div class="trow" data-group="CMSIS">${iconFolder()}<span class="name">CMSIS</span><span class="count">2</span></div>
          <div class="trow" data-group="StdPeriph">${iconFolder()}<span class="name">StdPeriph</span><span class="count">7</span></div>
        </div></div>
        <div class="pane files-pane"><div class="files-head"><b>文件</b><span class="num">13</span><span class="spacer"></span><div class="mini-search"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="7" cy="7" r="4.2"/><path d="M10.2 10.2L14 14" stroke-linecap="round"/></svg><input id="search2" placeholder="过滤文件…"></div></div><div class="file-table-head"><span>文件名</span><span>分组</span><span>路径</span><span></span></div><div class="file-table" id="fileTable">${fileRows}</div></div>
      </div>
      <div class="items-actions"><button class="btn small" id="setCurrent">设为当前目标</button><button class="btn small" data-toast="<b>添加文件</b> · 选择文件加入当前分组">添加文件…</button><span class="spacer"></span><span class="hint">单击选择 · 双击在 VS Code 中打开 · 修改先暂存，点击“应用”写回 .uvprojx</span></div>
      <div class="opt-foot" style="height:58px"><div class="foot-note"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.8 8.4l3.1 3.1 7.3-7.3"/></svg><span><b>.uvprojx</b> 工程项修改暂存 · 点击“应用”写回 <b>.uvprojx</b> / <b>.uvoptx</b></span></div><div class="foot-spacer"></div><div class="btns"><button class="obtn" data-toast="<b>已重置</b> · 恢复工程项">重置</button><button class="obtn" data-toast="<b>已取消</b>">取消</button><button class="obtn" data-toast="<b>已应用</b> · 写回工程文件">应用</button><button class="obtn primary" data-toast="<b>已保存</b> · 工程项写回 .uvprojx / .uvoptx">确定</button></div></div>
    </div>`;

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>KeilEx — 目标选项 · UI Preview V3</title>
<style>
${css}
</style>
</head>
<body>
<div class="window">
  <div class="titlebar">
    <div class="logo"></div>
    <div class="menus"><span>文件</span><span>编辑</span><span>选择</span><span>查看</span><span>转到</span><span>运行</span><span>终端</span><span>帮助</span></div>
    <div class="title">USART.uvprojx — KeilEx — Visual Studio Code</div>
    <div class="win-btns"><span>—</span><span>□</span><span>×</span></div>
  </div>
  <div class="shell">
    ${sidebar}
    <div class="main">
      <div class="vscode-tabs">
        <div class="vtab active" data-view="magic">${iconWand()}目标选项 <span class="badge">KeilEx</span><span class="x">×</span></div>
        <div class="vtab"><span style="color:#7fb3e8">main.c</span><span class="x">×</span></div>
        <div class="vtab" data-view="items"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"><path d="M2 4.2h4.1l1.1 1.5H14v6.9H2z"/><path d="M2 6h12" opacity=".65"/></svg>项目项<span class="x">×</span></div>
      </div>
      <div class="crumb"><span>USART.uvprojx</span><span class="sep">›</span><span>目标</span><span class="sep">›</span><span>Target 1</span><span class="sep">›</span><span class="end" id="crumbPath">目标选项</span><div class="right"><i></i>KeilEx · Keil 已连接 · 0 冲突</div></div>
      <div class="workspace">
        <div class="view magic-view active" data-view="magic">
          <div class="opt-head">
            <div class="wand">${iconWand()}</div>
            <div class="head-title"><h1>目标选项 'Target 1' <span class="brand">KeilEx</span></h1><p>魔法棒 · 10 个页签 · ${fields.length} 个字段 · 中文界面 · 修改保存到 .uvprojx / .uvoptx</p></div>
            <div class="head-spacer"></div>
            <div class="sync"><i></i>已同步<span class="conf">0 冲突</span></div>
            <button class="xml-btn" id="xmlBtn">&lt;/&gt;</button>
          </div>
          <div class="opt-tabs">
            <button class="otab" data-tab="device">器件</button>
            <button class="otab active" data-tab="target">目标</button>
            <button class="otab" data-tab="output">输出</button>
            <button class="otab" data-tab="listing">列表</button>
            <button class="otab" data-tab="user">用户</button>
            <button class="otab" data-tab="c">C/C++</button>
            <button class="otab" data-tab="asm">汇编</button>
            <button class="otab" data-tab="linker">链接器</button>
            <button class="otab" data-tab="debug">调试</button>
            <button class="otab" data-tab="utilities">实用工具</button>
          </div>
          <div class="opt-body">
            <section class="tab-panel" data-panel="device">${devicePanel}</section>
            <section class="tab-panel active target-panel" data-panel="target">${targetPanel}</section>
            <section class="tab-panel" data-panel="output">${outputPanel}</section>
            <section class="tab-panel" data-panel="listing">${listingPanel}</section>
            <section class="tab-panel" data-panel="user">${userPanel}</section>
            <section class="tab-panel" data-panel="c">${cPanel}</section>
            <section class="tab-panel" data-panel="asm">${asmPanel}</section>
            <section class="tab-panel" data-panel="linker">${linkerPanel}</section>
            <section class="tab-panel" data-panel="debug">${debugPanel}</section>
            <section class="tab-panel" data-panel="utilities">${utilitiesPanel}</section>
          </div>
          <div class="opt-foot"><div class="foot-note"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.8 8.4l3.1 3.1 7.3-7.3"/></svg><span>上次写入 <b>.uvprojx</b> 20:31:04 · Keil 已连接</span></div><div class="foot-spacer"></div><div class="btns"><button class="obtn" data-toast="<b>已重置</b> · 恢复 Keil 当前值">重置</button><button class="obtn" data-toast="<b>已取消</b>">取消</button><button class="obtn" data-toast="<b>已应用</b> · 写回 Keil 工程文件">应用</button><button class="obtn primary" data-toast="<b>已保存</b> · 写回 .uvprojx / .uvoptx">确定</button></div></div>
        </div>
        <div class="view items-view" data-view="items">${itemsView}</div>
        ${debugDialog}
      </div>
    </div>
  </div>
  <div class="titlebar" style="height:24px;flex:none;border-top:1px solid #222;border-bottom:0;background:#007acc;color:#fff;font-size:11px;padding:0 12px;display:flex;align-items:center;justify-content:space-between"><span>main*</span><span>KeilEx · Target 1 · <span id="statusView">目标选项</span> · 0 错误</span></div>
</div>
<div class="toast" id="toast"></div>
<script>
${clientJs}
</script>
</body>
</html>`;

  fs.writeFileSync(path.join(root, 'keilex-ui-v3.html'), html, 'utf8');
  console.log('written', html.length);
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
