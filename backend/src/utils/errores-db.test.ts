import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esErrorDeConexion } from './errores-db.js';

test('errores de conexión → true', () => {
  assert.equal(esErrorDeConexion({ code: 'ECONNREFUSED' }), true);
  assert.equal(esErrorDeConexion({ code: '57P01' }), true);
  assert.equal(esErrorDeConexion({ code: '08006' }), true);
  assert.equal(esErrorDeConexion({ code: '', errors: [{ code: 'ECONNREFUSED' }] }), true); // AggregateError (IPv4+IPv6)
});

test('errores de SQL → false (deben propagarse, no cambiar de base)', () => {
  assert.equal(esErrorDeConexion({ code: '23505' }), false); // unique_violation
  assert.equal(esErrorDeConexion({ code: '42601' }), false); // syntax_error
  assert.equal(esErrorDeConexion(new Error('boom')), false);
  assert.equal(esErrorDeConexion(undefined), false);
});
