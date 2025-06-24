import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";

const Scene = () => {
  const mountRef = useRef();
  const sceneRef = useRef();
  const rendererRef = useRef();
  const cameraRef = useRef();
  const frameId = useRef();
  const materialRef = useRef();

  // Color controls
  const [primaryColor, setPrimaryColor] = useState("#ff0080");
  const [secondaryColor, setSecondaryColor] = useState("#00ff80");
  const [tertiaryColor, setTertiaryColor] = useState("#8000ff");
  const [animationSpeed, setAnimationSpeed] = useState(1.0);
  const [intensity, setIntensity] = useState(5.0);
  const [showControls, setShowControls] = useState(true);

  // Update colors in real-time
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uColor1.value = new THREE.Color(primaryColor);
      materialRef.current.uniforms.uColor2.value = new THREE.Color(secondaryColor);
      materialRef.current.uniforms.uColor3.value = new THREE.Color(tertiaryColor);
      materialRef.current.uniforms.uSpeed.value = animationSpeed;
      materialRef.current.uniforms.uIntensity.value = intensity;
    }
  }, [primaryColor, secondaryColor, tertiaryColor, animationSpeed, intensity]);

  useEffect(() => {
    if (!mountRef.current) return;
    
    // Clear any existing content first
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Create camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 3);

    // Create renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);

    // Add renderer to DOM
    mountRef.current.appendChild(renderer.domElement);

    // Store references
    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;

    // Create animated plane
    const planeGeometry = new THREE.PlaneGeometry(4, 4, 64, 64);
    const planeMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        uniform float uTime;

        // Simplex 3D Noise
        vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

        float snoise(vec3 v) {
          const vec2  C = vec2(1.0/6.0, 1.0/3.0);
          const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

          vec3 i = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);

          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);

          vec3 x1 = x0 - i1 + 1.0 * C.xxx;
          vec3 x2 = x0 - i2 + 2.0 * C.xxx;
          vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

          i = mod(i, 289.0);
          vec4 p = permute(permute(permute(
                      i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
                      i.y + vec4(0.0, i1.y, i2.y, 1.0)) +
                      i.x + vec4(0.0, i1.x, i2.x, 1.0));

          float n_ = 1.0 / 7.0;
          vec3 ns = n_ * D.wyz - D.xzx;

          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

          vec4 x = floor(j * ns.z);
          vec4 y = floor(j - 7.0 * x);

          vec4 x_ = x * ns.x + ns.yyyy;
          vec4 y_ = y * ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x_) - abs(y_);

          vec4 b0 = vec4(x_.xy, y_.xy);
          vec4 b1 = vec4(x_.zw, y_.zw);

          vec4 s0 = floor(b0) * 2.0 + 1.0;
          vec4 s1 = floor(b1) * 2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));

          vec4 a0 = b0.xyzw + s0.xzyw * sh.xxyy;
          vec4 a1 = b1.xyzw + s1.xzyw * sh.zzww;

          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);

          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;

          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }

        void main() {
          vUv = uv;
          vec2 modifiedCoord = uv * vec2(3.0, 4.0);
          vec3 newPosition = position;
          float distortion = snoise(vec3(modifiedCoord.x + uTime * 0.5, modifiedCoord.y, uTime)) * 1.0;
          distortion = max(0.0, distortion);
          newPosition.z += distortion;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uSpeed;
        uniform float uIntensity;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;

        void main() {
          vec2 uv = vUv;
          
          // Create flowing patterns with sine waves
          float wave1 = sin(uv.x * uIntensity + uTime * uSpeed * 2.0) * 0.1;
          float wave2 = sin(uv.y * (uIntensity * 0.8) + uTime * uSpeed * 1.5) * 0.1;
          float wave3 = sin((uv.x + uv.y) * (uIntensity * 0.6) + uTime * uSpeed * 3.0) * 0.1;
          
          uv += wave1 + wave2 + wave3;
          
          // Create flowing colors using the three custom colors
          float r = sin(uv.x * uIntensity + uTime * uSpeed) * 0.5 + 0.5;
          float g = sin(uv.y * (uIntensity * 0.8) + uTime * uSpeed * 1.2) * 0.5 + 0.5;
          float b = sin((uv.x + uv.y) * (uIntensity * 0.6) + uTime * uSpeed * 0.8) * 0.5 + 0.5;
          
          // Mix the three colors based on the wave patterns
          vec3 color = mix(uColor1, uColor2, r);
          color = mix(color, uColor3, g);
          color = mix(color, uColor1 * 0.5 + uColor2 * 0.5, b);
          
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: animationSpeed },
        uIntensity: { value: intensity },
        uColor1: { value: new THREE.Color(primaryColor) },
        uColor2: { value: new THREE.Color(secondaryColor) },
        uColor3: { value: new THREE.Color(tertiaryColor) },
      },
      side: THREE.DoubleSide,
    });

    materialRef.current = planeMaterial;

    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    scene.add(plane);

    // Animation loop
    const animate = () => {
      frameId.current = requestAnimationFrame(animate);

      // Update time uniform for smooth animation
      planeMaterial.uniforms.uTime.value = performance.now() * 0.001;

      // Render scene
      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener("resize", handleResize);

      if (frameId.current) {
        cancelAnimationFrame(frameId.current);
      }

      // Dispose of Three.js objects
      if (planeGeometry) planeGeometry.dispose();
      if (planeMaterial) planeMaterial.dispose();
      if (renderer) renderer.dispose();

      // Clear the mount ref
      if (mountRef.current) {
        while (mountRef.current.firstChild) {
          mountRef.current.removeChild(mountRef.current.firstChild);
        }
      }
    };
  }, []); // Empty dependency array - only run once

  return (
    <div className="w-full h-screen bg-black relative">
      <div 
        className="w-full h-full"
        style={{
          WebkitMask: 'linear-gradient(black, black)',
          mask: 'linear-gradient(black, black)',
          WebkitMaskSize: '80% 60%',
          maskSize: '80% 60%',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat'
        }}
      >
        <div ref={mountRef} className="w-full h-full" />
      </div>
      
      {/* Control Panel */}
      <div className={`absolute top-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 transition-all duration-300 ${showControls ? 'translate-x-0' : 'translate-x-full'}`}>
        <button
          onClick={() => setShowControls(!showControls)}
          className="absolute -left-10 top-4 bg-black/80 backdrop-blur-sm text-white p-2 rounded-l-lg hover:bg-black/90 transition-colors"
        >
          {showControls ? '→' : '←'}
        </button>
        
        <div className="space-y-4 min-w-[250px]">
          <h3 className="text-white font-semibold text-lg mb-4">Color Controls</h3>
          
          {/* Color Pickers */}
          <div className="space-y-3">
            <div>
              <label className="block text-white text-sm mb-2">Primary Color</label>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
            
            <div>
              <label className="block text-white text-sm mb-2">Secondary Color</label>
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
            
            <div>
              <label className="block text-white text-sm mb-2">Tertiary Color</label>
              <input
                type="color"
                value={tertiaryColor}
                onChange={(e) => setTertiaryColor(e.target.value)}
                className="w-full h-10 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Animation Controls */}
          <div className="space-y-3 pt-4 border-t border-gray-600">
            <div>
              <label className="block text-white text-sm mb-2">Animation Speed: {animationSpeed.toFixed(1)}</label>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.1"
                value={animationSpeed}
                onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-white text-sm mb-2">Wave Intensity: {intensity.toFixed(1)}</label>
              <input
                type="range"
                min="1.0"
                max="10.0"
                step="0.5"
                value={intensity}
                onChange={(e) => setIntensity(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="space-y-2 pt-4 border-t border-gray-600">
            <p className="text-white text-sm font-medium">Presets:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setPrimaryColor("#ff0080");
                  setSecondaryColor("#00ff80");
                  setTertiaryColor("#8000ff");
                }}
                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-3 py-2 rounded text-sm hover:opacity-80 transition-opacity"
              >
                Neon
              </button>
              <button
                onClick={() => {
                  setPrimaryColor("#ff6b35");
                  setSecondaryColor("#f7931e");
                  setTertiaryColor("#ffcc02");
                }}
                className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-3 py-2 rounded text-sm hover:opacity-80 transition-opacity"
              >
                Sunset
              </button>
              <button
                onClick={() => {
                  setPrimaryColor("#667eea");
                  setSecondaryColor("#764ba2");
                  setTertiaryColor("#f093fb");
                }}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-2 rounded text-sm hover:opacity-80 transition-opacity"
              >
                Galaxy
              </button>
              <button
                onClick={() => {
                  setPrimaryColor("#00c9ff");
                  setSecondaryColor("#92fe9d");
                  setTertiaryColor("#00d2ff");
                }}
                className="bg-gradient-to-r from-blue-500 to-green-500 text-white px-3 py-2 rounded text-sm hover:opacity-80 transition-opacity"
              >
                Ocean
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scene;