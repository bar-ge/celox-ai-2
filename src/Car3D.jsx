import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment }    from 'three/addons/environments/RoomEnvironment.js'
import { EffectComposer }     from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass }         from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass }    from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass }         from 'three/addons/postprocessing/OutputPass.js'

// ── materials (created once per scene) ────────────────────────────────────────
function makeMats() {
  return {
    body: new THREE.MeshPhysicalMaterial({
      color: 0x1a3468, metalness: 0.55, roughness: 0.18,
      clearcoat: 1.0, clearcoatRoughness: 0.05, envMapIntensity: 2.5,
    }),
    chrome: new THREE.MeshPhysicalMaterial({
      color: 0xd0dae4, metalness: 1.0, roughness: 0.02, envMapIntensity: 4.0,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x040912, roughness: 0.01, metalness: 0.08,
      opacity: 0.80, transparent: true, side: THREE.DoubleSide, envMapIntensity: 2.0,
    }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.96 }),
    headlight: new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: new THREE.Color(0xffffff), emissiveIntensity: 5,
    }),
    taillight: new THREE.MeshStandardMaterial({
      color: 0xff1122, emissive: new THREE.Color(0xff0011), emissiveIntensity: 4,
    }),
    grille: new THREE.MeshStandardMaterial({ color: 0x07090d, metalness: 0.2, roughness: 0.8 }),
    disk: new THREE.MeshStandardMaterial({ color: 0x44445a, metalness: 0.75, roughness: 0.3 }),
    caliper: new THREE.MeshStandardMaterial({ color: 0xcc2200, metalness: 0.3, roughness: 0.5 }),
    skirt: new THREE.MeshStandardMaterial({ color: 0x0a0d12, metalness: 0.15, roughness: 0.85 }),
  }
}

