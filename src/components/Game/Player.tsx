
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createCharacterModel } from '@/utils/three';
import { createCharacterBody } from '@/utils/physics';

// Constants moved outside the component
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

interface PlayerProps {
  scene: THREE.Scene;
  physicsWorld: CANNON.World;
  position?: THREE.Vector3;
  color?: string;
  playerName?: string;
  isLocalPlayer?: boolean;
  onUpdate?: (position: THREE.Vector3, quaternion: THREE.Quaternion) => void;
}

interface PlayerAPI {
  mesh: THREE.Group | null;
  body: CANNON.Body | null;
  jump: () => void;
  punch: () => void;
  kick: () => void;
  health: number;
  setHealth: (value: number) => void;
  score: number;
  setScore: (value: number) => void;
  name: string;
}

const Player = ({ 
  scene, 
  physicsWorld, 
  position = new THREE.Vector3(0, 2, 0),
  color,
  playerName,
  isLocalPlayer = false,
  onUpdate
}: PlayerProps): PlayerAPI => {
  // Create refs for the player state
  const meshRef = useRef<THREE.Group | null>(null);
  const bodyRef = useRef<CANNON.Body | null>(null);
  const characterControllerRef = useRef<{ body: CANNON.Body; jump: () => void; isJumping: () => boolean } | null>(null);
  const healthRef = useRef(100);
  const scoreRef = useRef(0);
  const playerColorRef = useRef(color || PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)]);
  const nameRef = useRef(playerName || PLAYER_NAMES[Math.floor(Math.random() * PLAYER_NAMES.length)]);
  
  const animationState = useRef({
    isWalking: false,
    isJumping: false,
    isPunching: false,
    isKicking: false,
  });

  // Create player mesh and physics body
  useEffect(() => {
    console.log("Creating player at position:", position);
    
    // Create character mesh
    const characterMesh = createCharacterModel(playerColorRef.current);
    meshRef.current = characterMesh;
    characterMesh.position.copy(position);
    scene.add(characterMesh);
    
    // Create physics body
    const cannonPosition = new CANNON.Vec3(position.x, position.y, position.z);
    const characterController = createCharacterBody(cannonPosition);
    characterControllerRef.current = characterController;
    bodyRef.current = characterController.body;
    physicsWorld.addBody(characterController.body);
    
    if (isLocalPlayer) {
      console.log("Local player created");
    } else {
      // Create nametag for non-local players
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
        context.fillText(nameRef.current, canvas.width / 2, canvas.height / 2);
      }
      
      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(material);
      sprite.position.set(0, 2.5, 0);
      sprite.scale.set(2, 0.5, 1);
      characterMesh.add(sprite);
      
      console.log("Remote player created:", nameRef.current);
    }
    
    return () => {
      if (meshRef.current) {
        scene.remove(meshRef.current);
      }
      
      if (bodyRef.current) {
        physicsWorld.removeBody(bodyRef.current);
      }
    };
  }, [scene, physicsWorld, position, isLocalPlayer, playerName]);
  
  // Update player position
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
  
  // Define player actions
  const jump = () => {
    if (characterControllerRef.current && !characterControllerRef.current.isJumping()) {
      characterControllerRef.current.jump();
      animationState.current.isJumping = true;
      
      setTimeout(() => {
        animationState.current.isJumping = false;
      }, 1000);
    }
  };
  
  const punch = () => {
    if (!animationState.current.isPunching) {
      animationState.current.isPunching = true;
      
      if (meshRef.current) {
        const rightArm = meshRef.current.children[3] as THREE.Mesh;
        
        const originalRotation = rightArm.rotation.clone();
        
        const punchTween = () => {
          const duration = 300;
          const startTime = Date.now();
          
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            if (meshRef.current) {
              const rightArm = meshRef.current.children[3] as THREE.Mesh;
              
              if (progress < 0.5) {
                rightArm.rotation.x = originalRotation.x - (progress * 2) * Math.PI / 2;
              } else {
                rightArm.rotation.x = originalRotation.x - (1 - ((progress - 0.5) * 2)) * Math.PI / 2;
              }
              
              if (progress < 1) {
                requestAnimationFrame(animate);
              } else {
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
      
      if (meshRef.current) {
        const rightLeg = meshRef.current.children[5] as THREE.Mesh;
        
        const originalRotation = rightLeg.rotation.clone();
        
        const kickTween = () => {
          const duration = 400;
          const startTime = Date.now();
          
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            if (meshRef.current) {
              const rightLeg = meshRef.current.children[5] as THREE.Mesh;
              
              if (progress < 0.5) {
                rightLeg.rotation.x = originalRotation.x + (progress * 2) * Math.PI / 2;
              } else {
                rightLeg.rotation.x = originalRotation.x + (1 - ((progress - 0.5) * 2)) * Math.PI / 2;
              }
              
              if (progress < 1) {
                requestAnimationFrame(animate);
              } else {
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
  
  // Expose player API
  return {
    mesh: meshRef.current,
    body: bodyRef.current,
    jump,
    punch,
    kick,
    health: healthRef.current,
    setHealth: (value: number) => { healthRef.current = value; },
    score: scoreRef.current,
    setScore: (value: number) => { scoreRef.current = value; },
    name: nameRef.current,
  };
};

export default Player;
