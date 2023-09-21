import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import {
    clearHintPath,
    clearPointLabel,
    drawHintPath,
    drawPointLabel,
    initVisualisation,
    renderVisualisationZoomableWithScales,
    resetPoints,
    selectPoint,
    updateDraggedPoint,
} from "../../utilities/dimpvis";
import { drawSliderPath, selectSliderNode } from "../../utilities/slider";

const labels = [
    "1955",
    "1960",
    "1965",
    "1970",
    "1975",
    "1980",
    "1985",
    "1990",
    "1995",
    "2000",
    "2005",
];
const xLabel = "fertility rate (children per woman)";
const yLabel = "life expectancy (years)";
const title = "Fertility Rate vs. Life Expectancy of Selected World Countries";
const colorScale = d3
    .scaleOrdinal() // D3 Version 4
    .domain([
        "Europe & Central Asia",
        "America",
        "Slider",
        "East Asia & Pacific",
        "Middle East & North Africa",
    ])
    .range(["#D42423", "#FA7F19", "#808080", "#1F77B4", "#2CA02C"]);
const slider = {
    points: labels.reduce(
        (prev, _, index) => prev.concat([[index / 2 + 2, 40]]),
        []
    ),
    label: "",
    color: "Slider",
};

export default function ScatterplotDimpVis({ fileUrl, annotationEnabled }) {
    const [data, setData] = useState(null);
    const [zoomState, setZoomState] = useState();
    const svgRef = useRef();
    const zoom = useRef();
    const dragStarted = useRef();
    const dragged = useRef();
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
    const highlightedPointId = useRef();
    const draggedElement = useRef();

    useEffect(() => {
        // data is preprocessed to be in the following format
        // [{label: "Afghanistan", points: [[x1, y1], [x2, y2], ...]}, {label: "Argentina", points: [...]}, ...]
        d3.json(fileUrl).then((data) => {
            const { training } = data.pop();
            const filterCondition = training
                ? (data) =>
                      data.color === "East Asia & Pacific" ||
                      data.color === "Middle East & North Africa"
                : (data) =>
                      data.color === "Europe & Central Asia" ||
                      data.color === "America";
            const dataset = data.reduce((dataset, currentValue) => {
                const currentEntry = {
                    points: [],
                    label: currentValue.Country,
                    color: currentValue.Group,
                };
                const points = [];

                // for now, hardcoded label
                labels.forEach((value) => {
                    points.push([
                        currentValue[`F${value}`],
                        currentValue[`L${value}`],
                    ]);
                });
                currentEntry.points = points;

                return dataset.concat([currentEntry]);
            }, []);

            setData(dataset.filter(filterCondition).concat([slider]));
        });
    }, [fileUrl]);

    useEffect(() => {
        if (svgRef.current && data) {
            d3.selectAll("svg > *").remove();
            const margin = {
                top: 45,
                right: 45,
                bottom: 50,
                left: 50,
            };
            const innerHeight = height - margin.top - margin.bottom;
            const innerWidth = width - margin.left - margin.right;

            const svg = d3.select(svgRef.current);

            initVisualisation(svg, margin, colorScale);

            const xMax = d3.max(
                data.map((d) => d3.max(d.points.map((xy) => xy[0])))
            );

            const yMax = d3.max(
                data.map((d) => d3.max(d.points.map((xy) => xy[1])))
            );

            const yMin = d3.min(
                data.map((d) => d3.min(d.points.map((xy) => xy[1])))
            );

            const xScale = d3
                .scaleLinear()
                .domain([0, xMax])
                .range([0, innerWidth]);

            const yScale = d3
                .scaleLinear()
                .domain([yMin, yMax])
                .range([innerHeight, 0]);

            if (zoomState) {
                // reference: https://github.com/muratkemaldar/using-react-hooks-with-d3/blob/16-zoomable-line-chart/src/ZoomableLineChart.js
                const newXScale = zoomState.rescaleX(xScale);
                xScale.domain(newXScale.domain());
                const newYScale = zoomState.rescaleY(yScale);
                yScale.domain(newYScale.domain());
            }

            svg.append("g").attr("id", "sliderPath");

            drawSliderPath(
                svg,
                slider.points.map((point) => [
                    xScale(point[0]),
                    yScale(point[1]),
                ]),
                labels.map((_) => false),
                labels
            );

            renderVisualisationZoomableWithScales(
                svg,
                innerWidth,
                innerHeight,
                margin,
                data,
                labels,
                title,
                xLabel,
                yLabel,
                xScale,
                yScale,
                zoomState ? zoomState.k : null
            );

            dragStarted.current = (_, d) => {
                clearHintPath(svg);
                if (d.label === "") {
                    selectSliderNode(svg, d);
                } else {
                    selectPoint(svg, d, labels);
                }
            };

            dragged.current = (event, d) => {
                updateDraggedPoint(
                    svg,
                    d.id,
                    event.x,
                    event.y,
                    d.nodes,
                    labels
                );
            };

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
    }, [data, zoomState]);

    useEffect(() => {
        if (
            svgRef.current &&
            !annotationEnabled &&
            zoom.current &&
            dragStarted.current &&
            dragged.current
        ) {
            const svg = d3.select(svgRef.current);

            const handleZoom = (event) => {
                zoom.current.scaleBy(
                    d3.select(svgRef.current),
                    event.detail.scale
                );
            };

            const handlePan = (event) => {
                zoom.current.translateBy(
                    d3.select(svgRef.current),
                    event.detail.difference.x,
                    event.detail.difference.y
                );
            };

            const handleMouseMove = (event) => {
                draggedElement.current = null;
                resetPoints(svg);
                const elements = document.elementsFromPoint(
                    event.clientX,
                    event.clientY
                );
                const dataNodes = elements.filter(
                    (element) =>
                        element.__data__ &&
                        element.__data__.nodes &&
                        element.__data__.label !== ""
                );
                // content of dataNodes[0].__data__:
                // {nodes: Array(11), id: 41, label: 'South Korea', interpYears: Array(11)}

                if (dataNodes.length > 0) {
                    // remove previous hint path
                    clearHintPath(svg);
                    clearPointLabel(svg, highlightedPointId.current);
                    highlightedPointId.current = dataNodes[0].__data__.id;
                    // draw hint path
                    drawHintPath(
                        svg,
                        dataNodes[0].__data__.nodes,
                        dataNodes[0].__data__.interpYears,
                        labels
                    );
                    drawPointLabel(
                        svg,
                        dataNodes[0].__data__.id,
                        dataNodes[0].__data__.nodes,
                        dataNodes[0].__data__.label
                    );
                } else {
                    // remove hint path
                    clearHintPath(svg);
                    clearPointLabel(svg, highlightedPointId.current);
                }
            };

            const handleClickDrag = (event) => {
                const elements = document.elementsFromPoint(
                    event.detail.x,
                    event.detail.y
                );
                const dataNodes = elements.filter(
                    (element) => element.__data__ && element.__data__.nodes
                );

                if (dataNodes.length > 0 && !draggedElement.current) {
                    draggedElement.current = dataNodes[0];
                    d3.select(draggedElement.current).each(function (d) {
                        dragStarted.current.apply(this, [null, d]);
                    });
                }

                if (draggedElement.current) {
                    d3.select(draggedElement.current).each(function (d) {
                        // from: https://github.com/d3/d3-selection/blob/main/src/pointer.js
                        const position = {
                            x: event.detail.x - (window.innerWidth - width) / 2,
                            // draggedElement.current.getAttribute("cx") +
                            // (event.detail.x - rect.left - this.clientLeft),
                            y: event.detail.y,
                            // draggedElement.current.getAttribute("cy") +
                            // (event.detail.y - rect.top - this.clientTop),
                        };
                        dragged.current.apply(this, [position, d]);
                    });
                }
            };

            const handleNoGesture = () => {
                draggedElement.current = null;
                resetPoints(svg);
            };

            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("clickdrag", handleClickDrag);
            document.addEventListener("nogesture", handleNoGesture);
            document.addEventListener("zoom", handleZoom);
            document.addEventListener("pan", handlePan);
            return () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("clickdrag", handleClickDrag);
                document.removeEventListener("nogesture", handleNoGesture);
                document.removeEventListener("zoom", handleZoom);
                document.removeEventListener("pan", handlePan);
            };
        }
    }, [data, annotationEnabled]);

    return (
        <div>
            <svg width={width} height={height} style={style} ref={svgRef} />
        </div>
    );
}
