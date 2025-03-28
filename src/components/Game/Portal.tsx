import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface PortalProps {
  scene: THREE.Scene;
  position?: THREE.Vector3;
  playerPosition: THREE.Vector3;
}

const Portal = ({ scene, position = new THREE.Vector3(0, 1.5, -20), playerPosition }: PortalProps) => {
  // Use refs to track portal objects and state
  const portalRef = useRef<THREE.Group | null>(null);
  const boxRef = useRef<THREE.Box3 | null>(null);
  const lastCheckRef = useRef<number>(0);
  const redirectingRef = useRef<boolean>(false);
  
  // Create and add portal to scene
  useEffect(() => {
    console.log("Creating Vibeverse Portal");
    
    // Create portal group
    const portalGroup = new THREE.Group();
    portalGroup.position.copy(position);
    
    // Create portal ring (larger size for better visibility)
    const portalRingGeometry = new THREE.TorusGeometry(3.5, 0.4, 16, 32);
    const portalRingMaterial = new THREE.MeshPhongMaterial({
      color: 0x00ff8f,
      emissive: 0x00ff8f,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.9
    });
    const portalRing = new THREE.Mesh(portalRingGeometry, portalRingMaterial);
    portalGroup.add(portalRing);
    
    // Create portal inner surface
    const portalInnerGeometry = new THREE.CircleGeometry(3.1, 32);
    const portalInnerMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff8f,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const portalInner = new THREE.Mesh(portalInnerGeometry, portalInnerMaterial);
    portalGroup.add(portalInner);
    
    // Create portal label
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;
    
    if (context) {
      context.fillStyle = 'rgba(0, 0, 0, 0.7)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#00ff8f';
      context.font = 'bold 48px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('VIBEVERSE PORTAL', canvas.width/2, canvas.height/2);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    const labelGeometry = new THREE.PlaneGeometry(6, 1);
    const labelMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.position.y = 5;
    portalGroup.add(label);
    
    // Create floating arrow
    const arrowGeometry = new THREE.ConeGeometry(0.8, 1.6, 8);
    const arrowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow.position.y = 7;
    arrow.rotation.x = Math.PI; // Point downward
    portalGroup.add(arrow);
    
    // Create particle system
    const particleCount = 800;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 3.5 + (Math.random() - 0.5) * 1;
      
      positions[i] = Math.cos(angle) * radius;
      positions[i + 1] = Math.sin(angle) * radius;
      positions[i + 2] = (Math.random() - 0.5) * 1;
      
      // Cyan-green color
      colors[i] = 0;
      colors[i + 1] = 0.8 + Math.random() * 0.2;
      colors[i + 2] = 0.5 + Math.random() * 0.5;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.7
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    portalGroup.add(particles);
    
    // Add to scene
    scene.add(portalGroup);
    portalRef.current = portalGroup;
    
    // Create collision box - make it MUCH larger than visual portal for easier entry
    boxRef.current = new THREE.Box3().setFromObject(portalInner);
    boxRef.current.expandByScalar(3); // Increased from 1 to 3 for easier collision detection
    
    console.log("Portal created at position:", position);
    
    // Add animation loop
    const animate = () => {
      if (!portalRef.current) return;
      
      // Animate particles
      const particlePositions = particles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particlePositions.length; i += 3) {
        particlePositions[i + 2] = Math.sin(Date.now() * 0.002 + i) * 0.3;
      }
      particles.geometry.attributes.position.needsUpdate = true;
      
      // Rotate portal gently
      portalGroup.rotation.y += 0.005;
      
      // Animate arrow
      arrow.position.y = 7 + Math.sin(Date.now() * 0.003) * 0.3;
      
      // Update collision box
      if (boxRef.current) {
        boxRef.current.setFromObject(portalInner);
        boxRef.current.expandByScalar(1);
      }
      
      requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
    
    return () => {
      scene.remove(portalGroup);
    };
  }, [scene, position]);
  
  // Check player collision with portal
  useEffect(() => {
    const checkCollision = () => {
      if (!boxRef.current || !playerPosition || redirectingRef.current) return;
      
      // Only check every 100ms to avoid excessive calculations
      const now = Date.now();
      if (now - lastCheckRef.current < 100) return;
      lastCheckRef.current = now;
      
      // Create player box - much larger to ensure collision works reliably
      const playerBox = new THREE.Box3(
        new THREE.Vector3(
          playerPosition.x - 1.5, 
          playerPosition.y - 2, 
          playerPosition.z - 1.5
        ),
        new THREE.Vector3(
          playerPosition.x + 1.5, 
          playerPosition.y + 2, 
          playerPosition.z + 1.5
        )
      );

      // Check for collision by distance as a backup method
      const portalCenter = new THREE.Vector3(
        position.x,
        position.y,
        position.z
      );
      const distanceToCenter = playerPosition.distanceTo(portalCenter);

      // Debug - log player position when close to portal
      const distance = playerPosition.distanceTo(position);
      if (distance < 10) {
        console.log("Player near portal, distance:", distance, "Player position:", playerPosition);
      }
      
      // Check for collision
      if (distanceToCenter < 4) {
        console.log("PLAYER ENTERED PORTAL! Redirecting to portal.pieter.com");
        
        // Set flag to prevent multiple redirects


        redirectingRef.current = true;
        
        // Create portal effect before redirect
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = '#00ff8f';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.5s';
        overlay.style.zIndex = '9999';
        document.body.appendChild(overlay);
        
        // Flash effect and redirect
        setTimeout(() => {
          overlay.style.opacity = '0.8';
          setTimeout(() => {
            window.location.href = 'https://portal.pieter.com/';
          }, 500);
        }, 100);
      }
    };
    
    // Run collision check on each animation frame
    const frameId = requestAnimationFrame(function checkLoop() {
      checkCollision();
      if (!redirectingRef.current) {
        requestAnimationFrame(checkLoop);
      }
    });
    
    return () => cancelAnimationFrame(frameId);
  }, [playerPosition, position]);
  
  return null;
};

export default Portal;