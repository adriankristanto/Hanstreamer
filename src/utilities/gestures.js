const TOTAL_LANDMARK = 21;
const TOTAL_POINTS = TOTAL_LANDMARK * 2;

const extractKeypoints = (results) => {
    let leftHand = new Array(2).fill(0);
    let rightHand = new Array(2).fill(0);

    if (results.multiHandLandmarks) {
        // zip multiHandLandmarks with multiHandedness
        const zipped = [];

        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            zipped.push([
                results.multiHandLandmarks[i],
                results.multiHandedness[i],
            ]);
        }

        for (let element of zipped) {
            const [handLandmarks, handedness] = element;

            // if there is a left hand
            if (handedness.index === 0) {
                // use reduce for concat map or flat map
                leftHand = [handLandmarks[9].x, handLandmarks[9].y];
            }

            // if there is a right hand
            if (handedness.index === 1) {
                rightHand = [handLandmarks[9].x, handLandmarks[9].y];
            }
        }
    }

    return leftHand.concat(rightHand);
};

const extractKeypoints_old = (results) => {
    let leftHand = new Array(TOTAL_POINTS).fill(0);
    let rightHand = new Array(TOTAL_POINTS).fill(0);

    if (results.multiHandLandmarks) {
        // zip multiHandLandmarks with multiHandedness
        results.multiHandLandmarks
            .map((e, i) => [e, results.multiHandedness[i]])
            .forEach((e) => {
                const [handLandmarks, handedness] = e;

                // if there is a left hand
                if (handedness.index === 0) {
                    // use reduce for concat map or flat map
                    leftHand = handLandmarks.reduce(
                        (accumulator, landmark) =>
                            accumulator.concat([landmark.x, landmark.y]),
                        []
                    );
                }

                // if there is a right hand
                if (handedness.index === 1) {
                    rightHand = handLandmarks.reduce(
                        (accumulator, landmark) =>
                            accumulator.concat([landmark.x, landmark.y]),
                        []
                    );
                }
            });
    }

    return leftHand.concat(rightHand);
};

const preprocessKeypoints = (keypoints) => {
    let preprocessedKeypoints = [];

    let baseX = null;
    let baseY = null;

    // baseX and baseY will be set to the position of the first non-zero landmark
    // often, this should be the position of the left palm
    // if there is no left palm detected, i.e. when the left palm position is (0,0), baseX and baseY will be set to the position of the right palm
    // e.g. when the gesture is only using the right hand, such as right point or right pan
    for (let i = 0; i < keypoints.length; i = i + 2) {
        // handle x and y
        for (let j = i; j < i + 2; j++) {
            let newPoint = keypoints[j];
            // handle x
            if (j % 2 === 0) {
                // first non-zero x
                if (newPoint !== 0 && baseX === null) {
                    baseX = newPoint;
                } else if (newPoint !== 0 && baseX !== null) {
                    // 2nd, 3rd, etc. non-zero will be subtracted by base_x
                    newPoint -= baseX;
                }
            } else {
                // handle y
                if (newPoint !== 0 && baseY === null) {
                    baseY = newPoint;
                } else if (newPoint !== 0 && baseY !== null) {
                    newPoint -= baseY;
                }
            }
            preprocessedKeypoints.push(newPoint);
        }
    }

    // find the maximum absolute value
    const maxValue = preprocessedKeypoints
        .map(Math.abs)
        .reduce((a, b) => Math.max(a, b), 0);

    if (maxValue !== 0) {
        preprocessedKeypoints = preprocessedKeypoints.map((e) => e / maxValue);
    }

    return preprocessedKeypoints;
};

const argmax = (arr) => {
    return arr.reduce(
        (prev, curr, currIdx) => (curr > prev[0] ? [curr, currIdx] : prev),
        [Number.MIN_VALUE, -1]
    );
};

const unique = (arr) => {
    const result = arr.reduce((prev, curr) => {
        prev[curr] === undefined
            ? (prev[curr] = 1)
            : (prev[curr] = prev[curr] + 1);
        return prev;
    }, {});
    return [Object.keys(result), Object.values(result)];
};

// due to camera mirroring, the class names are flipped, i.e. right => left and left => right
const GESTURES = {
    LEFT_SWIPE: 0,
    RIGHT_SWIPE: 1,
    LEFT_SWIPE_UP: 2,
    RIGHT_SWIPE_UP: 3,
};

export {
    extractKeypoints,
    preprocessKeypoints,
    unique,
    argmax,
    GESTURES,
    extractKeypoints_old,
};
