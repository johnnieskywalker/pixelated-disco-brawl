
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createThreeJsScene } from '@/utils/three';
import { createPhysicsWorld } from '@/utils/physics';
import Environment from './Environment';
import Player from './Player';
import Controls from './Controls';
import Multiplayer from './Multiplayer';
import NPCManager from './NPCManager';

interface SceneProps {
  containerRef: React.RefObject<HTMLDivElement>;
  onUpdatePlayerInfo?: (info: {health?: number; score?: number}) => void;
}

const Scene = ({ containerRef, onUpdatePlayerInfo }: SceneProps) => {
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    cleanUp: () => void;
  } | null>(null);
  
  const physicsWorldRef = useRef<CANNON.World | null>(null);
  const npcsRef = useRef<THREE.Object3D[]>([]);
  const [playerAPI, setPlayerAPI] = useState<ReturnType<typeof Player> | null>(null);
  
  const [gameReady, setGameReady] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [playerPosition, setPlayerPosition] = useState(new THREE.Vector3(0, 0, 0));
  const [playerScore, setPlayerScore] = useState(0);
  const [playerName, setPlayerName] = useState('Player');
  const [gameTime, setGameTime] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [damageNpcFunction, setDamageNpcFunction] = useState<((id: string, damage: number) => void) | null>(null);
  
  // Movement state tracking
  const movementRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false
  });
  
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
      
      // Position player directly below the disco ball (which is at 0, 8, 0)
      const playerPosition = new THREE.Vector3(0, 2, 0);
      
      // Create the player
      const playerObject = Player({
        scene,
        physicsWorld,
        position: playerPosition,
        color: '#E91E63',  // Bright pink to make it more visible
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
  
  // Comment out or remove this useEffect that's handling movement
  /*
  useEffect(() => {
    if (!playerReady || !playerAPI) return;
    
    // Movement handling
    const movePlayerPhysics = () => {
      // Calculate movement direction
      const movement = new CANNON.Vec3(0, 0, 0);
      
      if (movementRef.current.forward) movement.z -= moveSpeed;
      if (movementRef.current.backward) movement.z += moveSpeed;
      if (movementRef.current.left) movement.x -= moveSpeed;
      if (movementRef.current.right) movement.x += moveSpeed;
      
      // If there's movement, apply it to the physics body
      if (movement.x !== 0 || movement.z !== 0) {
        // ... movement logic ...
      } else {
        // ... stop movement logic ...
      }
      
      requestAnimationFrame(movePlayerPhysics);
    };
    
    const movementLoop = requestAnimationFrame(movePlayerPhysics);
    
    return () => {
      cancelAnimationFrame(movementLoop);
    };
  }, [playerReady, playerAPI]);
  */
  
  // Add an effect to track player position for NPCs to follow
  useEffect(() => {
    if (playerAPI && playerAPI.body) {
      const updatePlayerPosition = () => {
        setPlayerPosition(new THREE.Vector3(
          playerAPI.body.position.x,
          playerAPI.body.position.y,
          playerAPI.body.position.z
        ));
        requestAnimationFrame(updatePlayerPosition);
      };
      
      const frameId = requestAnimationFrame(updatePlayerPosition);
      return () => cancelAnimationFrame(frameId);
    }
  }, [playerAPI]);

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

  // First, let's fix the damage handler to ensure logging
  const handleDamagePlayer = (amount: number) => {
    console.log(`Player taking ${amount} damage, current health: ${playerHealth}`);
    
    // Update health state
    setPlayerHealth(prevHealth => {
      const newHealth = Math.max(0, prevHealth - amount);
      console.log(`Player health updated from ${prevHealth} to ${newHealth}`);
      
      // Update player model's health
      if (playerAPI && playerAPI.setHealth) {
        playerAPI.setHealth(newHealth);
      }
      
      // IMPORTANT: Update Game's player info
      if (onUpdatePlayerInfo) {
        onUpdatePlayerInfo({ health: newHealth });
      }
      
      // Game over if health reaches zero
      if (newHealth <= 0 && !gameOver) {
        setGameOver(true);
        console.log("Player defeated!");
      }
      
      return newHealth;
    });
  };

  // Handle the damageNPC registration
  const handleRegisterDamageNPC = (damageNpcFn: (id: string, damage: number) => void) => {
    console.log("Registering damageNPC function");
    setDamageNpcFunction(() => damageNpcFn);
  };

  // Handle score updates
  const handleScoreUpdate = (points: number) => {
    console.log(`Adding ${points} to player score`);
    setPlayerScore(prevScore => {
      const newScore = prevScore + points;
      if (onUpdatePlayerInfo) {
        onUpdatePlayerInfo({ score: newScore });
      }
      return newScore;
    });
  };

  return (
    <>
      {gameReady && playerReady && playerAPI && sceneRef.current && (
        <>
          <Controls 
            camera={sceneRef.current.camera}
            cannonBody={playerAPI.body!}
            playerMesh={playerAPI.mesh!}
            onJump={handleJump}
            onPunch={handlePunch}
            onKick={handleKick}
            onPickup={handlePickup}
            onThrow={handleThrow}
            npcs={npcsRef.current.map(npc => ({ api: { id: npc.uuid, body: new CANNON.Body(), mesh: npc } })) || []}  // Add this line to pass NPCs to Controls
            onDamageNPC={(id, amount) => {
              // Handle NPC damage through the damageNPC function
              if (damageNpcFunction) {
                damageNpcFunction(id, amount);
                console.log(`NPC ${id} damaged by ${amount}`);
                setPlayerScore(prev => {
                  const newScore = prev + amount;
                  if (onUpdatePlayerInfo) {
                    onUpdatePlayerInfo({ score: newScore });
                  }
                  return newScore;
                });
              }
            }}
          />
          
          <div className="fixed bottom-4 left-4 text-white p-4 bg-black/50 rounded">
            <p>Player ready! Use WASD to move.</p>
            <p>Space = Jump, Z = Punch, X = Kick</p>
            <p>Move mouse to control camera</p>
          </div>
        </>
      )}
      
      {gameReady && sceneRef.current && physicsWorldRef.current && (
        <Environment 
          scene={sceneRef.current.scene}
          physicsWorld={physicsWorldRef.current}
        />
      )}

      {gameReady && sceneRef.current && physicsWorldRef.current && playerAPI && (
        <NPCManager 
          scene={sceneRef.current.scene}
          physicsWorld={physicsWorldRef.current}
          playerPosition={playerPosition}
          playerHealth={playerHealth}
          onDamagePlayer={handleDamagePlayer}
          onScoreUpdate={handleScoreUpdate}
          onRegisterDamageNPC={handleRegisterDamageNPC}
        />
      )}
    </>
  );
};

export default Scene;
