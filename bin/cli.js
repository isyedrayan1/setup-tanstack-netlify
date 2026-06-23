#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TARGET_DIR = process.cwd();

console.log('🚀 Starting setup-tanstack-netlify...');

// 1. Detect Package Manager
function detectPackageManager() {
  if (fs.existsSync(path.join(TARGET_DIR, 'bun.lockb'))) return 'bun';
  if (fs.existsSync(path.join(TARGET_DIR, 'package-lock.json'))) return 'npm';
  if (fs.existsSync(path.join(TARGET_DIR, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(TARGET_DIR, 'yarn.lock'))) return 'yarn';
  return 'npm'; // Default fallback
}

const pm = detectPackageManager();
console.log(`📦 Detected package manager: ${pm}`);

// 2. Install Dev Dependencies
console.log('📥 Installing cheerio as devDependency...');
let installCmd = '';
switch (pm) {
  case 'bun':
    installCmd = 'bun add cheerio -d';
    break;
  case 'pnpm':
    installCmd = 'pnpm add -D cheerio';
    break;
  case 'yarn':
    installCmd = 'yarn add cheerio --dev';
    break;
  default:
    installCmd = 'npm install cheerio --save-dev';
}

try {
  execSync(installCmd, { stdio: 'inherit', cwd: TARGET_DIR });
} catch (error) {
  console.error(`❌ Failed to install cheerio: ${error.message}`);
}

// 3. Generate netlify.toml
console.log('📝 Generating netlify.toml...');
const buildCmd = pm === 'yarn' ? 'yarn build' : `${pm} run build`;
const netlifyTomlContent = `[build]
  command = "${buildCmd}"
  publish = "dist"
  functions = ".netlify/functions-internal"

[build.environment]
  NITRO_PRESET = "netlify"
  NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/.netlify/functions/server"
  status = 200
  force = false
`;

fs.writeFileSync(path.join(TARGET_DIR, 'netlify.toml'), netlifyTomlContent, 'utf8');
console.log('✅ Generated netlify.toml');

// 4. Update vite.config.ts
console.log('🔧 Updating vite.config.ts...');
const viteConfigPath = path.join(TARGET_DIR, 'vite.config.ts');
if (fs.existsSync(viteConfigPath)) {
  let content = fs.readFileSync(viteConfigPath, 'utf8');
  
  // Strip custom Cloudflare-shaped server entry option
  // e.g. server: { entry: "server" } under tanstackStart
  const initialContent = content;
  content = content.replace(/entry:\s*['"]server['"],?\s*/g, '');
  content = content.replace(/server:\s*\{\s*\},?\s*/g, '');
  
  if (content !== initialContent) {
    fs.writeFileSync(viteConfigPath, content, 'utf8');
    console.log('✅ Updated vite.config.ts (stripped custom server entry)');
  } else {
    console.log('ℹ️ vite.config.ts did not contain custom server entry, left unmodified');
  }
} else {
  console.warn('⚠️ vite.config.ts not found. Skipping entry point updates.');
}

// 5. Create & Setup Postinstall Dependency Patches
console.log('🩹 Creating postinstall dependency patches...');
const scriptsDir = path.join(TARGET_DIR, 'scripts');
if (!fs.existsSync(scriptsDir)) {
  fs.mkdirSync(scriptsDir, { recursive: true });
}

const patchScriptContent = `import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();

// 1. Fix escapeRegExp import in @tanstack/start-plugin-core import-protection-plugin
const importPluginPath = path.join(
  projectRoot,
  'node_modules/@tanstack/start-plugin-core/dist/esm/vite/import-protection-plugin/plugin.js'
);

if (fs.existsSync(importPluginPath)) {
  let content = fs.readFileSync(importPluginPath, 'utf8');
  
  // Only patch if we haven't already
  if (content.includes('import { resolveViteId } from "../../utils.js";') && content.includes('escapeRegExp,')) {
    // Move escapeRegExp to the main utils.js import
    content = content.replace(
      'import { resolveViteId } from "../../utils.js";',
      'import { resolveViteId, escapeRegExp } from "../../utils.js";'
    );
    // Remove escapeRegExp from the import-protection/utils.js import
    content = content.replace(
      'escapeRegExp, ',
      ''
    );
    
    fs.writeFileSync(importPluginPath, content, 'utf8');
    console.log('✅ Patched start-plugin-core: fixed escapeRegExp import path');
  }
}

// 2. Add fallback for injectedHeadScripts in dev-server-plugin
const devServerPluginPath = path.join(
  projectRoot,
  'node_modules/@tanstack/start-plugin-core/dist/esm/vite/dev-server-plugin/plugin.js'
);

if (fs.existsSync(devServerPluginPath)) {
  let content = fs.readFileSync(devServerPluginPath, 'utf8');
  if (
    content.includes('VIRTUAL_MODULES.injectedHeadScripts') &&
    !content.includes('VIRTUAL_MODULES.injectedHeadScripts ??')
  ) {
    content = content.replace(
      'VIRTUAL_MODULES.injectedHeadScripts',
      'VIRTUAL_MODULES.injectedHeadScripts ?? "tanstack-start-injected-head-scripts"'
    );
    fs.writeFileSync(devServerPluginPath, content, 'utf8');
    console.log('✅ Patched start-plugin-core: added injectedHeadScripts fallback');
  }
}
`;

const patchScriptPath = path.join(scriptsDir, 'patch-tanstack.js');
fs.writeFileSync(patchScriptPath, patchScriptContent, 'utf8');
console.log('✅ Created scripts/patch-tanstack.js');

// Modify package.json to register postinstall script
const packageJsonPath = path.join(TARGET_DIR, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  pkg.scripts = pkg.scripts || {};
  
  if (pkg.scripts.postinstall !== 'node scripts/patch-tanstack.js') {
    pkg.scripts.postinstall = 'node scripts/patch-tanstack.js';
    fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log('✅ Registered "postinstall": "node scripts/patch-tanstack.js" in package.json');
  } else {
    console.log('ℹ️ postinstall script already registered in package.json');
  }
} else {
  console.error('❌ package.json not found in the target directory!');
}

// Execute the patch script immediately
console.log('⚡ Executing patch script immediately...');
try {
  execSync('node scripts/patch-tanstack.js', { stdio: 'inherit', cwd: TARGET_DIR });
} catch (error) {
  console.error(`❌ Failed to run patch script: ${error.message}`);
}

// 6. Update .gitignore
console.log('🙈 Updating .gitignore...');
const gitignorePath = path.join(TARGET_DIR, '.gitignore');
let gitignoreContent = '';
if (fs.existsSync(gitignorePath)) {
  gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
}

if (!gitignoreContent.includes('.netlify/')) {
  // Ensure we append with a newline
  const prefix = gitignoreContent.endsWith('\n') || gitignoreContent === '' ? '' : '\n';
  fs.appendFileSync(gitignorePath, `${prefix}.netlify/\n`, 'utf8');
  console.log('✅ Appended .netlify/ to .gitignore');
} else {
  console.log('ℹ️ .netlify/ already ignored in .gitignore');
}

console.log('🎉 setup-tanstack-netlify finished successfully!');
