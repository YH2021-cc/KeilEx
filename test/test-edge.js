const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { KeilProject } = require('../src/keil/project');
const { KeilBuilder, detectUv4Path } = require('../src/keil/builder');

const repo = path.resolve(__dirname, '..');
const tmpRoot = path.join(repo, 'test', '.tmp-edge');
const work = path.join(tmpRoot, 'project');

(async () => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
  fs.mkdirSync(tmpRoot, { recursive: true });
  fs.cpSync(path.join(repo, 'test-project'), work, { recursive: true });
  const projectPath = path.join(work, 'Projects', 'MDK-ARM', 'atk_f103.uvprojx');
  const optPath = projectPath.replace(/\.uvprojx$/i, '.uvoptx');
  fs.rmSync(optPath, { force: true });

  let project = await KeilProject.load(projectPath);
  assert.strictEqual(project.optDoc, null, 'opt missing');
  assert.strictEqual(project.getCurrentTargetName(), 'Template');
  project.addTarget('NoOptTarget', 'Template');
  project.setCurrentTarget('NoOptTarget');
  await project.saveAll();
  assert(fs.existsSync(optPath), 'opt created');
  project = await KeilProject.load(projectPath);
  assert.strictEqual(project.getCurrentTargetName(), 'NoOptTarget');
  console.log('PASS missing uvoptx creation');

  const raw = project.getRawTargetOption('NoOptTarget');
  assert(raw.includes('OutputName'));
  const nextRaw = raw.replace(/<OutputName>[^<]*<\/OutputName>/, '<OutputName>ks_raw</OutputName>');
  project.setRawTargetOption('NoOptTarget', nextRaw);
  await project.saveProject();
  project = await KeilProject.load(projectPath);
  assert.strictEqual(project.getOptionValue('NoOptTarget', 'proj', ['TargetOption', 'TargetCommonOption', 'OutputName']), 'ks_raw');
  console.log('PASS raw target option');

  const uv4 = await detectUv4Path('');
  if (uv4) {
    const result = await new KeilBuilder({ project, uv4Path: uv4 }).run('build', 'NoOptTarget');
    assert(result.success, `build should succeed: ${result.code}\n${result.log}`);
    console.log('PASS build without original uvoptx');
  } else {
    console.log('SKIP build');
  }
  fs.rmSync(tmpRoot, { recursive: true, force: true });
  console.log('ALL EDGE PASS');
})().catch((err) => {
  console.error('FAIL', err);
  process.exitCode = 1;
});
