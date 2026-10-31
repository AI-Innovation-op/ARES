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
  run(['--project', project, 'team', 'init', '--name', 'Package smoke', '--check', 'test']);
  if (run(['--project', project, 'team', 'check']).status !== 'passed')
    throw new Error('El paquete no ejecutó las comprobaciones compartidas.');
  const changeFile = path.join(directory, 'handoff-source.json');
  fs.writeFileSync(
    changeFile,
    JSON.stringify({
      summary: 'Package handoff',
      changes: [{ path: 'note.md', content: 'Shared proposal\n' }],
    }),
  );
  const proposal = run(['--project', project, 'propose', '--from', changeFile]);
  const bundleFile = path.join(directory, 'handoff.json');
  const exported = run(['handoff', 'export', proposal.id, '-o', bundleFile]);
  if (run(['handoff', 'inspect', bundleFile]).digest !== exported.digest)
    throw new Error('El paquete no pudo intercambiar una propuesta.');
  const registration = run(['projects', 'add', 'smoke', project]);
  if (run(['--project', '@smoke', 'doctor']).projectProfile.id !== registration.project.id)
    throw new Error('El paquete instalado no resolvió el alias.');
  run(['projects', 'configure', 'smoke', '--provider', 'groq', '--model', 'smoke-model']);
  if (run(['--project', '@smoke', 'doctor']).model !== 'smoke-model')
    throw new Error('El paquete instalado no cargó su perfil.');
  if (run(['--project', project, 'verify']).status !== 'passed')
    throw new Error('La copia instalada no verificó el proyecto generado.');
  const globalPrefix = path.join(directory, 'global prefix');
  const npmrc = path.join(directory, 'isolated.npmrc');
  fs.mkdirSync(globalPrefix);
  fs.writeFileSync(npmrc, 'prefix=' + globalPrefix.replaceAll('\\', '/') + '\n');
  const installerEnvironment = { ...process.env };
  for (const key of Object.keys(installerEnvironment))
    if (/^npm_config_(prefix|local_prefix|global_prefix|userconfig)$/i.test(key))
      delete installerEnvironment[key];
  Object.assign(installerEnvironment, {
    npm_execpath: npm,
    npm_config_prefix: path.join(directory, 'inherited source prefix'),
    npm_config_local_prefix: root,
    npm_config_userconfig: npmrc,
  });
  const installer = spawnSync(process.execPath, [path.join(root, 'scripts/install-global.mjs')], {
    cwd: root,
    env: installerEnvironment,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 120000,
  });
  if (installer.error || installer.status !== 0)
    throw new Error('El instalador global no pasó su prueba aislada.');
  const report = JSON.parse(installer.stdout.trim().split(/\r?\n/).at(-1));
  if (
    report.version !== metadata.version ||
    fs.realpathSync(report.installed) !==
      fs.realpathSync(
        path.join(
          globalPrefix,
          process.platform === 'win32' ? 'node_modules' : 'lib/node_modules',
          '@ares-ecosystem/cli',
        ),
      )
  )
    throw new Error('El instalador global heredó el prefijo del código fuente.');
  console.log(
    JSON.stringify({
      version: metadata.version,
      npmPackage: 'passed',
      independentCopy: true,
      pinnedDependencies: 'passed',
      projectWorkflow: 'passed',
      globalInstaller: 'passed',
      projectProfiles: 'passed',
      platform: process.platform,
    }),
  );
} finally {
  if (path.dirname(fs.realpathSync(directory)) !== temporaryRoot)
    throw new Error('Destino temporal inválido.');
  fs.rmSync(directory, { recursive: true, force: true });
}
