import * as d3 from "d3";
import React, { useEffect, useRef, useState, useCallback } from "react";
import * as Stardust from "stardust-core";
import * as StardustWebGL from "stardust-webgl";

const MultiLineSeriesChart = ({ fileUrl }) => {
    const [tooltipState, setTooltipState] = useState({ display: "none" });
    // const canvasRef = useRef(null);
    const svgRef = useRef(null);
    const dataPoints = useRef(null);
    const nodePoints = useRef(null);
    const platform = useRef(null);
    const nodes = useRef(null);
    const nodesSelected = useRef(null);
    const selectedNode = useRef(null);
    const requested = useRef(null);
    const scaleY = useRef(null);
    const polylines = useRef(null);
    const displayWidth = 1280;
    const displayHeight = 720;
    const marginLeft = 35;
    const marginTop = 20;
    const DATAPOINTS_RADIUS = 10;
    const style = {
        position: "absolute",
        marginLeft: "auto",
        marginRight: "auto",
        left: 0,
        right: 0,
        textAlign: "center",
        zIndex: 1,
        // minHeight: "100%",
        width: displayWidth,
        height: displayHeight,
    };
    const colorsOriginal = [
        // [0xfc, 0x8d, 0x62],
        // [0x8d, 0xa0, 0xcb],
        // [0xe7, 0x8a, 0xc3],
        [0xa6, 0xd8, 0x54],
        [0xff, 0x00, 0x00],
    ];
    const colors = colorsOriginal.map((x) => [
        x[0] / 255,
        x[1] / 255,
        x[2] / 255,
        1,
    ]);

    // to fix memory leak with the event listener
    const handleMouseMove = useRef(null);
    useEffect(() => {
        if (handleMouseMove.current) {
            document.addEventListener("mousemove", handleMouseMove.current);
            return () => {
                document.removeEventListener(
                    "mousemove",
                    handleMouseMove.current
                );
            };
        }
    }, [handleMouseMove]);

    const canvasRef = useCallback(
        (node) => {
            if (node) {
                // prepare the platform for drawing
                platform.current = Stardust.platform(
                    "webgl-2d",
                    node,
                    displayWidth,
                    displayHeight
                );
                platform.current.pixelRatio = window.devicePixelRatio || 1;

                const fetchData = async (file) => {
                    return await d3.csv(file, (dataPoint, index) => {
                        // simple date parsing since we need to change date to time
                        const [day, month] = dataPoint.date.split("-");
                        const months = {
                            Jan: 0,
                            Feb: 1,
                            Mar: 2,
                            Apr: 3,
                            May: 4,
                            Jun: 5,
                            Jul: 6,
                            Aug: 7,
                            Sep: 8,
                            Oct: 9,
                            Nov: 10,
                            Dec: 11,
                        };

                        return {
                            ...dataPoint,
                            time: new Date(
                                "2021",
                                months[month],
                                day
                            ).getTime(),
                            avg: +dataPoint.avg,
                            target: +dataPoint.target,
                            index: index,
                        };
                    });
                };

                const drawChart = (data) => {
                    dataPoints.current = data;
                    nodePoints.current = dataPoints.current.reduce(
                        (previousValue, currentValue) => {
                            return [
                                {
                                    date: currentValue.date,
                                    time: currentValue.time,
                                    value: currentValue.avg,
                                },
                                {
                                    date: currentValue.date,
                                    time: currentValue.time,
                                    value: currentValue.target,
                                },
                            ].concat(previousValue);
                        },
                        []
                    );

                    const names = ["14 Days Average", "Target"];
                    const polyline = Stardust.mark.polyline();
                    polylines.current = Stardust.mark.create(
                        polyline,
                        platform.current
                    );

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
                    nodes.current
                        .attr("radius", DATAPOINTS_RADIUS)
                        .attr("color", [0, 0, 0, 0]);
                    // when selected, the color should stay the same but the alpha should be 1
                    nodesSelected.current
                        .attr("radius", DATAPOINTS_RADIUS * 2)
                        .attr("color", [1, 1, 1, 1]);

                    const xScale = d3
                        .scaleTime()
                        // don't do +d.time * 1000 like in the stardust example as our time format is already correct
                        .domain([
                            d3.min(dataPoints.current, (d) => +d.time),
                            d3.max(dataPoints.current, (d) => +d.time),
                        ])
                        .range([marginLeft, displayWidth - marginLeft]);
                    scaleY.current = Stardust.scale
                        .linear()
                        .domain([
                            Math.floor(
                                d3.min(dataPoints.current, (d) => +d.avg)
                            ),
                            Math.ceil(
                                d3.max(dataPoints.current, (d) => +d.avg)
                            ),
                        ])
                        .range([displayHeight - marginTop, marginTop]);

                    const svg = d3.select(svgRef.current);
                    const legendItems = svg
                        .append("g")
                        .selectAll("g")
                        .data(names)
                        .enter()
                        .append("g");
                    legendItems.attr(
                        "transform",
                        (d, i) =>
                            `translate(${marginLeft + 20}, ${
                                marginTop + 20 * i + 10
                            })`
                    );
                    legendItems
                        .append("line")
                        .attr("x1", 0)
                        .attr("x2", 15)
                        .attr("y1", 0)
                        .attr("y2", 0)
                        .style(
                            "stroke",
                            (d, i) => `rgb(${colorsOriginal[i].join(",")})`
                        );
                    legendItems
                        .append("text")
                        .attr("x", 20)
                        .attr("y", 5)
                        .text((d) => d)
                        .style(
                            "fill",
                            (d, i) => `rgb(${colorsOriginal[i].join(",")})`
                        );

                    // draw x axis
                    const xAxis = d3
                        .axisBottom()
                        // don't display all of them, only display every 25 days
                        .tickFormat((d) => {
                            return d3.timeFormat("%b %d")(d);
                        })
                        .tickSize(0)
                        .scale(xScale);
                    const drawnXAxis = svg
                        .append("g")
                        .attr(
                            "transform",
                            `translate(0, ${displayHeight - marginTop})`
                        ) // x should be 0 since xAxis starts from marginLeft
                        .call(xAxis);
                    drawnXAxis.select(".domain").attr("stroke", "white");
                    drawnXAxis.selectAll(".tick text").attr("color", "white");
                    drawnXAxis
                        .selectAll(".tick line")
                        .attr("color", "white")
                        .attr("font-size", "30");

                    // draw y axis
                    const yScale = d3
                        .scaleLinear()
                        .domain(scaleY.current.domain())
                        .range(scaleY.current.range());
                    const yAxis = d3.axisLeft().tickSize(0).scale(yScale);
                    const drawnYAxis = svg
                        .append("g")
                        // since scaleY.current.range() starts from 0, translate should start from marginTop
                        .attr("transform", `translate(${marginLeft}, 0)`)
                        .call(yAxis);
                    drawnYAxis.select(".domain").attr("stroke", "white");
                    drawnYAxis.selectAll(".tick text").attr("color", "white");
                    drawnYAxis
                        .selectAll(".tick line")
                        .attr("color", "white")
                        .attr("font-size", "30");

                    polylines.current
                        .attr(
                            "p",
                            Stardust.scale.Vector2(
                                (d) => xScale(d.time),
                                scaleY.current((d) => d.value)
                            )
                        )
                        .attr("width", 5)
                        .attr("color", [0, 0, 0, 1]);

                    polylines.current.instance(
                        (d, i) => {
                            return d === "Target"
                                ? dataPoints.current.map((d) => {
                                      return { time: d.time, value: d.target };
                                  })
                                : dataPoints.current.map((d) => {
                                      return { time: d.time, value: d.avg };
                                  });
                        },
                        (d, i) => {
                            return { color: colors[i] };
                        }
                    );

                    nodes.current.attr(
                        "center",
                        Stardust.scale.Vector2(
                            (d) => xScale(d.time),
                            scaleY.current((d) => d.value)
                        )
                    );
                    nodesSelected.current.attr(
                        "center",
                        Stardust.scale.Vector2(
                            (d) => xScale(d.time),
                            scaleY.current((d) => d.value)
                        )
                    );

                    // load the data points
                    nodes.current.data(nodePoints.current);

                    polylines.current.data(names);

                    requestRender();

                    // nodes.current.render();
                    // polylines.render();
                };

                const showTooltip = (mousePosition, dataPoint) => {
                    const tooltipWidth = 120;
                    const xOffset = -tooltipWidth / 2;
                    const yOffset = -tooltipWidth;

                    setTooltipState({
                        display: "block",
                        left: mousePosition[0] + xOffset,
                        top: mousePosition[1] + yOffset,
                        date: dataPoint.date,
                        value: dataPoint.value,
                        color: "rgb(128,128,128)",
                    });
                };

                const hideTooltip = () => {
                    setTooltipState({ display: "none" });
                };

                const intersectObject = (platform) => (event) => {
                    const x = event.clientX - node.getBoundingClientRect().left;
                    const y = event.clientY - node.getBoundingClientRect().top;
                    const intersect = platform.getPickingPixel(
                        x * platform.pixelRatio,
                        y * platform.pixelRatio
                    );
                    if (intersect) {
                        showTooltip([x, y], nodePoints.current[intersect[1]]);
                        if (
                            selectedNode.current !==
                            nodePoints.current[intersect[1]]
                        ) {
                            selectedNode.current =
                                nodePoints.current[intersect[1]];
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
                    polylines.current.render();

                    // this should enable the pixel picking
                    platform.current.beginPicking(node.width, node.height);
                    nodes.current.attr("radius", DATAPOINTS_RADIUS);
                    nodes.current.render();
                    platform.current.endPicking();
                    // nodes.current.render();
                    // polylines.render();
                };

                fetchData(fileUrl)
                    .then((data) => drawChart(data))
                    .catch((error) => console.log(error));

                handleMouseMove.current = intersectObject(platform.current);
            }
        },
        [fileUrl]
    );

    return (
        <div style={style}>
            <canvas
                ref={canvasRef}
                style={style}
                width={displayWidth}
                height={displayHeight}
            />
            <svg
                ref={svgRef}
                width={displayWidth}
                height={displayHeight}
                style={style}
            />
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
                <div
                    style={{
                        padding: 4,
                        background: tooltipState.color,
                    }}
                >
                    {tooltipState.date}
                </div>
                <div
                    style={{
                        padding: 4,
                        background: tooltipState.color,
                    }}
                >
                    {tooltipState.value}
                </div>
            </div>
        </div>
    );
};

export default MultiLineSeriesChart;
