import * as CANNON from 'cannon-es';
import * as THREE from 'three';

// Create a physics world
export const createPhysicsWorld = () => {
  const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0),
  });
  
  // Adjust default material properties
  const defaultMaterial = new CANNON.Material('default');
  const defaultContactMaterial = new CANNON.ContactMaterial(
    defaultMaterial,
    defaultMaterial,
    {
      friction: 0.3,
      restitution: 0.2,
    }
  );
  world.addContactMaterial(defaultContactMaterial);
  world.defaultContactMaterial = defaultContactMaterial;
  
  return world;
};

// Helper to create a physics body for a character
export const createCharacterBody = (position: CANNON.Vec3) => {
  // Raise the body position slightly to prevent floor intersection
  const adjustedPosition = new CANNON.Vec3(position.x, position.y + 0.1, position.z);
  
  const body = new CANNON.Body({
    mass: 80, // 80 kg - typical human weight
    position: adjustedPosition,
    shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.75, 0.3)), // Body dimensions
    material: new CANNON.Material({
      friction: 0.2, // Reduced friction for easier movement
      restitution: 0.3,
    }),
    fixedRotation: true, // Prevent character from rotating
    linearDamping: 0.8, // Reduced damping for smoother movement
  });
  
  // Add jump capability
  let canJump = true;
  
  body.addEventListener('collide', (event) => {
    // Only allow jumping when character is on the ground
    const contact = event.contact;
    
    // If the contact normal is pointing up, we're on the ground
    if (contact.ni.y > 0.5) {
      canJump = true;
    }
  });
  
  // Method to apply jump impulse
  const jump = () => {
    if (canJump) {
      body.velocity.y = 10; // Jump velocity
      canJump = false;
    }
  };
  
  return {
    body,
    jump,
    isJumping: () => !canJump,
  };
};

// Helper to create a physics body for an environmental object
export const createObjectBody = (
  objectType: 'table' | 'chair' | 'bottle' | 'glass' | 'car',
  position: CANNON.Vec3
) => {
  let body: CANNON.Body;
  
  switch (objectType) {
    case 'table':
      body = new CANNON.Body({
        mass: 20, // 20 kg
        position: position,
        material: new CANNON.Material({ friction: 0.5, restitution: 0.3 }),
      });
      
      // Table top
      body.addShape(
        new CANNON.Box(new CANNON.Vec3(1, 0.1, 1)),
        new CANNON.Vec3(0, 1, 0)
      );
      
      // Table legs
      for (let x = -0.8; x <= 0.8; x += 1.6) {
        for (let z = -0.8; z <= 0.8; z += 1.6) {
          body.addShape(
            new CANNON.Box(new CANNON.Vec3(0.1, 0.5, 0.1)),
            new CANNON.Vec3(x, 0.5, z)
          );
        }
      }
      break;
      
    case 'chair':
      body = new CANNON.Body({
        mass: 8, // 8 kg
        position: position,
        material: new CANNON.Material({ friction: 0.5, restitution: 0.3 }),
      });
      
      // Chair seat
      body.addShape(
        new CANNON.Box(new CANNON.Vec3(0.5, 0.075, 0.5)),
        new CANNON.Vec3(0, 0.5, 0)
      );
      
      // Chair back
      body.addShape(
        new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.075)),
        new CANNON.Vec3(0, 1, -0.5)
      );
      
      // Chair legs
      for (let x = -0.4; x <= 0.4; x += 0.8) {
        for (let z = -0.4; z <= 0.4; z += 0.8) {
          body.addShape(
            new CANNON.Box(new CANNON.Vec3(0.05, 0.25, 0.05)),
            new CANNON.Vec3(x, 0.25, z)
          );
        }
      }
      break;
      
    case 'bottle':
      body = new CANNON.Body({
        mass: 0.75, // 750g
        position: position,
        material: new CANNON.Material({ friction: 0.5, restitution: 0.6 }),
      });
      
      // Approximate the bottle with a cylinder and sphere
      body.addShape(
        new CANNON.Cylinder(0.15, 0.15, 0.6, 8),
        new CANNON.Vec3(0, 0, 0)
      );
      body.addShape(
        new CANNON.Sphere(0.15),
        new CANNON.Vec3(0, -0.3, 0)
      );
      break;
      
    case 'glass':
      body = new CANNON.Body({
        mass: 0.3, // 300g
        position: position,
        material: new CANNON.Material({ friction: 0.3, restitution: 0.2 }),
      });
      
      // Glass as a simple cylinder
      body.addShape(new CANNON.Cylinder(0.1, 0.08, 0.25, 8));
      break;
      
    case 'car':
      body = new CANNON.Body({
        mass: 1000, // 1000 kg
        position: position,
        material: new CANNON.Material({ friction: 0.5, restitution: 0.3 }),
      });
      
      // Car body
      body.addShape(
        new CANNON.Box(new CANNON.Vec3(2, 0.6, 1)),
        new CANNON.Vec3(0, 0.6, 0)
      );
      
      // Car top
      body.addShape(
        new CANNON.Box(new CANNON.Vec3(1, 0.5, 1)),
        new CANNON.Vec3(-0.5, 1.7, 0)
      );
      
      // Car wheels (don't add colliders for wheels, just use the body)
      break;
      
    default:
      body = new CANNON.Body({
        mass: 1,
        position: position,
      });
      body.addShape(new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)));
  }
  
  return body;
};

