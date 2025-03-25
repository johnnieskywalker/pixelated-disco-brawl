import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import { createThreeJsScene } from "@/utils/three";
import { createPhysicsWorld } from "@/utils/physics";
import Environment from "./Environment";
import Player from "./Player";
import Controls from "./Controls";
import Multiplayer from "./Multiplayer";
import NPCManager from "./NPCManager";

interface SceneProps {
  containerRef: React.RefObject<HTMLDivElement>;
  onUpdatePlayerInfo?: (info: { health?: number; score?: number }) => void;
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
  const objectsRef = useRef<{ mesh: THREE.Object3D; body: CANNON.Body }[]>([]);
  const [playerAPI, setPlayerAPI] = useState<ReturnType<typeof Player> | null>(
    null,
  );
  const playerCreatedRef = useRef(false); // Track if player was already created

  const [gameReady, setGameReady] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [playerPosition, setPlayerPosition] = useState(
    new THREE.Vector3(0, 0, 0),
  );
  const [playerScore, setPlayerScore] = useState(0);
  const [playerName, setPlayerName] = useState("Player");
  const [gameTime, setGameTime] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [damageNpcFunction, setDamageNpcFunction] = useState<
    ((id: string, damage: number) => void) | null
  >(null);
  const [heldObject, setHeldObject] = useState<{
    id: string;
    body: CANNON.Body;
    mesh: THREE.Object3D;
    type: string;
  } | null>(null);
  const [nearbyObjects, setNearbyObjects] = useState<
    Array<{ id: string; body: CANNON.Body; mesh: THREE.Object3D; type: string }>
  >([]);

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
      floorBody.quaternion.setFromAxisAngle(
        new CANNON.Vec3(1, 0, 0),
        -Math.PI / 2,
      );
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
    if (
      !gameReady ||
      !sceneRef.current ||
      !physicsWorldRef.current ||
      playerCreatedRef.current
    ) {
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
        color: "#E91E63", // Bright pink to make it more visible
        isLocalPlayer: true,
        onUpdate: (position) => {
          // Just for debugging, no functional use
          // console.log("Player position updated:", position);
        },
      });

      console.log("Player created:", playerObject);
      setPlayerAPI(playerObject);

      // Position camera behind player
      camera.position.set(
        playerPosition.x,
        playerPosition.y + 3,
        playerPosition.z + 10,
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

  // Add an effect to track player position for NPCs to follow and find nearby objects
  useEffect(() => {
    if (
      playerAPI &&
      playerAPI.body &&
      sceneRef.current &&
      physicsWorldRef.current
    ) {
      const updatePlayerPosition = () => {
        const newPosition = new THREE.Vector3(
          playerAPI.body.position.x,
          playerAPI.body.position.y,
          playerAPI.body.position.z,
        );
        setPlayerPosition(newPosition);

        // Find nearby objects that can be picked up
        const objects: Array<{
          id: string;
          body: CANNON.Body;
          mesh: THREE.Object3D;
          type: string;
        }> = [];
        const pickupRange = 5; // Larger range to detect objects

        // Check all bodies in the physics world
        physicsWorldRef.current.bodies.forEach((body) => {
          // Skip static bodies, player body, and NPC bodies
          if (body.type === CANNON.Body.STATIC || body === playerAPI.body)
            return;
          if (!body.userData) return;

          // Only consider bottles and chairs
          const type = body.userData.type;
          if (type !== "bottle" && type !== "chair") return;

          const objPosition = new THREE.Vector3(
            body.position.x,
            body.position.y,
            body.position.z,
          );
          const distance = newPosition.distanceTo(objPosition);

          if (distance < pickupRange) {
            // Find the corresponding mesh
            const mesh = sceneRef.current.scene.children.find(
              (child) => child.userData && child.userData.physicsId === body.id,
            );

            if (mesh) {
              objects.push({
                id: body.id.toString(),
                body: body,
                mesh: mesh,
                type: type,
              });
            }
          }
        });

        setNearbyObjects(objects);
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

  const handlePickup = (
    object: {
      id: string;
      body: CANNON.Body;
      mesh: THREE.Object3D;
      type: string;
    } | null = null,
  ) => {
    if (!object || !playerAPI || !playerAPI.mesh) {
      console.log("No object to pick up or player not ready");
      return;
    }

    console.log(`Picking up ${object.type} with id ${object.id}`);

    // Store the held object
    setHeldObject(object);

    // Remove gravity from the object
    object.body.type = CANNON.Body.KINEMATIC;
    object.body.velocity.set(0, 0, 0);
    object.body.angularVelocity.set(0, 0, 0);

    // Attach the object to the player's hand position
    const handPosition = new THREE.Vector3(0, 1.5, -1);
    handPosition.applyQuaternion(playerAPI.mesh.quaternion);
    handPosition.add(
      new THREE.Vector3(
        playerAPI.body.position.x,
        playerAPI.body.position.y,
        playerAPI.body.position.z,
      ),
    );

    object.body.position.copy(new CANNON.Vec3(
      handPosition.x, 
      handPosition.y, 
      handPosition.z
    ));

    // Create a visual effect to show the object is picked up
    const scene = playerAPI.mesh.parent;
    if (scene) {
      const pickupEffect = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 8),
        new THREE.MeshBasicMaterial({
          color: 0x00ff00,
          transparent: true,
          opacity: 0.5,
        }),
      );
      pickupEffect.position.copy(handPosition);
      scene.add(pickupEffect);

      // Remove the pickup effect after animation
      setTimeout(() => {
        scene.remove(pickupEffect);
      }, 300);
    }
  };

  const handleThrow = () => {
    if (!heldObject || !playerAPI || !playerAPI.mesh) {
      console.log("No object to throw");
      return;
    }
    
    console.log(`Throwing ${heldObject.type} with id ${heldObject.id}`);
    
    // Make the object dynamic again for physics
    heldObject.body.type = CANNON.Body.DYNAMIC;
    
    // Get player's forward direction
    const throwDirection = new THREE.Vector3(0, 0, -1);
    throwDirection.applyQuaternion(playerAPI.mesh.quaternion);
    
    // Add upward component to the throw
    throwDirection.y = 0.3;
    throwDirection.normalize();
    
    // Apply force based on object type
    const throwForce = heldObject.type === "bottle" ? 25 : 15;
    
    // Apply impulse to throw the object
    heldObject.body.velocity.set(
      throwDirection.x * throwForce,
      throwDirection.y * throwForce,
      throwDirection.z * throwForce
    );
    
    // Add some random rotation
    heldObject.body.angularVelocity.set(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10
    );
    
    // Add visual feedback
    if (heldObject.mesh instanceof THREE.Mesh && heldObject.mesh.material) {
      const originalMaterial = heldObject.mesh.material.clone();
      
      // Flash the object red briefly
      heldObject.mesh.material.color.set(0xff0000);
      
      setTimeout(() => {
        if (heldObject && heldObject.mesh instanceof THREE.Mesh) {
          heldObject.mesh.material = originalMaterial;
        }
      }, 200);
    }
    
    // Set up a collision handler for the thrown object
    const checkCollisions = () => {
      if (!thrownObject || !damageNpcFunction) return;
      
      const objPosition = new THREE.Vector3(
        thrownObject.body.position.x,
        thrownObject.body.position.y,
        thrownObject.body.position.z
      );
      
      // Check for collisions with NPCs
      npcsRef.current.forEach((npc) => {
        if (!npc.userData || !npc.userData.id) return;
        
        const npcPosition = new THREE.Vector3(
          npc.position.x,
          npc.position.y,
          npc.position.z
        );
        
        const distance = objPosition.distanceTo(npcPosition);
        
        // If the object hits an NPC
        if (distance < 2) {
          // Calculate damage based on object type and velocity
          const speed = new THREE.Vector3(
            thrownObject.body.velocity.x,
            thrownObject.body.velocity.y,
            thrownObject.body.velocity.z
          ).length();
          
          // Only deal damage if the object is moving fast enough
          if (speed > 5) {
            const damageAmount = thrownObject.type === "bottle" ? 15 : 25;
            damageNpcFunction(npc.userData.id, damageAmount);
            
            // Create hit effect
            const hitEffect = new THREE.Mesh(
              new THREE.SphereGeometry(0.5, 8, 8),
              new THREE.MeshBasicMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0.7
              })
            );
            hitEffect.position.copy(npcPosition);
            playerAPI.mesh.parent?.add(hitEffect);
            
            // Remove hit effect after animation
            setTimeout(() => {
              playerAPI.mesh.parent?.remove(hitEffect);
            }, 300);
            
            return; // Exit after first hit
          }
        }
      });
    };
    
    // Check for collisions every 100ms for 3 seconds
    const collisionCheckId = setInterval(checkCollisions, 100);
    setTimeout(() => clearInterval(collisionCheckId), 3000);

    // Set up collision detection for the thrown object
    const thrownObject = heldObject;
    
    // Handle collisions (reusing your existing collision code)
    // ...

    // Clear the held object
    setHeldObject(null);
  };

  // First, let's fix the damage handler to ensure logging
  const handleDamagePlayer = (amount: number) => {
    console.log(
      `Player taking ${amount} damage, current health: ${playerHealth}`,
    );

    // Update health state
    setPlayerHealth((prevHealth) => {
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
  const handleRegisterDamageNPC = (
    damageNpcFn: (id: string, damage: number) => void,
  ) => {
    console.log("Registering damageNPC function");
    setDamageNpcFunction(() => damageNpcFn);
  };

  // Update held object position when player moves
  useEffect(() => {
    if (!heldObject || !playerAPI || !playerAPI.mesh) return;
    
    // Set up position tracking for the held object
    const updateHeldObjectPosition = () => {
      // Calculate hand position relative to player
      const offsetDistance = heldObject.type === "bottle" ? 0.8 : 1.0;
      const offsetHeight = heldObject.type === "bottle" ? 1.2 : 0.8;
      
      // Create hand position in front of the player
      const handPosition = new THREE.Vector3(0, offsetHeight, -offsetDistance);
      handPosition.applyQuaternion(playerAPI.mesh.quaternion);
      handPosition.add(new THREE.Vector3(
        playerAPI.body.position.x,
        playerAPI.body.position.y,
        playerAPI.body.position.z
      ));
      
      // Update the physics body position
      heldObject.body.position.copy(new CANNON.Vec3(
        handPosition.x, 
        handPosition.y, 
        handPosition.z
      ));
      
      // Update the physics body rotation to match player's view
      heldObject.body.quaternion.copy(new CANNON.Quaternion(
        playerAPI.mesh.quaternion.x,
        playerAPI.mesh.quaternion.y,
        playerAPI.mesh.quaternion.z,
        playerAPI.mesh.quaternion.w
      ));
      
      requestAnimationFrame(updateHeldObjectPosition);
    };
    
    const frameId = requestAnimationFrame(updateHeldObjectPosition);
    return () => cancelAnimationFrame(frameId);
  }, [heldObject, playerAPI]);

  // Handle score updates
  const handleScoreUpdate = (points: number) => {
    console.log(`Adding ${points} to player score`);
    setPlayerScore((prevScore) => {
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
            onPickup={handlePickup}
            onThrow={handleThrow}
            npcs={
              npcsRef.current.map((npc) => ({
                api: { id: npc.uuid, body: new CANNON.Body(), mesh: npc },
              })) || []
            }
            nearbyObjects={nearbyObjects}
            onDamageNPC={(id, amount) => {
              // Handle NPC damage through the damageNPC function
              if (damageNpcFunction) {
                damageNpcFunction(id, amount);
                console.log(`NPC ${id} damaged by ${amount}`);
                setPlayerScore((prev) => {
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
            <p>E = Pickup, Q = Throw</p>
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

      {gameReady &&
        sceneRef.current &&
        physicsWorldRef.current &&
        playerAPI && (
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
