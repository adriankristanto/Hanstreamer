import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { HAND_CONNECTIONS } from "@mediapipe/hands";

const drawHands = (canvasRef, ctx, results) => {
    ctx.save();
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
                color: "white",
                lineWidth: 5,
            });
            drawLandmarks(ctx, landmarks, {
                color: "aqua",
                lineWidth: 5,
                radius: 5,
            });
        }
    }
    ctx.restore();
};

export { drawHands };
