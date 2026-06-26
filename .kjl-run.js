#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const configPath = path.join(__dirname, '.kjlconfig.json');
const skillDir = '/Users/cjf/.cursor/skills/ai-kujiale-design';
const token = JSON.parse(fs.readFileSync(configPath, 'utf8')).access_token;
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node .kjl-run.js <script.js> [--other args]');
  process.exit(1);
}

const script = args[0];
const rest = args.slice(1);
const fullArgs = [path.join(skillDir, script), '--token', token, ...rest];

const r = spawnSync('node', fullArgs, { cwd: skillDir, encoding: 'utf8' });
if (r.stdout) process.stdout.write(r.stdout);
if (r.stderr) process.stderr.write(r.stderr);
process.exit(r.status ?? 1);
