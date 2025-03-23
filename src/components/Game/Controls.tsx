import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

interface ControlsProps {
  camera: THREE.PerspectiveCamera;
  cannonBody: CANNON.Body;
  playerMesh: THREE.Object3D;
  onJump: () => void;
  onPunch: () => void;
  onKick: () => void;
  onPickup: () => void;
  onThrow: () => void;
  movementRef?: React.MutableRefObject<{
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
  }>;
}

const Controls = ({ 
  camera, 
  cannonBody, 
  playerMesh,
  onJump,
  onPunch,
  onKick,
  onPickup,
  onThrow
}: ControlsProps) => {
  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const moveLeft = useRef(false);
  const moveRight = useRef(false);
  
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const mousePosition = useRef({ x: 0, y: 0 });
  const isPointerLocked = useRef(false);
  const isWalking = useRef(false);

  useEffect(() => {
    console.log("Controls component mounted");
    
    const onKeyDown = (event: KeyboardEvent) => {
      console.log("Key pressed:", event.code);
      switch (event.code) {
        case 'KeyW':
          moveForward.current = true;
          isWalking.current = true;
          break;
        case 'KeyS':
          moveBackward.current = true;
          isWalking.current = true;
          break;
        case 'KeyA':
          moveLeft.current = true;
          isWalking.current = true;
          break;
        case 'KeyD':
          moveRight.current = true;
          isWalking.current = true;
          break;
        case 'Space':
          event.preventDefault(); // Prevent page scroll
          onJump();
          break;
        case 'KeyZ':
          onPunch();
          break;
        case 'KeyX':
          onKick();
          break;
        case 'KeyE':
          onPickup();
          break;
        case 'KeyQ':
          onThrow();
          break;
      }
    };
    
    const onKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'KeyW':
          moveForward.current = false;
          break;
        case 'KeyS':
          moveBackward.current = false;
          break;
        case 'KeyA':
          moveLeft.current = false;
          break;
        case 'KeyD':
          moveRight.current = false;
          break;
      }
      
      if (!moveForward.current && !moveBackward.current && !moveLeft.current && !moveRight.current) {
        isWalking.current = false;
      }
    };
    
    const onMouseMove = (event: MouseEvent) => {
      if (!isPointerLocked.current) return;
      
      mousePosition.current.x = event.movementX || 0;
      mousePosition.current.y = event.movementY || 0;
      
      euler.current.y -= mousePosition.current.x * 0.002;
      
      const playerRotation = new THREE.Euler(0, euler.current.y, 0, 'YXZ');
      playerMesh.quaternion.setFromEuler(playerRotation);
      
      console.log("Mouse moved, player rotation updated");
    };
    
    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };
    
    const onPointerLockChange = () => {
      isPointerLocked.current = document.pointerLockElement === document.querySelector('canvas');
      console.log("Pointer lock state changed:", isPointerLocked.current);
    };
    
    const onPointerLockError = () => {
      console.error("Error with pointer lock");
    };
    
    const onClick = () => {
      const canvas = document.querySelector('canvas');
      if (canvas && !isPointerLocked.current) {
        canvas.requestPointerLock();
        console.log("Pointer lock requested");
      }
    };
    
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('pointerlockerror', onPointerLockError);
    document.addEventListener('click', onClick);
    
    console.log("All control event listeners attached");
    
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('pointerlockerror', onPointerLockError);
      document.removeEventListener('click', onClick);
      
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    };
  }, [camera, onJump, onKick, onPickup, onPunch, onThrow, playerMesh]);

  useEffect(() => {
    console.log("Controls movement effect started");
    
    const updateMovement = () => {
      direction.current.z = Number(moveForward.current) - Number(moveBackward.current);
      direction.current.x = Number(moveRight.current) - Number(moveLeft.current);
      direction.current.normalize();
      
      if (direction.current.z !== 0 || direction.current.x !== 0) {
        const angle = euler.current.y;
        const rotatedX = direction.current.z * Math.sin(angle) + direction.current.x * Math.cos(angle);
        const rotatedZ = direction.current.z * Math.cos(angle) - direction.current.x * Math.sin(angle);
        
        // Optimized speed for more natural movement
        const speed = 15; // Increased from 12
        
        const currentVX = cannonBody.velocity.x;
        const currentVZ = cannonBody.velocity.z;
        const targetVX = rotatedX * speed;
        const targetVZ = rotatedZ * speed;
        
        // More responsive acceleration (0.5 instead of 0.3)
        cannonBody.velocity.x += (targetVX - currentVX) * 0.5;
        cannonBody.velocity.z += (targetVZ - currentVZ) * 0.5;
        
        // Higher minimum velocity to easily overcome floor friction
        const minSpeed = 2.0; // Doubled from 1.0
        if (Math.abs(cannonBody.velocity.x) < minSpeed && direction.current.x !== 0) {
          cannonBody.velocity.x = Math.sign(targetVX) * minSpeed;
        }
        if (Math.abs(cannonBody.velocity.z) < minSpeed && direction.current.z !== 0) {
          cannonBody.velocity.z = Math.sign(targetVZ) * minSpeed;
        }
        
        // Slightly lift the player when moving to prevent floor sticking
        // This is a common trick in game development
        const liftAmount = 0.05;
        if (cannonBody.position.y < 1.2) { // Only if close to the ground
          cannonBody.position.y += liftAmount;
        }
        
        // Animation update
        if (playerMesh.userData && typeof playerMesh.userData.setWalking === 'function') {
          playerMesh.userData.setWalking(true);
          isWalking.current = true;
        }
      } else {
        // Less aggressive deceleration (0.9 instead of 0.8)
        cannonBody.velocity.x *= 0.9;
        cannonBody.velocity.z *= 0.9;
        
        // Complete stop when velocity is very low
        if (Math.abs(cannonBody.velocity.x) < 0.1) cannonBody.velocity.x = 0;
        if (Math.abs(cannonBody.velocity.z) < 0.1) cannonBody.velocity.z = 0;
        
        if (playerMesh.userData && typeof playerMesh.userData.setWalking === 'function') {
          // Only stop the walking animation when nearly stopped
          if (Math.abs(cannonBody.velocity.x) < 0.5 && Math.abs(cannonBody.velocity.z) < 0.5) {
            playerMesh.userData.setWalking(false);
            isWalking.current = false;
          }
        }
      }
      
      const cameraOffset = new THREE.Vector3(0, 3, 8);
      cameraOffset.applyEuler(new THREE.Euler(0, euler.current.y, 0));
      
      const targetPosition = new THREE.Vector3(
        cannonBody.position.x,
        cannonBody.position.y,
        cannonBody.position.z
      );
      
      camera.position.copy(targetPosition).add(cameraOffset);
      
      const lookTarget = new THREE.Vector3(
        cannonBody.position.x,
        cannonBody.position.y + 1.5,
        cannonBody.position.z
      );
      camera.lookAt(lookTarget);
      
      requestAnimationFrame(updateMovement);
    };
    
    const frameId = requestAnimationFrame(updateMovement);
    
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [camera, cannonBody, playerMesh]);
  
  return null;
};

export default Controls;
