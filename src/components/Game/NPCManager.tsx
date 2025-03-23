import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Player from './Player';

// Configuration for NPCs with improved spawn point distribution
const NPC_CONFIG = {
  // Define more spawn points spread around the disco
  spawnPoints: [
    new THREE.Vector3(10, 1, 10),
    new THREE.Vector3(-10, 1, 10),
    new THREE.Vector3(10, 1, -10),
    new THREE.Vector3(-10, 1, -10),
    new THREE.Vector3(5, 1, -8),
    new THREE.Vector3(-5, 1, 8),
    new THREE.Vector3(-8, 1, -5),
    new THREE.Vector3(8, 1, 5),
    new THREE.Vector3(-12, 1, 0),
    new THREE.Vector3(12, 1, 0),
  ],
  colors: ['#FF5722', '#9C27B0', '#03A9F4', '#FFC107', '#607D8B'],
  names: ['Bouncerz', 'Młody', 'Zakapior', 'Rudy', 'Pan Wiesiek'],
  maxNPCs: 5,
  spawnInterval: 10000,
  followDistance: 8,
  attackDistance: 2,
  moveSpeed: 0.03,
  attackCooldown: 2000,
  // Add new parameters for movement variation
  positionVariance: 2.0,     // Random offset to spawn points
  speedVariation: 0.01,      // Variation in move speed
  directionVariation: 0.2,   // How much they deviate from direct path
  avoidanceDistance: 2.0,    // How far they try to stay from each other
};

interface NPCManagerProps {
  scene: THREE.Scene;
  physicsWorld: CANNON.World;
  playerPosition: THREE.Vector3;
  playerHealth: number;
  onDamagePlayer: (amount: number) => void;
}

