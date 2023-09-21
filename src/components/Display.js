import React, {
    useRef,
    useEffect,
    useState,
    useCallback,
    useReducer,
} from "react";
import Webcam from "react-webcam";
import { Hands, VERSION as HANDS_VERSION } from "@mediapipe/hands";
import {
    SelfieSegmentation,
    VERSION as SELFIE_SEGMENTATION_VERSION,
} from "@mediapipe/selfie_segmentation";
import { Camera } from "@mediapipe/camera_utils";
import BarChart from "./visualisation/BarChart";
import MultiLineSeriesChart from "./visualisation/MultiSeriesLineChart";
import { useAuth } from "../contexts/AuthContext";
import { database } from "../firebase";
import { VISUALISATIONS } from "./visualisation/types";
import AustralianMap from "./visualisation/AustralianMap";
import ForceDirectedGraph from "./visualisation/ForceDirectedGraph";
import ScatterplotDimpVis from "./visualisation/ScatterplotDimpVis";
import HomePage from "./visualisation/HomePage";
import {
    extractKeypoints,
    unique,
    argmax,
    GESTURES,
} from "../utilities/gestures";

import DynamicTimeWarping from "dynamic-time-warping";

// setting up fingerpose heuristic
import pointDescription from "../utilities/pointDescription";
import panDescription from "../utilities/panDescription";
import zoomDescription from "../utilities/zoomDescription";
import clickDragDescription from "../utilities/clickDragDescription";
import estimateFingerPose from "../utilities/fingerpose";

// dynamic time warping dataset
import dtwDataset from "../utilities/dataset.json";

import { defaultSettings } from "./SideBar";
import { drawHands } from "../utilities/debug";

import { analytics } from "../firebase";

