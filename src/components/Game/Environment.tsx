import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { 
  createFloor, 
  createEnvironmentObject, 
  createDiscoBall,
  createPoster,
  createNeonSign
} from '@/utils/three';
import { 
  createFloorBody, 
  createObjectBody 
} from '@/utils/physics';

interface EnvironmentProps {
  scene: THREE.Scene;
  physicsWorld: CANNON.World;
}

const Environment = ({ scene, physicsWorld }: EnvironmentProps) => {
  // Keep track of all objects for cleanup
  const objects = useRef<{ 
    mesh: THREE.Object3D; 
    body: CANNON.Body;
  }[]>([]);
  
  // Initialize environment
  useEffect(() => {
    // Create floor
    const floor = createFloor();
    scene.add(floor);
    
    const floorBody = createFloorBody();
    physicsWorld.addBody(floorBody);
    
    // Create walls (just visual)
    const createWall = (width: number, height: number, depth: number, position: THREE.Vector3, rotation: number = 0) => {
      const wallGeometry = new THREE.BoxGeometry(width, height, depth);
      
      // Create a canvas for wall texture
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext('2d');
      
      if (context) {
        // Wall base color
        context.fillStyle = '#222';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Wall pattern
        context.fillStyle = '#333';
        const brickWidth = 64;
        const brickHeight = 32;
        
        for (let y = 0; y < canvas.height; y += brickHeight) {
          const offset = (Math.floor(y / brickHeight) % 2) * (brickWidth / 2);
          
          for (let x = 0; x < canvas.width; x += brickWidth) {
            context.fillRect(x + offset, y, brickWidth - 2, brickHeight - 2);
          }
        }
      }
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(width / 5, height / 5);
      
      const wallMaterial = new THREE.MeshPhongMaterial({ map: texture });
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);
      
      wall.position.copy(position);
      wall.rotation.y = rotation;
      wall.castShadow = true;
      wall.receiveShadow = true;
      
      scene.add(wall);
      
      // Add wall body
      const wallBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2)),
      });
      
      wallBody.position.set(position.x, position.y, position.z);
      wallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotation);
      
      physicsWorld.addBody(wallBody);
      
      return { mesh: wall, body: wallBody };
    };
    
    // Create room walls
    const wallThickness = 1;
    const wallHeight = 10;
    const roomWidth = 30;
    const roomDepth = 30;
    
    // Front wall (with gap for entrance)
    const frontLeftWall = createWall(
      roomWidth / 2 - 3, wallHeight, wallThickness, 
      new THREE.Vector3(-roomWidth / 4 - 1.5, wallHeight / 2, -roomDepth / 2)
    );
    
    const frontRightWall = createWall(
      roomWidth / 2 - 3, wallHeight, wallThickness, 
      new THREE.Vector3(roomWidth / 4 + 1.5, wallHeight / 2, -roomDepth / 2)
    );
    
    // Back wall
    const backWall = createWall(
      roomWidth, wallHeight, wallThickness, 
      new THREE.Vector3(0, wallHeight / 2, roomDepth / 2)
    );
    
    // Left wall
    const leftWall = createWall(
      roomDepth, wallHeight, wallThickness, 
      new THREE.Vector3(-roomWidth / 2, wallHeight / 2, 0),
      Math.PI / 2
    );
    
    // Right wall
    const rightWall = createWall(
      roomDepth, wallHeight, wallThickness, 
      new THREE.Vector3(roomWidth / 2, wallHeight / 2, 0),
      Math.PI / 2
    );
    
    objects.current.push(frontLeftWall, frontRightWall, backWall, leftWall, rightWall);
    
    // Create disco ball
    const discoBall = createDiscoBall(new THREE.Vector3(0, 8, 0));
    scene.add(discoBall);
    
    // Create bar counter
    const createBarCounter = () => {
      const barGroup = new THREE.Group();
      barGroup.position.set(-10, 0, -10);
      
      // Bar counter
      const counterGeometry = new THREE.BoxGeometry(10, 1, 3);
      const counterMaterial = new THREE.MeshPhongMaterial({ color: '#5D4037' });
      const counter = new THREE.Mesh(counterGeometry, counterMaterial);
      counter.position.set(0, 0.5, 0);
      counter.castShadow = true;
      counter.receiveShadow = true;
      barGroup.add(counter);
      
      // Bar front
      const frontGeometry = new THREE.BoxGeometry(10, 1, 0.2);
      const frontMaterial = new THREE.MeshPhongMaterial({ color: '#4E342E' });
      const front = new THREE.Mesh(frontGeometry, frontMaterial);
      front.position.set(0, 0, 1.5);
      front.castShadow = true;
      front.receiveShadow = true;
      barGroup.add(front);
      
      scene.add(barGroup);
      
      // Add physics
      const barBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(5, 0.5, 1.5)),
      });
      
      barBody.position.set(-10, 0.5, -10);
      physicsWorld.addBody(barBody);
      
      return { mesh: barGroup, body: barBody };
    };
    
    objects.current.push(createBarCounter());
    
    // Create tables and chairs
    const furniture = [
      // Center tables
      { type: 'table', position: new THREE.Vector3(0, 0, 0) },
      { type: 'table', position: new THREE.Vector3(5, 0, 5) },
      { type: 'table', position: new THREE.Vector3(-5, 0, 5) },
      
      // Chairs around center table
      { type: 'chair', position: new THREE.Vector3(1, 0, -1.5) },
      { type: 'chair', position: new THREE.Vector3(-1, 0, -1.5) },
      { type: 'chair', position: new THREE.Vector3(1, 0, 1.5) },
      { type: 'chair', position: new THREE.Vector3(-1, 0, 1.5) },
      
      // Chairs around second table
      { type: 'chair', position: new THREE.Vector3(6, 0, 3.5) },
      { type: 'chair', position: new THREE.Vector3(4, 0, 3.5) },
      { type: 'chair', position: new THREE.Vector3(6, 0, 6.5) },
      { type: 'chair', position: new THREE.Vector3(4, 0, 6.5) },
      
      // Chairs around third table
      { type: 'chair', position: new THREE.Vector3(-6, 0, 3.5) },
      { type: 'chair', position: new THREE.Vector3(-4, 0, 3.5) },
      { type: 'chair', position: new THREE.Vector3(-6, 0, 6.5) },
      { type: 'chair', position: new THREE.Vector3(-4, 0, 6.5) },
    ];
    
    // Create bottles on tables
    const bottles = [
      { position: new THREE.Vector3(0, 1.1, 0) },
      { position: new THREE.Vector3(5, 1.1, 5) },
      { position: new THREE.Vector3(-5, 1.1, 5) },
      { position: new THREE.Vector3(-10, 1.1, -10) },
      { position: new THREE.Vector3(-9, 1.1, -10) },
      { position: new THREE.Vector3(-11, 1.1, -10) },
    ];
    
    // Create glasses on tables
    const glasses = [
      { position: new THREE.Vector3(0.5, 1.1, 0.5) },
      { position: new THREE.Vector3(-0.5, 1.1, 0.5) },
      { position: new THREE.Vector3(5.5, 1.1, 4.5) },
      { position: new THREE.Vector3(4.5, 1.1, 4.5) },
      { position: new THREE.Vector3(-5.5, 1.1, 4.5) },
      { position: new THREE.Vector3(-4.5, 1.1, 4.5) },
      { position: new THREE.Vector3(-9.5, 1.1, -9.5) },
      { position: new THREE.Vector3(-10.5, 1.1, -9.5) },
    ];
    
    // Add the Fiat 126p inside bar
    const car = {
      type: 'car' as const,
      position: new THREE.Vector3(10, 0, 10)
    };
    
    // Create all furniture
    furniture.forEach((item) => {
      const mesh = createEnvironmentObject(
        item.type as 'table' | 'chair',
        item.position
      );
      
      scene.add(mesh);
      
      const body = createObjectBody(
        item.type as 'table' | 'chair',
        new CANNON.Vec3(item.position.x, item.position.y, item.position.z)
      );
      
      physicsWorld.addBody(body);
      
      objects.current.push({ mesh, body });
    });
    
    // Create all bottles
    bottles.forEach((item) => {
      const mesh = createEnvironmentObject(
        'bottle',
        item.position
      );
      
      scene.add(mesh);
      
      const body = createObjectBody(
        'bottle',
        new CANNON.Vec3(item.position.x, item.position.y, item.position.z)
      );
      
      physicsWorld.addBody(body);
      
      objects.current.push({ mesh, body });
    });
    
    // Create all glasses
    glasses.forEach((item) => {
      const mesh = createEnvironmentObject(
        'glass',
        item.position
      );
      
      scene.add(mesh);
      
      const body = createObjectBody(
        'glass',
        new CANNON.Vec3(item.position.x, item.position.y, item.position.z)
      );
      
      physicsWorld.addBody(body);
      
      objects.current.push({ mesh, body });
    });
    
    // Add car
    const carMesh = createEnvironmentObject(
      car.type,
      car.position
    );
    
    scene.add(carMesh);
    
    const carBody = createObjectBody(
      car.type,
      new CANNON.Vec3(car.position.x, car.position.y, car.position.z)
    );
    
    physicsWorld.addBody(carBody);
    
    objects.current.push({ mesh: carMesh, body: carBody });
    
    // Add posters
    const posters = [
      { position: new THREE.Vector3(-roomWidth / 2 + 0.1, 3, -5), rotation: Math.PI / 2 },
      { position: new THREE.Vector3(-roomWidth / 2 + 0.1, 3, 5), rotation: Math.PI / 2 },
      { position: new THREE.Vector3(roomWidth / 2 - 0.1, 3, -5), rotation: -Math.PI / 2 },
      { position: new THREE.Vector3(roomWidth / 2 - 0.1, 3, 5), rotation: -Math.PI / 2 },
      { position: new THREE.Vector3(-5, 3, roomDepth / 2 - 0.1), rotation: Math.PI },
      { position: new THREE.Vector3(5, 3, roomDepth / 2 - 0.1), rotation: Math.PI },
    ];
    
    posters.forEach((poster) => {
      const posterObj = createPoster(poster.position, poster.rotation);
      scene.add(posterObj);
    });
    
    // Add neon signs
    const neonSigns = [
      { text: "DISCO", position: new THREE.Vector3(0, 7, -roomDepth / 2 + 0.1), color: 0xff00ff },
      { text: "ŻYWIEC", position: new THREE.Vector3(-10, 3, -roomDepth / 2 + 0.1), color: 0x00ffff },
      { text: "DANCE", position: new THREE.Vector3(10, 3, -roomDepth / 2 + 0.1), color: 0xffff00 },
    ];
    
    neonSigns.forEach((sign) => {
      const neonSign = createNeonSign(sign.text, sign.position, sign.color);
      scene.add(neonSign);
    });
    
    // Update physics and sync with meshes
    const updatePhysics = () => {
      // Update physics objects
      objects.current.forEach((object) => {
        object.mesh.position.set(
          object.body.position.x,
          object.body.position.y,
          object.body.position.z
        );
        
        object.mesh.quaternion.set(
          object.body.quaternion.x,
          object.body.quaternion.y,
          object.body.quaternion.z,
          object.body.quaternion.w
        );
      });
      
      // Rotate disco ball
      if (discoBall) {
        discoBall.rotation.y += 0.002;
      }
      
      requestAnimationFrame(updatePhysics);
    };
    
    const frameId = requestAnimationFrame(updatePhysics);
    
    return () => {
      // Clean up
      cancelAnimationFrame(frameId);
      
      // Remove floor
      scene.remove(floor);
      physicsWorld.removeBody(floorBody);
      
      // Remove objects
      objects.current.forEach((object) => {
        scene.remove(object.mesh);
        physicsWorld.removeBody(object.body);
      });
    };
  }, [scene, physicsWorld]);
  
  return null; // Component doesn't render anything
};

export default Environment;
