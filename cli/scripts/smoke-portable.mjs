import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import JSZip from 'jszip';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifacts = path.resolve(root, '../.artifacts');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const archive = path.join(artifacts, `ARES-${version}-portable.zip`);
const directory = fs.mkdtempSync(path.join(artifacts, 'portable smoke with spaces-'));
if (path.dirname(directory) !== artifacts) throw new Error('Destino de verificación inválido.');
try {
  const zip = await JSZip.loadAsync(fs.readFileSync(archive));
  for (const [name, entry] of Object.entries(zip.files)) {
    if (
      !name.startsWith('ARES/') ||
      name.includes('\\') ||
      name.includes(':') ||
      name.split('/').includes('..')
    )
      throw new Error('Ruta de paquete inválida.');
    if (entry.dir) continue;
    const file = path.join(directory, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, await entry.async('nodebuffer'));
  }
  const runtime = path.join(directory, 'ARES');
  const entry = path.join(runtime, 'dist/index.js');
  const env = { ...process.env, ARES_HOME: path.join(directory, 'private-data') };
  const run = (args) => {
    const result = spawnSync(process.execPath, [entry, ...args], {
      cwd: runtime,
      env,
      encoding: 'utf8',
      timeout: 30_000,
    });
    if (result.error || result.status !== 0)
      throw new Error(`Smoke falló: ${result.stderr || result.error?.message}`);
    return JSON.parse(result.stdout);
  };
  const doctor = run(['doctor', '--json']);
  if (doctor.version !== version) throw new Error('Versión incorrecta en el portable.');
  const project = path.join(directory, 'generated project');
  run(['forge', project, '--json']);
  const verified = run(['verify', '--path', project, '--json']);
  if (verified.status !== 'passed') throw new Error('El proyecto generado no pasó sus tests.');
  if (process.platform === 'win32') {
    const cmd = spawnSync('cmd.exe', ['/d', '/c', 'ares.cmd doctor --json'], {
      cwd: runtime,
      env,
      encoding: 'utf8',
      timeout: 10_000,
    });
    if (cmd.status !== 0 || JSON.parse(cmd.stdout).version !== version)
      throw new Error('El wrapper CMD no funciona.');
  } else {
    const shell = spawnSync('sh', ['ares', 'doctor', '--json'], {
      cwd: runtime,
      env,
      encoding: 'utf8',
      timeout: 10_000,
    });
    if (shell.status !== 0 || JSON.parse(shell.stdout).version !== version)
      throw new Error('El wrapper Unix no funciona.');
  }
  console.log(
    JSON.stringify({
      version,
      portable: 'passed',
      generatedProjectTests: 'passed',
      platform: process.platform,
    }),
  );
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
