import * as THREE from 'three';
import { createPelican } from './pelican.js';
import { createBicycle } from './bicycle.js';
import { createCoast } from './coast.js';
import { makeBay } from './bay.js';
import { paintSky, createCloudLayer, makeGulls } from './sky.js';

const $ = (id) => document.getElementById(id);
const canvas = $('scene'),
  stage = $('stage'),
  theater = $('theater');
const icon = (button, id) => button.querySelector('use').setAttribute('href', '#i-' + id);
let toastTimer;
function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2400);
}

function start() {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7));
  renderer.autoClear = false;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.04;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-5, 5, 3, -3, 0.1, 130);
  const hemi = new THREE.HemisphereLight(0xfffcf4, 0xdedcdb, 1.85);
  scene.add(hemi);
  const key = new THREE.DirectionalLight('#fff7e7', 2.15);
  key.position.set(-3.2, 8, 5.5);
  key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 24 });
  key.shadow.bias = -0.00017;
  key.shadow.normalBias = 0.012;
  key.shadow.mapSize.set(2048, 2048);
  scene.add(key);
  const rim = new THREE.DirectionalLight('#d5edf2', 0.58);
  rim.position.set(3, 4, -5);
  scene.add(rim);
  const clouds = createCloudLayer();
  const coast = createCoast(),
    bike = createBicycle(),
    pelican = createPelican(bike.gripContacts),
    gulls = makeGulls(),
    bay = makeBay();
  scene.add(coast.group, bike.group, pelican.group, gulls.group, bay.group);
  // Soft contact at each tire anchors the bicycle between the moving cast shadows.
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sctx = shadowCanvas.getContext('2d'),
    gradient = sctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(55,53,29,.38)');
  gradient.addColorStop(0.5, 'rgba(73,62,37,.18)');
  gradient.addColorStop(1, 'rgba(80,65,30,0)');
  sctx.fillStyle = gradient;
  sctx.fillRect(0, 0, 128, 128);
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shade = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false });
  for (const [x, w, h] of [
    [-1, 0.63, 0.32],
    [1.12, 0.63, 0.32],
    [0.1, 3.4, 0.88],
  ]) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), shade);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, -0.001, 0);
    scene.add(mesh);
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let playing = !reduced,
    speed = 1,
    phase = 0.8,
    distance = 0,
    time = 0,
    last = performance.now(),
    dirty = true;
  const presets = {
    side: { yaw: 0.22, pitch: 0.132, zoom: 1 },
    front: { yaw: 0.76, pitch: 0.159, zoom: 1.06 },
    wide: { yaw: 0.12, pitch: 0.18, zoom: 0.82 },
  };
  const view = { ...presets.side },
    target = { ...view };
  let aspect = 1;
  function resize() {
    const w = Math.max(1, stage.clientWidth),
      h = Math.max(1, stage.clientHeight);
    aspect = w / h;
    renderer.setSize(w, h, false);
    clouds.resize(aspect);
    clouds.scene.background?.dispose?.();
    clouds.scene.background = paintSky(aspect);
    dirty = true;
  }
  new ResizeObserver(resize).observe(stage);
  resize();
  function poseCamera() {
    const narrow = aspect < 1.15;
    const height = Math.max(narrow ? 5.55 : 5.35, (narrow ? 4.82 : 5.1) / aspect) / view.zoom;
    camera.top = height * 0.5;
    camera.bottom = -camera.top;
    camera.right = camera.top * aspect;
    camera.left = -camera.right;
    // Reserve sky above the rider for the caption in a portrait view.
    const cy = narrow ? 2.13 : 1.68,
      offset = narrow ? 0 : aspect > 1.6 ? -0.45 : -0.16;
    const rightX = Math.cos(view.yaw),
      rightZ = -Math.sin(view.yaw);
    const x = offset * rightX,
      z = offset * rightZ;
    camera.position.set(
      x + 15 * Math.sin(view.yaw) * Math.cos(view.pitch),
      cy + 15 * Math.sin(view.pitch),
      z + 15 * Math.cos(view.yaw) * Math.cos(view.pitch),
    );
    camera.lookAt(x, cy, z);
    camera.updateProjectionMatrix();
  }
  function pickView(name) {
    Object.assign(target, presets[name]);
    $('view').value = name;
    dirty = true;
  }
  $('view').addEventListener('change', (e) => {
    if (presets[e.target.value]) pickView(e.target.value);
  });
  $('reset').onclick = () => {
    pickView('side');
    toast('已恢复默认镜头');
  };
  function playState() {
    icon($('play'), playing ? 'pause' : 'play');
    $('playing-state').textContent = playing ? '正在骑行' : '已暂停';
    const action = playing ? '暂停骑行' : '继续骑行';
    $('play').setAttribute('aria-label', action);
    $('play').title = action + '（空格）';
  }
  function toggle() {
    playing = !playing;
    playState();
    dirty = true;
  }
  $('play').onclick = toggle;
  playState();
  document.querySelectorAll('[data-speed]').forEach((b) =>
    b.addEventListener('click', () => {
      speed = Number(b.dataset.speed);
      document
        .querySelectorAll('[data-speed]')
        .forEach((k) => k.setAttribute('aria-pressed', String(k === b)));
    }),
  );
  function free() {
    dirty = true;
    $('view').value = 'free';
  }
  const clamp = THREE.MathUtils.clamp;
  const pointers = new Map();
  let prevPinch = 0;
  const pinch = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) prevPinch = pinch();
    canvas.classList.add('dragging');
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x,
      dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (pointers.size === 2) {
      const d = pinch();
      if (d > 0 && prevPinch > 0) target.zoom = clamp((target.zoom * d) / prevPinch, 0.69, 1.5);
      prevPinch = d;
    } else if (dx || dy) {
      target.yaw = clamp(target.yaw - dx * 0.005, -0.88, 1.05);
      target.pitch = clamp(target.pitch + dy * 0.002, 0.06, 0.3);
    }
    if (dx || dy) free();
  });
  function release(e) {
    pointers.delete(e.pointerId);
    if (!pointers.size) canvas.classList.remove('dragging');
    prevPinch = 0;
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', release);
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      target.zoom = clamp(target.zoom * Math.exp(-clamp(e.deltaY, -120, 120) * 0.0012), 0.69, 1.5);
      free();
    },
    { passive: false },
  );
  document.addEventListener('keydown', (e) => {
    if (['BUTTON', 'SELECT', 'INPUT'].includes(e.target.tagName)) return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat) toggle();
    }
    if (
      e.target === canvas &&
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(e.key)
    ) {
      e.preventDefault();
      if (e.key === 'Home') {
        pickView('side');
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
        target.yaw = clamp(target.yaw + (e.key === 'ArrowLeft' ? -0.06 : 0.06), -0.88, 1.05);
      else target.zoom = clamp(target.zoom * (e.key === 'ArrowUp' ? 1.07 : 1 / 1.07), 0.69, 1.5);
      free();
    }
  });
  function drawScene() {
    renderer.clear();
    renderer.render(clouds.scene, clouds.camera);
    renderer.clearDepth();
    renderer.render(scene, camera);
  }
  function render(dt) {
    const amt = 1 - Math.exp(-dt * 13);
    for (const k of ['yaw', 'pitch', 'zoom']) {
      if (Math.abs(target[k] - view[k]) > 0.00005) {
        view[k] += (target[k] - view[k]) * amt;
        dirty = true;
      } else view[k] = target[k];
    }
    if (playing) {
      time += dt * speed;
      phase -= dt * speed * 3.65;
      distance += dt * speed * 3.65 * 0.62 * 2.15;
      dirty = true;
    }
    if (dirty) {
      bike.update(phase, time, playing);
      pelican.update(phase, time, playing);
      coast.update(distance, time);
      clouds.update(distance);
      gulls.update(time, distance);
      bay.update(time, distance);
      poseCamera();
      drawScene();
      dirty = false;
    }
  }
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.08);
    last = now;
    if (!document.hidden) render(dt);
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => {
    last = performance.now();
  });
  render(0);
  $('load').hidden = true;
  requestAnimationFrame(frame);
  $('snap').onclick = () => {
    drawScene();
    canvas.toBlob((blob) => {
      if (!blob) {
        toast('照片未能保存，请再试一次');
        return;
      }
      const url = URL.createObjectURL(blob),
        a = document.createElement('a');
      a.href = url;
      a.download = '海岸骑行.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      toast('已拍下海岸骑行照片');
    }, 'image/png');
  };
  let faux = false;
  function syncFull() {
    const expanded = Boolean(document.fullscreenElement) || faux;
    icon($('expand'), expanded ? 'shrink' : 'expand');
    const label = expanded ? '退出全屏' : '全屏观看';
    $('expand').title = label;
    $('expand').setAttribute('aria-label', label);
  }
  $('expand').onclick = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    if (faux) {
      faux = false;
      theater.classList.remove('expanded');
      syncFull();
      return;
    }
    try {
      await theater.requestFullscreen();
    } catch {
      faux = true;
      theater.classList.add('expanded');
      syncFull();
    }
  };
  document.addEventListener('fullscreenchange', syncFull);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && faux) {
      faux = false;
      theater.classList.remove('expanded');
      syncFull();
    }
  });
}
try {
  start();
} catch (error) {
  console.error(error);
  $('load').textContent = '当前浏览器未能打开 3D 场景，请启用 WebGL 后刷新。';
  document
    .querySelectorAll('.controlbar button,.controlbar select,#snap,#expand')
    .forEach((el) => (el.disabled = true));
}

