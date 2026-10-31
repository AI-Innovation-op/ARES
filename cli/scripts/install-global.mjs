import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifacts = path.resolve(root, '../.artifacts');
const metadata = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
const npm = process.env.npm_execpath;
if (!npm || !fs.existsSync(npm)) throw new Error('Ejecuta mediante npm run install:global.');
const file = `ARES-${metadata.version}-npm.tgz`;
const archive = path.join(artifacts, file);
const manifest = JSON.parse(
  fs.readFileSync(path.join(artifacts, `ARES-${metadata.version}-npm.manifest.json`)),
);
if (
  manifest.version !== metadata.version ||
  manifest.file !== file ||
  createHash('sha256').update(fs.readFileSync(archive)).digest('hex') !== manifest.sha256
)
  throw new Error('El paquete no coincide con su manifiesto; vuelve a ejecutar package:npm.');
const installed = spawnSync(
  process.execPath,
  [
    npm,
    'install',
    '--global',
    '--omit=dev',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    archive,
  ],
  { stdio: 'inherit', windowsHide: true },
);
if (installed.error || installed.status !== 0)
  throw new Error('La instalación global no se completó.');
const globalRoot = spawnSync(process.execPath, [npm, 'root', '--global'], {
  encoding: 'utf8',
  windowsHide: true,
});
if (globalRoot.status !== 0) throw new Error('No se pudo comprobar la instalación.');
const packageRoot = path.join(globalRoot.stdout.trim(), '@ares-ecosystem', 'cli');
if (
  fs.lstatSync(packageRoot).isSymbolicLink() ||
  fs.realpathSync(packageRoot) === fs.realpathSync(root)
)
  throw new Error('La instalación sigue vinculada al repositorio.');
const check = spawnSync(process.execPath, [path.join(packageRoot, 'dist/index.js'), '--version'], {
  encoding: 'utf8',
  windowsHide: true,
});
if (check.status !== 0 || check.stdout.trim() !== metadata.version)
  throw new Error('La versión instalada no pasó su comprobación.');
console.log(
  JSON.stringify({ version: metadata.version, installed: packageRoot, independentCopy: true }),
);
