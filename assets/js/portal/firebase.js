import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  connectAuthEmulator,
  getAuth,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getFirestore,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {
  firebaseConfig,
  firebaseEnvironment,
  isFirebaseConfigured,
  LOCAL_EMULATOR_PROJECT_ID,
} from "./firebase-config.js";

export { isFirebaseConfigured };

const AUTH_EMULATOR_HOST = "127.0.0.1";
const AUTH_EMULATOR_PORT = 9099;
const FIRESTORE_EMULATOR_HOST = "127.0.0.1";
const FIRESTORE_EMULATOR_PORT = 8080;

let app = null;
let auth = null;
let db = null;
let firebaseReady = Promise.resolve(false);

if (firebaseEnvironment.mode === "emulator") {
  // A local app uses only non-production identifiers and a fixed demo project.
  // The emulator connections are attached before either client is exported.
  const localConfig = {
    apiKey: "demo-api-key",
    authDomain: "localhost",
    projectId: LOCAL_EMULATOR_PROJECT_ID,
    appId: "1:0:web:amss-local-emulator",
    messagingSenderId: "0",
  };
  if (localConfig.projectId !== LOCAL_EMULATOR_PROJECT_ID) {
    throw new Error("Invalid local Firebase Emulator project.");
  }

  app = initializeApp(localConfig, "amss-portal-local-emulator");
  if (app.options.projectId !== LOCAL_EMULATOR_PROJECT_ID) {
    throw new Error("Local Firebase Emulator project verification failed.");
  }

  auth = getAuth(app);
  connectAuthEmulator(auth, `http://${AUTH_EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`, {
    disableWarnings: true,
  });

  db = getFirestore(app);
  connectFirestoreEmulator(db, FIRESTORE_EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);

  // Verify both local endpoints before pages allow sign-in or profile reads.
  // The Firestore probe is an expected-deny read against the local rules.
  firebaseReady = Promise.all([
    fetch(`http://${AUTH_EMULATOR_HOST}:${AUTH_EMULATOR_PORT}/emulator/v1/projects/${LOCAL_EMULATOR_PROJECT_ID}/config`, {
      cache: "no-store",
    }).then(async (response) => {
      if (!response.ok) throw new Error("Local Auth Emulator is unavailable.");
      const config = await response.json();
      if (!config?.signIn || typeof config.signIn.allowDuplicateEmails !== "boolean") {
        throw new Error("Local Auth Emulator returned an unexpected response.");
      }
    }),
    getDoc(doc(db, "amssLocalEmulatorHealth", "probe")).then(() => {
      throw new Error("Local Firestore Emulator rules did not deny the health probe.");
    }).catch((error) => {
      if (error?.code !== "permission-denied") throw error;
    }),
  ]).then(() => true).catch(() => false);
} else if (firebaseEnvironment.mode === "production") {
  // Production initialization is possible only through the separate verified
  // release branch. Local test settings never reach this branch.
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  firebaseReady = Promise.resolve(true);
}

export { app, auth, db, firebaseReady };
