/* ── TRUE BALANCE EVENT APP ──────────────────────────────────────────── */
'use strict';

// ── Supabase ───────────────────────────────────────────────────────────────
const sb = supabase.createClient(
  'https://taejbxhgwyjfnswtipgy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZWpieGhnd3lqZm5zd3RpcGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NDk3NjcsImV4cCI6MjA5NjEyNTc2N30.UIktntHiCdAjLHzeCQvga8lEsn9guuYPcRSiWsdWQ38'
);

// ── Runtime state ──────────────────────────────────────────────────────────
let evs=[], RC={}, MC=[], DESIGNS=[];
let curEv=null, teamName='', teamCount=3, members=[], focIdx=0, cards=[];
let prevScreen='home';

// ── DB row → card object ───────────────────────────────────────────────────
function dbToCard(r){
  return {id:r.id,eventId:r.event_id,en:r.event_name,ed:r.event_date,
    fn:r.first_name,tn:r.team_name,eid:r.eid,lb:r.label,pc:r.pill_color,
    d:r.design,theme:r.theme,et:r.event_type,createdAt:r.created_at};
}

// ── Boot: fetch from Supabase ──────────────────────────────────────────────
async function boot(){
  const [{data:evData},{data:dsData},{data:pcData}] = await Promise.all([
    sb.from('events').select('*').eq('live',true),
    sb.from('card_designs').select('*').order('id'),
    sb.from('pill_colors').select('*')
  ]);

  evs = (evData||[]).map(e=>({
    id:e.id, type:e.type, live:e.live,
    title:e.title, subtitle:e.subtitle,
    startDate:e.start_date, endDate:e.end_date,
    registrationDeadline:e.registration_deadline,
    gradientFrom:e.gradient_from, gradientTo:e.gradient_to,
    tags:e.tags||[]
  }));

  RC={}; MC={};
  (pcData||[]).forEach(p=>{ if(p.type==='role') RC[p.label]=p.color; else MC[p.label]=p.color; });

  DESIGNS=(dsData||[]).map(d=>({
    id:d.id, patternBg:d.pattern_bg, patternPrimary:d.pattern_primary,
    patternSecondary:d.pattern_secondary, patternAccent:d.pattern_accent
  }));

  const img=document.getElementById('tb-logo');
  if(img) img.src=LOGO;
  rHome();
}

// ── Navigation ─────────────────────────────────────────────────────────────
function nav(id){
  document.querySelectorAll('.scr').forEach(s=>{
    if(s.id===id){s.classList.add('active');s.classList.remove('exit');}
    else{s.classList.remove('active');s.classList.add('exit');}
  });
  setTimeout(()=>document.querySelectorAll('.scr.exit').forEach(s=>s.classList.remove('exit')),300);
}

// ── Utility ────────────────────────────────────────────────────────────────
function fmtDate(d){
  if(!d) return '';
  const dt=new Date(d+'T00:00:00');
  return dt.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
}
function fmtDateShort(d){
  if(!d) return '';
  const dt=new Date(d+'T00:00:00');
  return dt.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'});
}
function fmtDateRange(s,e){
  const sd=new Date(s+'T00:00:00'), ed=new Date(e+'T00:00:00');
  const mo=sd.toLocaleDateString('en-GB',{month:'short'});
  if(s===e) return `${sd.getDate()} ${mo} ${sd.getFullYear()}`;
  if(sd.getMonth()===ed.getMonth())
    return `${sd.getDate()} – ${ed.getDate()} ${mo} ${sd.getFullYear()}`;
  return `${fmtDateShort(s)} – ${fmtDateShort(e)}`;
}

