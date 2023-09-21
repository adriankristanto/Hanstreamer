/**
 * reference: https://observablehq.com/d/2900a4ea3d18f665
 */
import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import * as _ from "lodash";

const coords = new THREE.Vector3(-1, -1, 1);
const mousePosition = [0, 0];
const hoverContainer = new THREE.Object3D();
const circleSprite = new THREE.TextureLoader().load(
    "https://blog.fastforwardlabs.com/images/2018/02/circle-1518727951930.png"
);
const tooltip_state = { display: "none" };

const TestGraph = () => {
    const canvasContainer = useRef();
    const [tooltipState, setTooltipState] = useState(tooltip_state);
    const colorGroups = [
        "#1f78b4",
        "#b2df8a",
        "#33a02c",
        "#fb9a99",
        "#e31a1c",
        "#fdbf6f",
        "#ff7f00",
        "#6a3d9a",
        "#cab2d6",
        "#ffff99",
    ];

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
        createGraph();

        const handleMouseMove = (event) => {
            event.preventDefault();
            mousePosition[0] = event.clientX;
            mousePosition[1] = event.clientY;
            coords.x = (event.clientX / window.innerWidth) * 2 - 1;
            coords.y = -(event.clientY / window.innerHeight) * 2 + 1;
            coords.z = 1;
        };

        document.addEventListener("mousemove", handleMouseMove);
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
        };
    }, []);

    const generatePoints = () => {
        const radius = 25;
        const totalPoints = 1000;

        // Random point in circle code from https://stackoverflow.com/questions/32642399/simplest-way-to-plot-points-randomly-inside-a-circle
        function randomPosition(radius) {
            var ptAngle = Math.random() * 2 * Math.PI;
            var ptRadiusSq = Math.random() * radius * radius;
            var ptX = Math.sqrt(ptRadiusSq) * Math.cos(ptAngle);
            var ptY = Math.sqrt(ptRadiusSq) * Math.sin(ptAngle);
            return [ptX, ptY];
        }

        const dataPoints = [];
        for (let i = 0; i < totalPoints; i++) {
            const position = randomPosition(radius);
            const name = "Point " + i;
            const group = Math.floor(Math.random() * 6);
            const point = { position, name, group };
            dataPoints.push(point);
        }
        return dataPoints;
    };

    function sortIntersectsByDistanceToRay(intersects) {
        return _.sortBy(intersects, "distanceToRay");
    }
    function removeHighlights() {
        hoverContainer.remove(...hoverContainer.children);
    }

    function highlightPoint(datum) {
        removeHighlights();
        const pointsGeometry = new THREE.BufferGeometry();

        const color = new THREE.Color();

        const colors = [];
        const vertices = [];
        // Set vector coordinates from data
        vertices.push(datum.position[0], datum.position[1], 0);
        color.set(colorGroups[datum.group]);
        colors.push(color.r, color.g, color.b);
        pointsGeometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(vertices, 3)
        );
        pointsGeometry.setAttribute(
            "color",
            new THREE.Float32BufferAttribute(colors, 3)
        );

        let material = new THREE.PointsMaterial({
            size: 50,
            sizeAttenuation: false,
            vertexColors: true,
            map: circleSprite,
            transparent: true,
        });

        let point = new THREE.Points(pointsGeometry, material);
        hoverContainer.add(point);
    }

    function showTooltip(mouse_position, datum) {
        let tooltip_width = 120;
        let x_offset = -tooltip_width / 2;
        let y_offset = -tooltip_width;

        setTooltipState({
            display: "block",
            left: mouse_position[0] + x_offset,
            top: mouse_position[1] + y_offset,
            name: datum.name,
            group: datum.group,
        });
    }

    function hideTooltip() {
        setTooltipState({ display: "none" });
    }

    const createGraph = () => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        const generatedPoints = generatePoints();

        const renderer = new THREE.WebGLRenderer({ alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        canvasContainer.current.appendChild(renderer.domElement);

        const pointsGeometry = new THREE.BufferGeometry();

        const color = new THREE.Color();

        const colors = [];
        const vertices = [];
        for (let datum of generatedPoints) {
            // Set vector coordinates from data
            vertices.push(datum.position[0], datum.position[1], 0);
            color.set(colorGroups[datum.group]);
            colors.push(color.r, color.g, color.b);
        }
        pointsGeometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(vertices, 3)
        );
        pointsGeometry.setAttribute(
            "color",
            new THREE.Float32BufferAttribute(colors, 3)
        );

        const pointsMaterial = new THREE.PointsMaterial({
            size: 20,
            sizeAttenuation: false,
            vertexColors: true,
            map: circleSprite,
            transparent: true,
            opacity: 0.5,
        });

        const points = new THREE.Points(pointsGeometry, pointsMaterial);
        scene.add(points);
        scene.add(hoverContainer);

        const raycaster = new THREE.Raycaster();

        camera.position.z = 35;

        const animate = function () {
            requestAnimationFrame(animate);

            // raycasting
            raycaster.setFromCamera(coords, camera);
            const intersects = raycaster.intersectObject(points);

            if (intersects[0]) {
                let sorted_intersects =
                    sortIntersectsByDistanceToRay(intersects);
                let intersect = sorted_intersects[0];
                let index = intersect.index;
                let datum = generatedPoints[index];
                highlightPoint(datum);
                showTooltip(mousePosition, datum);
            } else {
                removeHighlights();
                hideTooltip();
            }

            renderer.render(scene, camera);
        };

        animate();
    };

    return (
        <>
            <div style={style} className="container" ref={canvasContainer} />
            <div
                style={{
                    display: tooltipState.display,
                    position: "absolute",
                    pointerEvents: "none",
                    left: tooltipState.left,
                    top: tooltipState.top,
                    fontSize: 13,
                    width: 120,
                    textAlign: "center",
                    lineHeight: 1,
                    padding: 6,
                    background: "white",
                    fontFamily: "sans-serif",
                    zIndex: 1,
                    backgroundColor: "darkgrey",
                    color: "white",
                }}
            >
                <div style={{ padding: 4, marginBottom: 4 }}>
                    {tooltipState.name}
                </div>
                <div
                    style={{
                        padding: 4,
                        background: colorGroups[tooltipState.group],
                    }}
                >
                    Group {tooltipState.group}
                </div>
                <div
                    style={{
                        padding: 4,
                        background: colorGroups[tooltipState.group],
                    }}
                >
                    {tooltipState.left} {tooltipState.top}
                </div>
            </div>
        </>
    );
};

export default TestGraph;
