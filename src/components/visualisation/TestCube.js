/**
 * reference: https://codesandbox.io/s/three-raycaster-4rhxx?file=/src/App.js:0-1775
 */
import React, { useRef, useEffect } from "react";
import * as THREE from "three";

const coords = new THREE.Vector2(-1, -1);

const TestCube = () => {
    const canvasContainer = useRef();

    const style = {
        position: "absolute",
        marginLeft: "auto",
        marginRight: "auto",
        left: 0,
        right: 0,
        textAlign: "center",
        zIndex: 1,
        minHeight: "100%",
    };

    useEffect(() => {
        createCube();

        const handleMouseMove = (event) => {
            event.preventDefault();
            coords.x = (event.clientX / window.innerWidth) * 2 - 1;
            coords.y = -(event.clientY / window.innerHeight) * 2 + 1;
        };

        document.addEventListener("mousemove", handleMouseMove);
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
        };
    }, []);

    const createCube = () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

        const renderer = new THREE.WebGLRenderer({ alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        canvasContainer.current.appendChild(renderer.domElement);

        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            opacity: 0.5,
        });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);

        const raycaster = new THREE.Raycaster();

        camera.position.z = 5;

        const animate = function () {
            requestAnimationFrame(animate);

            cube.rotation.x += 0.01;
            cube.rotation.y += 0.01;

            // raycasting
            raycaster.setFromCamera(coords, camera);
            const intersects = raycaster.intersectObject(cube);

            if (intersects.length > 0) {
                cube.material.color.set(0xff0000);
            } else {
                cube.material.color.set(0x00ff00);
            }

            renderer.render(scene, camera);
        };

        animate();
    };

    return <div style={style} className="container" ref={canvasContainer} />;
};

export default TestCube;
