import * as d3 from "d3";
import { visualisationSettings } from "./dimpvis";

const hintPathGenerator = d3.line().curve(d3.curveLinear);

const drawSliderPath = (svg, points, interpPts, labels) => {
    svg.select("#sliderPath")
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
        .attr("x", (d) => d.x - 11)
        .attr("y", (d) => d.y - 11)
        .attr("class", "sliderLabels")
        .attr("fill-opacity", 1)
        .attr("id", (d) => `sliderLabels${d.id}`)
        .style("font-family", "sans-serif")
        .style("font-size", 10)
        .style("fill", "black");

    svg.select("#sliderPath")
        .append("svg:path")
        .attr("d", hintPathGenerator(points))
        .attr("id", "path")
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1)
        .style("fill", "none")
        .style("stroke-width", 10)
        .style("stroke", "grey");
};

const selectSliderNode = (svg, point) => {
    if (!visualisationSettings.clickedPoints.includes(point.id)) {
        svg.select(`#displayPoints${point.id}`).style("fill-opacity", 1);
        visualisationSettings.clickedPoints.push(point.id);
    } else {
        visualisationSettings.clickedPoints =
            visualisationSettings.clickedPoints.filter(
                (pointId) => pointId !== point.id
            );
    }
};

export { drawSliderPath, selectSliderNode };
