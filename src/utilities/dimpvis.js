/**
 * Reference: https://github.com/vialab/dimpVis
 */
import * as d3 from "d3";

export const visualisationSettings = {
    currentView: 0,
    nextView: 1,
    pointRadius: 8,
    defaultPointColor: "red",
    lastView: null,
    numPoints: null,
    hintPathColour: "grey",
    hintPathWidth: 5,
    clickedPoints: [],
    colorScale: null,
};

/**
 * initialise the container in which the visualisation will be drawn.
 *
 * @param {*} svg : input of type d3 selection, not a ref to the svg element
 * @param {*} margin : an object that contains top, left, bottom and right margin of the visualisation
 * @param {*} colorScale : d3 color scale for coloring the nodes
 */
const initVisualisation = (svg, margin, colorScale) => {
    visualisationSettings.colorScale = colorScale;
    svg.append("g")
        .attr("id", "gScatterPlot")
        .attr("transform", `translate(${margin.left},${margin.top})`);
};

/**
 * renders the scatterplot on the display along with the text that shows the current view, the x-axis and y-axis
 * it also prepares an empty group element for the hint path to be added in the future
 *
 * @param {*} svg : input of type d3 selection, not a ref to the svg element
 * @param {*} width : width of the display. in this app, it's fixed to 1280
 * @param {*} height : height of the display. in this app, it's fixed to 720
 * @param {*} margin : an object that contains top, left, bottom and right margin of the visualisation
 * @param {*} data : data is preprocessed to be in the following format
 *                   [{label: "Afghanistan", points: [[x1, y1], [x2, y2], ...]}, {label: "Argentina", points: [...]}, ...]
 * @param {*} labels : a list that contains the different views of the visualisation, e.g. 1995 to 2005
 * @param {*} title : the title of the graph
 * @param {*} xLabel : label of the x-axis
 * @param {*} yLabel : label of the y-axis
 * @param {*} xScale : d3 scale for the x-axis
 * @param {*} yScale : d3 scale for the y-axis
 * @param {*} k : d3 zoom k property, which is the current zoom scale factor (https://github.com/d3/d3-zoom/blob/main/README.md#zoomTransform)
 */
const renderVisualisationZoomableWithScales = (
    svg,
    width,
    height,
    margin,
    data,
    labels,
    title,
    xLabel,
    yLabel,
    xScale,
    yScale,
    k = null
) => {
    visualisationSettings.lastView = labels.length - 1;
    visualisationSettings.numPoints = data.length;

    drawAxes(svg, width, height, margin, xScale, yScale, title, xLabel, yLabel);

    // background text for the label
    svg.append("g")
        .append("text")
        .attr("id", "currentViewText")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("font-size", 100)
        .attr("font-weight", "bold")
        // how to center text in svg
        // reference: https://codepen.io/techhysahil/pen/POJWpW
        .attr("alignment-baseline", "middle")
        .attr("text-anchor", "middle")
        .attr("opacity", 0.5)
        .text(labels[visualisationSettings.currentView]);

    svg.selectAll("circle")
        .data(
            data.map((d, i) => {
                const scaledPoints = [];
                const interpolatedYears = [];
                d.points.forEach((point, j) => {
                    if (point[0] === "missing" || point[1] === "missing") {
                        const newPoint = interpolateMissingPoint(d.points, j);
                        interpolatedYears.push(1);
                        scaledPoints.push([
                            xScale(newPoint.x),
                            yScale(newPoint.y),
                        ]);
                    } else {
                        interpolatedYears.push(0);
                        scaledPoints.push([xScale(point[0]), yScale(point[1])]);
                    }
                });
                return {
                    nodes: scaledPoints,
                    id: i,
                    label: d.label,
                    interpYears: interpolatedYears,
                    color: d.color || visualisationSettings.defaultPointColor,
                };
            })
        )
        .enter()
        .append("g")
        .attr("class", "gDisplayPoints")
        .attr("id", (d) => `gDisplayPoints${d.id}`);

    svg.selectAll(".gDisplayPoints")
        .append("svg:circle")
        .attr("cx", (d) => d.nodes[visualisationSettings.currentView][0])
        .attr("cy", (d) => d.nodes[visualisationSettings.currentView][1])
        .attr(
            "r",
            k
                ? k * visualisationSettings.pointRadius
                : visualisationSettings.pointRadius
        )
        .attr("class", "displayPoints")
        .attr("id", (d) => `displayPoints${d.id}`)
        .style("fill-opacity", 0.5)
        .style("stroke", "#FFF")
        .style("stroke-width", 1)
        .style("fill", (d) => visualisationSettings.colorScale(d.color));

    svg.append("g").attr("id", "hintPath");
};

