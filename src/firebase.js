// use the V8 name-spaced syntax for now, might need to refactor to V9 in the future
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";
import "firebase/compat/analytics";

const app = firebase.initializeApp({
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_PROJECT_ID,
    storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_APP_ID,
});

export const firestore = app.firestore();
export const database = {
    files: firestore.collection("files"),
    settings: firestore.collection("settings"),
    formatDoc: (doc) => {
        return { id: doc.id, ...doc.data() };
    },
    // for creating a timestamp on firebase, used to know when a file is created
    getCurrentTimestamp: firebase.firestore.FieldValue.serverTimestamp,
};
export const storage = app.storage();
export const auth = app.auth();
export default app;

export const analytics = app.analytics();
