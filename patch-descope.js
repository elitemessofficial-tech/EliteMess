const fs = require('fs');
const path = require('path');

console.log('--- Starting Descope React Native SDK Patch ---');

const sdkDir = path.join('node_modules', '@descope', 'react-native-sdk');
if (fs.existsSync(sdkDir)) {
  const libDir = path.join(sdkDir, 'lib');
  if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir);
  }
  fs.copyFileSync(
    path.join(sdkDir, 'package.json'),
    path.join(libDir, 'package.json')
  );
  console.log('1. Successfully copied package.json to lib/ package.json');
} else {
  console.log('Descope SDK not installed yet, skipping patch.');
  process.exit(0);
}

const modulePath = path.join(sdkDir, 'lib', 'module', 'components', 'FlowView.js');
if (fs.existsSync(modulePath)) {
  let content = fs.readFileSync(modulePath, 'utf8');
  const target = "const DescopeFlowView = requireNativeComponent('DescopeFlowView');";
  const replacement = "const DescopeFlowView = typeof requireNativeComponent === 'function' ? requireNativeComponent('DescopeFlowView') : () => null;";
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(modulePath, content, 'utf8');
    console.log('2. Successfully patched FlowView.js in lib/module');
  } else {
    console.log('2. FlowView.js in lib/module already patched or target string not found');
  }
}

const commonjsPath = path.join(sdkDir, 'lib', 'commonjs', 'components', 'FlowView.js');
if (fs.existsSync(commonjsPath)) {
  let content = fs.readFileSync(commonjsPath, 'utf8');
  const target = "const DescopeFlowView = (0, _reactNative.requireNativeComponent)('DescopeFlowView');";
  const replacement = "const DescopeFlowView = typeof _reactNative.requireNativeComponent === 'function' ? (0, _reactNative.requireNativeComponent)('DescopeFlowView') : () => null;";
  if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(commonjsPath, content, 'utf8');
    console.log('3. Successfully patched FlowView.js in lib/commonjs');
  } else {
    console.log('3. FlowView.js in lib/commonjs already patched or target string not found');
  }
}

// 4. Patch descopeModule.js in lib/module to fallback to web storage on web platforms
const esModulePath = path.join(sdkDir, 'lib', 'module', 'internal', 'modules', 'descopeModule.js');
if (fs.existsSync(esModulePath)) {
  let content = fs.readFileSync(esModulePath, 'utf8');
  if (!content.includes('localStorage')) {
    const replacement = `import { NativeModules } from 'react-native';
const { DescopeReactNative } = NativeModules;
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
export default DescopeReactNative || fallback;`;
    fs.writeFileSync(esModulePath, replacement, 'utf8');
    console.log('4. Successfully patched descopeModule.js in lib/module');
  } else {
    console.log('4. descopeModule.js in lib/module already patched');
  }
}

// 5. Patch descopeModule.js in lib/commonjs to fallback to web storage on web platforms
const cjsModulePath = path.join(sdkDir, 'lib', 'commonjs', 'internal', 'modules', 'descopeModule.js');
if (fs.existsSync(cjsModulePath)) {
  let content = fs.readFileSync(cjsModulePath, 'utf8');
  if (!content.includes('localStorage')) {
    const replacement = `"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = void 0;
var _reactNative = require("react-native");
const { DescopeReactNative } = _reactNative.NativeModules;
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
var _default = exports.default = DescopeReactNative || fallback;`;
    fs.writeFileSync(cjsModulePath, replacement, 'utf8');
    console.log('5. Successfully patched descopeModule.js in lib/commonjs');
  } else {
    console.log('5. descopeModule.js in lib/commonjs already patched');
  }
}

console.log('--- Descope React Native SDK Patch Completed ---');
