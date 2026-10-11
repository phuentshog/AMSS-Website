import {
  GoogleAuthProvider,
  browserLocalPersistence,
  browserSessionPersistence,
  getRedirectResult,
  onAuthStateChanged,
  setPersistence,
  signInWithRedirect,
  signOut,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { auth, firebaseReady } from "./firebase.js";

const googleProvider = new GoogleAuthProvider();

async function requireFirebaseReady() {
  if (!auth || !(await firebaseReady)) {
    throw Object.assign(new Error("Firebase emulators are unavailable."), { code: "unavailable" });
  }
}

export async function watchAuth(callback, onError) {
  await requireFirebaseReady();
  return onAuthStateChanged(auth, callback, onError);
}

export async function beginGoogleSignIn(rememberThisDevice = false) {
  await requireFirebaseReady();
  await setPersistence(auth, rememberThisDevice ? browserLocalPersistence : browserSessionPersistence);
  await signInWithRedirect(auth, googleProvider);
}

export async function finishGoogleRedirect() {
  await requireFirebaseReady();
  return getRedirectResult(auth);
}

export async function logOut() {
  await requireFirebaseReady();
  return signOut(auth);
}