// ── geometry builder ──────────────────────────────────────────────────────────
function buildCar(M) {
  const car    = new THREE.Group()
  const wheels = []

  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(x, y, z)
    if (rx || ry || rz) m.rotation.set(rx, ry, rz)
    m.castShadow = true
    car.add(m)
    return m
  }

  const RB = (w, h, d, seg, r) => new RoundedBoxGeometry(w, h, d, seg, r)
  const B  = (w, h, d)         => new THREE.BoxGeometry(w, h, d)
  const C  = (r, R, s, c)      => new THREE.CylinderGeometry(r, R ?? r, s, c ?? 16)
  const T  = (R, r, ts, tc)    => new THREE.TorusGeometry(R, r, ts ?? 20, tc ?? 48)

  // ── Body panels ────────────────────────────────────────────────────────────
  add(RB(2.04, 0.53, 4.46, 4, 0.08),  M.body,   0, 0.465, 0)       // chassis
  add(RB(1.62, 0.58, 2.06, 4, 0.20),  M.body,   0, 0.985, -0.10)   // cabin – high roundness gives dome feel
  add(RB(1.86, 0.14, 1.14, 3, 0.06),  M.body,   0, 0.655, 1.365)   // hood
  add(RB(1.78, 0.20, 0.76, 3, 0.07),  M.body,   0, 0.735, -1.445)  // trunk lid
  add(RB(1.92, 0.31, 0.16, 2, 0.06),  M.body,   0, 0.27,  2.27)    // front bumper
  add(RB(1.92, 0.29, 0.16, 2, 0.06),  M.body,   0, 0.27, -2.27)    // rear bumper
  add(RB(1.62, 0.07, 1.90, 2, 0.03),  M.body,   0, 1.285, -0.10)   // roof panel
  // A-pillars
  ;[-0.70, 0.70].forEach(x => add(RB(0.07, 0.48, 0.08, 2, 0.03), M.body, x, 0.97, 0.87, 0.34))
  // C-pillars
  ;[-0.70, 0.70].forEach(x => add(RB(0.07, 0.40, 0.08, 2, 0.03), M.body, x, 0.97, -1.00, -0.30))

  // ── Side skirts ─────────────────────────────────────────────────────────────
  ;[-1.04, 1.04].forEach(x => add(RB(0.10, 0.17, 3.66, 2, 0.04), M.skirt, x, 0.29, 0))

  // ── Front spoiler lip ───────────────────────────────────────────────────────
  add(B(1.58, 0.06, 0.10), M.skirt, 0, 0.062, 2.29)

  // ── Windows ─────────────────────────────────────────────────────────────────
  const pane = (w, h, x, y, z, rx = 0, ry = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M.glass)
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); car.add(m)
  }
  pane(1.47, 0.49,  0,     1.025,  0.84, -0.35)          // windshield
  pane(1.47, 0.46,  0,     1.025, -1.11,  0.33)          // rear window
  pane(1.73, 0.40, -0.84,  1.025, -0.10,  0, Math.PI/2)  // left side
  pane(1.73, 0.40,  0.84,  1.025, -0.10,  0,-Math.PI/2)  // right side

  // ── Headlights (emissive → bloom) ───────────────────────────────────────────
  ;[-0.66, 0.66].forEach(x => {
    add(B(0.35, 0.13, 0.07), M.headlight, x, 0.535, 2.23)   // main unit
    add(B(0.29, 0.038, 0.05), M.headlight, x, 0.648, 2.23)   // DRL strip
    // housing surround
    add(B(0.40, 0.17, 0.05), M.chrome, x, 0.535, 2.215)
  })

  // ── Tail lights (emissive → bloom) ──────────────────────────────────────────
  ;[-0.63, 0.63].forEach(x => {
    add(B(0.41, 0.17, 0.07), M.taillight, x, 0.535, -2.22)
    add(B(0.46, 0.21, 0.05), M.chrome,    x, 0.535, -2.207)
  })
  // brake light strip across rear
  add(B(1.30, 0.028, 0.05), M.taillight, 0, 0.64, -2.22)

  // ── Grille ──────────────────────────────────────────────────────────────────
  add(B(1.16, 0.24, 0.08), M.grille, 0, 0.31, 2.22)
  for (let i = 0; i < 5; i++) add(B(0.022, 0.21, 0.06), M.chrome, -0.48+i*0.24, 0.31, 2.23)
  for (let j = 0; j < 3; j++) add(B(1.10, 0.022, 0.06), M.chrome, 0, 0.21+j*0.09, 2.23)
  add(RB(1.22, 0.052, 0.05, 2, 0.02), M.chrome, 0, 0.435, 2.23)
  add(RB(1.22, 0.052, 0.05, 2, 0.02), M.chrome, 0, 0.18,  2.23)
  add(C(0.04, 0.04, 0.08, 8), M.chrome, 0, 0.31, 2.245, Math.PI/2) // center badge

  // ── Mirrors ─────────────────────────────────────────────────────────────────
  ;[-1.07, 1.07].forEach(x => {
    add(RB(0.09, 0.14, 0.22, 2, 0.03), M.body,   x,        0.89, 0.74)
    add(B(0.045, 0.12, 0.19),          M.glass,   x*1.075,  0.89, 0.74)
    // mirror stalk
    add(B(0.07, 0.04, 0.08), M.body, x*0.985, 0.82, 0.72)
  })

  // ── Door handles ────────────────────────────────────────────────────────────
  ;[-1.045, 1.045].forEach(x => {
    add(RB(0.045, 0.052, 0.21, 2, 0.02), M.chrome, x, 0.565,  0.37)
    add(RB(0.045, 0.052, 0.21, 2, 0.02), M.chrome, x, 0.565, -0.51)
  })

  // ── Chrome window surround ───────────────────────────────────────────────────
  add(B(1.62, 0.042, 0.04), M.chrome, 0, 1.30,  0.90)
  add(B(1.62, 0.042, 0.04), M.chrome, 0, 1.30, -1.12)
  ;[-0.82, 0.82].forEach(x => {
    add(B(0.042, 0.44, 0.04), M.chrome, x, 1.025,  0.88)
    add(B(0.042, 0.38, 0.04), M.chrome, x, 1.025, -1.00)
  })

  // ── Exhaust ─────────────────────────────────────────────────────────────────
  ;[-0.33, 0.33].forEach(x => {
    add(C(0.06, 0.06, 0.07, 12), M.chrome, x, 0.165, -2.285, Math.PI/2)
    add(C(0.05, 0.05, 0.04, 12), M.grille, x, 0.165, -2.29,  Math.PI/2)
  })

  // ── Wheels ──────────────────────────────────────────────────────────────────
  ;[[-1.045, 1.46], [1.045, 1.46], [-1.045, -1.46], [1.045, -1.46]].forEach(([wx, wz]) => {
    const wg = new THREE.Group()
    wg.position.set(wx, 0.365, wz)
    wg.rotation.z = Math.PI / 2

    // Tire (torus)
    wg.add(new THREE.Mesh(T(0.358, 0.134), M.rubber))

    // Rim face – 8-sided polygon for that modern wheel look
    const rimFace = new THREE.Mesh(C(0.265, 0.265, 0.10, 8), M.chrome)
    rimFace.rotation.x = Math.PI / 2
    wg.add(rimFace)

    // 5 spokes – tapered boxes look better than uniform
    for (let s = 0; s < 5; s++) {
      const a = (s / 5) * Math.PI * 2
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.26, 0.065), M.chrome)
      spoke.position.set(Math.sin(a) * 0.115, Math.cos(a) * 0.115, 0)
      spoke.rotation.z = a
      wg.add(spoke)
    }

    // Center cap
    wg.add(Object.assign(new THREE.Mesh(C(0.072, 0.072, 0.13, 8), M.chrome),
      { rotation: new THREE.Euler(Math.PI/2, 0, 0) }))

    // Brake disk
    const bDisk = new THREE.Mesh(C(0.228, 0.228, 0.042, 16), M.disk)
    bDisk.rotation.x = Math.PI / 2
    bDisk.position.z = wx > 0 ? 0.09 : -0.09
    wg.add(bDisk)

    // Caliper
    const cal = new THREE.Mesh(RB(0.11, 0.20, 0.18, 2, 0.03), M.caliper)
    cal.position.set(0, 0.195, wx > 0 ? 0.145 : -0.145)
    wg.add(cal)

    car.add(wg)
    wheels.push(wg)
  })

  return { car, wheels }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Car3D({ scrollY }) {
  const mountRef = useRef(null)
  const stateRef = useRef({ targetRotY: Math.PI * 0.18, wheelSpin: 0, scrollY: 0 })

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || window.innerWidth < 1024) return

    const W = 480, H = 420

    // ── Renderer ───────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas: mount, alpha: true, antialias: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap
    renderer.toneMapping       = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.35

    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 100)
    camera.position.set(4.1, 2.25, 7.4)
    camera.lookAt(0, 0.78, 0)

    // ── Environment map (gives metallic reflections) ───────────────────────────
    const pmrem = new THREE.PMREMGenerator(renderer)
    pmrem.compileEquirectangularShader()
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envTex
    pmrem.dispose()

    // ── Lights ─────────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x1e3a70, 1.4))

    const sun = new THREE.DirectionalLight(0xffffff, 3.8)
    sun.position.set(5, 10, 7)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    scene.add(sun)

    const blue = new THREE.PointLight(0x3b82f6, 7, 16)
    blue.position.set(-5, 2.5, -3)
    scene.add(blue)

    const warm = new THREE.PointLight(0xfff0dd, 3.5, 12)
    warm.position.set(4.5, 0.5, 5.5)
    scene.add(warm)

    const under = new THREE.PointLight(0x1e40af, 2.5, 5)
    under.position.set(0, -0.2, 0)
    scene.add(under)

    // Rim top highlight
    const rimLight = new THREE.PointLight(0xffffff, 2, 4)
    rimLight.position.set(0, 3, 1)
    scene.add(rimLight)

    // ── Ground reflection disc ─────────────────────────────────────────────────
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(3.6, 80),
      new THREE.MeshPhysicalMaterial({
        color: 0x080e1a, metalness: 0.98, roughness: 0.02,
        opacity: 0.45, transparent: true, envMapIntensity: 2,
      })
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = 0.005
    scene.add(ground)

    // Soft glow ring below car
    const glowRing = new THREE.Mesh(
      new THREE.RingGeometry(1.0, 2.2, 64),
      new THREE.MeshBasicMaterial({ color: 0x1e4aba, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
    )
    glowRing.rotation.x = -Math.PI / 2
    glowRing.position.y = 0.012
    scene.add(glowRing)

    // ── Car ────────────────────────────────────────────────────────────────────
    const M = makeMats()
    const { car, wheels } = buildCar(M)
    scene.add(car)
    stateRef.current.car    = car
    stateRef.current.wheels = wheels

    // ── Post-processing ────────────────────────────────────────────────────────
    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.55, 0.38, 0.72)
    composer.addPass(bloom)
    composer.addPass(new OutputPass())

    // ── Animation loop ─────────────────────────────────────────────────────────
    let rafId
    const t0 = Date.now()

    const tick = () => {
      rafId = requestAnimationFrame(tick)
      const t  = (Date.now() - t0) / 1000
      const sy = stateRef.current.scrollY || 0

      // Float + section-aware dip
      car.position.y = Math.sin(t * 0.88) * 0.078 + Math.sin(sy * 0.0022) * 0.10

      // Smooth lerp rotation
      car.rotation.y += (stateRef.current.targetRotY - car.rotation.y) * 0.052

      // Wheel spin
      const ws = stateRef.current.wheelSpin
      wheels.forEach(w => { w.rotation.y = ws })

      // Animated lights
      blue.intensity  = 5.5 + Math.sin(t * 1.4) * 1.8
      under.intensity = 2.0 + Math.sin(t * 0.9) * 0.7
      glowRing.material.opacity = 0.10 + Math.sin(t * 0.7) * 0.04

      composer.render()
    }
    tick()

    return () => { cancelAnimationFrame(rafId); renderer.dispose() }
  }, [])

  useEffect(() => {
    stateRef.current.targetRotY = scrollY * 0.0018 + Math.PI * 0.18
    stateRef.current.wheelSpin  = scrollY * 0.007
    stateRef.current.scrollY    = scrollY
  }, [scrollY])

  return (
    <canvas
      ref={mountRef}
      style={{
        position: 'fixed',
        right: 'max(1.5vw, 10px)',
        top: '50%',
        transform: 'translateY(-50%)',
        width: 'min(480px, 38vw)',
        height: 'auto',
        pointerEvents: 'none',
        zIndex: 4,
      }}
    />
  )
}
