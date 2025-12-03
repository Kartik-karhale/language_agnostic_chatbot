// ✅ Firebase SDK imports (MODULE version)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ✅ Your Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyDXqFBD8JsWD_-49hGC9rZJzpA-9xDe6tg",
  authDomain: "chatbot-firebase-5e92b.firebaseapp.com",
  databaseURL: "https://chatbot-firebase-5e92b-default-rtdb.firebaseio.com",
  projectId: "chatbot-firebase-5e92b",
  storageBucket: "chatbot-firebase-5e92b.firebasestorage.app",
  messagingSenderId: "325631917942",
  appId: "1:325631917942:web:63f08c41af6d7195a98457",
  measurementId: "G-GDSZBWCKM2"
};

// ✅ Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// ✅ Initialize Firestore
export const db = getFirestore(app);
