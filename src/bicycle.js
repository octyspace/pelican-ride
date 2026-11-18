import * as THREE from 'three';

const TAU = Math.PI * 2;
const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const up = v(0, 1);

export function createBicycle() {
  const group = new THREE.Group();
  group.name = 'Touring bicycle';

  const paint = (color, roughness = 0.52, metalness = 0.04) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const enamel = paint(0x175c50, 0.37, 0.12);
  const mudguard = paint(0x3b7965, 0.46, 0.1);
  const nickel = paint(0xa3a499, 0.37, 0.52);
  const spokeSteel = paint(0x7f8c82, 0.49, 0.22);
  const brass = paint(0xc2a66d, 0.42, 0.37);
  const leather = paint(0x905635, 0.74);
  const chainSteel = paint(0x4a5048, 0.72, 0.19);
  const pedalRubber = paint(0x474b40, 0.86);
  const rear = v(-1, 0.62);
  const front = v(1.12, 0.62);
  const crank = v(0.12, 0.72);
  const seatLug = v(-0.33, 1.5);
  const headTop = v(0.77, 1.58);
  const headLow = v(0.89, 1.29);

  const sphere = new THREE.SphereGeometry(1, 20, 14);
  function add(parent, geometry, material, pos) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (pos) mesh.position.copy(pos);
    parent.add(mesh);
    return mesh;
  }
  function oval(parent, pos, scale, material) {
    const object = add(parent, sphere, material, pos);
    object.scale.copy(scale);
    return object;
  }
  function rod(parent, a, b, radius, material, endRadius = radius, sides = 12) {
    const axis = b.clone().sub(a);
    const geometry = new THREE.CylinderGeometry(endRadius, radius, axis.length(), sides);
    const object = add(parent, geometry, material, a.clone().lerp(b, 0.5));
    object.quaternion.setFromUnitVectors(up, axis.normalize());
    return object;
  }
  function curve(parent, points, radius, material, segments = 16) {
    const spline = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    return add(parent, new THREE.TubeGeometry(spline, segments, radius, 8, false), material);
  }
  function bead(parent, radius, crossSection, material, z = 0) {
    return add(parent, new THREE.TorusGeometry(radius, crossSection, 8, 72), material, v(0, 0, z));
  }
  function band(a, b, start, end, radius, material) {
    rod(group, a.clone().lerp(b, start), a.clone().lerp(b, end), radius, material);
  }

  // The continuous curved profile shows a thin dark tread above the cream sidewalls.
  const tireProfile = [
    [0.516, -0.016, 0x545747],
    [0.531, -0.036, 0xa39e7d],
    [0.548, -0.047, 0xe8d9af],
    [0.573, -0.048, 0xe8d9af],
    [0.588, -0.043, 0xe8d9af],
    [0.59, -0.042, 0x4c5043],
    [0.608, -0.03, 0x3d433c],
    [0.619, -0.014, 0x3a403a],
    [0.62, 0, 0x373d37],
    [0.619, 0.014, 0x3a403a],
    [0.608, 0.03, 0x3d433c],
    [0.59, 0.042, 0x4c5043],
    [0.588, 0.043, 0xe8d9af],
    [0.573, 0.048, 0xe8d9af],
    [0.548, 0.047, 0xe8d9af],
    [0.531, 0.036, 0xa39e7d],
    [0.516, 0.016, 0x545747],
    [0.515, 0, 0x545747],
    [0.516, -0.016, 0x545747],
  ];
  const tireGeometry = new THREE.LatheGeometry(
    tireProfile.map(([r, h]) => new THREE.Vector2(r, h)),
    72,
  );
  const tireColors = [];
  for (let i = 0; i < tireGeometry.attributes.position.count; i++) {
    const color = new THREE.Color(tireProfile[i % tireProfile.length][2]);
    tireColors.push(color.r, color.g, color.b);
  }
  tireGeometry.setAttribute('color', new THREE.Float32BufferAttribute(tireColors, 3));
  tireGeometry.rotateX(Math.PI / 2);
  const tireMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });

  const rimGeometry = new THREE.LatheGeometry(
    [
      [0.507, -0.019],
      [0.521, -0.027],
      [0.53, -0.025],
      [0.533, 0],
      [0.53, 0.025],
      [0.521, 0.027],
      [0.507, 0.019],
      [0.5, 0],
      [0.507, -0.019],
    ].map(([r, h]) => new THREE.Vector2(r, h)),
    72,
  );
  rimGeometry.rotateX(Math.PI / 2);
  const spokeCount = 28;
  const spokeGeometry = new THREE.CylinderGeometry(1, 1, 1, 5);
  function wheel(center) {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.copy(center);
    group.add(wheelGroup);
    add(wheelGroup, tireGeometry, tireMaterial);
    add(wheelGroup, rimGeometry, nickel);
    const spokes = new THREE.InstancedMesh(spokeGeometry, spokeSteel, spokeCount);
    const transform = new THREE.Object3D();
    for (let n = 0; n < spokeCount; n++) {
      const angle = (TAU * n) / spokeCount;
      const crossed = angle + (n % 4 < 2 ? 0.87 : -0.87);
      const from = v(0.058 * Math.cos(crossed), 0.058 * Math.sin(crossed), n % 2 ? -0.052 : 0.052);
      const to = v(0.504 * Math.cos(angle), 0.504 * Math.sin(angle), n % 2 ? -0.008 : 0.008);
      const axis = to.clone().sub(from);
      transform.position.copy(from).lerp(to, 0.5);
      transform.quaternion.setFromUnitVectors(up, axis.clone().normalize());
      transform.scale.set(0.0051, axis.length(), 0.0051);
      transform.updateMatrix();
      spokes.setMatrixAt(n, transform.matrix);
    }
    wheelGroup.add(spokes);
    rod(wheelGroup, v(0, 0, -0.083), v(0, 0, 0.083), 0.046, nickel);
    for (const side of [-1, 1]) {
      rod(wheelGroup, v(0, 0, side * 0.045), v(0, 0, side * 0.058), 0.065, nickel);
      oval(wheelGroup, v(0, 0, side * 0.099), v(0.033, 0.033, 0.025), brass);
    }
    rod(wheelGroup, v(0, 0.455, 0), v(0, 0.504, 0), 0.008, brass);
    return wheelGroup;
  }
  const wheels = [wheel(rear), wheel(front)];

  // Four main tubes meet at socketed lugs like a traditional brazed roadster.
  rod(group, crank, seatLug, 0.046, enamel);
  rod(group, crank, headLow, 0.052, enamel);
  rod(group, seatLug, headTop, 0.04, enamel);
  rod(group, headLow, headTop, 0.068, enamel);
  band(headLow, headTop, -0.018, 0.065, 0.069, brass);
  band(headLow, headTop, 0.91, 1.04, 0.071, nickel);
  band(crank, seatLug, 0.9, 1.035, 0.053, enamel);
  band(crank, seatLug, 1.035, 1.058, 0.054, brass);
  band(crank, headLow, 0.7, 0.715, 0.053, brass);
  band(crank, headLow, 0.735, 0.744, 0.053, brass);

  for (const side of [-1, 1]) {
    const end = rear.clone().add(v(0, 0, 0.081 * side));
    curve(
      group,
      [crank.clone().add(v(0, 0, 0.058 * side)), v(-0.27, 0.675, 0.113 * side), end],
      0.028,
      enamel,
    );
    rod(group, seatLug.clone().add(v(-0.014, -0.04, 0.033 * side)), end, 0.026, enamel, 0.02);
    const tip = front.clone().add(v(0, 0, 0.081 * side));
    curve(
      group,
      [headLow, v(0.916, 1.205, 0.071 * side), v(1.054, 0.747, 0.085 * side), tip],
      0.032,
      enamel,
    );
    oval(group, end, v(0.052, 0.046, 0.018), enamel);
    oval(group, tip, v(0.045, 0.05, 0.018), enamel);
  }
  const gripContacts = [];
  const handleStem = v(0.68, 1.8);
  rod(group, headTop, handleStem, 0.03, nickel);
  curve(group, [handleStem, v(0.72, 1.85), v(0.93, 1.85)], 0.028, nickel);
  for (const side of [-1, 1]) {
    curve(
      group,
      [
        v(0.93, 1.85),
        v(0.974, 1.86, 0.13 * side),
        v(0.958, 1.87, 0.224 * side),
        v(0.91, 1.89, 0.266 * side),
      ],
      0.022,
      nickel,
    );
    const gripStart = v(0.932, 1.885, 0.257 * side);
    const gripEnd = v(0.793, 1.902, 0.299 * side);
    rod(group, gripStart, gripEnd, 0.032, leather);
    const contact = gripStart.clone().lerp(gripEnd, side > 0 ? 0.65 : 0.33);
    contact.y += 0.029;
    gripContacts.push(contact);
    oval(group, v(0.791, 1.901, 0.299 * side), v(0.025, 0.032, 0.032), leather);
  }
  // The curled black front brake cable, cap and amber headlamp add a little patina.
  curve(
    group,
    [v(0.911, 1.857, 0.242), v(1.088, 1.73, 0.176), v(1.079, 1.59, 0.102), v(0.949, 1.36, 0.046)],
    0.009,
    chainSteel,
  );
  rod(group, v(0.889, 1.42), v(1.005, 1.46), 0.018, nickel);
  oval(group, v(1.04, 1.463), v(0.103, 0.079, 0.078), brass);
  rod(group, v(1.093, 1.463), v(1.119, 1.464), 0.076, nickel);
  oval(group, v(1.116, 1.464), v(0.02, 0.063, 0.062), paint(0xffe8ac, 0.26));
  oval(group, v(0.926, 1.912, -0.17), v(0.047, 0.03, 0.046), brass);

  const saddleMount = v(-0.432, 1.675);
  rod(group, seatLug, saddleMount, 0.032, nickel);
  for (const side of [-1, 1]) {
    curve(
      group,
      [
        v(-0.56, 1.669, 0.058 * side),
        v(-0.462, 1.619, 0.048 * side),
        v(-0.368, 1.622, 0.046 * side),
        v(-0.296, 1.677, 0.038 * side),
      ],
      0.011,
      nickel,
    );
  }
  const saddle = new THREE.Shape();
  saddle.moveTo(0.195, 0);
  saddle.bezierCurveTo(0.195, 0.057, 0.112, 0.048, 0.033, 0.079);
  saddle.bezierCurveTo(-0.042, 0.113, -0.151, 0.153, -0.196, 0.103);
  saddle.bezierCurveTo(-0.22, 0.079, -0.22, -0.079, -0.196, -0.103);
  saddle.bezierCurveTo(-0.151, -0.153, -0.042, -0.113, 0.033, -0.079);
  saddle.bezierCurveTo(0.112, -0.048, 0.195, -0.057, 0.195, 0);
  const seat = new THREE.ExtrudeGeometry(saddle, {
    depth: 0.023,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.012,
    bevelSegments: 3,
    curveSegments: 8,
  });
  seat.rotateX(-Math.PI / 2);
  add(group, seat, leather, v(-0.44, 1.668));
  for (const side of [-1, 1]) oval(group, v(-0.61, 1.682, 0.11 * side), v(0.01, 0.008, 0.006), brass);

  function fender(center, start, end) {
    const positions = [],
      indices = [];
    const steps = 44;
    const profile = [
      [-0.068, 0.64],
      [-0.057, 0.659],
      [-0.035, 0.668],
      [0, 0.672],
      [0.035, 0.668],
      [0.057, 0.659],
      [0.068, 0.64],
    ];
    for (let i = 0; i <= steps; i++) {
      const angle = start + ((end - start) * i) / steps;
      for (const [z, radius] of profile)
        positions.push(center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius, z);
      if (i === steps) continue;
      for (let j = 0; j < profile.length - 1; j++) {
        const a = i * profile.length + j,
          b = a + profile.length;
        indices.push(a, b, b + 1, a, b + 1, a + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setIndex(indices);
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    mudguard.side = THREE.DoubleSide;
    add(group, geo, mudguard);
  }
  fender(rear, 0.55, 3.36);
  fender(front, 0.64, 2.98);
  for (const side of [-1, 1]) {
    rod(group, v(-1, 0.62, side * 0.087), v(-1.65, 0.646, side * 0.06), 0.009, nickel);
    rod(group, v(1.12, 0.62, side * 0.087), v(0.503, 0.878, side * 0.06), 0.009, nickel);
    // Bent carrier rails loop over the rear mudguard.
    rod(group, v(-1.015, 0.672, side * 0.094), v(-1.32, 1.325, side * 0.082), 0.012, enamel);
    rod(group, v(-1.015, 0.672, side * 0.094), v(-0.784, 1.325, side * 0.082), 0.01, enamel);
    curve(
      group,
      [
        v(-1.44, 1.318, side * 0.077),
        v(-1.41, 1.34, side * 0.084),
        v(-0.65, 1.34, side * 0.084),
        v(-0.6, 1.355, side * 0.076),
      ],
      0.016,
      enamel,
    );
  }
  for (const x of [-1.41, -1.22, -1.03, -0.83, -0.64])
    rod(group, v(x, 1.339, -0.084), v(x, 1.339, 0.084), 0.012, enamel);
  oval(group, v(-1.659, 0.661), v(0.019, 0.037, 0.034), paint(0xa94835));

  // Chain, sprockets, and crank remain visible from either side of the bike.
  const chainZ = 0.114;
  const sprockets = [];
  for (const [at, radius] of [
    [rear, 0.076],
    [crank, 0.156],
  ]) {
    const gear = new THREE.Group();
    group.add(gear);
    gear.position.set(at.x, at.y, chainZ);
    sprockets.push(gear);
    bead(gear, radius, 0.012, chainSteel);
    for (let n = 0; n < 5; n++) {
      const angle = (n * TAU) / 5;
      rod(
        gear,
        v(0, 0),
        v((radius - 0.009) * Math.cos(angle), (radius - 0.009) * Math.sin(angle)),
        0.014,
        nickel,
      );
    }
  }
  rod(group, v(rear.x, rear.y + 0.076, chainZ), v(crank.x, crank.y + 0.156, chainZ), 0.013, chainSteel);
  rod(group, v(rear.x, rear.y - 0.076, chainZ), v(crank.x, crank.y - 0.156, chainZ), 0.013, chainSteel);
  // A short enamel chaincase follows the upper chain.
  curve(
    group,
    [
      v(-1.07, 0.664, 0.124),
      v(-1.011, 0.709, 0.124),
      v(-0.917, 0.723, 0.124),
      v(0.073, 0.897, 0.124),
      v(0.168, 0.893, 0.124),
      v(0.264, 0.825, 0.124),
    ],
    0.024,
    mudguard,
    32,
  );
  rod(group, v(crank.x, crank.y, -0.143), v(crank.x, crank.y, 0.152), 0.061, enamel);
  const crankset = new THREE.Group();
  crankset.position.copy(crank);
  group.add(crankset);
  const platforms = [];
  for (const side of [-1, 1]) {
    const z = side * 0.15;
    rod(crankset, v(0, 0, z), v(side * 0.25, 0, z), 0.019, nickel, 0.023);
    rod(crankset, v(side * 0.25, 0, z), v(side * 0.25, 0, side * 0.265), 0.014, nickel);
    oval(crankset, v(0, 0, z), v(0.031, 0.031, 0.019), brass);
    const platform = new THREE.Group();
    crankset.add(platform);
    platform.position.set(side * 0.25, 0, side * 0.23);
    for (const dx of [-0.045, 0.045]) {
      add(platform, new THREE.BoxGeometry(0.038, 0.029, 0.124), pedalRubber, v(dx, -0.004));
      oval(platform, v(dx, -0.004, side * 0.061), v(0.02, 0.014, 0.008), brass);
    }
    platforms.push(platform);
  }

  function update(phase) {
    wheels.forEach((w) => {
      w.rotation.z = phase * 2.15;
    });
    sprockets[0].rotation.z = phase * 2.15;
    sprockets[1].rotation.z = phase;
    crankset.rotation.z = phase;
    platforms.forEach((p) => {
      p.rotation.z = -phase;
    });
  }
  update(0);
  return { group, update, gripContacts };
}
