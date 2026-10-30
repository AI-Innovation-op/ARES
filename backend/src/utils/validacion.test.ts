import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import {
  resolverRutaSegura,
  validarNombreRama,
  validarRemoteUrl,
  validarTokenGithub,
  validarAutorGit,
  validarMensajeCommit,
  validarNombrePersona,
} from './validacion.js';
import { ValidationError } from '../middleware/error.middleware.js';

const BASE = path.resolve('/tmp/ares-sandbox-test');

test('resolverRutaSegura acepta rutas normales y devuelve ruta relativa con "/"', () => {
  const r = resolverRutaSegura(BASE, 'src/shared/domain.ts');
  assert.equal(r.relativa, 'src/shared/domain.ts');
  assert.equal(r.absoluta, path.resolve(BASE, 'src/shared/domain.ts'));
  assert.equal(resolverRutaSegura(BASE, 'src\\app\\main.ts').relativa, 'src/app/main.ts');
  assert.equal(resolverRutaSegura(BASE, '.gitignore').relativa, '.gitignore');
});

test('resolverRutaSegura rechaza rutas peligrosas', () => {
  const malas: unknown[] = [
    '../../etc/passwd',
    '..\\..\\x.txt',
    'a/../../b',
    '/etc/passwd',
    'C:\\Windows\\x',
    '.git/HEAD',
    'src/.GIT/x',
    'a\0b',
    '',
    'x'.repeat(301),
    123,
    null,
    undefined,
  ];
  for (const m of malas) {
    assert.throws(() => resolverRutaSegura(BASE, m), ValidationError, `debía rechazar ${JSON.stringify(m)}`);
  }
});

test('validarNombreRama', () => {
  assert.equal(validarNombreRama('feature/prestamos'), 'feature/prestamos');
  for (const mala of ['--orphan', '-x', 'a..b', 'a//b', 'rama/', 'x.lock', '', 'a b', 'a;b', 5]) {
    assert.throws(() => validarNombreRama(mala), ValidationError, `debía rechazar ${String(mala)}`);
  }
});

test('validarRemoteUrl solo acepta https://github.com/owner/repo(.git)', () => {
  assert.equal(validarRemoteUrl('https://github.com/AI-Innovation-op/ARES.git'), 'https://github.com/AI-Innovation-op/ARES.git');
  for (const mala of ['file:///etc', '/tmp/repo', 'ssh://git@github.com/a/b', 'http://github.com/a/b', 'https://evil.com/a/b', 'https://github.com/a/b/c', '-oProxy', 'https://github.com/a/b;rm']) {
    assert.throws(() => validarRemoteUrl(mala), ValidationError, `debía rechazar ${mala}`);
  }
});

test('validarTokenGithub rechaza caracteres que rompen la URL', () => {
  assert.equal(validarTokenGithub('ghp_abcdefghijklmnopqrstuvwxyz0123456789'), 'ghp_abcdefghijklmnopqrstuvwxyz0123456789');
  for (const malo of ['a@b/c:d1234567', 'corto', 'tok en con espacio 123', '']) {
    assert.throws(() => validarTokenGithub(malo), ValidationError);
  }
});

test('validarAutorGit / validarNombrePersona / validarMensajeCommit', () => {
  assert.equal(validarAutorGit('José Núñez <jose.nunez@gmail.com>'), 'José Núñez <jose.nunez@gmail.com>');
  assert.throws(() => validarAutorGit('Kevin <k@x.com>\nOtro <o@x.com>'), ValidationError);
  assert.throws(() => validarAutorGit('Kevin k@x.com'), ValidationError);
  assert.equal(validarNombrePersona("María O'Brien-Pérez"), "María O'Brien-Pérez");
  assert.throws(() => validarNombrePersona('x"; rm -rf ~; "'), ValidationError);
  assert.equal(
    validarMensajeCommit('feat(prestamos-domain): entities, value objects and repository port interfaces'),
    'feat(prestamos-domain): entities, value objects and repository port interfaces'
  );
  assert.throws(() => validarMensajeCommit('hola "mundo"'), ValidationError);
  assert.throws(() => validarMensajeCommit('linea1\nlinea2'), ValidationError);
  assert.throws(() => validarMensajeCommit('$(whoami)'), ValidationError);
});
