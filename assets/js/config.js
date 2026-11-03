// ─────────────────────────────────────────────────────────────
//  Site configuration
// ─────────────────────────────────────────────────────────────
//
// 1. FIREBASE
//    Paste your Firebase web app config here
//    (Firebase console → Project settings → General → Your apps → Web app).
//    While apiKey is empty the site runs in DEMO MODE: everything is saved only
//    in your own browser, so you can try it out before going live.
//    These values are not secrets. What protects your data is
//    firestore.rules and storage.rules.
export const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

// 2. OWNER
//    Who counts as the owner is decided only by firestore.rules and
//    storage.rules (replace REPLACE_WITH_YOUR_UID in both files). The site
//    shows you your user ID the first time you sign in.

// 3. DEFAULT PROFILE
//    Shown until you edit your profile on the site (Home → Edit profile).
export const DEFAULT_PROFILE = {
  name: "Husni Othman",
  tagline: "Building things, writing notes, taking photos.",
  bio: "Welcome to my corner of the internet. Here you'll find my **projects**, my **notes**, my **blog** and my **photos**. Leave a comment or send me a private message.",
  avatarUrl: "",
  avatarPath: "",
};
