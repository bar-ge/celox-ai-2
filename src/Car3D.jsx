import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

// ── Materials ──────────────────────────────────────────────────────────────────
function makeMats() {
  return {
    body: new THREE.MeshPhysicalMaterial({
      color: 0x1a3468, metalness: 0.55, roughness: 0.18,
      clearcoat: 1.0, clearcoatRoughness: 0.05,
    }),
    chrome: new THREE.MeshPhysicalMaterial({
      color: 0xd0dae4, metalness: 1.0, roughness: 0.02,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x040912, roughness: 0.01, metalness: 0.08,
      opacity: 0.80, transparent: true, side: THREE.DoubleSide,
    }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.96 }),
    headlight: new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: new THREE.Color(0xffffff), emissiveIntensity: 6,
    }),
    taillight: new THREE.MeshStandardMaterial({
      color: 0xff1122, emissive: new THREE.Color(0xff0011), emissiveIntensity: 5,
    }),
    grille: new THREE.MeshStandardMaterial({ color: 0x07090d, metalness: 0.2, roughness: 0.8 }),
    disk: new THREE.MeshStandardMaterial({ color: 0x44445a, metalness: 0.75, roughness: 0.3 }),
    caliper: new THREE.MeshStandardMaterial({ color: 0xcc2200, metalness: 0.3, roughness: 0.5 }),
    skirt: new THREE.MeshStandardMaterial({ color: 0x0a0d12, metalness: 0.15, roughness: 0.85 }),
  }
}