/**
 * renders the scatterplot on the display along with the text that shows the current view, the x-axis and y-axis
 * it also prepares an empty group element for the hint path to be added in the future
 *
 * @param {*} svg : input of type d3 selection, not a ref to the svg element
 * @param {*} width : width of the display. in this app, it's fixed to 1280
 * @param {*} height : height of the display. in this app, it's fixed to 720
 * @param {*} margin : an object that contains top, left, bottom and right margin of the visualisation
 * @param {*} data : data is preprocessed to be in the following format
 *                   [{label: "Afghanistan", points: [[x1, y1], [x2, y2], ...]}, {label: "Argentina", points: [...]}, ...]
 * @param {*} labels : a list that contains the different views of the visualisation, e.g. 1995 to 2005
 * @param {*} title : the title of the graph
 * @param {*} xLabel : label of the x-axis
 * @param {*} yLabel : label of the y-axis
 */
const renderVisualisation = (
    svg,
    width,
    height,
    margin,
    data,
    labels,
    title,
    xLabel,
    yLabel
) => {
    visualisationSettings.lastView = labels.length - 1;
    visualisationSettings.numPoints = data.length;

    // find the maximum and minimum of the x and y values for each datapoint for scaling
    // (2) out of all largest x values from each country, find the largest one
    const xMax = d3.max(
        // (1) for each data point, find the largest x value from range min(labels) to max(labels)
        // e.g. largest fertility rate from 1950 to 2005 for Afghanistan
        data.map((d) => d3.max(d.points.map((xy) => xy[0])))
    );

    const yMax = d3.max(data.map((d) => d3.max(d.points.map((xy) => xy[1]))));

    const yMin = d3.min(data.map((d) => d3.min(d.points.map((xy) => xy[1]))));

    const xScale = d3.scaleLinear().domain([0, xMax]).range([0, width]);

    const yScale = d3.scaleLinear().domain([yMin, yMax]).range([height, 0]);

    drawAxes(svg, width, height, margin, xScale, yScale, title, xLabel, yLabel);

    // background text for the label
    svg.append("g")
        .append("text")
        .attr("id", "currentViewText")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("font-size", 100)
        .attr("font-weight", "bold")
        // how to center text in svg
        // reference: https://codepen.io/techhysahil/pen/POJWpW
        .attr("alignment-baseline", "middle")
        .attr("text-anchor", "middle")
        .attr("opacity", 0.5)
        .text(labels[visualisationSettings.currentView]);

    svg.selectAll("circle")
        .data(
            data.map((d, i) => {
                const scaledPoints = [];
                const interpolatedYears = [];
                d.points.forEach((point, j) => {
                    if (point[0] === "missing" || point[1] === "missing") {
                        const newPoint = interpolateMissingPoint(d.points, j);
                        interpolatedYears.push(1);
                        scaledPoints.push([
                            xScale(newPoint.x),
                            yScale(newPoint.y),
                        ]);
                    } else {
                        interpolatedYears.push(0);
                        scaledPoints.push([xScale(point[0]), yScale(point[1])]);
                    }
                });
                return {
                    nodes: scaledPoints,
                    id: i,
                    label: d.label,
                    interpYears: interpolatedYears,
                    color: d.color || visualisationSettings.defaultPointColor,
                };
            })
        )
        .enter()
        .append("g")
        .attr("class", "gDisplayPoints")
        .attr("id", (d) => `gDisplayPoints${d.id}`);

    svg.selectAll(".gDisplayPoints")
        .append("svg:circle")
        .attr("cx", (d) => d.nodes[visualisationSettings.currentView][0])
        .attr("cy", (d) => d.nodes[visualisationSettings.currentView][1])
        .attr("r", visualisationSettings.pointRadius)
        .attr("class", "displayPoints")
        .attr("id", (d) => `displayPoints${d.id}`)
        .style("fill-opacity", 0.5)
        .style("stroke", "#FFF")
        .style("stroke-width", 1)
        .style("fill", (d) => visualisationSettings.colorScale(d.color));

    svg.append("g").attr("id", "hintPath");
};

