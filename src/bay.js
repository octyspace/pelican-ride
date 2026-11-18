import * as THREE from 'three';

export function makeBay() {
  const group = new THREE.Group();
  const distantHills = new THREE.Group();
  const nearCapes = new THREE.Group();
  group.add(distantHills, nearCapes);

  const landMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  // The round bay keeps its horizon at a constant distance as the camera orbits.
  // Lower the land below sea level where its loop passes behind the beach.
  landMaterial.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       float coastZ = (modelMatrix * vec4(transformed, 1.0)).z;
       transformed.y = mix(transformed.y, -0.37, smoothstep(-7.0, -3.9, coastZ));`,
    );
  };
  function onArc(x, y, z, radius) {
    const angle = x / radius;
    return new THREE.Vector3(-z * Math.sin(angle), y, z * Math.cos(angle));
  }
  // Broad, overlapping headlands have progressively lighter colours toward the horizon.
  function headland(layer, x, z, profile, baseColor, faceColor, stretch = 1, height = 1) {
    const vertices = [],
      colors = [];
    const top = new THREE.Color(baseColor),
      side = new THREE.Color(faceColor);
    const ridge = new THREE.SplineCurve(profile.map(([u, h]) => new THREE.Vector2(u, h * 0.72 * height)));
    const rows = ridge
      .getPoints(80)
      .map(({ x: u, y: h }) => [
        onArc(x + u * stretch, -0.32, z + 0.55 + 0.25 * Math.sin(u * 1.12), -z),
        onArc(x + u * stretch, h * 0.72 - 0.21, z + 0.38, -z),
        onArc(x + u * stretch, h - 0.21, z - 0.37 - 0.3 * Math.sin(u), -z),
        onArc(x + u * stretch, -0.33, z - 1.52, -z),
      ]);
    function tri(a, b, c, tint) {
      for (const v of [a, b, c]) {
        vertices.push(v.x, v.y, v.z);
        colors.push(tint.r, tint.g, tint.b);
      }
    }
    for (let i = 0; i < rows.length - 1; i++) {
      for (let j = 0; j < 3; j++) {
        const a = rows[i],
          b = rows[i + 1];
        const tint = (j === 0 ? side : top).clone().multiplyScalar(1 + 0.009 * Math.sin(i * 0.13));
        tri(a[j], b[j], b[j + 1], tint);
        tri(a[j], b[j + 1], a[j + 1], tint);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    layer.add(new THREE.Mesh(geometry, landMaterial));
  }
  const highRidge = [
    [-7, 0.05],
    [-4, 0.48],
    [-2, 1.05],
    [-1.2, 1.2],
    [-0.45, 1.07],
    [0.35, 0.65],
    [1.1, 0.61],
    [1.6, 0.42],
    [2.3, 0.48],
    [3, 0.36],
    [3.9, 0.32],
    [4.7, 0.2],
    [5.1, 0.13],
    [5.7, 0.02],
  ];
  const roundedCape = [
    [-6, 0.04],
    [-3.5, 0.24],
    [-2.8, 0.65],
    [-2.15, 0.94],
    [-1.4, 0.8],
    [-0.8, 0.62],
    [-0.35, 0.58],
    [0.25, 0.65],
    [0.8, 0.61],
    [1.35, 0.42],
    [1.85, 0.35],
    [2.5, 0.26],
    [3.2, 0.22],
    [3.65, 0.12],
    [4.1, 0.02],
  ];
  const longRidge = [
    [-5, 0.05],
    [-4.5, 0.13],
    [-4, 0.16],
    [-3.3, 0.35],
    [-2.7, 0.41],
    [-2.25, 0.37],
    [-1.7, 0.47],
    [-1.2, 0.52],
    [-0.65, 0.73],
    [0.1, 0.68],
    [1.1, 0.9],
    [2.8, 0.92],
    [4.2, 0.5],
    [6, 0.04],
  ];
  const distantRadius = 15.65,
    nearRadius = 12.9;
  for (const [center, profile, width, height] of [
    [-9.8, highRidge, 1.0, 1.0],
    [-3.65, roundedCape, 0.42, 0.59],
    [5.2, longRidge, 1.0, 1.0],
    [20.5, highRidge, 1.13, 0.79],
    [35.0, roundedCape, 1.12, 1.3],
    [51.4, longRidge, 1.42, 1.33],
    [69.8, highRidge, 0.96, 1.15],
  ]) {
    const lighter = profile === longRidge;
    headland(
      distantHills,
      center,
      -distantRadius,
      profile,
      lighter ? '#b2cbc0' : '#aac7be',
      lighter ? '#bcd3c6' : '#b1cdc2',
      width,
      height,
    );
  }
  for (const [center, width, height] of [
    [-9.4, 1.0, 1.0],
    [10.8, 0.78, 0.87],
    [32.4, 1.2, 0.94],
    [51.7, 0.95, 1.18],
  ]) {
    headland(nearCapes, center, -nearRadius, roundedCape, '#9bbab0', '#a5bfb1', width, height);
  }
  const boat = new THREE.Group();
  const mat = (c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
  function shape(points, color) {
    const path = new THREE.Shape();
    points.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
    path.closePath();
    return new THREE.Mesh(new THREE.ShapeGeometry(path), mat(color));
  }
  boat.add(
    shape(
      [
        [-0.215, 0.039],
        [0.19, 0.039],
        [0.142, -0.003],
        [-0.12, -0.003],
      ],
      '#6b9188',
    ),
  );
  boat.add(
    shape(
      [
        [-0.008, 0.36],
        [-0.016, 0.065],
        [-0.185, 0.065],
      ],
      '#f6edd7',
    ),
  );
  boat.add(
    shape(
      [
        [0.007, 0.31],
        [0.015, 0.061],
        [0.145, 0.061],
      ],
      '#e7c293',
    ),
  );
  const boatRadius = Math.hypot(5.38, 9);
  const firstAngle = Math.atan2(-5.38, 9);
  const fleet = [0, 1.64, 3.5, 4.97].map((phase, i) => {
    const hull = i === 0 ? boat : boat.clone();
    hull.scale.setScalar([1.0, 0.77, 0.95, 0.7][i]);
    group.add(hull);
    return { hull, angle: firstAngle + phase, radius: boatRadius + [0, 0.7, -0.55, 0.6][i] };
  });
  function update(time = 0, distance = 0) {
    distantHills.rotation.y = (distance * 0.11) / distantRadius;
    nearCapes.rotation.y = (distance * 0.15) / nearRadius;
    for (const { hull, angle, radius } of fleet) {
      const drift = 0.16 * Math.sin(time * 0.09 + angle - firstAngle);
      const bearing = angle + (drift - distance * 0.23) / radius;
      const z = -radius * Math.cos(bearing);
      const shore = THREE.MathUtils.smoothstep(z, -5.9, -3.7);
      hull.position.set(radius * Math.sin(bearing), -0.245 - 0.47 * shore, z);
      hull.rotation.y = -bearing;
      hull.rotation.z = 0.025 * Math.sin(time * 0.8 + angle);
      // On the shore-facing half of its circuit the hull is hidden by dry ground.
      hull.visible = z < -3.55;
    }
  }
  update();
  return { group, update };
}
