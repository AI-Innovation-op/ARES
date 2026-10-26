/**
 * @fileoverview Generador procedural y controlador de animación del avatar voxel 3D de A.R.E.S.
 * Basado en Three.js con geometría modular de cubos y máquina de poses.
 * @module composables/useVoxelAvatar
 */

import * as THREE from 'three';
import type { NumeroPose, PresetOjos, Accion3D, TipoEscudo } from '../types/ares.types.js';

export interface VoxelAvatarController {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  actualizarPose: (pose: NumeroPose, accion: Accion3D, ojos: PresetOjos, escudo: TipoEscudo) => void;
  destruir: () => void;
  resetRotacion: () => void;
}

export function crearAvatarVoxel(contenedor: HTMLElement): VoxelAvatarController {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x040914, 0.04);

  const width = contenedor.clientWidth || 300;
  const height = contenedor.clientHeight || 400;

  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  camera.position.set(0, 1.2, 5.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  contenedor.appendChild(renderer.domElement);

  // ==========================================================================
  // Iluminación Táctica
  // ==========================================================================
  const ambientLight = new THREE.AmbientLight(0x0a192f, 2.0);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x00f2fe, 2.5);
  dirLight.position.set(3, 6, 4);
  dirLight.castShadow = true;
  scene.add(dirLight);

  const neonFillLight = new THREE.DirectionalLight(0x00ffaa, 2.0);
  neonFillLight.position.set(-3, 3, -2);
  scene.add(neonFillLight);

  // ==========================================================================
  // Materiales Voxel
  // ==========================================================================
  const matArmorBlue = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.3,
    metalness: 0.2,
  });

  const matArmorDeepBlue = new THREE.MeshStandardMaterial({
    color: 0x1e3a8a,
    roughness: 0.4,
    metalness: 0.4,
  });

  const matChestEmerald = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    roughness: 0.3,
  });

  const matNeonGreen = new THREE.MeshStandardMaterial({
    color: 0x00ffaa,
    emissive: 0x00ffaa,
    emissiveIntensity: 0.8,
    roughness: 0.1,
  });

  const matScreenFace = new THREE.MeshBasicMaterial({
    color: 0x040914,
  });

  const matCyanMatrix = new THREE.MeshBasicMaterial({
    color: 0x00f2fe,
    transparent: true,
    opacity: 0.85,
  });

  // ==========================================================================
  // Grupo Raíz del Avatar
  // ==========================================================================
  const rootGroup = new THREE.Group();
  scene.add(rootGroup);

  // 1. Plataforma Hexagonal
  const platGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.2, 6);
  const platMat = new THREE.MeshStandardMaterial({
    color: 0x091326,
    roughness: 0.5,
    metalness: 0.5,
  });
  const platform = new THREE.Mesh(platGeo, platMat);
  platform.position.y = -1.4;
  platform.receiveShadow = true;
  rootGroup.add(platform);

  const ringGeo = new THREE.RingGeometry(1.2, 1.25, 6);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -1.29;
  rootGroup.add(ring);

  // 2. Torso
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 0.1;
  rootGroup.add(torsoGroup);

  const chestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.5), matChestEmerald);
  torsoGroup.add(chestMesh);

  // Núcleo energético en el pecho (Herencia de Cori)
  const coreMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.08), matNeonGreen);
  coreMesh.position.set(0, 0.12, 0.26);
  torsoGroup.add(coreMesh);

  // Cinturón táctico
  const beltMesh = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.16, 0.54), matArmorDeepBlue);
  beltMesh.position.set(0, -0.4, 0);
  torsoGroup.add(beltMesh);

  // 3. Cabeza de Consola Espartana
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.85, 0);
  torsoGroup.add(headGroup);

  const helmetMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.75), matArmorBlue);
  headGroup.add(helmetMesh);

  // Pantalla del rostro
  const faceScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.55), matScreenFace);
  faceScreen.position.set(0, -0.05, 0.38);
  headGroup.add(faceScreen);

  // Cresta Espartana Superior (4 bloques de código binario neón)
  const crestGroup = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const crestBlock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.25 + i * 0.04, 0.16), matNeonGreen);
    crestBlock.position.set(0, 0.45 + i * 0.03, 0.2 - i * 0.16);
    crestGroup.add(crestBlock);
  }
  headGroup.add(crestGroup);

  // Ojos (planos dinámicos en la pantalla del rostro)
  const eyeLeft = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.2), matNeonGreen);
  eyeLeft.position.set(-0.18, -0.05, 0.385);
  headGroup.add(eyeLeft);

  const eyeRight = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.2), matNeonGreen);
  eyeRight.position.set(0.18, -0.05, 0.385);
  headGroup.add(eyeRight);

  // 4. Brazo Derecho + Espada Binaria
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.6, 0.3, 0);
  torsoGroup.add(rightArmGroup);

  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.7, 0.24), matArmorBlue);
  rightArm.position.y = -0.3;
  rightArmGroup.add(rightArm);

  // Espada Binaria
  const swordGroup = new THREE.Group();
  swordGroup.position.set(0, -0.65, 0.2);
  rightArmGroup.add(swordGroup);

  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.4, 0.04), matNeonGreen);
  blade.position.y = 0.5;
  swordGroup.add(blade);

  const swordGuard = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.1), matArmorDeepBlue);
  swordGuard.position.y = -0.15;
  swordGroup.add(swordGuard);

  // 5. Brazo Izquierdo + Escudo Aegis
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.6, 0.3, 0);
  torsoGroup.add(leftArmGroup);

  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.7, 0.24), matArmorBlue);
  leftArm.position.y = -0.3;
  leftArmGroup.add(leftArm);

  // Escudo Aegis
  const shieldGroup = new THREE.Group();
  shieldGroup.position.set(-0.15, -0.3, 0.2);
  leftArmGroup.add(shieldGroup);

  const shieldPlate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.1), matArmorDeepBlue);
  shieldGroup.add(shieldPlate);

  const shieldBorder = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.04, 0.06), matNeonGreen);
  shieldBorder.position.z = -0.02;
  shieldGroup.add(shieldBorder);

  // Emblema del Escudo (Documento 📄)
  const shieldEmblem = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.45), matNeonGreen);
  shieldEmblem.position.z = 0.06;
  shieldGroup.add(shieldEmblem);

  // 6. Piernas
  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), matArmorBlue);
  leftLeg.position.set(-0.25, -0.85, 0);
  torsoGroup.add(leftLeg);

  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), matArmorBlue);
  rightLeg.position.set(0.25, -0.85, 0);
  torsoGroup.add(rightLeg);

  // 7. Capa Matrix (0101)
  const capeGeo = new THREE.PlaneGeometry(0.9, 1.3, 3, 3);
  const cape = new THREE.Mesh(capeGeo, matCyanMatrix);
  cape.position.set(0, -0.25, -0.32);
  cape.rotation.y = Math.PI;
  torsoGroup.add(cape);

  // ==========================================================================
  // Interactividad: Arrastrar para rotar
  // ==========================================================================
  let isDragging = false;
  let previousMouseX = 0;
  let targetRotationY = 0;

  function onMouseDown(e: MouseEvent) {
    isDragging = true;
    previousMouseX = e.clientX;
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    const deltaX = e.clientX - previousMouseX;
    targetRotationY += deltaX * 0.01;
    previousMouseX = e.clientX;
  }

  function onMouseUp() {
    isDragging = false;
  }

  contenedor.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  function resetRotacion() {
    targetRotationY = 0;
  }

  // ==========================================================================
  // Bucle de Animación
  // ==========================================================================
  let animId: number;
  let clock = new THREE.Clock();
  let currentAction: Accion3D = 'STAND';

  function animate() {
    animId = requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    // Suavizado de rotación del usuario
    rootGroup.rotation.y += (targetRotationY - rootGroup.rotation.y) * 0.1;

    // Respiración idle sutil
    torsoGroup.position.y = 0.1 + Math.sin(elapsedTime * 2.2) * 0.03;
    cape.rotation.x = Math.PI + Math.sin(elapsedTime * 3) * 0.08;

    // Animación según acción 3D activa
    switch (currentAction) {
      case 'ANIME_SLASH':
        // Corte anime: espada en barrido rápido horizontal
        rightArmGroup.rotation.x = -Math.PI / 2 + Math.sin(elapsedTime * 8) * 0.4;
        rightArmGroup.rotation.y = Math.cos(elapsedTime * 8) * 0.8;
        swordGroup.rotation.z = Math.PI / 2;
        break;

      case 'SHIELD_WALL':
        // Muro defensivo: brazo izquierdo alzado con el escudo al frente
        leftArmGroup.rotation.x = -Math.PI / 3;
        leftArmGroup.rotation.y = 0.3;
        shieldGroup.position.set(-0.05, -0.2, 0.4);
        break;

      case 'RUN_1':
      case 'RUN_2':
      case 'RUN_3':
      case 'RUN_4':
        // Carrera táctica
        rightArmGroup.rotation.x = Math.sin(elapsedTime * 6) * 0.8;
        leftArmGroup.rotation.x = -Math.sin(elapsedTime * 6) * 0.8;
        leftLeg.position.z = Math.sin(elapsedTime * 6) * 0.25;
        rightLeg.position.z = -Math.sin(elapsedTime * 6) * 0.25;
        break;

      case 'SWORD_HIGH':
        rightArmGroup.rotation.x = -Math.PI * 0.8;
        break;

      case 'STAND':
      default:
        // Guardia relajada
        rightArmGroup.rotation.x = Math.sin(elapsedTime * 1.5) * 0.08;
        leftArmGroup.rotation.x = 0;
        leftArmGroup.rotation.y = 0;
        rightArmGroup.rotation.y = 0;
        swordGroup.rotation.z = 0;
        shieldGroup.position.set(-0.15, -0.3, 0.2);
        leftLeg.position.z = 0;
        rightLeg.position.z = 0;
        break;
    }

    renderer.render(scene, camera);
  }

  animate();

  // ==========================================================================
  // API del Controlador
  // ==========================================================================
  function actualizarPose(
    _pose: NumeroPose,
    accion: Accion3D,
    ojos: PresetOjos,
    escudo: TipoEscudo
  ) {
    currentAction = accion;

    // Actualizar ojos
    if (ojos === 'DEAD') {
      matNeonGreen.color.setHex(0xf43f5e);
      matNeonGreen.emissive.setHex(0xf43f5e);
      eyeLeft.scale.set(0.1, 0.1, 1);
      eyeRight.scale.set(0.1, 0.1, 1);
    } else if (ojos === 'CYBER_SCAN') {
      matNeonGreen.color.setHex(0x22d3ee);
      matNeonGreen.emissive.setHex(0x22d3ee);
      eyeLeft.scale.set(1.5, 0.5, 1);
      eyeRight.scale.set(1.5, 0.5, 1);
    } else {
      matNeonGreen.color.setHex(0x00ffaa);
      matNeonGreen.emissive.setHex(0x00ffaa);
      eyeLeft.scale.set(1, 1, 1);
      eyeRight.scale.set(1, 1, 1);
    }

    // Visibilidad del escudo
    shieldGroup.visible = escudo !== 'NONE';
  }

  function redimensionar() {
    if (!contenedor) return;
    const w = contenedor.clientWidth;
    const h = contenedor.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  window.addEventListener('resize', redimensionar);

  function destruir() {
    cancelAnimationFrame(animId);
    window.removeEventListener('resize', redimensionar);
    contenedor.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    renderer.dispose();
    if (renderer.domElement.parentElement) {
      renderer.domElement.parentElement.removeChild(renderer.domElement);
    }
  }

  return {
    scene,
    camera,
    renderer,
    actualizarPose,
    destruir,
    resetRotacion,
  };
}
