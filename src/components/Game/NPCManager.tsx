
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
  maxNPCs: 3, // Reduced from 5 to 3 to save resources
  spawnInterval: 15000, // Increased to reduce spawn frequency
  followDistance: 8,
  attackDistance: 2,
  moveSpeed: 0.03,
  attackCooldown: 2000,
  // Parameters for movement variation
  positionVariance: 2.0,
  speedVariation: 0.01,
  directionVariation: 0.2,
  avoidanceDistance: 2.0,
};

interface NPCManagerProps {
  scene: THREE.Scene;
  physicsWorld: CANNON.World;
  playerPosition: THREE.Vector3;
  playerHealth: number;
  onDamagePlayer: (amount: number) => void;
  onScoreUpdate?: (points: number) => void;
  onRegisterNPCs?: (npcs: Array<{ api: { id: string; body: CANNON.Body; mesh: THREE.Object3D } }>) => void;
  onRegisterDamageNPC?: (damageNpcFn: (id: string, damage: number) => void) => void;
}

const NPCManager = ({ 
  scene, 
  physicsWorld, 
  playerPosition, 
  playerHealth, 
  onDamagePlayer,
  onScoreUpdate,
  onRegisterNPCs,
  onRegisterDamageNPC
}: NPCManagerProps) => {
  const npcs = useRef<Array<{
    api: {
      body: CANNON.Body;
      mesh: THREE.Mesh | THREE.Group;
      id: string;
      health?: number;
      punch?: () => void;
      kick?: () => void;
    };
    lastAttackTime: number;
    isAttacking: boolean;
    moveSpeed: number;
    targetOffset: THREE.Vector3;
    lastDirectionChange: number;
  }>>([]);
  const [isSpawning, setIsSpawning] = useState(true);
  const updateIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (onRegisterNPCs) {
      onRegisterNPCs(npcs.current);
    }
  }, [onRegisterNPCs]);

  const handleNPCDamage = (id: string, damage: number) => {
    const npc = npcs.current.find(n => n.api.id === id);
    if (!npc) return;
    
    if (npc.api.health === undefined) {
      npc.api.health = 100;
    }
    
    npc.api.health = Math.max(0, npc.api.health - damage);
    console.log(`NPC ${id} took ${damage} damage, health: ${npc.api.health}`);
    
    if (npc.api.mesh) {
      const originalMaterials: THREE.Material[] = [];
      
      npc.api.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          if (Array.isArray(child.material)) {
            originalMaterials.push(...child.material);
            child.material = child.material.map(() => 
              new THREE.MeshBasicMaterial({ color: 0xff0000 })
            );
          } else {
            originalMaterials.push(child.material);
            child.material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
          }
        }
      });
      
      setTimeout(() => {
        let materialIndex = 0;
        npc.api.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            if (Array.isArray(child.material)) {
              child.material = child.material.map(() => {
                return originalMaterials[materialIndex++];
              });
            } else {
              child.material = originalMaterials[materialIndex++];
            }
          }
        });
      }, 100);
    }
    
    if (npc.api.health <= 0) {
      console.log(`NPC ${id} defeated!`);
      
      if (onScoreUpdate) {
        const points = 100;
        onScoreUpdate(points);
      }
      
      const npcIndex = npcs.current.findIndex(n => n.api.id === id);
      if (npcIndex !== -1) {
        if (npc.api.mesh) {
          npc.api.mesh.visible = false;
        }
        
        setTimeout(() => {
          if (npc.api.health !== undefined) {
            npc.api.health = 100;
          }
          
          const spawnPoint = NPC_CONFIG.spawnPoints[
            Math.floor(Math.random() * NPC_CONFIG.spawnPoints.length)
          ];
          
          if (npc.api.body) {
            npc.api.body.position.set(spawnPoint.x, spawnPoint.y, spawnPoint.z);
            npc.api.body.velocity.set(0, 0, 0);
          }
          
          if (npc.api.mesh) {
            npc.api.mesh.visible = true;
          }
          
          console.log(`NPC ${id} respawned at ${spawnPoint.x}, ${spawnPoint.y}, ${spawnPoint.z}`);
        }, 5000);
      }
    }
  };

  // Register the damage NPC function
  useEffect(() => {
    if (onRegisterDamageNPC) {
      onRegisterDamageNPC(handleNPCDamage);
    }
    
    return () => {};
  }, [onRegisterDamageNPC]);

  useEffect(() => {
    const spawnNPC = () => {
      if (npcs.current.length >= NPC_CONFIG.maxNPCs || !isSpawning) return;
      
      const baseSpawnPoint = NPC_CONFIG.spawnPoints[
        Math.floor(Math.random() * NPC_CONFIG.spawnPoints.length)
      ];
      
      const variance = NPC_CONFIG.positionVariance;
      const randomOffset = new THREE.Vector3(
        (Math.random() - 0.5) * variance,
        0,
        (Math.random() - 0.5) * variance
      );
      
      const spawnPoint = new THREE.Vector3().addVectors(baseSpawnPoint, randomOffset);
      
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
        health: 100,
      };
      
      npcs.current.push({
        api: npcApi,
        lastAttackTime: 0,
        isAttacking: false,
        moveSpeed: NPC_CONFIG.moveSpeed + (Math.random() - 0.5) * NPC_CONFIG.speedVariation,
        targetOffset: new THREE.Vector3(
          (Math.random() - 0.5) * 3, 
          0, 
          (Math.random() - 0.5) * 3
        ),
        lastDirectionChange: Date.now()
      });
      
      if (npcs.current.length < NPC_CONFIG.maxNPCs) {
        setTimeout(spawnNPC, NPC_CONFIG.spawnInterval + Math.random() * 2000);
      }
    };
    
    spawnNPC();
    
    return () => {
      setIsSpawning(false);
    };
  }, [scene, physicsWorld]);
  
  useEffect(() => {
    // Use a less frequent update interval to save resources (from requestAnimationFrame to setInterval)
    const updateNPCs = () => {
      const now = Date.now();
      
      npcs.current.forEach((npc, index) => {
        if (!npc.api || !npc.api.body || !npc.api.mesh) return;
        
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
        
        if (now - npc.lastDirectionChange > 3000) {
          npc.targetOffset = new THREE.Vector3(
            (Math.random() - 0.5) * 3,
            0,
            (Math.random() - 0.5) * 3
          );
          npc.lastDirectionChange = now;
        }
        
        const distanceToPlayer = npcPosition.distanceTo(playerPosition);
        
        if (distanceToPlayer < NPC_CONFIG.followDistance) {
          const targetPosition = new THREE.Vector3().addVectors(
            playerPosition,
            npc.targetOffset
          );
          
          const direction = new THREE.Vector3()
            .subVectors(targetPosition, npcPosition)
            .normalize();
          
          const lookAtPosition = new THREE.Vector3(
            playerPosition.x,
            npc.api.mesh.position.y,
            playerPosition.z
          );
          npc.api.mesh.lookAt(lookAtPosition);
          
          const avoidanceVector = new THREE.Vector3();
          
          npcs.current.forEach((otherNPC, otherIndex) => {
            if (index === otherIndex || !otherNPC.api || !otherNPC.api.body) return;
            
            const otherPosition = new THREE.Vector3(
              otherNPC.api.body.position.x,
              otherNPC.api.body.position.y,
              otherNPC.api.body.position.z
            );
            
            const distance = npcPosition.distanceTo(otherPosition);
            
            if (distance < NPC_CONFIG.avoidanceDistance && distance > 0) {
              const repulsionStrength = 1 - (distance / NPC_CONFIG.avoidanceDistance);
              const pushDirection = new THREE.Vector3()
                .subVectors(npcPosition, otherPosition)
                .normalize()
                .multiplyScalar(repulsionStrength * 0.5);
              
              avoidanceVector.add(pushDirection);
            }
          });
          
          if (distanceToPlayer > NPC_CONFIG.attackDistance) {
            if (npc.api.mesh.userData && typeof npc.api.mesh.userData.setWalking === 'function') {
              npc.api.mesh.userData.setWalking(true);
            }
            
            const finalDirection = new THREE.Vector3()
              .addVectors(direction, avoidanceVector)
              .normalize();
            
            finalDirection.x += (Math.random() - 0.5) * NPC_CONFIG.directionVariation;
            finalDirection.z += (Math.random() - 0.5) * NPC_CONFIG.directionVariation;
            finalDirection.normalize();
            
            npc.api.body.position.x += finalDirection.x * npc.moveSpeed;
            npc.api.body.position.z += finalDirection.z * npc.moveSpeed;
            
            npc.api.body.position.y = Math.max(1.0, npc.api.body.position.y);
            
            npc.isAttacking = false;
          } else {
            if (npc.api.mesh.userData && typeof npc.api.mesh.userData.setWalking === 'function') {
              npc.api.mesh.userData.setWalking(false);
            }
            
            if (!npc.isAttacking && now - npc.lastAttackTime > NPC_CONFIG.attackCooldown) {
              const attackType = Math.random() > 0.5 ? 'punch' : 'kick';
              
              npc.isAttacking = true;
              npc.lastAttackTime = now;
              
              if (attackType === 'punch' && npc.api.punch) {
                npc.api.punch();
                const punchDamage = 8;
                console.log("NPC attacking player with punch, damage:", punchDamage);
                
                onDamagePlayer(punchDamage);
                
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
                
                setTimeout(() => {
                  scene.remove(hitEffect);
                }, 200);
              } else if (attackType === 'kick' && npc.api.kick) {
                npc.api.kick();
                const kickDamage = 15; 
                console.log("NPC attacking player with kick, damage:", kickDamage);
                
                setTimeout(() => {
                  onDamagePlayer(kickDamage);
                }, 300);
              }
              
              setTimeout(() => {
                npc.isAttacking = false;
              }, 1000);
            }
          }
        }
      });
    };
    
    // Use setInterval instead of requestAnimationFrame for less frequent updates
    updateIntervalRef.current = window.setInterval(updateNPCs, 100) as unknown as number;
    
    return () => {
      if (updateIntervalRef.current !== null) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [playerPosition, playerHealth, onDamagePlayer, isSpawning, scene]);
  
  // Return null instead of an object
  return null;
};

export default NPCManager;
