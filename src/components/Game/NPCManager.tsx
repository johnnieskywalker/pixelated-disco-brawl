import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Player from './Player';

// Configuration for NPCs
const NPC_CONFIG = {
  spawnPoints: [
    new THREE.Vector3(10, 1, 10),
    new THREE.Vector3(-10, 1, 10),
    new THREE.Vector3(10, 1, -10),
    new THREE.Vector3(-10, 1, -10),
    new THREE.Vector3(5, 1, -8),
  ],
  colors: ['#FF5722', '#9C27B0', '#03A9F4', '#FFC107', '#607D8B'],
  names: ['Bouncerz', 'Młody', 'Zakapior', 'Rudy', 'Pan Wiesiek'],
  maxNPCs: 5,
  spawnInterval: 10000, // Time between spawns in ms
  followDistance: 8, // Distance at which NPCs will start following
  attackDistance: 2, // Distance at which NPCs will attack
  moveSpeed: 0.03, // NPC movement speed
  attackCooldown: 2000, // Cooldown between attacks
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
      punch?: () => void;
      kick?: () => void;
    };
    lastAttackTime: number;
    isAttacking: boolean;
  }>>([]);
  const [isSpawning, setIsSpawning] = useState(true);

  // Spawn initial NPCs
  useEffect(() => {
    const spawnNPC = () => {
      if (npcs.current.length >= NPC_CONFIG.maxNPCs || !isSpawning) return;
      
      const spawnPoint = NPC_CONFIG.spawnPoints[npcs.current.length % NPC_CONFIG.spawnPoints.length];
      const color = NPC_CONFIG.colors[npcs.current.length % NPC_CONFIG.colors.length];
      const name = NPC_CONFIG.names[npcs.current.length % NPC_CONFIG.names.length];
      
      console.log(`Spawning NPC: ${name} at position:`, spawnPoint);
      
      const npcApi = Player({
        scene,
        physicsWorld,
        position: spawnPoint,
        color,
        playerName: name,
        isLocalPlayer: false,
      });
      
      npcs.current.push({
        api: npcApi,
        lastAttackTime: 0,
        isAttacking: false
      });
      
      // Schedule next spawn
      if (npcs.current.length < NPC_CONFIG.maxNPCs) {
        setTimeout(spawnNPC, NPC_CONFIG.spawnInterval);
      }
    };
    
    // Spawn first NPC immediately
    spawnNPC();
    
    return () => {
      setIsSpawning(false);
    };
  }, [scene, physicsWorld]);
  
  // Update NPC behavior
  useEffect(() => {
    const updateNPCs = () => {
      const now = Date.now();
      
      npcs.current.forEach((npc) => {
        if (!npc.api || !npc.api.body || !npc.api.mesh) return;
        
        const npcPosition = new THREE.Vector3(
          npc.api.body.position.x,
          npc.api.body.position.y,
          npc.api.body.position.z
        );
        
        // Calculate distance to player
        const distanceToPlayer = npcPosition.distanceTo(playerPosition);
        
        // Follow player if within range
        if (distanceToPlayer < NPC_CONFIG.followDistance) {
          // Calculate direction toward player
          const direction = new THREE.Vector3()
            .subVectors(playerPosition, npcPosition)
            .normalize();
          
          // Look at player
          const lookAtPosition = new THREE.Vector3(
            playerPosition.x,
            npc.api.mesh.position.y,
            playerPosition.z
          );
          npc.api.mesh.lookAt(lookAtPosition);
          
          // Move toward player
          if (distanceToPlayer > NPC_CONFIG.attackDistance) {
            // Set animation state to walking
            if (npc.api.mesh.userData && typeof npc.api.mesh.userData.setWalking === 'function') {
              npc.api.mesh.userData.setWalking(true);
            }
            
            // Apply movement force
            const moveSpeed = NPC_CONFIG.moveSpeed;
            npc.api.body.position.x += direction.x * moveSpeed;
            npc.api.body.position.z += direction.z * moveSpeed;
            
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
                // Damage player
                onDamagePlayer(5);
              } else if (attackType === 'kick' && npc.api.kick) {
                npc.api.kick();
                // Damage player
                onDamagePlayer(10);
              }
              
              // Reset attack state after animation
              setTimeout(() => {
                npc.isAttacking = false;
              }, 1000);
            }
          }
        } else {
          // Stop walking when far from player
          if (npc.api.mesh.userData && typeof npc.api.mesh.userData.setWalking === 'function') {
            npc.api.mesh.userData.setWalking(false);
          }
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