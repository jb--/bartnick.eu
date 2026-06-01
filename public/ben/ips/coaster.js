// coaster.js — Shared Three.js roller coaster game scene
// Used by both index.html and coaster-test.html

/**
 * Run the coaster scene.
 * @param {HTMLCanvasElement} canvas
 * @param {object} correctWord - the correct vocabulary word
 * @param {object[]} allWords - all words (correct + distractors), already shuffled
 * @param {string} answerField - 'es' or 'de'
 * @param {object} callbacks - { onCorrect, onWrong, onMiss }
 */
function runCoasterScene(canvas, correctWord, allWords, answerField, callbacks) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(canvas.width, canvas.height, false);
  renderer.setClearColor(0x87CEEB);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x87CEEB, 0.008);

  const camera = new THREE.PerspectiveCamera(65, canvas.width / canvas.height, 0.1, 200);

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xfff5e0, 1.0);
  dirLight.position.set(10, 20, 10);
  scene.add(dirLight);
  const fillLight = new THREE.DirectionalLight(0x8ecae6, 0.3);
  fillLight.position.set(-5, 5, -10);
  scene.add(fillLight);

  // Ground plane
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 2000),
    new THREE.MeshStandardMaterial({ color: 0x7ec850 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -8;
  scene.add(ground);

  // Track curve — starts high with a flat section, then steep hills
  // Uses quintic smoothstep (C2-continuous) to blend from flat start into hills.
  // Hill oscillation bounded to [valleyY, peakY] by construction — no clamping needed.
  const trackLength = 300;
  const numPoints = 600;
  const trackPoints = [];
  const peakY = 14;
  const valleyY = 1;
  const midY = (peakY + valleyY) / 2;
  const ampY = (peakY - valleyY) / 2;
  for (let i = 0; i <= numPoints; i++) {
    const z = -i * (trackLength / numPoints);
    const t = i / numPoints;

    // C2-smooth quintic smoothstep envelope: flat at start, ramps into hills
    const rampStart = 0.06, rampLen = 0.08;
    const s = Math.max(0, Math.min(1, (t - rampStart) / rampLen));
    const env = s * s * s * (s * (s * 6 - 15) + 10);

    // Phase for oscillation (starts at 0 when ramp begins)
    const p = Math.max(0, t - rampStart) * numPoints;
    // Decaying amplitude so later hills are shallower
    const decay = 0.25 + 0.75 * Math.exp(-p * 0.002);

    // Combined wave in [-1, 1] → hillY stays in [valleyY, peakY] by construction
    const wave = Math.cos(p * 0.028) * 0.7 + Math.cos(p * 0.075) * 0.3;
    const hillY = midY + ampY * wave * decay;

    // Blend from flat peakY into hillY
    const y = peakY + env * (hillY - peakY);
    const x = env * (Math.sin(p * 0.02) * 8 + Math.sin(p * 0.05) * 3);

    trackPoints.push(new THREE.Vector3(x, y, z));
  }
  const trackCurve = new THREE.CatmullRomCurve3(trackPoints);

  // Pre-compute height range for physics-based speed
  let trackMinY = Infinity, trackMaxY = -Infinity;
  for (let i = 0; i <= 200; i++) {
    const y = trackCurve.getPointAt(i / 200).y;
    if (y < trackMinY) trackMinY = y;
    if (y > trackMaxY) trackMaxY = y;
  }
  const trackHeightRange = trackMaxY - trackMinY || 1;

  // Pre-compute average speed factor so total ride duration stays ~25s
  // Speed factor: energy conservation — fast at bottom, slow at top
  // speedFactor = sqrt( MIN_FACTOR^2 + (1 - MIN_FACTOR^2) * (1 - normalizedHeight) )
  const HEIGHT_MIN_FACTOR = 0.35; // slowest speed ratio at the very top
  const MIN2 = HEIGHT_MIN_FACTOR * HEIGHT_MIN_FACTOR;
  let avgSpeedFactor = 0;
  const speedSamples = 400;
  for (let i = 0; i < speedSamples; i++) {
    const t = (i / speedSamples) * 0.92;
    const h = (trackCurve.getPointAt(t).y - trackMinY) / trackHeightRange; // 0=bottom 1=top
    avgSpeedFactor += Math.sqrt(MIN2 + (1 - MIN2) * (1 - h));
  }
  avgSpeedFactor /= speedSamples;

  // Rails — perpendicular to curve direction
  const railMat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.6, roughness: 0.3 });
  const leftRailPts = [];
  const rightRailPts = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const p = trackCurve.getPointAt(t);
    const tangent = trackCurve.getTangentAt(t);
    const perp = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    leftRailPts.push(new THREE.Vector3(p.x - perp.x * 0.8, p.y, p.z - perp.z * 0.8));
    rightRailPts.push(new THREE.Vector3(p.x + perp.x * 0.8, p.y, p.z + perp.z * 0.8));
  }
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(leftRailPts), 400, 0.1, 8, false), railMat));
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rightRailPts), 400, 0.1, 8, false), railMat));

  // Cross ties
  const tieMat = new THREE.MeshStandardMaterial({ color: 0x8B6914 });
  for (let i = 0; i < numPoints; i += 3) {
    const t = i / numPoints;
    const p = trackCurve.getPointAt(t);
    const tangent = trackCurve.getTangentAt(t);
    const tie = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.15), tieMat);
    tie.position.copy(p);
    tie.position.y -= 0.12;
    tie.rotation.y = Math.atan2(tangent.x, tangent.z);
    scene.add(tie);
  }

  // Support pillars
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x666677, metalness: 0.4, roughness: 0.5 });
  for (let i = 0; i < numPoints; i += 20) {
    const t = i / numPoints;
    const p = trackCurve.getPointAt(t);
    const pillarHeight = p.y + 8;
    if (pillarHeight > 1) {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, pillarHeight, 6),
        pillarMat
      );
      pillar.position.set(p.x, p.y - pillarHeight / 2, p.z);
      scene.add(pillar);
    }
  }

  // Trees
  const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B });
  const treeLeafMat = new THREE.MeshStandardMaterial({ color: 0x2d8a4e });
  for (let i = 0; i < 40; i++) {
    const z = -Math.random() * trackLength * 0.9;
    const side = (Math.random() < 0.5 ? -1 : 1) * (12 + Math.random() * 15);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 3, 6), treeTrunkMat);
    trunk.position.set(side, -6.5, z);
    scene.add(trunk);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(2 + Math.random(), 6, 6), treeLeafMat);
    leaves.position.set(side, -4, z);
    scene.add(leaves);
  }

  // River
  const riverPoints = [];
  for (let i = 0; i <= 100; i++) {
    const z = -i * (trackLength / 100) * 1.1;
    const x = Math.sin(i * 0.04) * 20 + 25;
    riverPoints.push(new THREE.Vector3(x, -7.95, z));
  }
  const riverCurve = new THREE.CatmullRomCurve3(riverPoints);
  const riverShape = new THREE.Shape();
  riverShape.moveTo(-3, 0);
  riverShape.lineTo(3, 0);
  const riverGeo = new THREE.ExtrudeGeometry(riverShape, {
    steps: 200, extrudePath: riverCurve, bevelEnabled: false
  });
  scene.add(new THREE.Mesh(riverGeo, new THREE.MeshStandardMaterial({
    color: 0x4fc3f7, transparent: true, opacity: 0.7, metalness: 0.3, roughness: 0.2
  })));

  // Signs — placed 3 times along the track
  const signs = [];
  const signMeshes = [];
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function makeTextTexture(text, isCorrect) {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 256;
    const ctx = cv.getContext('2d');
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(12, 12, 488, 232, 20);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = isCorrect ? '#6c5ce7' : '#a29bfe';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(12, 12, 488, 232, 20);
    ctx.stroke();
    ctx.fillStyle = isCorrect ? '#6c5ce7' : '#a29bfe';
    ctx.beginPath();
    ctx.roundRect(12, 12, 488, 8, [20, 20, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#2d3436';
    ctx.font = text.length > 14 ? 'bold 38px Nunito, sans-serif' : 'bold 46px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 135, 440);
    return new THREE.CanvasTexture(cv);
  }

  // Find the first valley (local minimum) to start placing signs there
  let firstValleyT = 0.15; // fallback
  for (let i = 10; i < 200; i++) {
    const tPrev = (i - 1) / 200;
    const tCur = i / 200;
    const tNext = (i + 1) / 200;
    const yPrev = trackCurve.getPointAt(tPrev).y;
    const yCur = trackCurve.getPointAt(tCur).y;
    const yNext = trackCurve.getPointAt(tNext).y;
    if (yCur <= yPrev && yCur <= yNext && yPrev - yCur > 1) {
      firstValleyT = tCur;
      break;
    }
  }

  const passes = 3;
  const signSpacing = 0.05;
  const passSpacing = 0.28;
  const startT = firstValleyT;

  for (let pass = 0; pass < passes; pass++) {
    const passStart = startT + pass * passSpacing;
    allWords.forEach((w, i) => {
      const t = passStart + i * signSpacing;
      if (t >= 0.95) return;
      const p = trackCurve.getPointAt(t);
      const side = (i % 2 === 0) ? -1 : 1;
      const tex = makeTextTexture(w[answerField], w.id === correctWord.id);
      const signMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(5, 2.5),
        new THREE.MeshStandardMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
      );
      signMesh.position.set(p.x + side * 5, p.y + 3, p.z);
      const lookTarget = trackCurve.getPointAt(Math.max(t - 0.03, 0));
      signMesh.lookAt(new THREE.Vector3(lookTarget.x, p.y + 3, lookTarget.z));
      signMesh.rotation.y += side * 0.4;
      signMesh.userData = { wordId: w.id, word: w };
      scene.add(signMesh);
      signs.push({ mesh: signMesh, t, word: w });
      signMeshes.push(signMesh);

      const postHeight = 3 + 1.75 - 1.25;
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, postHeight, 6),
        new THREE.MeshStandardMaterial({ color: 0x777788 })
      );
      post.position.set(p.x + side * 5, p.y + 3 - 1.25 - postHeight / 2, p.z);
      scene.add(post);
    });
  }

  // Animation
  let cameraT = 0;
  let answered = false;
  let animId = null;

  // Adaptive speed: measure FPS during first 20 frames, then set speed
  // so the ride always takes ~25 seconds regardless of device performance
  const TARGET_RIDE_SECONDS = 25;
  const TRACK_RANGE = 0.92; // we travel from 0 to 0.92
  let speed = 0.0004; // fallback
  let calibrationFrames = 0;
  let calibrationStart = 0;
  let calibrated = false;

  function cleanup() {
    cancelAnimationFrame(animId);
    renderer.dispose();
  }

  function highlightCorrect() {
    signs.forEach(s => {
      if (s.word.id === correctWord.id) s.mesh.material.color.set(0x00b894);
    });
  }

  const animate = () => {
    if (cameraT >= 0.92 || answered) {
      renderer.render(scene, camera);
      if (!answered) {
        answered = true;
        highlightCorrect();
        setTimeout(() => { cleanup(); callbacks.onMiss(correctWord); }, 2500);
      }
      return;
    }
    animId = requestAnimationFrame(animate);

    // Calibration phase: measure actual FPS
    if (!calibrated) {
      if (calibrationFrames === 0) {
        calibrationStart = performance.now();
      }
      calibrationFrames++;
      if (calibrationFrames >= 20) {
        const elapsed = (performance.now() - calibrationStart) / 1000;
        const fps = 20 / elapsed;
        // speed per frame = total distance / (fps * target seconds)
        speed = TRACK_RANGE / (fps * TARGET_RIDE_SECONDS);
        calibrated = true;
      }
    }

    // Height-based speed: fast in valleys, slow on hilltops (energy conservation)
    const currentY = trackCurve.getPointAt(cameraT).y;
    const normalizedHeight = (currentY - trackMinY) / trackHeightRange; // 0=bottom 1=top
    const heightSpeedFactor = Math.sqrt(MIN2 + (1 - MIN2) * (1 - normalizedHeight));
    cameraT += speed * (heightSpeedFactor / avgSpeedFactor);
    if (cameraT > 0.92) cameraT = 0.92;
    const pos = trackCurve.getPointAt(cameraT);
    const lookAtPos = trackCurve.getPointAt(Math.min(cameraT + 0.015, 0.99));
    camera.position.copy(pos);
    camera.position.y += 1.8;
    camera.lookAt(lookAtPos.x, lookAtPos.y + 1.8, lookAtPos.z);

    // Banking
    const tangent = trackCurve.getTangentAt(cameraT);
    camera.rotation.z = -Math.atan2(tangent.x, -tangent.z) * 0.3;

    renderer.render(scene, camera);
  };
  animate();

  // Click/Tap handling
  const handleClick = (e) => {
    if (answered) return;
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    pointer.x = ((clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(signMeshes);
    if (hits.length > 0) {
      const hit = hits[0].object;
      const word = hit.userData.word;
      answered = true;
      if (word.id === correctWord.id) {
        hit.material.color.set(0x00b894);
        setTimeout(() => { cleanup(); callbacks.onCorrect(correctWord); }, 1500);
      } else {
        hit.material.color.set(0xe17055);
        highlightCorrect();
        setTimeout(() => { cleanup(); callbacks.onWrong(correctWord); }, 3000);
      }
    }
  };
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('touchstart', handleClick, { passive: false });

  return { cleanup };
}
