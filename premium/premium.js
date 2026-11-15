/* =====================================================================
   פצצות אהבה · הקופסה — שכבת הגרסה המלאה.
   נטען אחרי הסקריפט של המשחק ועוטף את הפונקציות שלו. חוקי המשחק,
   מבנה הלוח והתורות לא משתנים כאן.
   ===================================================================== */
(function(){
const CFG=typeof LB_CONFIG==="object"?LB_CONFIG:{price:60,buyUrl:"",printKit:"../physical/",salt:""};
const HASHES=typeof LB_CODE_HASHES==="object"?LB_CODE_HASHES:new Set();
const CATS=["kiss","task","question","duel","tempt","drink"];
const CAT_IC={kiss:"💋",task:"🎯",question:"❔",duel:"⚔️",tempt:"❓",drink:"🥂"};
const CAT_NAME={kiss:"אינטימיות",task:"משימה",question:"שאלה"};
const LEVEL_NAME={1:"חמים",2:"לוהט",3:"מתפוצץ"};
const THEME_CAT={kiss:"kiss",task:"task",question:"question",duel:"duel",risk:"tempt"};

/* ---------- אחסון ---------- */
const STORE="pxBox";
function load(){try{const x=JSON.parse(localStorage.getItem(STORE)||"{}");return x&&typeof x==="object"?x:{}}catch(_e){return {}}}
const P=Object.assign({lic:null,custom:[],coupons:[]},load());
P.settings=Object.assign({hold:true,table:false,level:1,muted:false},P.settings||{});
if(!Array.isArray(P.custom))P.custom=[];
if(!Array.isArray(P.coupons))P.coupons=[];
function save(){try{localStorage.setItem(STORE,JSON.stringify(P))}catch(_e){}}
function owned(){return !!(P.lic&&P.lic.code)}
function today(){return new Date().toLocaleDateString("he-IL")}
function andName(n){n=String(n||"");return (/^[֐-׿]/.test(n)?"ו":"ו-")+n}
function vib(p){try{if(navigator.vibrate)navigator.vibrate(p)}catch(_e){}}
const TOTAL=CATS.reduce((n,c)=>n+LB_DECK[c].length,0);
const FREE_TOTAL=CATS.reduce((n,c)=>n+Math.min(LB_FREE_N[c],LB_DECK[c].filter(x=>x[0]===1).length),0);

/* ---------- צלילים (מסונתזים ב-WebAudio, בלי קבצים) ---------- */
const SFX=(()=>{
  let buf=null,fuse=null;
  const ctx=()=>Audio.ensure();
  function noise(a){
    if(!buf||buf.sampleRate!==a.sampleRate){buf=a.createBuffer(1,a.sampleRate*2,a.sampleRate);const d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
    const s=a.createBufferSource();s.buffer=buf;s.loop=true;return s;
  }
  function env(a,g,T,att,d,peak){g.gain.setValueAtTime(.0001,T);g.gain.exponentialRampToValueAtTime(peak,T+att);g.gain.exponentialRampToValueAtTime(.0001,T+d)}
  function tone(a,o){
    const {f=440,f2=0,t=0,d=.2,type="sine",g=.15,att=.006}=o,T=a.currentTime+t,osc=a.createOscillator(),v=a.createGain();
    osc.type=type;osc.frequency.setValueAtTime(f,T);if(f2)osc.frequency.exponentialRampToValueAtTime(f2,T+d);
    env(a,v,T,att,d,g);osc.connect(v);v.connect(a.destination);osc.start(T);osc.stop(T+d+.05);
  }
  function hiss(a,o){
    const {t=0,d=.2,g=.2,type="bandpass",f=2000,f2=0,q=1,att=.005}=o,T=a.currentTime+t,s=noise(a),fl=a.createBiquadFilter(),v=a.createGain();
    fl.type=type;fl.frequency.setValueAtTime(f,T);if(f2)fl.frequency.exponentialRampToValueAtTime(f2,T+d);fl.Q.value=q;
    env(a,v,T,att,d,g);s.connect(fl);fl.connect(v);v.connect(a.destination);s.start(T,Math.random());s.stop(T+d+.05);
  }
  const run=fn=>function(){const a=ctx();if(!a)return;try{fn(a)}catch(_e){}};
  const api={
    ui:run(a=>{tone(a,{f:520,d:.05,g:.06,type:"triangle"})}),
    tap:run(a=>{tone(a,{f:210,f2:120,d:.1,g:.3});hiss(a,{type:"lowpass",f:1800,d:.035,g:.14})}),
    flip:run(a=>{hiss(a,{f:3600,f2:1300,d:.13,g:.22,q:.7});hiss(a,{t:.1,f:2200,f2:900,d:.07,g:.12,q:.7})}),
    good:run(a=>{tone(a,{f:660,d:.14,g:.13,type:"triangle"});tone(a,{f:990,t:.09,d:.24,g:.13,type:"triangle"})}),
    bad:run(a=>{tone(a,{f:210,f2:105,d:.3,g:.16,type:"triangle"})}),
    bomb:run(a=>{hiss(a,{type:"highpass",f:2000,d:.07,g:.4});hiss(a,{type:"lowpass",f:1100,f2:60,d:1.2,g:.85,att:.01});tone(a,{f:130,f2:32,d:.9,g:.7,att:.01})}),
    win:run(a=>{[523,659,784,1047].forEach((f,i)=>tone(a,{f,t:i*.12,d:.3,g:.14,type:"triangle"}));tone(a,{f:1568,t:.5,d:.7,g:.09});tone(a,{f:2093,t:.58,d:.7,g:.05})}),
    clink:run(a=>{[2100,3150,4300].forEach(f=>tone(a,{f,d:.55,g:.06,att:.002}));[2400,3600].forEach(f=>tone(a,{f,t:.08,d:.5,g:.05,att:.002}))}),
    tick:run(a=>{tone(a,{f:1050,d:.04,g:.1,type:"square"})}),
    tear:run(a=>{hiss(a,{f:1200,f2:3400,d:.38,g:.3,q:.6})}),
    box:run(a=>{tone(a,{f:95,f2:55,d:.3,g:.5});hiss(a,{type:"lowpass",f:600,d:.2,g:.3})}),
    sparkle:run(a=>{[1320,1760,2217,2637].forEach((f,i)=>tone(a,{f,t:i*.07,d:.35,g:.07}))}),
    fuseStart(){const a=ctx();if(!a||fuse)return;try{const s=noise(a),f=a.createBiquadFilter(),g=a.createGain();f.type="bandpass";f.frequency.value=3000;f.Q.value=.8;g.gain.value=.0001;s.connect(f);f.connect(g);g.connect(a.destination);s.start();fuse={s,f,g,a}}catch(_e){fuse=null}},
    fuseLevel(p){if(!fuse)return;const T=fuse.a.currentTime;fuse.g.gain.setTargetAtTime(p>0?.03+.2*p:.01,T,.04);fuse.f.frequency.setTargetAtTime(3000+4500*p,T,.05)},
    fuseStop(){if(!fuse)return;const {s,g,a}=fuse;fuse=null;try{g.gain.setTargetAtTime(.0001,a.currentTime,.03);s.stop(a.currentTime+.25)}catch(_e){}}
  };
  return api;
})();
Audio.muted=!!P.settings.muted;
Audio.play=function(t){if(!this.ensure())return;(SFX[{tap:"ui"}[t]||t]||SFX.ui)()};

/* ---------- חפיסות: רמות חום, טעימה, קלפים אישיים ---------- */
const LV=new Map();
let last=null,fresh=false;
const keyOf=x=>typeof x==="string"?x:(x&&x.c)||"";
function applyDecks(){
  const lv=owned()?Math.max(1,Math.min(3,+P.settings.level||1)):1;
  LV.clear();
  CATS.forEach(cat=>{
    const src=LB_DECK[cat];
    const list=owned()?src.filter(c=>c[0]<=lv):src.filter(c=>c[0]===1).slice(0,LB_FREE_N[cat]);
    const out=list.map(c=>{LV.set(c[1],c[0]);return cat==="tempt"?{c:c[1]}:c[1]});
    if(owned())P.custom.filter(x=>x.cat===cat).forEach(x=>{const t="{actor}, "+x.t;LV.set(t,0);out.push(t)});
    DB[cat].length=0;DB[cat].push(...out);
  });
  renderDecks();
}
/* עוברים על כל החפיסה לפני שקלף חוזר */
pickNoRepeat=function(cat){
  const arr=DB[cat],h=S.history[cat]||(S.history[cat]=[]),seen=new Set(h.map(keyOf));
  let cand=arr.filter(x=>!seen.has(keyOf(x)));
  if(!cand.length){h.length=0;cand=arr.slice()}
  const v=cand[Math.floor(Math.random()*cand.length)];
  h.push(v);last={cat,key:keyOf(v)};renderDecks();return v;
};
function deckLeft(cat){const arr=DB[cat]||[],seen=new Set((S.history[cat]||[]).map(keyOf));const n=arr.filter(x=>!seen.has(keyOf(x))).length;return n||arr.length}
function renderDecks(){
  const L=$("deckL"),R=$("deckR");if(!L||!R)return;
  const mk=cat=>{const n=deckLeft(cat),th=Math.max(1,Math.min(4,Math.ceil(n/6)));return `<span class="dk" data-cat="${cat}" data-th="${th}"><i>${CAT_IC[cat]}</i><b>${n}</b></span>`};
  L.innerHTML=["kiss","task","question"].map(mk).join("");
  R.innerHTML=["duel","tempt"].concat(S.drink?["drink"]:[]).map(mk).join("");
}

/* ---------- שליפת קלף מהחפיסה ---------- */
function drawAnim(type){
  const cat=type==="temptation"?"tempt":type,src=document.querySelector(`.dk[data-cat="${cat}"]`);
  fresh=true;SFX.flip();
  if(rm()||!src||!src.animate)return wait(120);
  const r=src.getBoundingClientRect(),el=document.createElement("div"),w=Math.min(innerWidth*.56,230),h=w*1.4;
  el.className="fly-card";el.dataset.cat=cat;el.innerHTML=`<span>${CAT_IC[cat]}</span>`;
  el.style.cssText=`width:${w}px;height:${h}px;left:${innerWidth/2-w/2}px;top:${innerHeight/2-h/2}px`;
  document.body.appendChild(el);
  const dx=r.left+r.width/2-innerWidth/2,dy=r.top+r.height/2-innerHeight/2,s=r.width/w;
  const an=el.animate([
    {transform:`translate(${dx}px,${dy}px) scale(${s}) rotate(-8deg)`,opacity:.9},
    {transform:`translate(${dx*.3}px,${dy*.45-30}px) scale(.7) rotate(6deg)`,opacity:1,offset:.55},
    {transform:"perspective(900px) translate(0,0) scale(1) rotateY(90deg)",opacity:1}
  ],{duration:520,easing:"cubic-bezier(.22,.61,.36,1)",fill:"forwards"});
  const done=()=>el.remove();
  return an.finished.then(done,done);
}
const _resolveCell=resolveCell;
resolveCell=async function(cell){
  const t=cell.type;
  if(["kiss","task","question","duel","temptation"].includes(t)){cell.reveal=true;paint(cell);await drawAnim(t)}
  else if(t==="drink")SFX.clink();
  return _resolveCell(cell);
};

/* ---------- לחיצה ארוכה לחשיפת משבצת ---------- */
function holdToReveal(cell,actor){
  return new Promise(res=>{
    const pad=$("holdPad"),nav=$("moves"),el=cell.el,DUR=1150;
    let prog=0,down=false,lastT=performance.now(),lastV=0,raf=0,over=false;
    pad.hidden=false;nav.classList.add("holding");el.classList.add("await-hold");
    pad.style.setProperty("--pc",PCOL[actor]);pad.style.setProperty("--pcr",PRGB[actor]);
    pad.classList.toggle("flip180",!!P.settings.table&&actor===1);
    $("sr").textContent="החזיקו את הכפתור כדי לחשוף את המשבצת";
    SFX.fuseStart();
    const press=e=>{if(e.type==="keydown"){if(e.key!==" "&&e.key!=="Enter")return;if(e.repeat){e.preventDefault();return}}e.preventDefault();down=true;Audio.ensure();SFX.fuseStart()};
    const lift=e=>{if(e&&e.type==="keyup"&&e.key!==" "&&e.key!=="Enter")return;down=false};
    const noMenu=e=>e.preventDefault();
    const targets=[pad,el];
    targets.forEach(t=>{t.addEventListener("pointerdown",press);t.addEventListener("contextmenu",noMenu)});
    pad.addEventListener("keydown",press);pad.addEventListener("keyup",lift);
    window.addEventListener("pointerup",lift);window.addEventListener("pointercancel",lift);window.addEventListener("blur",lift);
    function finish(){
      if(over)return;over=true;cancelAnimationFrame(raf);
      targets.forEach(t=>{t.removeEventListener("pointerdown",press);t.removeEventListener("contextmenu",noMenu)});
      pad.removeEventListener("keydown",press);pad.removeEventListener("keyup",lift);
      window.removeEventListener("pointerup",lift);window.removeEventListener("pointercancel",lift);window.removeEventListener("blur",lift);
      pad.hidden=true;nav.classList.remove("holding");el.classList.remove("await-hold");
      pad.style.removeProperty("--p");el.style.removeProperty("--p");
      SFX.fuseStop();vib(45);SFX.flip();res();
    }
    function tick(now){
      const dt=Math.min(64,now-lastT);lastT=now;
      prog=Math.max(0,Math.min(1,prog+(down?dt/DUR:-dt/380)));
      pad.style.setProperty("--p",prog.toFixed(3));el.style.setProperty("--p",prog.toFixed(3));
      SFX.fuseLevel(down?prog:0);
      if(down&&now-lastV>Math.max(60,230-180*prog)){lastV=now;vib(10+Math.round(prog*18))}
      if(prog>=1){finish();return}
      raf=requestAnimationFrame(tick);
    }
    raf=requestAnimationFrame(tick);
    try{pad.focus({preventScroll:true})}catch(_e){}
  });
}
const _tileRevealFlow=tileRevealFlow;
tileRevealFlow=async function(cell,actor=S.cur){
  if(P.settings.hold&&cell&&!cell.reveal){S.actor=actor;await holdToReveal(cell,actor)}
  return _tileRevealFlow(cell,actor);
};

/* ---------- כלי משחק: קפיצה ונחיתה ---------- */
const _animateToken=animateToken;
animateToken=async function(i,r,c){
  const t=$("t"+i);t.classList.add("hop");
  try{await _animateToken(i,r,c)}finally{t.classList.remove("hop")}
  SFX.tap();vib(8);
};

/* ---------- הקלף עצמו: פינות, רמת חום, היפוך, מצב שולחן ---------- */
const _renderModalShell=renderModalShell;
renderModalShell=function(theme,kind,i,t){
  _renderModalShell(theme,kind,i,t);
  const mc=$("mcard"),cat=THEME_CAT[theme],face=!!cat;
  mc.classList.toggle("pface",face);
  mc.classList.toggle("pflip",face&&fresh&&!rm());
  if(!face)return;
  fresh=false;
  const ic=CAT_IC[cat];let badge="";
  if(last&&last.cat===cat&&LV.has(last.key)){const lv=LV.get(last.key);badge=`<span class="heat">${lv?"🔥".repeat(lv)+" "+LEVEL_NAME[lv]:"✍️ קלף אישי"}</span>`}
  $("mfx").insertAdjacentHTML("beforeend",`<span class="pip tl">${ic}</span><span class="pip br">${ic}</span>${badge}`);
};
const _pop=pop;
pop=function(){
  _pop.apply(this,arguments);
  const th=$("mcard").dataset.theme;
  modal.classList.toggle("flip180",!!P.settings.table&&S.players.length===2&&["kiss","task","question","risk"].includes(th)&&actorIndex()===1);
};
const _showTurnBanner=showTurnBanner;
showTurnBanner=function(i){$("turnBanner").classList.toggle("flip180",!!P.settings.table&&i===1);return _showTurnBanner(i)};
const _nextTurn=nextTurn;
nextTurn=function(){last=null;return _nextTurn()};
const _attachTimer=attachTimer;
attachTimer=function(){
  _attachTimer.apply(this,arguments);
  const out=$("mx").querySelector(".timer-display");if(!out||out._px)return;out._px=true;
  new MutationObserver(()=>{const v=out.textContent;if(/^\d+$/.test(v)&&+v<=3&&+v>0)SFX.tick()}).observe(out,{childList:true,characterData:true,subtree:true});
};

/* ---------- שוברי פרס ---------- */
let pick=null;
const _winHTML=winHTML;
winHTML=function(w,idx,rec,title,funny){
  let extra;
  if(owned()){
    const pool=shuffle(LB_COUPONS.map((_,k)=>k)).slice(0,3),verb=(W[w.gender]||W.f).choose;
    pick={opts:pool,done:false,owner:w.name,giver:(S.players[1-idx]||{}).name||""};
    extra=`<div class="cpn-pick"><div class="cpn-h">🎟️ ${esc(w.name)}, ${esc(verb)} שובר פרס</div><div class="cpn-row">${pool.map((_,k)=>`<button type="button" class="cpn-back" data-px="cpnPick" data-i="${k}" aria-label="שובר ${k+1}"><span>🎟️</span></button>`).join("")}</div></div>`;
  }else{
    pick=null;
    extra=`<div class="cpn-pick locked"><div class="cpn-h">🎟️ בקופסה המלאה, מי שמנצח שולף שובר פרס</div><button type="button" class="px-buy sm" data-px="paywall">לפתוח את הקופסה המלאה</button></div>`;
  }
  const base=_winHTML(w,idx,rec,title,funny),mark="<div class=\"win-meta\">";
  return base.includes(mark)?base.replace(mark,extra+mark):base+extra;
};

/* ---------- התחלת משחק, שחזור, הגדרות ---------- */
const _startGame=startGame;
startGame=function(){
  if($("game").classList.contains("show"))return;
  P.settings.level=owned()?(+$("heatLevel").value||1):1;save();applyDecks();pick=null;last=null;
  _startGame();renderDecks();
};
$("startBtn").onclick=startGame;
const _restoreSavedGame=restoreSavedGame;
restoreSavedGame=function(){const ok=_restoreSavedGame.apply(this,arguments);if(ok)renderDecks();return ok};
openSettings=function(){
  if(S.busy){toast("רגע, פעולה עדיין מתבצעת",900,"warn");return}
  pop("⚙️","הגדרות","",[
    {t:"חזרה למשחק",k:"resume",kindClass:"primary"},
    {t:Audio.muted?"🔇 סאונד כבוי":"🔈 סאונד פעיל",k:"pxMute"},
    {t:P.settings.hold?"👆 חשיפה: לחיצה ארוכה":"👆 חשיפה: מיידית",k:"pxHold"},
    {t:P.settings.table?"🪑 מצב שולחן: פעיל":"🪑 מצב שולחן: כבוי",k:"pxTable"},
    {t:"🎁 הקופסה שלנו",k:"pxBox"},
    {t:"📖 איך משחקים",k:"howToPlay"},{t:"🧭 מקרא סמלים",k:"symbols"},
    {t:"🏆 טבלת ניצחונות",k:"leaderboard"},{t:"📜 היסטוריית משחקים",k:"gameHistory"},
    {t:"✉️ שליחת משוב",k:"feedback",kindClass:"alt wide"},
    {t:"איפוס ניצחונות",k:"confirmResetWins",kindClass:"danger-ghost"},{t:"משחק חדש",k:"confirmNewGame",kindClass:"danger-ghost"}
  ],false);
};
$("settingsBtn").onclick=openSettings;
const _applyModalAction=applyModalAction;
applyModalAction=async function(k,v){
  if(v!==S.modalVersion)return;
  if(k==="pxMute"){P.settings.muted=!Audio.muted;Audio.setMuted(P.settings.muted);save();openSettings();return}
  if(k==="pxHold"){P.settings.hold=!P.settings.hold;save();openSettings();return}
  if(k==="pxTable"){P.settings.table=!P.settings.table;save();refreshHome();openSettings();return}
  if(k==="pxBox"){closeModal();S.busy=false;updateMoveButtons();showBox();return}
  return _applyModalAction(k,v);
};

/* =====================================================================
   מסכי הקופסה (גיליון מעל המשחק)
   ===================================================================== */
function sheetEl(){let el=$("pxSheet");if(!el){el=document.createElement("div");el.id="pxSheet";el.className="px-sheet";document.body.appendChild(el)}return el}
function sheetOpen(){const el=$("pxSheet");return !!el&&el.classList.contains("show")}
function sheet(html,opt={}){
  const el=sheetEl();
  el.innerHTML=`<div class="px-in ${opt.cls||""}" role="dialog" aria-modal="true" tabindex="-1">${opt.noClose?"":'<button type="button" class="px-x" data-px="close" aria-label="סגירה">✕</button>'}${html}</div>`;
  el.classList.add("show");el.scrollTop=0;
  const inn=el.firstElementChild;try{inn.focus({preventScroll:true})}catch(_e){}
  return inn;
}
function closeSheet(){const el=$("pxSheet");if(el){el.classList.remove("show");el.innerHTML=""}refreshHome()}
function note(msg,bad){const n=document.querySelector("#pxSheet .px-msg");if(n){n.textContent=msg;n.classList.toggle("bad",!!bad)}else toast(msg,1600,bad?"danger":"")}
window.addEventListener("keydown",e=>{if(!sheetOpen())return;if(/^Arrow/.test(e.key))e.stopPropagation();if(e.key==="Escape"){const x=document.querySelector("#pxSheet .px-x");if(x){e.stopPropagation();closeSheet()}}},true);

/* ---------- קוד פתיחה ---------- */
function normCode(s){
  const raw=String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
  return raw.length===12&&raw.startsWith("LOVE")?`LOVE-${raw.slice(4,8)}-${raw.slice(8)}`:String(s||"").trim().toUpperCase();
}
async function codeValid(code){
  try{
    const data=new TextEncoder().encode(CFG.salt+":"+code),buf=await crypto.subtle.digest("SHA-256",data);
    return HASHES.has([...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,"0")).join(""));
  }catch(_e){return false}
}
function b64e(obj){const b=new TextEncoder().encode(JSON.stringify(obj));let s="";b.forEach(x=>s+=String.fromCharCode(x));return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function b64d(str){const s=atob(str.replace(/-/g,"+").replace(/_/g,"/"));return JSON.parse(new TextDecoder().decode(Uint8Array.from(s,c=>c.charCodeAt(0))))}

function insideHTML(){
  return `<ul class="px-list">
    <li><span>🃏</span><div><b>${TOTAL} קלפים</b><small>במקום ${FREE_TOTAL} שבגרסת הטעימה</small></div></li>
    <li><span>🔥</span><div><b>שלוש רמות חום</b><small>חמים, לוהט ומתפוצץ</small></div></li>
    <li><span>🎟️</span><div><b>${LB_COUPONS.length} שוברי פרס</b><small>מי שמנצח שולף שובר ושומר אותו במגירה</small></div></li>
    <li><span>✍️</span><div><b>קלפים אישיים</b><small>כותבים קלפים משלכם והם נכנסים לחפיסה</small></div></li>
    <li><span>🖨️</span><div><b>ערכת הדפסה</b><small>לוח, אריחים, קלפים ושוברים להדפסה ביתית</small></div></li>
  </ul>`;
}
function showPaywall(){
  sheet(`<div class="px-hero">🎁</div><h2>הקופסה המלאה</h2><p class="px-sub">תשלום אחד, והקופסה שלכם לתמיד.</p>
    ${insideHTML()}
    <button type="button" class="px-buy" data-px="buy">לרכישה · ${CFG.price} ₪</button>
    <div class="px-or"><span>כבר קניתם?</span></div>
    <label class="px-fl" for="pxCode">קוד פתיחה</label>
    <div class="px-row"><input id="pxCode" class="px-inp ltr" placeholder="LOVE-XXXX-XXXX" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="go"><button type="button" class="px-btn" data-px="redeem">פתיחה</button></div>
    <p class="px-msg" role="status"></p>
    <button type="button" class="px-link" data-px="gift">רוצים לתת את הקופסה במתנה?</button>`);
  const inp=$("pxCode");if(inp)inp.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();ACT.redeem()}});
}
let pending=null;
function showNames(){
  const pre=(pending&&pending.names)||[$("n1").value.trim(),$("n2").value.trim()];
  sheet(`<div class="px-hero">🖊️</div><h2>של מי הקופסה?</h2><p class="px-sub">השמות ייכתבו על המכסה.</p>
    <label class="px-fl" for="pxN1">שם ראשון</label><input id="pxN1" class="px-inp" maxlength="16" autocomplete="off" value="${esc(pre[0]||"")}" placeholder="נועה">
    <label class="px-fl" for="pxN2">שם שני</label><input id="pxN2" class="px-inp" maxlength="16" autocomplete="off" value="${esc(pre[1]||"")}" placeholder="דניאל">
    <p class="px-msg" role="status"></p>
    <button type="button" class="px-buy" data-px="namesOk">להמשיך</button>`,{noClose:true});
}

