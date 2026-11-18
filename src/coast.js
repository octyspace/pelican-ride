import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;
const WORLD_SEED = 3181;
const ROAD_TILE_LENGTH = 24;
const SEA_RADIUS = 17.6;

function randomSequence(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

// Bake the hand-placed scenery into a small number of draw calls.
function batch() {
  const positions = [],
    normals = [],
    colors = [],
    indices = [];
  const vector = new THREE.Vector3(),
    normalMatrix = new THREE.Matrix3();
  const matrix = new THREE.Matrix4(),
    quaternion = new THREE.Quaternion();
  function add(geo, color, position = V(0, 0, 0), scale = V(1, 1, 1), rotation) {
    if (rotation instanceof THREE.Quaternion) quaternion.copy(rotation);
    else if (rotation) quaternion.setFromEuler(rotation);
    else quaternion.identity();
    matrix.compose(position, quaternion, scale);
    normalMatrix.getNormalMatrix(matrix);
    const base = positions.length / 3;
    const p = geo.attributes.position,
      n = geo.attributes.normal;
    const c = new THREE.Color(color);
    for (let j = 0; j < p.count; j++) {
      vector.fromBufferAttribute(p, j).applyMatrix4(matrix);
      positions.push(vector.x, vector.y, vector.z);
      vector.fromBufferAttribute(n, j).applyNormalMatrix(normalMatrix);
      normals.push(vector.x, vector.y, vector.z);
      colors.push(c.r, c.g, c.b);
    }
    if (geo.index) for (let j = 0; j < geo.index.count; j++) indices.push(base + geo.index.getX(j));
    else for (let j = 0; j < p.count; j++) indices.push(base + j);
  }
  function mesh(material, cast = false, receive = true) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.setIndex(indices);
    const result = new THREE.Mesh(g, material);
    result.castShadow = cast;
    result.receiveShadow = receive;
    return result;
  }
  return { add, mesh };
}