// Helper to create a floor physics body
export const createFloorBody = () => {
  // Ground plane
  const groundBody = new CANNON.Body({
    type: CANNON.Body.STATIC,
    material: new CANNON.Material({ friction: 0.5, restitution: 0.3 }),
  });
  
  const groundShape = new CANNON.Plane();
  groundBody.addShape(groundShape);
  groundBody.quaternion.setFromAxisAngle(
    new CANNON.Vec3(1, 0, 0),
    -Math.PI / 2
  );
  
  return groundBody;
};

// Helper to update a Three.js mesh with Cannon.js physics body
export const updateBodyWithMesh = (
  mesh: THREE.Object3D,
  body: CANNON.Body
) => {
  mesh.position.copy(
    new THREE.Vector3(body.position.x, body.position.y, body.position.z)
  );
  mesh.quaternion.copy(
    new THREE.Quaternion(
      body.quaternion.x,
      body.quaternion.y,
      body.quaternion.z,
      body.quaternion.w
    )
  );
};

// Helper to apply impulse to body in a direction
export const applyImpulse = (
  body: CANNON.Body,
  direction: CANNON.Vec3,
  strength: number = 10
) => {
  const impulse = direction.scale(strength);
  body.applyImpulse(impulse, body.position);
};

// Projectile helper for throwing objects
export const createProjectile = (
  from: CANNON.Vec3,
  direction: CANNON.Vec3,
  shape: CANNON.Shape,
  mass: number = 1
) => {
  const body = new CANNON.Body({
    mass,
    position: from,
    material: new CANNON.Material({ friction: 0.5, restitution: 0.7 }),
  });
  
  body.addShape(shape);
  
  // Apply initial impulse
  const impulse = direction.scale(20 * mass);
  body.applyImpulse(impulse, from);
  
  // Add some spin for realism
  body.angularVelocity.set(
    Math.random() - 0.5,
    Math.random() - 0.5,
    Math.random() - 0.5
  );
  
  return body;
};

// Object pickup system
export const createPickupSystem = (world: CANNON.World) => {
  let heldBody: CANNON.Body | null = null;
  let constraint: CANNON.PointToPointConstraint | null = null;
  
  const pickup = (playerBody: CANNON.Body, targetBody: CANNON.Body) => {
    if (heldBody) return; // Already holding something
    
    heldBody = targetBody;
    
    // Create a constraint to "hold" the object
    const pivotA = new CANNON.Vec3(0, 0, 1); // Point in front of player
    const pivotB = new CANNON.Vec3(0, 0, 0); // Center of target object
    
    constraint = new CANNON.PointToPointConstraint(
      playerBody,
      pivotA,
      targetBody,
      pivotB,
      100 // Max force
    );
    
    world.addConstraint(constraint);
  };
  
  const throw_ = (direction: CANNON.Vec3) => {
    if (!heldBody || !constraint) return;
    
    // Remove constraint
    world.removeConstraint(constraint);
    constraint = null;
    
    // Apply impulse in throw direction
    applyImpulse(heldBody, direction, 20);
    
    heldBody = null;
  };
  
  const drop = () => {
    if (!heldBody || !constraint) return;
    
    // Remove constraint
    world.removeConstraint(constraint);
    constraint = null;
    
    heldBody = null;
  };
  
  return {
    pickup,
    throw: throw_,
    drop,
    getHeldBody: () => heldBody,
  };
};
