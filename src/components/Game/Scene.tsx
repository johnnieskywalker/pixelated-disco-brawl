
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
  console.log("Scene component mounting with new instance");
  
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    cleanUp: () => void;
  } | null>(null);
  
  const physicsWorldRef = useRef<CANNON.World | null>(null);
  const npcsRef = useRef<THREE.Object3D[]>([]);
  const [playerAPI, setPlayerAPI] = useState<ReturnType<typeof Player> | null>(null);
  const playerCreatedRef = useRef(false); // Track if player was already created
  
  const [gameReady, setGameReady] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [playerPosition, setPlayerPosition] = useState(new THREE.Vector3(0, 0, 0));
  const [playerScore, setPlayerScore] = useState(0);
  const [playerName, setPlayerName] = useState('Player');
  const [gameTime, setGameTime] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [damageNpcFunction, setDamageNpcFunction] = useState<((id: string, damage: number) => void) | null>(null);
  
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
        playerCreatedRef.current = false; // Reset on cleanup
      };
    } catch (error) {
      console.error("Error initializing scene:", error);
      return () => {};
    }
  }, [containerRef]);
  
  // Create player when scene is ready
  useEffect(() => {
    if (!gameReady || !sceneRef.current || !physicsWorldRef.current || playerCreatedRef.current) {
      console.log("Not ready to create player yet or player already created");
      return;
    }
    
    try {
      const { scene, camera } = sceneRef.current;
      const physicsWorld = physicsWorldRef.current;
      
      console.log("Creating player instance");
      playerCreatedRef.current = true; // Mark player as created to prevent duplicates
      
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
          // Just for debugging, no functional use
          // console.log("Player position updated:", position);
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
      
      // Ensure player health is reset to 100
      setPlayerHealth(100);
      if (onUpdatePlayerInfo) {
        onUpdatePlayerInfo({ health: 100, score: 0 });
      }
      
      setPlayerReady(true);
      console.log("Player initialized successfully");
    } catch (error) {
      console.error("Error initializing player:", error);
    }
  }, [gameReady, onUpdatePlayerInfo]);
  
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
            onJump={playerAPI.jump!}
            onPunch={playerAPI.punch!}
            onKick={playerAPI.kick!}
            onPickup={() => console.log("Pickup action")}
            onThrow={() => console.log("Throw action")}
            npcs={npcsRef.current.map(npc => ({ api: { id: npc.uuid, body: new CANNON.Body(), mesh: npc } })) || []}
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
