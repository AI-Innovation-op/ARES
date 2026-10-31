import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const metadata = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
const archive = path.resolve(root, '../.artifacts', `ARES-${metadata.version}-npm.tgz`);
const temporaryRoot = fs.realpathSync(os.tmpdir());
const directory = fs.mkdtempSync(path.join(temporaryRoot, 'ARES npm smoke with spaces-'));
const npm = process.env.npm_execpath;
if (!npm || !fs.existsSync(npm)) throw new Error('Ejecuta mediante npm run smoke:npm.');
try {
  const install = spawnSync(
    process.execPath,
    [
      npm,
      'install',
      '--prefix',
      directory,
      '--omit=dev',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      archive,
    ],
    { encoding: 'utf8', windowsHide: true, timeout: 120000 },
  );
  if (install.error || install.status !== 0)
    throw new Error('Falló la instalación aislada del tarball.');
  const installed = path.join(directory, 'node_modules/@ares-ecosystem/cli');
  if (
    fs.lstatSync(installed).isSymbolicLink() ||
    fs.realpathSync(installed) === fs.realpathSync(root)
  )
    throw new Error('El paquete instalado depende de un enlace al checkout.');
  const shrinkwrap = JSON.parse(fs.readFileSync(path.join(installed, 'npm-shrinkwrap.json')));
  const resolver = createRequire(path.join(installed, 'package.json'));
  for (const dependency of Object.keys(metadata.dependencies)) {
    const candidate = resolver.resolve
      .paths(dependency)
      .map((base) => path.join(base, dependency, 'package.json'))
      .find((file) => fs.existsSync(file));
    if (
      !candidate ||
      JSON.parse(fs.readFileSync(candidate)).version !==
        shrinkwrap.packages['node_modules/' + dependency].version
    )
      throw new Error('Una dependencia instalada difiere del lockfile.');
  }
  const env = { ...process.env };
  for (const key of Object.keys(env))
    if (
      /^ARES_/.test(key) ||
      /^(OPENROUTER|GEMINI|MISTRAL|GROQ|COHERE|COMPATIBLE)_(API_KEY|MODEL)$/.test(key)
    )
      delete env[key];
  env.ARES_HOME = path.join(directory, 'private-data');
  const run = (args) => {
    const result = spawnSync(
      process.execPath,
      [path.join(installed, 'dist/index.js'), ...args, '--json'],
      { cwd: directory, env, encoding: 'utf8', timeout: 30000 },
    );
    if (result.status !== 0) throw new Error('El paquete instalado no ejecutó ' + args[0]);
    return JSON.parse(result.stdout);
  };
  const doctor = run(['doctor']);
  if (
    doctor.version !== metadata.version ||
    fs.realpathSync(doctor.cliPath) !== fs.realpathSync(installed)
  )
    throw new Error('La CLI no está ejecutando su copia instalada.');
  const project = path.join(directory, 'generated project');
  run(['forge', project]);
  if (run(['--project', project, 'verify']).status !== 'passed')
    throw new Error('La copia instalada no verificó el proyecto generado.');
  console.log(
    JSON.stringify({
      version: metadata.version,
      npmPackage: 'passed',
      independentCopy: true,
      pinnedDependencies: 'passed',
      projectWorkflow: 'passed',
      platform: process.platform,
    }),
  );
} finally {
  if (path.dirname(fs.realpathSync(directory)) !== temporaryRoot)
    throw new Error('Destino temporal inválido.');
  fs.rmSync(directory, { recursive: true, force: true });
}
