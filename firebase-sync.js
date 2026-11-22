import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getDatabase, ref, get, onValue, runTransaction } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';

const config = {
  apiKey: 'AIzaSyAnHAMN0twfWtUDCPiHndlhvj3oTWenTN8',
  authDomain: 'saliya-enterprises-dbc2b.firebaseapp.com',
  databaseURL: 'https://saliya-enterprises-dbc2b-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'saliya-enterprises-dbc2b',
  storageBucket: 'saliya-enterprises-dbc2b.firebasestorage.app',
  messagingSenderId: '129938705415',
  appId: '1:129938705415:web:1ad8e02ae2a93e09e8eea2'
};
const app = initializeApp(config);
const auth = getAuth(app);
const database = getDatabase(app);
const cloudRef = ref(database, 'businessData');
const storageKey = 'saliya_manager_v2';
const listKeys = Object.keys(initial).filter(key => Array.isArray(initial[key]));
const copy = value => JSON.parse(JSON.stringify(value));
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const status = message => {
  const node = document.getElementById('firebaseSyncState');
  if (node) node.textContent = message;
};
function normalize(source) {
  const input = source && typeof source === 'object' ? source : {};
  const result = { ...copy(initial), ...input, settings: { ...initial.settings, ...(input.settings || {}) } };
  for (const key of listKeys) {
    const value = input[key];
    result[key] = Array.isArray(value) ? value : (value && typeof value === 'object' ? Object.values(value) : []);
  }
  return result;
}
function showData(value) {
  db = normalize(value);
  localStorage.setItem(storageKey, JSON.stringify(db));
  render();
}
function reconcile(remote, before, edited) {
  const result = normalize(remote);
  const old = normalize(before);
  const next = normalize(edited);
  for (const key of listKeys) {
    const prior = new Map(old[key].map(row => [row.id, row]));
    const changed = new Map(next[key].map(row => [row.id, row]));
    const combined = new Map(result[key].map(row => [row.id, row]));
    for (const id of prior.keys()) if (!changed.has(id)) combined.delete(id);
    for (const [id, row] of changed) {
      if (!prior.has(id) || !equal(prior.get(id), row)) combined.set(id, row);
    }
    result[key] = [...combined.values()];
  }
  for (const [key, value] of Object.entries(next.settings)) {
    if (!equal(old.settings[key], value)) result.settings[key] = value;
  }
  return result;
}
let connected = false;
let baseline = null;
let pending = 0;
let queue = Promise.resolve();
let detach = null;
let failed = false;
const localSave = save;

// Keep changes in the browser immediately, then synchronize each snapshot in order.
// Never report a cloud save until the transaction has actually committed.
save = function () {
  const snapshot = normalize(db);
  localSave();
  if (!connected || failed) {
    status('⚠️ Firebase Offline — Browser එකේ පමණක් Save වුණා');
    return;
  }
  pending += 1;
  status('⏳ Firebase වෙත Save කරමින්...');
  queue = queue.then(async () => {
    const before = copy(baseline);
    const result = await runTransaction(cloudRef, current => {
      if (!current || !current.payload) return;
      return { ...current, payload: reconcile(current.payload, before, snapshot), updatedAt: Date.now() };
    }, { applyLocally: false });
    if (!result.committed || !result.snapshot.val()?.payload) throw new Error('Cloud write was not committed');
    baseline = normalize(result.snapshot.val().payload);
    pending -= 1;
    if (pending === 0) {
      showData(baseline);
      status('✅ Firebase Database එකට Save වුණා');
    }
  }).catch(error => {
    failed = true;
    pending = 0;
    console.error('Firebase write failed:', error);
    status('❌ Firebase Save අසාර්ථකයි — Backup ගන්න');
    alert('Firebase Save අසාර්ථකයි: ' + error.message + '\nBackup JSON Download කරන්න. Refresh කරන්න එපා.');
  });
};

clearAllBusinessData = function () {
  alert('Shared Firebase Data ආරක්ෂාව සඳහා Clear All අක්‍රීය කර ඇත.');
};

async function begin() {
  status('⏳ Firebase Authentication සම්බන්ධ වෙමින්...');
  await signInAnonymously(auth);
  status('⏳ Firebase Database කියවමින්...');
  const snapshot = await get(cloudRef);
  let payload = snapshot.val()?.payload;
  if (!payload) {
    const local = normalize(db);
    const hasLocal = listKeys.some(key => local[key].length > 0);
    const message = hasLocal
      ? 'Cloud එකේ Data නැහැ. මේ Browser එකේ දත්ත Firebase එකට මුල් වරට Upload කරන්නද? මුලින් Backup JSON එකක් ගන්න.'
      : 'Cloud එකේ Data නැහැ. අලුත් Shared Database එකක් ආරම්භ කරන්නද?';
    if (!confirm(message)) {
      status('⚠️ Cloud Setup අවලංගු කළා');
      return;
    }
    const created = await runTransaction(cloudRef, current => {
      if (current?.payload) return;
      return { payload: local, updatedAt: Date.now() };
    }, { applyLocally: false });
    payload = created.snapshot.val()?.payload;
    if (!payload) {
      const latest = await get(cloudRef);
      payload = latest.val()?.payload;
    }
    if (!payload) throw new Error('Cloud initialization failed');
  }
  baseline = normalize(payload);
  // Existing Firebase data is authoritative; do not silently overwrite it with local demo data.
  // Download a Backup JSON before refreshing if local records differ from cloud records.
  if (!equal(normalize(db), baseline)) {
    const localHasRecords = listKeys.some(key => Array.isArray(db[key]) && db[key].length);
    if (localHasRecords) {
      const proceed = confirm('Browser දත්ත සහ Firebase දත්ත වෙනස්. Firebase දත්ත Load කිරීමට පෙර Browser දත්ත Backup JSON ලෙස Download කරගන්න. Backup ගත්තා නම් OK කරන්න.');
      if (!proceed) {
        status('⚠️ Backup ගෙන නැවත Refresh කරන්න');
        return;
      }
    }
  }
  showData(baseline);
  connected = true;
  status('☁️ Firebase Connected • Dashboard Updated');
  detach = onValue(cloudRef, snapshot => {
    const incoming = snapshot.val()?.payload;
    if (!incoming || pending || failed) return;
    baseline = normalize(incoming);
    if (!equal(normalize(db), baseline)) showData(baseline);
    status('☁️ Firebase Connected • Dashboard Updated');
  }, error => {
    console.error('Firebase realtime read failed:', error);
    status('❌ Firebase Read Error');
  });
}
begin().catch(error => {
  console.error('Firebase initialization failed:', error);
  status('❌ Firebase සම්බන්ධතාව අසාර්ථකයි');
  alert('Firebase සම්බන්ධතාව අසාර්ථකයි: ' + error.message);
});