/**
 * renders the hint path of a certain point on the display
 * the hint path shows the position of the point at each view
 *
 * @param {*} svg : input of type d3 selection, not a ref to the svg element
 * @param {*} points : the list of nodes that forms a path (format: [[x1, y1], [x2, y2], ...])
 * @param {*} interpPts : a list of true or false that tells whether the point is a result of interpolation
 * @param {*} labels : a list that contains the different views of the visualisation, e.g. 1995 to 2005
 */
const drawHintPath = (svg, points, interpPts, labels) => {
    svg.select("#hintPath")
        .selectAll("text")
        .data(
            points.map((d, i) => {
                return {
                    x: d[0],
                    y: d[1],
                    id: i,
                };
            })
        )
        .enter()
        .append("svg:text")
        // if the point is the result of interpolation, do not add the year as the label
        // interpolation is used to handle missing data
        .text((d, i) => (interpPts[i] ? "" : labels[d.id]))
        .attr("x", (d) => d.x + visualisationSettings.hintPathWidth + 1)
        .attr("y", (d) => d.y - visualisationSettings.hintPathWidth + 1)
        .attr("class", "hintLabels")
        .attr("fill-opacity", 1)
        .attr("id", (d) => `hintLabels${d.id}`)
        .style("font-family", "sans-serif")
        .style("font-size", 10)
        .style("fill", "black");

    svg.select("#hintPath")
        .append("svg:path")
        .attr("d", hintPathGenerator(points))
        .attr("id", "path")
        .attr("fill-opacity", 0.5)
        .attr("stroke-opacity", 0.5)
        .style("fill", "none")
        .style("stroke-width", visualisationSettings.hintPathWidth)
        .style("stroke", visualisationSettings.hintPathColour);
};

const hintPathGenerator = d3.line().curve(d3.curveLinear);

/**
 * removes all elements of the hint path, which includes the texts, paths and circles
 *
 * @param {*} svg : input of type d3 selection, not a ref to the svg element
 */
const clearHintPath = (svg) => {
    const hintPath = svg.select("#hintPath");

    hintPath.selectAll("text").remove();
    hintPath.selectAll("path").remove();
    hintPath.selectAll("circle").remove();
};

/**
 * handles missing point by creating a new point from the interpolation of the neighbouring points
 *
 * @param {*} points : the list of nodes that forms a path (format: [[x1, y1], [x2, y2], ...])
 * @param {*} year : the position of the missing data in the list
 * @returns the newly created point
 */
const interpolateMissingPoint = (points, year) => {
    const interpolator =
        year > 0 && year < points.length - 1
            ? d3.interpolate(
                  { x: points[year - 1][0], y: points[year - 1][1] },
                  { x: points[year + 1][0], y: points[year + 1][1] }
              )
            : d3.interpolate({ x: 0, y: 0 }, { x: 1, y: 1 });
    return interpolator(0.5);
};

/**
 * renders the x-axis and the y-axis on the display
 *
 * @param {*} svg : input of type d3 selection, not a ref to the svg element
 * @param {*} width : width of the display. in this app, it's fixed to 1280
 * @param {*} height : height of the display. in this app, it's fixed to 720
 * @param {*} margin : an object that contains top, left, bottom and right margin of the visualisation
 * @param {*} xScale : d3 scale for the x-axis
 * @param {*} yScale : d3 scale for the y-axis
 * @param {*} title : title of the graph
 * @param {*} xLabel : label of the x-axis
 * @param {*} yLabel : label of the y-axis
 */
