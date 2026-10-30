import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { after } from 'node:test';

export const cliRoot = fileURLToPath(new URL('../', import.meta.url));
export const entry = path.join(cliRoot, 'dist', 'index.js');
export const identity = { next: () => crypto.randomUUID(), now: () => new Date().toISOString() };
const temporaryPaths = [];
after(() => {
  for (const dir of temporaryPaths.reverse()) fs.rmSync(dir, { recursive: true, force: true });
});
export function temporary(_t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ares-test-'));
  temporaryPaths.push(dir);
  return dir;
}
export function write(root, name, content) {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return file;
}
export function cleanEnv(home, overrides = {}) {
  const env = { ...process.env };
  for (const name of Object.keys(env))
    if (/^(?:ARES_|OPENROUTER_API_KEY$|GEMINI_API_KEY$|COMPATIBLE_API_KEY$)/.test(name))
      delete env[name];
  return { ...env, ARES_HOME: home, NO_COLOR: '1', ...overrides };
}
export function run(args, home, { cwd = home, env = {}, input } = {}) {
  fs.mkdirSync(home, { recursive: true });
  return spawnSync(process.execPath, [entry, ...args], {
    cwd,
    env: cleanEnv(home, env),
    input,
    encoding: 'utf8',
    timeout: 20_000,
  });
}
export function runAsync(args, home, { cwd = home, env = {}, input } = {}) {
  fs.mkdirSync(home, { recursive: true });
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [entry, ...args], {
      cwd,
      env: cleanEnv(home, env),
      stdio: 'pipe',
    });
    let stdout = '',
      stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('CLI timeout'));
    }, 20_000);
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (status) => {
      clearTimeout(timer);
      resolve({ status, stdout, stderr });
    });
    child.stdin.end(input);
  });
}
