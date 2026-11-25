'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const {
  parseXml,
  child,
  children,
  textOf,
  setText,
  boolOf,
  setBool,
  ensureChild,
  removeNode,
  getNodeByPath,
  ensureNodeByPath,
  innerXml,
  replaceChildrenFromXml,
  readXmlFile,
  writeXmlFile,
} = require('./xml');

const FILE_TYPE_BY_EXT = {
  '.c': '1',
  '.s': '2',
  '.asm': '2',
  '.a51': '2',
  '.cpp': '8',
  '.cxx': '8',
  '.cc': '8',
  '.h': '5',
  '.hpp': '5',
  '.txt': '5',
  '.md': '5',
  '.lib': '4',
  '.a': '4',
  '.o': '3',
  '.obj': '3',
};

function normalizeSlashes(p) {
  return String(p || '').replace(/\\/g, '/');
}

function fileTypeFor(filePath) {
  const ext = path.extname(filePath || '').toLowerCase();
  return FILE_TYPE_BY_EXT[ext] || '5';
}

function readTargetName(targetElement) {
  return (textOf(targetElement, 'TargetName') || '').trim();
}

class KeilProject {
  constructor(uvprojxPath) {
    this.projPath = path.resolve(uvprojxPath);
    this.projDir = path.dirname(this.projPath);
    this.projName = path.basename(this.projPath);
    this.optPath = this.projPath.replace(/\.uvprojx$/i, '.uvoptx');
    this.projText = '';
    this.optText = '';
    this.projDoc = null;
    this.optDoc = null;
    this.currentTargetName = '';
    this._targets = [];
  }

  static async load(uvprojxPath) {
    const project = new KeilProject(uvprojxPath);
    await project.reload();
    return project;
  }

  async reload() {
    const proj = await readXmlFile(this.projPath);
    this.projText = proj.text;
    this.projDoc = proj.doc;

    this.optDoc = null;
    this.optText = '';
    this.optPath = this.projPath.replace(/\.uvprojx$/i, '.uvoptx');
    try {
      const stat = await fsp.stat(this.optPath);
      if (stat.isFile()) {
        const opt = await readXmlFile(this.optPath);
        this.optText = opt.text;
        this.optDoc = opt.doc;
      }
    } catch {
      // .uvoptx is optional; Keil can regenerate it.
    }

    this._targets = this._readTargets();
    this.currentTargetName = this._readCurrentTarget();
    return this;
  }

  _readTargets() {
    const root = this.projDoc && this.projDoc.documentElement;
    const targetsNode = root ? child(root, 'Targets') : null;
    const result = [];
    if (!targetsNode) return result;
    for (const targetNode of children(targetsNode, 'Target')) {
      const name = readTargetName(targetNode);
      if (!name) continue;
      const optTarget = this._findOptTarget(name);
      const groups = [];
      const groupsNode = child(targetNode, 'Groups');
      if (groupsNode) {
        for (const groupNode of children(groupsNode, 'Group')) {
          const groupName = (textOf(groupNode, 'GroupName') || '').trim();
          const files = [];
          const filesNode = child(groupNode, 'Files');
          if (filesNode) {
            for (const fileNode of children(filesNode, 'File')) {
              const fileName = (textOf(fileNode, 'FileName') || '').trim();
              if (!fileName) continue;
              const filePath = (textOf(fileNode, 'FilePath') || fileName).trim();
              files.push({
                name: fileName,
                path: filePath,
                absPath: this.resolveFilePath(filePath),
                type: (textOf(fileNode, 'FileType') || fileTypeFor(fileName)).trim(),
                node: fileNode,
              });
            }
          }
          groups.push({ name: groupName, node: groupNode, files });
        }
      }
      result.push({
        name,
        element: targetNode,
        optElement: optTarget,
        groups,
        isCurrent: false,
      });
    }
    return result;
  }

  _findOptTarget(name) {
    if (!this.optDoc || !this.optDoc.documentElement) return null;
    for (const targetNode of children(this.optDoc.documentElement, 'Target')) {
      if (readTargetName(targetNode) === name) return targetNode;
    }
    return null;
  }

