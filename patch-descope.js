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

console.log('--- Descope React Native SDK Patch Completed ---');
