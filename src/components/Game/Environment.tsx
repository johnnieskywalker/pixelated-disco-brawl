import { useEffect, useRef } from "react";
import * as THREE from "three";
import * as CANNON from "cannon-es";
import {
  createFloor,
  createEnvironmentObject,
  createDiscoBall,
  createPoster,
  createNeonSign,
} from "@/utils/three";
import { createFloorBody, createObjectBody } from "@/utils/physics";

interface EnvironmentProps {
  scene: THREE.Scene;
  physicsWorld: CANNON.World;
}

const Environment = ({ scene, physicsWorld }: EnvironmentProps) => {
  const objects = useRef<
    {
      mesh: THREE.Object3D;
      body: CANNON.Body;
    }[]
  >([]);

  useEffect(() => {
    const floor = createFloor();
    scene.add(floor);

    const floorBody = createFloorBody();
    physicsWorld.addBody(floorBody);

    const createWall = (
      width: number,
      height: number,
      depth: number,
      position: THREE.Vector3,
      rotation: number = 0,
    ) => {
      const wallGeometry = new THREE.BoxGeometry(width, height, depth);

      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext("2d");

      if (context) {
        context.fillStyle = "#222";
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.fillStyle = "#333";
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

      const wallBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(
          new CANNON.Vec3(width / 2, height / 2, depth / 2),
        ),
      });

      wallBody.position.set(position.x, position.y, position.z);
      wallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotation);

      physicsWorld.addBody(wallBody);

      return { mesh: wall, body: wallBody };
    };

    const wallThickness = 1;
    const wallHeight = 10;
    const roomWidth = 30;
    const roomDepth = 30;

    const frontLeftWall = createWall(
      roomWidth / 2 - 3,
      wallHeight,
      wallThickness,
      new THREE.Vector3(-roomWidth / 4 - 1.5, wallHeight / 2, -roomDepth / 2),
    );

    const frontRightWall = createWall(
      roomWidth / 2 - 3,
      wallHeight,
      wallThickness,
      new THREE.Vector3(roomWidth / 4 + 1.5, wallHeight / 2, -roomDepth / 2),
    );

    const backWall = createWall(
      roomWidth,
      wallHeight,
      wallThickness,
      new THREE.Vector3(0, wallHeight / 2, roomDepth / 2),
    );

    const leftWall = createWall(
      roomDepth,
      wallHeight,
      wallThickness,
      new THREE.Vector3(-roomWidth / 2, wallHeight / 2, 0),
      Math.PI / 2,
    );

    const rightWall = createWall(
      roomDepth,
      wallHeight,
      wallThickness,
      new THREE.Vector3(roomWidth / 2, wallHeight / 2, 0),
      Math.PI / 2,
    );

    objects.current.push(
      frontLeftWall,
      frontRightWall,
      backWall,
      leftWall,
      rightWall,
    );

    const discoBall = createDiscoBall(new THREE.Vector3(0, 8, 0));
    scene.add(discoBall);

    const createBarCounter = () => {
      const barGroup = new THREE.Group();
      barGroup.position.set(-10, 0, -10);

      const counterGeometry = new THREE.BoxGeometry(10, 1, 3);
      const counterMaterial = new THREE.MeshPhongMaterial({ color: "#5D4037" });
      const counter = new THREE.Mesh(counterGeometry, counterMaterial);
      counter.position.set(0, 0.5, 0);
      counter.castShadow = true;
      counter.receiveShadow = true;
      barGroup.add(counter);

      const frontGeometry = new THREE.BoxGeometry(10, 1, 0.2);
      const frontMaterial = new THREE.MeshPhongMaterial({ color: "#4E342E" });
      const front = new THREE.Mesh(frontGeometry, frontMaterial);
      front.position.set(0, 0, 1.5);
      front.castShadow = true;
      front.receiveShadow = true;
      barGroup.add(front);

      scene.add(barGroup);

      const barBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(5, 0.5, 1.5)),
      });

      barBody.position.set(-10, 0.5, -10);
      physicsWorld.addBody(barBody);

      return { mesh: barGroup, body: barBody };
    };

    objects.current.push(createBarCounter());

    const furniture = [
      { type: "table", position: new THREE.Vector3(0, 0, 0) },
      { type: "table", position: new THREE.Vector3(5, 0, 5) },
      { type: "table", position: new THREE.Vector3(-5, 0, 5) },

      { type: "chair", position: new THREE.Vector3(1, 0, -1.5) },
      { type: "chair", position: new THREE.Vector3(-1, 0, -1.5) },
      { type: "chair", position: new THREE.Vector3(1, 0, 1.5) },
      { type: "chair", position: new THREE.Vector3(-1, 0, 1.5) },

      { type: "chair", position: new THREE.Vector3(6, 0, 3.5) },
      { type: "chair", position: new THREE.Vector3(4, 0, 3.5) },
      { type: "chair", position: new THREE.Vector3(6, 0, 6.5) },
      { type: "chair", position: new THREE.Vector3(4, 0, 6.5) },

      { type: "chair", position: new THREE.Vector3(-6, 0, 3.5) },
      { type: "chair", position: new THREE.Vector3(-4, 0, 3.5) },
      { type: "chair", position: new THREE.Vector3(-6, 0, 6.5) },
      { type: "chair", position: new THREE.Vector3(-4, 0, 6.5) },
    ];

    const bottles = [
      { position: new THREE.Vector3(0, 1.1, 0) },
      { position: new THREE.Vector3(5, 1.1, 5) },
      { position: new THREE.Vector3(-5, 1.1, 5) },
      { position: new THREE.Vector3(-10, 1.1, -10) },
      { position: new THREE.Vector3(-9, 1.1, -10) },
      { position: new THREE.Vector3(-11, 1.1, -10) },
    ];

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

    const car = {
      type: "car" as const,
      position: new THREE.Vector3(0, 0, -roomDepth / 2 + 6),
    };

    furniture.forEach((item) => {
      const mesh = createEnvironmentObject(
        item.type as "table" | "chair",
        item.position,
      );

      scene.add(mesh);

      // Store a reference to the physics body in the mesh's userData
      mesh.userData = { physicsId: null };

      const body = createObjectBody(
        item.type as "table" | "chair",
        new CANNON.Vec3(item.position.x, item.position.y, item.position.z),
      );

      // Link the mesh to its physics body
      mesh.userData.physicsId = body.id;

      // Create contact material for better interaction with player and NPCs
      const furnitureMaterial = body.material;
      const worldMaterial = new CANNON.Material("worldMaterial");

      if (furnitureMaterial && physicsWorld.defaultMaterial) {
        const contactMaterial = new CANNON.ContactMaterial(
          furnitureMaterial,
          physicsWorld.defaultMaterial,
          {
            friction: 0.2,
            restitution: 0.3,
          },
        );
        physicsWorld.addContactMaterial(contactMaterial);
      }

      physicsWorld.addBody(body);

      objects.current.push({ mesh, body });
    });

    bottles.forEach((item) => {
      const mesh = createEnvironmentObject("bottle", item.position);

      // Store a reference to the physics body in the mesh's userData
      mesh.userData = { physicsId: null };

      scene.add(mesh);

      const body = createObjectBody(
        "bottle",
        new CANNON.Vec3(item.position.x, item.position.y, item.position.z),
      );

      // Link the mesh to its physics body
      mesh.userData.physicsId = body.id;

      physicsWorld.addBody(body);

      objects.current.push({ mesh, body });
    });

    glasses.forEach((item) => {
      const mesh = createEnvironmentObject("glass", item.position);

      // Store a reference to the physics body in the mesh's userData
      mesh.userData = { physicsId: null };

      scene.add(mesh);

      const body = createObjectBody(
        "glass",
        new CANNON.Vec3(item.position.x, item.position.y, item.position.z),
      );

      // Link the mesh to its physics body
      mesh.userData.physicsId = body.id;

      physicsWorld.addBody(body);

      objects.current.push({ mesh, body });
    });

    const carMesh = createEnvironmentObject(car.type, car.position);

    carMesh.rotation.y = Math.PI;

    scene.add(carMesh);

    const carBody = createObjectBody(
      car.type,
      new CANNON.Vec3(car.position.x, car.position.y, car.position.z),
    );

    carBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI);

    physicsWorld.addBody(carBody);

    objects.current.push({ mesh: carMesh, body: carBody });

    const posters = [
      {
        position: new THREE.Vector3(-roomWidth / 2 + 0.1, 3, -5),
        rotation: Math.PI / 2,
      },
      {
        position: new THREE.Vector3(-roomWidth / 2 + 0.1, 3, 5),
        rotation: Math.PI / 2,
      },
      {
        position: new THREE.Vector3(roomWidth / 2 - 0.1, 3, -5),
        rotation: -Math.PI / 2,
      },
      {
        position: new THREE.Vector3(roomWidth / 2 - 0.1, 3, 5),
        rotation: -Math.PI / 2,
      },
      {
        position: new THREE.Vector3(-5, 3, roomDepth / 2 - 0.1),
        rotation: Math.PI,
      },
      {
        position: new THREE.Vector3(5, 3, roomDepth / 2 - 0.1),
        rotation: Math.PI,
      },
    ];

    // Move our special 1999 poster to the left side of the FRONT wall, in front of the Fiat 126p
    const special1999Poster = createPoster(
      // Front wall, left side, at eye level
      new THREE.Vector3(-5, 3, -roomDepth / 2 + 0.2), 
      Math.PI, // Rotate to face into the room from the front wall
      '/1999.jpeg' // Use the path relative to public folder
    );
    // Make the poster 25% larger
    special1999Poster.scale.set(1.25, 1.25, 1.25);
    scene.add(special1999Poster);

    // Add a spotlight to highlight the poster
    const spotLight = new THREE.SpotLight(0xffffff, 1.5);
    spotLight.position.set(0, 6, -roomDepth / 2 + 4);
    spotLight.target = special1999Poster;
    spotLight.angle = Math.PI / 6;
    spotLight.penumbra = 0.2;
    spotLight.decay = 1;
    spotLight.distance = 10;
    spotLight.castShadow = false;
    scene.add(spotLight);

    // Add a debug helper cube to locate the poster position
    const debugBoxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const debugBoxMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    const debugBox = new THREE.Mesh(debugBoxGeometry, debugBoxMaterial);
    debugBox.position.copy(special1999Poster.position);
    scene.add(debugBox);

    // Set a timeout to remove the debug box after 10 seconds
    setTimeout(() => {
      scene.remove(debugBox);
    }, 10000);

    // Add a clearer debug frame to show where the poster should be
    const posterDebugGeometry = new THREE.BoxGeometry(2.1, 3.1, 0.1);
    const posterDebugMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      wireframe: true
    });
    const posterDebugFrame = new THREE.Mesh(posterDebugGeometry, posterDebugMaterial);
    posterDebugFrame.position.copy(special1999Poster.position);
    posterDebugFrame.rotation.copy(special1999Poster.rotation);
    scene.add(posterDebugFrame);

    // Add some text to help locate it
    console.log("POSTER PLACED AT:", special1999Poster.position);

    // Add "Your ad here" poster on the right side of the Fiat 126p
    const adPoster = createPoster(
      // On right wall, at the same z-position as the car (-9)
      new THREE.Vector3(roomWidth / 2 - 0.2, 2, -9),
      -Math.PI / 2 // Rotate to face into the room from the right wall
    );
    scene.add(adPoster);

    // Then add the rest of the posters as before, skipping positions that might overlap
    posters.forEach((poster) => {
      // Skip positions near where we manually placed posters to avoid overlap
      if ((Math.abs(poster.position.x - roomWidth / 2) < 0.5 && Math.abs(poster.position.z - (-9)) < 5) ||
          (Math.abs(poster.position.x + roomWidth / 2) < 0.5 && Math.abs(poster.position.z - (-9)) < 5)) {
        return;
      }
      const posterObj = createPoster(poster.position, poster.rotation);
      scene.add(posterObj);
    });

    const neonSigns = [
      {
        text: "DISCO",
        position: new THREE.Vector3(0, 7, -roomDepth / 2 + 0.1),
        color: 0xff00ff,
      },
      {
        text: "ŻYWIEC",
        position: new THREE.Vector3(-10, 3, -roomDepth / 2 + 0.1),
        color: 0x00ffff,
      },
      {
        text: "DANCE",
        position: new THREE.Vector3(10, 3, -roomDepth / 2 + 0.1),
        color: 0xffff00,
      },
    ];

    neonSigns.forEach((sign) => {
      const neonSign = createNeonSign(sign.text, sign.position, sign.color);
      scene.add(neonSign);
    });

    const updatePhysics = () => {
      objects.current.forEach((object) => {
        object.mesh.position.set(
          object.body.position.x,
          object.body.position.y,
          object.body.position.z,
        );

        object.mesh.quaternion.set(
          object.body.quaternion.x,
          object.body.quaternion.y,
          object.body.quaternion.z,
          object.body.quaternion.w,
        );
      });

      if (discoBall) {
        discoBall.rotation.y += 0.002;
      }

      requestAnimationFrame(updatePhysics);
    };

    const frameId = requestAnimationFrame(updatePhysics);

    return () => {
      cancelAnimationFrame(frameId);

      scene.remove(floor);
      physicsWorld.removeBody(floorBody);

      objects.current.forEach((object) => {
        scene.remove(object.mesh);
        physicsWorld.removeBody(object.body);
      });
    };
  }, [scene, physicsWorld]);

  return null;
};

export default Environment;
