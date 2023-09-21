import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import auStatesGeoJson from "./maps/au-states.geojson";

const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

export default function AustralianMap({ fileUrl, annotationEnabled }) {
    const [data, setData] = useState(null);
    const [tooltipState, setTooltipState] = useState({ display: "none" });
    // useRef since this will be handled by d3
    const activeElement = useRef(null);
    const svgRef = useRef();
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
        // row function to modify data points, e.g. convert data point to int
        const row = (d) => {
            return { ...d, total: d.total };
        };

        d3.csv(fileUrl, row).then((data) => {
            setData(data);
        });
    }, [fileUrl]);

    useEffect(() => {
        if (svgRef.current && data) {
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

            const projection = d3
                .geoMercator()
                .center([135, -26])
                .translate([innerWidth / 2, innerHeight / 2])
                .scale(900);

            const path = d3.geoPath().projection(projection);

            d3.json(auStatesGeoJson).then((collection) => {
                g.selectAll("path")
                    .data(collection.features)
                    .enter()
                    .append("path")
                    .attr("fill", (d) => {
                        const dataPoint = data.filter(
                            (datum) =>
                                datum.state === d.properties["STATE_NAME"]
                        );
                        return dataPoint.length > 0
                            ? colorScale(dataPoint[0].total)
                            : null;
                    })
                    .attr("d", path);
            });

            const zoomed = ({ transform }) => {
                g.attr("transform", transform);
            };

            zoom.current = d3
                .zoom()
                .scaleExtent([0.5, 5])
                .translateExtent([
                    [-0.5 * width, -0.5 * height],
                    [1.5 * width, 1.5 * height],
                ])
                .on("zoom", zoomed);

            svg.call(zoom.current);
        }
    }, [data]);

    // use effect for normal gestures, i.e. pan, highlighting, etc, when annotation is disabled
    useEffect(() => {
        if (svgRef.current && data && !annotationEnabled && zoom.current) {
            const showTooltip = (mousePosition, dataPoint) => {
                const tooltipWidth = 120;
                const xOffset = -tooltipWidth / 2;
                const yOffset = -90;

                const filteredData = data.filter(
                    (d) => d.state === dataPoint.properties["STATE_NAME"]
                );

                setTooltipState({
                    display: "block",
                    left: mousePosition[0] + xOffset,
                    top: mousePosition[1] + yOffset,
                    state: dataPoint.properties["STATE_NAME"],
                    total:
                        filteredData.length > 0 ? filteredData[0].total : "-",
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
                    (element) => element.__data__
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
                        d3.select(activeElement.current).attr("fill", (d) => {
                            const dataPoint = data.filter(
                                (datum) =>
                                    datum.state === d.properties["STATE_NAME"]
                            );
                            return dataPoint.length > 0
                                ? colorScale(dataPoint[0].total)
                                : null;
                        });
                        // set the new element's fill to the "active" color
                        d3.select(dataNodes[0])
                            .attr("fill", "yellow")
                            .attr("r", 10);
                        activeElement.current = dataNodes[0];
                    }
                } else {
                    hideTooltip();
                    // if there is no elements, then update the fill of previous element & update activeElement to null
                    d3.select(activeElement.current).attr("fill", (d) => {
                        const dataPoint = data.filter(
                            (datum) =>
                                datum.state === d.properties["STATE_NAME"]
                        );
                        return dataPoint.length > 0
                            ? colorScale(dataPoint[0].total)
                            : null;
                    });
                    activeElement.current = null;
                }
            };

            // for adding zoom interaction
            const handleZoom = (event) => {
                zoom.current.scaleBy(
                    d3.select(svgRef.current),
                    event.detail.scale,
                    [event.detail.center.x, event.detail.center.y]
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
                    {tooltipState.state}
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
}
