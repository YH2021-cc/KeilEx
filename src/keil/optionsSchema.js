'use strict';

const TABS = [
  { id: 'device', zh: '器件', en: 'Device' },
  { id: 'target', zh: '目标', en: 'Target' },
  { id: 'output', zh: '输出', en: 'Output' },
  { id: 'listing', zh: '列表', en: 'Listing' },
  { id: 'user', zh: '用户', en: 'User' },
  { id: 'c', zh: 'C/C++', en: 'C/C++' },
  { id: 'asm', zh: '汇编', en: 'Asm' },
  { id: 'linker', zh: '链接器', en: 'Linker' },
  { id: 'debug', zh: '调试', en: 'Debug' },
  { id: 'utilities', zh: '工具', en: 'Utilities' },
  { id: 'advanced', zh: '高级', en: 'Advanced' },
];

const G = {
  device: { zh: '器件', en: 'Device' },
  deviceRes: { zh: '调试资源', en: 'Debug resources' },
  deviceEnv: { zh: '环境', en: 'Environment' },
  clock: { zh: '时钟与代码生成', en: 'Clock & code generation' },
  memory: { zh: '存储区', en: 'Memory areas' },
  output: { zh: '输出文件', en: 'Output files' },
  listing: { zh: '列表文件', en: 'Listing files' },
  listingPage: { zh: '列表内容', en: 'Listing content' },
  userCompile: { zh: '编译前', en: 'Before compile' },
  userMake: { zh: '构建/重建前', en: 'Before build/rebuild' },
  userAfter: { zh: '构建/重建后', en: 'After build/rebuild' },
  userRun: { zh: '运行选项', en: 'Run options' },
  cPre: { zh: '预处理符号', en: 'Preprocessor symbols' },
  cLang: { zh: '语言与优化', en: 'Language & optimization' },
  cCode: { zh: '代码生成', en: 'Code generation' },
  cInclude: { zh: '包含路径', en: 'Include paths' },
  asmPre: { zh: '预处理符号', en: 'Preprocessor symbols' },
  asmOpt: { zh: '汇编选项', en: 'Assembler options' },
  link: { zh: '链接选项', en: 'Linker options' },
  linkMem: { zh: '存储布局', en: 'Memory layout' },
  linkMisc: { zh: '附加输入', en: 'Additional inputs' },
  debugMode: { zh: '调试模式', en: 'Debug mode' },
  debugStart: { zh: '启动行为', en: 'Startup behavior' },
  debugDriver: { zh: '驱动', en: 'Driver' },
  debugDesc: { zh: '调试描述', en: 'Debug description' },
  utilFlash: { zh: 'Flash 下载', en: 'Flash download' },
  advanced: { zh: '原始 XML', en: 'Raw XML' },
};

function f(id, tab, group, zh, en, type, source, path, extra = {}) {
  return {
    id,
    tab,
    group,
    label: { zh, en },
    type,
    source,
    path,
    ...extra,
  };
}

const optimOptions = [
  { value: '0', zh: '默认', en: 'Default' },
  { value: '1', zh: 'Level 0 (-O0)', en: 'Level 0 (-O0)' },
  { value: '2', zh: 'Level 1 (-O1)', en: 'Level 1 (-O1)' },
  { value: '3', zh: 'Level 2 (-O2)', en: 'Level 2 (-O2)' },
  { value: '4', zh: 'Level 3 (-O3)', en: 'Level 3 (-O3)' },
];

const warningOptions = [
  { value: '0', zh: '不显示警告', en: 'No warnings' },
  { value: '1', zh: '显示警告', en: 'Warnings' },
  { value: '2', zh: '全部警告', en: 'All warnings' },
];

const cStdOptions = [
  { value: '1', zh: 'C90', en: 'C90' },
  { value: '2', zh: 'GNU C90', en: 'GNU C90' },
  { value: '3', zh: 'C99', en: 'C99' },
  { value: '4', zh: 'GNU C99', en: 'GNU C99' },
  { value: '5', zh: 'C11', en: 'C11' },
  { value: '6', zh: 'GNU C11', en: 'GNU C11' },
  { value: '7', zh: 'C17', en: 'C17' },
];

