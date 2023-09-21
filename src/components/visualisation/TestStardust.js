import React, { useEffect, useRef, useState } from "react";
import * as Stardust from "stardust-core";
import * as StardustWebGL from "stardust-webgl";

const TestStardust = (props) => {
    const canvasRef = useRef(null);
    const dataPoints = useRef(null);
    const platform = useRef(null);
    const nodes = useRef(null);
    const nodesSelected = useRef(null);
    const selectedNode = useRef(null);
    const requested = useRef(null);
    const [tooltipState, setTooltipState] = useState({ display: "none" });

    const DATAPOINTS_RADIUS = 15;
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
    const colorGroups = [
        [31, 120, 180],
        [178, 223, 138],
        [51, 160, 44],
        [251, 154, 153],
        [227, 26, 28],
        [253, 191, 111],
        [255, 127, 0],
        [106, 61, 154],
        [202, 178, 214],
        [255, 255, 153],
    ].map(
        // for each RGB array, map each value to between 0 and 1 and add an alpha attribute at the 4th index
        // the opacity is set to 0.5
        (rgb) => [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, 0.5]
    );

    useEffect(() => {
        if (props.width && props.height) {
            dataPoints.current = generatePoints(props.width, props.height);

            platform.current = Stardust.platform(
                "webgl-2d",
                canvasRef.current,
                props.width,
                props.height
            );
            platform.current.pixelRatio = window.devicePixelRatio || 1;

            // actual nodes that represents the data
            nodes.current = Stardust.mark.create(
                Stardust.mark.circle(8),
                platform.current
            );
            // represents node that is hovered over by the pointer
            nodesSelected.current = Stardust.mark.create(
                Stardust.mark.circle(8),
                platform.current
            );

            // setting radius and color for normal nodes, background nodes and selected nodes
            nodes.current
                .attr("radius", DATAPOINTS_RADIUS)
                .attr("color", (dataPoint) => colorGroups[dataPoint.group]);
            // when selected, the color should stay the same but the alpha should be 1
            nodesSelected.current
                .attr("radius", DATAPOINTS_RADIUS * 2)
                .attr("color", (dataPoint) => [
                    colorGroups[dataPoint.group][0],
                    colorGroups[dataPoint.group][1],
                    colorGroups[dataPoint.group][2],
                    1,
                ]);

            // set the x and y position of the center of the circle
            const positions = Stardust.array("Vector2")
                .value((d) => d.position)
                .data(dataPoints.current);
            const positionScale = Stardust.scale
                .custom("array(pos, value)")
                .attr("pos", "Vector2Array", positions);
            nodes.current.attr(
                "center",
                positionScale((d) => d.index)
            );
            nodesSelected.current.attr(
                "center",
                positionScale((d) => d.index)
            );

            // load the data points
            nodes.current.data(dataPoints.current);

            // needed to be called to activate interactivity
            requestRender();

            const handleMouseMove = intersectObject(platform.current);
            document.addEventListener("mousemove", handleMouseMove);
            return () => {
                document.removeEventListener("mousemove", handleMouseMove);
            };
        }
    }, [props.width, props.height]);

    const generatePoints = (width, height) => {
        const radius = height / 2 - DATAPOINTS_RADIUS;
        const totalPoints = 1000;

        // Random point in circle code from https://stackoverflow.com/questions/32642399/simplest-way-to-plot-points-randomly-inside-a-circle
        function randomPosition(radius) {
            var ptAngle = Math.random() * 2 * Math.PI;
            var ptRadiusSq = Math.random() * radius * radius;
            var ptX = Math.sqrt(ptRadiusSq) * Math.cos(ptAngle);
            var ptY = Math.sqrt(ptRadiusSq) * Math.sin(ptAngle);
            return [ptX + width / 2, ptY + height / 2];
        }

        const dataPoints = [];
        for (let i = 0; i < totalPoints; i++) {
            const index = i;
            const position = randomPosition(radius);
            const name = "Point " + i;
            const group = Math.floor(Math.random() * 6);
            const point = { index, position, name, group };
            dataPoints.push(point);
        }
        return dataPoints;
    };

    const intersectObject = (platform) => (event) => {
        const x =
            event.clientX - canvasRef.current.getBoundingClientRect().left;
        const y = event.clientY - canvasRef.current.getBoundingClientRect().top;
        const intersect = platform.getPickingPixel(
            x * platform.pixelRatio,
            y * platform.pixelRatio
        );
        if (intersect) {
            showTooltip(
                [event.clientX, event.clientY],
                dataPoints.current[intersect[1]]
            );
            if (selectedNode.current !== dataPoints.current[intersect[1]]) {
                selectedNode.current = dataPoints.current[intersect[1]];
                requestRender();
            }
        } else {
            hideTooltip();
            if (selectedNode.current !== null) {
                selectedNode.current = null;
                requestRender();
            }
        }
    };

    const requestRender = () => {
        if (requested.current) return;
        requested.current = requestAnimationFrame(render);
    };

    const render = () => {
        requested.current = null;
        nodesSelected.current.data(
            selectedNode.current ? [selectedNode.current] : []
        );

        platform.current.clear([0, 0, 0, 0]);
        nodes.current.attr("radius", DATAPOINTS_RADIUS);
        nodes.current.render();

        nodesSelected.current.render();

        // this should enable the pixel picking
        platform.current.beginPicking(
            canvasRef.current.width,
            canvasRef.current.height
        );
        nodes.current.attr("radius", DATAPOINTS_RADIUS);
        nodes.current.render();
        platform.current.endPicking();
    };

    const showTooltip = (mousePosition, dataPoint) => {
        const tooltipWidth = 120;
        const xOffset = -tooltipWidth / 2;
        const yOffset = -tooltipWidth;

        setTooltipState({
            display: "block",
            left: mousePosition[0] + xOffset,
            top: mousePosition[1] + yOffset,
            name: dataPoint.name,
            group: dataPoint.group,
            color: `rgb(${colorGroups[dataPoint.group]
                // since the color was divided by 255 to make it between 0 and 1
                // here, we need to * 255 to get its original value
                // index 3 represents alpha, which should be set to 1
                .map((color, i) => (i !== 3 ? color * 255 : 1))
                .join(",")})`,
        });
    };

    const hideTooltip = () => {
        setTooltipState({ display: "none" });
    };

    return (
        <div style={style}>
            <canvas ref={canvasRef} />
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
                        background: tooltipState.color,
                    }}
                >
                    Group {tooltipState.group}
                </div>
            </div>
        </div>
    );
};

export default TestStardust;