const drawAxes = (
    svg,
    width,
    height,
    margin,
    xScale,
    yScale,
    title,
    xLabel,
    yLabel
) => {
    // tickSizeInner(-height): to draw grid inside the graph
    const xAxis = d3.axisBottom(xScale); // .tickSizeInner(-height).tickSizeOuter(0);
    // tickSizeInner(-width) also serves the same purpose
    const yAxis = d3.axisLeft(yScale); // .tickSizeInner(-width).tickSizeOuter(0);

    const g = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // add the title of the graph
    g.append("text")
        .attr("id", "graphTitle")
        .attr("class", "axis")
        .attr("transform", `translate(0,0)`)
        .text(title)
        .attr("x", width / 2)
        .attr("y", -15);

    // add the x-axis
    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis)
        .selectAll("line")
        .style("fill", "none")
        .style("stroke", "#BDBDBD");

    // Add the y-axis
    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,0)`)
        .call(yAxis)
        .selectAll("line")
        .style("fill", "none")
        .style("stroke", "#BDBDBD");

    // Add an x-axis label
    g.append("text")
        .attr("class", "axisLabel")
        .attr("x", width / 3)
        .attr("y", height + 40)
        .text(xLabel);

    // Add a y-axis label
    g.append("text")
        .attr("class", "axisLabel")
        .attr("x", -width / 3)
        .attr("y", -30)
        .attr("transform", "rotate(-90)")
        .text(yLabel);
};

/**
 * renders the label of the point with the id pointId
 *
 * @param {*} svg : input of type d3 selection, not a ref to the svg element
 * @param {*} pointId : the id of the point whose label will be drawn on the display
 * @param {*} nodes : a list of nodes that shows the different positions in different views of the same point (point that has pointId)
 * @param {*} label : the label to be drawn on the display
 */
const drawPointLabel = (svg, pointId, nodes, label) => {
    if (d3.select(`#pointLabel${pointId}`).empty()) {
        svg.select(`#gDisplayPoints${pointId}`)
            .append("text")
            .attr("x", (_) => nodes[visualisationSettings.currentView][0])
            // place the label on top of the point
            .attr(
                "y",
                (_) =>
                    nodes[visualisationSettings.currentView][1] -
                    visualisationSettings.pointRadius
            )
            .attr("class", "pointLabels")
            .attr("id", (_) => `pointLabel${pointId}`)
            .text((_) => label);
    }
};

/**
 * removes the point label for those points that are not included in the clickedPoints list
 * this is to immediately remove point labels for highlighted points, while making sure that
 * the labels for points that were clicked & dragged persisted on the display
 *
 * @param {*} svg : input of type d3 selection, not a ref to the svg element
 * @param {*} pointId : the id of the point whose label will be drawn on the display
 */
const clearPointLabel = (svg, pointId) => {
    if (!visualisationSettings.clickedPoints.includes(pointId)) {
        svg.select(`#pointLabel${pointId}`).remove();
    }
};

/**
 * selects the point to be dragged & changes its opacity to 1
 * the label of the selected point will also be drawn to the display
 * if the point has been clicked previously, it will be removed from the clickedPoints list & its point label will be cleared after dragging
 * this is to mimic the behaviour of the vega implementation
 *
 * @param {*} svg : input of type d3 selection, not a ref to the svg element
 * @param {*} point : an object that represents the selected point to be dragged
 * @param {*} labels : a list that contains the different views of the visualisation, e.g. 1995 to 2005
 */