const Display = () => {
    // const [visualisationIndex, setVisualisationIndex] = useState(0);
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const handCanvasRef = useRef(null);
    const displayWidth = 1280;
    const displayHeight = 720;
    const videoConstraints = {
        width: displayWidth,
        height: displayHeight,
        facingMode: "user",
    };

    const sequences = useRef([]);
    const predictions = useRef([]);
    const [allModelLoaded, setAllModelLoaded] = useState(false);

    const annotationCanvasRef = useRef();
    const drawingCoord = useRef(null);
    const eraserCoord = useRef(null);

    const currentVisualisationType = useRef();

    // https://stackoverflow.com/questions/17976995/how-to-center-absolute-div-horizontally-using-css
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

    const { currentUser } = useAuth();
    const [files, setFiles] = useState([]);
    const [settings, setSettings] = useState(defaultSettings);

    // when the currentUser changes, change the files displayed to the account to ones owned by the currentUser
    useEffect(() => {
        setFiles([]);
        const cleanup = database.files
            .where("userId", "==", currentUser.uid)
            .orderBy("ordering")
            .onSnapshot((snapshot) => {
                setFiles(snapshot.docs.map(database.formatDoc));
            });
        return cleanup;
    }, [currentUser]);

    // when the currentUser changes, change the settings too
    useEffect(() => {
        const cleanup = database.settings
            .where("userId", "==", currentUser.uid)
            .onSnapshot((snapshot) => {
                const data = snapshot.docs.map(database.formatDoc);
                data.forEach((settings) => {
                    // we don't want to update the userId or createdAt
                    delete settings.userId;
                    delete settings.createdAt;
                    setSettings(settings);
                });
            });
        return cleanup;
    }, [currentUser]);

    function fileToChartComponent(file, annotationEnabled) {
        switch (file.visualisationType) {
            case VISUALISATIONS.BAR_CHART.ID:
                currentVisualisationType.current =
                    VISUALISATIONS.BAR_CHART.NAME;
                return (
                    <BarChart
                        fileUrl={file.url}
                        annotationEnabled={annotationEnabled}
                    />
                );
            case VISUALISATIONS.MULTI_SERIES_LINE_CHART.ID:
                currentVisualisationType.current =
                    VISUALISATIONS.MULTI_SERIES_LINE_CHART.NAME;
                return (
                    <MultiLineSeriesChart
                        fileUrl={file.url}
                        annotationEnabled={annotationEnabled}
                    />
                );
            case VISUALISATIONS.AUSTRALIAN_MAP.ID:
                currentVisualisationType.current =
                    VISUALISATIONS.AUSTRALIAN_MAP.NAME;
                return (
                    <AustralianMap
                        fileUrl={file.url}
                        annotationEnabled={annotationEnabled}
                    />
                );
            case VISUALISATIONS.FORCE_DIRECTED_GRAPH.ID:
                currentVisualisationType.current =
                    VISUALISATIONS.FORCE_DIRECTED_GRAPH.NAME;
                return (
                    <ForceDirectedGraph
                        fileUrl={file.url}
                        annotationEnabled={annotationEnabled}
                    />
                );
            case VISUALISATIONS.SCATTERPLOT_DIMPVIS.ID:
                currentVisualisationType.current =
                    VISUALISATIONS.SCATTERPLOT_DIMPVIS.NAME;
                return (
                    <ScatterplotDimpVis
                        fileUrl={file.url}
                        annotationEnabled={annotationEnabled}
                    />
                );
            default:
                return null;
        }
    }

    const reducer = (state, action) => {
        switch (action.type) {
            case "increment":
                return state.annotationEnabled
                    ? state
                    : {
                          ...state,
                          // index 0 will show a blank page
                          visualisationIndex:
                              (state.visualisationIndex + 1) %
                              (files.length + 1),
                      };
            case "decrement":
                // reference: https://stackoverflow.com/questions/4467539/javascript-modulo-gives-a-negative-result-for-negative-numbers
                return state.annotationEnabled
                    ? state
                    : {
                          ...state,
                          // if currently at homepage, i.e. position -1, move to the last visualisation
                          // files.length instead of files.length -1 since we will compare it with index + 1 instead of index when rendering
                          visualisationIndex:
                              state.visualisationIndex === -1
                                  ? files.length
                                  : // index 0 will show a blank page
                                    (((state.visualisationIndex - 1) %
                                        (files.length + 1)) +
                                        (files.length + 1)) %
                                    (files.length + 1),
                      };
            case "toggle":
                return {
                    ...state,
                    selfieSegmentationActive: !state.selfieSegmentationActive,
                };
            case "jump":
                return {
                    ...state,
                    visualisationIndex: action.payload,
                };
            case "enableAnnotation":
                return {
                    ...state,
                    annotationEnabled: true,
                };
            case "disableAnnotation":
                return {
                    ...state,
                    annotationEnabled: false,
                };
            default:
                console.error("unknown action");
        }
    };

    const [state, dispatch] = useReducer(reducer, {
        visualisationIndex: 1,
        selfieSegmentationActive: true,
        annotationEnabled: false,
    });

    const timer = useRef({
        RIGHT_SWIPE: +new Date(),
        LEFT_SWIPE: +new Date(),
        TOGGLE: +new Date(),
        SWIPE_UP: +new Date(),
    });

    useEffect(() => {
        // Reference: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
        const convertKeydownKeyToAction = (event) => {
            if (event.defaultPrevented) {
                return; // Do nothing if the event was already processed
            }

            switch (event.key) {
                case "ArrowUp":
                    // go to home page, whose index is -1
                    dispatch({ type: "jump", payload: -1 });
                    analytics.logEvent("arrow_up", {
                        current_user_id: currentUser.uid,
                        current_visualisation: currentVisualisationType.current,
                        current_timestamp: Date.now(),
                    });
                    break;
                case "ArrowLeft":
                    dispatch({ type: "decrement" });
                    analytics.logEvent("arrow_left", {
                        current_user_id: currentUser.uid,
                        current_visualisation: currentVisualisationType.current,
                        current_timestamp: Date.now(),
                    });
                    break;
                case "ArrowRight":
                    dispatch({ type: "increment" });
                    analytics.logEvent("arrow_right", {
                        current_user_id: currentUser.uid,
                        current_visualisation: currentVisualisationType.current,
                        current_timestamp: Date.now(),
                    });
                    break;
                case " ":
                    if (!state.annotationEnabled) {
                        dispatch({ type: "enableAnnotation" });
                    }
                    break;
                default:
                    console.error("Unknown keybinding");
            }

            // Cancel the default action to avoid it being handled twice
            event.preventDefault();
        };

        const convertKeyupKeyToAction = (event) => {
            if (event.defaultPrevented) {
                return; // Do nothing if the event was already processed
            }

            switch (event.key) {
                case " ":
                    if (state.annotationEnabled) {
                        dispatch({ type: "disableAnnotation" });
                    }
                    break;
                default:
                    console.error("Unknown keybinding");
            }

            // Cancel the default action to avoid it being handled twice
            event.preventDefault();
        };

        document.addEventListener("keydown", convertKeydownKeyToAction);
        document.addEventListener("keyup", convertKeyupKeyToAction);
        return () => {
            document.removeEventListener("keydown", convertKeydownKeyToAction);
            document.removeEventListener("keyup", convertKeyupKeyToAction);
        };
    }, [state.annotationEnabled]);

    const convertGestureToAction = useCallback((predictionIndex) => {
        switch (predictionIndex) {
            case GESTURES.LEFT_SWIPE:
                // do rate limiting, do not execute the logic too often
                // only execute it once per second
                // this is because the gesture recognition model will be called each time the mediapipe hands model produces results
                const nowLeftSwipe = +new Date();
                if (nowLeftSwipe - timer.current.LEFT_SWIPE > 3000) {
                    timer.current.LEFT_SWIPE = nowLeftSwipe;
                    dispatch({ type: "decrement" });
                }
                analytics.logEvent("left_swipe", {
                    current_user_id: currentUser.uid,
                    current_visualisation: currentVisualisationType.current,
                    current_timestamp: Date.now(),
                });
                break;
            case GESTURES.RIGHT_SWIPE:
                const nowRightSwipe = +new Date();
                if (nowRightSwipe - timer.current.RIGHT_SWIPE > 3000) {
                    timer.current.RIGHT_SWIPE = nowRightSwipe;
                    dispatch({ type: "increment" });
                }
                analytics.logEvent("right_swipe", {
                    current_user_id: currentUser.uid,
                    current_visualisation: currentVisualisationType.current,
                    current_timestamp: Date.now(),
                });
                break;
            // since left & right swipe have the same behaviour, we can use fall-through
            case GESTURES.LEFT_SWIPE_UP:
            case GESTURES.RIGHT_SWIPE_UP:
                const nowSwipeUp = +new Date();
                if (nowSwipeUp - timer.current.SWIPE_UP > 3000) {
                    timer.current.SWIPE_UP = nowSwipeUp;
                    // go to home page, whose index is -1
                    dispatch({ type: "jump", payload: -1 });
                }
                analytics.logEvent("swipe_up", {
                    current_user_id: currentUser.uid,
                    current_visualisation: currentVisualisationType.current,
                    current_timestamp: Date.now(),
                });
                break;
            default:
                document.dispatchEvent(new CustomEvent("nogesture"));
        }
    }, []);

    const onSelfieResults = useCallback((results) => {
        if (canvasRef.current) {
            // the following two lines of code fix the resolution of the canvas
            canvasRef.current.width = webcamRef.current.video.videoWidth;
            canvasRef.current.height = webcamRef.current.video.videoHeight;

            const canvasCtx = canvasRef.current.getContext("2d");
            // https://stackoverflow.com/questions/50681592/getusermedia-mirror-image-instead-of-flip
            canvasCtx.setTransform(-1, 0, 0, 1, canvasRef.current.width, 0);
            canvasCtx.save();
            canvasCtx.clearRect(
                0,
                0,
                canvasRef.current.width,
                canvasRef.current.height
            );
            canvasCtx.drawImage(
                results.segmentationMask,
                0,
                0,
                canvasRef.current.width,
                canvasRef.current.height
            );

            // Only overwrite existing pixels (i.e. the segmentation mask)
            canvasCtx.globalCompositeOperation = "source-in";
            canvasCtx.drawImage(
                results.image,
                0,
                0,
                canvasRef.current.width,
                canvasRef.current.height
            );

            canvasCtx.restore();
        }
    }, []);

    // keep track of zoom scale
    const zoomProperty = useRef({ left: null, right: null, scale: null });
    // keep track of translate difference
    const panProperty = useRef({ x: null, y: null, difference: null });

    // NOTE: if there are two hands captured by the camera,
    // results.multiHandLandmarks[0] refers to the right hand &
    // results.multiHandLandmarks[1] refers to the left hand
    // due to the mirroring of the camera
    const onHandsResults = useCallback(
        (results) => {
            if (settings.drawHandLandmarks && handCanvasRef.current) {
                // the following two lines of code fix the resolution of the canvas
                handCanvasRef.current.width =
                    webcamRef.current.video.clientWidth;
                handCanvasRef.current.height =
                    webcamRef.current.video.clientHeight;
                const ctx = handCanvasRef.current.getContext("2d");
                // https://stackoverflow.com/questions/50681592/getusermedia-mirror-image-instead-of-flip
                ctx.setTransform(-1, 0, 0, 1, handCanvasRef.current.width, 0);
                drawHands(handCanvasRef, ctx, results);
            }

            // handle two handed gesture, i.e. zoom
            if (
                results.multiHandLandmarks[0] &&
                results.multiHandLandmarks[1]
            ) {
                const fingerPoseEstimation = results.multiHandLandmarks.map(
                    (landmarks) => estimateFingerPose(landmarks)
                );

                // only handle zoom if the gesture is enabled in the settings
                if (settings.zoomEnabled) {
                    const [rightZoomScore, leftZoomScore] =
                        fingerPoseEstimation.map((hand) =>
                            zoomDescription.matchAgainst(hand.fingerCurls, {})
                        );

                    if (
                        leftZoomScore >= settings.openHandAccuracy &&
                        rightZoomScore >= settings.openHandAccuracy
                    ) {
                        // if the previous gesture was not a zoom, initialise zoomProperty
                        if (
                            !zoomProperty.current.left &&
                            !zoomProperty.current.right &&
                            !zoomProperty.current.scale
                        ) {
                            // remember to flip left & right due to camera mirroring
                            zoomProperty.current.left =
                                results.multiHandLandmarks[1][0];
                            zoomProperty.current.right =
                                results.multiHandLandmarks[0][0];
                            zoomProperty.current.scale = 1.0;
                        }
                        // if the previous gesture was zoom, update scale
                        else {
                            // find euclidean distance between left and right palm
                            const currentDistance = Math.sqrt(
                                [
                                    // x
                                    results.multiHandLandmarks[0][0].x -
                                        results.multiHandLandmarks[1][0].x,
                                    // y
                                    results.multiHandLandmarks[0][0].y -
                                        results.multiHandLandmarks[1][0].y,
                                    // z
                                    results.multiHandLandmarks[0][0].z -
                                        results.multiHandLandmarks[1][0].z,
                                ]
                                    .map((uv) => uv * uv)
                                    .reduce(
                                        (prevVal, currVal) => prevVal + currVal,
                                        0
                                    )
                            );
                            const prevDistance = Math.sqrt(
                                [
                                    // x
                                    zoomProperty.current.left.x -
                                        zoomProperty.current.right.x,
                                    // y
                                    zoomProperty.current.left.y -
                                        zoomProperty.current.right.y,
                                    // z
                                    zoomProperty.current.left.z -
                                        zoomProperty.current.right.z,
                                ]
                                    .map((uv) => uv * uv)
                                    .reduce(
                                        (prevVal, currVal) => prevVal + currVal,
                                        0
                                    )
                            );

                            zoomProperty.current.scale =
                                1 +
                                (currentDistance - prevDistance) / prevDistance;
                            zoomProperty.current.left =
                                results.multiHandLandmarks[1][0];
                            zoomProperty.current.right =
                                results.multiHandLandmarks[0][0];
                        }

                        const vectorA = {
                            x:
                                (1 - zoomProperty.current.left.x) *
                                    displayWidth +
                                (window.innerWidth - displayWidth) / 2,
                            //  zoomProperty.current.left.y represents the point of the bottom of the palm
                            // results.multiHandLandmarks[1][9].y represents the point of the bottom of the middle finger
                            // (refer to https://google.github.io/mediapipe/images/mobile/hand_landmarks.png)
                            // get the middle point between the two points
                            y:
                                (zoomProperty.current.left.y +
                                    0.5 *
                                        (results.multiHandLandmarks[1][9].y -
                                            zoomProperty.current.left.y)) *
                                displayHeight,
                        };

                        const vectorB = {
                            x:
                                (1 - zoomProperty.current.right.x) *
                                    displayWidth +
                                (window.innerWidth - displayWidth) / 2,
                            y:
                                (zoomProperty.current.right.y +
                                    0.5 *
                                        (results.multiHandLandmarks[0][9].y -
                                            zoomProperty.current.right.y)) *
                                displayHeight,
                        };

                        const center = {
                            x: vectorA.x + 0.5 * (vectorB.x - vectorA.x),
                            y: vectorA.y + 0.5 * (vectorB.y - vectorA.y),
                        };

                        document.dispatchEvent(
                            new CustomEvent("zoom", {
                                detail: {
                                    scale: zoomProperty.current.scale,
                                    center,
                                },
                            })
                        );

                        analytics.logEvent("zoom", {
                            current_user_id: currentUser.uid,
                            current_visualisation:
                                currentVisualisationType.current,
                            current_timestamp: Date.now(),
                        });
                        // after zoom is performed, return. just like the other gestures
                        return;
                    }
                }

                // if selfie segmentation is not enabled, then don't bother to do the following gesture
                if (!settings.selfieSegmentationEnabled) return;

                if (settings.moveVisToBackgroundOrForegroundEnabled) {
                    // handle bringing the visualisation to the foreground or the background
                    const [rightToggleScore, leftToggleScore] =
                        fingerPoseEstimation.map((hand) =>
                            panDescription.matchAgainst(hand.fingerCurls, {})
                        );

                    if (
                        leftToggleScore >= settings.fistAccuracy &&
                        rightToggleScore >= settings.fistAccuracy
                    ) {
                        const nowToggle = +new Date();
                        if (nowToggle - timer.current.TOGGLE > 2000) {
                            timer.current.TOGGLE = nowToggle;
                            dispatch({ type: "toggle" });
                        }
                        analytics.logEvent(
                            "move_visualisation_to_background_or_foreground",
                            {
                                current_user_id: currentUser.uid,
                                current_visualisation:
                                    currentVisualisationType.current,
                                current_timestamp: Date.now(),
                            }
                        );
                        return;
                    }
                }

                // we still need this so that one-handed gesture won't be triggered if there are two hands
                return;
            }

            // if previous gesture was zoom & currently we are not using the zoom gesture,
            // reset the zoom property
            if (
                zoomProperty.current.left &&
                zoomProperty.current.right &&
                zoomProperty.current.scale
            ) {
                zoomProperty.current = { left: null, right: null, scale: null };
            }

            // handle one handed gesture, i.e. point & pan
            // if there is no left hand, results.multiHandLandmarks[0] refers to the right hand
            // if there is no right hand, results.multiHandLandmarks[0] refers to the left hand
            if (results.multiHandLandmarks[0]) {
                const { fingerCurls } = estimateFingerPose(
                    results.multiHandLandmarks[0]
                );

                const gestureDescriptions = [pointDescription, panDescription];
                const [maxScore, maxScoreIndex] = argmax(
                    gestureDescriptions.map((description) =>
                        description.matchAgainst(fingerCurls, {})
                    )
                );

                // handle highlight
                if (
                    maxScoreIndex === 0 &&
                    maxScore > settings.pointingAccuracy &&
                    settings.highlightEnabled
                ) {
                    document.dispatchEvent(
                        new MouseEvent("mousemove", {
                            clientX:
                                // (1 - x) since the camera is flipped
                                // * canvasRef.current.width to scale it within the canvas
                                // + (window.innerWidth - canvasRef.current.width) / 2 to take into account the gap between the canvas and the inner window
                                // (window.innerWidth - canvasRef.current.width) will result in 2 gaps
                                // so we need to divide it by 2
                                (1 - results.multiHandLandmarks[0][8].x) *
                                    displayWidth +
                                (window.innerWidth - displayWidth) / 2,
                            clientY:
                                results.multiHandLandmarks[0][8].y *
                                displayHeight,
                        })
                    );
                    analytics.logEvent("highlight", {
                        current_user_id: currentUser.uid,
                        current_visualisation: currentVisualisationType.current,
                        current_timestamp: Date.now(),
                    });
                    return;
                }

                // handle panning
                if (
                    maxScoreIndex === 1 &&
                    maxScore > settings.fistAccuracy &&
                    settings.panEnabled
                ) {
                    if (
                        !panProperty.current.x &&
                        !panProperty.current.y &&
                        !panProperty.current.difference
                    ) {
                        panProperty.current.x =
                            (1 - results.multiHandLandmarks[0][0].x) *
                                displayWidth +
                            (window.innerWidth - displayWidth) / 2;
                        panProperty.current.y =
                            results.multiHandLandmarks[0][0].y * displayHeight;
                        panProperty.current.difference = { x: 0, y: 0 };
                    } else {
                        panProperty.current.difference = {
                            x:
                                (1 - results.multiHandLandmarks[0][0].x) *
                                    displayWidth +
                                (window.innerWidth - displayWidth) / 2 -
                                panProperty.current.x,
                            y:
                                results.multiHandLandmarks[0][0].y *
                                    displayHeight -
                                panProperty.current.y,
                        };
                        panProperty.current.x =
                            (1 - results.multiHandLandmarks[0][0].x) *
                                displayWidth +
                            (window.innerWidth - displayWidth) / 2;
                        panProperty.current.y =
                            results.multiHandLandmarks[0][0].y * displayHeight;
                    }
                    document.dispatchEvent(
                        new CustomEvent("pan", {
                            detail: {
                                x:
                                    (1 - results.multiHandLandmarks[0][9].x) *
                                        displayWidth +
                                    (window.innerWidth - displayWidth) / 2,
                                y:
                                    results.multiHandLandmarks[0][9].y *
                                    displayHeight,
                                difference: panProperty.current.difference,
                            },
                        })
                    );
                    analytics.logEvent("pan", {
                        current_user_id: currentUser.uid,
                        current_visualisation: currentVisualisationType.current,
                        current_timestamp: Date.now(),
                    });
                    return;
                }

                // handle click and drag
                // needs its own threshold, which is > 8
                // if we use 7.5 as the threshold, then swiping will be considered as clicking and dragging because
                // the description of swiping and clicking & dragging overlaps
                // if we change FP_SCORE_THRESHOLD to 8, some pointing or panning might not be detected properly
                // since their accuracy can be below 8 so we can't change FP_SCORE_THRESHOLD & combine with the if condition above
                if (
                    clickDragDescription.matchAgainst(fingerCurls, {}) >
                        settings.okAccuracy &&
                    settings.clickDragEnabled
                ) {
                    document.dispatchEvent(
                        new CustomEvent("clickdrag", {
                            detail: {
                                x:
                                    (1 - results.multiHandLandmarks[0][8].x) *
                                        displayWidth +
                                    (window.innerWidth - displayWidth) / 2,
                                y:
                                    results.multiHandLandmarks[0][8].y *
                                    displayHeight,
                            },
                        })
                    );
                    analytics.logEvent("click_and_drag", {
                        current_user_id: currentUser.uid,
                        current_visualisation: currentVisualisationType.current,
                        current_timestamp: Date.now(),
                    });
                    return;
                }
            }

            // reset panProperty if the current gesture is not pan
            if (
                panProperty.current.x &&
                panProperty.current.y &&
                panProperty.current.difference
            ) {
                panProperty.current = { x: null, y: null, difference: null };
            }

            // handle swipe
            // if swipe is enabled & there is one hand on screen
            if (settings.swipeEnabled && results.multiHandLandmarks[0]) {
                const { fingerCurls } = estimateFingerPose(
                    results.multiHandLandmarks[0]
                );

                // if the hand is not open, do not enable swipe
                if (
                    zoomDescription.matchAgainst(fingerCurls, {}) <=
                    settings.openHandAccuracy
                ) {
                    document.dispatchEvent(new CustomEvent("nogesture"));
                    return;
                }
                const keypoints = extractKeypoints(results);

                sequences.current.push(keypoints);

                // get the last 30 frames for predictions
                sequences.current = sequences.current.slice(-30);

                if (sequences.current.length === 30) {
                    // get the distance from sequences.current to all other data in the dataset
                    const distanceList = dtwDataset.map((datum) => {
                        // more convenient for comparison purposes (without square root)
                        const squaredEuclideanDistance = (vectorA, vectorB) => {
                            let result = 0;
                            for (let i = 0; i < vectorA.length; i++) {
                                const term = vectorA[i] - vectorB[i];
                                result += term * term;
                            }
                            return result;
                        };
                        const dtw = new DynamicTimeWarping(
                            datum.sequence,
                            sequences.current,
                            squaredEuclideanDistance
                        );
                        return {
                            label: datum.label,
                            distance: dtw.getDistance(),
                        };
                    });

                    distanceList.sort((a, b) => {
                        if (a.distance < b.distance) {
                            return -1;
                        }
                        if (a.distance > b.distance) {
                            return 1;
                        }
                        return 0;
                    });

                    const { distance, label } = distanceList[0];

                    if (settings.showSwipingDistance)
                        console.log({ label, distance });

                    // we only need the last 15 predictions for prediction stability
                    if (predictions.current.length > 15) {
                        predictions.current = predictions.current.slice(-15);
                    }
                    const [values, counts] = unique(predictions.current);
                    // eslint-disable-next-line no-unused-vars
                    const [_, maxIndex] = argmax(counts);
                    if (
                        Number(values[maxIndex]) === Number(label) &&
                        distance < settings.swipingSensitivity
                    ) {
                        convertGestureToAction(label);
                    } else {
                        // when there is no gesture detected
                        document.dispatchEvent(new CustomEvent("nogesture"));
                    }
                    predictions.current.push(label);
                }
            } else {
                document.dispatchEvent(new CustomEvent("nogesture"));
            }
        },
        [convertGestureToAction, settings]
    );

    const hands = useRef(null);
    const selfieSegmentation = useRef(null);

    /**
     * Reference: https://stackoverflow.com/questions/67674453/how-to-run-mediapipe-facemesh-on-a-es6-node-js-environment-alike-react
     */
    useEffect(() => {
        if (hands.current) hands.current.close();
        if (selfieSegmentation.current) hands.current.close();

        // initialise hand pose detection model
        // the following is just a temporary fix, there was a problem with using the default URL
        // probably cause the file hasn't been updated yet
        // cause it can't find the hand detection model
        const handsFilesLoaded = [];
        hands.current = new Hands({
            // Reference: https://github.com/google/mediapipe/issues/2874
            // temporary fix to prevent the files being loaded twice, which may cause conflicts
            locateFile: (file) => {
                if (!handsFilesLoaded.includes(file)) {
                    handsFilesLoaded.push(file);
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@${HANDS_VERSION}/${file}`;
                }
            },
        });

        hands.current.setOptions({
            maxNumHands: 2,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
            modelComplexity: 1,
        });

        hands.current.onResults(onHandsResults);

        // if enabled, initialise and load selfie segmentation model
        if (settings.selfieSegmentationEnabled) {
            // initialise selfie segmentation model
            const selfieSegmentationFilesLoaded = [];
            selfieSegmentation.current = new SelfieSegmentation({
                // Reference: https://github.com/google/mediapipe/issues/2874
                // temporary fix to prevent the files being loaded twice, which may cause conflicts
                locateFile: (file) => {
                    if (!selfieSegmentationFilesLoaded.includes(file)) {
                        selfieSegmentationFilesLoaded.push(file);
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@${SELFIE_SEGMENTATION_VERSION}/${file}`;
                    }
                },
            });

            selfieSegmentation.current.setOptions({
                modelSelection: 1,
            });

            selfieSegmentation.current.onResults(onSelfieResults);

            // start the camera
            if (
                typeof webcamRef.current !== "undefined" &&
                webcamRef.current !== null
            ) {
                const camera = new Camera(webcamRef.current.video, {
                    onFrame: async () => {
                        await selfieSegmentation.current.send({
                            image: webcamRef.current.video,
                        });
                        await hands.current.send({
                            image: webcamRef.current.video,
                        });
                        // reference: https://github.com/google/mediapipe/issues/2115
                        if (!allModelLoaded) setAllModelLoaded(true);
                    },
                    facingMode: "user",
                    width: displayWidth,
                    height: displayHeight,
                });
                camera.start();
                return () => {
                    camera.stop();
                    hands.current.close();
                    selfieSegmentation.current.close();
                };
            }
        }
        // otherwise, only enable the hand detection model
        else {
            // start the camera
            if (
                typeof webcamRef.current !== "undefined" &&
                webcamRef.current !== null
            ) {
                const camera = new Camera(webcamRef.current.video, {
                    onFrame: async () => {
                        await hands.current.send({
                            image: webcamRef.current.video,
                        });
                        // reference: https://github.com/google/mediapipe/issues/2115
                        if (!allModelLoaded) setAllModelLoaded(true);
                    },
                    facingMode: "user",
                    width: displayWidth,
                    height: displayHeight,
                });
                camera.start();
                return () => {
                    camera.stop();
                    hands.current.close();
                };
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onHandsResults, onSelfieResults, settings]);

    // useEffect for adding listeners for annotation gestures
    useEffect(() => {
        if (state.annotationEnabled) {
            const handleDrawing = (event) => {
                analytics.logEvent("annotation_drawing", {
                    current_user_id: currentUser.uid,
                    current_visualisation: currentVisualisationType.current,
                    current_timestamp: Date.now(),
                });
                eraserCoord.current = null;
                if (!drawingCoord.current) {
                    drawingCoord.current = {
                        x:
                            event.clientX -
                            (window.innerWidth - displayWidth) / 2,
                        y: event.clientY,
                    };
                }
                const ctx = annotationCanvasRef.current.getContext("2d");
                ctx.globalCompositeOperation = "source-over";
                ctx.beginPath();
                ctx.lineWidth = settings.penSize;
                ctx.lineCap = "round";
                ctx.strokeStyle = "red";
                ctx.moveTo(drawingCoord.current.x, drawingCoord.current.y);
                drawingCoord.current.x =
                    event.clientX - (window.innerWidth - displayWidth) / 2;
                drawingCoord.current.y = event.clientY;
                ctx.lineTo(drawingCoord.current.x, drawingCoord.current.y);
                ctx.stroke();
            };

            const handleNotAnnotating = () => {
                drawingCoord.current = null;
                eraserCoord.current = null;
            };

            const handleErasing = (event) => {
                analytics.logEvent("annotation_erasing", {
                    current_user_id: currentUser.uid,
                    current_visualisation: currentVisualisationType.current,
                    current_timestamp: Date.now(),
                });
                drawingCoord.current = null;
                if (!eraserCoord.current) {
                    eraserCoord.current = {
                        x:
                            event.detail.x -
                            (window.innerWidth - displayWidth) / 2,
                        y: event.detail.y,
                    };
                }
                const ctx = annotationCanvasRef.current.getContext("2d");
                ctx.globalCompositeOperation = "destination-out";
                ctx.beginPath();
                ctx.lineWidth = settings.eraserSize;
                ctx.lineCap = "round";
                ctx.strokeStyle = "none";
                ctx.moveTo(eraserCoord.current.x, eraserCoord.current.y);
                eraserCoord.current.x =
                    event.detail.x - (window.innerWidth - displayWidth) / 2;
                eraserCoord.current.y = event.detail.y;
                ctx.lineTo(eraserCoord.current.x, eraserCoord.current.y);
                ctx.stroke();
            };

            document.addEventListener("mousemove", handleDrawing);
            document.addEventListener("clickdrag", handleNotAnnotating);
            document.addEventListener("nogesture", handleNotAnnotating);
            document.addEventListener("zoom", handleNotAnnotating);
            document.addEventListener("pan", handleErasing);
            return () => {
                document.removeEventListener("mousemove", handleDrawing);
                document.removeEventListener("clickdrag", handleNotAnnotating);
                document.removeEventListener("nogesture", handleNotAnnotating);
                document.removeEventListener("zoom", handleNotAnnotating);
                document.removeEventListener("pan", handleErasing);
            };
        } else {
            drawingCoord.current = null;
            eraserCoord.current = null;
        }
    }, [state.annotationEnabled, settings.penSize, settings.eraserSize]);

    return (
        <div>
            <Webcam
                ref={webcamRef}
                style={style}
                mirrored
                videoConstraints={videoConstraints}
                width={displayWidth}
                height={displayHeight}
            />
            {state.visualisationIndex === -1 ? (
                <HomePage
                    files={files}
                    jumpTo={(index) =>
                        dispatch({ type: "jump", payload: index })
                    }
                    annotationEnabled={state.annotationEnabled}
                />
            ) : (
                files
                    // index 0 will show a blank page
                    .filter(
                        (_, index) => state.visualisationIndex === index + 1
                    )
                    .map((file) => {
                        return (
                            <div key={file.id}>
                                {fileToChartComponent(
                                    file,
                                    state.annotationEnabled
                                )}
                            </div>
                        );
                    })
            )}
            {
                <canvas
                    ref={annotationCanvasRef}
                    style={style}
                    width={displayWidth}
                    height={displayHeight}
                />
            }
            {state.selfieSegmentationActive && (
                <canvas
                    ref={canvasRef}
                    style={style}
                    width={displayWidth}
                    height={displayHeight}
                />
            )}
            {settings.drawHandLandmarks && (
                <canvas
                    ref={handCanvasRef}
                    style={style}
                    width={displayWidth}
                    height={displayHeight}
                />
            )}
            {!allModelLoaded && (
                <div
                    style={{
                        ...style,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                    }}
                >
                    {<h1>Loading Model(s)...</h1>}
                </div>
            )}
        </div>
    );
};

export default Display;
