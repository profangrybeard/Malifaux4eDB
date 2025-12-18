#!/usr/bin/env node
/**
 * generate-version.js
 * 
 * Run this before each build to generate version info.
 * Creates src/version.json with version number and build metadata.
 * 
 * Usage: node scripts/generate-version.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read version from package.json
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
);

// Get git info (gracefully handle missing git)
let gitHash = 'local';
let gitBranch = 'local';
try {
  gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
} catch (e) {
  console.warn('Could not get git info, using defaults');
}

// Build timestamp
const buildDate = new Date().toISOString();
const buildDateShort = new Date().toLocaleDateString('en-US', { 
  month: 'short', 
  day: 'numeric',
  year: 'numeric'
});

// Generate version info
const versionInfo = {
  version: packageJson.version,
  build: gitHash,
  branch: gitBranch,
  buildDate: buildDate,
  buildDateShort: buildDateShort,
  // Combined display string
  display: `v${packageJson.version}`,
  displayFull: `v${packageJson.version} (${gitHash})`
};

// Write to src/version.json
const outputPath = path.join(__dirname, '..', 'src', 'version.json');
fs.writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2));

console.log(`✓ Version info generated: ${versionInfo.displayFull}`);
console.log(`  Written to: ${outputPath}`);
