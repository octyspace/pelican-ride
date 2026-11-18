import * as THREE from 'three';

// The sky is painted at the same aspect as the view, so the sun stays circular.
export function paintSky(aspect) {
  const c = document.createElement('canvas');
  c.height = 768;
  c.width = Math.max(1, Math.round(c.height * aspect));
  const ctx = c.getContext('2d');
  const W = c.width,
    H = c.height;
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.75);
  sky.addColorStop(0, '#94cbd7');
  sky.addColorStop(0.43, '#c3e1de');
  sky.addColorStop(0.82, '#e2e9d8');
  sky.addColorStop(1, '#f0ead5');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  const sunx = W * (aspect < 1 ? 0.84 : 0.78),
    suny = H * 0.155,
    sr = H * 0.054;
  const halo = ctx.createRadialGradient(sunx, suny, 0, sunx, suny, sr * 2.3);
  halo.addColorStop(0, 'rgba(255,239,179,.34)');
  halo.addColorStop(1, 'rgba(255,239,179,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(sunx - sr * 2.3, suny - sr * 2.3, sr * 4.6, sr * 4.6);
  ctx.fillStyle = '#fff1ca';
  ctx.beginPath();
  ctx.arc(sunx, suny, sr, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A single transparent painting supplies all four cloud silhouettes.
function paintCloud() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.translate(256, 96);
  ctx.scale(228, 228);
  const gradient = ctx.createLinearGradient(0, -0.27, 0, 0.08);
  gradient.addColorStop(0, '#fffbef');
  gradient.addColorStop(0.65, '#f4f6e9');
  gradient.addColorStop(1, '#d5e9e4');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(-1, 0.06);
  ctx.bezierCurveTo(-0.98, -0.025, -0.83, -0.04, -0.75, -0.025);
  ctx.bezierCurveTo(-0.7, -0.14, -0.6, -0.18, -0.46, -0.155);
  ctx.bezierCurveTo(-0.36, -0.4, -0.03, -0.4, 0.11, -0.195);
  ctx.bezierCurveTo(0.25, -0.246, 0.37, -0.157, 0.41, -0.079);
  ctx.bezierCurveTo(0.51, -0.13, 0.66, -0.111, 0.74, -0.045);
  ctx.bezierCurveTo(0.9, -0.043, 1.03, 0.013, 1.07, 0.062);
  ctx.bezierCurveTo(0.57, 0.095, -0.34, 0.11, -1, 0.06);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createCloudLayer() {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 1, 0, 0.1, 3);
  camera.position.z = 1;
  let aspect = 1;
  let travel = 0;
  const texture = paintCloud();
  const plane = new THREE.PlaneGeometry(1, 1);
  const placements = [
    [0.38, 0.127, 0.145, 0.76, false, 0.0034],
    [0.94, 0.21, 0.14, 0.78, true, 0.0038],
    [0.04, 0.3, 0.135, 0.47, false, 0.0026],
    [0.62, 0.245, 0.07, 0.42, true, 0.0021],
  ];
  const clouds = placements.map(([start, y, size, opacity, flip, rate]) => {
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity,
      toneMapped: false,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(plane, material);
    const width = (512 / 228) * size;
    mesh.scale.set(flip ? -width : width, (128 / 228) * size, 1);
    mesh.position.y = 1 - y + (32 / 228) * size;
    scene.add(mesh);
    return { mesh, start, rate, halfWidth: width * 0.5 };
  });
  function update(distance) {
    travel = distance;
    for (const { mesh, start, rate, halfWidth } of clouds) {
      const span = aspect + 2 * halfWidth;
      mesh.position.x =
        THREE.MathUtils.euclideanModulo(start * aspect + halfWidth - distance * rate, span) - halfWidth;
    }
  }
  function resize(newAspect) {
    aspect = newAspect;
    camera.right = aspect;
    camera.updateProjectionMatrix();
    update(travel);
  }
  resize(1);
  return { scene, camera, resize, update };
}

export function makeGulls() {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: '#648781', side: THREE.DoubleSide });
  const outline = new THREE.Shape();
  outline.moveTo(-1, 0.22);
  outline.quadraticCurveTo(-0.42, 0.35, 0, -0.035);
  outline.quadraticCurveTo(0.34, 0.31, 1, 0.25);
  outline.quadraticCurveTo(0.45, 0.21, 0.07, -0.105);
  outline.quadraticCurveTo(0, -0.17, -0.09, -0.095);
  outline.quadraticCurveTo(-0.5, 0.19, -1, 0.22);
  const geo = new THREE.ShapeGeometry(outline, 12);
  const birds = [
    [-3.2, 2.28, -7, 0.16, 0.12],
    [-2.71, 2.41, -7.6, 0.105, -0.08],
    [3.3, 2.22, -9.5, 0.11, 0.03],
  ];
  // Neighboring flocks let the travel offset wrap outside the widest camera view.
  const interval = 24;
  for (let tile = -2; tile <= 2; tile++) {
    const flock = new THREE.Group();
    flock.position.x = tile * interval;
    for (const [x, y, z, s, r] of birds) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.rotation.z = r;
      m.scale.setScalar(s);
      flock.add(m);
    }
    group.add(flock);
  }
  return {
    group,
    update(time, distance) {
      group.position.x = -THREE.MathUtils.euclideanModulo(distance * 0.19, interval);
      for (const flock of group.children) {
        flock.children.forEach((m, i) => {
          m.position.y = birds[i][1] + 0.044 * Math.sin(time * 0.45 + i);
          m.position.x = birds[i][0] + 0.22 * Math.sin(time * 0.16 + i);
          m.scale.y = birds[i][3] * (0.85 + 0.36 * Math.sin(time * 1.6 + i));
        });
      }
    },
  };
}
