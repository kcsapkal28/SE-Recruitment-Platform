// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"; // ← ADD THIS LINE

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAvT1JzYkgu34LDCgkH5TFXINMW-R5401w",
  authDomain: "ai-recruitment-platform.firebaseapp.com",
  projectId: "ai-recruitment-platform",
  storageBucket: "ai-recruitment-platform.firebasestorage.app",
  messagingSenderId: "1022017039878",
  appId: "1:1022017039878:web:0ea687dfbea9912a0edd87",
  measurementId: "G-QT548R4E2E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app); // ← ADD THIS LINE

// Export the Firebase modules you need
export { app, analytics, auth }; // ← ADD `auth` HERE
