import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,signInAnonymously} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getDatabase,ref,get,onValue,runTransaction} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';

const config={apiKey:'AIzaSyAnHAMN0twfWtUDCPiHndlhvj3oTWenTN8',authDomain:'saliya-enterprises-dbc2b.firebaseapp.com',databaseURL:'https://saliya-enterprises-dbc2b-default-rtdb.asia-southeast1.firebasedatabase.app',projectId:'saliya-enterprises-dbc2b',storageBucket:'saliya-enterprises-dbc2b.firebasestorage.app',messagingSenderId:'129938705415',appId:'1:129938705415:web:1ad8e02ae2a93e09e8eea2'};
const firebaseApp=initializeApp(config),auth=getAuth(firebaseApp),database=getDatabase(firebaseApp);
const cloudRef=ref(database,'businessData');
const KEY='saliya_manager_v2';
const keys=Object.keys(initial).filter(k=>Array.isArray(initial[k]));
const clone=x=>JSON.parse(JSON.stringify(x));
function normalize(data){const source=data&&typeof data==='object'?data:{};const out={...clone(initial),...source,settings:{...initial.settings,...(source.settings||{})}};for(const k of keys)out[k]=Array.isArray(source[k])?source[k]:[];return out}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const status=s=>{const el=document.getElementById('firebaseSyncState');if(el)el.textContent=s};
let ready=false,baseline=null,working=false,dirty=false,unsub=null,writeQueue=Promise.resolve(),lastCloud=null;
function setView(data){db=normalize(data);localStorage.setItem(KEY,JSON.stringify(db));render()}
function merge(remote,before,after){const out=normalize(remote),old=normalize(before),now=normalize(after);for(const k of keys){const previous=new Map(old[k].map(r=>[r.id,r]));const current=new Map(now[k].map(r=>[r.id,r]));const merged=new Map(out[k].map(r=>[r.id,r]));for(const id of previous.keys())if(!current.has(id))merged.delete(id);for(const [id,row] of current)if(!previous.has(id)||!same(previous.get(id),row))merged.set(id,row);out[k]=[...merged.values()]};for(const [k,v] of Object.entries(now.settings))if(!same(old.settings[k],v))out.settings[k]=v;return out}
function cloudChanged(snapshot){const payload=snapshot.val()?.payload;if(!payload)return;lastCloud=normalize(payload);if(working||dirty)return;baseline=clone(lastCloud);if(!same(db,lastCloud))setView(lastCloud);status('☁️ Firebase Connected • Dashboard Updated')}
function startLive(data){baseline=normalize(data);setView(baseline);ready=true;status('☁️ Firebase Connected • Dashboard Updated');if(unsub)unsub();unsub=onValue(cloudRef,cloudChanged,e=>{status('❌ Firebase Read Error');console.error('Firebase realtime read error',e);alert('Firebase Read Error: '+e.message)})}
// Detect legacy records saved at the database root by older versions of the website.
async function readLegacy(){const snap=await get(ref(database));const value=snap.val()||{};const legacy={};let found=false;for(const k of keys){if(Array.isArray(value[k])){legacy[k]=value[k];if(value[k].length)found=true}else if(value[k]&&typeof value[k]==='object'){legacy[k]=Object.values(value[k]);if(legacy[k].length)found=true}}if(value.settings&&typeof value.settings==='object')legacy.settings=value.settings;return found?normalize(legacy):null}
async function initializeCloud(){status('⏳ Firebase Database පරීක්ෂා කරමින්...');const snap=await get(cloudRef);let cloud=snap.val()?.payload;let legacy=null;try{legacy=await readLegacy()}catch(e){console.warn('Legacy root read unavailable',e)}
 if(cloud){let normalized=normalize(cloud);if(legacy){const existing=new Set();for(const k of keys){existing.clear();for(const row of normalized[k])existing.add(row.id);for(const row of legacy[k])if(row.id&&!existing.has(row.id)){normalized[k].push(row);existing.add(row.id)}}if(!same(normalized,normalize(cloud))){status('⏳ පරණ සේවක දත්ත Cloud එකට එකතු කරමින්...');const result=await runTransaction(cloudRef,current=>{if(!current?.payload)return;const next=normalize(current.payload);for(const k of keys){const ids=new Set(next[k].map(x=>x.id));for(const row of legacy[k])if(row.id&&!ids.has(row.id)){next[k].push(row);ids.add(row.id)}}return {payload:next,updatedAt:Date.now()}},{applyLocally:false});if(result.committed)normalized=normalize(result.snapshot.val().payload)}}}startLive(normalized);return}
 const local=normalize(db);const hasLocal=keys.some(k=>local[k].length>0);const seed=legacy|| (hasLocal?local:normalize(initial));
 if(!confirm('Firebase හි අලුත් Shared Data එකක් ආරම්භ කරන්නද? '+(legacy?'පරණ Firebase Records හමු වුණා; ඒවා රැකගෙන Import කරනවා.':hasLocal?'මේ Browser එකේ දත්ත Cloud එකට Upload කරනවා.':'Database එක හිස්ව ආරම්භ වෙනවා.')))throw Error('Cloud setup අවලංගු කළා');
 status('⏳ Firebase මුල් දත්ත සකස් කරමින්...');const result=await runTransaction(cloudRef,current=>current?.payload?undefined:{payload:seed,updatedAt:Date.now()},{applyLocally:false});const final=result.snapshot.val()?.payload;if(!final)throw Error('Firebase data initialization failed');startLive(final)
}
// Original app's save() only writes localStorage. Intercept every record change,
// and update the shared Firebase transactionally. Never show a success toast before cloud confirms.
const originalSave=save;
save=function(){if(!ready){status('❌ Firebase තවම Connected නැහැ');alert('Firebase Connected වෙන තුරු Save කරන්න බැහැ.');return}const edited=normalize(db);originalSave();dirty=true;status('⏳ Firebase වෙත Save කරමින්...');writeQueue=writeQueue.then(async()=>{working=true;try{const before=normalize(baseline);const result=await runTransaction(cloudRef,current=>{if(!current?.payload)return;return {payload:merge(current.payload,before,edited),updatedAt:Date.now()}},{applyLocally:false});if(!result.committed)throw Error('Firebase write transaction cancelled');baseline=normalize(result.snapshot.val().payload);status('✅ Firebase Save වුණා');}catch(e){console.error('Firebase write failed:',e);status('❌ Firebase Save අසාර්ථකයි');alert('Firebase Save අසාර්ථකයි: '+e.message+'\nBackup JSON එකක් Download කරගන්න.')}finally{working=false}}).then(async()=>{ // Read back only after the most recent queued write.
  if(working)return;
  try{const snap=await get(cloudRef);if(snap.val()?.payload){lastCloud=normalize(snap.val().payload);baseline=clone(lastCloud);setView(lastCloud);status('☁️ Firebase Connected • Dashboard Updated')}}catch(e){console.error('Firebase refresh failed',e);status('⚠️ Firebase Refresh අසාර්ථකයි')}dirty=false;
 });return writeQueue};
clearAllBusinessData=function(){alert('Shared Firebase Data ආරක්ෂාව සඳහා Clear All අක්‍රීය කර ඇත. අවශ්‍ය Records පමණක් Delete කරන්න.')};
status('⏳ Firebase Authentication සම්බන්ධ වෙමින්...');
signInAnonymously(auth).then(initializeCloud).catch(e=>{console.error('Firebase initialization error:',e);status('❌ Firebase සම්බන්ධතාව අසාර්ථකයි');alert('Firebase සම්බන්ධතාව අසාර්ථකයි: '+e.message+'\nFirebase Rules සහ Anonymous Authentication පරීක්ෂා කරන්න.')});
