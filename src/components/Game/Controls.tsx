
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
  
  // Initialize controls
  useEffect(() => {
    console.log("Controls component mounted");
    
    const onKeyDown = (event: KeyboardEvent) => {
      console.log("Key pressed:", event.code);
      switch (event.code) {
        case 'KeyW':
          moveForward.current = true;
          break;
        case 'KeyS':
          moveBackward.current = true;
          break;
        case 'KeyA':
          moveLeft.current = true;
          break;
        case 'KeyD':
          moveRight.current = true;
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
    };
    
    const onMouseMove = (event: MouseEvent) => {
      if (!isPointerLocked.current) return;
      
      mousePosition.current.x = event.movementX || 0;
      mousePosition.current.y = event.movementY || 0;
      
      // Only rotate the camera horizontally (for third-person view)
      euler.current.y -= mousePosition.current.x * 0.002;
      
      // Apply rotation to player mesh to face direction of camera (only Y axis)
      const playerRotation = new THREE.Euler(0, euler.current.y, 0, 'YXZ');
      playerMesh.quaternion.setFromEuler(playerRotation);
      
      console.log("Mouse moved, player rotation updated");
    };
    
    // Prevent context menu on right-click
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
  
  // Update movement and camera position for third-person view
  useEffect(() => {
    console.log("Controls movement effect started");
    
    const updateMovement = () => {
      // Calculate movement direction relative to camera
      direction.current.z = Number(moveForward.current) - Number(moveBackward.current);
      direction.current.x = Number(moveRight.current) - Number(moveLeft.current);
      direction.current.normalize();
      
      // Apply rotation to movement direction
      if (direction.current.z !== 0 || direction.current.x !== 0) {
        const angle = euler.current.y;
        const rotatedX = direction.current.z * Math.sin(angle) + direction.current.x * Math.cos(angle);
        const rotatedZ = direction.current.z * Math.cos(angle) - direction.current.x * Math.sin(angle);
        
        // Apply force based on rotated direction
        const force = 250; // Increased force for better movement
        cannonBody.applyForce(
          new CANNON.Vec3(rotatedX * force, 0, rotatedZ * force),
          cannonBody.position
        );
        
        // Debug movement
        console.log("Moving character. Direction:", { x: rotatedX, z: rotatedZ });
        console.log("Player position:", cannonBody.position);
      }
      
      // Update camera position to follow player (true third-person view)
      // Position camera behind and slightly above player
      const cameraOffset = new THREE.Vector3(0, 3, 8); // Higher and further back
      cameraOffset.applyEuler(new THREE.Euler(0, euler.current.y, 0));
      
      const targetPosition = new THREE.Vector3(
        cannonBody.position.x,
        cannonBody.position.y,
        cannonBody.position.z
      );
      
      camera.position.copy(targetPosition).add(cameraOffset);
      
      // Make camera look at player with a slight vertical offset
      const lookTarget = new THREE.Vector3(
        cannonBody.position.x,
        cannonBody.position.y + 1.5, // Look at upper body/head level
        cannonBody.position.z
      );
      camera.lookAt(lookTarget);
      
      // Request next frame
      requestAnimationFrame(updateMovement);
    };
    
    const frameId = requestAnimationFrame(updateMovement);
    
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [camera, cannonBody]);
  
  return null; // No UI rendering needed
};

export default Controls;