// ── Card ID generation: YYMM + 2 initials of team + member number ──────────
function makeCardId(teamOrDept, memberIdx, date){
  const d = date ? new Date(date+'T00:00:00') : new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth()+1).padStart(2,'0');
  // 2 initials: first letter of each word, take first 2
  const words = (teamOrDept||'XX').trim().split(/\s+/);
  const ini = words.length>=2
    ? (words[0][0]+words[1][0]).toUpperCase()
    : (teamOrDept.slice(0,2)).toUpperCase();
  return `${yy}${mm}${ini}${memberIdx+1}`;
}

// ── Save card to Supabase ──────────────────────────────────────────────────
async function saveCard(card){
  await sb.from('cards').upsert({
    id:card.id, event_id:card.eventId, event_name:card.en, event_date:card.ed,
    first_name:card.fn, team_name:card.tn, eid:card.eid, label:card.lb,
    pill_color:card.pc, design:card.d, theme:card.theme, event_type:card.et,
    created_at:card.createdAt
  });
}

// ── Cover pattern ──────────────────────────────────────────────────────────
function mkPattern(type){
  if(type==='party'){
    return "radial-gradient(circle 130px at 78% 55%, rgba(255,255,255,.30) 0%, rgba(255,255,255,.10) 55%, transparent 100%)";
  } else {
    return "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='160'%3E%3Crect x='210' y='18' width='150' height='88' rx='14' fill='rgba(255%2C255%2C255%2C0.18)' transform='rotate(-14 285 62)'/%3E%3C/svg%3E\")";
  }
}

// ── Home screen ────────────────────────────────────────────────────────────
function rHome(){
  const liveEvs = evs.filter(v=>v.live);
  document.getElementById('ev-list').innerHTML =
    liveEvs.map((v,i)=>`
    <div class="ecard" onclick="selEv('${v.id}')">
      <div class="ecard-cover" style="background:linear-gradient(135deg,${v.gradientFrom},${v.gradientTo})">
        <div class="ecard-cover-overlay"></div>
        <div class="ecard-cover-pat" style="background-image:${mkPattern(v.type)}"></div>
        <div class="ecard-cover-content">
          <div class="type-badge">${v.type.toUpperCase()}</div>
          <div class="ecard-title">${v.title}</div>
        </div>
      </div>
      <div class="ecard-body">
        <p class="ecard-sub">${v.subtitle}</p>
        <div class="ecard-tags">${v.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
        <div class="ecard-footer">
          <div class="ecard-dates">
            <b>${fmtDateRange(v.startDate,v.endDate)}</b><br>
            <span class="reg-due">Reg. by ${fmtDate(v.registrationDeadline)}</span>
          </div>
          <button class="btn-cta" onclick="event.stopPropagation();selEv('${v.id}')">Register</button>
        </div>
      </div>
    </div>`).join('') +
    `<div class="create-card" onclick="nav('create')">
      <div class="create-card-icon">+</div>
      <div class="create-card-text">
        <h4>Create an Event</h4>
        <p>Set up a hackathon, competition or party</p>
      </div>
    </div>`;
}

function selEv(id){
  const v = evs.find(e=>e.id===id);
  if(!v) return;
  curEv = {
    id:v.id, ti:v.title, s:fmtDateRange(v.startDate,v.endDate),
    t:v.type, theme:v.theme||'dark',
    sd:v.startDate
  };
  if(v.type==='hackathon'||v.type==='competition') rH1(v);
  else rP(v);
}

// ── Card lookup ────────────────────────────────────────────────────────────
async function lookupCard(){
  const val=document.getElementById('lookup-inp').value.trim().toUpperCase();
  if(!val) return;
  const {data,error}=await sb.from('cards').select('*').eq('id',val).maybeSingle();
  if(data){ cards=[dbToCard(data)]; sOv(cards); }
  else alert('Card ID "'+val+'" not found.');
}

