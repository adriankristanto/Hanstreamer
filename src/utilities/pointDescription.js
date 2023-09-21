import { GestureDescription, Finger, FingerCurl } from "fingerpose";

// describe pointing gesture
const pointDescription = new GestureDescription("point");

// thumb
pointDescription.addCurl(Finger.Thumb, FingerCurl.FullCurl, 1.0);
pointDescription.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 1.0);

// index finger
pointDescription.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);

// middle finger
pointDescription.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
pointDescription.addCurl(Finger.Middle, FingerCurl.HalfCurl, 0.9);

// ring finger
pointDescription.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
pointDescription.addCurl(Finger.Ring, FingerCurl.HalfCurl, 0.9);

// pinky finger
pointDescription.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
pointDescription.addCurl(Finger.Pinky, FingerCurl.HalfCurl, 0.9);

export default pointDescription;
