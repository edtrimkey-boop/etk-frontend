/**
 * Automatic Version Synchronizer — ED TRIMKEY OS
 * Base: V2.9.2 established at commit 0626107
 * Calculates current production version from Git commit depth.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getCommitCount() {
  try {
    const stdout = execSync('git rev-list --count HEAD', { cwd: __dirname }).toString().trim();
    const count = parseInt(stdout, 10);
    return isNaN(count) ? 18 : count;
  } catch (e) {
    return 18;
  }
}

function syncVersion() {
  const commitCount = getCommitCount();
  // Base commit 1 was V2.9.2. Each subsequent commit increments patch by 1.
  // Next commit being pushed will be commitCount + 1 (i.e. 18 + 1 = 19 -> patch 2 + 18 = 20)
  const patch = 2 + (commitCount - 1) + 1; // Anticipating the upcoming commit push
  const versionRaw = `2.9.${patch}`;
  const versionString = `Version V${versionRaw} (ED TRIMKEY OS)`;

  console.log(`[Version Engine] Commit count: ${commitCount} | Next Version: ${versionString}`);

  // 1. Update lib/version.ts
  const versionFilePath = path.join(__dirname, '..', 'lib', 'version.ts');
  const fileContent = `/**
 * Dynamic System Version Registry — ED TRIMKEY OS
 * Automatically computed and synchronized per commit push.
 * Initial Baseline: V2.9.2 (Commit 1: 0626107)
 */

export const SYSTEM_VERSION_RAW = '${versionRaw}';
export const SYSTEM_VERSION = 'V${versionRaw}';
export const OS_LABEL = 'ED TRIMKEY OS';
export const SYSTEM_VERSION_STRING = '${versionString}';

export default SYSTEM_VERSION_STRING;
`;

  fs.writeFileSync(versionFilePath, fileContent, 'utf8');
  console.log(`[Version Engine] Updated ${versionFilePath}`);

  // 2. Update package.json version
  const pkgPath = path.join(__dirname, '..', 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.version = versionRaw;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log(`[Version Engine] Updated package.json to ${versionRaw}`);
  }
}

syncVersion();