const selectPoint = (svg, point, labels) => {
    drawHintPath(svg, point.nodes, point.interpYears, labels);
    if (!visualisationSettings.clickedPoints.includes(point.id)) {
        svg.select(`#displayPoints${point.id}`).style("fill-opacity", 1);
        visualisationSettings.clickedPoints.push(point.id);
        drawPointLabel(svg, point.id, point.nodes, point.label);
    } else {
        visualisationSettings.clickedPoints =
            visualisationSettings.clickedPoints.filter(
                (pointId) => pointId !== point.id
            );
    }
};

/**
 * update the position of the selected point relative to the pointer position
 * it calls dragAlongPath to ensure that the point never leaves its path
 *
 * @param {*} svg : input of type d3 selection, not a ref to the svg element
 * @param {*} pointId : the id of the point to be moved around the display
 * @param {*} pointerX : pointer x position
 * @param {*} pointerY : pointer y position
 * @param {*} nodes : a list of nodes that shows the different positions in different views of the same point (point that has pointId)
 * @param {*} labels : a list that contains the different views of the visualisation, e.g. 1995 to 2005
 */
const updateDraggedPoint = (
    svg,
    pointId,
    pointerX,
    pointerY,
    nodes,
    labels
) => {
    const xCurrent = nodes[visualisationSettings.currentView][0];
    const yCurrent = nodes[visualisationSettings.currentView][1];

    const xNext = nodes[visualisationSettings.nextView][0];
    const yNext = nodes[visualisationSettings.nextView][1];

    const newPoint = dragAlongPath(
        svg,
        pointId,
        xCurrent,
        yCurrent,
        xNext,
        yNext,
        pointerX,
        pointerY
    );

    svg.select(`#displayPoints${pointId}`)
        .attr("cx", newPoint[0])
        .attr("cy", newPoint[1]);
    animatePointLabel(svg, pointId, newPoint[0], newPoint[1]);

    svg.select("#currentViewText").text(
        labels[visualisationSettings.currentView]
    );
};

/**
 * ensures that the dragged point never leave its path
 * by finding the point where the distance between the pointer and the line is at the minimum
 * and moving the dragged point there
 *
 * @param {*} svg : input of type d3 selection, not a ref to the svg element
 * @param {*} pointId : the id of the point to be moved around the display
 * @param {*} xCurrent : x position of the node in the current view
 * @param {*} yCurrent : y position of the node in the current view
 * @param {*} xNext : x position of the node in the next view
 * @param {*} yNext : y position of the node in the next view
 * @param {*} pointerX : pointer x position
 * @param {*} pointerY : pointer y position
 * @returns the new position of the point within the path
 */
const dragAlongPath = (
    svg,
    pointId,
    xCurrent,
    yCurrent,
    xNext,
    yNext,
    pointerX,
    pointerY
) => {
    const minDistance = minDistanceBetweenLineAndPoint(
        { x1: xCurrent, y1: yCurrent, x2: xNext, y2: yNext },
        { x: pointerX, y: pointerY }
    );
    const newPoint = [minDistance[0], minDistance[1]];
    const t = minDistance[2];

    if (t < 0) {
        moveBackward();
    } else if (t > 1) {
        moveForward();
    } else {
        interpolatePoints(svg, pointId, t);
    }

    return newPoint;
};

/**
 * finds the minimum distance between a line (represented by two points) and a point
 * reference: https://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment,
 * https://math.stackexchange.com/questions/2248617/shortest-distance-between-a-point-and-a-line-segment
 *
 * @param {*} line : an object that contains x1, y1 and x2, y1, which represent the two point that connects the line
 * @param {*} point : an object that contains x, y, which represent a point
 * @returns the point (minX and minY) that represents the minimum distance between the line and the point along with the parameter t in the format [x, y, t]
 */
const minDistanceBetweenLineAndPoint = (line, point) => {
    const { x1, y1, x2, y2 } = line;
    const { x, y } = point;
    const lineDistance = calculateDistance({ x1, y1 }, { x2, y2 });

    if (lineDistance === 0) {
        return [x1, y1, 0];
    }

    const t = ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / lineDistance;

    if (t < 0) {
        return [x1, y1, t];
    }

    if (t > 1) {
        return [x2, y2, t];
    }

    const minX = x1 + t * (x2 - x1);
    const minY = y1 + t * (y2 - y1);
    return [minX, minY, t];
};

