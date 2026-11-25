'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { KeilProject } = require('../src/keil/project');
const { getOptionsData, applyOptions } = require('../src/keil/optionsSchema');
const { KeilBuilder, detectUv4Path, parseDiagnostics } = require('../src/keil/builder');

const repo = path.resolve(__dirname, '..');
const source = path.join(repo, 'test-project');
const tmpRoot = path.join(repo, 'test', '.tmp');
const work = path.join(tmpRoot, 'project');

function rm(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

async function main() {
  rm(tmpRoot);
  fs.mkdirSync(tmpRoot, { recursive: true });
  fs.cpSync(source, work, { recursive: true });
  const projectPath = path.join(work, 'Projects', 'MDK-ARM', 'atk_f103.uvprojx');
  let project = await KeilProject.load(projectPath);
  assert(project.targets.length >= 1, 'targets should exist');
  assert(project.getGroups().length >= 3, 'groups should exist');
  assert(project.getCurrentTargetName(), 'current target should exist');
  console.log('PASS load', project.getTargetNames(), project.getGroups().length, 'groups');

  const target = project.getCurrentTargetName();
  const data = getOptionsData(project, target, 'zh');
  assert(data.fields.length > 100, 'options fields should be broad');
  assert(data.tabs.length === 11, 'options tabs should be 11');
  const noopValues = {};
  for (const field of data.fields) noopValues[field.id] = field.value;
  const noop = await applyOptions(project, target, noopValues);
  assert.strictEqual(noop, 0, 'applying current values should be a no-op');
  console.log('PASS options noop', data.fields.length, 'fields');

  const changed = await applyOptions(project, target, {
    xtal: '16',
    microLib: false,
    outputName: 'ks_test2',
    createHex: false,
    optim: '2',
    cDefine: 'USE_HAL_DRIVER,STM32F103xE,KS_TEST2',
  });
  assert(changed >= 5, 'several option values should change');
  project = await KeilProject.load(projectPath);
  const after = getOptionsData(project, target, 'zh');
  const valueOf = (id) => after.fields.find((f) => f.id === id).value;
  assert.strictEqual(String(valueOf('xtal')), '16');
  assert.strictEqual(valueOf('microLib'), false);
  assert.strictEqual(valueOf('outputName'), 'ks_test2');
  assert.strictEqual(valueOf('createHex'), false);
  assert.strictEqual(valueOf('optim'), '2');
  assert(String(valueOf('cDefine')).includes('KS_TEST2'));
  console.log('PASS options write/readback');

  project.addGroup(target, 'TestGroup');
  project.addFiles(target, 'TestGroup', [path.join(work, 'readme.txt')]);
  project.moveGroup(target, 'TestGroup', 'up');
  await project.saveProject();
  project = await KeilProject.load(projectPath);
  const group = project.getGroups(target).find((g) => g.name === 'TestGroup');
  assert(group, 'added group should persist');
  assert.strictEqual(group.files.length, 1, 'added file should persist');
  console.log('PASS project items add');

  project.addTarget('ReleaseTest', target);
  project.setCurrentTarget('ReleaseTest');
  await project.saveAll();
  project = await KeilProject.load(projectPath);
  assert(project.getTargetNames().includes('ReleaseTest'), 'new target should persist');
  assert.strictEqual(project.getCurrentTargetName(), 'ReleaseTest', 'current target should switch');
  console.log('PASS target add/switch');

  const uv4 = await detectUv4Path('');
  if (!uv4) {
    console.log('SKIP build: UV4.exe not found');
  } else {
    const builder = new KeilBuilder({
      project,
      uv4Path: uv4,
      onLine: (line) => {
        if (/Build target|Error\(s\)|Program Size/.test(line)) console.log('LOG', line);
      },
    });
    const result = await builder.run('build', 'ReleaseTest');
    assert(result.success, `build should succeed, code=${result.code}\n${result.log}`);
    assert(result.log.includes("Build target 'ReleaseTest'"), 'build should use selected target');
    console.log('PASS build', result.code, `${(result.durationMs / 1000).toFixed(1)}s`);
  }

  const diag = parseDiagnostics('..\\Users\\main.c(42): error: #20: identifier "x" is undefined', project.projDir);
  assert.strictEqual(diag.length, 1);
  assert.strictEqual(diag[0].line, 42);
  assert.strictEqual(diag[0].code, '20');
  console.log('PASS diagnostics');

  project.removeTarget('ReleaseTest');
  project.removeGroup(target, 'TestGroup');
  await project.saveAll();
  project = await KeilProject.load(projectPath);
  assert(!project.getTargetNames().includes('ReleaseTest'), 'target removal should persist');
  assert(!project.getGroups(target).some((g) => g.name === 'TestGroup'), 'group removal should persist');
  console.log('PASS cleanup');

  rm(tmpRoot);
  console.log('ALL PASS');
}

main().catch((err) => {
  console.error('FAIL', err);
  process.exitCode = 1;
});
