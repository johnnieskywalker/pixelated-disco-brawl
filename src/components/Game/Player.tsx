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
  onUpdate?: (position: THREE.Vector3, quaternion?: THREE.Quaternion) => void;
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
  console.log("Creating player with props:", { position, color, playerName, isLocalPlayer });
  
  // Create character mesh
  const characterMesh = createCharacterModel(color || PLAYER_COLORS[0]);
  characterMesh.position.copy(position);
  scene.add(characterMesh);
  
  console.log("Character mesh created and added to scene at position:", position);
  
  // Create physics body
  const cannonPosition = new CANNON.Vec3(position.x, position.y, position.z);
  const characterController = createCharacterBody(cannonPosition);
  const characterBody = characterController.body;
  physicsWorld.addBody(characterBody);
  
  console.log("Character physics body created and added to physics world");
  
  if (!isLocalPlayer) {
    // Create nametag for non-local players
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    
    const playerNameVal = playerName || PLAYER_NAMES[Math.floor(Math.random() * PLAYER_NAMES.length)];
    
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
      context.fillText(playerNameVal, canvas.width / 2, canvas.height / 2);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(0, 2.5, 0);
    sprite.scale.set(2, 0.5, 1);
    characterMesh.add(sprite);
  }
  
  // Walking animation state
  let isWalking = false;
  let walkAnimationFrame = 0;
  let legDirection = 1; // 1 for forward, -1 for backward
  const walkSpeed = 0.3;
  const walkAngleMax = Math.PI / 3; // Slightly increased angle for more noticeable movement
  
  // Get leg references
  const leftLeg = characterMesh.children[4] as THREE.Mesh;
  const rightLeg = characterMesh.children[5] as THREE.Mesh;
  const origLeftLegRotation = leftLeg.rotation.clone();
  const origRightLegRotation = rightLeg.rotation.clone();
  
  // Set walking state function
  const setWalking = (walking: boolean) => {
    isWalking = walking;
    // Reset legs to original position when stopping
    if (!walking) {
      leftLeg.rotation.copy(origLeftLegRotation);
      rightLeg.rotation.copy(origRightLegRotation);
    }
  };
  
  // Store the setWalking function in userData for external access
  characterMesh.userData = { setWalking };
  
  // Animation loop for walking
  const animateWalking = () => {
    if (isWalking) {
      // Alternate legs when walking
      walkAnimationFrame += walkSpeed;
      
      // Sinusoidal motion for a smooth walk cycle
      const legAngle = Math.sin(walkAnimationFrame) * walkAngleMax;
      
      // Move legs in opposite directions
      leftLeg.rotation.x = origLeftLegRotation.x + legAngle;
      rightLeg.rotation.x = origRightLegRotation.x - legAngle;
    }
    
    requestAnimationFrame(animateWalking);
  };
  
  // Start animation loop
  animateWalking();
  
  // Update function to sync mesh with physics
  const updateMeshPosition = () => {
    characterMesh.position.set(
      characterBody.position.x,
      characterBody.position.y,
      characterBody.position.z
    );
    
    characterMesh.quaternion.set(
      characterBody.quaternion.x,
      characterBody.quaternion.y,
      characterBody.quaternion.z,
      characterBody.quaternion.w
    );
    
    if (onUpdate) {
      onUpdate(characterMesh.position, characterMesh.quaternion);
    }
    
    requestAnimationFrame(updateMeshPosition);
  };
  
  requestAnimationFrame(updateMeshPosition);
  
  // Animation state
  let isJumping = false;
  let isPunching = false;
  let isKicking = false;
  
  // Player actions
  const jump = () => {
    if (!isJumping && characterController.isJumping && !characterController.isJumping()) {
      characterController.jump();
      isJumping = true;
      
      setTimeout(() => {
        isJumping = false;
      }, 1000);
    }
  };
  
  const punch = () => {
    if (!isPunching) {
      isPunching = true;
      
      const rightArm = characterMesh.children[3] as THREE.Mesh;
      const originalRotation = rightArm.rotation.clone();
      
      const punchTween = () => {
        const duration = 300;
        const startTime = Date.now();
        
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          if (progress < 0.5) {
            rightArm.rotation.x = originalRotation.x - (progress * 2) * Math.PI / 2;
          } else {
            rightArm.rotation.x = originalRotation.x - (1 - ((progress - 0.5) * 2)) * Math.PI / 2;
          }
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            rightArm.rotation.copy(originalRotation);
            isPunching = false;
          }
        };
        
        requestAnimationFrame(animate);
      };
      
      punchTween();
    }
  };
  
  const kick = () => {
    if (!isKicking) {
      isKicking = true;
      
      const rightLeg = characterMesh.children[5] as THREE.Mesh;
      const originalRotation = rightLeg.rotation.clone();
      
      const kickTween = () => {
        const duration = 400;
        const startTime = Date.now();
        
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          if (progress < 0.5) {
            rightLeg.rotation.x = originalRotation.x + (progress * 2) * Math.PI / 2;
          } else {
            rightLeg.rotation.x = originalRotation.x + (1 - ((progress - 0.5) * 2)) * Math.PI / 2;
          }
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            rightLeg.rotation.copy(originalRotation);
            isKicking = false;
          }
        };
        
        requestAnimationFrame(animate);
      };
      
      kickTween();
    }
  };
  
  // Health and score
  let health = 100;
  let score = 0;
  
  return {
    mesh: characterMesh,
    body: characterBody,
    jump,
    punch,
    kick,
    health,
    setHealth: (value: number) => { health = value; },
    score,
    setScore: (value: number) => { score = value; },
    name: playerName || PLAYER_NAMES[Math.floor(Math.random() * PLAYER_NAMES.length)],
  };
};

export default Player;