const cppStdOptions = [
  { value: '1', zh: 'C++98', en: 'C++98' },
  { value: '2', zh: 'GNU C++98', en: 'GNU C++98' },
  { value: '3', zh: 'C++11', en: 'C++11' },
  { value: '4', zh: 'GNU C++11', en: 'GNU C++11' },
  { value: '5', zh: 'C++14', en: 'C++14' },
  { value: '6', zh: 'GNU C++14', en: 'GNU C++14' },
  { value: '7', zh: 'C++17', en: 'C++17' },
];

const P = {
  common: ['TargetOption', 'TargetCommonOption'],
  arm: ['TargetOption', 'TargetArmAds'],
  misc: ['TargetOption', 'TargetArmAds', 'ArmAdsMisc'],
  cads: ['TargetOption', 'TargetArmAds', 'Cads'],
  aads: ['TargetOption', 'TargetArmAds', 'Aads'],
  ldads: ['TargetOption', 'TargetArmAds', 'LDads'],
  opt: ['TargetOption'],
  optTtt: ['TargetOption', 'OPTTT'],
  optLex: ['TargetOption', 'OPTLEX'],
  optList: ['TargetOption', 'ListingPage'],
  optDebug: ['TargetOption', 'DebugOpt'],
  optDesc: ['TargetOption', 'DebugDescription'],
};

function p(base, ...rest) {
  return [...base, ...rest];
}

