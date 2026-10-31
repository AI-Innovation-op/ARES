import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createAresModel } from './model.js';
import { createVoxelEffects } from './effects.js';
import type { Pose } from '../domain/avatar-pose.js';

export interface AvatarScene {
  setActivity(activity: 'idle' | 'listening' | 'thinking' | 'speaking'): void;
  setPose(pose: Pose): void;
  setMotion(enabled: boolean): void;
  setPatrol(enabled: boolean): void;
  resetView(): void;
  turn(direction: number): void;
  triggerRefactor(): void;
  dispose(): void;
}

export function mountAvatarScene(
  host: HTMLElement,
  initialPose: Pose,
  onContextLost: () => void,
): AvatarScene {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor('#06131c', 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.dataset.renderer = 'three';
  host.appendChild(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
  camera.position.set(3.5, 2.6, 6.8);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1.64, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.085;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.minPolarAngle = 0.65;
  controls.maxPolarAngle = 2.05;
  controls.rotateSpeed = 0.6;
  controls.saveState();
  controls.update();
  scene.add(new THREE.HemisphereLight('#c4edff', '#12354a', 1.5));
  const key = new THREE.DirectionalLight('#d1f3ff', 2.2);
  key.position.set(-3, 5, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#00ffaa', 2);
  rim.position.set(3, 2, -4);
  scene.add(rim);
  const front = new THREE.PointLight('#70baff', 6, 12);
  front.position.set(0, 1, 4);
  scene.add(front);
  const model = createAresModel();
  model.setPose(initialPose);
  const effects = createVoxelEffects();
  model.root.add(effects.root);
  const pivot = new THREE.Group();
  pivot.add(model.root);
  scene.add(pivot);
  const platformMaterial = new THREE.MeshStandardMaterial({
    color: '#082c39',
    metalness: 0.6,
    roughness: 0.45,
  });
  const platformGeometry = new THREE.CylinderGeometry(1.55, 1.7, 0.09, 6);
  const platform = new THREE.Mesh(platformGeometry, platformMaterial);
  platform.position.y = -0.045;
  scene.add(platform);
  const ringGeometry = new THREE.TorusGeometry(1.39, 0.012, 4, 64);
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: '#3bdbb1',
    transparent: true,
    opacity: 0.65,
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  scene.add(ring);
  const dustGeometry = new THREE.BufferGeometry();
  const dust = new Float32Array(28 * 3);
  for (let i = 0; i < 28; i++) {
    dust[i * 3] = Math.sin(i * 2.399) * (1.15 + (i % 4) * 0.16);
    dust[i * 3 + 1] = 0.25 + (i / 28) * 3.2;
    dust[i * 3 + 2] = Math.cos(i * 2.399) * 1.2;
  }
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dust, 3));
  const dustMaterial = new THREE.PointsMaterial({
    color: '#00ffaa',
    size: 0.025,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  const particles = new THREE.Points(dustGeometry, dustMaterial);
  scene.add(particles);
  let activity: 'idle' | 'listening' | 'thinking' | 'speaking' = 'idle';
  let motion = true,
    patrol = false,
    visible = true,
    disposed = false,
    lastTime = 0,
    elapsed = 0,
    turn = 0,
    frames = 0;
  function resize() {
    const width = host.clientWidth,
      height = host.clientHeight;
    if (!width || !height || disposed) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    if (!motion) animate(performance.now());
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  resize();
  const visibilityObserver = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? false;
    updateLoop();
  });
  visibilityObserver.observe(host);
  const lost = (event: Event) => {
    event.preventDefault();
    onContextLost();
  };
  canvas.addEventListener('webglcontextlost', lost);
  function animate(timestamp: number) {
    if (disposed || !visible || document.hidden) {
      lastTime = timestamp;
      return;
    }
    if (motion && lastTime && timestamp - lastTime < 1000 / 30) return;
    const delta = Math.min((timestamp - (lastTime || timestamp)) / 1000, 0.05);
    lastTime = timestamp;
    if (motion) elapsed += delta;
    model.update(elapsed, delta, motion, patrol);
    pivot.rotation.y = turn;
    effects.update(elapsed, delta, motion);
    ringMaterial.opacity =
      activity === 'speaking'
        ? motion
          ? 0.75 + Math.sin(elapsed * 7) * 0.2
          : 0.9
        : activity === 'listening'
          ? 0.9
          : 0.65;
    canvas.dataset.activity = activity;
    canvas.dataset.effects = motion ? 'matrix' : 'paused';
    if (motion) particles.rotation.y = elapsed * 0.07;
    controls.update();
    renderer.render(scene, camera);
    if (frames < 2) canvas.dataset.frames = String(++frames);
  }
  function updateLoop() {
    const running = !disposed && visible && !document.hidden && motion;
    lastTime = 0;
    renderer.setAnimationLoop(running ? animate : null);
    canvas.dataset.loop = running ? 'running' : 'paused';
    if (!running && !disposed) animate(performance.now());
  }
  const changed = () => {
    if (!motion && !disposed) renderer.render(scene, camera);
  };
  controls.addEventListener('change', changed);
  document.addEventListener('visibilitychange', updateLoop);
  updateLoop();
  return {
    setActivity(value) {
      activity = value;
    },
    setPose(pose) {
      model.setPose(pose);
      if (!motion) animate(performance.now());
    },
    setMotion(enabled) {
      motion = enabled;
      controls.enableDamping = enabled;
      updateLoop();
    },
    setPatrol(enabled) {
      patrol = enabled;
    },
    resetView() {
      turn = 0;
      controls.reset();
      if (!motion) animate(performance.now());
    },
    turn(direction) {
      turn += (direction * Math.PI) / 8;
      if (!motion) animate(performance.now());
    },
    triggerRefactor() {
      effects.trigger();
      canvas.dataset.refactors = String(Number(canvas.dataset.refactors ?? 0) + 1);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener('visibilitychange', updateLoop);
      canvas.removeEventListener('webglcontextlost', lost);
      controls.removeEventListener('change', changed);
      controls.dispose();
      model.dispose();
      effects.dispose();
      platformGeometry.dispose();
      platformMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      dustGeometry.dispose();
      dustMaterial.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
