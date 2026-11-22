import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth,signInAnonymously} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getDatabase,ref,get,onValue,runTransaction} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';
const config={apiKey:'AIzaSyAnHAMN0twfWtUDCPiHndlhvj3oTWenTN8',authDomain:'saliya-enterprises-dbc2b.firebaseapp.com',databaseURL:'https://saliya-enterprises-dbc2b-default-rtdb.asia-southeast1.firebasedatabase.app',projectId:'saliya-enterprises-dbc2b',storageBucket:'saliya-enterprises-dbc2b.firebasestorage.app',messagingSenderId:'129938705415',appId:'1:129938705415:web:1ad8e02ae2a93e09e8eea2'};
const firebaseApp=initializeApp(config),auth=getAuth(firebaseApp),database=getDatabase(firebaseApp),dataRef=ref(database,'businessData');
const KEY='saliya_manager_v2';
const clone=x=>JSON.parse(JSON.stringify(x));
const normalize=x=>({...clone(initial),...(x||{}),settings:{...initial.settings,...(x?.settings||{})}});
let ready=false,unsub=null,queue=Promise.resolve(),pending=0,baseline=null,initializing=false;
const overlay=document.createElement('div');overlay.id='cloudGate';
overlay.innerHTML=`<div class="cloud-dialog"><h2>☁️ Saliya Firebase Sync</h2><p id="cloudStatus">Firebase සම්බන්ධ වෙමින්...</p><div id="cloudIdentity" style="display:none"><p>මෙම Browser එකේ Firebase User ID (UID):</p><code id="cloudUid" style="overflow-wrap:anywhere"></code><button id="copyUid" class="btn light">📋 Copy UID</button><p class="muted">Firebase connection එක පරීක්ෂා කරන්න.</p><button id="retryCloud" class="btn">🔄 නැවත සම්බන්ධ කරන්න</button></div><div id="cloudImport" style="display:none"><p>Firebase හි තවම දත්ත නැහැ. මුලින් Backup JSON ගන්න. මෙම Browser එකේ තිබෙන දත්ත Upload කරන්නද?</p><button id="importCloud" class="btn gold">⬆ මේ Browser දත්ත Upload කරන්න</button><button id="startEmpty" class="btn light">හිස් Database එකකින් පටන් ගන්න</button></div></div>`;
document.body.appendChild(overlay);
const status=s=>{const el=document.getElementById('cloudStatus');if(el)el.textContent=s};
const showUid=()=>{document.getElementById('cloudIdentity').style.display='block';document.getElementById('cloudUid').textContent=auth.currentUser?.uid||''};
const snapshotLocal=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const arrayKeys=Object.keys(initial).filter(k=>Array.isArray(initial[k]));
// Merge changes by record ID into the latest server state. This avoids whole-database overwrites
// when PC and phone create/edit/delete different records at the same time.
function mergeChanges(remote,base,edited){
 const result=normalize(remote),before=normalize(base),after=normalize(edited);
 for(const key of arrayKeys){
  const oldMap=new Map(before[key].map(x=>[x.id,x]));
  const newMap=new Map(after[key].map(x=>[x.id,x]));
  const server=new Map(result[key].map(x=>[x.id,x]));
  for(const [id,old] of oldMap)if(!newMap.has(id))server.delete(id);
  for(const [id,item] of newMap)if(!oldMap.has(id)||!equal(oldMap.get(id),item))server.set(id,item);
  result[key]=[...server.values()];
 }
 for(const [key,value] of Object.entries(after.settings))if(!equal(before.settings[key],value))result.settings[key]=value;
 return result;
}
function updateView(payload){db=normalize(payload);localStorage.setItem(KEY,JSON.stringify(db));render()}
function live(snapshot){
 if(!ready||pending>0)return;
 const value=snapshot.val()?.payload;
 if(value&&!equal(normalize(value),normalize(db))){baseline=normalize(value);updateView(value)}
}
function connected(payload){
 baseline=normalize(payload);updateView(payload);ready=true;overlay.remove();
 if(unsub)unsub();unsub=onValue(dataRef,live,e=>{console.error(e);alert('Firebase live sync අසාර්ථකයි: '+e.message)});
}
async function firstUpload(payload){
 if(initializing)return;initializing=true;status('Firebase වෙත දත්ත Save කරමින්...');
 try{
  // Never overwrite data that another device has already initialized.
  const result=await runTransaction(dataRef,current=>current?.payload?undefined:{payload:normalize(payload),updatedAt:Date.now()},{applyLocally:false});
  const saved=result.snapshot.val()?.payload;
  if(!saved)throw Error('Cloud data ලබාගැනීමට නොහැකි වුණා');
  connected(saved);
 }catch(e){status('Save අසාර්ථකයි: '+e.message);showUid()}
 finally{initializing=false}
}
document.getElementById('copyUid').onclick=async()=>{try{await navigator.clipboard.writeText(auth.currentUser.uid);status('Firebase UID Copy වුණා')}catch{status('UID එක select කර Copy කරන්න')}};
document.getElementById('retryCloud').onclick=connect;
document.getElementById('importCloud').onclick=()=>firstUpload(snapshotLocal()||initial);
document.getElementById('startEmpty').onclick=()=>{if(confirm('පරණ Browser Data නොගෙන හිස් Database එකකින් පටන් ගන්නද? මුලින් Backup ගන්න.'))firstUpload(initial)};
async function connect(){
 status('Firebase Database පරීක්ෂා කරමින්...');
 try{
  const result=await get(dataRef),value=result.val()?.payload;
  if(value)connected(value);
  else{status('Firebase හිස්. පරණ Browser Data Upload කරන්න හෝ හිස් Database එකක් පටන් ගන්න.');document.getElementById('cloudImport').style.display='block';document.getElementById('cloudIdentity').style.display='none'}
 }catch(e){status('Firebase Access නැහැ: '+e.message+'. Firebase Rules සහ Anonymous Authentication පරීක්ෂා කරන්න.');document.getElementById('cloudIdentity').style.display='block'}
}
const originalSave=save;
save=function(){
 if(!ready){alert('Firebase සම්බන්ධ වන තුරු Save කරන්න බැහැ.');return}
 const edited=normalize(db),base=normalize(baseline);
 originalSave();pending++;
 queue=queue.then(async()=>{
  try{
   const result=await runTransaction(dataRef,current=>{
    if(!current?.payload)return; // Never recreate an unexpectedly deleted cloud database.
    return {payload:mergeChanges(current.payload,base,edited),updatedAt:Date.now()};
   },{applyLocally:false});
   if(!result.committed)throw Error('Firebase transaction cancel වුණා');
   baseline=normalize(result.snapshot.val().payload);
  }catch(e){console.error('Firebase save failed',e);alert('⚠️ Firebase Save අසාර්ථකයි. Internet / Firebase Rules පරීක්ෂා කරන්න. Backup JSON එකක් ගන්න. '+e.message)}
  finally{
   pending--;
   if(pending===0){try{const latest=await get(dataRef);if(latest.val()?.payload){baseline=normalize(latest.val().payload);updateView(baseline)}}catch(e){console.warn('Refresh failed',e)}}
  }
 });
};
// Clear All is disabled: it would destroy shared cloud business data.
clearAllBusinessData=function(){alert('Cloud data ආරක්ෂාව සඳහා Clear All අක්‍රීය කර ඇත. Records Edit / Delete කරන්න.')};
status('Firebase Anonymous Authentication සම්බන්ධ වෙමින්...');
signInAnonymously(auth).then(connect).catch(e=>{status('Firebase Authentication → Sign-in method → Anonymous Enable කරන්න. '+e.message)});