const FIELDS = [
  // ----------------------------------------------------------------- Device
  f('device', 'device', G.device, '器件', 'Device', 'text', 'proj', p(P.common, 'Device'), {
    hint: { zh: '例如 STM32F103ZE；首版为文本编辑，后续接 Pack 数据库。', en: 'e.g. STM32F103ZE. Text editing in v1; Pack browser comes later.' },
  }),
  f('vendor', 'device', G.device, '厂商', 'Vendor', 'text', 'proj', p(P.common, 'Vendor')),
  f('packId', 'device', G.device, '器件包 ID', 'Pack ID', 'text', 'proj', p(P.common, 'PackID')),
  f('cpu', 'device', G.device, 'CPU / 存储器描述', 'CPU / memory spec', 'text', 'proj', p(P.common, 'Cpu'), { readonly: true }),
  f('flashDriver', 'device', G.deviceRes, 'Flash 驱动', 'Flash driver', 'textarea', 'proj', p(P.common, 'FlashDriverDll'), { rows: 3 }),
  f('sfdFile', 'device', G.deviceRes, 'SVD 文件', 'SVD file', 'text', 'proj', p(P.common, 'SFDFile')),
  f('registerFile', 'device', G.deviceRes, '寄存器头文件', 'Register header', 'text', 'proj', p(P.common, 'RegisterFile')),
  f('deviceId', 'device', G.deviceRes, '器件 ID', 'Device ID', 'text', 'proj', p(P.common, 'DeviceId')),
  f('useEnv', 'device', G.deviceEnv, '使用环境变量', 'Use environment', 'checkbox', 'proj', p(P.common, 'UseEnv')),
  f('binPath', 'device', G.deviceEnv, '工具路径', 'Tool path', 'text', 'proj', p(P.common, 'BinPath')),
  f('targetIncludePath', 'device', G.deviceEnv, '目标包含路径', 'Target include path', 'textarea', 'proj', p(P.common, 'IncludePath'), { rows: 2 }),
  f('libPath', 'device', G.deviceEnv, '库路径', 'Library path', 'textarea', 'proj', p(P.common, 'LibPath'), { rows: 2 }),

  // ----------------------------------------------------------------- Target
  f('xtal', 'target', G.clock, '晶振 (MHz)', 'Xtal (MHz)', 'number', 'opt', p(P.opt, 'CLKADS'), {
    step: '0.1',
    transform: {
      get: (v) => (v === '' ? '' : String(Number(v) / 1000000)),
      set: (v) => String(Math.round(Number(v || 0) * 1000000)),
    },
  }),
  f('toolset', 'target', G.clock, '工具链', 'Toolset', 'text', 'proj', ['ToolsetName'], { readonly: true }),
  f('compiler', 'target', G.clock, 'ARM 编译器', 'ARM compiler', 'text', 'proj', ['pCCUsed']),
  f('microLib', 'target', G.clock, '使用 MicroLIB', 'Use MicroLIB', 'checkbox', 'proj', p(P.misc, 'useUlib')),
  f('crossModule', 'target', G.clock, '跨模块优化', 'Cross-module optimization', 'checkbox', 'proj', p(P.misc, 'uLtcg')),
  f('bigEndian', 'target', G.clock, '大端模式', 'Big endian', 'checkbox', 'proj', p(P.misc, 'BigEnd')),
  f('startup', 'target', G.clock, '启动文件选择', 'Startup selection', 'text', 'proj', p(P.misc, 'StupSel'), {
    hint: { zh: 'Keil 原始枚举值，通常保持默认。', en: 'Raw Keil enum; usually keep default.' },
  }),
  f('rtos', 'target', G.clock, 'RTOS', 'RTOS', 'text', 'proj', p(P.misc, 'mOS'), {
    hint: { zh: 'Keil 原始值；0 表示无 RTOS。', en: 'Raw Keil value; 0 means none.' },
  }),
  f('iromEnable', 'target', G.memory, '启用 IROM1', 'Enable IROM1', 'checkbox', 'proj', p(P.misc, 'hadIROM')),
  f('iromStart', 'target', G.memory, 'IROM1 起始', 'IROM1 start', 'text', 'proj', p(P.misc, 'OnChipMemories', 'IROM', 'StartAddress')),
  f('iromSize', 'target', G.memory, 'IROM1 大小', 'IROM1 size', 'text', 'proj', p(P.misc, 'OnChipMemories', 'IROM', 'Size')),
  f('iramEnable', 'target', G.memory, '启用 IRAM1', 'Enable IRAM1', 'checkbox', 'proj', p(P.misc, 'hadIRAM')),
  f('iramStart', 'target', G.memory, 'IRAM1 起始', 'IRAM1 start', 'text', 'proj', p(P.misc, 'OnChipMemories', 'IRAM', 'StartAddress')),
  f('iramSize', 'target', G.memory, 'IRAM1 大小', 'IRAM1 size', 'text', 'proj', p(P.misc, 'OnChipMemories', 'IRAM', 'Size')),

  // ----------------------------------------------------------------- Output
  f('outputDirectory', 'output', G.output, '输出目录', 'Output folder', 'text', 'proj', p(P.common, 'OutputDirectory')),
  f('outputName', 'output', G.output, '输出文件名', 'Executable name', 'text', 'proj', p(P.common, 'OutputName')),
  f('createExecutable', 'output', G.output, '生成可执行文件', 'Create executable', 'checkbox', 'proj', p(P.common, 'CreateExecutable')),
  f('createLib', 'output', G.output, '生成库文件', 'Create library', 'checkbox', 'proj', p(P.common, 'CreateLib')),
  f('createHex', 'output', G.output, '生成 HEX 文件', 'Create HEX file', 'checkbox', 'proj', p(P.common, 'CreateHexFile')),
  f('debugInfo', 'output', G.output, '调试信息', 'Debug information', 'checkbox', 'proj', p(P.common, 'DebugInformation')),
  f('browseInfo', 'output', G.output, '浏览信息', 'Browse information', 'checkbox', 'proj', p(P.common, 'BrowseInformation')),
  f('createBatch', 'output', G.output, '生成批处理文件', 'Create batch file', 'checkbox', 'proj', p(P.common, 'CreateBatchFile')),
  f('listingPath', 'output', G.output, '列表目录', 'Listing folder', 'text', 'proj', p(P.common, 'ListingPath')),
  f('hexFormat', 'output', G.output, 'HEX 格式选择', 'HEX format selection', 'text', 'proj', p(P.common, 'HexFormatSelection')),
  f('merge32k', 'output', G.output, '合并 32K', 'Merge 32K', 'checkbox', 'proj', p(P.common, 'Merge32K')),

  // ----------------------------------------------------------------- Listing
  f('optListingPath', 'listing', G.listing, '列表输出目录', 'Listing output folder', 'text', 'opt', p(P.optLex, 'ListingPath')),
  f('pageWidth', 'listing', G.listing, '页宽', 'Page width', 'number', 'opt', p(P.optLex, 'PageWidth')),
  f('pageLength', 'listing', G.listing, '页长', 'Page length', 'number', 'opt', p(P.optLex, 'PageLength')),
  f('tabStop', 'listing', G.listing, 'Tab 宽度', 'Tab stop', 'number', 'opt', p(P.optLex, 'TabStop')),
  f('generateListings', 'listing', G.listing, '生成列表文件', 'Generate listings', 'checkbox', 'proj', p(P.misc, 'GenerateListings')),
  f('createCListing', 'listing', G.listingPage, 'C 列表', 'C listing', 'checkbox', 'opt', p(P.optList, 'CreateCListing')),
  f('createAListing', 'listing', G.listingPage, '汇编列表', 'Assembler listing', 'checkbox', 'opt', p(P.optList, 'CreateAListing')),
  f('createLListing', 'listing', G.listingPage, '链接列表', 'Linker listing', 'checkbox', 'opt', p(P.optList, 'CreateLListing')),
  f('createIListing', 'listing', G.listingPage, '预处理列表', 'Preprocessor listing', 'checkbox', 'opt', p(P.optList, 'CreateIListing')),
  f('asmCond', 'listing', G.listingPage, '汇编条件', 'Assembler conditionals', 'checkbox', 'opt', p(P.optList, 'AsmCond')),
  f('asmSymb', 'listing', G.listingPage, '汇编符号', 'Assembler symbols', 'checkbox', 'opt', p(P.optList, 'AsmSymb')),
  f('asmXref', 'listing', G.listingPage, '汇编交叉引用', 'Assembler cross reference', 'checkbox', 'opt', p(P.optList, 'AsmXref')),
  f('cCond', 'listing', G.listingPage, 'C 条件', 'C conditionals', 'checkbox', 'opt', p(P.optList, 'CCond')),
  f('cCode', 'listing', G.listingPage, 'C 源码', 'C source', 'checkbox', 'opt', p(P.optList, 'CCode')),
  f('cListInc', 'listing', G.listingPage, 'C 包含文件', 'C include files', 'checkbox', 'opt', p(P.optList, 'CListInc')),
  f('linkerCodeListing', 'listing', G.listingPage, '链接器代码列表', 'Linker code listing', 'checkbox', 'opt', p(P.optList, 'LinkerCodeListing')),

  // ----------------------------------------------------------------- User
  f('beforeCompileRun1', 'user', G.userCompile, '运行程序 1', 'Run program 1', 'checkbox', 'proj', p(P.common, 'BeforeCompile', 'RunUserProg1')),
  f('beforeCompileName1', 'user', G.userCompile, '程序 1', 'Program 1', 'text', 'proj', p(P.common, 'BeforeCompile', 'UserProg1Name')),
  f('beforeCompileRun2', 'user', G.userCompile, '运行程序 2', 'Run program 2', 'checkbox', 'proj', p(P.common, 'BeforeCompile', 'RunUserProg2')),
  f('beforeCompileName2', 'user', G.userCompile, '程序 2', 'Program 2', 'text', 'proj', p(P.common, 'BeforeCompile', 'UserProg2Name')),
  f('beforeMakeRun1', 'user', G.userMake, '运行程序 1', 'Run program 1', 'checkbox', 'proj', p(P.common, 'BeforeMake', 'RunUserProg1')),
  f('beforeMakeName1', 'user', G.userMake, '程序 1', 'Program 1', 'text', 'proj', p(P.common, 'BeforeMake', 'UserProg1Name')),
  f('beforeMakeRun2', 'user', G.userMake, '运行程序 2', 'Run program 2', 'checkbox', 'proj', p(P.common, 'BeforeMake', 'RunUserProg2')),
  f('beforeMakeName2', 'user', G.userMake, '程序 2', 'Program 2', 'text', 'proj', p(P.common, 'BeforeMake', 'UserProg2Name')),
  f('afterMakeRun1', 'user', G.userAfter, '运行程序 1', 'Run program 1', 'checkbox', 'proj', p(P.common, 'AfterMake', 'RunUserProg1')),
  f('afterMakeName1', 'user', G.userAfter, '程序 1', 'Program 1', 'text', 'proj', p(P.common, 'AfterMake', 'UserProg1Name')),
  f('afterMakeRun2', 'user', G.userAfter, '运行程序 2', 'Run program 2', 'checkbox', 'proj', p(P.common, 'AfterMake', 'RunUserProg2')),
  f('afterMakeName2', 'user', G.userAfter, '程序 2', 'Program 2', 'text', 'proj', p(P.common, 'AfterMake', 'UserProg2Name')),
  f('beepAtEnd', 'user', G.userRun, '完成后蜂鸣', 'Beep when complete', 'checkbox', 'opt', p(P.optTtt, 'BeepAtEnd')),
  f('runTarget', 'user', G.userRun, '构建后启动调试', 'Start debug after build', 'checkbox', 'opt', p(P.optTtt, 'RunTarget')),
  f('runSim', 'user', G.userRun, '使用仿真器', 'Use simulator', 'checkbox', 'opt', p(P.optTtt, 'RunSim')),

  // ----------------------------------------------------------------- C/C++
  f('cDefine', 'c', G.cPre, '宏定义', 'Define', 'textarea', 'proj', p(P.cads, 'VariousControls', 'Define'), { rows: 3 }),
  f('cUndefine', 'c', G.cPre, '取消宏', 'Undefine', 'textarea', 'proj', p(P.cads, 'VariousControls', 'Undefine'), { rows: 2 }),
  f('cInclude', 'c', G.cPre, '包含路径', 'Include paths', 'textarea', 'proj', p(P.cads, 'VariousControls', 'IncludePath'), { rows: 4 }),
  f('cMisc', 'c', G.cPre, '其他控制', 'Misc controls', 'textarea', 'proj', p(P.cads, 'VariousControls', 'MiscControls'), { rows: 2 }),
  f('optim', 'c', G.cLang, '优化等级', 'Optimization', 'select', 'proj', p(P.cads, 'Optim'), { options: optimOptions }),
  f('optimTime', 'c', G.cLang, '优化速度', 'Optimize for time', 'checkbox', 'proj', p(P.cads, 'oTime')),
  f('wLevel', 'c', G.cLang, '警告等级', 'Warning level', 'select', 'proj', p(P.cads, 'wLevel'), { options: warningOptions }),
  f('c99', 'c', G.cLang, 'C99 模式', 'C99 mode', 'checkbox', 'proj', p(P.cads, 'uC99')),
  f('gnu', 'c', G.cLang, 'GNU 扩展', 'GNU extensions', 'checkbox', 'proj', p(P.cads, 'uGnu')),
  f('cStd', 'c', G.cLang, 'C 标准 (AC6)', 'C standard (AC6)', 'select', 'proj', p(P.cads, 'v6Lang'), { options: cStdOptions }),
  f('cppStd', 'c', G.cLang, 'C++ 标准 (AC6)', 'C++ standard (AC6)', 'select', 'proj', p(P.cads, 'v6LangP'), { options: cppStdOptions }),
  f('interw', 'c', G.cCode, 'ARM/Thumb 交互', 'Interworking', 'checkbox', 'proj', p(P.cads, 'interw')),
  f('oneElfS', 'c', G.cCode, '每个函数独立段', 'One ELF section per function', 'checkbox', 'proj', p(P.cads, 'OneElfS')),
  f('splitLS', 'c', G.cCode, '拆分 LDM/STM', 'Split load/store multiple', 'checkbox', 'proj', p(P.cads, 'SplitLS')),
  f('strict', 'c', G.cCode, '严格 ANSI C', 'Strict ANSI C', 'checkbox', 'proj', p(P.cads, 'Strict')),
  f('enumInt', 'c', G.cCode, '枚举始终为 int', 'Enum container always int', 'checkbox', 'proj', p(P.cads, 'EnumInt')),
  f('plainCh', 'c', G.cCode, 'char 为有符号', 'Plain char is signed', 'checkbox', 'proj', p(P.cads, 'PlainCh')),
  f('ropi', 'c', G.cCode, '只读位置无关', 'Read-only position independent', 'checkbox', 'proj', p(P.cads, 'Ropi')),
  f('rwpi', 'c', G.cCode, '读写位置无关', 'Read-write position independent', 'checkbox', 'proj', p(P.cads, 'Rwpi')),
  f('thumb', 'c', G.cCode, 'Thumb 模式', 'Thumb mode', 'checkbox', 'proj', p(P.cads, 'uThumb')),
  f('surpInc', 'c', G.cCode, '不自动包含', 'No auto includes', 'checkbox', 'proj', p(P.cads, 'uSurpInc')),
  f('useXO', 'c', G.cCode, '使用 .xo 文件', 'Use .xo files', 'checkbox', 'proj', p(P.cads, 'useXO')),
  f('shortEn', 'c', G.cCode, '短枚举', 'Short enums', 'checkbox', 'proj', p(P.cads, 'vShortEn')),
  f('shortWch', 'c', G.cCode, '短 wchar', 'Short wchar', 'checkbox', 'proj', p(P.cads, 'vShortWch')),
  f('lto', 'c', G.cCode, '链接时优化', 'Link-time optimization', 'checkbox', 'proj', p(P.cads, 'v6Lto')),
  f('wte', 'c', G.cCode, 'WTE', 'WTE', 'checkbox', 'proj', p(P.cads, 'v6WtE')),
  f('rtti', 'c', G.cCode, 'RTTI（运行时类型信息）', 'RTTI', 'checkbox', 'proj', p(P.cads, 'v6Rtti')),

  // ----------------------------------------------------------------- Asm
  f('aDefine', 'asm', G.asmPre, '宏定义', 'Define', 'textarea', 'proj', p(P.aads, 'VariousControls', 'Define'), { rows: 2 }),
  f('aUndefine', 'asm', G.asmPre, '取消宏', 'Undefine', 'textarea', 'proj', p(P.aads, 'VariousControls', 'Undefine'), { rows: 2 }),
  f('aInclude', 'asm', G.asmPre, '包含路径', 'Include paths', 'textarea', 'proj', p(P.aads, 'VariousControls', 'IncludePath'), { rows: 3 }),
  f('aMisc', 'asm', G.asmPre, '其他控制', 'Misc controls', 'textarea', 'proj', p(P.aads, 'VariousControls', 'MiscControls'), { rows: 2 }),
  f('aInterw', 'asm', G.asmOpt, 'ARM/Thumb 交互', 'Interworking', 'checkbox', 'proj', p(P.aads, 'interw')),
  f('aRopi', 'asm', G.asmOpt, '只读位置无关', 'Read-only PI', 'checkbox', 'proj', p(P.aads, 'Ropi')),
  f('aRwpi', 'asm', G.asmOpt, '读写位置无关', 'Read-write PI', 'checkbox', 'proj', p(P.aads, 'Rwpi')),
  f('aThumb', 'asm', G.asmOpt, 'Thumb 模式', 'Thumb mode', 'checkbox', 'proj', p(P.aads, 'thumb')),
  f('aSplitLS', 'asm', G.asmOpt, '拆分 LDM/STM', 'Split load/store multiple', 'checkbox', 'proj', p(P.aads, 'SplitLS')),
  f('swStkChk', 'asm', G.asmOpt, '软件栈检查', 'Software stack check', 'checkbox', 'proj', p(P.aads, 'SwStkChk')),
  f('aNoWarn', 'asm', G.asmOpt, '禁用警告', 'Disable warnings', 'checkbox', 'proj', p(P.aads, 'NoWarn')),
  f('aSurpInc', 'asm', G.asmOpt, '不自动包含', 'No auto includes', 'checkbox', 'proj', p(P.aads, 'uSurpInc')),
  f('aUseXO', 'asm', G.asmOpt, '使用 .xo 文件', 'Use .xo files', 'checkbox', 'proj', p(P.aads, 'useXO')),
  f('clangAsOpt', 'asm', G.asmOpt, 'Clang 汇编选项', 'Clang assembler option', 'text', 'proj', p(P.aads, 'ClangAsOpt')),

  // ----------------------------------------------------------------- Linker
  f('umfTarg', 'linker', G.link, '使用目标对话框存储布局', 'Use memory layout from target dialog', 'checkbox', 'proj', p(P.ldads, 'umfTarg')),
  f('lRopi', 'linker', G.link, '只读位置无关', 'Read-only PI', 'checkbox', 'proj', p(P.ldads, 'Ropi')),
  f('lRwpi', 'linker', G.link, '读写位置无关', 'Read-write PI', 'checkbox', 'proj', p(P.ldads, 'Rwpi')),
  f('noStLib', 'linker', G.link, '不搜索标准库', "Don't search standard libraries", 'checkbox', 'proj', p(P.ldads, 'noStLib')),
  f('repFail', 'linker', G.link, '报告可能失败', "Report 'might fail' conditions", 'checkbox', 'proj', p(P.ldads, 'RepFail')),
  f('useFile', 'linker', G.link, '使用 Scatter 文件', 'Use scatter file', 'checkbox', 'proj', p(P.ldads, 'useFile')),
  f('textAddressRange', 'linker', G.linkMem, '代码地址范围', 'Text address range', 'text', 'proj', p(P.ldads, 'TextAddressRange')),
  f('dataAddressRange', 'linker', G.linkMem, '数据地址范围', 'Data address range', 'text', 'proj', p(P.ldads, 'DataAddressRange')),
  f('xoBase', 'linker', G.linkMem, 'XO 基址', 'X/O base', 'text', 'proj', p(P.ldads, 'pXoBase')),
  f('scatterFile', 'linker', G.linkMem, 'Scatter 文件', 'Scatter file', 'text', 'proj', p(P.ldads, 'ScatterFile')),
  f('includeLibs', 'linker', G.linkMisc, '包含库', 'Include libraries', 'textarea', 'proj', p(P.ldads, 'IncludeLibs'), { rows: 2 }),
  f('includeLibsPath', 'linker', G.linkMisc, '库路径', 'Library paths', 'textarea', 'proj', p(P.ldads, 'IncludeLibsPath'), { rows: 2 }),
  f('linkerMisc', 'linker', G.linkMisc, '其他控制', 'Misc controls', 'textarea', 'proj', p(P.ldads, 'Misc'), { rows: 2 }),
  f('linkerInputFile', 'linker', G.linkMisc, '附加输入文件', 'Additional input file', 'text', 'proj', p(P.ldads, 'LinkerInputFile')),
  f('disabledWarnings', 'linker', G.linkMisc, '禁用警告', 'Disabled warnings', 'text', 'proj', p(P.ldads, 'DisabledWarnings')),

  // ----------------------------------------------------------------- Debug
  f('useSim', 'debug', G.debugMode, '使用仿真器', 'Use simulator', 'checkbox', 'opt', p(P.optDebug, 'uSim')),
  f('useTarget', 'debug', G.debugMode, '使用目标驱动', 'Use target driver', 'checkbox', 'opt', p(P.optDebug, 'uTrg')),
  f('loadApp', 'debug', G.debugStart, '启动时加载程序', 'Load application at startup', 'checkbox', 'opt', p(P.optDebug, 'sLdApp')),
  f('runToMain', 'debug', G.debugStart, '运行到 main()', 'Run to main()', 'checkbox', 'opt', p(P.optDebug, 'sGomain')),
  f('initFile', 'debug', G.debugStart, '初始化文件', 'Initialization file', 'text', 'opt', p(P.optDebug, 'sIfile')),
  f('targetInitFile', 'debug', G.debugStart, '目标初始化文件', 'Target initialization file', 'text', 'opt', p(P.optDebug, 'tIfile')),
  f('driverDll', 'debug', G.debugDriver, '驱动 DLL (pMon)', 'Driver DLL (pMon)', 'text', 'opt', p(P.optDebug, 'pMon')),
  f('driverIndex', 'debug', G.debugDriver, '驱动索引 (nTsel)', 'Driver index (nTsel)', 'number', 'opt', p(P.optDebug, 'nTsel')),
  f('simDll', 'debug', G.debugDriver, '仿真 DLL', 'Simulator DLL', 'text', 'opt', p(P.optDebug, 'sDll')),
  f('simDllParams', 'debug', G.debugDriver, '仿真参数', 'Simulator parameters', 'text', 'opt', p(P.optDebug, 'sDllPa')),
  f('targetDll', 'debug', G.debugDriver, '目标 DLL', 'Target DLL', 'text', 'opt', p(P.optDebug, 'tDll')),
  f('targetDllParams', 'debug', G.debugDriver, '目标参数', 'Target parameters', 'text', 'opt', p(P.optDebug, 'tDllPa')),
  f('debugEnable', 'debug', G.debugDesc, '启用调试描述', 'Enable debug description', 'checkbox', 'opt', p(P.optDesc, 'Enable')),
  f('flashSeq', 'debug', G.debugDesc, '启用 Flash 序列', 'Enable flash sequence', 'checkbox', 'opt', p(P.optDesc, 'EnableFlashSeq')),
  f('debugProtocol', 'debug', G.debugDesc, '协议', 'Protocol', 'text', 'opt', p(P.optDesc, 'Protocol')),
  f('debugClock', 'debug', G.debugDesc, '调试时钟', 'Debug clock', 'number', 'opt', p(P.optDesc, 'DbgClock')),

  // ----------------------------------------------------------------- Utilities
  f('utilDriverIndex', 'utilities', G.utilFlash, 'Flash 驱动索引 (nTsel)', 'Flash driver index (nTsel)', 'number', 'opt', p(P.optDebug, 'nTsel')),
  f('utilDriverDll', 'utilities', G.utilFlash, 'Flash 驱动 DLL', 'Flash driver DLL', 'text', 'opt', p(P.optDebug, 'pMon')),
  f('utilFlashSeq', 'utilities', G.utilFlash, '下载后校验/序列', 'Verify / flash sequence', 'checkbox', 'opt', p(P.optDesc, 'EnableFlashSeq')),
  f('utilProtocol', 'utilities', G.utilFlash, '协议', 'Protocol', 'text', 'opt', p(P.optDesc, 'Protocol')),
  f('utilClock', 'utilities', G.utilFlash, '调试时钟', 'Debug clock', 'number', 'opt', p(P.optDesc, 'DbgClock')),

  // ----------------------------------------------------------------- Advanced
  f('rawTargetOption', 'advanced', G.advanced, 'TargetOption XML', 'TargetOption XML', 'textarea', 'raw', [], {
    rows: 26,
    hint: {
      zh: '高级编辑：保存前会校验 XML。用于覆盖本页未暴露的 Keil 字段。',
      en: 'Advanced: XML is validated before saving. Use it for fields not exposed here.',
    },
  }),
];

