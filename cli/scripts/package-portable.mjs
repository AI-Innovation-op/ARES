import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import JSZip from 'jszip';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = path.resolve(root, '../.artifacts');
const metadata = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const npm = process.env.npm_execpath;
if (!npm || !fs.existsSync(npm)) throw new Error('Ejecuta este script mediante npm run portable.');
fs.mkdirSync(destination, { recursive: true });
const temporary = fs.mkdtempSync(path.join(destination, '.portable-build-'));
if (path.dirname(temporary) !== destination) throw new Error('Destino temporal inválido.');

try {
  const runtime = path.join(temporary, 'ARES');
  fs.mkdirSync(runtime);
  for (const name of [
    'package.json',
    'package-lock.json',
    'LICENSE',
    'README.md',
    '.env.example',
  ]) {
    const content = fs.readFileSync(path.join(root, name), 'utf8').replaceAll('\r\n', '\n');
    fs.writeFileSync(path.join(runtime, name), content);
  }
  fs.cpSync(path.join(root, 'dist'), path.join(runtime, 'dist'), { recursive: true });
  const install = spawnSync(
    process.execPath,
    [npm, 'ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'],
    { cwd: runtime, stdio: 'inherit', windowsHide: true },
  );
  if (install.error || install.status !== 0)
    throw new Error('No se pudo instalar el runtime fijado en el lockfile.');
  fs.writeFileSync(
    path.join(runtime, 'ares.cmd'),
    '@echo off\r\nsetlocal\r\nchcp 65001 >nul\r\nnode "%~dp0dist\\index.js" %*\r\nexit /b %errorlevel%\r\n',
  );
  fs.writeFileSync(
    path.join(runtime, 'INICIAR_ARES.bat'),
    '@echo off\r\ncd /d "%~dp0"\r\ncall ares.cmd repl\r\n',
  );
  fs.writeFileSync(
    path.join(runtime, 'ares'),
    '#!/bin/sh\nexec node "$(dirname "$0")/dist/index.js" "$@"\n',
  );
  fs.writeFileSync(
    path.join(runtime, 'LEEME.txt'),
    `ARES ${metadata.version} - Portable\n\nRequiere Node.js 24 o superior. Extrae el ZIP completo; no necesitas npm install.\nWindows: INICIAR_ARES.bat o ares.cmd doctor\nUnix: sh ares doctor\n\nares.cmd config init crea la configuración local.\nConfigura proveedor, modelo y clave localmente; verifica con doctor --probe.\nSin IA: audit, forge, propuestas importadas, apply, restore y verify.\nverify ejecuta el script elegido del proyecto y guarda evidencia real.\nNo ejecuta automáticamente código escrito por un modelo.\n\nLas dependencias de ejecución están fijadas en package-lock.json.\nEl código fuente y las herramientas de desarrollo se distribuyen por separado.\n`,
  );
  const zip = new JSZip();
  const fixedDate = new Date('2000-01-01T00:00:00Z');
  let files = 0;
  const add = (directory) => {
    const entries = fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const entry of entries) {
      if (entry.name === '.bin' || entry.name === '.package-lock.json' || entry.isSymbolicLink())
        continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) add(absolute);
      else if (entry.isFile()) {
        const relative = 'ARES/' + path.relative(runtime, absolute).replaceAll('\\', '/');
        zip.file(relative, fs.readFileSync(absolute), {
          date: fixedDate,
          createFolders: false,
          unixPermissions: relative === 'ARES/ares' ? 0o755 : 0o644,
        });
        files++;
      }
    }
  };
  add(runtime);
  const bytes = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    platform: 'UNIX',
  });
  const filename = `ARES-${metadata.version}-portable.zip`;
  const archive = path.join(destination, filename);
  fs.writeFileSync(archive, bytes);
  const result = {
    version: metadata.version,
    file: filename,
    bytes: bytes.length,
    files,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    node: '>=24.0.0',
    dependencies: 'package-lock.json / npm ci --omit=dev --ignore-scripts',
  };
  fs.writeFileSync(
    path.join(destination, `ARES-${metadata.version}-portable.manifest.json`),
    JSON.stringify(result, null, 2) + '\n',
  );
  console.log(JSON.stringify({ ...result, archive }));
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
