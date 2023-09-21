/**
 * reference: https://github.com/andypotato/fingerpose
 */
import * as fp from "fingerpose";

const options = {
    // curl estimation
    HALF_CURL_START_LIMIT: 60.0,
    NO_CURL_START_LIMIT: 130.0,

    // direction estimation
    DISTANCE_VOTE_POWER: 1.1,
    SINGLE_ANGLE_VOTE_POWER: 0.9,
    TOTAL_ANGLE_VOTE_POWER: 1.6,
};

const estimateFingerPose = (landmarks) => {
    const fingerCurls = {};
    for (let finger of fp.Finger.all) {
        // start finger predictions from palm - except for thumb
        let pointIndexAt = finger === fp.Finger.Thumb ? 1 : 0;

        let fingerPointsAt = fp.Finger.getPoints(finger);
        let startPoint = landmarks[fingerPointsAt[pointIndexAt][0]];
        let midPoint = landmarks[fingerPointsAt[pointIndexAt + 1][1]];
        let endPoint = landmarks[fingerPointsAt[3][1]];

        // minor modification: instead of startPoint[0] to get the x-coordinate of the startPoint,
        // we use startPoint.x
        let start_mid_x_dist = startPoint.x - midPoint.x;
        let start_end_x_dist = startPoint.x - endPoint.x;
        let mid_end_x_dist = midPoint.x - endPoint.x;

        let start_mid_y_dist = startPoint.y - midPoint.y;
        let start_end_y_dist = startPoint.y - endPoint.y;
        let mid_end_y_dist = midPoint.y - endPoint.y;

        let start_mid_z_dist = startPoint.z - midPoint.z;
        let start_end_z_dist = startPoint.z - endPoint.z;
        let mid_end_z_dist = midPoint.z - endPoint.z;

        // get vector distance
        let start_mid_dist = Math.sqrt(
            start_mid_x_dist * start_mid_x_dist +
                start_mid_y_dist * start_mid_y_dist +
                start_mid_z_dist * start_mid_z_dist
        );
        let start_end_dist = Math.sqrt(
            start_end_x_dist * start_end_x_dist +
                start_end_y_dist * start_end_y_dist +
                start_end_z_dist * start_end_z_dist
        );
        let mid_end_dist = Math.sqrt(
            mid_end_x_dist * mid_end_x_dist +
                mid_end_y_dist * mid_end_y_dist +
                mid_end_z_dist * mid_end_z_dist
        );

        // cosine rule: find cos start_end_dist
        let cos_in =
            (mid_end_dist * mid_end_dist +
                start_mid_dist * start_mid_dist -
                start_end_dist * start_end_dist) /
            (2 * mid_end_dist * start_mid_dist);

        if (cos_in > 1.0) {
            cos_in = 1.0;
        } else if (cos_in < -1.0) {
            cos_in = -1.0;
        }

        let angleOfCurve = Math.acos(cos_in);

        // convert from radiant to degree
        angleOfCurve = (57.2958 * angleOfCurve) % 180;

        let fingerCurl;
        if (angleOfCurve > options.NO_CURL_START_LIMIT) {
            fingerCurl = fp.FingerCurl.NoCurl;
        } else if (angleOfCurve > options.HALF_CURL_START_LIMIT) {
            fingerCurl = fp.FingerCurl.HalfCurl;
        } else {
            fingerCurl = fp.FingerCurl.FullCurl;
        }

        fingerCurls[finger] = fingerCurl;
    }
    return { fingerCurls };
};

export default estimateFingerPose;
