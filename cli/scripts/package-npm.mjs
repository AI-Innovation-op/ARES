import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.resolve(root, '../.artifacts');
fs.mkdirSync(output, { recursive: true });
const artifacts = fs.realpathSync(output);
const temporary = fs.mkdtempSync(path.join(artifacts, '.npm-package-'));
const npm = process.env.npm_execpath;
if (!npm || !fs.existsSync(npm)) throw new Error('Ejecuta mediante npm run package:npm.');
try {
  const runtime = path.join(temporary, 'package');
  fs.mkdirSync(runtime);
  const metadata = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json')));
  delete metadata.devDependencies;
  delete metadata.scripts;
  metadata.files = [...metadata.files, 'npm-shrinkwrap.json'];
  delete lock.packages[''].devDependencies;
  for (const [name, dependency] of Object.entries(lock.packages))
    if (dependency.dev === true) delete lock.packages[name];
  fs.writeFileSync(path.join(runtime, 'package.json'), JSON.stringify(metadata, null, 2) + '\n');
  fs.writeFileSync(path.join(runtime, 'npm-shrinkwrap.json'), JSON.stringify(lock, null, 2) + '\n');
  for (const file of ['README.md', 'LICENSE'])
    fs.writeFileSync(
      path.join(runtime, file),
      fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n'),
    );
  fs.cpSync(path.join(root, 'dist'), path.join(runtime, 'dist'), { recursive: true });
  const packed = spawnSync(
    process.execPath,
    [npm, 'pack', '--ignore-scripts', '--json', '--pack-destination', artifacts],
    {
      cwd: runtime,
      encoding: 'utf8',
      windowsHide: true,
    },
  );
  if (packed.error || packed.status !== 0) throw new Error('No se pudo crear el paquete npm.');
  const [result] = JSON.parse(packed.stdout);
  if (
    typeof result.filename !== 'string' ||
    path.basename(result.filename) !== result.filename ||
    !result.filename.endsWith('.tgz')
  )
    throw new Error('Nombre de paquete inválido.');
  const file = `ARES-${metadata.version}-npm.tgz`;
  const archive = path.join(artifacts, file);
  fs.renameSync(path.join(artifacts, result.filename), archive);
  const manifest = {
    version: metadata.version,
    file,
    sha256: createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),
    bytes: fs.statSync(archive).size,
    node: metadata.engines.node,
    dependencies: 'npm-shrinkwrap.json',
  };
  fs.writeFileSync(
    path.join(artifacts, `ARES-${metadata.version}-npm.manifest.json`),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  console.log(JSON.stringify(manifest));
} finally {
  if (path.dirname(fs.realpathSync(temporary)) !== artifacts)
    throw new Error('Destino temporal inválido.');
  fs.rmSync(temporary, { recursive: true, force: true });
}
