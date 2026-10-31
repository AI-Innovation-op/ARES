import * as THREE from 'three';
export function createVoxelEffects() {
  const root = new THREE.Group();
  root.name = 'ares-voxel-effects';
  const atlas = document.createElement('canvas');
  atlas.width = 512;
  atlas.height = 64;
  const ctx = atlas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 46px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  [...'01{}<>/;'].forEach((glyph, index) => ctx.fillText(glyph, index * 64 + 32, 32));
  const texture = new THREE.CanvasTexture(atlas);
  texture.minFilter = THREE.LinearFilter;
  const vertices: number[] = [],
    uv: number[] = [],
    seeds: number[] = [],
    indices: number[] = [];
  for (let column = 0; column < 16; column++)
    for (let row = 0; row < 9; row++) {
      const index = vertices.length / 3,
        x = (column - 7.5) * 0.17,
        y = row * 0.21;
      vertices.push(x, y, 0, x + 0.085, y, 0, x + 0.085, y + 0.11, 0, x, y + 0.11, 0);
      uv.push(0, 0, 1, 0, 1, 1, 0, 1);
      for (let corner = 0; corner < 4; corner++)
        seeds.push(column * 0.73, 0.26 + (column % 5) * 0.055, (column * 3 + row) % 8, row / 9);
      indices.push(index, index + 1, index + 2, index, index + 2, index + 3);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('seed', new THREE.Float32BufferAttribute(seeds, 4));
  geometry.setIndex(indices);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { time: { value: 0 }, atlas: { value: texture } },
    vertexShader: `attribute vec4 seed; uniform float time; varying vec2 glyphUV; varying float fade; void main(){vec3 p=position;p.y=mod(p.y-time*seed.y+seed.x,2.4)+.25;glyphUV=vec2((uv.x+seed.z)/8.,uv.y);fade=.18+.55*seed.w;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `uniform sampler2D atlas;varying vec2 glyphUV;varying float fade;void main(){float a=texture2D(atlas,glyphUV).a;gl_FragColor=vec4(.08,1.,.62,a*fade);}`,
  });
  const rain = new THREE.Mesh(geometry, material);
  rain.position.z = -0.75;
  rain.name = 'matrix-rain';
  root.add(rain);
  const arcs: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[] = [];
  for (let layer = 0; layer < 3; layer++) {
    const points: number[] = [],
      triangles: number[] = [];
    for (let i = 0; i <= 40; i++) {
      const angle = (i / 40) * Math.PI * 1.12,
        inner = 1.15 + layer * 0.14,
        outer = inner + 0.035 + (1 - i / 40) * 0.045;
      points.push(
        Math.cos(angle) * inner,
        Math.sin(angle) * inner,
        0,
        Math.cos(angle) * outer,
        Math.sin(angle) * outer,
        0,
      );
      if (i < 40) {
        const n = i * 2;
        triangles.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
      }
    }
    const shape = new THREE.BufferGeometry();
    shape.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    shape.setIndex(triangles);
    const glow = new THREE.MeshBasicMaterial({
      color: layer === 0 ? '#baffdf' : layer === 1 ? '#25ffb1' : '#39caff',
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const arc = new THREE.Mesh(shape, glow);
    arc.position.set(0, 1.55, 0.65 + layer * 0.04);
    arc.rotation.x = 0.18;
    arc.visible = false;
    root.add(arc);
    arcs.push(arc);
  }
  let remaining = 0;
  return {
    root,
    trigger() {
      remaining = 1.15;
    },
    update(time: number, delta: number, motion: boolean) {
      material.uniforms.time!.value = time;
      rain.visible = motion;
      if (!motion) remaining = 0;
      remaining = Math.max(0, remaining - delta);
      arcs.forEach((arc, index) => {
        arc.visible = motion && remaining > 0;
        arc.material.opacity = Math.min(0.85, remaining) * (0.8 - index * 0.18);
        arc.rotation.z = -1.4 + (1.15 - remaining) * 5 - index * 0.2;
        arc.scale.setScalar(1 + (1.15 - remaining) * 0.1);
      });
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      texture.dispose();
      arcs.forEach((arc) => {
        arc.geometry.dispose();
        arc.material.dispose();
      });
    },
  };
}
