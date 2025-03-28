import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface PortalProps {
  scene: THREE.Scene;
  position?: THREE.Vector3;
  playerPosition: THREE.Vector3;
}

const Portal = ({ scene, position = new THREE.Vector3(20, 1, -5), playerPosition }: PortalProps) => {
  const portalGroupRef = useRef<THREE.Group | null>(null);
  const portalBoxRef = useRef<THREE.Box3 | null>(null);
  const checkingCollisionRef = useRef(false);
  
  useEffect(() => {
    // Create portal group
    const portalGroup = new THREE.Group();
    portalGroup.position.copy(position);
    
    // Create portal ring
    const portalRingGeometry = new THREE.TorusGeometry(2.5, 0.3, 16, 32);
    const portalRingMaterial = new THREE.MeshPhongMaterial({
      color: 0x00ff8f,
      emissive: 0x00ff8f,
      transparent: true,
      opacity: 0.8
    });
    const portalRing = new THREE.Mesh(portalRingGeometry, portalRingMaterial);
    portalGroup.add(portalRing);
    
    // Create a floating arrow above the portal
    const arrowGeometry = new THREE.ConeGeometry(0.5, 1, 8);
    const arrowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow.position.y = 5;
    arrow.rotation.x = Math.PI; // Point downward
    portalGroup.add(arrow);

    // Animate the arrow
    const animateArrow = () => {
      arrow.position.y = 5 + Math.sin(Date.now() * 0.003) * 0.3;
      requestAnimationFrame(animateArrow);
    };
    requestAnimationFrame(animateArrow);
    
    // Create portal inner surface
    const portalInnerGeometry = new THREE.CircleGeometry(2.2, 32);
    const portalInnerMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff8f,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const portalInner = new THREE.Mesh(portalInnerGeometry, portalInnerMaterial);
    portalGroup.add(portalInner);
    
    // Create portal sign
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 64;
    
    if (context) {
      context.fillStyle = 'rgba(0, 0, 0, 0.7)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#00ff8f';
      context.font = 'bold 32px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('PORTAL TO VIBEVERSE', canvas.width/2, canvas.height/2);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    const signGeometry = new THREE.PlaneGeometry(4, 0.5);
    const signMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.y = 3.5;
    portalGroup.add(sign);
    
    // Create particles
    const particleCount = 500;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.5 + (Math.random() - 0.5) * 0.6;
      
      positions[i] = Math.cos(angle) * radius;
      positions[i + 1] = Math.sin(angle) * radius;
      positions[i + 2] = (Math.random() - 0.5) * 0.5;
      
      colors[i] = 0;
      colors[i + 1] = 0.8 + Math.random() * 0.2;
      colors[i + 2] = 0.7 + Math.random() * 0.3;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.7
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    portalGroup.add(particles);
    
    // Add portal to scene
    scene.add(portalGroup);
    portalGroupRef.current = portalGroup;
    
    // Create collision box
    portalBoxRef.current = new THREE.Box3().setFromObject(portalInner);
    
    // Animation function for particles and portal
    const animate = () => {
      if (!portalGroupRef.current) return;
      
      // Animate particles
      const particlePositions = particles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particlePositions.length; i += 3) {
        particlePositions[i + 2] = Math.sin(Date.now() * 0.002 + i) * 0.2;
      }
      particles.geometry.attributes.position.needsUpdate = true;
      
      // Rotate portal gently
      portalGroup.rotation.y += 0.005;
      
      // Update collision box
      if (portalBoxRef.current) {
        portalBoxRef.current.setFromObject(portalInner);
      }
      
      requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
    
    return () => {
      scene.remove(portalGroup);
    };
  }, [scene, position]);
  
  // Check for player-portal collision
  useEffect(() => {
    if (!portalBoxRef.current || checkingCollisionRef.current) return;
    
    const checkCollision = () => {
      if (!portalBoxRef.current || !playerPosition) return;
      
      // Create player bounding box
      const playerBox = new THREE.Box3(
        new THREE.Vector3(
          playerPosition.x - 0.5,
          playerPosition.y - 1,
          playerPosition.z - 0.5
        ),
        new THREE.Vector3(
          playerPosition.x + 0.5,
          playerPosition.y + 1,
          playerPosition.z + 0.5
        )
      );
      
      // Check if player entered portal
      if (playerBox.intersectsBox(portalBoxRef.current)) {
        if (!checkingCollisionRef.current) {
          checkingCollisionRef.current = true;
          console.log("Player entered portal! Redirecting to Vibeverse...");
          
          // Simple redirect to portal.pieter.com
          window.location.href = "https://portal.pieter.com/";
        }
      }
    };
    
    const intervalId = setInterval(checkCollision, 100);
    return () => clearInterval(intervalId);
  }, [playerPosition]);
  
  return null;
};

export default Portal;