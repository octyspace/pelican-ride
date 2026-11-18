import * as THREE from 'three';

// Every section describes a transverse slice through the sculpt, from tail to tip.
// Interpolating full slices keeps the silhouette and its highlights continuous.
function sculpt(sections, sides = 32, subdivisions = 5) {
  const positions = [];
  const indices = [];
  const sample = (i, k, t) => {
    const p0 = sections[Math.max(0, i - 1)][k];
    const p1 = sections[i][k];
    const p2 = sections[i + 1][k];
    const p3 = sections[Math.min(sections.length - 1, i + 2)][k];
    return p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * p1 - p0 - 3 * p2 + p3)));
  };
  const rings = (sections.length - 1) * subdivisions + 1;
  for (let r = 0; r < rings; r++) {
    const i = Math.min(Math.floor(r / subdivisions), sections.length - 2);
    const t = r / subdivisions - i;
    const x = sample(i, 0, t);
    const bottom = sample(i, 1, t);
    const top = sample(i, 2, t);
    const width = Math.max(0.001, sample(i, 3, t));
    const centerZ = sections[0].length > 4 ? sample(i, 4, t) : 0;
    for (let j = 0; j < sides; j++) {
      const a = (j * Math.PI * 2) / sides;
      positions.push(
        x,
        (top + bottom) / 2 + ((top - bottom) / 2) * Math.sin(a),
        centerZ + width * Math.cos(a),
      );
      const n = (j + 1) % sides;
      if (r < rings - 1) {
        const here = r * sides;
        const next = here + sides;
        indices.push(here + j, next + j, here + n, here + n, next + j, next + n);
      }
    }
  }
  for (let j = 1; j < sides - 1; j++) {
    const last = (rings - 1) * sides;
    indices.push(0, j, j + 1, last, last + j + 1, last + j);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createPelican(gripContacts) {
  const group = new THREE.Group();
  group.name = 'Pelican cyclist';
  const plumage = new THREE.Group();
  group.add(plumage);
  const pigment = (color, roughness = 0.78) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
  const ivory = pigment('#fff0cc');
  const feather = pigment('#f6e7c5');
  const wingIvory = pigment('#e9daba');
  const lighterFeather = pigment('#f5e7c9');
  const gray = pigment('#515b59');
  const dark = pigment('#343d3e');
  const slate = pigment('#69716a');
  const pouch = pigment('#f39a47');
  const bill = pigment('#ffc471');
  const lip = pigment('#ad6034');
  const nostril = pigment('#ab723e');
  const skin = pigment('#e99448');
  const footColor = pigment('#ed9949');
  const pale = pigment('#fff7dd');
  const eyeColor = pigment('#222a27', 0.28);
  const kerchief = pigment('#ce4e33');
  const kerchiefLight = pigment('#e86540');
  const sphere = new THREE.SphereGeometry(1, 32, 24);
  const linkGeometry = new THREE.CylinderGeometry(1, 1, 1, 16);
  const add = (parent, geometry, material) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const egg = (parent, material, x, y, z, sx, sy, sz, tilt = 0) => {
    const mesh = add(parent, sphere, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.z = tilt;
    return mesh;
  };
  const form = (parent, sections, material) => add(parent, sculpt(sections), material);
  // A vertically lofted shape uses the same sculptor with its section plane rotated.
  const upright = (parent, sections, material) => {
    const mesh = form(
      parent,
      sections.map(([y, left, right, width]) => [y, -right, -left, width]),
      material,
    );
    mesh.rotation.z = Math.PI / 2;
    return mesh;
  };

  // Long folded tail and separate, rounded primary feather tips.
  for (const [z, length, material] of [
    [0, 0.88, dark],
    [0.12, 0.76, gray],
    [-0.12, 0.76, gray],
    [0.21, 0.61, slate],
    [-0.21, 0.61, slate],
  ]) {
    const tail = form(
      plumage,
      [
        [-length, 0.01, 0.016, 0.012],
        [-length + 0.1, -0.015, 0.05, 0.074],
        [-0.22, -0.065, 0.085, 0.122],
        [0, -0.008, 0.045, 0.044],
      ],
      material,
    );
    tail.position.set(-0.89, 2.29, z);
    tail.rotation.z = -0.17;
    tail.rotation.y = z * 0.6;
  }
  upright(
    plumage,
    [
      [1.7, -0.5, -0.46, 0.016],
      [1.76, -0.72, -0.19, 0.245],
      [1.92, -0.94, 0.09, 0.373],
      [2.12, -1.15, 0.254, 0.442],
      [2.29, -1.39, 0.325, 0.463],
      [2.38, -1.43, 0.35, 0.443],
      [2.5, -1.18, 0.36, 0.408],
      [2.61, -0.96, 0.36, 0.362],
      [2.68, -0.71, 0.357, 0.319],
      [2.72, -0.41, 0.353, 0.277],
      [2.77, -0.19, 0.342, 0.241],
      [2.85, -0.083, 0.332, 0.216],
      [3.05, -0.08, 0.32, 0.205],
      [3.24, -0.065, 0.33, 0.19],
      [3.34, 0.02, 0.25, 0.13],
    ],
    ivory,
  );

  // The grip stays planted while the shoulder follows the body through each pedal stroke.
  const farPlumage = pigment('#cfc5ab');
  const steeringWings = gripContacts.map((contact) => {
    const side = Math.sign(contact.z);
    const near = side > 0;
    const wing = new THREE.Group();
    wing.name = near ? 'Near steering wing' : 'Far steering wing';
    wing.position.copy(contact);
    group.add(wing);

    // Rise over the far grip and bend the near elbow lower to keep both outlines visible side-on.
    const arch = near ? 0 : 0.26;
    const dx = contact.x,
      dy = contact.y,
      dz = Math.abs(contact.z);
    function vane(sections, material) {
      const local = sections.map(([x, bottom, top, width, z]) => [
        x - dx,
        bottom - dy,
        top - dy,
        width,
        side * (z - dz),
      ]);
      return form(wing, local, material);
    }
    vane(
      [
        [-0.84, 2.46, 2.48, 0.015, 0.31],
        [-0.65, 2.3, 2.55, 0.095, 0.35],
        [-0.44, 2.18, 2.54, 0.124, 0.415],
        [-0.2, 2.04 + arch * 0.4, 2.44 + arch * 0.25, 0.131, 0.47],
        [0.04, 1.98 + arch * 0.82, 2.3 + arch * 0.83, 0.117, 0.49],
        [0.28, 1.964 + arch, 2.18 + arch, 0.097, 0.465],
        [0.53, 1.966 + arch * 0.78, 2.095 + arch * 0.91, 0.084, 0.406],
        [dx - 0.14, dy + 0.034 + arch * 0.24, dy + 0.111 + arch * 0.38, 0.065, dz + 0.058],
        [dx - 0.025, dy - 0.008, dy + 0.052, 0.054, dz + 0.012],
        [dx + 0.049, dy - 0.003, dy + 0.022, 0.032, dz - 0.008],
        [dx + 0.068, dy + 0.002, dy + 0.012, 0.01, dz - 0.012],
      ],
      near ? wingIvory : farPlumage,
    );
    // Two overlapping coverts model the shoulder as a feathered wing.
    for (const i of [0, 1]) {
      const shift = i * 0.072;
      vane(
        [
          [-0.65 + shift, 2.425 - shift, 2.437 - shift, 0.012, 0.403],
          [-0.48 + shift, 2.323 - shift, 2.425 - shift, 0.04, 0.504],
          [-0.24 + shift, 2.22 - shift + arch * 0.36, 2.33 - shift + arch * 0.36, 0.039, 0.558],
          [-0.01 + shift, 2.151 - shift + arch * 0.78, 2.207 - shift + arch * 0.78, 0.028, 0.575],
          [0.16 + shift, 2.136 - shift + arch * 0.99, 2.149 - shift + arch * 0.99, 0.01, 0.539],
        ],
        near ? (i ? lighterFeather : feather) : farPlumage,
      );
    }
    return wing;
  });

  upright(
    plumage,
    [
      [2.75, -0.098, 0.325, 0.201],
      [2.77, -0.122, 0.362, 0.237],
      [2.8, -0.141, 0.372, 0.245],
      [2.88, -0.111, 0.359, 0.239],
      [2.906, -0.076, 0.343, 0.214],
    ],
    kerchief,
  );
  egg(plumage, kerchiefLight, -0.09, 2.835, 0.145, 0.093, 0.068, 0.072, -0.45);
  const ribbon = new THREE.Group();
  ribbon.position.set(-0.105, 2.84, 0.13);
  plumage.add(ribbon);
  form(
    ribbon,
    [
      [-0.88, 0.06, 0.066, 0.005, 0.017],
      [-0.74, 0.012, 0.08, 0.033, 0.027],
      [-0.56, -0.035, 0.066, 0.036, 0.044],
      [-0.36, -0.037, 0.056, 0.043, 0.034],
      [-0.19, -0.02, 0.076, 0.039, 0.015],
      [0.015, -0.026, 0.023, 0.017, 0],
    ],
    kerchiefLight,
  );
  form(
    ribbon,
    [
      [-0.59, -0.078, -0.072, 0.005, -0.044],
      [-0.51, -0.094, -0.048, 0.027, -0.038],
      [-0.35, -0.092, -0.024, 0.034, -0.027],
      [-0.17, -0.068, 0.015, 0.033, -0.011],
      [0, -0.015, 0.02, 0.018, 0],
    ],
    kerchief,
  );

  const head = new THREE.Group();
  head.position.set(0.2, 3.23, 0);
  plumage.add(head);
  // A projecting crown softens the S-curve where the head meets the neck.
  form(
    head,
    [
      [-0.47, 0.15, 0.165, 0.012],
      [-0.38, 0.09, 0.205, 0.071],
      [-0.24, 0.05, 0.27, 0.14],
      [-0.08, 0.08, 0.29, 0.19],
      [0.02, 0.14, 0.23, 0.11],
    ],
    feather,
  );
  form(
    head,
    [
      [-0.376, 0.015, 0.026, 0.016],
      [-0.3, -0.08, 0.17, 0.135],
      [-0.16, -0.205, 0.27, 0.237],
      [0.025, -0.24, 0.31, 0.285],
      [0.2, -0.216, 0.27, 0.267],
      [0.34, -0.147, 0.17, 0.21],
      [0.41, -0.06, 0.09, 0.14],
    ],
    ivory,
  );
  // The bill has a thin, smooth roof over a much deeper skin pouch.
  form(
    head,
    [
      [0.11, -0.13, -0.05, 0.16],
      [0.23, -0.26, -0.017, 0.218],
      [0.38, -0.37, -0.009, 0.223],
      [0.58, -0.419, -0.023, 0.215],
      [0.81, -0.397, -0.046, 0.176],
      [1.04, -0.321, -0.065, 0.13],
      [1.27, -0.228, -0.092, 0.088],
      [1.45, -0.167, -0.115, 0.045],
      [1.53, -0.141, -0.127, 0.013],
    ],
    pouch,
  );
  form(
    head,
    [
      [0.235, -0.058, 0.038, 0.186],
      [0.35, -0.052, 0.068, 0.235],
      [0.52, -0.052, 0.053, 0.234],
      [0.8, -0.08, 0.022, 0.194],
      [1.1, -0.108, -0.026, 0.139],
      [1.33, -0.133, -0.068, 0.089],
      [1.49, -0.153, -0.09, 0.053],
      [1.56, -0.187, -0.119, 0.035],
      [1.565, -0.198, -0.176, 0.012],
    ],
    bill,
  );
  for (const side of [-1, 1]) {
    const seamPoints = [
      [0.33, -0.011, 0.222],
      [0.51, -0.032, 0.231],
      [0.76, -0.055, 0.196],
      [1.03, -0.084, 0.152],
      [1.29, -0.11, 0.097],
      [1.49, -0.134, 0.051],
    ].map(([x, y, z]) => new THREE.Vector3(x, y, z * side));
    const seam = new THREE.CatmullRomCurve3(seamPoints);
    add(head, new THREE.TubeGeometry(seam, 26, 0.0095, 8, false), lip);
    egg(head, nostril, 0.49, 0.024, 0.215 * side, 0.039, 0.009, 0.006, -0.07);
    egg(head, bill, 0.207, 0.114, 0.239 * side, 0.112, 0.108, 0.038, -0.08);
    egg(head, eyeColor, 0.222, 0.117, 0.266 * side, 0.063, 0.073, 0.031);
    egg(head, pale, 0.238, 0.14, 0.292 * side, 0.015, 0.016, 0.007);
  }

  const footOutline = new THREE.Shape();
  footOutline.moveTo(-0.1, -0.02);
  footOutline.quadraticCurveTo(-0.11, -0.06, -0.06, -0.063);
  footOutline.quadraticCurveTo(0.025, -0.044, 0.118, -0.092);
  footOutline.quadraticCurveTo(0.174, -0.111, 0.151, -0.077);
  footOutline.quadraticCurveTo(0.118, -0.038, 0.202, -0.02);
  footOutline.quadraticCurveTo(0.241, -0.006, 0.201, 0.01);
  footOutline.quadraticCurveTo(0.131, 0.03, 0.161, 0.071);
  footOutline.quadraticCurveTo(0.184, 0.119, 0.124, 0.093);
  footOutline.quadraticCurveTo(0.011, 0.041, -0.066, 0.06);
  footOutline.quadraticCurveTo(-0.12, 0.069, -0.1, -0.02);
  const footGeometry = new THREE.ExtrudeGeometry(footOutline, {
    depth: 0.017,
    bevelEnabled: true,
    bevelSize: 0.013,
    bevelThickness: 0.013,
    bevelSegments: 3,
    curveSegments: 8,
  });
  footGeometry.rotateX(Math.PI / 2);
  const legParts = [-1, 1].map((side) => {
    const upper = add(group, linkGeometry, skin);
    const lower = add(group, linkGeometry, skin);
    const cuff = egg(group, feather, 0, 0, 0, 1, 1, 1);
    const joint = egg(group, skin, 0, 0, 0, 0.073, 0.068, 0.065);
    const ankle = egg(group, skin, 0, 0, 0, 0.082, 0.054, 0.071);
    const foot = add(group, footGeometry, footColor);
    return { side, upper, lower, cuff, joint, ankle, foot };
  });
  const up = new THREE.Vector3(0, 1, 0);
  const delta = new THREE.Vector3();
  const hip = new THREE.Vector3();
  const hock = new THREE.Vector3();
  const heel = new THREE.Vector3();
  const cuffEnd = new THREE.Vector3();
  function poseLink(mesh, a, b, width, ellipsoid = false) {
    delta.subVectors(b, a);
    const length = delta.length();
    mesh.position.copy(a).addScaledVector(delta, 0.5);
    mesh.quaternion.setFromUnitVectors(up, delta.multiplyScalar(1 / length));
    mesh.scale.set(width, length * (ellipsoid ? 0.62 : 1), width);
  }
  function update(phase = 0, time = 0, moving = true) {
    const bob = Math.cos(2 * phase) * 0.017;
    plumage.position.y = bob;
    for (const wing of steeringWings) {
      wing.rotation.z = Math.atan2(-bob, wing.position.x + 0.54);
    }
    head.rotation.z = 0.009 * Math.cos(2 * phase + 0.4);
    ribbon.rotation.z = 0.021 * Math.sin(3 * phase) + (moving ? 0.012 * Math.sin(time * 3.3) : 0);
    for (const { side, upper, lower, cuff, joint, ankle, foot } of legParts) {
      const angle = phase + (side < 0 ? Math.PI : 0);
      const pedalX = 0.12 + 0.25 * Math.cos(angle);
      const pedalY = 0.72 + 0.25 * Math.sin(angle);
      hip.set(-0.36, 1.92 + bob, side * 0.246);
      heel.set(pedalX - 0.068, pedalY + 0.071, side * 0.23);
      const dx = heel.x - hip.x;
      const dy = heel.y - hip.y;
      const distance = Math.hypot(dx, dy);
      const thighLength = 0.76;
      const shinLength = 0.81;
      const along = (thighLength ** 2 - shinLength ** 2 + distance ** 2) / (2 * distance);
      const across = Math.sqrt(Math.max(0, thighLength ** 2 - along ** 2));
      hock.set(
        hip.x + (along * dx + across * dy) / distance,
        hip.y + (along * dy - across * dx) / distance,
        side * 0.26,
      );
      poseLink(upper, hip, hock, 0.061);
      poseLink(lower, hock, heel, 0.048);
      cuffEnd.copy(hip).lerp(hock, 0.54);
      poseLink(cuff, hip, cuffEnd, 0.123, true);
      joint.position.copy(hock);
      ankle.position.copy(heel);
      foot.position.set(pedalX, pedalY + 0.052, side * 0.23);
      foot.rotation.z = -0.028 + 0.052 * Math.sin(angle + 0.55);
    }
  }
  update();
  return { group, update };
}