let ctx,
  soundOn = false,
  soundBusy = false;
$('sound').onclick = async () => {
  if (soundBusy) return;
  soundBusy = true;
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const n = Math.round(ctx.sampleRate * 7),
        buf = ctx.createBuffer(1, n, ctx.sampleRate),
        arr = buf.getChannelData(0);
      let memory = 0;
      for (let i = 0; i < n; i++) {
        memory = (memory + 0.025 * (Math.random() * 2 - 1)) / 1.025;
        arr[i] = memory * 4.6 * Math.min(1, i / 200, (n - i) / 200);
      }
      const noise = ctx.createBufferSource(),
        filter = ctx.createBiquadFilter(),
        gain = ctx.createGain();
      noise.buffer = buf;
      noise.loop = true;
      filter.type = 'lowpass';
      filter.frequency.value = 1250;
      gain.gain.value = 0.16;
      const swell = ctx.createOscillator(),
        depth = ctx.createGain();
      swell.frequency.value = 0.12;
      depth.gain.value = 0.085;
      swell.connect(depth).connect(gain.gain);
      noise.connect(filter).connect(gain).connect(ctx.destination);
      noise.start();
      swell.start();
    }
    if (soundOn) await ctx.suspend();
    else await ctx.resume();
    soundOn = !soundOn;
    $('sound-state').textContent = soundOn ? '开' : '关';
    $('sound').setAttribute('aria-pressed', String(soundOn));
    icon($('sound'), soundOn ? 'soundon' : 'soundoff');
  } catch {
    toast('当前设备未能播放环境音');
  } finally {
    soundBusy = false;
  }
};
