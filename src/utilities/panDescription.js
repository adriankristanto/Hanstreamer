import { GestureDescription, Finger, FingerCurl } from "fingerpose";

const panDescription = new GestureDescription("pan");

// thumb
panDescription.addCurl(Finger.Thumb, FingerCurl.FullCurl, 1.0);
panDescription.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 1.0);

// index finger
panDescription.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);

// middle finger
panDescription.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);

// ring finger
panDescription.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);

// pinky finger
panDescription.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);

export default panDescription;
