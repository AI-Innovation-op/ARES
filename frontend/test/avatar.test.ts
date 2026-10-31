import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createAresModel } from '../src/avatar/model.js';
import { visualPose } from '../src/domain/avatar-pose.js';
import { POSES_16 } from '../src/stores/fsm.store.js';
import { consumeChatStream, streamMetadata } from '../src/services/chat-stream.js';

test('all sixteen existing poses adapt to the supplied model with stable shared geometry', () => {
  const avatar = createAresModel();
  try {
    assert.equal(new Set(POSES_16.map((pose) => pose.id)).size, 16);
    const geometry = new Set<THREE.BufferGeometry>();
    for (const pose of POSES_16) {
      avatar.setPose(visualPose(pose));
      avatar.update(1, 1 / 30, false, false);
      avatar.root.updateMatrixWorld(true);
      avatar.root.traverse((object) => {
        assert.ok(object.matrixWorld.elements.every(Number.isFinite));
        if (object instanceof THREE.Mesh) geometry.add(object.geometry);
      });
    }
    assert.ok(geometry.size <= 6, 'Poses reuse geometry rather than allocate a model per frame.');
    const bound = new THREE.Box3().setFromObject(avatar.root);
    assert.ok(bound.max.y - bound.min.y > 3);
    assert.ok(bound.max.y - bound.min.y < 6);
  } finally {
    avatar.dispose();
  }
});

test('model owns and disposes every geometry and material, including hidden effects', () => {
  const avatar = createAresModel();
  avatar.setPose(visualPose(POSES_16[0]));
  const geometry = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>();
  avatar.root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      geometry.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material])
        materials.add(material);
    }
  });
  let disposedGeometry = 0,
    disposedMaterials = 0;
  geometry.forEach((item) => item.addEventListener('dispose', () => disposedGeometry++));
  materials.forEach((item) => item.addEventListener('dispose', () => disposedMaterials++));
  avatar.dispose();
  assert.equal(disposedGeometry, geometry.size);
  assert.equal(disposedMaterials, materials.size);
});

function body(text: string) {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += 3) controller.enqueue(bytes.slice(i, i + 3));
      controller.close();
    },
  });
}
test('chat SSE handles fragmented UTF-8 and final events without accepting partial streams', async () => {
  const events: Record<string, unknown>[] = [];
  await consumeChatStream(
    body(
      'data: {"type":"chunk","text":"Diseño 🛡️"}\r\n\r\ndata: {"type":"done","reply":"Diseño 🛡️"}',
    ),
    (event) => events.push(event),
  );
  assert.equal(events[0].text, 'Diseño 🛡️');
  assert.equal(events[1].type, 'done');
  await assert.rejects(
    consumeChatStream(body('data: {"type":"chunk","text":"Parcial"}\n\n'), () => {}),
    /antes de completar/,
  );
  await assert.rejects(
    consumeChatStream(body('data: {"type":"error","message":"Cuota insuficiente"}\n\n'), () => {}),
    /Cuota insuficiente/,
  );
});

test('stream metadata rejects missing sessions and invalid avatar states', () => {
  const valid = { conversationId: 'fixture', stance: 'IDLE', poseNumber: 1 };
  assert.equal(streamMetadata(valid).conversationId, 'fixture');
  for (const invalid of [
    { ...valid, conversationId: '' },
    { ...valid, poseNumber: 17 },
    { ...valid, stance: 'UNKNOWN' },
  ])
    assert.throws(() => streamMetadata(invalid), /metadatos/);
});