/* ---------- פתיחת הקופסה ---------- */
function showUnbox(replay){
  const n=(P.lic&&P.lic.names)||["",""],lic=P.lic||{};
  const items=[["🗺️","לוח המשחק","46 אריחים נסתרים"],["💣","12 פצצות","מחכות בסבלנות"],["🃏",TOTAL+" קלפים","בשלוש רמות חום"],["🎟️",LB_COUPONS.length+" שוברי פרס","למי שמנצח"],["✍️","קלפים ריקים","לכתיבה שלכם"],["🖨️","ערכת הדפסה","למי שרוצה גם על השולחן"]];
  sheet(`<div class="ub" id="ub">
      <div class="ub-stage">
        <div class="ub-items">${items.map((x,k)=>`<div class="ub-it" style="--k:${k}"><span>${x[0]}</span><b>${esc(x[1])}</b><small>${esc(x[2])}</small></div>`).join("")}</div>
        <div class="ub-box" aria-hidden="true">
          <div class="ub-lid"><span class="ub-logo">פצצות <i>אהבה</i></span><span class="ub-own">הקופסה של ${esc(n[0])} ${esc(andName(n[1]))}</span></div>
          <div class="ub-base"><span>💣</span></div>
        </div>
      </div>
      <h2 class="ub-h">${replay?"הקופסה שלכם":"הקופסה הגיעה"}</h2>
      <p class="px-sub ub-p">${lic.from?`מתנה מ${esc(lic.from)}`:"רק שניכם, והמכסה."}</p>
      ${lic.note?`<blockquote class="ub-note">${esc(lic.note)}</blockquote>`:""}
      <button type="button" class="px-buy" data-px="ubOpen">לפתוח את הקופסה</button>
    </div>`,{noClose:true,cls:"px-unbox"});
}

