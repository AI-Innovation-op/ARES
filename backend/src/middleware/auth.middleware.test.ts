import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearMiddlewareApiKey } from './auth.middleware.js';

/** Simula req/res mínimos de Express para probar el middleware sin levantar un servidor. */
function ejecutar(
  opciones: { claveEsperada: string; produccion: boolean; origenesPermitidos?: string[] },
  cabeceraKey?: string,
  origen?: string
) {
  const mw = crearMiddlewareApiKey(opciones);
  let estado = 200;
  let siguioAdelante = false;
  const req: any = {
    header: (n: string) => {
      const lower = n.toLowerCase();
      if (lower === 'x-api-key') return cabeceraKey;
      if (lower === 'origin') return origen;
      return undefined;
    },
  };
  const res: any = {
    status(c: number) {
      estado = c;
      return this;
    },
    json() {
      return this;
    },
  };
  mw(req, res, () => {
    siguioAdelante = true;
  });
  return { estado, siguioAdelante };
}

test('con clave configurada: sin cabecera o con clave errónea → 401', () => {
  assert.deepEqual(ejecutar({ claveEsperada: 'secreta', produccion: true }), { estado: 401, siguioAdelante: false });
  assert.deepEqual(ejecutar({ claveEsperada: 'secreta', produccion: true }, 'otra'), { estado: 401, siguioAdelante: false });
});

test('con clave configurada: clave correcta → pasa', () => {
  assert.deepEqual(ejecutar({ claveEsperada: 'secreta', produccion: true }, 'secreta'), { estado: 200, siguioAdelante: true });
});

test('sin clave configurada: producción → 503 y desarrollo → pasa', () => {
  assert.deepEqual(ejecutar({ claveEsperada: '', produccion: true }), { estado: 503, siguioAdelante: false });
  assert.deepEqual(ejecutar({ claveEsperada: '', produccion: false }), { estado: 200, siguioAdelante: true });
});

test('con origen permitido en CORS: pasa sin cabecera de clave en producción', () => {
  assert.deepEqual(
    ejecutar(
      {
        claveEsperada: 'secreta',
        produccion: true,
        origenesPermitidos: ['https://ai-innovation-op.github.io'],
      },
      undefined,
      'https://ai-innovation-op.github.io'
    ),
    { estado: 200, siguioAdelante: true }
  );
});
