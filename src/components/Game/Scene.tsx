
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createThreeJsScene } from '@/utils/three';
import { createPhysicsWorld } from '@/utils/physics';
import Environment from './Environment';
import Player from './Player';
import Controls from './Controls';
import Multiplayer from './Multiplayer';

interface SceneProps {
  containerRef: React.RefObject<HTMLDivElement>;
}

const Scene = ({ containerRef }: SceneProps) => {
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    composer: EffectComposer;
    cleanUp: () => void;
  } | null>(null);
  
  const physicsWorldRef = useRef<CANNON.World | null>(null);
  const [playerAPI, setPlayerAPI] = useState<ReturnType<typeof Player> | null>(null);
  
  const [gameReady, setGameReady] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  
  // Initialize Three.js scene and physics world
  useEffect(() => {
    if (!containerRef.current) return;
    
    try {
      console.log("Initializing Three.js scene");
      const threeSetup = createThreeJsScene(containerRef.current);
      sceneRef.current = threeSetup;
      
      const physicsWorld = createPhysicsWorld();
      physicsWorldRef.current = physicsWorld;
      
      // Add floor to the world
      const floorBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Plane(),
      });
      floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
      physicsWorld.addBody(floorBody);
      
      const timeStep = 1 / 60;
      const physicsLoop = () => {
        if (physicsWorld) {
          physicsWorld.step(timeStep);
        }
        requestAnimationFrame(physicsLoop);
      };
      
      requestAnimationFrame(physicsLoop);
      
      setGameReady(true);
      console.log("Scene initialized successfully");
      
      return () => {
        console.log("Cleaning up Three.js scene");
        if (sceneRef.current) {
          sceneRef.current.cleanUp();
        }
      };
    } catch (error) {
      console.error("Error initializing scene:", error);
      return () => {};
    }
  }, [containerRef]);
  
  // Create player when scene is ready
  useEffect(() => {
    if (!gameReady || !sceneRef.current || !physicsWorldRef.current) {
      console.log("Not ready to create player yet");
      return;
    }
    
    try {
      const { scene, camera } = sceneRef.current;
      const physicsWorld = physicsWorldRef.current;
      
      console.log("Creating player instance");
      
      // Position player in front of camera
      const playerPosition = new THREE.Vector3(0, 2, 0);
      
      // Create the player
      const playerObject = Player({
        scene,
        physicsWorld,
        position: playerPosition,
        isLocalPlayer: true,
        onUpdate: (position) => {
          console.log("Player position updated:", position);
        }
      });
      
      console.log("Player created:", playerObject);
      setPlayerAPI(playerObject);
      
      // Position camera behind player
      camera.position.set(
        playerPosition.x, 
        playerPosition.y + 3,
        playerPosition.z + 10
      );
      camera.lookAt(playerPosition);
      
      setPlayerReady(true);
      console.log("Player initialized successfully");
    } catch (error) {
      console.error("Error initializing player:", error);
    }
  }, [gameReady]);
  
  // Update camera to follow player
  useEffect(() => {
    if (!playerReady || !playerAPI || !playerAPI.mesh || !sceneRef.current) return;
    
    const { camera } = sceneRef.current;
    const playerMesh = playerAPI.mesh;
    
    console.log("Setting up camera to follow player");
    
    // Position camera
    camera.position.set(
      playerMesh.position.x,
      playerMesh.position.y + 5,
      playerMesh.position.z + 10
    );
    camera.lookAt(playerMesh.position);
    
    // Camera following logic
    const updateCamera = () => {
      if (!playerAPI || !playerAPI.mesh) return;
      
      // Camera offset position
      const offset = new THREE.Vector3(0, 5, 10);
      const targetPosition = playerAPI.mesh.position.clone().add(offset);
      
      // Smoothly move camera
      camera.position.lerp(targetPosition, 0.1);
      camera.lookAt(playerAPI.mesh.position);
      
      requestAnimationFrame(updateCamera);
    };
    
    const frameId = requestAnimationFrame(updateCamera);
    return () => cancelAnimationFrame(frameId);
  }, [playerReady, playerAPI]);
  
  // Player action handlers
  const handleJump = () => {
    if (playerAPI && playerAPI.jump) {
      console.log("Jump action triggered");
      playerAPI.jump();
    }
  };
  
  const handlePunch = () => {
    if (playerAPI && playerAPI.punch) {
      console.log("Punch action triggered");
      playerAPI.punch();
    }
  };
  
  const handleKick = () => {
    if (playerAPI && playerAPI.kick) {
      console.log("Kick action triggered");
      playerAPI.kick();
    }
  };
  
  const handlePickup = () => {
    console.log("Pickup action");
  };
  
  const handleThrow = () => {
    console.log("Throw action");
  };
  
  return (
    <>
      {gameReady && playerReady && playerAPI && playerAPI.mesh && playerAPI.body && sceneRef.current && (
        <Controls 
          camera={sceneRef.current.camera}
          cannonBody={playerAPI.body}
          playerMesh={playerAPI.mesh}
          onJump={handleJump}
          onPunch={handlePunch}
          onKick={handleKick}
          onPickup={handlePickup}
          onThrow={handleThrow}
        />
      )}
      
      {gameReady && sceneRef.current && physicsWorldRef.current && (
        <Environment 
          scene={sceneRef.current.scene}
          physicsWorld={physicsWorldRef.current}
        />
      )}
      
      {playerReady && (
        <div className="fixed bottom-4 left-4 text-white p-4 bg-black/50 rounded">
          <p>Player ready! Use WASD to move.</p>
          <p>Space = Jump, Z = Punch, X = Kick</p>
        </div>
      )}
    </>
  );
};

export default Scene;
