import React, { useState, useRef, useEffect } from "react";
import * as d3 from "d3";

export default function ForceDirectedGraph({ fileUrl, annotationEnabled }) {
    const [data, setData] = useState(null);
    const [tooltipState, setTooltipState] = useState({ display: "none" });
    // useRef since this will be handled by d3
    const activeElement = useRef(null);
    const draggedElement = useRef(null);
    const svgRef = useRef();
    const zoom = useRef();
    const dragged = useRef();
    const dragstarted = useRef();
    const dragended = useRef();
    const color = useRef();
    const width = 1280;
    const height = 720;
    const style = {
        position: "absolute",
        marginLeft: "auto",
        marginRight: "auto",
        left: 0,
        right: 0,
        textAlign: "center",
        zIndex: 1,
        // minHeight: "100%",
        width: width,
        height: height,
    };

    // read the file from fileUrl and set the data based on the file content
    useEffect(() => {
        d3.json(fileUrl).then((data) => {
            setData(data);
        });
    }, [fileUrl]);

    useEffect(() => {
        if (svgRef.current && data) {
            d3.selectAll("svg > *").remove();
            // Copyright 2021 Observable, Inc.
            // Released under the ISC license.
            // https://observablehq.com/@d3/force-directed-graph
            const margin = {
                top: 25,
                right: 25,
                bottom: 30,
                left: 30,
            };
            const innerHeight = height - margin.top - margin.bottom;
            const innerWidth = width - margin.left - margin.right;

            const svg = d3
                .select(svgRef.current)
                .attr("viewBox", [
                    -innerWidth / 2,
                    -innerHeight / 2,
                    innerWidth,
                    innerHeight,
                ]);

            let { nodes, links } = data;

            function intern(value) {
                return value !== null && typeof value === "object"
                    ? value.valueOf()
                    : value;
            }

            const N = d3.map(nodes, (d) => d.name).map(intern);
            const LS = d3.map(links, ({ source }) => N[source]).map(intern);
            const LT = d3.map(links, ({ target }) => N[target]).map(intern);
            const T = d3.map(nodes, (d) => `${d.name}\n${d.group}`);
            const G = d3.map(nodes, (d) => d.group).map(intern);
            const W = d3.map(links, (l) => Math.sqrt(l.value));

            // Replace the input nodes and links with mutable objects for the simulation.
            nodes = d3.map(nodes, (_, i) => ({ id: N[i] }));
            links = d3.map(links, (_, i) => ({ source: LS[i], target: LT[i] }));

            const nodeGroups = d3.sort(G);
            color.current = d3.scaleOrdinal(nodeGroups, d3.schemeTableau10);
            // to modify the size of the force directed graph, change strength to large negative number
            // Reference: https://stackoverflow.com/questions/46977022/how-to-adjust-size-of-force-directed-graph-in-d3-js
            const forceNode = d3.forceManyBody().strength(-75);
            const forceLink = d3.forceLink(links).id(({ index: i }) => N[i]);

            dragstarted.current = function (event, d) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            };

            dragged.current = function (event, d) {
                d.fx = event.x;
                d.fy = event.y;
            };

            dragended.current = function (event, d) {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            };

            const link = svg
                .append("g")
                .attr("stroke", "#999")
                .attr("stroke-opacity", 1)
                .attr("stroke-width", 1.5)
                .attr("stroke-linecap", "round")
                .selectAll("line")
                .data(links)
                .join("line");

            const simulation = d3
                .forceSimulation(nodes)
                .force("link", forceLink)
                .force("charge", forceNode)
                .force("center", d3.forceCenter())
                .on("tick", ticked);

            const node = svg
                .append("g")
                .attr("fill", "currentColor")
                .attr("stroke", "#fff")
                .attr("stroke-opacity", 1)
                .attr("stroke-width", 1.5)
                .selectAll("circle")
                .data(nodes)
                .join("circle")
                .attr("r", 5)
                .call(
                    d3
                        .drag()
                        .on("start", dragstarted.current)
                        .on("drag", dragged.current)
                        .on("end", dragended.current)
                );

            function ticked() {
                link.attr("x1", (d) => d.source.x)
                    .attr("y1", (d) => d.source.y)
                    .attr("x2", (d) => d.target.x)
                    .attr("y2", (d) => d.target.y);

                node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
            }

            if (W) link.attr("stroke-width", ({ index: i }) => W[i]);
            if (G) node.attr("fill", ({ index: i }) => color.current(G[i]));
            if (T) node.append("title").text(({ index: i }) => T[i]);

            const zoomed = ({ transform }) => {
                node.attr("transform", transform);
                link.attr("transform", transform);
            };

            zoom.current = d3.zoom().scaleExtent([0.5, 5]).on("zoom", zoomed);

            svg.call(zoom.current);
        }
    }, [data]);

    useEffect(() => {
        if (
            svgRef.current &&
            !annotationEnabled &&
            zoom.current &&
            dragged.current &&
            dragstarted.current &&
            dragended.current
        ) {
            // for adding mousemove interaction
            const showTooltip = (mousePosition, dataPoint) => {
                const tooltipWidth = 120;
                const xOffset = -tooltipWidth / 2;
                const yOffset = -90;

                const index = data.nodes.findIndex(
                    (n) => n.name === dataPoint.id
                );

                const targets = data.links
                    .filter((l) => l.source === index || l.target === index)
                    .map(({ source, target }) =>
                        target === index ? source : target
                    )
                    .map((id) => data.nodes[id].name);

                setTooltipState({
                    display: "block",
                    left: mousePosition[0] + xOffset,
                    top: mousePosition[1] + yOffset,
                    id: dataPoint.id,
                    targets,
                    color: "rgb(128,128,128)",
                });
            };

            const hideTooltip = () => {
                setTooltipState({ display: "none" });
            };

            const handleMouseMove = (event) => {
                d3.select(draggedElement.current).each(function (d) {
                    const rect = this.getBoundingClientRect();
                    // from: https://github.com/d3/d3-selection/blob/main/src/pointer.js
                    const position = {
                        x: d.x + (event.detail.x - rect.left - this.clientLeft),
                        y: d.y + (event.detail.y - rect.top - this.clientTop),
                    };
                    dragended.current.apply(this, [position, d]);
                });
                draggedElement.current = null;
                const elements = document.elementsFromPoint(
                    event.clientX,
                    event.clientY
                );
                // if the element has data, it means that the element is the d3 element
                // since we don't want to consider the links, we want to ignore the elements that have source inside their __data__
                const dataNodes = elements.filter(
                    (element) => element.__data__ && !element.__data__.source
                );

                if (dataNodes.length > 0) {
                    showTooltip(
                        [event.clientX, event.clientY],
                        dataNodes[0].__data__
                    );
                    // if there is an element & the element is different from the previous element,
                    // update the fill of both the previous element and the current element
                    // if the elements are the same, then don't do anything
                    if (activeElement.current !== dataNodes[0]) {
                        // set the previous element's fill to the original color
                        d3.select(activeElement.current).attr("r", 5);
                        // set the new element's fill to the "active" color
                        d3.select(dataNodes[0]).attr("r", 10);
                        activeElement.current = dataNodes[0];
                    }
                } else {
                    hideTooltip();
                    // if there is no elements, then update the fill of previous element & update activeElement to null
                    d3.select(activeElement.current).attr("r", 5);
                    activeElement.current = null;
                }
            };
            // for adding click & drag interaction
            const handleClickDrag = (event) => {
                const elements = document.elementsFromPoint(
                    event.detail.x,
                    event.detail.y
                );
                // if the element has data, it means that the element is the d3 element
                // since we don't want to consider the links, we want to ignore the elements that have source inside their __data__
                const dataNodes = elements.filter(
                    (element) => element.__data__ && !element.__data__.source
                );

                if (dataNodes.length > 0 && !draggedElement.current) {
                    draggedElement.current = dataNodes[0];
                    d3.select(draggedElement.current).each(function (d) {
                        const rect = this.getBoundingClientRect();
                        // from: https://github.com/d3/d3-selection/blob/main/src/pointer.js
                        const position = {
                            x:
                                d.x +
                                (event.detail.x - rect.left - this.clientLeft),
                            y:
                                d.y +
                                (event.detail.y - rect.top - this.clientTop),
                        };
                        dragstarted.current.apply(this, [position, d]);
                    });
                }

                if (draggedElement.current) {
                    d3.select(draggedElement.current).each(function (d) {
                        const rect = this.getBoundingClientRect();
                        // from: https://github.com/d3/d3-selection/blob/main/src/pointer.js
                        const position = {
                            x:
                                d.x +
                                (event.detail.x - rect.left - this.clientLeft),
                            y:
                                d.y +
                                (event.detail.y - rect.top - this.clientTop),
                        };
                        dragged.current.apply(this, [position, d]);
                    });
                }
            };

            // for adding zoom interaction
            const handleZoom = (event) => {
                d3.select(draggedElement.current).each(function (d) {
                    const rect = this.getBoundingClientRect();
                    // from: https://github.com/d3/d3-selection/blob/main/src/pointer.js
                    const position = {
                        x: d.x + (event.detail.x - rect.left - this.clientLeft),
                        y: d.y + (event.detail.y - rect.top - this.clientTop),
                    };
                    dragended.current.apply(this, [position, d]);
                });
                draggedElement.current = null;
                zoom.current.scaleBy(
                    d3.select(svgRef.current),
                    event.detail.scale
                );
            };
            // for adding pan interaction
            const handlePan = (event) => {
                d3.select(draggedElement.current).each(function (d) {
                    const rect = this.getBoundingClientRect();
                    // from: https://github.com/d3/d3-selection/blob/main/src/pointer.js
                    const position = {
                        x: d.x + (event.detail.x - rect.left - this.clientLeft),
                        y: d.y + (event.detail.y - rect.top - this.clientTop),
                    };
                    dragended.current.apply(this, [position, d]);
                });
                draggedElement.current = null;
                zoom.current.translateBy(
                    d3.select(svgRef.current),
                    event.detail.difference.x,
                    event.detail.difference.y
                );
            };

            const handleNoGesture = () => {
                d3.select(draggedElement.current).each(function (d) {
                    dragended.current.apply(this, [{}, d]);
                });
                draggedElement.current = null;
            };

            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("zoom", handleZoom);
            document.addEventListener("pan", handlePan);
            document.addEventListener("clickdrag", handleClickDrag);
            document.addEventListener("nogesture", handleNoGesture);
            return () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("zoom", handleZoom);
                document.removeEventListener("pan", handlePan);
                document.removeEventListener("clickdrag", handleClickDrag);
                document.removeEventListener("nogesture", handleNoGesture);
            };
        }
    }, [data, annotationEnabled]);

    return (
        <div>
            <svg width={width} height={height} style={style} ref={svgRef} />
            <div
                style={{
                    display: tooltipState.display,
                    position: "absolute",
                    pointerEvents: "none",
                    left: tooltipState.left,
                    top: tooltipState.top,
                    fontSize: 15,
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
                    {tooltipState.id}
                </div>

                <div
                    style={{
                        padding: 4,
                        background: tooltipState.color,
                    }}
                >
                    {tooltipState.targets?.map((t, i) => (
                        <div key={i}>{t}</div>
                    ))}
                </div>
            </div>
        </div>
    );
}