function fieldValue(field, rawValue) {
  if (field.transform && field.transform.get) {
    return field.transform.get(rawValue);
  }
  if (field.type === 'checkbox') {
    return String(rawValue || '').trim() === '1';
  }
  if (field.type === 'number') {
    if (rawValue === '' || rawValue == null) return '';
    return String(rawValue);
  }
  return rawValue == null ? '' : String(rawValue);
}

function localizeLabel(label, language) {
  return language === 'en' ? label.en : label.zh;
}

function getOptionsData(project, targetName, language) {
  const fields = FIELDS.map((field) => {
    let value = '';
    if (field.source === 'raw') {
      value = project.getRawTargetOption(targetName);
    } else {
      const raw = project.getOptionValue(targetName, field.source, field.path, field.type === 'checkbox' ? '0' : '');
      value = fieldValue(field, raw);
    }
    return {
      id: field.id,
      tab: field.tab,
      group: localizeLabel(field.group, language),
      label: localizeLabel(field.label, language),
      type: field.type,
      value,
      options: field.options ? field.options.map((o) => ({ value: o.value, label: language === 'en' ? o.en : o.zh })) : undefined,
      readonly: !!field.readonly,
      rows: field.rows || 1,
      step: field.step,
      hint: field.hint ? localizeLabel(field.hint, language) : '',
    };
  });
  return {
    tabs: TABS.map((t) => ({ id: t.id, label: language === 'en' ? t.en : t.zh })),
    fields,
    targetName: targetName || project.getCurrentTargetName(),
    targets: project.getTargetNames(),
    projectName: project.projName,
    projectPath: project.projPath,
    language,
  };
}

