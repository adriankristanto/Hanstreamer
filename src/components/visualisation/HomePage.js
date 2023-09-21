/**
 * Reference: https://stackoverflow.com/questions/60107431/d3-tree-with-collapsing-boxes-using-d3-version-4
 */
import React, { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import { VISUALISATIONS } from "./types";

export default function HomePage({ files, jumpTo, annotationEnabled }) {
    const [data, setData] = useState(null);
    const svgRef = useRef();
    const selectedNodeIndex = useRef();
    const selectedNode = useRef();
    const timer = useRef();
    const multiplier = useRef(1);
    const width = 1280;
    const height = 720;
    const rectHeight = 100;
    const rectWidth = 180;

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

    useEffect(() => {
        const treeData = {
            name: "Blank Page",
            type: "",
            fill: "orange",
            index: 0, // blank page is located at index 0
            visualisationType: 0,
            children: files.map((file, index) => {
                const key = Object.keys(VISUALISATIONS).filter(
                    (visualisationType) =>
                        VISUALISATIONS[visualisationType].ID ===
                        file.visualisationType
                )[0];
                return {
                    name: file.name,
                    type: VISUALISATIONS[key].NAME,
                    fill: "lightsteelblue",
                    index: index + 1,
                    visualisationType: file.visualisationType,
                };
            }),
        };
        setData(treeData);
    }, [files]);

    useEffect(() => {
        if (svgRef.current && data && data.children.length > 0) {
            d3.selectAll("svg > *").remove();
            const margin = {
                top: 25,
                right: 25,
                bottom: 30,
                left: 30,
            };
            const innerHeight = height - margin.top - margin.bottom;
            const innerWidth = width - margin.left - margin.right;

            const svg = d3.select(svgRef.current);

            svg.append("defs")
                .append("SVG:clipPath")
                .attr("id", "clip")
                .append("SVG:rect")
                .attr("width", width)
                .attr("height", height)
                .attr("x", 0)
                .attr("y", 0);

            const g = svg
                .append("g")
                .attr("clip-path", "url(#clip)")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            const treeMap = d3.tree().size([innerHeight, innerWidth]);

            const root = d3.hierarchy(data, (d) => d.children);
            // since we want horizontal tree, x & y need to be flipped
            root.x0 = innerHeight / 2;
            root.y0 = 0;

            update(root);

            function update(source) {
                // Assigns the x and y position for the nodes
                const treeData = treeMap(root);

                // Compute the new tree layout.
                const nodes = treeData.descendants();
                const links = treeData.descendants().slice(1);

                const depths = [900, 300, 600];

                // Normalize for fixed-depth.
                nodes.forEach(function (d) {
                    d.y = d.depth * depths[d.data.index % 3];
                });

                // ****************** Nodes section ***************************

                // Update the nodes...
                const node = g.selectAll("g.node").data(nodes);

                // Enter any new modes at the parent's previous position.
                const nodeEnter = node
                    .enter()
                    .append("g")
                    .attr("class", "node")
                    .attr("id", (d) => `${d.data.index}`)
                    .attr("transform", function (d) {
                        return "translate(" + source.y0 + "," + source.x0 + ")";
                    });

                nodeEnter
                    .append("rect")
                    .attr("class", "nodeRect")
                    .attr("width", rectWidth)
                    .attr("height", rectHeight)
                    .attr("x", 0)
                    .attr("y", (rectHeight / 2) * -1)
                    .attr("rx", "5")
                    .style("fill", function (d) {
                        return d.data.fill;
                    });

                // Add labels for the nodes
                nodeEnter
                    .append("text")
                    .attr("dy", "-.35em")
                    .attr("x", function (d) {
                        return 13;
                    })
                    .attr("text-anchor", function (d) {
                        return "start";
                    })
                    .text(function (d) {
                        return d.data.name;
                    })
                    .append("tspan")
                    .attr("dy", "1.75em")
                    .attr("x", function (d) {
                        return 13;
                    })
                    .text(function (d) {
                        return d.data.type;
                    });

                // UPDATE
                const nodeUpdate = nodeEnter.merge(node);

                // Transition to the proper position for the node
                nodeUpdate
                    .transition()
                    .duration(750)
                    .attr("transform", function (d) {
                        return "translate(" + d.y + "," + d.x + ")";
                    });

                // Update the node attributes and style
                nodeUpdate
                    .select("circle.node")
                    .attr("r", 10)
                    .style("fill", function (d) {
                        return d._children ? "lightsteelblue" : "#fff";
                    })
                    .attr("cursor", "pointer");

                // Remove any exiting nodes
                const nodeExit = node
                    .exit()
                    .transition()
                    .duration(750)
                    .attr("transform", function (d) {
                        return "translate(" + source.y + "," + source.x + ")";
                    })
                    .remove();

                // On exit reduce the node circles size to 0
                nodeExit.select("circle").attr("r", 1e-6);

                // On exit reduce the opacity of text labels
                nodeExit.select("text").style("fill-opacity", 1e-6);

                // ****************** links section ***************************

                // Update the links...
                const link = g.selectAll("path.link").data(links);

                // Enter any new links at the parent's previous position.
                const linkEnter = link
                    .enter()
                    .insert("path", "g")
                    .attr("class", "link")
                    .attr("d", function (d) {
                        const o = { x: source.x0, y: source.y0 };
                        return diagonal(o, o);
                    })
                    .style("fill", "none")
                    .attr("stroke", "black");

                // UPDATE
                const linkUpdate = linkEnter.merge(link);

                // Transition back to the parent element position
                linkUpdate
                    .transition()
                    .duration(750)
                    .attr("d", function (d) {
                        return diagonal(d, d.parent);
                    })
                    .style("fill", "none")
                    .attr("stroke", "black");

                // Remove any exiting links
                link.exit()
                    .transition()
                    .duration(750)
                    .attr("d", function (d) {
                        const o = { x: source.x, y: source.y };
                        return diagonal(o, o);
                    })
                    .remove();

                // Store the old positions for transition.
                nodes.forEach(function (d) {
                    d.x0 = d.x;
                    d.y0 = d.y;
                });

                // Creates a curved (diagonal) path from parent to the child nodes
                function diagonal(s, d) {
                    const path = `M ${s.y} ${s.x}
                             C ${(s.y + d.y) / 2} ${s.x},
                               ${(s.y + d.y) / 2} ${d.x},
                               ${d.y} ${d.x}`;

                    return path;
                }
            }
        }
    }, [data]);

    useEffect(() => {
        if (!annotationEnabled) {
            const handleMouseMove = (event) => {
                const elements = document.elementsFromPoint(
                    event.clientX,
                    event.clientY
                );
                const dataNodes = elements.filter(
                    (element) => element.__data__
                );

                if (dataNodes.length > 0) {
                    // we only care about the rect element
                    const selectedIndex = dataNodes.findIndex(
                        (e) => d3.select(e).attr("class") === "nodeRect"
                    );

                    // if the user moves from one node to another, reset the timer
                    if (
                        selectedNodeIndex.current !==
                        dataNodes[0].__data__.data.index
                    ) {
                        timer.current = +new Date();
                        selectedNodeIndex.current =
                            dataNodes[0].__data__.data.index;
                        multiplier.current = 1;
                        selectedNode.current &&
                            selectedNode.current
                                .attr("width", rectWidth * multiplier.current)
                                .attr("height", rectHeight * multiplier.current)
                                .style("fill", function (d) {
                                    return d.data.fill;
                                });
                        // for the first selection, selectedNode.current will be undefined
                        selectedNode.current = d3.select(
                            dataNodes[selectedIndex]
                        );
                        return;
                    }

                    multiplier.current += 0.01;
                    selectedNode.current &&
                        selectedNode.current
                            .attr("width", rectWidth * multiplier.current)
                            .attr("height", rectHeight * multiplier.current)
                            .style("fill", "yellow");

                    const now = +new Date();
                    // if a few second passed & the selected node is still the same, then jump to that vis
                    if (
                        now - timer.current > 1500 &&
                        selectedNodeIndex.current ===
                            dataNodes[0].__data__.data.index
                    ) {
                        jumpTo(selectedNodeIndex.current);
                        return;
                    }
                } else {
                    timer.current = null;
                    selectedNodeIndex.current = null;
                    multiplier.current = 1;
                    selectedNode.current &&
                        selectedNode.current
                            .attr("width", rectWidth * multiplier.current)
                            .attr("height", rectHeight * multiplier.current)
                            .style("fill", function (d) {
                                return d.data.fill;
                            });
                    selectedNode.current = null;
                }
            };

            document.addEventListener("mousemove", handleMouseMove);
            return () => {
                document.removeEventListener("mousemove", handleMouseMove);
            };
        }
    }, [annotationEnabled, jumpTo, data]);

    return (
        <div>
            <svg width={width} height={height} style={style} ref={svgRef} />
        </div>
    );
}
