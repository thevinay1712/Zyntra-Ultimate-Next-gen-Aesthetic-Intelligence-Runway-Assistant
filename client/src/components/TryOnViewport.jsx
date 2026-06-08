import React, { useRef, Suspense, useMemo } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import * as THREE from 'three';

const RealisticMannequin = ({ scaleMatrix, skinTone, showGarment }) => {
  const obj = useLoader(OBJLoader, '/assets/smpl_base_template.obj');
  const groupRef = useRef();

  // Create a customized material with the extracted skin tone
  const skinMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({ 
      color: skinTone,
      roughness: 0.4,
      metalness: 0.1
    });
  }, [skinTone]);

  // Calculate bounding box to create clipping planes for the garment
  const clipPlanes = useMemo(() => {
    if (!obj) return [];
    const box = new THREE.Box3().setFromObject(obj);
    const height = box.max.y - box.min.y;
    const width = box.max.x - box.min.x;

    // Clip the head (top 15%)
    const neckY = box.max.y - height * 0.12;
    const topClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), neckY);

    // Clip the feet/lower legs (bottom 15%)
    const ankleY = box.min.y + height * 0.15;
    const bottomClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), -ankleY);

    // Clip the hands (outer 15% on each side)
    const rightWristX = box.max.x - width * 0.15;
    const rightClip = new THREE.Plane(new THREE.Vector3(-1, 0, 0), rightWristX);
    
    const leftWristX = box.min.x + width * 0.15;
    const leftClip = new THREE.Plane(new THREE.Vector3(1, 0, 0), -leftWristX);

    return [topClip, bottomClip, leftClip, rightClip];
  }, [obj]);

  // Create a garment material for demonstration
  const garmentMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({ 
      color: '#8a2be2', // Zyntra purple
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
      // Use polygonOffset to fix Z-fighting
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      // Slice off head, hands, and feet so it looks like a T-shirt and shorts!
      clippingPlanes: clipPlanes,
      clipShadows: true
    });
  }, [clipPlanes]);

  // Apply the skin material to the seamless base body
  const clonedObj = useMemo(() => {
    const clone = obj.clone();
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = skinMaterial;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [obj, skinMaterial]);

  // Generate a mock "Virtual Garment" by duplicating the torso mesh.
  // In a production system, this would be a separate T-Shirt .obj file.
  const garmentObj = useMemo(() => {
    const clone = obj.clone();
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = garmentMaterial;
        // Removed child.scale.set(1.02...) which caused the arms to misalign and clip
      }
    });
    return clone;
  }, [obj, garmentMaterial]);

  return (
    <group ref={groupRef} scale={[scaleMatrix.x, scaleMatrix.y, scaleMatrix.z]}>
      {/* The Naked Base Body */}
      <primitive object={clonedObj} position={[0, 0, 0]} />
      
      {/* The Garment Layer! */}
      {showGarment && <primitive object={garmentObj} position={[0, 0, 0]} />}
    </group>
  );
};

const TryOnViewport = ({ scaleMatrix = { x: 1, y: 1, z: 1 }, skinTone = "#f1c27d", showGarment = false }) => {
  return (
    <div className="w-full h-[500px] bg-neutral-900 rounded-xl overflow-hidden shadow-2xl border border-neutral-800 relative">
      <Canvas shadows camera={{ position: [0, 1, 3.5], fov: 50 }} gl={{ localClippingEnabled: true }}>
        <Suspense fallback={
          <mesh><boxGeometry/><meshBasicMaterial color="red"/></mesh>
        }>
          <Stage environment="city" intensity={0.6}>
            <RealisticMannequin scaleMatrix={scaleMatrix} skinTone={skinTone} showGarment={showGarment} />
          </Stage>
        </Suspense>
        <OrbitControls makeDefault autoRotate autoRotateSpeed={2} enablePan={false} />
      </Canvas>
    </div>
  );
};

export default TryOnViewport;
