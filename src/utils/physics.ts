
import * as CANNON from 'cannon-es';

// Create physics world
export const createPhysicsWorld = () => {
  const world = new CANNON.World();
  world.gravity.set(0, -9.82, 0); // Earth gravity
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 10; // Fixed with correct type access
  world.allowSleep = true;
  
  return world;
};

// Create floor physics body
export const createFloorBody = () => {
  const floorBody = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Plane()
  });
  floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  
  return floorBody;
};

// Create object physics bodies
export const createObjectBody = (
  type: 'table' | 'chair' | 'bottle' | 'glass' | 'car',
  position: CANNON.Vec3
) => {
  let body: CANNON.Body;
  
  switch (type) {
    case 'table': {
      body = new CANNON.Body({
        mass: 0, // Static body
        position: position,
        shape: new CANNON.Box(new CANNON.Vec3(1, 0.5, 1))
      });
      break;
    }
    
    case 'chair': {
      body = new CANNON.Body({
        mass: 0, // Static body
        position: position,
        shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5))
      });
      break;
    }
    
    case 'bottle': {
      body = new CANNON.Body({
        mass: 1,
        position: position,
        shape: new CANNON.Cylinder(0.1, 0.15, 0.8, 8)
      });
      break;
    }
    
    case 'glass': {
      body = new CANNON.Body({
        mass: 0.5,
        position: position,
        shape: new CANNON.Cylinder(0.1, 0.08, 0.25, 8)
      });
      break;
    }
    
    case 'car': {
      // Create a slightly larger physics body for the Maluch car model
      body = new CANNON.Body({
        mass: 0, // Static body
        position: position,
        shape: new CANNON.Box(new CANNON.Vec3(2, 1, 1)) // Adjusted size to better match the model
      });
      break;
    }
    
    default: {
      body = new CANNON.Body({
        mass: 1,
        position: position,
        shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5))
      });
    }
  }
  
  return body;
};

// Create character physics body
export const createCharacterBody = (position: CANNON.Vec3) => {
  const body = new CANNON.Body({
    mass: 5,
    position: position,
    shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.9, 0.3)),
    material: new CANNON.Material({
      friction: 0.5,
      restitution: 0.3
    }),
    linearDamping: 0.9,
    angularDamping: 0.9,
    fixedRotation: true // Character doesn't rotate
  });
  
  // Add foot sphere for better movement
  const footShape = new CANNON.Sphere(0.25);
  body.addShape(footShape, new CANNON.Vec3(0, -0.9, 0));
  
  // Create and return a controller object with the body and helper methods
  return {
    body,
    isJumping: () => {
      // Check if character is on the ground
      return body.velocity.y > 0.1;
    },
    jump: () => {
      // Apply jump impulse
      body.velocity.y = 8;
    }
  };
};
