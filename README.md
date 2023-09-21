# Hanstreamer

## 1. Setting Up Hanstreamer on OBS

[Reference](https://opentitler.web.app)

1.  Download [OBS](https://obsproject.com/)
2.  Run obs with the `--use-fake-ui-for-media-stream` option ([Reference 1](https://obsproject.com/forum/threads/browser-source-doesnt-allow-microphone-consent-dialogs.80260/), [Reference 2](https://obsproject.com/forum/threads/using-browser-as-source-camera-mic-not-blocked-but-crossed-out-camera-image-on-obs-screen.123776/))
    -   on Windows,
        -   Move to the directory where OBS is installed, e.g. `cd "C:\Program Files\obs-studio\bin\64bit\"`
        -   Run OBS with the specified option, i.e. `.\obs64.exe --use-fake-ui-for-media-stream`
    -   on Mac,
        -   `/Applications/OBS.app/Contents/MacOS/OBS --use-fake-ui-for-media-stream`
3.  `Tools` > `Auto-Configuration Wizard` > `I will only be using the virtual camera`
4.  Copy the link to connect to the Display
5.  Click `+` under `Sources` > `Browser` > `Create New`
6.  Paste the URL & Enter 1280 as Width and 720 as Height, then press OK
    -   (OPTIONAL) tick `Use custom frame rate` and set `FPS` to 60 for smoother animation
    -   **NOTE**: you might need to login to access your display on OBS
    -   **NOTE**: if you want to change to another account, you also need to log out from your current account on OBS since OBS has its own browser
        1. Create a new Browser source
        2. Go to `/user`
        3. Click `Log Out`
7.  In `Sources` tab, right click on the Browser Source that you have just created & Select `Transform` > `Stretch to screen`
8.  In `Controls` tab, click `Start Virtual Camera`
9.  In your streaming software, e.g. Zoom, select 'OBS Virtual Camera'

## 2. Setting Up Firebase

[Reference](https://www.youtube.com/watch?v=PKwu15ldZ7k)

1. Create a new project on [Firebase console](https://console.firebase.google.com/)

### 2a. Setting Up Firebase Authentication

2. `Authentication` > `Sign-in method` > Enable `Email/Password`. **(OPTIONAL)** For production environment, remove `localhost` from Authorised domains
3. Go to `Project Overview` > Add a web app > Register your app
4. Create `.env.local` and copy `firebaseConfig` to the file as follows

```
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_AUTH_DOMAIN=...
REACT_APP_PROJECT_ID=...
REACT_APP_STORAGE_BUCKET=...
REACT_APP_MESSAGING_SENDER_ID=...
REACT_APP_APP_ID=...
```

5. `npm install firebase`
6. Create `firebase.js` in `src/` to setup firebase

### 2b. Setting Up Firebase Firestore

1. `Firestore Database` > `Create database` > `Start in test mode` > Select `Cloud Firestore location` > `Enable`
2. `Firestore Database` > `Rules` & edit the rules as follows

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
    	function authed() {
      	return request.auth != null
      }

      function matchesUser(data) {
      	return request.auth.uid == data.userId
      }

      function notUpdating(field) {
      	return !(field in request.resource.data) || resource.data[field] == request.resource.data[field]
      }

      // only allow read if user is logged in/authenticated and the data is owned by the authenticated user
      allow read: if authed() && matchesUser(resource.data)

      // only allow write if user is logged in/authenticated and the created data is owned by the authenticated user
      // prevent user from creating a new data on other users account
      allow create: if authed() && matchesUser(request.resource.data)

      // only allow delete if user is logged in/authenticated and the data is owned by the authenticated user
      allow delete: if authed() && matchesUser(resource.data)

      // don't allow update on userId of a resource, otherwise, user can take other users resource by changing the userId of that resource
      allow update: if authed() && matchesUser(resource.data) && notUpdating("userId")
    }
  }
}
```

### 2c. Setting Up Firebase Storage

1. `Firestore Storage` > `Rules` & edit the rules as follow

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Only the owner can upload and read the file
    match /files/{userId}/{fileName} {
      allow read, write: if request.auth.uid == userId;
    }

  }
}
```

### 2d. Dealing with Firebase Storage CORS

[Reference 1](https://stackoverflow.com/questions/37760695/firebase-storage-and-access-control-allow-origin/37765371), [Reference 2](https://firebase.google.com/docs/storage/web/download-files)

1. Open the [GCP console](https://console.cloud.google.com/)
2. Start a cloud terminal session by clicking the `>_` icon button (`Activate Cloud Shell`) in the top right corner of the navigation bar.
3. Click on the `Open editor` button
4. `File` > `New File` & name the new file `cors.json`
5. Write the following configuration on the file

```
[
  {
    "origin": ["*"],
    "method": ["GET"],
    "maxAgeSeconds": 3600
  }
]
```

6. Click `Open terminal` and run `gsutil cors set cors.json gs://hansroslinger-development.appspot.com`

## Useful Resources

1. http://vialab.science.uoit.ca/portfolio/dimpvis
2. https://codepen.io/klattman/pen/BOJWyX
3. http://bl.ocks.org/arthurwelle/01506d8136f6898b2123cd897b8ba59e
4. https://stackoverflow.com/questions/60476155/is-it-safe-to-use-ref-current-as-useeffects-dependency-when-ref-points-to-a-dom
5. https://medium.com/welldone-software/usecallback-might-be-what-you-meant-by-useref-useeffect-773bc0278ae
6. https://swizec.com/blog/the-two-ways-to-build-a-zoomable-dataviz-component-with-d3zoom-and-react/
