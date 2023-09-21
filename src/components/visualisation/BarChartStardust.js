import * as d3 from "d3";
import React, { useEffect, useRef, useState, useCallback } from "react";
import * as Stardust from "stardust-core";
import * as StardustWebGL from "stardust-webgl";

const BarChart = ({ fileUrl }) => {
    const [tooltipState, setTooltipState] = useState({ display: "none" });
    // const canvasRef = useRef(null);
    const svgRef = useRef(null);
    const dataPoints = useRef(null);
    const platform = useRef(null);
    const bars = useRef(null);
    const barsSelected = useRef(null);
    const selectedBar = useRef(null);
    const requested = useRef(null);
    const scaleY = useRef(null);
    const displayWidth = 1280;
    const displayHeight = 720;
    const marginLeft = 35;
    const marginTop = 20;
    const scale = 1;
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
                // * NOTE: when importing Rectangle from P2D, it must be wrapped between {  }
                // x0 is the starting x point of the first bar in the bar chart (leftmost x point)
                // x1 is the final x point of the last bar in the bar chart (rightmost x point)
                // N is the total number of data
                const marks = Stardust.mark.compile(`
                                import { Rectangle } from P2D;

                                mark Bar(
                                    index: float,
                                    height: float,
                                    N: float,
                                    x0: float = -1, x1: float = 1, ratio: float = 0.9,
                                    scale: float = 1,
                                    y0: float = 0,
                                    color: Color = [0, 0, 0, 1]
                                ) {
                                    let step = (x1 - x0) / N;
                                    let c = x0 + index * step + step / 2;
                                    Rectangle(
                                        Vector2(c - step * ratio / 2, y0),
                                        Vector2(c + step * ratio / 2, y0 - height * scale),
                                        color
                                    );
                                }
                            `);
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
                        // +dataPoint.total will convert dataPoint.total to a number
                        return {
                            ...dataPoint,
                            total: +dataPoint.total,
                            index: index,
                        };
                    });
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
                        total: dataPoint.total,
                        color: "rgb(128,128,128)",
                    });
                };

                const hideTooltip = () => {
                    setTooltipState({ display: "none" });
                };

                const drawChart = (data) => {
                    dataPoints.current = data;

                    scaleY.current = Stardust.scale
                        .linear()
                        .domain(d3.extent(dataPoints.current, (d) => d.total))
                        // since we start from 0, the max should be bounded by 2 times the margin
                        .range([0, displayHeight - marginTop * 2]);

                    const svg = d3.select(svgRef.current);

                    const xScale = d3
                        .scalePoint()
                        .domain(dataPoints.current.map((d) => d.date))
                        .range([marginLeft, displayWidth - marginLeft]);
                    const xAxis = d3
                        .axisBottom()
                        // don't display all of them, only display every 25 days
                        .tickFormat((d, i) => (i % 25 === 0 ? d : null))
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
                        .range(
                            scaleY.current
                                .range()
                                // need to be reversed
                                .reduce(
                                    (accumulator, x) => [x].concat(accumulator),
                                    []
                                )
                        );
                    const yAxis = d3.axisLeft().tickSize(0).scale(yScale);
                    const drawnYAxis = svg
                        .append("g")
                        // since scaleY.current.range() starts from 0, translate should start from marginTop
                        .attr(
                            "transform",
                            `translate(${marginLeft}, ${marginTop})`
                        )
                        .call(yAxis);
                    drawnYAxis.select(".domain").attr("stroke", "white");
                    drawnYAxis.selectAll(".tick text").attr("color", "white");
                    drawnYAxis
                        .selectAll(".tick line")
                        .attr("color", "white")
                        .attr("font-size", "30");

                    // draw bar chart
                    bars.current = Stardust.mark.create(
                        marks.Bar,
                        platform.current
                    );
                    barsSelected.current = Stardust.mark.create(
                        marks.Bar,
                        platform.current
                    );

                    bars.current
                        .attr("index", (d, i) => d.index)
                        .attr(
                            "height",
                            scaleY.current((d, i) => d.total)
                        )
                        .attr("x0", marginLeft)
                        .attr("x1", displayWidth - marginLeft)
                        .attr("N", dataPoints.current.length)
                        .attr("ratio", 0.9)
                        .attr("scale", scale)
                        .attr("y0", displayHeight - marginTop)
                        .attr("color", [103 / 255, 212 / 255, 250 / 255, 1]);
                    barsSelected.current
                        .attr("index", (d, i) => d.index)
                        .attr(
                            "height",
                            scaleY.current((d, i) => d.total)
                        )
                        .attr("x0", marginLeft)
                        .attr("x1", displayWidth - marginLeft)
                        .attr("N", dataPoints.current.length)
                        .attr("ratio", 0.9)
                        .attr("scale", scale)
                        .attr("y0", displayHeight - marginTop)
                        .attr("color", [1, 0, 0, 1]);

                    bars.current.data(dataPoints.current);
                    // needed to be called to activate interactivity
                    requestRender();
                };

                const intersectObject = (platform) => (event) => {
                    const x = event.clientX - node.getBoundingClientRect().left;
                    const y = event.clientY - node.getBoundingClientRect().top;
                    const intersect = platform.getPickingPixel(
                        x * platform.pixelRatio,
                        y * platform.pixelRatio
                    );
                    if (intersect) {
                        showTooltip([x, y], dataPoints.current[intersect[1]]);
                        if (
                            selectedBar.current !==
                            dataPoints.current[intersect[1]]
                        ) {
                            selectedBar.current =
                                dataPoints.current[intersect[1]];
                            requestRender();
                        }
                    } else {
                        hideTooltip();
                        if (selectedBar.current !== null) {
                            selectedBar.current = null;
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
                    barsSelected.current.data(
                        selectedBar.current ? [selectedBar.current] : []
                    );

                    platform.current.clear([0, 0, 0, 0]);
                    bars.current
                        .attr("index", (d, i) => i)
                        .attr(
                            "height",
                            scaleY.current((d, i) => d.total)
                        )
                        .attr("x0", marginLeft)
                        .attr("x1", displayWidth - marginLeft)
                        .attr("N", dataPoints.current.length)
                        .attr("ratio", 0.9)
                        .attr("scale", scale)
                        .attr("y0", displayHeight - marginTop)
                        .attr("color", [103 / 255, 212 / 255, 250 / 255, 1]);
                    bars.current.render();

                    barsSelected.current.render();

                    // this should enable the pixel picking
                    platform.current.beginPicking(node.width, node.height);
                    bars.current
                        .attr("index", (d, i) => i)
                        .attr(
                            "height",
                            scaleY.current((d, i) => d.total)
                        )
                        .attr("x0", marginLeft)
                        .attr("x1", displayWidth - marginLeft)
                        .attr("N", dataPoints.current.length)
                        .attr("ratio", 0.9)
                        .attr("scale", scale)
                        .attr("y0", displayHeight - marginTop)
                        .attr("color", [103 / 255, 212 / 255, 250 / 255, 1]);
                    bars.current.render();
                    platform.current.endPicking();
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
                <div style={{ padding: 4, marginBottom: 4 }}>
                    {tooltipState.date}
                </div>
                <div
                    style={{
                        padding: 4,
                        background: tooltipState.color,
                    }}
                >
                    {tooltipState.total}
                </div>
            </div>
        </div>
    );
};

export default BarChart;
