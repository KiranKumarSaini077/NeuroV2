import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAray3N6jOWozlZ9p07wNASK2iTlSttoHo",
  authDomain: "neurocalc-sync.firebaseapp.com",
  projectId: "neurocalc-sync",
  storageBucket: "neurocalc-sync.firebasestorage.app",
  messagingSenderId: "305617623141",
  appId: "1:305617623141:web:ec45ae3fb8f3f9804e0e8c",
  measurementId: "G-DGQ7FQ6VRC"
};

let app: firebase.app.App | null = null;
let db: firebase.firestore.Firestore | null = null;

function ensure() {
  if (app) return;
  app = firebase.initializeApp(firebaseConfig);
  db = app.firestore();
}

const DOC_PATH = 'neurocalc_data/main';

export async function readFromFirestore(): Promise<unknown | null> {
  try {
    ensure();
    const snap = await db!.doc(DOC_PATH).get();
    return snap.exists ? snap.data() : null;
  } catch { return null; }
}

export function listenToFirestore(callback: (data: unknown) => void): () => void {
  ensure();
  const unsub = db!.doc(DOC_PATH).onSnapshot((snap: firebase.firestore.DocumentSnapshot) => {
    if (snap.exists) callback(snap.data());
  });
  return unsub;
}

export async function writeToFirestore(data: unknown): Promise<void> {
  try {
    ensure();
    await db!.doc(DOC_PATH).set(data);
  } catch { /* silent */ }
}
