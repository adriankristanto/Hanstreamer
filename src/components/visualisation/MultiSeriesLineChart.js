import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";

export default function MultiSeriesLineChartD3({ fileUrl, annotationEnabled }) {
    const [data, setData] = useState(null);
    const [tooltipState, setTooltipState] = useState({ display: "none" });
    // useRef since this will be handled by d3
    const activeElement = useRef(null);
    const svgRef = useRef();
    const [zoomState, setZoomState] = useState();
    const zoom = useRef();
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
        const parseDate = d3.timeParse("%d-%b-%Y");

        // row function to modify data points, e.g. convert data point to int
        const row = (d) => {
            return {
                date: parseDate(`${d.date}-2020`),
                avg: +d.avg,
                target: +d.target,
            };
        };

        d3.csv(fileUrl, row).then((data) => {
            setData(data);
        });
    }, [fileUrl]);

    // draw chart
    useEffect(() => {
        if (svgRef.current && data) {
            d3.selectAll("svg > *").remove();
            const nested = [
                {
                    key: "avg",
                    value: data.map((d) => {
                        return { date: d.date, total: d.avg };
                    }),
                },
                {
                    key: "target",
                    value: data.map((d) => {
                        return { date: d.date, total: d.target };
                    }),
                },
            ];
            const margin = {
                top: 25,
                right: 25,
                bottom: 30,
                left: 30,
            };
            const innerHeight = height - margin.top - margin.bottom;
            const innerWidth = width - margin.left - margin.right;

            const xScale = d3
                .scaleTime()
                .domain(d3.extent(data, (d) => +d.date))
                .range([0, innerWidth]);

            const yScale = d3
                .scaleLinear()
                .domain(d3.extent(data, (d) => d.avg))
                .range([innerHeight, 0])
                .nice();

            if (zoomState) {
                // reference: https://observablehq.com/@d3/zoomable-bar-chart
                xScale.range([0, innerWidth].map((d) => zoomState.applyX(d)));
                const newYScale = zoomState.rescaleY(yScale);
                yScale.domain(newYScale.domain());
            }

            const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

            const svg = d3.select(svgRef.current);

            // for clipping the chart, for the 4 margins
            svg.append("defs")
                .append("SVG:clipPath")
                .attr("id", "clip")
                .append("SVG:rect")
                .attr("width", innerWidth)
                .attr("height", innerHeight)
                .attr("x", 0)
                .attr("y", 0);

            // for clipping x-axis, spcifically for margin left & right
            svg.append("defs")
                .append("SVG:clipPath")
                .attr("id", "xaxisclip")
                .append("SVG:rect")
                .attr("width", innerWidth)
                .attr("height", innerHeight + margin.bottom)
                .attr("x", 0)
                .attr("y", 0);

            const g = svg
                .append("g")
                .attr("clip-path", "url(#clip)")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            // x-axis
            svg.append("g")
                .attr("clip-path", "url(#xaxisclip)")
                .attr(
                    "transform",
                    `translate(${margin.left},${margin.top + innerHeight})`
                )
                .call(
                    d3
                        .axisBottom(xScale)
                        // don't display all of them, only display every 25 days
                        .tickFormat((d) => d3.timeFormat("%d-%b")(d))
                        .tickSize(0)
                        .scale(xScale)
                )
                .selectAll("text")
                .attr("transform", "translate(-10,0)rotate(-45)")
                .style("text-anchor", "end");

            // y-axis
            svg.append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`)
                .call(d3.axisLeft(yScale).tickSize(0));

            // multi series line chart
            const lines = g
                .selectAll(".line")
                .data(nested)
                .enter()
                .append("path")

                .attr("stroke", (d) => colorScale(d.key))
                .attr("fill", "none")
                .attr("stroke-width", 5);

            // data points
            const points = g
                .selectAll(".point")
                .data(data)
                .enter()
                .append("circle")
                .attr("fill", "yellow")
                .attr("r", zoomState?.k * 5 || 5)
                .attr("cx", (d) => xScale(d.date))

                .style("stroke", "black")
                .style("stroke-width", 2);

            if (!zoomState) {
                lines.attr("d", (datum) =>
                    d3
                        .line()
                        .x((d) => xScale(d.date))
                        .y((_) => innerHeight)
                        .curve(d3.curveBasis)(datum.value)
                );

                points.attr("cy", (_) => innerHeight);

                lines
                    .transition()
                    .duration(500)
                    .attr("d", (datum) =>
                        d3
                            .line()
                            .x((d) => xScale(d.date))
                            .y((d) => yScale(d.total))
                            .curve(d3.curveBasis)(datum.value)
                    );

                points
                    .transition()
                    .duration(500)
                    .attr("cx", (d) => xScale(d.date))
                    .attr("cy", (d) => yScale(d.avg));
            } else {
                lines.attr("d", (datum) =>
                    d3
                        .line()
                        .x((d) => xScale(d.date))
                        .y((d) => yScale(d.total))
                        .curve(d3.curveBasis)(datum.value)
                );
                points
                    .attr("cx", (d) => xScale(d.date))
                    .attr("cy", (d) => yScale(d.avg));
            }

            // zoom behaviour
            // reference: https://github.com/muratkemaldar/using-react-hooks-with-d3/blob/16-zoomable-line-chart/src/ZoomableLineChart.js
            const zoomed = ({ transform }) => {
                setZoomState(transform);
            };

            zoom.current = d3
                .zoom()
                .scaleExtent([1, 5])
                .translateExtent([
                    [margin.left, 0],
                    [width, height],
                ])
                .on("zoom", zoomed);

            svg.call(zoom.current);
        }
    }, [annotationEnabled, data, zoomState]);

    // use effect for normal gestures, i.e. pan, highlighting, etc, when annotation is disabled
    useEffect(() => {
        if (svgRef.current && !annotationEnabled && zoom.current) {
            const showTooltip = (mousePosition, dataPoint) => {
                const tooltipWidth = 120;
                const xOffset = -tooltipWidth / 2;
                const yOffset = -90;

                setTooltipState({
                    display: "block",
                    left: mousePosition[0] + xOffset,
                    top: mousePosition[1] + yOffset,
                    date: d3.timeFormat("%d-%b")(dataPoint.date),
                    avg: dataPoint.avg,
                    color: "rgb(128,128,128)",
                });
            };

            const hideTooltip = () => {
                setTooltipState({ display: "none" });
            };

            const handleMouseMove = (event) => {
                const elements = document.elementsFromPoint(
                    event.clientX,
                    event.clientY
                );
                // if the element has data, it means that the element is the d3 element
                const dataNodes = elements.filter(
                    (element) => element.__data__ && element.__data__.avg
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
                        d3.select(activeElement.current)
                            .attr("fill", "yellow")
                            .attr("r", zoomState?.k * 5 || 5);
                        // set the new element's fill to the "active" color
                        d3.select(dataNodes[0])
                            .attr("fill", "red")
                            .attr("r", zoomState?.k * 10 || 10);
                        activeElement.current = dataNodes[0];
                    }
                } else {
                    hideTooltip();
                    // if there is no elements, then update the fill of previous element & update activeElement to null
                    d3.select(activeElement.current)
                        .attr("fill", "yellow")
                        .attr("r", zoomState?.k * 5 || 5);
                    activeElement.current = null;
                }
            };

            // for adding zoom interaction
            const handleZoom = (event) => {
                zoom.current.scaleBy(
                    d3.select(svgRef.current),
                    event.detail.scale
                );
            };

            // for adding pan interaction
            const handlePan = (event) => {
                zoom.current.translateBy(
                    d3.select(svgRef.current),
                    event.detail.difference.x,
                    event.detail.difference.y
                );
            };

            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("zoom", handleZoom);
            document.addEventListener("pan", handlePan);
            return () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("zoom", handleZoom);
                document.removeEventListener("pan", handlePan);
            };
        }
        // data is a necessary dependency here to ensure that zoom.current is not null nor undefined
        // since it will be executed twice after rendering the visualisation
    }, [zoomState, annotationEnabled, data]);

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
                    height: 60,
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
                    {tooltipState.avg}
                </div>
            </div>
        </div>
    );
}