function landCrossSection() {
  const profile = [
    [-4.05, -0.28, '#eacbae'],
    [-3.65, -0.18, '#efcfa5'],
    [-2.98, -0.025, '#e8c899'],
    [-2.77, 0.038, '#c1c094'],
    [-2.55, 0.08, '#a7b887'],
    [-2.17, 0.09, '#adc08b'],
    [-1.91, 0.065, '#bfd09a'],
    [-1.76, 0.028, '#d0cc98'],
    [-1.66, -0.006, '#ecd4a7'],
    [-1.44, -0.006, '#ead0a2'],
    [-1.1, -0.006, '#e9c998'],
    [0.02, -0.006, '#e9c997'],
    [1.1, -0.006, '#eaca9a'],
    [1.45, -0.006, '#edd1a6'],
    [1.69, -0.006, '#eed6ad'],
    [1.8, 0.016, '#cccb96'],
    [1.96, 0.06, '#c0ca91'],
    [2.38, 0.08, '#b7c88c'],
    [3.05, 0.09, '#acbe81'],
    [4.15, 0.1, '#b3c38c'],
    [6.2, 0.08, '#c0cf98'],
    [65, 0.04, '#b5c594'],
  ];
  const pos = [],
    colors = [],
    ix = [];
  const segments = 48;
  for (let i = 0; i <= segments; i++) {
    const x = ROAD_TILE_LENGTH * (i / segments - 0.5);
    const phase = (TAU * x) / ROAD_TILE_LENGTH;
    for (let j = 0; j < profile.length; j++) {
      const [z, h, c] = profile[j];
      const edge = Math.min(1, Math.max(0, (Math.abs(z) - 1.36) * 1.9));
      const bend =
        (0.1 * Math.sin(4 * phase + 0.2 * z) +
          0.083 * Math.sin(2 * phase + z) +
          0.05 * Math.cos(8 * phase)) *
        edge;
      const y = h + edge * 0.023 * Math.sin(4 * phase + z);
      pos.push(x, y, z + bend);
      const rgb = new THREE.Color(c).multiplyScalar(1 + edge * 0.019 * Math.sin(3 * phase + 0.6 * z));
      colors.push(rgb.r, rgb.g, rgb.b);
      if (i > 0 && j > 0) {
        const d = i * profile.length + j,
          a = d - profile.length - 1,
          b = d - profile.length,
          e = d - 1;
        ix.push(a, b, e, b, d, e);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(ix);
  g.computeVertexNormals();
  return g;
}

function waterDisc() {
  const bands = [
    [0, '#78c5b4'],
    [3.6, '#78c5b4'],
    [4.3, '#71c4b5'],
    [7.5, '#84cec3'],
    [11, '#94d3c9'],
    [15, '#b2dcd2'],
    [SEA_RADIUS, '#c0e2d6'],
  ];
  const pos = [],
    colors = [],
    ix = [];
  for (let row = 0; row < bands.length; row++) {
    const [radius, hex] = bands[row];
    const c = new THREE.Color(hex);
    for (let j = 0; j <= 160; j++) {
      const a = (j * TAU) / 160;
      pos.push(radius * Math.cos(a), -0.27, radius * Math.sin(a));
      colors.push(c.r, c.g, c.b);
      if (row > 0 && j > 0) {
        const d = row * 161 + j,
          b = d - 161,
          e = d - 1;
        ix.push(b - 1, b, e, b, d, e);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(ix);
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
}

function leafGeometry() {
  const g = new THREE.BufferGeometry();
  const positions = [
    -0.3, 0, 0, 0, 0, 0.13, 0.3, 0, 0, -0.46, 0.43, 0.06, 0, 0.48, 0.25, 0.46, 0.42, 0.07, -0.25, 0.78,
    0.23, 0, 0.78, 0.31, 0.25, 0.78, 0.23, 0.04, 1, 0.45,
  ];
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex([0, 1, 3, 1, 4, 3, 1, 2, 4, 2, 5, 4, 3, 4, 6, 4, 7, 6, 4, 5, 7, 5, 8, 7, 6, 7, 9, 7, 8, 9]);
  g.computeVertexNormals();
  return g;
}

export function createCoast() {
  const group = new THREE.Group();
  group.name = 'Coastal promenade';
  const solid = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    side: THREE.DoubleSide,
  });
  const unlit = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const sphere = new THREE.SphereGeometry(1, 12, 8),
    cube = new THREE.BoxGeometry(1, 1, 1);
  const rock = new THREE.IcosahedronGeometry(1, 1);
  // Slightly rounded facets keep small beach pebbles distinct in oblique light.
  const rpos = rock.attributes.position,
    rnormal = rock.attributes.normal;
  for (let i = 0; i < rpos.count; i++) {
    const a = V(0, 0, 0).fromBufferAttribute(rpos, i),
      n = V(0, 0, 0).fromBufferAttribute(rnormal, i);
    n.lerp(a.clone().normalize(), 0.64).normalize();
    rnormal.setXYZ(i, n.x, n.y, n.z);
    a.x *= 1 + 0.06 * Math.sin(a.z * 3 + a.y * 5);
    a.z *= 1 + 0.08 * Math.cos(a.x * 3.5 + a.y);
    a.y = Math.max(-0.69, a.y);
    rpos.setXYZ(i, a.x, a.y, a.z);
  }
  const segment = new THREE.CylinderGeometry(1, 1, 1, 8),
    leaf = leafGeometry();
  const spin = (x, y, z) => new THREE.Euler(x, y, z);
  const ball = (b, c, x, y, z, sx, sy, sz, angle = 0) =>
    b.add(sphere, c, V(x, y, z), V(sx, sy, sz), spin(0, angle, 0));
  const stone = (b, c, x, y, z, sx, sy, sz, angle) =>
    b.add(rock, c, V(x, y, z), V(sx, sy, sz), spin(0, angle, 0));
  function rod(b, c, start, end, width, depth = width, square = false) {
    const v = end.clone().sub(start),
      rot = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), v.clone().normalize());
    b.add(square ? cube : segment, c, start.clone().lerp(end, 0.5), V(width, v.length(), depth), rot);
  }
  function cylinder(b, c, x, y, z, top, bottom, height, sides = 24) {
    const g = new THREE.CylinderGeometry(top, bottom, height, sides);
    b.add(g, c, V(x, y, z));
    g.dispose();
  }
  const ground = new THREE.Mesh(landCrossSection(), solid);
  ground.receiveShadow = true;
  group.add(waterDisc());

  // A little outlying lighthouse on a grass-capped headland.
  const island = new THREE.Group();
  island.name = 'lighthouse-island';
  island.position.set(1.45, -0.05, -8.0);
  island.scale.setScalar(0.77);
  const house = batch();
  const islandRocks = [
    [-0.6, 0.03, 0.04, 0.8, 0.36, 0.65, '#a6a99a'],
    [0.3, 0.03, -0.08, 0.99, 0.44, 0.68, '#a8ac9b'],
    [0.68, -0.075, 0.29, 0.7, 0.29, 0.41, '#b6afa0'],
    [-0.15, -0.1, 0.52, 0.64, 0.22, 0.3, '#c5bdab'],
    [-1.12, -0.14, 0.15, 0.45, 0.21, 0.35, '#b8b4a4'],
    [1.18, -0.17, 0.14, 0.48, 0.21, 0.38, '#b9b4a6'],
    [-1.61, -0.22, 0.43, 0.26, 0.12, 0.17, '#bcc1af'],
    [1.51, -0.22, 0.53, 0.22, 0.11, 0.19, '#c9c4b5'],
  ];
  islandRocks.forEach(([x, y, z, sx, sy, sz, c], i) => stone(house, c, x, y, z, sx, sy, sz, i * 1.72));
  ball(house, '#a3b790', 0.04, 0.24, -0.1, 1.19, 0.19, 0.64);
  ball(house, '#b5c39a', -0.24, 0.28, -0.12, 1.0, 0.13, 0.5);
  const cx = 0.15,
    cz = -0.11,
    base = 0.37;
  cylinder(house, '#d4c6ac', cx, base + 0.012, cz, 0.36, 0.38, 0.1);
  cylinder(house, '#e8debd', cx, base + 0.082, cz, 0.31, 0.34, 0.085);
  const levels = [
    [0, 0.4, '#f0e6cc'],
    [0.4, 0.74, '#c36e51'],
    [0.74, 1.07, '#f1e7d3'],
    [1.07, 1.38, '#c97659'],
    [1.38, 1.49, '#ede0c4'],
  ];
  for (const [a, b, c] of levels) {
    const radius = (y) => 0.294 - (0.083 * y) / 1.49;
    cylinder(house, c, cx, base + 0.11 + (a + b) / 2, cz, radius(b), radius(a), b - a);
  }
  const deck = base + 1.62;
  cylinder(house, '#375852', cx, deck, cz, 0.325, 0.293, 0.07);
  cylinder(house, '#49655b', cx, deck + 0.05, cz, 0.333, 0.333, 0.03);
  for (let i = 0; i < 12; i++) {
    const a = (i * TAU) / 12,
      b = ((i + 1) * TAU) / 12;
    const point = (t, y) => V(cx + 0.302 * Math.cos(t), deck + y, cz + 0.302 * Math.sin(t));
    rod(house, '#48645e', point(a, 0.055), point(a, 0.185), 0.01);
    rod(house, '#48645e', point(a, 0.183), point(b, 0.183), 0.012);
  }
  cylinder(house, '#eddfb6', cx, deck + 0.18, cz, 0.153, 0.153, 0.23, 10);
  for (let i = 0; i < 8; i++) {
    const a = (i * TAU) / 8;
    rod(
      house,
      '#455f59',
      V(cx + 0.159 * Math.cos(a), deck + 0.07, cz + 0.159 * Math.sin(a)),
      V(cx + 0.159 * Math.cos(a), deck + 0.34, cz + 0.159 * Math.sin(a)),
      0.019,
    );
  }
  cylinder(house, '#365c55', cx, deck + 0.335, cz, 0.224, 0.216, 0.045, 12);
  cylinder(house, '#456b60', cx, deck + 0.42, cz, 0.033, 0.249, 0.145, 12);
  ball(house, '#d1ac69', cx, deck + 0.506, cz, 0.028, 0.033, 0.028);
  house.add(cube, '#e1caae', V(cx, base + 0.266, cz + 0.28), V(0.152, 0.31, 0.03));
  house.add(cube, '#57746b', V(cx, base + 0.249, cz + 0.299), V(0.103, 0.258, 0.02));
  for (const [y, r] of [
    [0.84, 0.25],
    [1.42, 0.218],
  ]) {
    house.add(cube, '#eddcb9', V(cx, base + y, cz + r), V(0.094, 0.142, 0.024));
    house.add(cube, '#4f6d64', V(cx, base + y, cz + r + 0.013), V(0.064, 0.102, 0.015));
  }
  for (const [x, z, s] of [
    [-0.77, -0.1, 0.7],
    [0.8, -0.17, 0.9],
    [0.74, 0.03, 0.63],
    [-0.76, 0.11, 0.52],
  ]) {
    ball(house, '#849f80', x, 0.3, z, 0.21 * s, 0.2 * s, 0.14 * s);
  }
  const shoreLight = new THREE.Group();
  const towerMaterial = solid.clone();
  const islandMesh = house.mesh(towerMaterial, true);
  island.add(islandMesh);
  shoreLight.add(island);
  group.add(shoreLight);

  // Short tapered strokes on the open water form small shoals of reflections.
  function rippleGeometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [-1, 0, 0, -0.54, 0, 0.5, 0.18, 0, 0.42, 1, 0, 0.12, 0.34, 0, -0.35, -0.35, 0, -0.38],
        3,
      ),
    );
    g.setIndex([0, 1, 5, 1, 2, 5, 2, 4, 5, 2, 3, 4]);
    g.computeVertexNormals();
    return g;
  }
  const ripple = rippleGeometry(),
    waterRng = randomSequence(706);
  // Each depth band moves at its own rate. Strokes shrink gently at the edge
  // of the water disc before the instance wraps to its opposite side.
  const waveData = [];
  function addWave(x, z, width, depth, heading, tint) {
    const limit = Math.sqrt(SEA_RADIUS ** 2 - z ** 2) - width - 0.25;
    waveData.push({
      x,
      z,
      width,
      depth,
      heading,
      tint,
      limit,
      rate: THREE.MathUtils.lerp(0.12, 0.47, (z + 16.8) / 12.8),
    });
  }
  for (let i = 0; i < 114; i++) {
    const z = -4.1 - 12.5 * waterRng();
    const limit = Math.sqrt(SEA_RADIUS ** 2 - z ** 2) - 1;
    const x = (2 * waterRng() - 1) * limit;
    const size = 0.12 + 0.4 * waterRng();
    addWave(
      x,
      z,
      size,
      0.055 + waterRng() * 0.14,
      -0.23 + 0.45 * waterRng(),
      waterRng() < 0.2 ? '#b3ddd0' : '#d1e9dc',
    );
    if (waterRng() < 0.36) addWave(x + 0.28, z + 0.13, size * 0.46, 0.053, 0, '#c5e4d7');
  }
  const waterMarks = new THREE.InstancedMesh(
    ripple,
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
    waveData.length,
  );
  waterMarks.name = 'Moving sea ripples';
  waterMarks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  waterMarks.frustumCulled = false;
  waveData.forEach((wave, i) => waterMarks.setColorAt(i, new THREE.Color(wave.tint)));
  group.add(waterMarks);
  const stamp = new THREE.Object3D();
  function updateWaves(distance, time) {
    for (let i = 0; i < waveData.length; i++) {
      const { x, z, width, depth, limit, heading, rate } = waveData[i];
      const progress = x + limit - distance * rate;
      const currentX = THREE.MathUtils.euclideanModulo(progress, 2 * limit) - limit;
      const fade = THREE.MathUtils.smoothstep(limit - Math.abs(currentX), 0, 0.95);
      stamp.position.set(currentX, -0.252, z + 0.057 * Math.sin(time * 0.32 + z));
      stamp.scale.set(width * fade, 1, depth * fade);
      stamp.rotation.y = heading;
      stamp.updateMatrix();
      waterMarks.setMatrixAt(i, stamp.matrix);
    }
    waterMarks.instanceMatrix.needsUpdate = true;
  }
  const surf = batch();
  for (let i = 0; i < 34; i++) {
    const x = ROAD_TILE_LENGTH * (i / 34 - 0.5);
    const phase = (TAU * x) / ROAD_TILE_LENGTH;
    const z = -4.0 + 0.09 * Math.sin(4 * phase - 0.8) + 0.08 * Math.sin(2 * phase - 4);
    surf.add(
      ripple,
      i % 3 ? '#e4e9d5' : '#d4e5d0',
      V(x, -0.247, z),
      V(0.22 + waterRng() * 0.36, 1, 0.1 + waterRng() * 0.22),
    );
  }
  const beachFoam = surf.mesh(unlit, false, false);
  const glints = batch();
  // The island and its reflections travel together.
  for (let i = 0; i < 14; i++) {
    const dx = 0.73 * Math.sin(i * 2.32),
      z = -7.73 + i * 0.095;
    glints.add(
      ripple,
      i % 4 === 0 ? '#98c3ad' : '#a6d3bf',
      V(1.52 + dx, -0.248, z),
      V(0.17 + 0.11 * Math.cos(i), 1, 0.094),
      spin(0, 0.03, 0),
    );
  }
  const glintMaterial = unlit.clone();
  shoreLight.add(glints.mesh(glintMaterial, false, false));

  const decor = batch(),
    sand = batch(),
    rnd = randomSequence(WORLD_SEED);
  const greens = ['#78946f', '#8aa67b', '#9aaf7c', '#96a674', '#b1bd83', '#819d70'];
  const pebbles = ['#a5a692', '#cec4a8', '#b8ae98', '#c2b6a0', '#999e8d'];
  function tuft(x, y, z, s) {
    const turn = rnd() * TAU;
    for (let i = 0; i < 6; i++) {
      const a = turn + i * 2.4,
        h = s * (0.64 + rnd() * 0.58),
        spread = 0.1 + rnd() * 0.35;
      const rot = new THREE.Euler(spread, a, -0.07 - rnd() * 0.15, 'YXZ');
      decor.add(
        leaf,
        greens[Math.floor(rnd() * greens.length)],
        V(x + 0.035 * Math.sin(a), y, z + 0.035 * Math.cos(a)),
        V(h * 0.34, h, h * 0.39),
        rot,
      );
    }
  }
  function daisy(x, y, z, h, orange = false) {
    const tx = x + 0.12 * h,
      tz = z + 0.16 * h;
    rod(decor, '#8b9c68', V(x, y, z), V(tx, y + h, tz), 0.014);
    decor.add(leaf, '#96ae79', V(x, y + 0.04, z), V(h * 0.22, h * 0.43, h * 0.18), spin(0.32, 0.8, -0.45));
    const center = V(tx, y + h, tz),
      radius = 0.045 + h * 0.09;
    // Faces tilt toward the visitor so the five petals read even at small sizes.
    for (let j = 0; j < 5; j++) {
      const a = (j * TAU) / 5,
        e = radius * 0.74;
      const pos = center.clone().add(V(Math.cos(a) * e, Math.sin(a) * e * 0.82, -Math.sin(a) * e * 0.46));
      decor.add(
        sphere,
        orange ? '#ebc16c' : '#faf0ca',
        pos,
        V(radius * 0.77, radius * 0.5, radius * 0.32),
        spin(-0.48, 0, a),
      );
    }
    ball(
      decor,
      orange ? '#c89a4f' : '#dca551',
      tx,
      y + h + 0.004,
      tz + 0.018,
      radius * 0.43,
      radius * 0.37,
      radius * 0.28,
    );
  }
  for (let i = 0; i < 12; i++) {
    const x = -11.5 + i * 2 + (rnd() - 0.5) * 0.67;
    for (let side = 0; side < 2; side++) {
      const z = side ? 2.0 + rnd() * 0.89 : -2.0 - rnd() * 0.75,
        y = 0.055;
      const size = 0.13 + rnd() * 0.25;
      stone(
        decor,
        pebbles[(i * 2 + side) % pebbles.length],
        x,
        y + 0.008,
        z,
        size * 1.35,
        size * 0.6,
        size,
        rnd() * TAU,
      );
      if (i % 4 !== 0) {
        stone(
          decor,
          pebbles[(i + side + 2) % pebbles.length],
          x + size * 1.47,
          y,
          z + 0.06,
          size * 0.57,
          size * 0.34,
          size * 0.5,
          rnd() * TAU,
        );
      }
      tuft(x - size * 0.88, y, z + size * 0.26, 0.17 + rnd() * 0.28);
      if ((i + side) % 2 === 0) tuft(x + 0.42, y, z + 0.15, 0.15 + rnd() * 0.23);
      if ((i + 2 * side) % 3 === 0)
        for (let j = 0; j < 3; j++)
          daisy(
            x + 0.24 + j * 0.105,
            y,
            z + Math.sin(j * 2) * 0.11,
            0.24 + rnd() * 0.15,
            (i + side) % 3 === 1,
          );
    }
  }
  for (let i = 0; i < 33; i++) {
    const x = -11.7 + rnd() * 23.4,
      sgn = rnd() > 0.5 ? 1 : -1,
      z = sgn * (1.02 + 0.52 * rnd());
    const w = 0.03 + 0.043 * rnd();
    stone(decor, '#c7ae89', x, 0.002, z, w, 0.01 + 0.007 * rnd(), w * 0.52, rnd() * TAU);
    if (i % 3 === 0) stone(decor, '#cbb591', x + 0.14, 0.001, z + 0.03, w * 0.47, 0.005, w * 0.4, 0.75);
  }
  for (let i = 0; i < 56; i++) {
    const x = -11.7 + rnd() * 23.4,
      z = (rnd() - 0.5) * 3.2;
    sand.add(
      ripple,
      rnd() < 0.29 ? '#dfbe91' : '#eed3a9',
      V(x, -0.003, z),
      V(0.05 + rnd() * 0.2, 1, 0.025 + rnd() * 0.042),
      spin(0, 0.17 - rnd() * 0.34, 0),
    );
  }
  // Bleached timber stretches are separated by openings to the beach.
  for (const [start, span, count] of [
    [-10.6, 3.5, 3],
    [-3.45, 3.64, 3],
    [4.9, 3.1, 3],
  ]) {
    let last = null;
    for (let i = 0; i < count; i++) {
      const x = start + (span * i) / (count - 1),
        z = -2.46 + (rnd() - 0.5) * 0.13;
      const foot = V(x, 0.035, z),
        top = V(x + (rnd() - 0.5) * 0.052, 0.48 + rnd() * 0.077, z + (rnd() - 0.5) * 0.065);
      rod(decor, '#d6c9a6', foot, top, 0.093, 0.102, true);
      if (last) {
        const at = (p, q, t) => p.clone().lerp(q, t);
        rod(decor, '#d4c3a1', at(last.foot, last.top, 0.76), at(foot, top, 0.76), 0.064, 0.047, true);
        rod(decor, '#c8ba9a', at(last.foot, last.top, 0.37), at(foot, top, 0.37), 0.052, 0.039, true);
      }
      last = { foot, top };
    }
  }
  const traveler = new THREE.Group();
  const decoration = decor.mesh(solid, true),
    roadMarks = sand.mesh(solid, false, true);
  for (let i = -2; i <= 2; i++) {
    const tile = new THREE.Group();
    tile.add(ground.clone(), beachFoam.clone(), decoration.clone(), roadMarks.clone());
    tile.position.x = i * ROAD_TILE_LENGTH;
    traveler.add(tile);
  }
  group.add(traveler);
  return {
    group,
    update(distance = 0, time = 0) {
      traveler.position.x = -THREE.MathUtils.euclideanModulo(distance, ROAD_TILE_LENGTH);
      updateWaves(distance, time);
      // Recycle the landmark beyond the misty edge of the bay, where it is invisible.
      const x = 18 - THREE.MathUtils.euclideanModulo(18 - 1.45 + distance * 0.28, 36);
      shoreLight.position.x = x - 1.45;
      const visibility = 1 - THREE.MathUtils.smoothstep(Math.abs(x), 11.9, 14.8);
      shoreLight.visible = visibility > 0;
      const fading = visibility < 1;
      for (const material of [towerMaterial, glintMaterial]) {
        if (material.transparent !== fading) {
          material.transparent = fading;
          material.needsUpdate = true;
        }
        material.opacity = visibility;
      }
    },
  };
}
