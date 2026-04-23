const fs = require('fs');
const path = require('path');

// Find the consuming project's node_modules
// This script runs from node_modules/@beatsphere/expo-spotify-remote/scripts/
const packageRoot = path.resolve(__dirname, '..');
const projectRoot = findProjectRoot(packageRoot);

if (!projectRoot) {
  console.log('[expo-spotify-remote] Could not find project root, skipping postinstall.');
  process.exit(0);
}

const sdkAndroidDir = path.join(
  projectRoot,
  'node_modules',
  '@42techpacks',
  'expo-spotify-sdk',
  'android'
);

// Step 1: Copy AAR to SDK's android/libs/
const aarSource = path.join(packageRoot, 'libs', 'spotify-app-remote-release-0.8.0.aar');
const aarDestDir = path.join(sdkAndroidDir, 'libs');
const aarDest = path.join(aarDestDir, 'spotify-app-remote-release-0.8.0.aar');

if (!fs.existsSync(aarSource)) {
  console.log('[expo-spotify-remote] AAR source not found, skipping.');
  process.exit(0);
}

if (!fs.existsSync(sdkAndroidDir)) {
  console.log('[expo-spotify-remote] @42techpacks/expo-spotify-sdk not installed, skipping AAR copy.');
  console.log('  Install it first: npm install @42techpacks/expo-spotify-sdk');
  process.exit(0);
}

if (!fs.existsSync(aarDestDir)) {
  fs.mkdirSync(aarDestDir, { recursive: true });
}

console.log('[expo-spotify-remote] Copying Spotify App Remote AAR...');
fs.copyFileSync(aarSource, aarDest);
console.log('[expo-spotify-remote] AAR copied successfully.');

// Step 2: Check if patch-package is available and remind about the patch
const patchFile = path.join(packageRoot, 'patches', '@42techpacks+expo-spotify-sdk+0.5.6.patch');
const projectPatchDir = path.join(projectRoot, 'patches');
const projectPatchFile = path.join(projectPatchDir, '@42techpacks+expo-spotify-sdk+0.5.6.patch');

if (fs.existsSync(patchFile) && !fs.existsSync(projectPatchFile)) {
  console.log('');
  console.log('[expo-spotify-remote] IMPORTANT: Android App Remote requires a patch.');
  console.log('  To enable Android App Remote support:');
  console.log('');
  console.log('  1. Install patch-package:');
  console.log('     npm install patch-package --save-dev');
  console.log('');
  console.log('  2. Copy the patch to your project:');
  console.log(`     cp "${patchFile}" "${projectPatchDir}/"`);
  console.log('');
  console.log('  3. Add to your package.json postinstall:');
  console.log('     "postinstall": "patch-package"');
  console.log('');
  console.log('  4. Run: npx patch-package');
  console.log('');
}

function findProjectRoot(startDir) {
  let dir = startDir;
  // Walk up until we find a package.json that isn't ours
  for (let i = 0; i < 10; i++) {
    dir = path.dirname(dir);
    const pkg = path.join(dir, 'package.json');
    if (fs.existsSync(pkg)) {
      try {
        const data = JSON.parse(fs.readFileSync(pkg, 'utf8'));
        if (data.name !== '@beatsphere/expo-spotify-remote') {
          return dir;
        }
      } catch {}
    }
  }
  return null;
}
