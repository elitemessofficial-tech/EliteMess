const fs = require('fs');
const path = require('path');

console.log('--- Starting Comprehensive Descope React Native SDK Patch ---');

const sdkDir = path.join('node_modules', '@descope', 'react-native-sdk');
if (!fs.existsSync(sdkDir)) {
  console.log('Descope SDK not installed yet, skipping patch.');
  process.exit(0);
}

// 1. Ensure lib/ package.json
const libDir = path.join(sdkDir, 'lib');
if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir, { recursive: true });
}
fs.copyFileSync(
  path.join(sdkDir, 'package.json'),
  path.join(libDir, 'package.json')
);
console.log('1. Copied package.json to lib/ package.json');

// Helper function to safely write content
function patchFile(filePath, targetPattern, replacement) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(targetPattern)) {
      content = content.replace(targetPattern, replacement);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Patched: ${filePath}`);
    } else {
      console.log(`- Already patched or target not found: ${filePath}`);
    }
  }
}

// 2. Patch FlowView in src, lib/module, lib/commonjs
patchFile(
  path.join(sdkDir, 'src', 'components', 'FlowView.tsx'),
  "const DescopeFlowView = requireNativeComponent('DescopeFlowView') as HostComponent<DescopeFlowView>",
  "const DescopeFlowView = typeof requireNativeComponent === 'function' ? (requireNativeComponent('DescopeFlowView') as HostComponent<DescopeFlowView>) : (() => null) as any"
);

patchFile(
  path.join(sdkDir, 'lib', 'module', 'components', 'FlowView.js'),
  "const DescopeFlowView = requireNativeComponent('DescopeFlowView');",
  "const DescopeFlowView = typeof requireNativeComponent === 'function' ? requireNativeComponent('DescopeFlowView') : () => null;"
);

patchFile(
  path.join(sdkDir, 'lib', 'commonjs', 'components', 'FlowView.js'),
  "const DescopeFlowView = (0, _reactNative.requireNativeComponent)('DescopeFlowView');",
  "const DescopeFlowView = typeof _reactNative.requireNativeComponent === 'function' ? (0, _reactNative.requireNativeComponent)('DescopeFlowView') : () => null;"
);

// 3. Patch descopeModule.ts in src/internal/modules/
const srcDescopeModulePath = path.join(sdkDir, 'src', 'internal', 'modules', 'descopeModule.ts');
if (fs.existsSync(srcDescopeModulePath)) {
  const tsContent = `import { NativeModules } from 'react-native'

type PrepFlowResponse = {
  codeChallenge: string
  codeVerifier: string
}

const { DescopeReactNative } = NativeModules || {}
interface DescopeNative {
  prepFlow(): Promise<PrepFlowResponse>
  startFlow(flowUrl: string, deepLinkUrl: string, backupCustomScheme: string, codeChallenge: string): Promise<string>
  resumeFlow(flowUrl: string, incomingUrl: string): Promise<void>
  loadItem(key: string): Promise<string>
  saveItem(key: string, value: string): Promise<string>
  removeItem(key: string): Promise<string>
  configureLogging(level: string, unsafe: boolean): Promise<void>
}

const fallback: DescopeNative = {
  loadItem: async (projectId: string) => {
    try { return localStorage.getItem(\`descope_\${projectId}\`) || ''; } catch (e) { return ''; }
  },
  saveItem: async (projectId: string, value: string) => {
    try { localStorage.setItem(\`descope_\${projectId}\`, value); return ''; } catch (e) { return ''; }
  },
  removeItem: async (projectId: string) => {
    try { localStorage.removeItem(\`descope_\${projectId}\`); return ''; } catch (e) { return ''; }
  },
  prepFlow: async () => ({ codeChallenge: '', codeVerifier: '' }),
  startFlow: async () => '',
  resumeFlow: async () => {},
  configureLogging: async () => {}
}

const descopeExport = (DescopeReactNative && typeof DescopeReactNative.loadItem === 'function') ? DescopeReactNative : fallback

export default descopeExport as DescopeNative
`;
  fs.writeFileSync(srcDescopeModulePath, tsContent, 'utf8');
  console.log(`✓ Patched: ${srcDescopeModulePath}`);
}

// 4. Patch descopeModule.js in lib/module/internal/modules/
const esModulePath = path.join(sdkDir, 'lib', 'module', 'internal', 'modules', 'descopeModule.js');
if (fs.existsSync(esModulePath)) {
  const esContent = `import { NativeModules } from 'react-native';
const { DescopeReactNative } = NativeModules || {};
const fallback = {
  loadItem: async (projectId) => {
    try { return localStorage.getItem(\`descope_\${projectId}\`) || ''; } catch (e) { return ''; }
  },
  saveItem: async (projectId, value) => {
    try { localStorage.setItem(\`descope_\${projectId}\`, value); } catch (e) {}
  },
  removeItem: async (projectId) => {
    try { localStorage.removeItem(\`descope_\${projectId}\`); } catch (e) {}
  },
  prepFlow: async () => ({}),
  startFlow: async () => '',
  resumeFlow: async () => {}
};
export default (DescopeReactNative && typeof DescopeReactNative.loadItem === 'function') ? DescopeReactNative : fallback;`;
  fs.writeFileSync(esModulePath, esContent, 'utf8');
  console.log(`✓ Patched: ${esModulePath}`);
}

// 5. Patch descopeModule.js in lib/commonjs/internal/modules/
const cjsModulePath = path.join(sdkDir, 'lib', 'commonjs', 'internal', 'modules', 'descopeModule.js');
if (fs.existsSync(cjsModulePath)) {
  const cjsContent = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = void 0;
var _reactNative = require("react-native");
const { DescopeReactNative } = _reactNative.NativeModules || {};
const fallback = {
  loadItem: async (projectId) => {
    try { return localStorage.getItem(\`descope_\${projectId}\`) || ''; } catch (e) { return ''; }
  },
  saveItem: async (projectId, value) => {
    try { localStorage.setItem(\`descope_\${projectId}\`, value); } catch (e) {}
  },
  removeItem: async (projectId) => {
    try { localStorage.removeItem(\`descope_\${projectId}\`); } catch (e) {}
  },
  prepFlow: async () => ({}),
  startFlow: async () => '',
  resumeFlow: async () => {}
};
const descopeExport = (DescopeReactNative && typeof DescopeReactNative.loadItem === 'function') ? DescopeReactNative : fallback;
var _default = exports.default = descopeExport;`;
  fs.writeFileSync(cjsModulePath, cjsContent, 'utf8');
  console.log(`✓ Patched: ${cjsModulePath}`);
}

// 6. Patch descopeModule.web.js in both lib/module and lib/commonjs
const esWebModulePath = path.join(sdkDir, 'lib', 'module', 'internal', 'modules', 'descopeModule.web.js');
if (fs.existsSync(esWebModulePath)) {
  const webContent = `const DescopeReactNativeWeb = {
  loadItem: async (projectId) => {
    try { return localStorage.getItem(\`descope_\${projectId}\`) || ''; } catch (e) { return ''; }
  },
  saveItem: async (projectId, value) => {
    try { localStorage.setItem(\`descope_\${projectId}\`, value); } catch (e) {}
  },
  removeItem: async (projectId) => {
    try { localStorage.removeItem(\`descope_\${projectId}\`); } catch (e) {}
  },
  prepFlow: async () => ({}),
  startFlow: async () => '',
  resumeFlow: async () => {}
};
export default DescopeReactNativeWeb;`;
  fs.writeFileSync(esWebModulePath, webContent, 'utf8');
  console.log(`✓ Patched: ${esWebModulePath}`);
}

const cjsWebModulePath = path.join(sdkDir, 'lib', 'commonjs', 'internal', 'modules', 'descopeModule.web.js');
if (fs.existsSync(cjsWebModulePath)) {
  const cjsWebContent = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = void 0;
const DescopeReactNativeWeb = {
  loadItem: async function (projectId) {
    try { return localStorage.getItem("descope_" + projectId) || ""; } catch (e) { return ""; }
  },
  saveItem: async function (projectId, value) {
    try { localStorage.setItem("descope_" + projectId, value); } catch (e) {}
  },
  removeItem: async function (projectId) {
    try { localStorage.removeItem("descope_" + projectId); } catch (e) {}
  },
  prepFlow: async function () { return {}; },
  startFlow: async function () { return ""; },
  resumeFlow: async function () { return undefined; }
};
var _default = DescopeReactNativeWeb;
exports.default = _default;`;
  fs.writeFileSync(cjsWebModulePath, cjsWebContent, 'utf8');
  console.log(`✓ Patched: ${cjsWebModulePath}`);
}

console.log('--- Comprehensive Descope React Native SDK Patch Completed ---');
