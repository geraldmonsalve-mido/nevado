import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export function initNevado3D() {

  if (window.innerWidth < 768) {
    const canvas = document.getElementById('nevado-canvas');

    const existingLoader = document.querySelector('[data-nevado-loader]');
    if (existingLoader) existingLoader.remove();

    if (canvas) {
      canvas.outerHTML = '<img id="nevado-mobile-poster" src="/NevadoDePie.webp" alt="Nevado" decoding="async" fetchpriority="high" />';
    }

    document.body.classList.add('nevado-mobile-static');
    return;
  }


  // ── Canvas & renderer ─────────────────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:5;pointer-events:none;';
  document.body.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: window.innerWidth > 900, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.30;
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const neutralEnv = pmremGenerator.fromScene(new RoomEnvironment()).texture;
  scene.environment = neutralEnv;
  scene.environmentIntensity = 0.8;
  pmremGenerator.dispose();

  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0.8, 3.8);
  camera.lookAt(0, 0.4, 0);

  // ── Lights ────────────────────────────────────────────────────────────────
  const keyLight = new THREE.DirectionalLight(0xFFF5E0, 1.6);
  keyLight.position.set(2, 4, 5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x8090C0, 0.3);
  fillLight.position.set(-3, 2, 2);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xB8944A, 0.5);
  rimLight.position.set(0, 3, -4);
  scene.add(rimLight);

  const backLight = new THREE.DirectionalLight(0xFFFFFF, 0.4);
  backLight.position.set(0, -2, -3);
  scene.add(backLight);

  const floorLight = new THREE.PointLight(0xB8944A, 0.25);
  floorLight.position.set(0, -2, 1.5);
  scene.add(floorLight);

  scene.add(new THREE.AmbientLight(0x1a2040, 0.4));

  // ── Loading placeholder ───────────────────────────────────────────────────
  const loadingEl = document.createElement('div');
  loadingEl.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    z-index:6;pointer-events:none;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:20px;opacity:1;transition:opacity 0.8s ease;
  `;
  loadingEl.setAttribute('data-nevado-loader', 'true');
  loadingEl.innerHTML = `
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none"
         style="animation:nevado-spin 1.4s linear infinite;">
      ${Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const cx = (28 + 22 * Math.cos(a)).toFixed(2);
        const cy = (28 + 22 * Math.sin(a)).toFixed(2);
        const op = (0.18 + (i / 8) * 0.82).toFixed(2);
        return `<circle cx="${cx}" cy="${cy}" r="3.2" fill="#B8944A" opacity="${op}"/>`;
      }).join('')}
    </svg>
    <span style="font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:400;
                 letter-spacing:0.38em;color:#B8944A;opacity:0.7;">NEVADO</span>
    <style>@keyframes nevado-spin{to{transform:rotate(360deg);}}</style>
  `;
  document.body.appendChild(loadingEl);

  function hideLoader() {
    loadingEl.style.opacity = '0';
    setTimeout(() => loadingEl.remove(), 820);
  }

  // ── State ─────────────────────────────────────────────────────────────────
  let mixer, idleAction;
  let model, bones = {}, modelBaseY;
  const clock = new THREE.Clock();
  let microIdleZ = 0, microIdleTarget = 0, microIdleTimer = 0;

  let mouseX = 0.5, mouseY = 0.5;
  let dirty = true;
  document.addEventListener('mousemove', e => {
    mouseX = e.clientX / window.innerWidth;
    mouseY = e.clientY / window.innerHeight;
    dirty = true;
  });

  // Pre-allocated objects — reused every frame, no GC pressure
  const _qHead    = new THREE.Quaternion();
  const _qChest   = new THREE.Quaternion();
  const _qLeg     = new THREE.Quaternion();
  const _qLegDelta = new THREE.Quaternion();
  const _euler    = new THREE.Euler(0, 0, 0, 'YXZ');

  // ── Load GLB ──────────────────────────────────────────────────────────────
  const loader = new GLTFLoader();

  loader.load(
    '/Nevado.glb',
    (gltf) => {
      model = gltf.scene;

      // Center + scale
      const box    = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size   = box.getSize(new THREE.Vector3());
      model.position.sub(center);
      model.scale.setScalar(2.2 / Math.max(size.x, size.y, size.z));
      model.position.y -= 0.4;
      modelBaseY = model.position.y;

      model.traverse(child => {
        if (child.isBone || child.isObject3D) {
          const n = child.name.toLowerCase();
          if (n === 'head')  bones.head  = child;
          if (n === 'neck')  bones.neck  = child;
          if (n === 'chest') bones.chest = child;
          if (n === 'hips')        bones.hips       = child;
          if (n === 'frontleg0')   bones.frontleg0   = child;
          if (n === 'r_frontleg0') bones.r_frontleg0 = child;
          if (n === 'frontleg1')   bones.frontleg1   = child;
          if (n === 'r_frontleg1') bones.r_frontleg1 = child;
          if (n === 'headend')     bones.headend     = child;
        }
        if (child.isMesh) child.castShadow = true;
      });

      scene.add(model);
      hideLoader();

      mixer = new THREE.AnimationMixer(model);
      if (gltf.animations.length > 0) {
        const idleClip = gltf.animations[0];
        idleClip.tracks = idleClip.tracks.filter(t => {
          const name = t.name.toLowerCase();
          return !name.startsWith('head.') &&
                 !name.startsWith('headend.') &&
                 !name.startsWith('earend.') &&
                 !name.startsWith('r_earend.');
        });
        idleAction = mixer.clipAction(idleClip);
        idleAction.play();
        console.log('[Nevado3D] Idle:', idleClip.name, '| tracks:', idleClip.tracks.length);
      }
    },
    undefined,
    (err) => { console.error('[Nevado3D] Load error:', err); hideLoader(); }
  );

  // ── Animate ───────────────────────────────────────────────────────────────
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);

    if (mixer) { mixer.update(dt); dirty = true; }

    // Model breathing & keylight pulse
    if (model && modelBaseY !== undefined) {
      model.position.y = modelBaseY + Math.sin(clock.elapsedTime * 0.4) * 0.008;
      dirty = true;
    }
    keyLight.intensity = 1.4 + Math.sin(clock.elapsedTime * 0.3) * 0.15;

    // Micro-idle organic head drift
    microIdleTimer += dt;
    if (microIdleTimer > 8 + Math.random() * 4) {
      microIdleTarget = (Math.random() - 0.5) * 0.04;
      microIdleTimer = 0;
    }
    microIdleZ += (microIdleTarget - microIdleZ) * 0.02;

    if (bones.head && !bones.head._initialized) {
      bones.head._baseQ = bones.head.quaternion.clone();
      if (bones.chest)       bones.chest._baseQ       = bones.chest.quaternion.clone();
      if (bones.frontleg0)   bones.frontleg0._baseQ   = bones.frontleg0.quaternion.clone();
      if (bones.r_frontleg0) bones.r_frontleg0._baseQ = bones.r_frontleg0.quaternion.clone();
      if (bones.frontleg1)   bones.frontleg1._baseQ   = bones.frontleg1.quaternion.clone();
      if (bones.r_frontleg1) bones.r_frontleg1._baseQ = bones.r_frontleg1.quaternion.clone();
      bones.head._initialized = true;
    }

    if (bones.head && bones.head._initialized) {
      const dx = mouseX - 0.5;
      const dy = mouseY - 0.5;

      const yaw   = THREE.MathUtils.clamp(dx * -0.65, -0.50,  0.50);
      const pitch = dy > 0
        ? THREE.MathUtils.clamp(dy *  4.2,  0,     0.48)
        : THREE.MathUtils.clamp(dy *  0.06, -0.06, 0);
      const roll  = THREE.MathUtils.clamp(dx * 0.15, -0.10, 0.10) + microIdleZ;

      // Head — reuse _qHead and _euler
      _euler.set(pitch, yaw, roll, 'YXZ');
      _qHead.setFromEuler(_euler).premultiply(bones.head._baseQ);
      bones.head.quaternion.slerp(_qHead, 0.03);

      // Chest — reuse _qChest
      if (bones.chest && bones.chest._baseQ) {
        _euler.set(pitch * 0.15, yaw * 0.12, 0, 'YXZ');
        _qChest.setFromEuler(_euler).premultiply(bones.chest._baseQ);
        bones.chest.quaternion.slerp(_qChest, 0.04);
      }

      // Frontlegs — reuse _qLeg and _qLegDelta
      if (bones.frontleg1 && bones.r_frontleg1 && bones.frontleg1._baseQ) {
        const flexL = dx < 0 ? THREE.MathUtils.clamp(dx * -0.10, 0, 0.08) : 0;
        _euler.set(flexL, 0, 0, 'YXZ');
        _qLegDelta.setFromEuler(_euler);
        _qLeg.copy(bones.frontleg1._baseQ).multiply(_qLegDelta);
        bones.frontleg1.quaternion.slerp(_qLeg, 0.03);

        const flexR = dx > 0 ? THREE.MathUtils.clamp(dx * 0.10, 0, 0.08) : 0;
        _euler.set(flexR, 0, 0, 'YXZ');
        _qLegDelta.setFromEuler(_euler);
        _qLeg.copy(bones.r_frontleg1._baseQ).multiply(_qLegDelta);
        bones.r_frontleg1.quaternion.slerp(_qLeg, 0.03);
      }
    }

    if (dirty) { renderer.render(scene, camera); dirty = false; }
  }
  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