/* ---------- מתנה ---------- */
function showGiftMaker(){
  sheet(`<div class="px-hero">💝</div><h2>לתת במתנה</h2><p class="px-sub">ממלאים הקדשה ומקבלים קישור אישי. מי שפותח אותו מקבל קופסה עטופה עם השמות שלו.</p>
    <label class="px-fl" for="pxGC">קוד הפתיחה של המתנה</label><input id="pxGC" class="px-inp ltr" placeholder="LOVE-XXXX-XXXX" autocomplete="off" autocapitalize="characters" spellcheck="false">
    <label class="px-fl" for="pxGT">למי?</label><input id="pxGT" class="px-inp" maxlength="40" autocomplete="off" placeholder="נועה ודניאל">
    <label class="px-fl" for="pxGF">ממי?</label><input id="pxGF" class="px-inp" maxlength="30" autocomplete="off" placeholder="אמא ואבא">
    <label class="px-fl" for="pxGN">הקדשה</label><textarea id="pxGN" class="px-inp" rows="3" maxlength="240" placeholder="שיהיה לכם ערב מתפוצץ"></textarea>
    <p class="px-msg" role="status"></p>
    <button type="button" class="px-buy" data-px="giftMake">ליצור קישור מתנה</button>
    <p class="px-fine">כל מתנה צריכה קוד פתיחה משלה. הקוד נמצא בתוך הקישור, אז שלחו אותו רק למי שהמתנה מיועדת לו.</p>`);
}
function readGift(){
  const m=location.hash.match(/^#g=([\w-]+)/);if(!m)return null;
  try{const g=b64d(m[1]);if(g&&typeof g.c==="string")return {c:g.c.slice(0,40),to:String(g.to||"").slice(0,40),f:String(g.f||"").slice(0,30),n:String(g.n||"").slice(0,240)}}catch(_e){}
  return null;
}
let gift=null;
function showGift(){
  sheet(`<div class="gift-wrap" aria-hidden="true"><span class="gift-box">🎁</span></div>
    <h2>${gift.to?`מתנה בשביל ${esc(gift.to)}`:"קיבלתם מתנה"}</h2>
    <p class="px-sub">${gift.f?`מ${esc(gift.f)}, באהבה.`:"מישהו חושב עליכם."}</p>
    <p class="px-msg" role="status"></p>
    <button type="button" class="px-buy" data-px="giftOpen">לפתוח את המתנה</button>`,{noClose:true,cls:"px-gift"});
}

/* ---------- קלפים אישיים ---------- */
function showCustom(){
  if(!owned()){showPaywall();return}
  const rows=P.custom.length?P.custom.map(x=>`<li><span class="cc-ic">${CAT_IC[x.cat]}</span><span class="cc-t">${esc(x.t)}</span><button type="button" class="cc-del" data-px="ccDel" data-id="${esc(x.id)}" aria-label="מחיקה">✕</button></li>`).join(""):`<li class="empty">עוד לא כתבתם קלפים. הראשון תמיד הכי מצחיק.</li>`;
  sheet(`<div class="px-hero">✍️</div><h2>הקלפים האישיים שלנו</h2><p class="px-sub">הקלפים נכנסים לחפיסה בכל רמת חום, ומסומנים כקלף אישי.</p>
    <div class="px-seg" id="pxCat">${["kiss","task","question"].map((c,k)=>`<button type="button" data-px="ccCat" data-cat="${c}" class="${k===1?"on":""}">${CAT_IC[c]} ${CAT_NAME[c]}</button>`).join("")}</div>
    <textarea id="pxCT" class="px-inp" rows="2" maxlength="120" placeholder="למשל: לספר על הפעם הראשונה שראית אותי"></textarea>
    <p class="px-msg" role="status"></p>
    <button type="button" class="px-btn wide" data-px="ccAdd">להוסיף לחפיסה</button>
    <ul class="cc-list">${rows}</ul>`);
}

/* ---------- מגירת השוברים ---------- */
function showDrawer(){
  if(!owned()){showPaywall();return}
  const list=P.coupons.slice().sort((a,b)=>(a.used?1:0)-(b.used?1:0)||b.ts-a.ts);
  const rows=list.length?list.map(c=>`<li class="tk-c${c.used?" used":""}" data-id="${esc(c.id)}">
      <span class="tk-ic">${esc(c.ic)}</span>
      <div class="tk-b"><b>${esc(c.t)}</b><small>של ${esc(c.owner)}${c.giver?` · מ${esc(c.giver)}`:""} · ${esc(c.date)}</small></div>
      ${c.used?`<span class="tk-used">מומש ${esc(c.usedDate||"")}</span>`:`<button type="button" class="tk-use" data-px="cpnUse" data-id="${esc(c.id)}">לממש</button>`}
    </li>`).join(""):`<li class="empty">המגירה ריקה. מנצחים במשחק, שולפים שובר, והוא מחכה כאן.</li>`;
  sheet(`<div class="px-hero">🎟️</div><h2>מגירת השוברים</h2><p class="px-sub">שובר שמומש נקרע ונשאר כאן למזכרת.</p><ul class="tk-list">${rows}</ul>`);
}

/* ---------- הדפסה ---------- */
function showPrint(){
  if(!owned()){showPaywall();return}
  const k=CFG.printKit||"";
  const files=[["rules.pdf","חוברת חוקים","2 עמודים"],["board-a4.pdf","לוח המשחק","2 דפי A4"],["board-a3.pdf","לוח המשחק","דף A3 אחד"],["tiles.pdf","אריחים","6 עמודים, דו־צדדי"],["cards.pdf","קלפים","28 עמודים, דו־צדדי"]];
  sheet(`<div class="px-hero">🖨️</div><h2>להדפסה</h2><p class="px-sub">מדפיסים בגודל מקורי (100%), בלי "התאמה לעמוד".</p>
    <button type="button" class="px-btn wide" data-px="printCoupons">🎟️ שוברי פרס להדפסה</button>
    <div class="px-or"><span>ערכת השולחן</span></div>
    <ul class="pf-list">${files.map(f=>`<li><a href="${esc(k+f[0])}" target="_blank" rel="noopener"><b>${f[1]}</b><small>${f[2]}</small><span>PDF</span></a></li>`).join("")}</ul>
    <p class="px-fine">ערכת השולחן היא גרסת אב־טיפוס עם חוקים משלה, והיא כוללת את קלפי הבסיס בלבד.</p>`);
}
function printCoupons(){
  let el=$("pxPrint");if(!el){el=document.createElement("div");el.id="pxPrint";document.body.appendChild(el)}
  const n=(P.lic&&P.lic.names)||["",""];
  el.innerHTML=`<h1>פצצות אהבה · שוברי פרס</h1><div class="pp-grid">${LB_COUPONS.map(c=>`<div class="pp-c"><span>${c[0]}</span><b>${esc(c[1])}</b><small>של: __________ · בתוקף עד שמממשים</small><i>פצצות אהבה${n[0]?` · ${esc(n[0])} ${esc(andName(n[1]))}`:""}</i></div>`).join("")}</div>`;
  document.body.classList.add("px-printing");
  const done=()=>{document.body.classList.remove("px-printing");window.removeEventListener("afterprint",done)};
  window.addEventListener("afterprint",done);
  setTimeout(()=>window.print(),60);
}

/* ---------- הקופסה שלנו ---------- */
function showBox(){
  if(!owned()){showPaywall();return}
  const n=P.lic.names||["",""],d=new Date(P.lic.ts||Date.now()).toLocaleDateString("he-IL");
  sheet(`<div class="px-hero">🎁</div><h2>הקופסה של ${esc(n[0])} ${esc(andName(n[1]))}</h2>
    <p class="px-sub">נפתחה ב־${esc(d)}${P.lic.from?` · מתנה מ${esc(P.lic.from)}`:""}</p>
    ${P.lic.note?`<blockquote class="ub-note">${esc(P.lic.note)}</blockquote>`:""}
    <div class="px-grid">
      <button type="button" class="px-tile" data-px="custom"><span>✍️</span><b>קלפים אישיים</b><small>${P.custom.length} בחפיסה</small></button>
      <button type="button" class="px-tile" data-px="drawer"><span>🎟️</span><b>מגירת השוברים</b><small>${P.coupons.filter(c=>!c.used).length} ממתינים</small></button>
      <button type="button" class="px-tile" data-px="print"><span>🖨️</span><b>להדפסה</b><small>שוברים וערכת שולחן</small></button>
      <button type="button" class="px-tile" data-px="install"><span>📲</span><b>התקנה</b><small>אייקון במסך הבית</small></button>
      <button type="button" class="px-tile" data-px="gift"><span>💝</span><b>לתת במתנה</b><small>קישור עם הקדשה</small></button>
      <button type="button" class="px-tile" data-px="unboxAgain"><span>📦</span><b>לפתוח שוב</b><small>את רגע פתיחת הקופסה</small></button>
    </div>
    <p class="px-fine">קוד הפתיחה שלכם: <span class="ltr">${esc(P.lic.code)}</span><br>שמרו אותו כדי לפתוח את הקופסה גם במכשיר אחר.</p>`);
}

/* ---------- התקנה למסך הבית ---------- */
let deferredInstall=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e});
function standalone(){return (window.matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true}
function showInstall(){
  if(standalone()){sheet(`<div class="px-hero">📲</div><h2>כבר מותקן</h2><p class="px-sub">המשחק פתוח עכשיו כאפליקציה.</p>`);return}
  if(deferredInstall){const ev=deferredInstall;deferredInstall=null;ev.prompt();return}
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  sheet(`<div class="px-hero">📲</div><h2>התקנה למסך הבית</h2>
    <ol class="px-steps">${ios?`<li>פתחו את הדף בספארי</li><li>לחצו על כפתור השיתוף</li><li>בחרו "הוסף למסך הבית"</li>`:`<li>פתחו את תפריט הדפדפן</li><li>בחרו "התקנת האפליקציה" או "הוספה למסך הבית"</li>`}</ol>
    <p class="px-fine">אחרי ההתקנה המשחק נפתח במסך מלא, וגם בלי חיבור לאינטרנט.</p>`);
}

/* ---------- מסך הבית והגדרות לפני משחק ---------- */
function setHeat(v){
  const inp=$("heatLevel"),g=document.querySelector('[data-for="heatLevel"]');if(!inp||!g)return;
  inp.value=String(v);
  g.querySelectorAll("button[data-v]").forEach(b=>{const on=b.dataset.v===String(v);b.classList.toggle("on",on);b.setAttribute("aria-checked",on?"true":"false");b.classList.toggle("locked",!owned()&&+b.dataset.v>1)});
}
function refreshHome(){
  const plate=$("pxPlate"),home=$("pxHome"),ex=$("pxExtras");
  if(plate){
    if(owned()){const n=P.lic.names||["",""];plate.innerHTML=`<span class="pl own">🎁 הקופסה של ${esc(n[0])} ${esc(andName(n[1]))}</span>`}
    else plate.innerHTML=`<span class="pl">גרסת טעימה · ${FREE_TOTAL} קלפים מתוך ${TOTAL}</span>`;
  }
  if(home)home.innerHTML=owned()
    ?`<button type="button" class="px-link" data-px="box">הקופסה שלנו</button>`
    :`<button type="button" class="px-buy" data-px="paywall">לפתוח את הקופסה המלאה · ${CFG.price} ₪</button><button type="button" class="px-link" data-px="paywall">יש לי קוד פתיחה</button>`;
  if(ex){
    const lock=owned()?"":'<em class="lk">🔒</em>';
    ex.innerHTML=`
      <button type="button" class="px-tile" data-px="custom"><span>✍️</span><b>קלפים אישיים</b><small>${owned()?P.custom.length+" בחפיסה":"בקופסה המלאה"}</small>${lock}</button>
      <button type="button" class="px-tile" data-px="drawer"><span>🎟️</span><b>מגירת השוברים</b><small>${owned()?P.coupons.filter(c=>!c.used).length+" ממתינים":"בקופסה המלאה"}</small>${lock}</button>
      <button type="button" class="px-tile${P.settings.table?" on":""}" data-px="table" aria-pressed="${P.settings.table?"true":"false"}"><span>🪑</span><b>מצב שולחן</b><small>${P.settings.table?"פעיל: הקלף מסתובב לשחקן 2":"כבוי: יושבים זה לצד זה"}</small></button>
      <button type="button" class="px-tile" data-px="${owned()?"box":"paywall"}"><span>🎁</span><b>${owned()?"הקופסה שלנו":"הקופסה המלאה"}</b><small>${owned()?"הדפסה, התקנה ומתנה":CFG.price+" ₪, פעם אחת"}</small></button>`;
  }
  setHeat(owned()?Math.max(1,Math.min(3,+P.settings.level||1)):1);
  if(owned()&&P.lic.names){["n1","n2"].forEach((id,k)=>{const el=$(id);if(el&&!el.value&&P.lic.names[k])el.value=P.lic.names[k]})}
}
const heatGroup=document.querySelector('[data-for="heatLevel"]');
if(heatGroup)heatGroup.addEventListener("click",e=>{const b=e.target.closest("button[data-v]");if(b&&+b.dataset.v>1&&!owned()){e.stopImmediatePropagation();e.preventDefault();showPaywall()}},true);
if(heatGroup)heatGroup.addEventListener("click",e=>{const b=e.target.closest("button[data-v]");if(b&&owned()){P.settings.level=+b.dataset.v||1;save();SFX.ui()}});

/* ---------- פעולות ---------- */
const ACT={
  close(){closeSheet()},
  paywall(){showPaywall()},
  box(){showBox()},
  custom(){showCustom()},
  drawer(){showDrawer()},
  print(){showPrint()},
  gift(){showGiftMaker()},
  install(){showInstall()},
  printCoupons(){printCoupons()},
  table(){P.settings.table=!P.settings.table;save();SFX.ui();refreshHome()},
  buy(){if(CFG.buyUrl){window.open(CFG.buyUrl,"_blank","noopener")}else note("הרכישה עוד לא נפתחה. יש לכם קוד? הזינו אותו כאן למטה.",true)},
  async redeem(){
    const code=normCode(($("pxCode")||{}).value);
    if(!code){note("הזינו את קוד הפתיחה",true);return}
    if(!(await codeValid(code))){note("הקוד לא מזוהה. בדקו שהקלדתם אותו נכון.",true);SFX.bad();return}
    pending={code};SFX.good();showNames();
  },
  namesOk(){
    const a=$("pxN1").value.trim(),b=$("pxN2").value.trim();
    if(!a||!b){note("כתבו את שני השמות",true);return}
    if(!pending)return;
    P.lic={code:pending.code,ts:Date.now(),names:[a,b],from:pending.from||"",note:pending.note||""};pending=null;save();
    applyDecks();refreshHome();showUnbox(false);
  },
  unboxAgain(){showUnbox(true)},
  ubOpen(btn){
    const ub=$("ub");if(!ub||ub.classList.contains("open"))return;
    btn.disabled=true;ub.classList.add("shake");SFX.box();vib([30,40,30]);
    setTimeout(()=>{ub.classList.remove("shake");ub.classList.add("open");SFX.flip();
      for(let k=0;k<6;k++)setTimeout(()=>{SFX.ui();vib(8)},420+k*170);
      setTimeout(()=>{SFX.sparkle();ub.querySelector(".ub-h").textContent="הקופסה שלכם פתוחה";ub.querySelector(".ub-p").textContent="הכול בפנים. נשאר רק לשחק.";btn.textContent="מתחילים לשחק";btn.dataset.px="ubDone";btn.disabled=false;
        try{const r=ub.getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height*.4,["❤️","💖","✨","💗","✦"],22,Math.min(innerWidth*.45,210))}catch(_e){}},1500);
    },520);
  },
  ubDone(){closeSheet();if(!$("game").classList.contains("show"))showSetup()},
  async giftMake(){
    const code=normCode($("pxGC").value),to=$("pxGT").value.trim(),f=$("pxGF").value.trim(),n=$("pxGN").value.trim();
    if(!(await codeValid(code))){note("קוד הפתיחה לא מזוהה",true);return}
    const url=location.origin+location.pathname+"#g="+b64e({c:code,to,f,n});
    sheet(`<div class="px-hero">💝</div><h2>המתנה מוכנה</h2>
      <div class="gift-card"><span class="gift-box sm">🎁</span><b>${to?`בשביל ${esc(to)}`:"מתנה"}</b>${f?`<small>מ${esc(f)}</small>`:""}${n?`<p>${esc(n)}</p>`:""}</div>
      <input id="pxGL" class="px-inp ltr" readonly value="${esc(url)}">
      <p class="px-msg" role="status"></p>
      <div class="px-row two">${navigator.share?'<button type="button" class="px-buy" data-px="giftShare">לשתף</button>':""}<button type="button" class="px-btn" data-px="giftCopy">להעתיק קישור</button></div>`);
  },
  async giftCopy(){const v=$("pxGL").value;try{await navigator.clipboard.writeText(v);note("הקישור הועתק")}catch(_e){$("pxGL").select();note("סמנו את הקישור והעתיקו אותו")}},
  async giftShare(){try{await navigator.share({title:"פצצות אהבה",text:"יש לכם מתנה 🎁",url:$("pxGL").value})}catch(_e){}},
  async giftOpen(){
    if(!gift)return;
    const code=normCode(gift.c);
    if(!(await codeValid(code))){note("הקישור לא תקין. בקשו ממי ששלח לשלוח אותו שוב.",true);return}
    try{history.replaceState(null,"",location.pathname+location.search)}catch(_e){}
    SFX.tear();
    if(owned()){sheet(`<div class="px-hero">💝</div><h2>${gift.f?`מ${esc(gift.f)}, באהבה`:"מתנה"}</h2>${gift.n?`<blockquote class="ub-note">${esc(gift.n)}</blockquote>`:""}<p class="px-sub">כבר יש לכם קופסה פתוחה במכשיר הזה.</p>`);gift=null;return}
    const parts=gift.to.split(/\s+ו-?/).map(s=>s.trim()).filter(Boolean);
    pending={code,from:gift.f,note:gift.n,names:[parts[0]||"",parts[1]||""]};gift=null;showNames();
  },
  ccCat(btn){document.querySelectorAll("#pxCat button").forEach(b=>b.classList.toggle("on",b===btn))},
  ccAdd(){
    const t=$("pxCT").value.replace(/\s+/g," ").trim(),on=document.querySelector("#pxCat button.on"),cat=on?on.dataset.cat:"task";
    if(t.length<4){note("כתבו את הקלף קודם",true);return}
    if(P.custom.length>=40){note("אפשר עד 40 קלפים אישיים",true);return}
    P.custom.push({id:"c"+Date.now().toString(36),cat,t});save();applyDecks();SFX.flip();showCustom();
  },
  ccDel(btn){P.custom=P.custom.filter(x=>x.id!==btn.dataset.id);save();applyDecks();showCustom()},
  cpnPick(btn){
    if(!pick||pick.done)return;pick.done=true;
    const c=LB_COUPONS[pick.opts[+btn.dataset.i]];
    P.coupons.push({id:"k"+Date.now().toString(36),ic:c[0],t:c[1],owner:pick.owner,giver:pick.giver,date:today(),ts:Date.now(),used:false});save();
    SFX.flip();setTimeout(()=>SFX.good(),260);vib(30);
    const row=btn.parentElement;row.querySelectorAll("button").forEach(b=>{b.disabled=true;if(b!==btn)b.classList.add("gone")});
    btn.classList.add("open");btn.innerHTML=`<span>${c[0]}</span><b>${esc(c[1])}</b>`;
    row.parentElement.querySelector(".cpn-h").textContent="🎟️ השובר נשמר במגירה";
  },
  cpnUse(btn){
    if(!btn.classList.contains("sure")){btn.classList.add("sure");btn.textContent="לקרוע?";return}
    const c=P.coupons.find(x=>x.id===btn.dataset.id);if(!c)return;
    const li=btn.closest("li");li.classList.add("tearing");SFX.tear();vib([20,30,60]);
    setTimeout(()=>{c.used=true;c.usedDate=today();save();showDrawer()},620);
  }
};
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-px]");if(!b||b.disabled)return;
  const fn=ACT[b.dataset.px];if(!fn)return;
  e.preventDefault();Audio.ensure();
  Promise.resolve(fn(b,e)).catch(err=>{console.error(err);note("משהו השתבש. נסו שוב.",true)});
});

/* ---------- אתחול ---------- */
applyDecks();
refreshHome();
gift=readGift();
if(gift){try{introFinish()}catch(_e){}showGift()}
if("serviceWorker" in navigator&&/^https?:$/.test(location.protocol)){window.addEventListener("load",()=>{navigator.serviceWorker.register("sw.js").catch(()=>{})})}
window.LBPX={P,applyDecks,refreshHome,showPaywall,showUnbox};
})();
