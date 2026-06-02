'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function GameScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(400, 400);
    mountRef.current.appendChild(renderer.domElement);

    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    camera.position.z = 5;

    const handleInteraction = () => {
      cube.material.color.set(Math.random() * 0xffffff);
    };

    const animate = () => {
      requestAnimationFrame(animate);
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      renderer.render(scene, camera);
    };
    animate();

    mountRef.current.addEventListener('click', handleInteraction);

    return () => {
      mountRef.current?.removeEventListener('click', handleInteraction);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="mx-auto cursor-pointer" title="לחץ על הקובייה" />;
}