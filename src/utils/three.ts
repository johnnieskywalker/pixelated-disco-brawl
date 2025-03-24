import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// PS1 shader to mimic PlayStation 1 rendering
const ps1Shader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: {
      value: new THREE.Vector2(window.innerWidth, window.innerHeight),
    },
    pixelSize: { value: 4.0 },
    affineMapping: { value: true },
    drawDistance: { value: 2000.0 },
    ditherStrength: { value: 0.8 },
    time: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float pixelSize;
    uniform bool affineMapping;
    uniform float drawDistance;
    uniform float ditherStrength;
    uniform float time;
    varying vec2 vUv;
    
    // Dithering matrix
    const float ditherPattern[16] = float[16](
      0.0, 8.0, 2.0, 10.0,
      12.0, 4.0, 14.0, 6.0,
      3.0, 11.0, 1.0, 9.0,
      15.0, 7.0, 13.0, 5.0
    );
    
    void main() {
      // Pixelation
      vec2 pixelatedUV = floor(vUv * resolution / pixelSize) * pixelSize / resolution;
      
      // Affine texture mapping distortion (PS1 effect)
      vec2 affineUV = affineMapping ? 
        pixelatedUV + sin(pixelatedUV * 10.0 + time * 0.1) * 0.001 : 
        pixelatedUV;
      
      // Sample the texture
      vec4 color = texture2D(tDiffuse, affineUV);
      
      // Apply dithering
      float dither = ditherPattern[int(mod(gl_FragCoord.x, 4.0)) + int(mod(gl_FragCoord.y, 4.0)) * 4];
      dither = (dither / 16.0 - 0.5) * ditherStrength;
      color.rgb += dither;
      
      // Reduce color precision (5-bit per channel like PS1)
      color.rgb = floor(color.rgb * 32.0) / 32.0;
      
      // Depth cueing and fog
      float depth = gl_FragCoord.z / gl_FragCoord.w;
      float fogFactor = smoothstep(0.0, drawDistance, depth);
      vec3 fogColor = vec3(0.1, 0.1, 0.2);
      color.rgb = mix(color.rgb, fogColor, fogFactor);
      
      gl_FragColor = color;
    }
  `,
};

// Function to create a basic Three.js setup
export const createThreeJsScene = (container: HTMLElement) => {
  // Create scene, camera, and renderer
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#110815");
  scene.fog = new THREE.FogExp2("#110815", 0.05);

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 5, 10);

  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: "high-performance",
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(1); // Force pixel ratio to 1 for PS1 effect
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.appendChild(renderer.domElement);

  // Setup post-processing for PS1 effect
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const ps1Pass = new ShaderPass(ps1Shader);
  composer.addPass(ps1Pass);

  // Add lighting
  const ambientLight = new THREE.AmbientLight(0x333333);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 7.5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 500;
  directionalLight.shadow.camera.left = -10;
  directionalLight.shadow.camera.right = 10;
  directionalLight.shadow.camera.top = 10;
  directionalLight.shadow.camera.bottom = -10;
  scene.add(directionalLight);

  // Add disco lights
  const createDiscoLight = (color: number, position: THREE.Vector3) => {
    const light = new THREE.PointLight(color, 1, 10);
    light.position.copy(position);
    scene.add(light);
    return light;
  };

  const discoLights = [
    createDiscoLight(0xff00ff, new THREE.Vector3(5, 8, 0)),
    createDiscoLight(0x00ffff, new THREE.Vector3(-5, 8, 0)),
    createDiscoLight(0xffff00, new THREE.Vector3(0, 8, 5)),
    createDiscoLight(0x00ff00, new THREE.Vector3(0, 8, -5)),
  ];

  // Window resize handler
  const handleResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    composer.setSize(width, height);

    ps1Pass.uniforms.resolution.value.set(width, height);
  };

  window.addEventListener("resize", handleResize);

  // Animation function
  const clock = new THREE.Clock();

  const animate = () => {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // Update disco lights
    discoLights.forEach((light, i) => {
      light.intensity = 0.5 + Math.sin(elapsedTime * 2 + i) * 0.5;
    });

    // Update PS1 shader
    ps1Pass.uniforms.time.value = elapsedTime;

    // Render the scene
    composer.render();
  };

  // Start animation
  animate();

  return {
    scene,
    camera,
    renderer,
    composer,
    cleanUp: () => {
      window.removeEventListener("resize", handleResize);

      // Properly clean up resources
      if (composer) {
        // First dispose of individual passes in the composer
        if (composer.passes) {
          for (let i = 0; i < composer.passes.length; i++) {
            const pass = composer.passes[i];
            if (pass) {
              // TypeScript doesn't recognize dispose but it exists at runtime
              (pass as { dispose?: () => void }).dispose?.();
            }
          }
          // Clear the passes array
          composer.passes = [];
        }
      }

      // Dispose renderer
      if (renderer) {
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
    },
  };
};

// Helper function to create a character model
export const createCharacterModel = (color: string = "#E91E63") => {
  const characterGroup = new THREE.Group();

  // Body
  const bodyGeometry = new THREE.BoxGeometry(1, 1.5, 0.6);
  const bodyMaterial = new THREE.MeshPhongMaterial({ color });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.75;
  body.castShadow = true;
  body.receiveShadow = true;
  characterGroup.add(body);

  // Head
  const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
  const headMaterial = new THREE.MeshPhongMaterial({ color: "#FFB74D" });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 1.8;
  head.castShadow = true;
  head.receiveShadow = true;
  characterGroup.add(head);

  // Arms
  const armGeometry = new THREE.BoxGeometry(0.4, 1.2, 0.4);
  const armMaterial = new THREE.MeshPhongMaterial({ color });

  const leftArm = new THREE.Mesh(armGeometry, armMaterial);
  leftArm.position.set(-0.7, 0.75, 0);
  leftArm.castShadow = true;
  leftArm.receiveShadow = true;
  characterGroup.add(leftArm);

  const rightArm = new THREE.Mesh(armGeometry, armMaterial);
  rightArm.position.set(0.7, 0.75, 0);
  rightArm.castShadow = true;
  rightArm.receiveShadow = true;
  characterGroup.add(rightArm);

  // Legs
  const legGeometry = new THREE.BoxGeometry(0.4, 1.2, 0.4);
  const legMaterial = new THREE.MeshPhongMaterial({ color: "#303F9F" });

  const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
  leftLeg.position.set(-0.3, -0.6, 0);
  leftLeg.castShadow = true;
  leftLeg.receiveShadow = true;
  characterGroup.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
  rightLeg.position.set(0.3, -0.6, 0);
  rightLeg.castShadow = true;
  rightLeg.receiveShadow = true;
  characterGroup.add(rightLeg);

  return characterGroup;
};

// Helper function to create environment objects
export const createEnvironmentObject = (
  type: "table" | "chair" | "bottle" | "glass" | "car",
  position: THREE.Vector3
) => {
  const object = new THREE.Group();
  object.position.copy(position);

  switch (type) {
    case "table": {
      const tableTop = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.2, 2),
        new THREE.MeshPhongMaterial({ color: "#8D6E63" })
      );
      tableTop.position.y = 1;
      tableTop.castShadow = true;
      tableTop.receiveShadow = true;
      object.add(tableTop);

      // Table legs
      for (let x = -0.8; x <= 0.8; x += 1.6) {
        for (let z = -0.8; z <= 0.8; z += 1.6) {
          const leg = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 1, 0.2),
            new THREE.MeshPhongMaterial({ color: "#5D4037" })
          );
          leg.position.set(x, 0.5, z);
          leg.castShadow = true;
          leg.receiveShadow = true;
          object.add(leg);
        }
      }
      break;
    }

    case "chair": {
      // Chair seat
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.15, 1),
        new THREE.MeshPhongMaterial({ color: "#8D6E63" })
      );
      seat.position.y = 0.5;
      seat.castShadow = true;
      seat.receiveShadow = true;
      object.add(seat);

      // Chair back
      const back = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 0.15),
        new THREE.MeshPhongMaterial({ color: "#8D6E63" })
      );
      back.position.set(0, 1, -0.5);
      back.castShadow = true;
      back.receiveShadow = true;
      object.add(back);

      // Chair legs
      for (let x = -0.4; x <= 0.4; x += 0.8) {
        for (let z = -0.4; z <= 0.4; z += 0.8) {
          const leg = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.5, 0.1),
            new THREE.MeshPhongMaterial({ color: "#5D4037" })
          );
          leg.position.set(x, 0.25, z);
          leg.castShadow = true;
          leg.receiveShadow = true;
          object.add(leg);
        }
      }
      break;
    }

    case "bottle": {
      // Bottle body
      const bottleBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.15, 0.6, 8),
        new THREE.MeshPhongMaterial({ color: "#4CAF50", shininess: 100 })
      );
      bottleBody.castShadow = true;
      bottleBody.receiveShadow = true;
      object.add(bottleBody);

      // Bottle neck
      const bottleNeck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.1, 0.2, 8),
        new THREE.MeshPhongMaterial({ color: "#4CAF50", shininess: 100 })
      );
      bottleNeck.position.y = 0.4;
      bottleNeck.castShadow = true;
      bottleNeck.receiveShadow = true;
      object.add(bottleNeck);

      // Bottle cap
      const bottleCap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.05, 8),
        new THREE.MeshPhongMaterial({ color: "#FFC107" })
      );
      bottleCap.position.y = 0.525;
      bottleCap.castShadow = true;
      bottleCap.receiveShadow = true;
      object.add(bottleCap);
      break;
    }
    case "glass": {
      // Glass body
      const glassBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.08, 0.25, 8),
        new THREE.MeshPhongMaterial({
          color: "#B3E5FC",
          transparent: true,
          opacity: 0.7,
          shininess: 100,
        })
      );
      glassBody.castShadow = true;
      glassBody.receiveShadow = true;
      object.add(glassBody);
      break;
    }
    case "car": {
      const loader = new GLTFLoader();
      
      // Create a placeholder group that will be replaced when the model loads
      const carGroup = new THREE.Group();
      object.add(carGroup);
      
      // Load the model
      loader.load(
        '/maluch.glb',
        (gltf) => {
          // Remove placeholder if it exists
          while (object.children.length > 0) {
            object.remove(object.children[0]);
          }
          
          // Scale the model appropriately
          gltf.scene.scale.set(1, 1, 1);
          
          // Add the loaded model to our object group
          object.add(gltf.scene);
          
          // Make sure the model casts and receives shadows
          gltf.scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          
          console.log("Maluch (Fiat 126p) model loaded successfully");
        },
        (xhr) => {
          console.log(`Maluch model ${(xhr.loaded / xhr.total) * 100}% loaded`);
        },
        (error) => {
          console.error('Error loading Maluch model:', error);
        }
      );
      break;
    }
  }
  return object;
};

// Helper function to create a simple floor
export const createFloor = () => {
  const floorGeometry = new THREE.PlaneGeometry(50, 50);
  floorGeometry.rotateX(-Math.PI / 2);

  // Create a checkered texture
  const size = 512;
  const data = new Uint8Array(size * size * 4);

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const index = (i * size + j) * 4;

      // Checkered pattern
      const isEvenRow = Math.floor(i / (size / 20)) % 2 === 0;
      const isEvenCol = Math.floor(j / (size / 20)) % 2 === 0;

      if (isEvenRow === isEvenCol) {
        data[index] = 80; // R
        data[index + 1] = 80; // G
        data[index + 2] = 100; // B
      } else {
        data[index] = 50; // R
        data[index + 1] = 50; // G
        data[index + 2] = 70; // B
      }

      data[index + 3] = 255; // A
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.needsUpdate = true;

  const floorMaterial = new THREE.MeshPhongMaterial({ map: texture });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.receiveShadow = true;

  return floor;
};

// Helper function to create disco ball
export const createDiscoBall = (position: THREE.Vector3) => {
  const group = new THREE.Group();
  group.position.copy(position);

  // Ball
  const ballGeometry = new THREE.SphereGeometry(1, 8, 8);
  const ballMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    shininess: 100,
    specular: 0xffffff,
  });
  const ball = new THREE.Mesh(ballGeometry, ballMaterial);
  ball.castShadow = true;
  group.add(ball);

  // Add mirrored tiles to the ball
  const tileGeometry = new THREE.PlaneGeometry(0.2, 0.2);
  const tileMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    shininess: 100,
    specular: 0xffffff,
  });

  for (let i = 0; i < 100; i++) {
    const tile = new THREE.Mesh(tileGeometry, tileMaterial);

    // Random position on the sphere
    const phi = Math.acos(-1 + 2 * Math.random());
    const theta = 2 * Math.PI * Math.random();

    const x = 1.05 * Math.sin(phi) * Math.cos(theta);
    const y = 1.05 * Math.sin(phi) * Math.sin(theta);
    const z = 1.05 * Math.cos(phi);

    tile.position.set(x, y, z);
    tile.lookAt(0, 0, 0);

    group.add(tile);
  }

  // Add suspension wire
  const wireGeometry = new THREE.CylinderGeometry(0.02, 0.02, 5);
  const wireMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 });
  const wire = new THREE.Mesh(wireGeometry, wireMaterial);
  wire.position.y = 2.5;
  group.add(wire);

  return group;
};

// Helper function to create Polish posters
export const createPoster = (position: THREE.Vector3, rotation: number) => {
  const group = new THREE.Group();
  group.position.copy(position);
  group.rotation.y = rotation;

  // Poster background
  const posterGeometry = new THREE.PlaneGeometry(2, 3);

  // Create a colorful texture for the poster
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 384;
  const context = canvas.getContext("2d");

  if (context) {
    // Background
    context.fillStyle = "#0D47A1";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Text
    context.fillStyle = "#FFC107";
    context.font = "bold 36px sans-serif";
    context.textAlign = "center";
    context.fillText("TWOJA", canvas.width / 2, 100);
    context.fillText("REKLAMA", canvas.width / 2, 150);
    context.fillText("TUTAJ", canvas.width / 2, 200);

    // "Your ad here" in Polish
    context.fillStyle = "#FFFFFF";
    context.font = "16px sans-serif";
    context.fillText("(Your ad here)", canvas.width / 2, 240);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const posterMaterial = new THREE.MeshBasicMaterial({ map: texture });
  const poster = new THREE.Mesh(posterGeometry, posterMaterial);
  poster.position.y = 1.5;

  group.add(poster);

  // Poster frame
  const frameGeometry = new THREE.BoxGeometry(2.1, 3.1, 0.1);
  const frameMaterial = new THREE.MeshPhongMaterial({ color: 0x5d4037 });
  const frame = new THREE.Mesh(frameGeometry, frameMaterial);
  frame.position.set(0, 1.5, -0.05);

  group.add(frame);

  return group;
};

// Helper to create neon signs
export const createNeonSign = (
  text: string,
  position: THREE.Vector3,
  color: number
) => {
  const group = new THREE.Group();
  group.position.copy(position);

  // Create a canvas for the text
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext("2d");

  if (context) {
    context.fillStyle = "#000000";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw text with glow
    const glow = 10;
    context.shadowBlur = glow;
    context.shadowColor = new THREE.Color(color).getStyle();
    context.fillStyle = new THREE.Color(color).getStyle();
    context.font = "bold 64px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const signMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
  });

  const signGeometry = new THREE.PlaneGeometry(4, 1);
  const sign = new THREE.Mesh(signGeometry, signMaterial);

  // Add a glow light
  const light = new THREE.PointLight(color, 1, 5);
  light.position.z = 0.2;

  group.add(sign);
  group.add(light);

  return group;
};
