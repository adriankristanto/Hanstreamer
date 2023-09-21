import { GestureDescription, Finger, FingerCurl } from "fingerpose";

const clickDragDescription = new GestureDescription("clickDrag");

// thumb
clickDragDescription.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0);

// index finger
clickDragDescription.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
clickDragDescription.addCurl(Finger.Index, FingerCurl.HalfCurl, 1.0);

// middle finger
clickDragDescription.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);

// ring finger
clickDragDescription.addCurl(Finger.Ring, FingerCurl.NoCurl, 1.0);

// pinky finger
clickDragDescription.addCurl(Finger.Pinky, FingerCurl.NoCurl, 1.0);

export default clickDragDescription;
