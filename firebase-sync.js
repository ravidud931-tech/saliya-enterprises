import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,signInAnonymously,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getDatabase,ref,get,set,onValue} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';
const config={apiKey:'AIzaSyAnHAMN0twfWtUDCPiHndlhvj3oTWenTN8',authDomain:'saliya-enterprises-dbc2b.firebaseapp.com',databaseURL:'https://saliya-enterprises-dbc2b-default-rtdb.asia-southeast1.firebasedatabase.app',projectId:'saliya-enterprises-dbc2b',storageBucket:'saliya-enterprises-dbc2b.firebasestorage.app',messagingSenderId:'129938705415',appId:'1:129938705415:web:1ad8e02ae2a93e09e8eea2'};
const app=initializeApp(config),auth=getAuth(app),rtdb=getDatabase(app),dataRef=ref(rtdb,'businessData');
let ready=false,writing=Promise.resolve(),remoteVersion='',ignoreRemote=false;
const overlay=document.createElement('div');overlay.id='cloudGate';overlay.innerHTML=`<div class="cloud-dialog"><h2>☁️ Saliya Firebase Sync</h2><p id="cloudStatus">Firebase සම්බන්ධ වෙමින්...</p><div id="cloudIdentity" style="display:none"><p>මෙම Browser එකේ Device ID:</p><code id="cloudUid"></code><button id="copyUid" class="btn light">📋 Copy ID</button><p class="muted">Firebase Rules වලට මේ ID එක ඇතුළත් කර Publish කරන්න. එවිට මේ Browser එකට පමණක් දත්ත කියවීමට සහ වෙනස් කිරීමට අවසර ලැබේ.</p><button id="retryCloud" class="btn">🔄 නැවත සම්බන්ධ කරන්න</button></div><div id="cloudImport" style="display:none"><p>Firebase Database එකේ තවම Business Data නැහැ. මේ Browser එකේ තිබෙන දත්ත Firebase එකට Upload කරන්නද?</p><button id="importCloud" class="btn gold">⬆ මේ Browser දත්ත Firebase වෙත Save කරන්න</button><button id="startEmpty" class="btn light">අලුත් හිස් Database එකක් පටන් ගන්න</button></div></div>`;
document.body.appendChild(overlay);
const status=s=>document.getElementById('cloudStatus').textContent=s;
const localSnapshot=()=>JSON.parse(localStorage.getItem('saliya_manager_v2')||'null');
const normalize=x=>({...structuredClone(initial),...x,settings:{...initial.settings,...(x?.settings||{})}});
const displayUID=()=>{document.getElementById('cloudIdentity').style.display='block';document.getElementById('cloudUid').textContent=auth.currentUser?.uid||''};
document.getElementById('copyUid').onclick=()=>navigator.clipboard.writeText(auth.currentUser.uid).then(()=>status('Device ID Copy වුණා'));
document.getElementById('retryCloud').onclick=()=>connect();
function cloudReady(snapshot){db=normalize(snapshot);localStorage.setItem('saliya_manager_v2',JSON.stringify(db));ready=true;overlay.remove();render();onValue(dataRef,snap=>{if(!ready)return;const value=snap.val();if(value?.payload){const incoming=JSON.stringify(value.payload);if(incoming!==JSON.stringify(db)){db=normalize(value.payload);localStorage.setItem('saliya_manager_v2',JSON.stringify(db));render();}}},err=>{console.error(err);alert('Firebase live sync error: '+err.message)})}
async function uploadInitial(data){status('Firebase වෙත පළමු දත්ත Save කරමින්...');try{await set(dataRef,{payload:normalize(data),updatedAt:Date.now()});cloudReady(data)}catch(e){status('Save අසාර්ථකයි: '+e.message);displayUID()}}
document.getElementById('importCloud').onclick=()=>uploadInitial(localSnapshot()||initial);
document.getElementById('startEmpty').onclick=()=>{if(confirm('මේ Browser එකේ දැනට තියෙන දත්ත Firebase එකට නොයවා හිස් Database එකක් පටන් ගන්නද? මුලින් Backup JSON ගන්න.'))uploadInitial(initial)};
async function connect(){status('Firebase Database පරීක්ෂා කරමින්...');try{const snap=await get(dataRef);if(snap.exists()&&snap.val()?.payload){cloudReady(snap.val().payload)}else{status('Firebase හිස්. පරණ Browser දත්ත Upload කරන්න හෝ අලුතින් පටන් ගන්න.');document.getElementById('cloudImport').style.display='block';document.getElementById('cloudIdentity').style.display='none'}}catch(e){status('Firebase අවසර නැහැ: '+e.message+' — පහළ Device ID එක Rules වලට දාන්න.');displayUID()}}
// Existing application uses save() for every create/edit/delete. Persist local cache and queue cloud writes.
const originalSave=save;
save=function(){if(!ready){alert('Firebase සම්බන්ධය තහවුරු වන තුරු ගනුදෙනු Save කරන්න බැහැ.');return}originalSave();const snapshot=structuredClone(db);writing=writing.then(()=>set(dataRef,{payload:snapshot,updatedAt:Date.now()})).catch(err=>{console.error('Cloud save failed',err);alert('⚠️ Firebase Save අසාර්ථකයි. Local Backup JSON ගන්න. '+err.message)});};
// Prevent accidental removal of all business data while connected to cloud.
clearAllBusinessData=function(){alert('Firebase දත්ත ආරක්ෂාව සඳහා Clear All අක්‍රීය කර ඇත. අවශ්‍ය Records එකින් එක Delete කරන්න.');};
status('Firebase Anonymous Authentication සම්බන්ධ වෙමින්...');
signInAnonymously(auth).then(()=>connect()).catch(e=>{status('Anonymous Authentication සක්‍රීය කරන්න: Firebase Console → Authentication → Sign-in method → Anonymous → Enable. '+e.message);});
