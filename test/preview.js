const fs = require('fs');
const path = require('path');
const { KeilProject } = require('../src/keil/project');
const { getOptionsData } = require('../src/keil/optionsSchema');
const { strings } = require('../src/i18n');
const { detectCompilers } = require('../src/keil/compilers');
const { readDriverSetup } = require('../src/keil/driverSetup');
const { optionsHtml, itemsHtml, sidebarHtml } = require('../src/ui/webviewHtml');

(async () => {
  const project = await KeilProject.load('F:/KeilEx/test-project/Projects/MDK-ARM/atk_f103.uvprojx');
  const target = project.getCurrentTargetName();
  const lang = 'zh';
  const sync = { keilRunning: true, uv4Path: 'F:/KEIL/UV4/UV4.exe', lastWrite: '20:31:04', hasOpt: true };

  const optionsData = {
    ...getOptionsData(project, target, lang),
    language: lang,
    strings: strings(lang),
    sync,
    compilers: detectCompilers('F:/KEIL/UV4/UV4.exe'),
    projectDir: project.projDir,
    driverSetup: readDriverSetup(project, target),
  };
  fs.writeFileSync(
    path.join(__dirname, 'preview-options.html'),
    optionsHtml({ extensionPath: 'F:/KeilEx', nonce: 'preview', cspSource: "'self'", data: optionsData }),
    'utf8',
  );

  const state = project.getItemsState(target);
  const itemsData = {
    ...state,
    language: lang,
    strings: strings(lang),
    sync,
    tabs: [
      { id: 'project', label: strings(lang).projectItems },
      { id: 'folders', label: strings(lang).foldersExtensions },
      { id: 'books', label: strings(lang).books },
      { id: 'info', label: strings(lang).projectInfo },
    ],
  };
  fs.writeFileSync(
    path.join(__dirname, 'preview-items.html'),
    itemsHtml({ extensionPath: 'F:/KeilEx', nonce: 'preview', cspSource: "'self'", data: itemsData }),
    'utf8',
  );

  const sidebarData = {
    projectName: project.projName,
    projectPath: project.projPath,
    projectDir: project.projDir,
    device: project.getTargetDevice(target),
    targetName: target,
    targets: project.targets.map((t) => ({
      name: t.name,
      isCurrent: t.name === target,
      device: project.getTargetDevice(t.name),
      groups: t.groups.map((g) => ({
        name: g.name,
        files: g.files.map((f) => ({
          name: f.name,
          path: f.path,
          absPath: f.absPath,
          type: f.type,
        })),
      })),
    })),
    keilRunning: true,
    lastBuild: {
      success: true,
      errors: 0,
      warnings: 0,
      durationMs: 15200,
      mode: 'build',
      target,
      flashPercent: 8.1,
      ramPercent: 6.4,
      flashUsed: 4468,
      flashSize: 524288,
      ramUsed: 1920,
      ramSize: 65536,
    },
    language: lang,
    strings: strings(lang),
  };
  fs.writeFileSync(
    path.join(__dirname, 'preview-sidebar.html'),
    sidebarHtml({ extensionPath: 'F:/KeilEx', nonce: 'preview', cspSource: "'self'", data: sidebarData }),
    'utf8',
  );
  console.log('previews written');
})();
