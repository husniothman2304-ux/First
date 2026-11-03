// Picks the data backend: Firebase when configured, otherwise a local demo
// that keeps everything in this browser's localStorage.
//
// Both backends export the same functions:
//   mode, onAuthChange, signIn, signOut,
//   getProfile, saveProfile,
//   listItems, getItem, saveItem, deleteItem,
//   listComments, addComment, deleteComment,
//   sendMessage, listMessages, setMessageRead, deleteMessage,
//   uploadImage, deleteUpload
import { FIREBASE_CONFIG } from './config.js';

export async function loadBackend() {
  if (FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey) {
    return import('./backend-firebase.js');
  }
  return import('./backend-demo.js');
}