/**
 * calculates squared Euclidean distance between two points
 * @param {*} point1 an object that contains x1, y1 that represents the first point
 * @param {*} point2 an object that contains x2, y2 that represents the second point
 * @returns the squared Euclidean distance between the two points
 */
const calculateDistance = (point1, point2) => {
    const { x1, y1 } = point1;
    const { x2, y2 } = point2;
    const term1 = x1 - x2;
    const term2 = y1 - y2;
    return term1 * term1 + term2 * term2;
};

/**
 * makes sure that the currentView does not go below the first view
 * if currentView is not lower than 0, move currentView and nextView backward
 */
const moveBackward = () => {
    if (visualisationSettings.currentView > 0) {
        visualisationSettings.nextView = visualisationSettings.currentView;
        visualisationSettings.currentView--;
    }
};

/**
 * makes sure that the nextView does not go beyond the lastView
 * if nextView is not greater than lastView, move currentView and nextView forward
 */
const moveForward = () => {
    if (visualisationSettings.nextView < visualisationSettings.lastView) {
        visualisationSettings.currentView = visualisationSettings.nextView;
        visualisationSettings.nextView++;
    }
};

/**
 * update the position of the points other than the one being dragged (the selected point will be updated by the updateDraggedPoint function)
 * because the other points should follow the currently dragged point.
 * finds their position somewhere in the middle of the two views
 *
 * @param {*} svg : input of type d3 selection, not a ref to the svg element
 * @param {*} draggedPointId : the point that is being dragged
 * @param {*} interpAmount : the amount of interpolation between the position of the two views, e.g. 0.5 means that the points are exactly positioned in the middle of the two views
 */
const interpolatePoints = (svg, draggedPointId, interpAmount) => {
    svg.selectAll(".displayPoints")
        .filter((d) => d.id !== draggedPointId)
        .each(function (d) {
            const interpolator = d3.interpolate(
                {
                    x: d.nodes[visualisationSettings.currentView][0],
                    y: d.nodes[visualisationSettings.currentView][1],
                },
                {
                    x: d.nodes[visualisationSettings.nextView][0],
                    y: d.nodes[visualisationSettings.nextView][1],
                }
            );
            const newPoint = interpolator(interpAmount);
            d3.select(this).attr("cx", newPoint.x).attr("cy", newPoint.y);

            if (visualisationSettings.clickedPoints.includes(d.id)) {
                animatePointLabel(svg, d.id, newPoint.x, newPoint.y);
            }
        });
};

/**
 * makes the label follow the point along its path
 *
 * @param {*} svg : input of type d3 selection, not a ref to the svg element
 * @param {*} pointId : the id of the moving point
 * @param {*} x : the new x position of the point
 * @param {*} y : the new y position of the point
 */
const animatePointLabel = (svg, pointId, x, y) => {
    svg.select(`#pointLabel${pointId}`)
        .attr("x", x)
        .attr("y", y - visualisationSettings.pointRadius);
};

/**
 * reset the opacity and remove the labels of all points except for those that are in the clickedPoints list
 *
 * @param {*} svg : input of type d3 selection, not a ref to the svg element
 */
const resetPoints = (svg) => {
    svg.selectAll(".displayPoints").style("fill-opacity", 0.5);
    svg.selectAll(".pointLabels").remove();

    visualisationSettings.clickedPoints.forEach((pointId) => {
        svg.select(`#displayPoints${pointId}`).style("fill-opacity", 1);
        svg.select(`#displayPoints${pointId}`).each((d) =>
            drawPointLabel(svg, pointId, d.nodes, d.label)
        );
    });
};

export {
    initVisualisation,
    renderVisualisationZoomableWithScales,
    renderVisualisation,
    drawHintPath,
    clearHintPath,
    drawPointLabel,
    clearPointLabel,
    selectPoint,
    updateDraggedPoint,
    resetPoints,
};