const NPCManager = ({ scene, physicsWorld, playerPosition, playerHealth, onDamagePlayer }: NPCManagerProps) => {
  const npcs = useRef<Array<{
    api: {
      body: CANNON.Body;
      mesh: THREE.Mesh | THREE.Group;
      id: string;
      punch?: () => void;
      kick?: () => void;
    };
    lastAttackTime: number;
    isAttacking: boolean;
    // Add these fields for individual NPC behavior
    moveSpeed: number;
    targetOffset: THREE.Vector3;
    lastDirectionChange: number;
  }>>([]);
  const [isSpawning, setIsSpawning] = useState(true);

  // Spawn initial NPCs with randomization
  useEffect(() => {
    const spawnNPC = () => {
      if (npcs.current.length >= NPC_CONFIG.maxNPCs || !isSpawning) return;
      
      // Pick a random spawn point
      const baseSpawnPoint = NPC_CONFIG.spawnPoints[
        Math.floor(Math.random() * NPC_CONFIG.spawnPoints.length)
      ];
      
      // Add random variation to spawn position
      const variance = NPC_CONFIG.positionVariance;
      const randomOffset = new THREE.Vector3(
        (Math.random() - 0.5) * variance,
        0,  // Don't vary y position
        (Math.random() - 0.5) * variance
      );
      
      const spawnPoint = new THREE.Vector3().addVectors(baseSpawnPoint, randomOffset);
      
      // Get random color and name
      const color = NPC_CONFIG.colors[Math.floor(Math.random() * NPC_CONFIG.colors.length)];
      const name = NPC_CONFIG.names[Math.floor(Math.random() * NPC_CONFIG.names.length)];
      
      console.log(`Spawning NPC: ${name} at position:`, spawnPoint);
      const npcApi = {
        ...Player({
          scene,
          physicsWorld,
          position: spawnPoint,
          color,
          playerName: name,
          isLocalPlayer: false,
        }),
        id: name,
      };
      
      npcs.current.push({
        api: npcApi,
        lastAttackTime: 0,
        isAttacking: false,
        // Add individual movement properties
        moveSpeed: NPC_CONFIG.moveSpeed + (Math.random() - 0.5) * NPC_CONFIG.speedVariation,
        targetOffset: new THREE.Vector3(
          (Math.random() - 0.5) * 3, 
          0, 
          (Math.random() - 0.5) * 3
        ),
        lastDirectionChange: Date.now()
      });
      
      // Schedule next spawn with random delay
      if (npcs.current.length < NPC_CONFIG.maxNPCs) {
        setTimeout(spawnNPC, NPC_CONFIG.spawnInterval + Math.random() * 2000);
      }
    };
    
    // Spawn first NPC immediately
    spawnNPC();
    
    return () => {
      setIsSpawning(false);
    };
  }, [scene, physicsWorld]);
  
  // Update NPC behavior with improved movement logic
  useEffect(() => {
    const updateNPCs = () => {
      const now = Date.now();
      
      npcs.current.forEach((npc, index) => {
        if (!npc.api || !npc.api.body || !npc.api.mesh) return;
        
        // CRITICAL FIX: Make sure the mesh position is updated from physics
        npc.api.mesh.position.set(
          npc.api.body.position.x,
          npc.api.body.position.y,
          npc.api.body.position.z
        );
        
        const npcPosition = new THREE.Vector3(
          npc.api.body.position.x,
          npc.api.body.position.y,
          npc.api.body.position.z
        );
        
        // Update target offset occasionally for more natural movement
        if (now - npc.lastDirectionChange > 3000) {
          npc.targetOffset = new THREE.Vector3(
            (Math.random() - 0.5) * 3,
            0,
            (Math.random() - 0.5) * 3
          );
          npc.lastDirectionChange = now;
        }
        
        // Calculate distance to player
        const distanceToPlayer = npcPosition.distanceTo(playerPosition);
        
        // Follow player if within range
        if (distanceToPlayer < NPC_CONFIG.followDistance) {
          // Create an individual target with offset
          const targetPosition = new THREE.Vector3().addVectors(
            playerPosition,
            npc.targetOffset
          );
          
          // Calculate direction toward offset target position
          const direction = new THREE.Vector3()
            .subVectors(targetPosition, npcPosition)
            .normalize();
          
          // Look at player (not the offset target) for natural appearance
          const lookAtPosition = new THREE.Vector3(
            playerPosition.x,
            npc.api.mesh.position.y,
            playerPosition.z
          );
          npc.api.mesh.lookAt(lookAtPosition);
          
          // Add avoidance from other NPCs
          const avoidanceVector = new THREE.Vector3();
          
          npcs.current.forEach((otherNPC, otherIndex) => {
            if (index === otherIndex || !otherNPC.api || !otherNPC.api.body) return;
            
            const otherPosition = new THREE.Vector3(
              otherNPC.api.body.position.x,
              otherNPC.api.body.position.y,
              otherNPC.api.body.position.z
            );
            
            const distance = npcPosition.distanceTo(otherPosition);
            
            // Apply separation force when NPCs get too close
            if (distance < NPC_CONFIG.avoidanceDistance && distance > 0) {
              const repulsionStrength = 1 - (distance / NPC_CONFIG.avoidanceDistance);
              const pushDirection = new THREE.Vector3()
                .subVectors(npcPosition, otherPosition)
                .normalize()
                .multiplyScalar(repulsionStrength * 0.5);
              
              avoidanceVector.add(pushDirection);
            }
          });
          
          // Move toward player if not too close for attack
          if (distanceToPlayer > NPC_CONFIG.attackDistance) {
            // Set animation state to walking
            if (npc.api.mesh.userData && typeof npc.api.mesh.userData.setWalking === 'function') {
              npc.api.mesh.userData.setWalking(true);
            }
            
            // Apply movement with avoidance
            const finalDirection = new THREE.Vector3()
              .addVectors(direction, avoidanceVector)
              .normalize();
            
            // Add slight random movement for more natural appearance
            finalDirection.x += (Math.random() - 0.5) * NPC_CONFIG.directionVariation;
            finalDirection.z += (Math.random() - 0.5) * NPC_CONFIG.directionVariation;
            finalDirection.normalize();
            
            // Apply movement using individual speed
            npc.api.body.position.x += finalDirection.x * npc.moveSpeed;
            npc.api.body.position.z += finalDirection.z * npc.moveSpeed;
            
            // Prevent floating & sinking
            npc.api.body.position.y = Math.max(1.0, npc.api.body.position.y);
            
            // Reset attack state
            npc.isAttacking = false;
          } else {
            // In attack range
            if (npc.api.mesh.userData && typeof npc.api.mesh.userData.setWalking === 'function') {
              npc.api.mesh.userData.setWalking(false);
            }
            
            // Attack player if cooldown is over
            if (!npc.isAttacking && now - npc.lastAttackTime > NPC_CONFIG.attackCooldown) {
              // Randomly choose between punch and kick
              const attackType = Math.random() > 0.5 ? 'punch' : 'kick';
              
              npc.isAttacking = true;
              npc.lastAttackTime = now;
              
              if (attackType === 'punch' && npc.api.punch) {
                npc.api.punch();
                // Higher punch damage for more noticeable effect
                const punchDamage = 8;
                console.log("NPC attacking player with punch, damage:", punchDamage);
                
                // Call damage immediately instead of in setTimeout
                onDamagePlayer(punchDamage);
                
                // Create hit effect
                const hitEffect = new THREE.Mesh(
                  new THREE.SphereGeometry(0.5, 8, 8),
                  new THREE.MeshBasicMaterial({ 
                    color: 0xff0000, 
                    transparent: true, 
                    opacity: 0.7 
                  })
                );
                hitEffect.position.copy(playerPosition);
                scene.add(hitEffect);
                
                // Remove the hit effect after animation
                setTimeout(() => {
                  scene.remove(hitEffect);
                }, 200);
                
              } else if (attackType === 'kick' && npc.api.kick) {
                npc.api.kick();
                // Higher kick damage
                const kickDamage = 15; 
                console.log("NPC attacking player with kick, damage:", kickDamage);
                
                // Add a slight delay to match the animation timing
                setTimeout(() => {
                  onDamagePlayer(kickDamage);
                }, 300);
              }
              
              // Enhance the hit effect
              const hitEffect = new THREE.Mesh(
                new THREE.SphereGeometry(1.5, 16, 16),
                new THREE.MeshBasicMaterial({ 
                  color: 0xff0000, 
                  transparent: true, 
                  opacity: 0.7 
                })
              );
              hitEffect.position.copy(playerPosition);
              scene.add(hitEffect);
              
              // Animate the hit effect
              const startScale = 0.5;
              const endScale = 1.5;
              const duration = 200;
              const startTime = Date.now();
              
              const animateHitEffect = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                const scale = startScale + (endScale - startScale) * progress;
                hitEffect.scale.set(scale, scale, scale);
                
                if (progress < 1) {
                  requestAnimationFrame(animateHitEffect);
                } else {
                  scene.remove(hitEffect);
                }
              };
              
              requestAnimationFrame(animateHitEffect);
              
              // Reset attack state after animation
              setTimeout(() => {
                npc.isAttacking = false;
              }, 1000);
            }
          }
        } else {
          // This part is incomplete - the NPCs aren't updating their positions properly
        }
      });
      
      if (isSpawning) {
        requestAnimationFrame(updateNPCs);
      }
    };
    
    const animationId = requestAnimationFrame(updateNPCs);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [playerPosition, playerHealth, onDamagePlayer, isSpawning]);
  
  return null;
};

export default NPCManager;