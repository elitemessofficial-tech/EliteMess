
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
const jsonPath = path.join(__dirname, '../src/config/env_bypass.json');

// Ensure parent directories exist
const dir = path.dirname(jsonPath);
if (!fs.existsSync(dir)){
  fs.mkdirSync(dir, { recursive: true });
}

function syncEnv() {
  try {
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, 'utf8');
    
    const ownerMatch = content.match(/EXPO_PUBLIC_OWNER_NUMBERS=(.*)/);
    const vipMatch = content.match(/EXPO_PUBLIC_VIP_NUMBER=(.*)/);
    
    const ownerNumbers = ownerMatch ? ownerMatch[1].trim() : '8390279723,9999999999';
    const vipNumber = vipMatch ? vipMatch[1].trim() : '7777777777';
    
    const config = {
      EXPO_PUBLIC_OWNER_NUMBERS: ownerNumbers,
      EXPO_PUBLIC_VIP_NUMBER: vipNumber
    };
    
    fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2), 'utf8');
    console.log(`[Watcher] Synced .env.local changes to env_bypass.json`);
  } catch (e) {
    console.error('[Watcher] Failed to sync:', e.message);
  }
}

// Initial sync
syncEnv();

console.log(`Watching for changes in: ${envPath}`);

// Watch for changes
fs.watch(envPath, (eventType) => {
  if (eventType === 'change') {
    syncEnv();
  }
});
