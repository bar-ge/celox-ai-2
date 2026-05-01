import { useEffect, useRef } from 'react'
import * as THREE from 'three'

// ── Car geometry builder ───────────────────────────────────────────────────────
function buildCar() {
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a3468, metalness: 0.45, roughness: 0.22,
    clearcoat: 1.0, clearcoatRoughness: 0.07,
  })
  const chrome = new THREE.MeshStandardMaterial({ color: 0xbec8d4, metalness: 0.96, roughness: 0.04 })
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x061020, roughness: 0.02, metalness: 0.05,
    opacity: 0.78, transparent: true, side: THREE.DoubleSide,
  })
  const rubber = new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.92 })
  const headlight = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(0xffffff), emissiveIntensity: 4 })
  const taillight = new THREE.MeshStandardMaterial({ color: 0xff1122, emissive: new THREE.Color(0xff0011), emissiveIntensity: 3 })
  const dark = new THREE.MeshStandardMaterial({ color: 0x0c1117, metalness: 0.3, roughness: 0.7 })
  const caliper = new THREE.MeshStandardMaterial({ color: 0xcc2200, metalness: 0.3, roughness: 0.5 })

  const car = new THREE.Group()
  const wheels = []

  const box = (w, h, d, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    m.position.set(x, y, z)
    m.castShadow = true
    car.add(m)
    return m
  }

  // ── Body ──────────────────────────────────────────────────────────────────
  box(2.02, 0.52, 4.45, bodyMat, 0, 0.46, 0)        // chassis
  box(1.63, 0.56, 2.04, bodyMat, 0, 0.98, -0.10)    // cabin
  box(1.84, 0.14, 1.13, bodyMat, 0, 0.65, 1.36)     // hood
  box(1.77, 0.19, 0.74, bodyMat, 0, 0.73, -1.44)    // trunk
  box(1.90, 0.30, 0.15, bodyMat, 0, 0.27, 2.27)     // front bumper
  box(1.90, 0.28, 0.15, bodyMat, 0, 0.27, -2.27)    // rear bumper
  box(1.60, 0.08, 1.89, bodyMat, 0, 1.28, -0.10)    // roof panel

  // Side skirts
  ;[-1.03, 1.03].forEach(x => box(0.10, 0.17, 3.65, dark, x, 0.29, 0))

  // Front lip spoiler
  box(1.54, 0.06, 0.10, dark, 0, 0.06, 2.28)

  // ── Windows ───────────────────────────────────────────────────────────────
  const pane = (w, h, x, y, z, rx = 0, ry = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glass)
    m.position.set(x, y, z)
    m.rotation.set(rx, ry, 0)
    car.add(m)
  }
  pane(1.46, 0.48,  0, 1.02,  0.83, -0.34, 0)           // windshield
  pane(1.46, 0.45,  0, 1.02, -1.10,  0.32, 0)           // rear window
  pane(1.74, 0.38, -0.83, 1.02, -0.10, 0, Math.PI / 2)  // left side
  pane(1.74, 0.38,  0.83, 1.02, -0.10, 0, -Math.PI / 2) // right side

  // ── Headlights ────────────────────────────────────────────────────────────
  ;[-0.65, 0.65].forEach(x => {
    box(0.34, 0.13, 0.07, headlight, x, 0.53, 2.23)
    box(0.28, 0.04, 0.05, headlight, x, 0.64, 2.23)  // DRL strip
  })

  // ── Tail lights ───────────────────────────────────────────────────────────
  ;[-0.62, 0.62].forEach(x => {
    box(0.40, 0.16, 0.07, taillight, x, 0.53, -2.22)
  })

  // ── Grille ────────────────────────────────────────────────────────────────
  box(1.14, 0.23, 0.07, dark, 0, 0.31, 2.22)           // grille bg
  for (let i = 0; i < 5; i++) {                          // vertical bars
    box(0.02, 0.20, 0.06, chrome, -0.48 + i * 0.24, 0.31, 2.23)
  }
  box(1.20, 0.04, 0.04, chrome, 0, 0.43, 2.23)         // top trim
  box(1.20, 0.04, 0.04, chrome, 0, 0.19, 2.23)         // bottom trim

  // Front emblem
  box(0.12, 0.12, 0.04, chrome, 0, 0.31, 2.24)

  // ── Mirrors ───────────────────────────────────────────────────────────────
  ;[-1.06, 1.06].forEach(x => {
    box(0.08, 0.13, 0.21, bodyMat, x, 0.89, 0.73)
    box(0.04, 0.11, 0.18, glass,   x * 1.06, 0.89, 0.73)
  })

  // ── Door handles ──────────────────────────────────────────────────────────
  ;[-1.04, 1.04].forEach(x => {
    box(0.04, 0.05, 0.20, chrome, x, 0.56,  0.36)
    box(0.04, 0.05, 0.20, chrome, x, 0.56, -0.52)
  })

  // ── Window chrome surround ─────────────────────────────────────────────────
  box(1.60, 0.04, 0.04, chrome, 0, 1.30,  0.89)  // windshield top
  box(1.60, 0.04, 0.04, chrome, 0, 1.30, -1.11)  // rear top

  // ── Exhaust ───────────────────────────────────────────────────────────────
  ;[-0.32, 0.32].forEach(x => box(0.11, 0.09, 0.06, chrome, x, 0.16, -2.28))

  // ── Wheels ────────────────────────────────────────────────────────────────
  const wPos = [
    [-1.04, 0.36,  1.46],
    [ 1.04, 0.36,  1.46],
    [-1.04, 0.36, -1.46],
    [ 1.04, 0.36, -1.46],
  ]

  const diskMat = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.7, roughness: 0.3 })

  wPos.forEach(([wx, wy, wz]) => {
    const wg = new THREE.Group()
    wg.position.set(wx, wy, wz)
    wg.rotation.z = Math.PI / 2

    // Tire
    wg.add(Object.assign(new THREE.Mesh(new THREE.TorusGeometry(0.358, 0.133, 20, 48), rubber)))

    // Rim plate
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.10, 8), chrome)
    rim.rotation.x = Math.PI / 2
    wg.add(rim)

    // 5 spokes
    for (let s = 0; s < 5; s++) {
      const a = (s / 5) * Math.PI * 2
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.27, 0.06), chrome)
      spoke.position.set(Math.sin(a) * 0.12, Math.cos(a) * 0.12, 0)
      spoke.rotation.z = a
      wg.add(spoke)
    }

    // Center cap
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.13, 8), chrome)
    cap.rotation.x = Math.PI / 2
    wg.add(cap)

    // Brake disk
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.04, 12), diskMat)
    disk.rotation.x = Math.PI / 2
    disk.position.z = wx > 0 ? 0.1 : -0.1
    wg.add(disk)

    // Caliper
    const cal = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.19, 0.17), caliper)
    cal.position.set(0, 0.20, wx > 0 ? 0.14 : -0.14)
    wg.add(cal)

    car.add(wg)
    wheels.push(wg)
  })

  return { car, wheels }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Car3D({ scrollY }) {
  const mountRef = useRef(null)
  const stateRef = useRef({ targetRotY: Math.PI * 0.18, wheelSpin: 0 })

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || window.innerWidth < 900) return

    const W = mount.clientWidth || 440
    const H = mount.clientHeight || 380

    const renderer = new THREE.WebGLRenderer({ canvas: mount, alpha: true, antialias: true })
    renderer.setSize(W, H, false)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.25

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, W / H, 0.1, 100)
    camera.position.set(3.6, 2.0, 7.0)
    camera.lookAt(0, 0.75, 0)

    // ── Lighting ──────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x1e3a6e, 1.5))

    const sun = new THREE.DirectionalLight(0xffffff, 3.0)
    sun.position.set(4, 9, 5)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    scene.add(sun)

    const blue = new THREE.PointLight(0x3b82f6, 5.5, 14)
    blue.position.set(-4, 2, -2.5)
    scene.add(blue)

    const warm = new THREE.PointLight(0xffeedd, 2.5, 10)
    warm.position.set(3.5, 0.5, 4.5)
    scene.add(warm)

    // Under-glow
    const glow = new THREE.PointLight(0x2563eb, 1.8, 4)
    glow.position.set(0, -0.2, 0)
    scene.add(glow)

    // ── Car ───────────────────────────────────────────────────────────────────
    const { car, wheels } = buildCar()
    scene.add(car)
    stateRef.current.car = car
    stateRef.current.wheels = wheels

    // ── Animate ───────────────────────────────────────────────────────────────
    let animId
    const t0 = Date.now()

    const tick = () => {
      animId = requestAnimationFrame(tick)
      const t = (Date.now() - t0) / 1000

      // Gentle float
      car.position.y = Math.sin(t * 0.9) * 0.072

      // Smooth lerp to target rotation
      car.rotation.y += (stateRef.current.targetRotY - car.rotation.y) * 0.055

      // Wheel spin
      wheels.forEach(w => { w.rotation.y = stateRef.current.wheelSpin })

      // Pulse blue light
      blue.intensity = 4.5 + Math.sin(t * 1.4) * 1.2
      blue.position.x = -4 + Math.sin(t * 0.5) * 0.6

      renderer.render(scene, camera)
    }
    tick()

    return () => {
      cancelAnimationFrame(animId)
      renderer.dispose()
    }
  }, [])

  // Scroll-driven rotation + wheel spin
  useEffect(() => {
    stateRef.current.targetRotY = scrollY * 0.0018 + Math.PI * 0.18
    stateRef.current.wheelSpin  = scrollY * 0.007
  }, [scrollY])

  return (
    <canvas
      ref={mountRef}
      width={440}
      height={380}
      style={{
        position: 'fixed',
        right: 'max(2vw, 12px)',
        top: '50%',
        transform: 'translateY(-50%)',
        width: 'min(440px, 36vw)',
        height: 'auto',
        pointerEvents: 'none',
        zIndex: 4,
        opacity: 0.94,
      }}
    />
  )
}
