// ─────────────────────────────────────────────────────────────
//  Site configuration
// ─────────────────────────────────────────────────────────────
//
// 1. FIREBASE
//    Paste your Firebase web app config here
//    (Firebase console → Project settings → General → Your apps → Web app).
//    While apiKey is empty the site runs in DEMO MODE: everything is saved only
//    in your own browser, so you can try it out before going live.
//    These values are not secrets. What protects your data is firestore.rules.
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA8qpIk4JgX-XYOAixT1rn677l2zEb7mn8",
  authDomain: "mywebsite-37148.firebaseapp.com",
  projectId: "mywebsite-37148",
  storageBucket: "mywebsite-37148.firebasestorage.app",
  messagingSenderId: "258851237546",
  appId: "1:258851237546:web:ecbbaa000228a8334bead3",
};

// 2. OWNER
//    Who counts as the owner is decided only by firestore.rules (replace
//    REPLACE_WITH_YOUR_UID there). The site shows you your user ID the first
//    time you sign in.

// 3. DEFAULT PROFILE
//    Shown until you edit your profile on the site (Home → Edit profile).
export const DEFAULT_PROFILE = {
  name: "Husni Othman",
  tagline: "Building things, writing notes, taking photos.",
  bio: "Welcome to my corner of the internet. Here you'll find my **projects**, my **notes**, my **blog** and my **photos**. Leave a comment or send me a private message.",
  avatarUrl: "",
  avatarPath: "",
};
