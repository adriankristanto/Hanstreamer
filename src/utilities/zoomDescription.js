import { GestureDescription, Finger, FingerCurl } from "fingerpose";

const zoomDescription = new GestureDescription("zoom");

// thumb
zoomDescription.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0);

// index finger
zoomDescription.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);

// middle finger
zoomDescription.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);

// ring finger
zoomDescription.addCurl(Finger.Ring, FingerCurl.NoCurl, 1.0);

// pinky finger
zoomDescription.addCurl(Finger.Pinky, FingerCurl.NoCurl, 1.0);

export default zoomDescription;