// ── Car geometry ───────────────────────────────────────────────────────────────
function buildCar(M) {
  const car    = new THREE.Group()
  const wheels = []

  const RB = (w, h, d, s, r) => new RoundedBoxGeometry(w, h, d, s, r)
  const B  = (...a)           => new THREE.BoxGeometry(...a)
  const C  = (r, R, h, s)    => new THREE.CylinderGeometry(r, R ?? r, h, s ?? 16)
  const T  = (R, r)           => new THREE.TorusGeometry(R, r, 20, 48)

  const mesh = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(x, y, z)
    if (rx || ry || rz) m.rotation.set(rx, ry, rz)
    m.castShadow = m.receiveShadow = true
    car.add(m)
    return m
  }

  // Body
  mesh(RB(2.04, 0.53, 4.46, 4, 0.08),  M.body,  0, 0.465, 0)
  mesh(RB(1.62, 0.58, 2.06, 4, 0.20),  M.body,  0, 0.985, -0.10)  // cabin – high roundness
  mesh(RB(1.86, 0.14, 1.14, 3, 0.06),  M.body,  0, 0.655,  1.365) // hood
  mesh(RB(1.78, 0.20, 0.76, 3, 0.07),  M.body,  0, 0.735, -1.445) // trunk
  mesh(RB(1.92, 0.31, 0.16, 2, 0.06),  M.body,  0, 0.27,   2.27)  // front bumper
  mesh(RB(1.92, 0.29, 0.16, 2, 0.06),  M.body,  0, 0.27,  -2.27)  // rear bumper
  mesh(RB(1.62, 0.07, 1.90, 2, 0.03),  M.body,  0, 1.285, -0.10)  // roof

  // A-pillars
  ;[-0.70, 0.70].forEach(x => mesh(RB(0.07, 0.48, 0.08, 2, 0.03), M.body, x, 0.97, 0.87, 0.34))
  // C-pillars
  ;[-0.70, 0.70].forEach(x => mesh(RB(0.07, 0.40, 0.08, 2, 0.03), M.body, x, 0.97, -1.00, -0.30))

  // Side skirts
  ;[-1.04, 1.04].forEach(x => mesh(RB(0.10, 0.17, 3.66, 2, 0.04), M.skirt, x, 0.29, 0))
  mesh(B(1.58, 0.06, 0.10), M.skirt, 0, 0.062, 2.29) // front lip

  // Windows
  const pane = (w, h, x, y, z, rx = 0, ry = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M.glass)
    m.position.set(x, y, z)
    m.rotation.set(rx, ry, 0)
    car.add(m)
  }
  pane(1.47, 0.49,  0,     1.025,  0.84, -0.35)
  pane(1.47, 0.46,  0,     1.025, -1.11,  0.33)
  pane(1.73, 0.40, -0.84,  1.025, -0.10,  0,  Math.PI / 2)
  pane(1.73, 0.40,  0.84,  1.025, -0.10,  0, -Math.PI / 2)

  // Headlights
  ;[-0.66, 0.66].forEach(x => {
    mesh(B(0.35, 0.13, 0.07), M.headlight, x, 0.535, 2.23)
    mesh(B(0.29, 0.038, 0.05), M.headlight, x, 0.648, 2.23)
    mesh(B(0.40, 0.17, 0.05), M.chrome, x, 0.535, 2.215)
  })

  // Tail lights
  ;[-0.63, 0.63].forEach(x => {
    mesh(B(0.41, 0.17, 0.07), M.taillight, x, 0.535, -2.22)
    mesh(B(0.46, 0.21, 0.05), M.chrome, x, 0.535, -2.207)
  })
  mesh(B(1.30, 0.028, 0.05), M.taillight, 0, 0.64, -2.22) // brake strip

  // Grille
  mesh(B(1.16, 0.24, 0.08), M.grille, 0, 0.31, 2.22)
  for (let i = 0; i < 5; i++) mesh(B(0.022, 0.21, 0.06), M.chrome, -0.48 + i * 0.24, 0.31, 2.23)
  for (let j = 0; j < 3; j++) mesh(B(1.10, 0.022, 0.06), M.chrome, 0, 0.21 + j * 0.09, 2.23)
  mesh(RB(1.22, 0.052, 0.05, 2, 0.02), M.chrome, 0, 0.435, 2.23)
  mesh(RB(1.22, 0.052, 0.05, 2, 0.02), M.chrome, 0, 0.18,  2.23)

  // Mirrors
  ;[-1.07, 1.07].forEach(x => {
    mesh(RB(0.09, 0.14, 0.22, 2, 0.03), M.body,  x,       0.89, 0.74)
    mesh(B(0.045, 0.12, 0.19),          M.glass,  x * 1.075, 0.89, 0.74)
  })

  // Door handles
  ;[-1.045, 1.045].forEach(x => {
    mesh(RB(0.045, 0.052, 0.21, 2, 0.02), M.chrome, x, 0.565,  0.37)
    mesh(RB(0.045, 0.052, 0.21, 2, 0.02), M.chrome, x, 0.565, -0.51)
  })

  // Chrome window surround
  mesh(B(1.62, 0.042, 0.04), M.chrome, 0, 1.30,  0.90)
  mesh(B(1.62, 0.042, 0.04), M.chrome, 0, 1.30, -1.12)
  ;[-0.82, 0.82].forEach(x => {
    mesh(B(0.042, 0.44, 0.04), M.chrome, x, 1.025,  0.88)
    mesh(B(0.042, 0.38, 0.04), M.chrome, x, 1.025, -1.00)
  })

  // Exhaust
  ;[-0.33, 0.33].forEach(x => mesh(C(0.06, 0.06, 0.07, 12), M.chrome, x, 0.165, -2.285, Math.PI / 2))

  // Wheels
  ;[[-1.045, 1.46], [1.045, 1.46], [-1.045, -1.46], [1.045, -1.46]].forEach(([wx, wz]) => {
    const wg = new THREE.Group()
    wg.position.set(wx, 0.365, wz)
    wg.rotation.z = Math.PI / 2

    wg.add(new THREE.Mesh(T(0.358, 0.134), M.rubber))

    const rim = new THREE.Mesh(C(0.265, 0.265, 0.10, 8), M.chrome)
    rim.rotation.x = Math.PI / 2
    wg.add(rim)

    for (let s = 0; s < 5; s++) {
      const a = (s / 5) * Math.PI * 2
      const spoke = new THREE.Mesh(B(0.068, 0.26, 0.065), M.chrome)
      spoke.position.set(Math.sin(a) * 0.115, Math.cos(a) * 0.115, 0)
      spoke.rotation.z = a
      wg.add(spoke)
    }

    const cap = new THREE.Mesh(C(0.072, 0.072, 0.13, 8), M.chrome)
    cap.rotation.x = Math.PI / 2
    wg.add(cap)

    const bDisk = new THREE.Mesh(C(0.228, 0.228, 0.042, 16), M.disk)
    bDisk.rotation.x = Math.PI / 2
    bDisk.position.z = wx > 0 ? 0.09 : -0.09
    wg.add(bDisk)

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

    let rafId
    try {
      const W = 480, H = 420

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

      // ── Environment map via PMREMGenerator + neutral room ──────────────────
      const pmrem = new THREE.PMREMGenerator(renderer)
      // Create a simple gradient environment using a scene with colored panels
      const envScene = new THREE.Scene()
      const envGeo   = new THREE.SphereGeometry(10, 16, 16)
      envScene.add(new THREE.Mesh(envGeo,
        new THREE.MeshBasicMaterial({
          side: THREE.BackSide,
          color: 0x0a1628,
        })
      ))
      const envTexture = pmrem.fromScene(envScene).texture
      scene.environment = envTexture
      pmrem.dispose()

      // ── Lights ─────────────────────────────────────────────────────────────
      scene.add(new THREE.AmbientLight(0x1e3a70, 1.2))

      const sun = new THREE.DirectionalLight(0xffffff, 3.8)
      sun.position.set(5, 10, 7)
      sun.castShadow = true
      sun.shadow.mapSize.set(1024, 1024)
      scene.add(sun)

      const blue = new THREE.PointLight(0x3b82f6, 8, 16)
      blue.position.set(-5, 2.5, -3)
      scene.add(blue)

      const warm = new THREE.PointLight(0xfff0dd, 4, 12)
      warm.position.set(4.5, 0.5, 5.5)
      scene.add(warm)

      const under = new THREE.PointLight(0x1e40af, 3, 5)
      under.position.set(0, -0.2, 0)
      scene.add(under)

      const rimLight = new THREE.PointLight(0xffffff, 2.5, 4)
      rimLight.position.set(0, 3.5, 1)
      scene.add(rimLight)

      // Headlight point lights (make them actually cast light)
      const hlLeft  = new THREE.PointLight(0xffffff, 2, 3)
      hlLeft.position.set(-0.66, 0.54, 2.6)
      scene.add(hlLeft)
      const hlRight = new THREE.PointLight(0xffffff, 2, 3)
      hlRight.position.set(0.66, 0.54, 2.6)
      scene.add(hlRight)

      // ── Ground reflection disc ──────────────────────────────────────────────
      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(3.6, 80),
        new THREE.MeshPhysicalMaterial({
          color: 0x080e1a, metalness: 0.98, roughness: 0.02,
          opacity: 0.45, transparent: true,
        })
      )
      ground.rotation.x = -Math.PI / 2
      ground.position.y = 0.005
      scene.add(ground)

      // Glow ring
      const glowRing = new THREE.Mesh(
        new THREE.RingGeometry(1.0, 2.2, 64),
        new THREE.MeshBasicMaterial({
          color: 0x1e4aba, transparent: true, opacity: 0.12, side: THREE.DoubleSide,
        })
      )
      glowRing.rotation.x = -Math.PI / 2
      glowRing.position.y = 0.012
      scene.add(glowRing)

      // ── Car ────────────────────────────────────────────────────────────────
      const M = makeMats()
      const { car, wheels } = buildCar(M)
      scene.add(car)
      stateRef.current.car    = car
      stateRef.current.wheels = wheels

      // ── Animate ────────────────────────────────────────────────────────────
      const t0 = Date.now()

      const tick = () => {
        rafId = requestAnimationFrame(tick)
        const t  = (Date.now() - t0) / 1000
        const sy = stateRef.current.scrollY || 0

        car.position.y = Math.sin(t * 0.88) * 0.078 + Math.sin(sy * 0.0022) * 0.10
        car.rotation.y += (stateRef.current.targetRotY - car.rotation.y) * 0.052

        wheels.forEach(w => { w.rotation.y = stateRef.current.wheelSpin })

        blue.intensity        = 5.5 + Math.sin(t * 1.4) * 2.0
        under.intensity       = 2.0 + Math.sin(t * 0.9) * 0.8
        glowRing.material.opacity = 0.10 + Math.sin(t * 0.7) * 0.04

        renderer.render(scene, camera)
      }
      tick()

      stateRef.current.cleanup = () => {
        cancelAnimationFrame(rafId)
        renderer.dispose()
      }
    } catch (e) {
      console.warn('Car3D init failed:', e)
    }

    return () => stateRef.current.cleanup?.()
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
