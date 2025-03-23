import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { createThreeJsScene } from '@/utils/three';
import { createPhysicsWorld } from '@/utils/physics';
import Environment from './Environment';
import Player from './Player';
import Controls from './Controls';
import Multiplayer from './Multiplayer';

interface SceneProps {
  containerRef: React.RefObject<HTMLDivElement>;
}

interface PlayerInfo {
  id: string;
  name: string;
  health: number;
  score: number;
}

interface Vector3Data {
  x: number;
  y: number;
  z: number;
}

interface QuaternionData {
  x: number;
  y: number;
  z: number;
  w: number;
}

interface RemotePlayerData {
  position: Vector3Data;
  quaternion: QuaternionData;
  color?: string;
  name: string;
  health: number;
  score: number;
}

interface PlayerState {
  position: Vector3Data;
  quaternion: QuaternionData;
  health: number;
  score: number;
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
  const otherPlayersRef = useRef<Record<string, ReturnType<typeof Player>>>({});
  
  const playerInfoRef = useRef<PlayerInfo>({
    id: '',
    name: '',
    health: 100,
    score: 0,
  });
  
  const [gameReady, setGameReady] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    try {
      console.log("Initializing Three.js scene");
      const threeSetup = createThreeJsScene(containerRef.current);
      sceneRef.current = threeSetup;
      
      const physicsWorld = createPhysicsWorld();
      physicsWorldRef.current = physicsWorld;
      
      const timeStep = 1 / 60;
      const physicsLoop = () => {
        if (physicsWorld) {
          physicsWorld.step(timeStep);
        }
        requestAnimationFrame(physicsLoop);
      };
      
      const frameId = requestAnimationFrame(physicsLoop);
      
      setGameReady(true);
      console.log("Scene initialized successfully");
      
      return () => {
        console.log("Cleaning up Three.js scene");
        cancelAnimationFrame(frameId);
        if (sceneRef.current) {
          sceneRef.current.cleanUp();
        }
      };
    } catch (error) {
      console.error("Error initializing scene:", error);
      return () => {};
    }
  }, [containerRef]);
  
  useEffect(() => {
    if (!gameReady || !sceneRef.current || !physicsWorldRef.current) {
      console.log("Not ready to create player yet");
      return;
    }
    
    try {
      const { scene, camera } = sceneRef.current;
      const physicsWorld = physicsWorldRef.current;
      
      console.log("Creating player instance");
      
      const playerObject = Player({
        scene,
        physicsWorld,
        position: new THREE.Vector3(0, 5, 0),
        isLocalPlayer: true,
      });
      
      console.log("Player created:", playerObject);
      setPlayerAPI(playerObject);
      
      if (playerObject) {
        playerInfoRef.current = {
          id: 'local-player',
          name: playerObject.name,
          health: playerObject.health,
          score: playerObject.score,
        };
        
        if (camera && playerObject.mesh) {
          camera.position.set(
            playerObject.mesh.position.x, 
            playerObject.mesh.position.y + 5, 
            playerObject.mesh.position.z + 10
          );
          camera.lookAt(playerObject.mesh.position);
        }
        
        setPlayerReady(true);
        console.log("Player initialized successfully");
      }
    } catch (error) {
      console.error("Error initializing player:", error);
    }
  }, [gameReady]);
  
  useEffect(() => {
    if (!playerReady || !playerAPI || !playerAPI.mesh || !sceneRef.current) return;
    
    const { camera } = sceneRef.current;
    
    const updateCamera = () => {
      if (playerAPI && playerAPI.mesh && camera) {
        const offset = new THREE.Vector3(0, 5, 10);
        const targetPosition = new THREE.Vector3().copy(playerAPI.mesh.position).add(offset);
        camera.position.lerp(targetPosition, 0.1);
        camera.lookAt(playerAPI.mesh.position);
      }
      
      requestAnimationFrame(updateCamera);
    };
    
    const frameId = requestAnimationFrame(updateCamera);
    
    return () => cancelAnimationFrame(frameId);
  }, [playerReady, playerAPI]);
  
  useEffect(() => {
    if (!playerReady || !playerAPI) return;
    
    const debugInterval = setInterval(() => {
      if (playerAPI) {
        console.log("Player state:", {
          mesh: playerAPI.mesh ? "Exists" : "Missing",
          body: playerAPI.body ? "Exists" : "Missing",
          position: playerAPI.mesh ? playerAPI.mesh.position : "N/A",
          health: playerAPI.health,
          score: playerAPI.score
        });
      }
    }, 5000);
    
    return () => clearInterval(debugInterval);
  }, [playerReady, playerAPI]);
  
  const handleJump = () => {
    if (playerAPI && playerAPI.jump) {
      console.log("Jump action triggered");
      playerAPI.jump();
    } else {
      console.warn("Jump called but player reference or jump method is missing", playerAPI);
    }
  };
  
  const handlePunch = () => {
    if (playerAPI && playerAPI.punch) {
      console.log("Punch action triggered");
      playerAPI.punch();
    } else {
      console.warn("Punch called but player reference or punch method is missing", playerAPI);
    }
  };
  
  const handleKick = () => {
    if (playerAPI && playerAPI.kick) {
      console.log("Kick action triggered");
      playerAPI.kick();
    } else {
      console.warn("Kick called but player reference or kick method is missing", playerAPI);
    }
  };
  
  const handlePickup = () => {
    console.log("Pickup action");
  };
  
  const handleThrow = () => {
    console.log("Throw action");
  };
  
  const renderControls = () => {
    if (!gameReady || !sceneRef.current || !playerAPI || !playerAPI.mesh || !playerAPI.body) {
      console.warn("Controls not rendering: not all conditions met", {
        gameReady,
        sceneExists: !!sceneRef.current,
        playerExists: !!playerAPI,
        meshExists: playerAPI && !!playerAPI.mesh,
        bodyExists: playerAPI && !!playerAPI.body
      });
      return null;
    }
    
    console.log("Rendering controls with player", playerAPI);
    return (
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
    );
  };
  
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
    
    if (otherPlayersRef.current[id]) {
      delete otherPlayersRef.current[id];
    }
  };
  
  const handlePlayerUpdate = (players: Record<string, RemotePlayerData>) => {
    if (!gameReady || !sceneRef.current || !physicsWorldRef.current) return;
    
    const { scene } = sceneRef.current;
    const physicsWorld = physicsWorldRef.current;
    
    Object.keys(players).forEach(id => {
      if (id === playerInfoRef.current.id) return;
      
      const playerData = players[id];
      
      if (!otherPlayersRef.current[id]) {
        const otherPlayer = Player({
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
        
        if (otherPlayer) {
          otherPlayersRef.current[id] = otherPlayer;
        }
      } else {
        const player = otherPlayersRef.current[id];
        
        if (player.body) {
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
        
        if (playerData.health !== undefined) {
          player.setHealth(playerData.health);
        }
        
        if (playerData.score !== undefined) {
          player.setScore(playerData.score);
        }
      }
    });
    
    Object.keys(otherPlayersRef.current).forEach(id => {
      if (!players[id]) {
        delete otherPlayersRef.current[id];
      }
    });
  };
  
  const handleSendPlayerState = (callback: (state: PlayerState) => void) => {
    if (!playerAPI || !playerAPI.mesh) return;
    
    const interval = setInterval(() => {
      const mesh = playerAPI?.mesh;
      
      if (mesh) {
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
          health: playerAPI?.health || 100,
          score: playerAPI?.score || 0,
        });
      }
    }, 100);
    
    return () => clearInterval(interval);
  };
  
  useEffect(() => {
    if (playerReady) {
      console.log("Player is ready. Controls should be active.");
    }
  }, [playerReady]);
  
  return (
    <>
      {renderControls()}
      {gameReady && sceneRef.current && physicsWorldRef.current && (
        <Environment 
          scene={sceneRef.current.scene}
          physicsWorld={physicsWorldRef.current}
        />
      )}
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