// ── Hackathon flow ─────────────────────────────────────────────────────────
function rH1(v){
  document.getElementById('h1-title').textContent = v.title;
  document.getElementById('team-name').value='';
  teamCount=3;
  document.getElementById('count-pills').innerHTML =
    [2,3,4,5,6,7,8].map(n=>`<button class="cpill${n===3?' sel':''}" onclick="sCnt(this,${n})">${n}</button>`).join('');
  nav('hack1');
}
function sCnt(b,n){
  teamCount=n;
  document.querySelectorAll('.cpill').forEach(p=>{p.classList.remove('sel');});
  b.classList.add('sel');
}
function h1nx(){
  teamName=document.getElementById('team-name').value.trim();
  if(!teamName){document.getElementById('team-name').focus();return;}
  const roles=Object.keys(RC);
  members=Array.from({length:teamCount},()=>({n:'',r:roles[0],eid:''}));
  document.getElementById('h2-step').textContent=`Step 2 of 3 · ${teamName}`;
  document.getElementById('member-rows').innerHTML=
    members.map((_,i)=>`
    <div class="member-row">
      <div class="member-num">Member ${i+1}</div>
      <div style="display:flex;gap:8px">
        <input class="form-input" placeholder="First name" oninput="members[${i}].n=this.value" autocomplete="off" style="flex:1">
        <input class="form-input" placeholder="Emp. ID" oninput="members[${i}].eid=this.value" autocomplete="off" style="width:110px">
      </div>
      <div class="role-pills">${roles.map(r=>`
        <button class="rpill${r===roles[0]?' sel':''}"
          style="${r===roles[0]?'background:'+RC[r]+';border-color:'+RC[r]+';color:#fff':''}"
          onclick="sRole(this,${i},'${r}')">${r}</button>`).join('')}
      </div>
    </div>`).join('');
  nav('hack2');
}
function sRole(b,i,r){
  members[i].r=r;
  b.closest('.role-pills').querySelectorAll('.rpill').forEach(p=>{p.classList.remove('sel');p.style.cssText='';});
  b.classList.add('sel');b.style.background=RC[r];b.style.borderColor=RC[r];b.style.color='#fff';
}
function h2nx(){
  const rows=document.querySelectorAll('#member-rows .member-row');
  for(let i=0;i<members.length;i++){
    if(!members[i].n.trim()){rows[i].querySelector('input').focus();return;}
    if(!members[i].eid.trim()){rows[i].querySelectorAll('input')[1].focus();return;}
  }
  document.getElementById('h3-team').textContent=teamName;
  document.getElementById('h3-sub').textContent=`${teamCount} members`;
  document.getElementById('preview-list').innerHTML=
    members.map(m=>`<div class="preview-member">
      <div>
        <span class="preview-name">${m.n}</span>
        <span class="preview-eid">${m.eid}</span>
      </div>
      <span class="preview-role" style="background:${RC[m.r]}">${m.r}</span>
    </div>`).join('');
  nav('hack3');
}
async function gHack(){
  const oldIds=cards.map(c=>c.id);
  const eids=members.filter(m=>m.eid).map(m=>m.eid);
  let existing=[];
  if(eids.length){
    const {data}=await sb.from('cards').select('*').eq('event_id',curEv.id).in('eid',eids);
    existing=(data||[]).map(dbToCard);
  }
  cards=members.map((m,i)=>{
    const prev=m.eid ? existing.find(c=>c.eid===m.eid) : null;
    const id=prev?.id||oldIds[i]||makeCardId(teamName,i,curEv.sd);
    const card={id,eventId:curEv.id,en:curEv.ti,ed:curEv.s,fn:m.n,tn:teamName,eid:m.eid,
      lb:m.r,pc:RC[m.r],d:(i%3)+1,theme:curEv.theme||'dark',et:'h',
      createdAt:prev?.createdAt||new Date().toISOString()};
    saveCard(card);
    return card;
  });
  sOv(cards,'hack3');
}