  _readCurrentTarget() {
    if (!this._targets.length) return '';
    for (const target of this._targets) {
      if (!target.optElement) continue;
      const targetOption = child(target.optElement, 'TargetOption');
      const optfl = targetOption ? child(targetOption, 'OPTFL') : null;
      const current = optfl
        ? boolOf(optfl, 'IsCurrentTarget', false)
        : targetOption
          ? boolOf(targetOption, 'IsCurrentTarget', false)
          : false;
      if (current) {
        target.isCurrent = true;
        return target.name;
      }
    }
    this._targets[0].isCurrent = true;
    return this._targets[0].name;
  }

  get targets() {
    return this._targets;
  }

  getTargetNames() {
    return this._targets.map((t) => t.name);
  }

  getCurrentTargetName() {
    return this.currentTargetName || (this._targets[0] && this._targets[0].name) || '';
  }

  getTarget(name) {
    return this._targets.find((t) => t.name === (name || this.getCurrentTargetName())) || null;
  }

  getTargetNode(name) {
    const t = this.getTarget(name);
    return t ? t.element : null;
  }

  getGroups(name) {
    const target = this.getTarget(name);
    return target ? target.groups : [];
  }

  getFileCount(name) {
    const target = this.getTarget(name);
    if (!target) return 0;
    return target.groups.reduce((sum, g) => sum + g.files.length, 0);
  }

