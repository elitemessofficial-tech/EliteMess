const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dir = path.join(__dirname, '..', 'assets', 'images');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.lottie'));

console.log('Processing .lottie files in:', dir);

files.forEach(file => {
  const fullPath = path.join(dir, file);
  const baseName = path.basename(file, '.lottie');
  const tempZip = path.join(dir, `${baseName}_temp.zip`);
  const tempExtractDir = path.join(dir, `temp_${baseName.replace(/\s+/g, '_')}`);

  try {
    fs.copyFileSync(fullPath, tempZip);
    if (fs.existsSync(tempExtractDir)) {
      fs.rmSync(tempExtractDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempExtractDir, { recursive: true });

    // Use tar or powershell
    try {
      execSync(`tar -xf "${tempZip}" -C "${tempExtractDir}"`);
    } catch (tarErr) {
      execSync(`powershell -Command "Expand-Archive -Path '${tempZip}' -DestinationPath '${tempExtractDir}' -Force"`);
    }

    // Find animation json
    function findJsonFiles(searchDir) {
      let results = [];
      const list = fs.readdirSync(searchDir);
      for (const item of list) {
        const itemPath = path.join(searchDir, item);
        const stat = fs.statSync(itemPath);
        if (stat.isDirectory()) {
          results = results.concat(findJsonFiles(itemPath));
        } else if (item.endsWith('.json') && item !== 'manifest.json') {
          results.push(itemPath);
        }
      }
      return results;
    }

    const jsons = findJsonFiles(tempExtractDir);
    if (jsons.length > 0) {
      const destJson = path.join(dir, `${baseName}.json`);
      fs.copyFileSync(jsons[0], destJson);
      console.log(`[SUCCESS] Extracted ${file} -> ${baseName}.json (${(fs.statSync(destJson).size / 1024).toFixed(1)} KB)`);
    } else {
      console.warn(`[WARN] No animation json found inside ${file}`);
    }

    // Clean up
    if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip);
    if (fs.existsSync(tempExtractDir)) fs.rmSync(tempExtractDir, { recursive: true, force: true });
  } catch (err) {
    console.error(`[ERROR] Failed to extract ${file}:`, err.message);
    if (fs.existsSync(tempZip)) try { fs.unlinkSync(tempZip); } catch (e) {}
    if (fs.existsSync(tempExtractDir)) try { fs.rmSync(tempExtractDir, { recursive: true, force: true }); } catch (e) {}
  }
});

console.log('All dotLottie files converted to native JSON!');