// ── Party flow ─────────────────────────────────────────────────────────────
function rP(v){
  document.getElementById('p-title').textContent=v.title;
  document.getElementById('p-name').value='';
  document.getElementById('p-team').value='';
  const modes=Object.keys(MC);
  window._pmode=modes[0];
  document.getElementById('mode-pills').innerHTML=modes.map((m,i)=>`
    <button class="mpill${i===0?' sel':''}" onclick="sM(this,'${m}')"
      style="${i===0?'background:'+MC[m]+';border-color:'+MC[m]+';color:#fff':''}">
      ${m}
    </button>`).join('');
  nav('party');
}
function sM(b,mode){
  window._pmode=mode;
  document.querySelectorAll('.mpill').forEach(p=>{p.classList.remove('sel');p.style.cssText='';});
  b.classList.add('sel');
  b.style.background=MC[mode];b.style.borderColor=MC[mode];b.style.color='#fff';
}
function gParty(){
  const fn=document.getElementById('p-name').value.trim();
  const tn=document.getElementById('p-team').value.trim();
  if(!fn){document.getElementById('p-name').focus();return;}
  if(!tn){document.getElementById('p-team').focus();return;}
  const id=cards[0]?.id||makeCardId(tn,0,curEv.sd);
  const card={id,eventId:curEv.id,en:curEv.ti,ed:curEv.s,fn,tn,
    lb:window._pmode||'Flowy',pc:MC[window._pmode||'Flowy'],d:1,theme:curEv.theme||'dark',et:'p',createdAt:new Date().toISOString()};
  saveCard(card);
  cards=[card];
  sOv(cards,'party');
}