function normalizeForCompare(value) {
  if (typeof value === 'boolean') return value ? '1' : '0';
  return String(value == null ? '' : value).trim();
}

async function applyOptions(project, targetName, values) {
  let changed = 0;
  for (const field of FIELDS) {
    if (!(field.id in values)) continue;
    if (field.readonly) continue;
    const next = values[field.id];
    if (field.source === 'raw') {
      const current = project.getRawTargetOption(targetName);
      if (normalizeForCompare(next) !== normalizeForCompare(current)) {
        project.setRawTargetOption(targetName, next);
        changed += 1;
      }
      continue;
    }
    const currentRaw = project.getOptionValue(targetName, field.source, field.path, field.type === 'checkbox' ? '0' : '');
    const current = fieldValue(field, currentRaw);
    if (normalizeForCompare(current) === normalizeForCompare(next)) continue;
    if (field.type === 'checkbox') {
      project.setOptionValue(targetName, field.source, field.path, next ? '1' : '0');
      changed += 1;
      continue;
    }
    let value = next == null ? '' : String(next);
    if (field.transform && field.transform.set) value = field.transform.set(value);
    if (value === '' && !current) continue;
    project.setOptionValue(targetName, field.source, field.path, value);
    if (field.id === 'compiler') {
      const ac6 = /ARMCLANG/i.test(value) ? '1' : '0';
      project.setOptionValue(targetName, 'proj', p(P.misc, 'uAC6'), ac6);
    }
    changed += 1;
  }
  if (changed) await project.saveAll();
  return changed;
}

module.exports = {
  TABS,
  FIELDS,
  getOptionsData,
  applyOptions,
};