  ensureOptDoc() {
    if (this.optDoc) return this.optDoc;
    const header = '### uVision Project, (C) Keil Software';
    const targetXml = this._targets
      .map((target, index) => {
        const current = index === 0 ? 1 : 0;
        return `<Target><TargetName>${escapeXml(target.name)}</TargetName><ToolsetNumber>0x4</ToolsetNumber><ToolsetName>ARM-ADS</ToolsetName><TargetOption><CLKADS>12000000</CLKADS><OPTFL><IsCurrentTarget>${current}</IsCurrentTarget></OPTFL></TargetOption></Target>`;
      })
      .join('');
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n<ProjectOpt xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="project_optx.xsd"><SchemaVersion>1.0</SchemaVersion><Header>${header}</Header><Extensions><cExt>*.c</cExt><aExt>*.s*; *.src; *.a*</aExt><oExt>*.obj; *.o</oExt><lExt>*.lib</lExt><tExt>*.txt; *.h; *.inc; *.md</tExt><pExt>*.plm</pExt><CppX>*.cpp</CppX><nMigrate>0</nMigrate></Extensions><DaveTm><dwLowDateTime>0</dwLowDateTime><dwHighDateTime>0</dwHighDateTime></DaveTm>${targetXml}</ProjectOpt>`;
    this.optDoc = parseXml(xml, 'project_optx');
    this.optText = xml;
    for (const target of this._targets) {
      target.optElement = this._findOptTarget(target.name);
    }
    return this.optDoc;
  }

  setCurrentTarget(name) {
    if (!name || !this.getTarget(name)) return false;
    this.ensureOptDoc();
    for (const target of this._targets) {
      let optTarget = this._findOptTarget(target.name);
      if (!optTarget) {
        const optRoot = this.optDoc.documentElement;
        optTarget = this.optDoc.createElement('Target');
        optRoot.appendChild(optTarget);
        setText(optTarget, 'TargetName', target.name);
        setText(optTarget, 'ToolsetNumber', target.toolset || '0x4');
        setText(optTarget, 'ToolsetName', target.toolsetName || 'ARM-ADS');
        const to = ensureChild(optTarget, 'TargetOption');
        const optfl = ensureChild(to, 'OPTFL');
        setText(optfl, 'IsCurrentTarget', '0');
      }
      const targetOption = ensureChild(optTarget, 'TargetOption');
      const optfl = ensureChild(targetOption, 'OPTFL');
      setBool(optfl, 'IsCurrentTarget', target.name === name);
      target.optElement = optTarget;
      target.isCurrent = target.name === name;
    }
    this.currentTargetName = name;
    return true;
  }

  resolveFilePath(filePath) {
    const raw = String(filePath || '').trim();
    if (!raw || raw.startsWith('$')) return raw;
    return path.resolve(this.projDir, normalizeSlashes(raw));
  }

  relativeFilePath(absPath) {
    const rel = path.relative(this.projDir, path.resolve(absPath));
    return rel.replace(/\//g, '\\');
  }

  // ---------------------------------------------------------------------
  // Options (magic wand)
  // ---------------------------------------------------------------------

  getOptionValue(targetName, source, segments, fallback = '') {
    const target = this.getTarget(targetName);
    if (!target) return fallback;
    const root = source === 'opt' ? target.optElement : target.element;
    if (!root) return fallback;
    const node = getNodeByPath(root, segments);
    return node ? node.textContent : fallback;
  }

  setOptionValue(targetName, source, segments, value) {
    const target = this.getTarget(targetName);
    if (!target) throw new Error(`Target not found: ${targetName}`);
    let root = source === 'opt' ? target.optElement : target.element;
    if (!root && source === 'opt') {
      this.ensureOptDoc();
      target.optElement = this._findOptTarget(target.name);
      root = target.optElement;
    }
    if (!root) throw new Error(`Target option not found: ${targetName}`);
    const node = ensureNodeByPath(root, segments);
    node.textContent = value == null ? '' : String(value);
    return node;
  }

  getRawTargetOption(targetName) {
    const target = this.getTarget(targetName);
    if (!target) return '';
    const targetOption = child(target.element, 'TargetOption');
    return targetOption ? innerXml(targetOption) : '';
  }

  setRawTargetOption(targetName, xml) {
    const target = this.getTarget(targetName);
    if (!target) throw new Error(`Target not found: ${targetName}`);
    const targetOption = child(target.element, 'TargetOption');
    if (!targetOption) throw new Error('TargetOption not found');
    replaceChildrenFromXml(targetOption, xml);
  }

  getItemsState(targetName) {
    const name = targetName || this.getCurrentTargetName();
    const target = this.getTarget(name);
    const groupsFor = (t) =>
      t
        ? t.groups.map((g) => ({
            name: g.name,
            files: g.files.map((f) => ({
              name: f.name,
              path: f.path,
              absPath: f.absPath,
              type: f.type,
            })),
          }))
        : [];
    const groups = groupsFor(target);
    const groupsByTarget = {};
    for (const t of this._targets) groupsByTarget[t.name] = groupsFor(t);
    const extensions = [];
    if (this.optDoc) {
      const extNode = child(this.optDoc.documentElement, 'Extensions');
      if (extNode) {
        for (const e of children(extNode)) {
          extensions.push({ name: e.nodeName, value: e.textContent || '' });
        }
      }
    }
    const books = [];
    const booksNode = child(this.projDoc.documentElement, 'Books');
    if (booksNode) {
      for (const b of children(booksNode)) {
        books.push({ name: b.nodeName, value: b.textContent || '' });
      }
    }
    return {
      projectPath: this.projPath,
      projectName: this.projName,
      projectDir: this.projDir,
      targetName: name,
      currentTarget: this.getCurrentTargetName(),
      targets: this._targets.map((t) => ({
        name: t.name,
        isCurrent: t.name === this.getCurrentTargetName(),
        device: this.getTargetDevice(t.name),
        groups: t.groups.length,
        files: t.groups.reduce((sum, g) => sum + g.files.length, 0),
      })),
      groups,
      groupsByTarget,
      extensions,
      books,
      info: this.getProjectInfo(),
    };
  }

  getTargetDevice(targetName) {
    const target = this.getTarget(targetName);
    if (!target) return '';
    const targetOption = child(target.element, 'TargetOption');
    const common = targetOption ? child(targetOption, 'TargetCommonOption') : null;
    return common ? (textOf(common, 'Device') || '').trim() : '';
  }

  getProjectInfo() {
    const root = this.projDoc.documentElement;
    const firstTarget = this._targets[0];
    const common = firstTarget
      ? child(child(firstTarget.element, 'TargetOption'), 'TargetCommonOption')
      : null;
    return {
      schemaVersion: textOf(root, 'SchemaVersion'),
      header: textOf(root, 'Header'),
      toolset: firstTarget ? textOf(firstTarget.element, 'ToolsetName') : '',
      packId: common ? textOf(common, 'PackID') : '',
      device: common ? textOf(common, 'Device') : '',
      targetCount: this._targets.length,
      hasOptFile: !!this.optDoc,
      optPath: this.optPath,
    };
  }

  getMemoryInfo(targetName) {
    const target = this.getTarget(targetName);
    if (!target) return { irom: { start: 0, size: 0 }, iram: { start: 0, size: 0 } };
    const targetOption = child(target.element, 'TargetOption');
    const common = targetOption ? child(targetOption, 'TargetCommonOption') : null;
    const cpu = common ? textOf(common, 'Cpu') : '';
    const parse = (name) => {
      const comma = cpu.match(new RegExp(`${name}\\(0x([0-9a-fA-F]+),0x([0-9a-fA-F]+)\\)`));
      if (comma) {
        return { start: parseInt(comma[1], 16), size: parseInt(comma[2], 16) };
      }
      const range = cpu.match(new RegExp(`${name}\\(0x([0-9a-fA-F]+)-0x([0-9a-fA-F]+)\\)`));
      if (range) {
        const start = parseInt(range[1], 16);
        const end = parseInt(range[2], 16);
        return { start, size: Math.max(0, end - start + 1) };
      }
      return { start: 0, size: 0 };
    };
    const result = { irom: parse('IROM'), iram: parse('IRAM') };
    if (!result.irom.size || !result.iram.size) {
      const arm = targetOption ? child(targetOption, 'TargetArmAds') : null;
      const misc = arm ? child(arm, 'ArmAdsMisc') : null;
      const memories = misc ? child(misc, 'OnChipMemories') : null;
      if (memories) {
        const readMem = (tag) => {
          const node = child(memories, tag);
          if (!node) return { start: 0, size: 0 };
          return {
            start: parseInt(textOf(node, 'StartAddress') || '0', 16) || 0,
            size: parseInt(textOf(node, 'Size') || '0', 16) || 0,
          };
        };
        if (!result.irom.size) result.irom = readMem('IROM');
        if (!result.iram.size) result.iram = readMem('IRAM');
      }
    }
    return result;
  }

  // ---------------------------------------------------------------------
  // Project items
  // ---------------------------------------------------------------------

  addGroup(targetName, groupName) {
    const target = this.getTarget(targetName);
    if (!target) throw new Error(`Target not found: ${targetName}`);
    const name = String(groupName || '').trim();
    if (!name) throw new Error('分组名不能为空');
    if (target.groups.some((g) => g.name === name)) throw new Error(`分组已存在：${name}`);
    let groupsNode = child(target.element, 'Groups');
    if (!groupsNode) {
      groupsNode = this.projDoc.createElement('Groups');
      target.element.appendChild(groupsNode);
    }
    const groupNode = this.projDoc.createElement('Group');
    groupsNode.appendChild(groupNode);
    setText(groupNode, 'GroupName', name);
    ensureChild(groupNode, 'Files');
    this._refreshTargets();
    return name;
  }

  removeGroup(targetName, groupName) {
    const target = this.getTarget(targetName);
    if (!target) throw new Error(`Target not found: ${targetName}`);
    const group = target.groups.find((g) => g.name === groupName);
    if (!group) return false;
    removeNode(group.node);
    if (this.optDoc) {
      for (const optGroup of children(this.optDoc.documentElement, 'Group')) {
        if ((textOf(optGroup, 'GroupName') || '').trim() === groupName) {
          removeNode(optGroup);
          break;
        }
      }
    }
    this._refreshTargets();
    return true;
  }

  moveGroup(targetName, groupName, direction) {
    const target = this.getTarget(targetName);
    if (!target) throw new Error(`Target not found: ${targetName}`);
    const index = target.groups.findIndex((g) => g.name === groupName);
    if (index < 0) return false;
    const groupsNode = target.groups[index].node.parentNode;
    const list = children(groupsNode, 'Group');
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= list.length) return false;
    const node = list[index];
    const ref = list[newIndex];
    if (direction === 'up') {
      groupsNode.insertBefore(node, ref);
    } else {
      groupsNode.insertBefore(ref, node);
    }
    this._refreshTargets();
    return true;
  }

  addFiles(targetName, groupName, absPaths) {
    const target = this.getTarget(targetName);
    if (!target) throw new Error(`Target not found: ${targetName}`);
    const group = target.groups.find((g) => g.name === groupName);
    if (!group) throw new Error(`分组不存在：${groupName}`);
    const filesNode = ensureChild(group.node, 'Files');
    const added = [];
    for (const absPath of absPaths || []) {
      const abs = path.resolve(absPath);
      const fileName = path.basename(abs);
      const rel = this.relativeFilePath(abs);
      if (group.files.some((f) => normalizeSlashes(f.path).toLowerCase() === rel.toLowerCase())) continue;
      const fileNode = this.projDoc.createElement('File');
      filesNode.appendChild(fileNode);
      setText(fileNode, 'FileName', fileName);
      setText(fileNode, 'FileType', fileTypeFor(fileName));
      setText(fileNode, 'FilePath', rel);
      added.push(fileName);
    }
    this._refreshTargets();
    return added;
  }

  removeFile(targetName, groupName, fileName) {
    const target = this.getTarget(targetName);
    if (!target) throw new Error(`Target not found: ${targetName}`);
    const group = target.groups.find((g) => g.name === groupName);
    if (!group) return false;
    const file = group.files.find((f) => f.name === fileName);
    if (!file) return false;
    removeNode(file.node);
    this._refreshTargets();
    return true;
  }

  moveFile(targetName, groupName, fileName, direction) {
    const target = this.getTarget(targetName);
    if (!target) throw new Error(`Target not found: ${targetName}`);
    const group = target.groups.find((g) => g.name === groupName);
    if (!group) return false;
    const index = group.files.findIndex((f) => f.name === fileName);
    if (index < 0) return false;
    const filesNode = group.files[index].node.parentNode;
    const list = children(filesNode, 'File');
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= list.length) return false;
    const node = list[index];
    const ref = list[newIndex];
    if (direction === 'up') filesNode.insertBefore(node, ref);
    else filesNode.insertBefore(ref, node);
    this._refreshTargets();
    return true;
  }

  addTarget(name, duplicateFrom) {
    const newName = String(name || '').trim();
    if (!newName) throw new Error('目标名不能为空');
    if (this._targets.some((t) => t.name === newName)) throw new Error(`目标已存在：${newName}`);
    const source = this.getTarget(duplicateFrom) || this._targets[0];
    if (!source) throw new Error('当前没有可复制的目标');
    const targetsNode = child(this.projDoc.documentElement, 'Targets');
    const clone = source.element.cloneNode(true);
    setText(clone, 'TargetName', newName);
    targetsNode.appendChild(clone);

    this.ensureOptDoc();
    const sourceOpt = source.optElement || this._findOptTarget(source.name);
    if (sourceOpt) {
      const optClone = sourceOpt.cloneNode(true);
      setText(optClone, 'TargetName', newName);
      const to = ensureChild(optClone, 'TargetOption');
      const optfl = ensureChild(to, 'OPTFL');
      setText(optfl, 'IsCurrentTarget', '0');
      this.optDoc.documentElement.appendChild(optClone);
    }
    this._refreshTargets();
    return newName;
  }

  removeTarget(name) {
    if (this._targets.length <= 1) throw new Error('至少保留一个目标');
    const target = this.getTarget(name);
    if (!target) return false;
    const wasCurrent = this.currentTargetName === name;
    removeNode(target.element);
    if (this.optDoc) {
      const optTarget = this._findOptTarget(name);
      if (optTarget) removeNode(optTarget);
    }
    this._refreshTargets();
    const remaining = this._targets[0];
    if (wasCurrent && remaining) {
      this.setCurrentTarget(remaining.name);
    }
    return true;
  }

  moveTarget(name, direction) {
    const targetsNode = child(this.projDoc.documentElement, 'Targets');
    if (!targetsNode) return false;
    const list = children(targetsNode, 'Target');
    const index = list.findIndex((n) => readTargetName(n) === name);
    if (index < 0) return false;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= list.length) return false;
    const node = list[index];
    const ref = list[newIndex];
    if (direction === 'up') targetsNode.insertBefore(node, ref);
    else targetsNode.insertBefore(ref, node);
    this._refreshTargets();
    return true;
  }

  _refreshTargets() {
    this._targets = this._readTargets();
    this.currentTargetName = this._readCurrentTarget();
  }

  // ---------------------------------------------------------------------
  // Persist
  // ---------------------------------------------------------------------

  async saveProject() {
    const text = await writeXmlFile(this.projPath, this.projDoc);
    this.projText = text;
    this._refreshTargets();
  }

  async saveOptions() {
    this.ensureOptDoc();
    const text = await writeXmlFile(this.optPath, this.optDoc);
    this.optText = text;
    this._refreshTargets();
  }

  async saveAll() {
    await this.saveProject();
    await this.saveOptions();
    this._refreshTargets();
  }
}

function escapeXml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { KeilProject, fileTypeFor, escapeXml };
