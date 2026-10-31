import * as THREE from 'three';
import type { Pose } from '../domain/avatar-pose.js';

// Modelo articulado nativo: las referencias raster guían la silueta y la paleta.
// No requiere descargar un GLB ni enviar las imágenes a un servicio externo.
export function createAresModel() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const materials = {
    blue: new THREE.MeshStandardMaterial({ color: '#087cba', metalness: 0.55, roughness: 0.34 }),
    darkBlue: new THREE.MeshStandardMaterial({ color: '#103761', metalness: 0.55, roughness: 0.4 }),
    cyan: new THREE.MeshStandardMaterial({ color: '#37cbee', metalness: 0.4, roughness: 0.3 }),
    dark: new THREE.MeshStandardMaterial({ color: '#071b2c', metalness: 0.45, roughness: 0.4 }),
    green: new THREE.MeshStandardMaterial({ color: '#0dcc98', metalness: 0.4, roughness: 0.28 }),
    energy: new THREE.MeshStandardMaterial({
      color: '#70ffd0',
      emissive: '#00ffaa',
      emissiveIntensity: 1.3,
      roughness: 0.25,
    }),
    face: new THREE.MeshStandardMaterial({ color: '#030e1b', metalness: 0.15, roughness: 0.3 }),
    cape: new THREE.MeshStandardMaterial({
      color: '#035b64',
      metalness: 0.15,
      roughness: 0.7,
      side: THREE.DoubleSide,
    }),
  };
  type MaterialName = keyof typeof materials;
  const ownedGeometry: THREE.BufferGeometry[] = [geometry];
  function block(
    parent: THREE.Object3D,
    dimensions: [number, number, number],
    position: [number, number, number],
    material: MaterialName,
  ) {
    const mesh = new THREE.Mesh(geometry, materials[material]);
    mesh.scale.set(...dimensions);
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  }
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const torso = new THREE.Group();
  torso.position.y = 1.36;
  body.add(torso);
  block(torso, [0.98, 0.88, 0.64], [0, 0, 0], 'dark');
  block(torso, [1.02, 0.4, 0.76], [0, 0.23, 0.04], 'green');
  block(torso, [0.73, 0.12, 0.04], [0, 0.32, 0.44], 'energy');
  block(torso, [0.2, 0.3, 0.06], [0, 0.16, 0.45], 'energy');
  for (let i = 0; i < 3; i++) block(torso, [0.8, 0.09, 0.08], [0, -0.06 - i * 0.16, 0.35], 'blue');
  block(torso, [1.09, 0.18, 0.79], [0, -0.45, 0.02], 'cyan');
  block(torso, [0.22, 0.2, 0.09], [0, -0.45, 0.46], 'green');
  const head = new THREE.Group();
  head.position.y = 2.34;
  body.add(head);
  block(head, [1.5, 1.12, 1.08], [0, 0, 0], 'darkBlue');
  block(head, [1.53, 0.17, 1.13], [0, 0.51, 0], 'blue');
  block(head, [1.37, 0.07, 1.02], [0, 0.62, 0], 'cyan');
  block(head, [1.22, 0.77, 0.07], [0, -0.02, 0.56], 'face');
  block(head, [1.34, 0.08, 0.13], [0, -0.45, 0.6], 'cyan');
  for (const sign of [-1, 1]) {
    block(head, [0.13, 0.9, 0.15], [sign * 0.64, -0.02, 0.59], 'blue');
    block(head, [0.08, 0.65, 0.16], [sign * 0.73, -0.13, 0.57], 'cyan');
    block(head, [0.12, 0.4, 0.42], [sign * 0.8, -0.01, -0.02], 'cyan');
    block(head, [0.13, 0.29, 0.28], [sign * 0.82, -0.01, 0.01], 'blue');
  }
  block(head, [0.26, 0.58, 0.17], [0, 0.43, 0.66], 'dark');
  block(head, [0.2, 0.51, 0.19], [0, 0.45, 0.69], 'green');
  block(head, [0.055, 0.33, 0.035], [0, 0.45, 0.8], 'energy');
  // Cresta de vóxeles con píxeles binarios en ambos lados.
  for (let i = 0; i < 6; i++) {
    const height = 0.27 + Math.sin((i / 5) * Math.PI) * 0.2;
    const z = -0.48 + i * 0.17;
    block(head, [0.28, height, 0.19], [0, 0.7 + height / 2, z], 'green');
    block(head, [0.3, 0.05, 0.19], [0, 0.7 + height, z], 'energy');
    for (const side of [-1, 1])
      for (let j = 0; j < 3; j++) {
        block(
          head,
          [0.012, 0.04, 0.045],
          [side * 0.145, 0.76 + j * 0.1, z],
          (i + j) % 3 === 0 ? 'cyan' : 'energy',
        );
      }
  }
  const eyes = new THREE.Group();
  eyes.position.set(0, -0.015, 0.615);
  head.add(eyes);
  const eyePatterns = {
    normal: ['00100', '00100', '00100', '00100', '00100'],
    cross: ['10001', '01010', '00100', '01010', '10001'],
    right: ['10000', '01000', '00100', '01000', '10000'],
    left: ['00001', '00010', '00100', '00010', '00001'],
    arc: ['00100', '01010', '10001', '00000', '00000'],
    angryRight: ['10000', '01000', '00100', '00010', '00010'],
    angryLeft: ['00001', '00010', '00100', '01000', '01000'],
    scan: ['11111', '10001', '10101', '10001', '11111'],
  };
  function setEyes(pose: Pose) {
    eyes.clear();
    let left = eyePatterns.normal,
      right = eyePatterns.normal;
    if (pose.id === 2) left = right = eyePatterns.cross;
    else if (pose.id === 15) left = right = eyePatterns.arc;
    else if (pose.id === 16) left = right = eyePatterns.scan;
    else if ([9, 10].includes(pose.id)) {
      left = eyePatterns.angryRight;
      right = eyePatterns.angryLeft;
    } else if (![1, 5, 13].includes(pose.id)) {
      left = eyePatterns.right;
      right = eyePatterns.left;
    }
    [left, right].forEach((pattern, eye) =>
      pattern.forEach((row, y) =>
        [...row].forEach((pixel, x) => {
          if (pixel === '1')
            block(
              eyes,
              [0.046, 0.046, 0.025],
              [(eye === 0 ? -0.26 : 0.26) + (x - 2) * 0.044, 0.08 + (2 - y) * 0.044, 0],
              'energy',
            );
        }),
      ),
    );
    if ([4, 7, 15].includes(pose.id)) {
      block(eyes, [0.12, 0.035, 0.025], [0, -0.17, 0], 'energy');
      block(eyes, [0.035, 0.04, 0.025], [-0.075, -0.14, 0], 'energy');
      block(eyes, [0.035, 0.04, 0.025], [0.075, -0.14, 0], 'energy');
    } else if ([3, 8, 10, 12, 14].includes(pose.id))
      block(eyes, [0.13, 0.027, 0.025], [0, -0.16, 0], 'energy');
  }
  const legs = [-1, 1].map((sign) => {
    const leg = new THREE.Group();
    leg.position.set(sign * 0.29, 0.91, 0);
    body.add(leg);
    block(leg, [0.37, 0.65, 0.45], [0, -0.26, 0], 'darkBlue');
    block(leg, [0.41, 0.23, 0.5], [0, -0.12, 0.06], 'blue');
    block(leg, [0.23, 0.19, 0.06], [0, -0.12, 0.35], 'green');
    block(leg, [0.48, 0.29, 0.74], [0, -0.64, 0.14], 'blue');
    block(leg, [0.45, 0.08, 0.76], [0, -0.53, 0.15], 'cyan');
    block(leg, [0.32, 0.19, 0.06], [0, -0.65, 0.55], 'green');
    return leg;
  });
  const arms = [-1, 1].map((sign) => {
    const arm = new THREE.Group();
    arm.position.set(sign * 0.79, 1.72, 0);
    body.add(arm);
    block(arm, [0.47, 0.34, 0.64], [0, 0, 0], 'green');
    block(arm, [0.4, 0.07, 0.64], [0, 0.19, 0], 'energy');
    block(arm, [0.28, 0.43, 0.34], [0, -0.34, 0], 'dark');
    block(arm, [0.37, 0.34, 0.44], [0, -0.51, 0.015], 'blue');
    block(arm, [0.24, 0.28, 0.06], [0, -0.51, 0.27], 'cyan');
    block(arm, [0.32, 0.24, 0.37], [0, -0.78, 0.03], 'darkBlue');
    return arm;
  });
  const rightArm = arms[0]!,
    leftArm = arms[1]!;
  const sword = new THREE.Group();
  sword.position.set(0, -0.84, 0.3);
  rightArm.add(sword);
  block(sword, [0.1, 0.3, 0.1], [0, 0, 0], 'darkBlue');
  block(sword, [0.4, 0.08, 0.17], [0, -0.13, 0], 'green');
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-0.11, -0.18);
  bladeShape.lineTo(0.11, -0.18);
  bladeShape.lineTo(0.11, -0.82);
  bladeShape.lineTo(0, -0.98);
  bladeShape.lineTo(-0.11, -0.82);
  bladeShape.closePath();
  const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.07, bevelEnabled: false });
  ownedGeometry.push(bladeGeometry);
  sword.add(new THREE.Mesh(bladeGeometry, materials.energy));
  block(sword, [0.035, 0.75, 0.018], [0, -0.6, 0.08], 'cyan');
  const shield = new THREE.Group();
  shield.position.set(0, -0.53, 0.36);
  leftArm.add(shield);
  const shieldShape = new THREE.Shape();
  shieldShape.moveTo(-0.43, 0.46);
  shieldShape.lineTo(0.43, 0.46);
  shieldShape.lineTo(0.43, -0.2);
  shieldShape.lineTo(0, -0.58);
  shieldShape.lineTo(-0.43, -0.2);
  shieldShape.closePath();
  const shieldGeometry = new THREE.ExtrudeGeometry(shieldShape, {
    depth: 0.12,
    bevelEnabled: false,
  });
  ownedGeometry.push(shieldGeometry);
  const shieldBorder = new THREE.Mesh(shieldGeometry, materials.energy);
  shield.add(shieldBorder);
  const shieldPlate = new THREE.Mesh(shieldGeometry, materials.darkBlue);
  shieldPlate.scale.set(0.88, 0.88, 1);
  shieldPlate.position.z = 0.045;
  shield.add(shieldPlate);
  const emblem = new THREE.Group();
  emblem.position.z = 0.19;
  shield.add(emblem);
  function setEmblem(pose: Pose) {
    emblem.clear();
    const line = (w: number, h: number, x: number, y: number, angle = 0) => {
      const mesh = block(emblem, [w, h, 0.025], [x, y, 0], 'energy');
      mesh.rotation.z = angle;
    };
    if (pose.shield === 'DOC') {
      line(0.035, 0.47, -0.17, 0.02);
      line(0.035, 0.47, 0.17, 0.02);
      line(0.36, 0.035, 0, 0.26);
      line(0.36, 0.035, 0, -0.22);
      for (let i = 0; i < 3; i++) line(0.2, 0.03, 0, 0.12 - i * 0.1);
    } else if (pose.shield === 'CODE') {
      line(0.23, 0.035, -0.14, 0.11, 0.85);
      line(0.23, 0.035, -0.14, -0.05, -0.85);
      line(0.23, 0.035, 0.14, 0.11, -0.85);
      line(0.23, 0.035, 0.14, -0.05, 0.85);
    } else {
      line(0.04, 0.43, -0.11, 0.03, -0.55);
      line(0.04, 0.43, 0.11, 0.03, 0.55);
      line(0.25, 0.035, 0, -0.05);
    }
  }
  // Capa segmentada: permite balanceo sin textura ni simulación física costosa.
  const cape = new THREE.Group();
  cape.position.set(0, 1.78, -0.4);
  body.add(cape);
  const capeStrips = Array.from({ length: 7 }, (_, i) => {
    const strip = new THREE.Group();
    strip.position.set((i - 3) * 0.16, 0, 0);
    cape.add(strip);
    block(strip, [0.14, 1.25, 0.035], [0, -0.57, -0.13], 'cape');
    for (let j = 0; j < 6; j++)
      block(
        strip,
        [0.03, 0.045, 0.02],
        [j % 2 ? 0.025 : -0.025, -0.14 - j * 0.18, -0.1],
        (i + j) % 3 ? 'green' : 'energy',
      );
    return strip;
  });
  const barrier = new THREE.Mesh(
    new THREE.PlaneGeometry(1.7, 2.3),
    new THREE.MeshBasicMaterial({
      color: '#00ffaa',
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ownedGeometry.push(barrier.geometry);
  barrier.position.set(0.5, 1.48, 0.87);
  root.add(barrier);
  const slash = new THREE.Mesh(
    new THREE.TorusGeometry(1.35, 0.035, 5, 48, Math.PI * 1.25),
    materials.energy,
  );
  ownedGeometry.push(slash.geometry);
  slash.position.set(-0.05, 1.5, 0.65);
  slash.rotation.z = -0.7;
  root.add(slash);
  let activePose: Pose;
  function setPose(pose: Pose) {
    activePose = pose;
    setEyes(pose);
    setEmblem(pose);
    shield.visible = pose.shield !== 'NONE';
    sword.visible = pose.action !== 'run';
    barrier.visible = pose.action === 'shield';
    slash.visible = pose.action === 'slash';
    materials.energy.color.set(pose.id === 2 ? '#ffb0b0' : '#70ffd0');
    materials.energy.emissive.set(pose.id === 2 ? '#ff5265' : '#00ffaa');
  }
  function update(time: number, delta: number, motion: boolean, patrol: boolean) {
    if (!activePose) return;
    const id = activePose.id;
    const run = activePose.action === 'run' || (patrol && id === 1);
    const t = motion ? time : 0;
    const phase = t * (7.4 + (id - 5) * 0.5) + id * 0.45;
    const wave = motion ? Math.sin(phase) : 0;
    const ease = motion ? Math.min(delta * 9, 1) : 1;
    const blend = (a: number, b: number) => THREE.MathUtils.lerp(a, b, ease);
    root.position.x = blend(root.position.x, run && motion ? Math.sin(t * 0.75) * 0.42 : 0);
    root.rotation.y = blend(
      root.rotation.y,
      run && motion ? Math.cos(t * 0.75) * 0.25 : Math.sin(t * 0.5) * (motion ? 0.08 : 0),
    );
    body.position.y = blend(
      body.position.y,
      run ? Math.abs(wave) * 0.07 : Math.sin(t * 1.9) * (motion ? 0.025 : 0),
    );
    body.rotation.z = blend(body.rotation.z, run ? -0.06 : id === 2 ? -0.06 : 0);
    head.rotation.z = blend(
      head.rotation.z,
      id === 3 ? 0.1 : id === 4 ? -0.1 : id === 2 ? -0.12 : 0,
    );
    head.rotation.y = blend(head.rotation.y, id === 5 && motion ? Math.sin(t) * 0.28 : 0);
    legs.forEach((leg, i) => {
      leg.rotation.x = blend(leg.rotation.x, run ? wave * 0.65 * (i === 0 ? 1 : -1) : 0);
    });
    const swordAngles: Record<number, number> = {
      9: -0.3,
      10: -2.35,
      11: motion ? -0.9 + Math.sin(t * 4) * 1.25 : 0.7,
      12: 1.2,
    };
    rightArm.rotation.z = blend(rightArm.rotation.z, swordAngles[id] ?? -0.45);
    rightArm.rotation.x = blend(
      rightArm.rotation.x,
      run ? -wave * 0.55 : id === 4 || id === 16 ? -0.4 : 0,
    );
    leftArm.rotation.x = blend(
      leftArm.rotation.x,
      run ? wave * 0.55 : activePose.action === 'shield' ? -0.65 : -0.08,
    );
    leftArm.rotation.z = blend(leftArm.rotation.z, id === 16 ? -0.18 : 0.12);
    capeStrips.forEach((strip, i) => {
      strip.rotation.x = blend(
        strip.rotation.x,
        (run ? 0.7 : 0.17) + (motion ? Math.sin(t * 3 + i * 0.6) * 0.11 : 0),
      );
    });
    slash.rotation.z = motion ? -t * 2.5 : -0.7;
    slash.scale.setScalar(motion ? 1 + Math.sin(t * 4) * 0.07 : 1);
    barrier.material.opacity = motion ? 0.055 + Math.sin(t * 3) * 0.02 : 0.06;
  }
  function dispose() {
    ownedGeometry.forEach((item) => item.dispose());
    Object.values(materials).forEach((material) => material.dispose());
    barrier.material.dispose();
  }
  return { root, setPose, update, dispose };
}