// ── Card overlay ───────────────────────────────────────────────────────────
function sOv(cardList, from){
  cards=cardList; focIdx=0; prevScreen=from||'home';
  document.getElementById('ovsc').innerHTML=cardList.map((_,i)=>
    `<div class="cv-wrap"><canvas id="cv${i}" width="512" height="853"
      style="width:100%;border-radius:16px;display:block;box-shadow:0 8px 40px rgba(0,0,0,.5)"></canvas></div>`
  ).join('');
  document.getElementById('ov-dots').innerHTML=cardList.map((_,i)=>
    `<div class="dot${i===0?' on':''}"></div>`).join('');
  const sc=document.getElementById('ovsc');
  sc.onscroll=()=>{
    const idx=Math.round(sc.scrollLeft/(sc.scrollWidth/cardList.length));
    if(idx!==focIdx){focIdx=idx;updDots();}
  };
  cardList.forEach((c,i)=>rc(c,`cv${i}`));
  document.getElementById('ov').classList.add('vis');
}
function updDots(){
  document.querySelectorAll('#ov-dots .dot').forEach((d,i)=>d.classList.toggle('on',i===focIdx));
}
function hOv(){
  document.getElementById('ov').classList.remove('vis');
  nav('home');
}
function editCards(){
  document.getElementById('ov').classList.remove('vis');
  nav(prevScreen);
}
function dlC(){
  const cv=document.getElementById(`cv${focIdx}`);
  const a=document.createElement('a');
  a.download=`id-card-${cards[focIdx]?.id||focIdx+1}.png`;
  a.href=cv.toDataURL('image/png');a.click();
}
async function shC(){
  const cv=document.getElementById(`cv${focIdx}`);
  cv.toBlob(async blob=>{
    const file=new File([blob],`id-card-${cards[focIdx]?.id||focIdx+1}.png`,{type:'image/png'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      try{await navigator.share({files:[file],title:'My ID Card'});}catch(e){}
    } else {
      const a=document.createElement('a');a.download=file.name;
      a.href=URL.createObjectURL(file);a.click();
    }
  },'image/png');
}

// ── Create event ───────────────────────────────────────────────────────────
let _crType='party',_crTheme='dark',_crMaxSize=4;
function rCreate(){
  document.getElementById('cr-name').value='';
  document.getElementById('cr-loc').value='';
  document.getElementById('cr-from').value='';
  document.getElementById('cr-to').value='';
  _crType='party';_crTheme='dark';_crMaxSize=4;
  document.getElementById('cr-maxsize-wrap').style.display='none';
  const pills=document.getElementById('cr-type-pills');
  pills.querySelectorAll('.tpill').forEach(p=>{p.classList.remove('sel');p.style.cssText='';});
  pills.querySelector('[data-t=party]').classList.add('sel');
  pills.querySelector('[data-t=party]').style.background='linear-gradient(135deg,#7C3AED,#1E0040)';
  document.getElementById('cr-maxsize-pills').innerHTML=
    [2,3,4,5,6,7,8].map(n=>`<button class="cpill${n===4?' sel':''}" onclick="sCrSz(this,${n})">${n}</button>`).join('');
  nav('create');
}
function setEvType(b,t){
  _crType=t;
  document.querySelectorAll('#cr-type-pills .tpill').forEach(p=>{p.classList.remove('sel');p.style.cssText='';});
  b.classList.add('sel');
  if(t==='party') b.style.background='linear-gradient(135deg,#7C3AED,#1E0040)';
  else if(t==='hackathon') b.style.background='linear-gradient(135deg,#FF7E01,#FF2D00)';
  else b.style.background='linear-gradient(135deg,#0EA5E9,#0C1A35)';
  document.getElementById('cr-maxsize-wrap').style.display=(t!=='party')?'block':'none';
}
function setTheme(b,t){
  _crTheme=t;
  document.querySelectorAll('.thpill').forEach(p=>p.classList.remove('sel'));
  b.classList.add('sel');
}
function sCrSz(b,n){
  _crMaxSize=n;
  document.querySelectorAll('#cr-maxsize-pills .cpill').forEach(p=>p.classList.remove('sel'));
  b.classList.add('sel');
}
async function gCreate(){
  const name=document.getElementById('cr-name').value.trim();
  const from=document.getElementById('cr-from').value;
  const to=document.getElementById('cr-to').value||from;
  if(!name||!from){return;}
  const gfMap={party:'#7B2FBE',hackathon:'#FF5800',competition:'#0EA5E9'};
  const gtMap={party:'#1A0A2E',hackathon:'#2A1500',competition:'#0C1A35'};
  const newEv={
    id:'c'+Date.now(),type:_crType,title:name,subtitle:'',
    startDate:from,endDate:to,
    registrationDeadline:from,
    gradientFrom:gfMap[_crType],gradientTo:gtMap[_crType],
    tags:[],live:true,theme:_crTheme,maxTeamSize:_crMaxSize
  };
  await sb.from('events').insert({
    id:newEv.id, type:newEv.type, live:true,
    title:newEv.title, subtitle:newEv.subtitle,
    start_date:newEv.startDate, end_date:newEv.endDate,
    registration_deadline:newEv.registrationDeadline,
    gradient_from:newEv.gradientFrom, gradient_to:newEv.gradientTo,
    tags:newEv.tags
  });
  evs.push(newEv);
  rHome();
  nav('home');
}

// ── Image loader ───────────────────────────────────────────────────────────
function loadImg(src){
  return new Promise(res=>{
    const i=new Image();
    i.onload=()=>res(i);i.onerror=()=>res(null);i.src=src;
  });
}

// ── ID card canvas renderer ────────────────────────────────────────────────
async function rc(c,cvId){
  await document.fonts.ready;
  const cv=document.getElementById(cvId);
  const ctx=cv.getContext('2d');
  const W=512,H=853;
  ctx.clearRect(0,0,W,H);

  const TH=400;
  ctx.fillStyle='#FFFFFF'; ctx.fillRect(0,0,W,TH);

  // "True Balance" top-left
  ctx.textBaseline='top';ctx.textAlign='left';
  ctx.font='700 22px "Bricolage Grotesque",sans-serif';
  const twTrue=ctx.measureText('True ').width;
  ctx.fillStyle='#FF5500'; ctx.fillText('True ',32,28);
  ctx.fillStyle='#111111'; ctx.fillText('Balance',32+twTrue,28);
  ctx.font='400 14px Inter,sans-serif';
  ctx.fillStyle='#888888'; ctx.fillText(c.en,32,58);

  // Logo top-right
  const logoImg=await loadImg(LOGO);
  const lSz=54;
  if(logoImg) ctx.drawImage(logoImg,W-32-lSz,20,lSz,lSz);

  // Role / mode pill
  ctx.font='600 15px Inter,sans-serif'; ctx.textBaseline='middle';
  const pT=c.lb, pW=ctx.measureText(pT).width+44, pH=40, pX=32, pY=152;
  ctx.fillStyle=c.pc; ctx.beginPath(); ctx.roundRect(pX,pY,pW,pH,20); ctx.fill();
  ctx.fillStyle='#fff'; ctx.fillText(pT,pX+22,pY+pH/2);

  // Name
  ctx.textBaseline='alphabetic'; ctx.textAlign='left'; ctx.fillStyle='#0A0A0A';
  const nfs=c.fn.length>10?54:c.fn.length>7?66:82;
  ctx.font=`800 ${nfs}px "Bricolage Grotesque",sans-serif`;
  ctx.fillText(c.fn,32,274);

  // Team
  ctx.font='700 20px "Bricolage Grotesque",sans-serif'; ctx.fillStyle='#111111';
  ctx.fillText(c.tn,32,310);

  // Employee ID
  if(c.eid){
    ctx.font='500 13px Inter,sans-serif'; ctx.fillStyle='#AAAAAA';
    ctx.textBaseline='top'; ctx.fillText(c.eid,32,320);
  }

  // Date
  ctx.font='400 13px Inter,sans-serif'; ctx.fillStyle='#BBBBBB';
  ctx.textBaseline='top'; ctx.fillText(c.ed,32,344);

  // Card ID (bottom of white zone)
  ctx.font='500 11px Inter,sans-serif'; ctx.fillStyle='rgba(0,0,0,0.25)';
  ctx.textAlign='right';
  ctx.fillText(c.id||'',W-32,TH-18);

  // Separator
  ctx.strokeStyle='rgba(0,0,0,0.07)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(0,TH); ctx.lineTo(W,TH); ctx.stroke();

  // Pattern zone
  dpat(ctx,c.d,W,TH,H-TH);

  // Card ID watermark — big Bricolage, low opacity, centered in pattern zone
  if(c.id){
    ctx.save();
    ctx.translate(W/2, TH+(H-TH)/2);
    ctx.font='800 88px "Bricolage Grotesque",sans-serif';
    ctx.fillStyle='rgba(0,0,0,0.12)';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText(c.id, 0, 0);
    ctx.restore();
  }
}

function dpat(ctx,d,W,py,ph){
  ctx.save();
  ctx.beginPath(); ctx.rect(0,py,W,ph); ctx.clip();

  // White backdrop so the low-opacity shades stay clean (no dark show-through)
  ctx.fillStyle='#FFFFFF'; ctx.fillRect(0,py,W,ph);

  // 5 stripes in increasing height ratio 1:2:3:4:5
  // Orange #FA823B at 20%→100% opacity
  const O='250,130,59'; // FA823B
  const stripes=[
    `rgba(${O},0.20)`,
    `rgba(${O},0.40)`,
    `rgba(${O},0.60)`,
    `rgba(${O},0.80)`,
    `rgba(${O},1.00)`
  ];
  const n=stripes.length;           // 5
  const unit=ph/(n*(n+1)/2);        // ph/15
  let y=py;
  stripes.forEach((color,i)=>{
    const h=i<n-1 ? unit*(i+1) : py+ph-y;  // last stripe fills remainder
    ctx.fillStyle=color;
    ctx.fillRect(0,y,W,h);
    y+=h;
  });

  ctx.restore();
}

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', boot);
