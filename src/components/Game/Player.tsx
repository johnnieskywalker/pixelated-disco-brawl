
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createCharacterModel } from '@/utils/three';
import { createCharacterBody } from '@/utils/physics';

interface PlayerProps {
  scene: THREE.Scene;
  physicsWorld: CANNON.World;
  position?: THREE.Vector3;
  color?: string;
  playerName?: string;
  isLocalPlayer?: boolean;
  onUpdate?: (position: THREE.Vector3, quaternion: THREE.Quaternion) => void;
}

const PLAYER_COLORS = [
  '#E91E63', // Pink
  '#3F51B5', // Indigo
  '#4CAF50', // Green
  '#FF9800', // Orange
  '#9C27B0', // Purple
];

const PLAYER_NAMES = [
  'Seba', 'Mati', 'Żenia', 'Arek', 'Zbyszek',
  'Waldek', 'Darek', 'Jurek', 'Mirek', 'Tadek',
];

const Player = ({ 
  scene, 
  physicsWorld, 
  position = new THREE.Vector3(0, 2, 0),
  color,
  playerName,
  isLocalPlayer = false,
  onUpdate
}: PlayerProps) => {
  const [health, setHealth] = useState(100);
  const [score, setScore] = useState(0);
  
  // Use random color and name if not provided
  const playerColor = useRef(color || PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)]);
  const name = useRef(playerName || PLAYER_NAMES[Math.floor(Math.random() * PLAYER_NAMES.length)]);
  
  // Refs for meshes and physics bodies
  const meshRef = useRef<THREE.Group | null>(null);
  const bodyRef = useRef<CANNON.Body | null>(null);
  const characterControllerRef = useRef<{ body: CANNON.Body; jump: () => void; isJumping: () => boolean } | null>(null);
  
  // Animation state
  const animationState = useRef({
    isWalking: false,
    isJumping: false,
    isPunching: false,
    isKicking: false,
  });
  
  // Initialize player
  useEffect(() => {
    // Create character mesh
    const characterMesh = createCharacterModel(playerColor.current);
    meshRef.current = characterMesh;
    characterMesh.position.copy(position);
    scene.add(characterMesh);
    
    // Create character physics body
    const cannonPosition = new CANNON.Vec3(position.x, position.y, position.z);
    const characterController = createCharacterBody(cannonPosition);
    characterControllerRef.current = characterController;
    bodyRef.current = characterController.body;
    physicsWorld.addBody(characterController.body);
    
    // Create name tag
    if (isLocalPlayer) {
      // Don't show name tag for local player
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const context = canvas.getContext('2d');
      
      if (context) {
        context.fillStyle = '#00000080';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.strokeStyle = '#FFFFFF';
        context.lineWidth = 2;
        context.strokeRect(0, 0, canvas.width, canvas.height);
        
        context.fillStyle = '#FFFFFF';
        context.font = 'bold 32px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(name.current, canvas.width / 2, canvas.height / 2);
      }
      
      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(material);
      sprite.position.set(0, 2.5, 0);
      sprite.scale.set(2, 0.5, 1);
      characterMesh.add(sprite);
    }
    
    return () => {
      // Clean up
      if (meshRef.current) {
        scene.remove(meshRef.current);
      }
      
      if (bodyRef.current) {
        physicsWorld.removeBody(bodyRef.current);
      }
    };
  }, [scene, physicsWorld, position, isLocalPlayer]);
  
  // Update physics and mesh positions
  useEffect(() => {
    const updatePlayerPosition = () => {
      const mesh = meshRef.current;
      const body = bodyRef.current;
      
      if (mesh && body) {
        mesh.position.set(body.position.x, body.position.y, body.position.z);
        mesh.quaternion.set(
          body.quaternion.x,
          body.quaternion.y,
          body.quaternion.z,
          body.quaternion.w
        );
        
        // Update parent component if needed
        if (onUpdate) {
          onUpdate(mesh.position, mesh.quaternion);
        }
      }
      
      requestAnimationFrame(updatePlayerPosition);
    };
    
    const frameId = requestAnimationFrame(updatePlayerPosition);
    
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [onUpdate]);
  
  // Player actions
  const jump = () => {
    if (characterControllerRef.current && !characterControllerRef.current.isJumping()) {
      characterControllerRef.current.jump();
      animationState.current.isJumping = true;
      
      // Reset jumping animation after a delay
      setTimeout(() => {
        animationState.current.isJumping = false;
      }, 1000);
    }
  };
  
  const punch = () => {
    if (!animationState.current.isPunching) {
      animationState.current.isPunching = true;
      
      // Simple animation: rotate right arm
      if (meshRef.current) {
        const rightArm = meshRef.current.children[3] as THREE.Mesh;
        
        // Store original rotation
        const originalRotation = rightArm.rotation.clone();
        
        // Animate punch
        const punchTween = () => {
          const duration = 300; // ms
          const startTime = Date.now();
          
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            if (meshRef.current) {
              const rightArm = meshRef.current.children[3] as THREE.Mesh;
              
              if (progress < 0.5) {
                // Punching forward
                rightArm.rotation.x = originalRotation.x - (progress * 2) * Math.PI / 2;
              } else {
                // Returning to original position
                rightArm.rotation.x = originalRotation.x - (1 - ((progress - 0.5) * 2)) * Math.PI / 2;
              }
              
              if (progress < 1) {
                requestAnimationFrame(animate);
              } else {
                // Reset rotation and state
                rightArm.rotation.copy(originalRotation);
                animationState.current.isPunching = false;
              }
            }
          };
          
          requestAnimationFrame(animate);
        };
        
        punchTween();
      }
    }
  };
  
  const kick = () => {
    if (!animationState.current.isKicking) {
      animationState.current.isKicking = true;
      
      // Simple animation: rotate right leg
      if (meshRef.current) {
        const rightLeg = meshRef.current.children[5] as THREE.Mesh;
        
        // Store original rotation
        const originalRotation = rightLeg.rotation.clone();
        
        // Animate kick
        const kickTween = () => {
          const duration = 400; // ms
          const startTime = Date.now();
          
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            if (meshRef.current) {
              const rightLeg = meshRef.current.children[5] as THREE.Mesh;
              
              if (progress < 0.5) {
                // Kicking forward
                rightLeg.rotation.x = originalRotation.x + (progress * 2) * Math.PI / 2;
              } else {
                // Returning to original position
                rightLeg.rotation.x = originalRotation.x + (1 - ((progress - 0.5) * 2)) * Math.PI / 2;
              }
              
              if (progress < 1) {
                requestAnimationFrame(animate);
              } else {
                // Reset rotation and state
                rightLeg.rotation.copy(originalRotation);
                animationState.current.isKicking = false;
              }
            }
          };
          
          requestAnimationFrame(animate);
        };
        
        kickTween();
      }
    }
  };
  
  // Expose player methods and state
  return {
    mesh: meshRef.current,
    body: bodyRef.current,
    jump,
    punch,
    kick,
    health,
    setHealth,
    score,
    setScore,
    name: name.current,
  };
};

export default Player;
