
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
  // Game state refs
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    composer: any;
    cleanUp: () => void;
  } | null>(null);
  
  const physicsWorldRef = useRef<CANNON.World | null>(null);
  const playerRef = useRef<any>(null);
  const otherPlayersRef = useRef<Record<string, any>>({});
  
  const playerInfoRef = useRef<{
    id: string;
    name: string;
    health: number;
    score: number;
  }>({
    id: '',
    name: '',
    health: 100,
    score: 0,
  });
  
  // Component state
  const [gameReady, setGameReady] = useState(false);
  
  // Initialize scene
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Create Three.js scene
    const { scene, camera, renderer, composer, cleanUp } = createThreeJsScene(containerRef.current);
    sceneRef.current = { scene, camera, renderer, composer, cleanUp };
    
    // Create physics world
    const physicsWorld = createPhysicsWorld();
    physicsWorldRef.current = physicsWorld;
    
    // Physics update loop
    const timeStep = 1 / 60;
    const physicsLoop = () => {
      physicsWorld.step(timeStep);
      requestAnimationFrame(physicsLoop);
    };
    
    const frameId = requestAnimationFrame(physicsLoop);
    
    // Set ready state
    setGameReady(true);
    
    return () => {
      // Clean up
      cancelAnimationFrame(frameId);
      cleanUp();
    };
  }, [containerRef]);
  
  // Initialize player and controls when scene is ready
  useEffect(() => {
    if (!gameReady || !sceneRef.current || !physicsWorldRef.current) return;
    
    const { scene, camera } = sceneRef.current;
    const physicsWorld = physicsWorldRef.current;
    
    // Create player
    const player = Player({
      scene,
      physicsWorld,
      position: new THREE.Vector3(0, 2, 0),
      isLocalPlayer: true,
    });
    
    playerRef.current = player;
    
    // Store player info
    playerInfoRef.current = {
      id: 'local-player',
      name: player.name,
      health: player.health,
      score: player.score,
    };
    
    return () => {
      // Clean up will be handled by the Player component
    };
  }, [gameReady]);
  
  // Handle player actions
  const handleJump = () => {
    if (playerRef.current) {
      playerRef.current.jump();
    }
  };
  
  const handlePunch = () => {
    if (playerRef.current) {
      playerRef.current.punch();
    }
  };
  
  const handleKick = () => {
    if (playerRef.current) {
      playerRef.current.kick();
    }
  };
  
  const handlePickup = () => {
    console.log("Pickup action");
    // Implement pickup logic
  };
  
  const handleThrow = () => {
    console.log("Throw action");
    // Implement throw logic
  };
  
  // Render controls when player is ready
  const renderControls = () => {
    if (!gameReady || !sceneRef.current || !playerRef.current || !playerRef.current.mesh || !playerRef.current.body) {
      return null;
    }
    
    return (
      <Controls 
        camera={sceneRef.current.camera}
        cannonBody={playerRef.current.body}
        playerMesh={playerRef.current.mesh}
        onJump={handleJump}
        onPunch={handlePunch}
        onKick={handleKick}
        onPickup={handlePickup}
        onThrow={handleThrow}
      />
    );
  };
  
  // Render environment when scene is ready
  const renderEnvironment = () => {
    if (!gameReady || !sceneRef.current || !physicsWorldRef.current) {
      return null;
    }
    
    return (
      <Environment 
        scene={sceneRef.current.scene}
        physicsWorld={physicsWorldRef.current}
      />
    );
  };
  
  // Multiplayer handling
  const handleConnect = (id: string) => {
    console.log(`Connected to multiplayer with ID: ${id}`);
    playerInfoRef.current.id = id;
  };
  
  const handleDisconnect = () => {
    console.log("Disconnected from multiplayer");
  };
  
  const handlePlayerJoin = (id: string, name: string) => {
    console.log(`Player joined: ${name} (${id})`);
  };
  
  const handlePlayerLeave = (id: string) => {
    console.log(`Player left: ${id}`);
    
    // Remove player from scene
    if (otherPlayersRef.current[id]) {
      // Cleanup would be handled by the Player component unmount
      delete otherPlayersRef.current[id];
    }
  };
  
  const handlePlayerUpdate = (players: Record<string, any>) => {
    if (!gameReady || !sceneRef.current || !physicsWorldRef.current) return;
    
    const { scene } = sceneRef.current;
    const physicsWorld = physicsWorldRef.current;
    
    // Update existing players and add new ones
    Object.keys(players).forEach(id => {
      if (id === playerInfoRef.current.id) return; // Skip local player
      
      const playerData = players[id];
      
      if (!otherPlayersRef.current[id]) {
        // Create new player
        const player = Player({
          scene,
          physicsWorld,
          position: new THREE.Vector3(
            playerData.position.x,
            playerData.position.y,
            playerData.position.z
          ),
          color: playerData.color,
          playerName: playerData.name,
          isLocalPlayer: false,
        });
        
        otherPlayersRef.current[id] = player;
      } else {
        // Update existing player
        const player = otherPlayersRef.current[id];
        
        if (player.body) {
          // Update physics body position directly
          player.body.position.set(
            playerData.position.x,
            playerData.position.y,
            playerData.position.z
          );
          
          player.body.quaternion.set(
            playerData.quaternion.x,
            playerData.quaternion.y,
            playerData.quaternion.z,
            playerData.quaternion.w
          );
        }
        
        // Update health and score
        if (player.setHealth && playerData.health !== undefined) {
          player.setHealth(playerData.health);
        }
        
        if (player.setScore && playerData.score !== undefined) {
          player.setScore(playerData.score);
        }
      }
    });
    
    // Remove players not in the update
    Object.keys(otherPlayersRef.current).forEach(id => {
      if (!players[id]) {
        // Player cleanup would be handled by component unmount
        delete otherPlayersRef.current[id];
      }
    });
  };
  
  const handleSendPlayerState = (callback: (state: any) => void) => {
    if (!playerRef.current || !playerRef.current.mesh) return;
    
    // Set up interval to send player state
    const interval = setInterval(() => {
      const mesh = playerRef.current.mesh;
      
      callback({
        position: {
          x: mesh.position.x,
          y: mesh.position.y,
          z: mesh.position.z,
        },
        quaternion: {
          x: mesh.quaternion.x,
          y: mesh.quaternion.y,
          z: mesh.quaternion.z,
          w: mesh.quaternion.w,
        },
        health: playerRef.current.health,
        score: playerRef.current.score,
      });
    }, 100); // 10 times per second
    
    return () => clearInterval(interval);
  };
  
  return (
    <>
      {renderControls()}
      {renderEnvironment()}
      <Multiplayer 
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onPlayerJoin={handlePlayerJoin}
        onPlayerLeave={handlePlayerLeave}
        onPlayerUpdate={handlePlayerUpdate}
        onSendPlayerState={handleSendPlayerState}
      />
    </>
  );
};

export default Scene;
