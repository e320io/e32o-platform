"use client";
import { useState, useEffect, useCallback, useMemo } from "react";

const SUPABASE_URL = "https://fyiukqelspqdvdulczrs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5aXVrcWVsc3BxZHZkdWxjenJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzUwMDAsImV4cCI6MjA4OTQ1MTAwMH0.HsZdGoLGCIbKcv3ytWTyjYrWeQ5yRJsp7O1Cj9lWO3g";

async function sbRest(table, params = {}) {
  const { select = "*", filters = [], order, limit } = params;
  let url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
  filters.forEach(([col, op, val]) => { url += `&${col}=${op}.${encodeURIComponent(val)}`; });
  if (order) url += `&order=${order}`;
  if (limit) url += `&limit=${limit}`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(`${table}: ${res.status}`);
  return res.json();
}
async function sbPatch(table, id, body) {
  await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "PATCH", headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(body) });
}

const T = { bg:"#0A0A0A",card:"#111111",cardH:"#161616",brd:"#1E1E1E",brdL:"#2A2A2A",acc:"#B8F03E",accDim:"rgba(184,240,62,0.12)",yel:"#F0E03E",yelDim:"rgba(240,224,62,0.12)",red:"#FF6B6B",redDim:"rgba(255,107,107,0.12)",blue:"#6BB3FF",amb:"#EF9F27",ambDim:"rgba(239,159,39,0.12)",txt:"#F5F5F5",txtM:"#888888",txtD:"#555555",r:"12px",rS:"8px",rX:"6px",f:"'DM Sans', system-ui, sans-serif" };

function getEmbedInfo(url) {
  if (!url) return null;
  try {
    const u = new URL(url), host = u.hostname.replace('www.',''), path = u.pathname;
    if (host==='instagram.com'||host==='instagr.am') { const p=path.match(/\/p\/([A-Za-z0-9_-]+)/); if(p) return {type:'instagram',id:p[1],platform:'Instagram'}; const r=path.match(/\/reel\/([A-Za-z0-9_-]+)/); if(r) return {type:'instagram-reel',id:r[1],platform:'Instagram Reel'}; }
    if (host==='tiktok.com'||host.endsWith('.tiktok.com')) { const v=path.match(/\/video\/(\d+)/); if(v) return {type:'tiktok',id:v[1],platform:'TikTok'}; }
    if (host==='youtube.com'||host==='youtu.be'||host==='m.youtube.com') { const s=path.match(/\/shorts\/([A-Za-z0-9_-]+)/); if(s) return {type:'youtube-short',id:s[1],platform:'YouTube Short'}; if(host==='youtu.be'){const id=path.slice(1);if(id)return{type:'youtube',id,platform:'YouTube'};} const v=u.searchParams.get('v'); if(v) return {type:'youtube',id:v,platform:'YouTube'}; }
    if (host==='drive.google.com') { const f=path.match(/\/file\/d\/([A-Za-z0-9_-]+)/); if(f) return {type:'gdrive',id:f[1],platform:'Google Drive'}; }
    return null;
  } catch { return null; }
}

function EmbedPreview({ url, maxWidth=480 }) {
  const e = getEmbedInfo(url);
  if (!url||!e) return null;
  return (
    <div style={{width:e.type==='youtube'?'100%':maxWidth,maxWidth:'100%',margin:'0 auto',background:'#000',borderRadius:12,overflow:'hidden',border:`1px solid ${T.brd}`}}>
      {(e.type==='instagram'||e.type==='instagram-reel')&&<iframe key={e.id} src={`https://www.instagram.com/${e.type==='instagram-reel'?'reel':'p'}/${e.id}/embed/captioned/`} style={{width:'100%',minHeight:e.type==='instagram-reel'?620:500,border:'none',background:'#000'}} allowTransparency="true" scrolling="no" loading="lazy"/>}
      {e.type==='tiktok'&&<iframe src={`https://www.tiktok.com/embed/v2/${e.id}`} style={{width:'100%',height:620,border:'none'}} allowFullScreen scrolling="no" loading="lazy"/>}
      {e.type==='youtube'&&<iframe src={`https://www.youtube.com/embed/${e.id}`} style={{width:'100%',aspectRatio:'16/9',border:'none'}} allowFullScreen loading="lazy"/>}
      {e.type==='youtube-short'&&<iframe src={`https://www.youtube.com/embed/${e.id}`} style={{width:'100%',height:620,border:'none'}} allowFullScreen loading="lazy"/>}
      {e.type==='gdrive'&&<iframe src={`https://drive.google.com/file/d/${e.id}/preview`} style={{width:'100%',aspectRatio:'16/9',border:'none'}} allow="autoplay" loading="lazy"/>}
    </div>
  );
}

const DEMO_PIECES = [
  {id:"d1",title:"Reel — Transformación balayage",type:"reel",status:"publicado",scheduled_date:"2026-03-03",piece_category:"organic",publish_url:"https://instagram.com/reel/abc123"},
  {id:"d2",title:"Carrusel — Cuidado capilar",type:"carrusel",status:"publicado",scheduled_date:"2026-03-05",piece_category:"organic"},
  {id:"d7",title:"Reel — Keratin treatment",type:"reel",status:"revision_cliente",scheduled_date:"2026-03-19",piece_category:"organic",guion_output:"• Hook: ¿Tu cabello se esponja?\n• Mostrar proceso keratin\n• CTA: Agenda hoy"},
  {id:"d9",title:"Carrusel — Abril trends",type:"carrusel",status:"edicion",scheduled_date:"2026-03-24",piece_category:"organic"},
  {id:"ad1",title:"Ad Reel — Promo 2x1 mechas",type:"reel",status:"publicado",piece_category:"ad_creative",campaign_name:"Promo Marzo — 2x1 Mechas"},
  {id:"ad3",title:"Ad Reel — Experiencia salón",type:"reel",status:"revision_cliente",piece_category:"ad_creative",campaign_name:"Branding",guion_output:"• Abre con el espacio\n• Testimonial\n• CTA"},
];
const DEMO_AD_METRICS = {spend:12450,impressions:284300,clicks:4870,ctr:1.71,conversions:127,cpc:2.56,roas:3.8,campaigns:[{name:"Promo Marzo",status:"active",spend:5200,impressions:128000,clicks:2150,conversions:58}]};

const typeL={reel:"Reel",carrusel:"Carrusel",fast_reel:"Fast Reel",imagen:"Imagen",video:"Video"};
const typeC={reel:T.acc,carrusel:T.blue,fast_reel:T.yel,imagen:"#C084FC",video:T.acc};
const statusL={pendiente:"Pendiente",research:"Research",guion:"Guión",aprobacion:"Aprobación",grabacion:"Grabación",edicion:"Edición",revision_cliente:"Tu revisión",publicado:"Publicado"};
const statusC={pendiente:T.txtD,research:T.txtD,guion:T.txtM,aprobacion:T.yel,grabacion:T.blue,edicion:T.blue,revision_cliente:T.yel,publicado:T.acc};
function fmtDate(d){if(!d)return"—";return new Date(d+"T12:00:00").toLocaleDateString("es-MX",{day:"numeric",month:"short"});}
function fmtNum(n){return n>=1e3?(n/1e3).toFixed(1)+"K":String(n);}

function ClientSwitcher({accessibleClients,activeClientId,onSwitch}){const[open,setOpen]=useState(false);if(!accessibleClients||accessibleClients.length<=1)return null;const cur=accessibleClients.find(c=>c.client_id===activeClientId)||accessibleClients[0];return(<div style={{position:"relative"}}><button onClick={()=>setOpen(!open)} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 12px",background:T.card,border:`1px solid ${T.brd}`,borderRadius:10,cursor:"pointer",fontFamily:T.f}}><span style={{fontSize:13,fontWeight:600,color:T.txt}}>{cur.display_label}</span></button>{open&&<><div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:49}}/><div style={{position:"absolute",top:"100%",left:0,marginTop:6,width:240,background:T.card,border:`1px solid ${T.brdL}`,borderRadius:12,boxShadow:"0 8px 24px rgba(0,0,0,.5)",zIndex:50}}>{accessibleClients.map(ac=><button key={ac.client_id} onClick={()=>{onSwitch(ac.client_id);setOpen(false);}} style={{width:"100%",display:"flex",padding:"10px 12px",border:"none",cursor:"pointer",fontFamily:T.f,background:ac.client_id===activeClientId?`${T.acc}10`:"transparent",color:ac.client_id===activeClientId?T.acc:T.txt,fontSize:13,textAlign:"left"}}>{ac.display_label}</button>)}</div></>}</div>);}

function PieceModal({piece,onClose,onApprove,onRequestChanges}){
  const[feedback,setFeedback]=useState("");const[showFb,setShowFb]=useState(false);
  const tc=typeC[piece.type]||T.acc,sc=statusC[piece.status]||T.txtD,isRev=piece.status==="revision_cliente",isAd=piece.piece_category==="ad_creative";
  const embedInfo=getEmbedInfo(piece.publish_url);const hasEmbed=piece.publish_url&&embedInfo;
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,.75)",backdropFilter:"blur(10px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:T.card,borderRadius:16,border:`1px solid ${T.brdL}`,width:"100%",maxWidth:600,maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 8px 40px rgba(0,0,0,.5)",overflow:"hidden"}}>
        <div style={{background:T.bg,borderBottom:`1px solid ${T.brd}`,position:"relative"}}>
          {hasEmbed?<EmbedPreview url={piece.publish_url} maxWidth={600}/>:<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,padding:40,color:T.txtD}}><span style={{fontSize:36,opacity:.3}}>{isAd?'📢':'⏳'}</span><span style={{fontSize:13}}>{isAd?'Creative para anuncios':'Archivo en preparación'}</span></div>}
          <div style={{position:"absolute",top:12,right:12,display:"flex",gap:6}}>
            {isAd&&<span style={{fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20,background:T.ambDim,color:T.amb,textTransform:"uppercase"}}>Ad</span>}
            <span style={{fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20,background:`${sc}18`,color:sc,textTransform:"uppercase"}}>{statusL[piece.status]}</span>
          </div>
          <button onClick={onClose} style={{position:"absolute",top:12,left:12,background:"rgba(0,0,0,.5)",border:"none",color:"#fff",width:32,height:32,borderRadius:"50%",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{padding:"18px 22px",flex:1,overflowY:"auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,background:`${tc}15`,color:tc,textTransform:"uppercase"}}>{typeL[piece.type]||piece.type}</span>
            {piece.scheduled_date&&<span style={{fontSize:12,color:T.txtM}}>{fmtDate(piece.scheduled_date)}</span>}
            {piece.publish_url&&<a href={piece.publish_url} target="_blank" rel="noopener noreferrer" style={{marginLeft:"auto",fontSize:11,color:T.acc,textDecoration:"none",padding:"3px 10px",background:T.accDim,borderRadius:6,fontWeight:600}}>↗ {embedInfo?.platform||'Ver'}</a>}
          </div>
          <h2 style={{fontSize:18,fontWeight:700,color:T.txt,margin:"0 0 12px",lineHeight:1.3}}>{piece.title}</h2>
          {piece.campaign_name&&<div style={{fontSize:12,color:T.txtD,marginBottom:12}}>📊 Campaña: {piece.campaign_name}</div>}
          {piece.guion_output&&<div style={{background:T.bg,border:`1px solid ${T.brd}`,borderRadius:T.rS,padding:"14px 16px",marginBottom:12}}><div style={{fontSize:10,fontWeight:700,color:T.txtM,textTransform:"uppercase",marginBottom:8}}>Guión</div><pre style={{fontSize:13,color:T.txt,lineHeight:1.7,whiteSpace:"pre-wrap",fontFamily:T.f,margin:0}}>{piece.guion_output}</pre></div>}
          {isRev&&<div style={{marginTop:16,borderTop:`1px solid ${T.brd}`,paddingTop:16}}>
            {showFb?<div style={{display:"flex",flexDirection:"column",gap:10}}><textarea value={feedback} onChange={e=>setFeedback(e.target.value)} placeholder="Escribe tu comentario..." rows={3} style={{background:T.bg,border:`1px solid ${T.brdL}`,borderRadius:T.rS,padding:"10px 12px",color:T.txt,fontSize:13,fontFamily:T.f,resize:"vertical",outline:"none",width:"100%",boxSizing:"border-box"}} autoFocus/><div style={{display:"flex",gap:8}}><button onClick={()=>{onRequestChanges(piece.id,feedback);setShowFb(false);setFeedback("");}} disabled={!feedback.trim()} style={{background:T.yel,color:"#0A0A0A",border:"none",borderRadius:T.rX,padding:"9px 18px",fontSize:13,fontWeight:700,fontFamily:T.f,cursor:"pointer",opacity:!feedback.trim()?.4:1}}>Enviar cambios</button><button onClick={()=>setShowFb(false)} style={{background:"transparent",color:T.txtM,border:`1px solid ${T.brdL}`,borderRadius:T.rX,padding:"9px 18px",fontSize:13,fontFamily:T.f,cursor:"pointer"}}>Cancelar</button></div></div>
            :<div style={{display:"flex",gap:10}}><button onClick={()=>onApprove(piece.id)} style={{background:T.acc,color:"#0A0A0A",border:"none",borderRadius:T.rX,padding:"10px 20px",fontSize:14,fontWeight:700,fontFamily:T.f,cursor:"pointer"}}>✓ Aprobar</button><button onClick={()=>setShowFb(true)} style={{background:"transparent",color:T.yel,border:`1px solid ${T.yel}40`,borderRadius:T.rX,padding:"10px 20px",fontSize:13,fontWeight:600,fontFamily:T.f,cursor:"pointer"}}>💬 Pedir cambios</button></div>}
          </div>}
        </div>
      </div>
    </div>
  );
}

function AnunciosSection({pieces,onPieceClick}){
  const adPieces=pieces.filter(p=>p.piece_category==="ad_creative");const[filter,setFilter]=useState("all");
  const campaigns=useMemo(()=>{const m={};adPieces.forEach(p=>{const n=p.campaign_name||"Sin campaña";if(!m[n])m[n]=[];m[n].push(p);});return m;},[adPieces]);
  const filtered=filter==="all"?adPieces:(campaigns[filter]||[]);
  return(<div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
      {[{l:"Total creativos",v:adPieces.length,c:T.txt},{l:"Activos",v:adPieces.filter(p=>p.status==="publicado").length,c:T.acc},{l:"Revisión",v:adPieces.filter(p=>p.status==="revision_cliente").length,c:T.yel}].map(s=><div key={s.l} style={{background:T.card,border:`1px solid ${T.brd}`,borderRadius:T.r,padding:"16px 14px"}}><div style={{fontSize:10,fontWeight:700,color:T.txtM,textTransform:"uppercase"}}>{s.l}</div><div style={{fontSize:24,fontWeight:800,color:s.c,marginTop:2}}>{s.v}</div></div>)}
    </div>
    {Object.keys(campaigns).length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button onClick={()=>setFilter("all")} style={{padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:600,fontFamily:T.f,cursor:"pointer",border:"none",background:filter==="all"?T.accDim:T.card,color:filter==="all"?T.acc:T.txtM,outline:`1px solid ${filter==="all"?T.acc+'33':T.brd}`}}>Todas ({adPieces.length})</button>{Object.keys(campaigns).map(n=><button key={n} onClick={()=>setFilter(n)} style={{padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:600,fontFamily:T.f,cursor:"pointer",border:"none",background:filter===n?T.accDim:T.card,color:filter===n?T.acc:T.txtM,outline:`1px solid ${filter===n?T.acc+'33':T.brd}`}}>{n} ({campaigns[n].length})</button>)}</div>}
    {filtered.length===0?<div style={{textAlign:"center",padding:"60px 20px"}}><div style={{fontSize:36,opacity:.3,marginBottom:12}}>📢</div><div style={{fontSize:14,color:T.txtM}}>No hay creativos de ads aún</div></div>
    :filtered.map(p=>{const sc=statusC[p.status],tc=typeC[p.type],isRev=p.status==="revision_cliente";return(<div key={p.id} onClick={()=>onPieceClick(p)} style={{background:T.card,border:`1px solid ${isRev?T.yel+'33':T.brd}`,borderRadius:T.r,padding:"14px 18px",cursor:"pointer"}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:4,background:`${tc}15`,color:tc,textTransform:"uppercase"}}>{typeL[p.type]}</span><span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:4,background:`${sc}18`,color:sc,textTransform:"uppercase"}}>{statusL[p.status]}</span></div><div style={{fontSize:14,fontWeight:600,color:T.txt}}>{p.title}</div>{p.campaign_name&&<div style={{fontSize:11,color:T.txtD,marginTop:4}}>📊 {p.campaign_name}</div>}{isRev&&<div style={{marginTop:8}}><span style={{fontSize:11,fontWeight:600,color:T.yel,background:T.yelDim,padding:"3px 10px",borderRadius:6}}>Pendiente de tu revisión</span></div>}</div>);})}
  </div>);
}

function DeliverableProgress({pieces}){const total=pieces.length,pub=pieces.filter(p=>p.status==="publicado").length,pct=total>0?Math.round((pub/total)*100):0,adC=pieces.filter(p=>p.piece_category==="ad_creative").length;return(<div style={{background:T.card,border:`1px solid ${T.brd}`,borderRadius:T.r,padding:"18px 20px",marginBottom:16}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}><div style={{fontSize:14,fontWeight:700,color:T.txt}}>Entrega del mes</div><div style={{fontSize:22,fontWeight:800,color:T.acc}}>{pct}%</div></div><div style={{height:8,background:T.bg,borderRadius:4,overflow:"hidden",display:"flex"}}>{pub>0&&<div style={{width:`${(pub/total)*100}%`,background:T.acc}}/>}{pieces.filter(p=>p.status==="revision_cliente").length>0&&<div style={{width:`${(pieces.filter(p=>p.status==="revision_cliente").length/total)*100}%`,background:T.yel}}/>}</div><div style={{display:"flex",gap:16,marginTop:10}}><div style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:8,height:8,borderRadius:"50%",background:T.acc}}/><span style={{fontSize:11,color:T.txtM}}>{pub} publicadas</span></div>{adC>0&&<span style={{fontSize:11,color:T.txtM}}>({adC} para ads)</span>}</div></div>);}

function CalendarSection({pieces,calMonth,setCalMonth,onPieceClick}){
  const org=pieces.filter(p=>(p.piece_category||"organic")==="organic");
  const year=calMonth.getFullYear(),month=calMonth.getMonth();const fd=new Date(year,month,1).getDay(),dim=new Date(year,month+1,0).getDate();
  const mn=calMonth.toLocaleDateString("es-MX",{month:"long",year:"numeric"});const today=new Date();
  const pbd=useMemo(()=>{const m={};org.forEach(p=>{if(!p.scheduled_date)return;const d=new Date(p.scheduled_date+"T12:00:00");if(d.getMonth()===month&&d.getFullYear()===year){const day=d.getDate();if(!m[day])m[day]=[];m[day].push(p);}});return m;},[org,month,year]);
  const days=["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];const cells=[];for(let i=0;i<fd;i++)cells.push(null);for(let d=1;d<=dim;d++)cells.push(d);
  return(<div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><button onClick={()=>setCalMonth(new Date(year,month-1,1))} style={{background:T.card,border:`1px solid ${T.brd}`,borderRadius:T.rX,padding:8,color:T.txtM,cursor:"pointer",fontSize:18}}>‹</button><div style={{fontSize:16,fontWeight:700,color:T.txt,textTransform:"capitalize"}}>{mn}</div><button onClick={()=>setCalMonth(new Date(year,month+1,1))} style={{background:T.card,border:`1px solid ${T.brd}`,borderRadius:T.rX,padding:8,color:T.txtM,cursor:"pointer",fontSize:18}}>›</button></div>
    <div style={{background:T.card,border:`1px solid ${T.brd}`,borderRadius:T.r,overflow:"hidden"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:`1px solid ${T.brd}`}}>{days.map(d=><div key={d} style={{padding:"10px 4px",textAlign:"center",fontSize:11,fontWeight:700,color:T.txtD,textTransform:"uppercase"}}>{d}</div>)}</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
        {cells.map((day,i)=>{const isT=day&&today.getDate()===day&&today.getMonth()===month&&today.getFullYear()===year;const dp=day?pbd[day]||[]:[];return(<div key={i} style={{minHeight:80,padding:4,borderRight:(i+1)%7!==0?`1px solid ${T.brd}`:"none",borderBottom:`1px solid ${T.brd}`}}>{day&&<><div style={{fontSize:12,fontWeight:isT?800:500,color:isT?T.acc:T.txtM,padding:"3px 5px",...(isT?{background:T.accDim,borderRadius:4,display:"inline-block"}:{})}}>{day}</div>{dp.map(p=>{const pc=statusC[p.status];return<div key={p.id} onClick={()=>onPieceClick(p)} style={{margin:"2px 1px",padding:"3px 5px",borderRadius:4,fontSize:10,fontWeight:600,color:pc,background:`${pc}15`,cursor:"pointer",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{typeL[p.type]||p.type}</div>;})}</>}</div>);})}
      </div>
    </div>
  </div>);
}

function AdsSection({metrics}){const m=metrics||DEMO_AD_METRICS;return(<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10}}>{[{l:"Inversión",v:`$${fmtNum(m.spend)}`,c:T.txt},{l:"Clics",v:fmtNum(m.clicks),c:T.acc},{l:"Conv.",v:String(m.conversions),c:T.yel},{l:"ROAS",v:`${m.roas}x`,c:T.acc}].map(k=><div key={k.l} style={{background:T.card,border:`1px solid ${T.brd}`,borderRadius:T.r,padding:"16px 14px"}}><div style={{fontSize:10,fontWeight:700,color:T.txtM,textTransform:"uppercase"}}>{k.l}</div><div style={{fontSize:24,fontWeight:800,color:k.c,marginTop:2}}>{k.v}</div></div>)}</div>);}

function LoginScreen({onLogin,error,loading}){const[user,setUser]=useState("");const[pass,setPass]=useState("");return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:T.bg,fontFamily:T.f,padding:20}}><div style={{width:"100%",maxWidth:400,display:"flex",flexDirection:"column",gap:32}}><div style={{textAlign:"center"}}><div style={{fontSize:36,fontWeight:800,color:T.txt,letterSpacing:"-1.5px",marginBottom:8}}>e<span style={{color:T.acc}}>.</span>32o</div><div style={{fontSize:13,color:T.txtM,letterSpacing:"2px",textTransform:"uppercase"}}>Portal de cliente</div></div><form onSubmit={e=>{e.preventDefault();onLogin(user,pass);}} style={{background:T.card,border:`1px solid ${T.brd}`,borderRadius:T.r,padding:32,display:"flex",flexDirection:"column",gap:20}}><div><label style={{fontSize:12,color:T.txtM,fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:6}}>Usuario</label><input value={user} onChange={e=>setUser(e.target.value)} placeholder="tu_usuario" style={{width:"100%",boxSizing:"border-box",background:T.bg,border:`1px solid ${T.brdL}`,borderRadius:T.rS,padding:"12px 14px",color:T.txt,fontSize:15,fontFamily:T.f,outline:"none"}}/></div><div><label style={{fontSize:12,color:T.txtM,fontWeight:600,textTransform:"uppercase",display:"block",marginBottom:6}}>Contraseña</label><input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" style={{width:"100%",boxSizing:"border-box",background:T.bg,border:`1px solid ${T.brdL}`,borderRadius:T.rS,padding:"12px 14px",color:T.txt,fontSize:15,fontFamily:T.f,outline:"none"}}/></div>{error&&<div style={{background:T.redDim,borderRadius:T.rX,padding:"10px 14px",fontSize:13,color:T.red}}>{error}</div>}<button type="submit" disabled={loading||!user||!pass} style={{background:T.acc,color:"#0A0A0A",border:"none",borderRadius:T.rS,padding:13,fontSize:14,fontWeight:700,fontFamily:T.f,cursor:"pointer",opacity:loading||!user||!pass?.5:1}}>{loading?"Verificando...":"Iniciar sesión"}</button></form></div></div>);}

export default function Portal(){
  const[session,setSession]=useState(null);const[loginError,setLoginError]=useState(null);const[loginLoading,setLoginLoading]=useState(false);
  const[activeTab,setActiveTab]=useState("calendar");const[pieces,setPieces]=useState([]);const[adMetrics,setAdMetrics]=useState(null);
  const[loading,setLoading]=useState(false);const[calMonth,setCalMonth]=useState(new Date());const[modalPiece,setModalPiece]=useState(null);
  const[toast,setToast]=useState(null);const[useDemoData,setUseDemoData]=useState(false);const[activeClientId,setActiveClientId]=useState(null);const[accessibleClients,setAccessibleClients]=useState([]);
  const showToast=useCallback((msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3000);},[]);

  useEffect(()=>{try{const s=JSON.parse(localStorage.getItem("e32o_session"));if(s?.type==="client"&&s?.user){const cid=s.client_id;const cls=s.accessible_clients||[{client_id:cid,display_label:s.client_name||"Cliente",role:"viewer",is_default:true,has_ads:false}];setSession(s);setAccessibleClients(cls);setActiveClientId(cid);}}catch{}},[]);

  const handleLogin=useCallback(async(username,password)=>{
    setLoginLoading(true);setLoginError(null);
    try{
      const users=await sbRest("client_users",{filters:[["username","eq",username]],limit:1});
      if(users.length>0&&users[0].password_hash===password){
        const al=await sbRest("client_user_access",{select:"client_id,display_label,role,is_default,clients(id,name,color,has_ads)",filters:[["client_user_id","eq",users[0].id]]});
        let clients,did,cn;
        if(al.length>0){clients=al.map(a=>({client_id:a.client_id,display_label:a.display_label||a.clients?.name,role:a.role,is_default:a.is_default,has_ads:a.clients?.has_ads||false,color:a.clients?.color}));const d=clients.find(c=>c.is_default)||clients[0];did=d.client_id;cn=d.display_label;}
        else{const cl=await sbRest("clients",{filters:[["id","eq",users[0].client_id]],limit:1});did=users[0].client_id;cn=cl[0]?.name||"Cliente";clients=[{client_id:did,display_label:cn,role:"viewer",is_default:true,has_ads:cl[0]?.has_ads||false,color:cl[0]?.color}];}
        const sd={user:users[0],type:"client",client_id:did,client_name:cn,accessible_clients:clients};localStorage.setItem("e32o_session",JSON.stringify(sd));setSession(sd);setAccessibleClients(clients);setActiveClientId(did);return;
      }
      const demo={brillo_valle:{id:"2ef8b0f0-7995-41bc-a18c-f1fb4bcea91f",name:"Brillo Mío Valle",has_ads:true,color:"#3EF0C8"}};
      if(demo[username]&&password==="e3202026"){const cls=[{client_id:demo[username].id,display_label:demo[username].name,role:"viewer",is_default:true,has_ads:demo[username].has_ads,color:demo[username].color}];const sd={user:{username},type:"client",client_id:cls[0].client_id,client_name:cls[0].display_label,accessible_clients:cls};localStorage.setItem("e32o_session",JSON.stringify(sd));setSession(sd);setAccessibleClients(cls);setActiveClientId(cls[0].client_id);setUseDemoData(true);return;}
      setLoginError("Usuario o contraseña incorrectos");
    }catch{setLoginError("Error de conexión");}finally{setLoginLoading(false);}
  },[]);

  const handleSwitchClient=useCallback((nid)=>{setActiveClientId(nid);setActiveTab("calendar");const s=JSON.parse(localStorage.getItem("e32o_session")||"{}");s.client_id=nid;localStorage.setItem("e32o_session",JSON.stringify(s));},[]);

  useEffect(()=>{if(!session||!activeClientId)return;(async()=>{setLoading(true);if(useDemoData){setPieces(DEMO_PIECES);setAdMetrics(DEMO_AD_METRICS);setLoading(false);return;}try{const p=await sbRest("content_pieces",{filters:[["client_id","eq",activeClientId]],order:"scheduled_date.asc"});if(p.length>0)setPieces(p);else{setPieces(DEMO_PIECES);setUseDemoData(true);}}catch{setPieces(DEMO_PIECES);setUseDemoData(true);}setAdMetrics(DEMO_AD_METRICS);setLoading(false);})();},[session,activeClientId,useDemoData]);

  const handleApprove=useCallback(async(id)=>{if(!useDemoData){try{await sbPatch("content_pieces",id,{status:"grabacion"});}catch{}}setPieces(prev=>prev.map(p=>p.id===id?{...p,status:"grabacion"}:p));setModalPiece(null);showToast("Pieza aprobada.");},[useDemoData,showToast]);
  const handleRequestChanges=useCallback(async(id,fb)=>{if(!useDemoData){try{await sbPatch("content_pieces",id,{status:"guion",client_feedback:fb});}catch{}}setPieces(prev=>prev.map(p=>p.id===id?{...p,status:"guion"}:p));setModalPiece(null);showToast("Comentario enviado.","info");},[useDemoData,showToast]);

  const reviewPieces=useMemo(()=>pieces.filter(p=>p.status==="revision_cliente"),[pieces]);
  const activeClient=accessibleClients.find(c=>c.client_id===activeClientId);
  const hasAds=activeClient?.has_ads||pieces.some(p=>p.piece_category==="ad_creative");
  const TABS=useMemo(()=>{const t=[{id:"calendar",label:"Calendario",icon:"📅"}];if(hasAds)t.push({id:"anuncios",label:"Anuncios",icon:"📢"});t.push({id:"review",label:"Revisión",icon:"📋"});if(hasAds)t.push({id:"ads",label:"Ads",icon:"📊"});return t;},[hasAds]);
  const handleLogout=()=>{localStorage.removeItem("e32o_session");setSession(null);setUseDemoData(false);setPieces([]);setAccessibleClients([]);setActiveClientId(null);};

  if(!session)return<LoginScreen onLogin={handleLogin} error={loginError} loading={loginLoading}/>;

  return(<div style={{minHeight:"100vh",background:T.bg,fontFamily:T.f,color:T.txt}}>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
    <header style={{position:"sticky",top:0,zIndex:100,background:"rgba(10,10,10,.9)",backdropFilter:"blur(16px)",borderBottom:`1px solid ${T.brd}`}}>
      <div style={{maxWidth:900,margin:"0 auto",padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}><span style={{fontSize:20,fontWeight:800}}>e<span style={{color:T.acc}}>.</span>32o</span><span style={{width:1,height:20,background:T.brdL}}/>{accessibleClients.length>1?<ClientSwitcher accessibleClients={accessibleClients} activeClientId={activeClientId} onSwitch={handleSwitchClient}/>:<span style={{fontSize:14,fontWeight:600,color:T.txtM}}>{activeClient?.display_label||"Cliente"}</span>}</div>
        <button onClick={handleLogout} style={{background:"transparent",border:`1px solid ${T.brd}`,borderRadius:T.rX,padding:"6px 12px",color:T.txtM,fontSize:12,fontWeight:600,fontFamily:T.f,cursor:"pointer"}}>Salir</button>
      </div>
    </header>
    <main style={{maxWidth:900,margin:"0 auto",padding:"16px 20px 80px"}}>
      <div style={{display:"flex",gap:4,background:T.card,borderRadius:T.rS,padding:4,border:`1px solid ${T.brd}`,marginBottom:16}}>
        {TABS.map(tab=>{const active=activeTab===tab.id;const badge=tab.id==="review"?reviewPieces.length:tab.id==="anuncios"?pieces.filter(p=>p.piece_category==="ad_creative"&&p.status==="revision_cliente").length:0;return(<button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"10px 12px",borderRadius:T.rX,border:"none",background:active?T.accDim:"transparent",color:active?T.acc:T.txtM,fontSize:13,fontWeight:active?700:500,fontFamily:T.f,cursor:"pointer"}}>{tab.icon} {tab.label}{badge>0&&<span style={{background:T.acc,color:"#0A0A0A",fontSize:10,fontWeight:800,padding:"1px 6px",borderRadius:10}}>{badge}</span>}</button>);})}
      </div>
      {loading?<div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:80,color:T.txtM}}><div style={{width:24,height:24,border:`2px solid ${T.brd}`,borderTopColor:T.acc,borderRadius:"50%",animation:"spin .8s linear infinite",marginRight:10}}/>Cargando...<style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>:<>
        {activeTab==="calendar"&&<><DeliverableProgress pieces={pieces}/><CalendarSection pieces={pieces} calMonth={calMonth} setCalMonth={setCalMonth} onPieceClick={setModalPiece}/></>}
        {activeTab==="anuncios"&&<AnunciosSection pieces={pieces} onPieceClick={setModalPiece}/>}
        {activeTab==="review"&&(reviewPieces.length===0?<div style={{textAlign:"center",padding:"80px 20px"}}><div style={{fontSize:48,opacity:.3,marginBottom:12}}>✓</div><div style={{fontSize:18,fontWeight:600}}>Todo al día</div></div>:<div style={{display:"flex",flexDirection:"column",gap:12}}>{reviewPieces.map(p=><div key={p.id} onClick={()=>setModalPiece(p)} style={{background:T.card,border:`1px solid ${T.brd}`,borderRadius:T.r,padding:"16px 18px",cursor:"pointer"}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}><span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:4,background:`${typeC[p.type]}15`,color:typeC[p.type],textTransform:"uppercase"}}>{typeL[p.type]}</span>{p.piece_category==="ad_creative"&&<span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:4,background:T.ambDim,color:T.amb}}>Ad</span>}<span style={{marginLeft:"auto",fontSize:10,fontWeight:600,color:T.yel,background:T.yelDim,padding:"2px 8px",borderRadius:10}}>Revisión</span></div><div style={{fontSize:15,fontWeight:600,color:T.txt}}>{p.title}</div></div>)}</div>)}
        {activeTab==="ads"&&<AdsSection metrics={adMetrics}/>}
      </>}
    </main>
    {modalPiece&&<PieceModal piece={modalPiece} onClose={()=>setModalPiece(null)} onApprove={handleApprove} onRequestChanges={handleRequestChanges}/>}
    {toast&&<div style={{position:"fixed",top:20,right:20,background:toast.type==="success"?T.accDim:T.yelDim,border:`1px solid ${toast.type==="success"?T.acc:T.yel}40`,borderRadius:T.rS,padding:"12px 18px",fontSize:13,fontWeight:600,zIndex:1100,color:toast.type==="success"?T.acc:T.yel,animation:"slideIn .3s ease-out"}}>{toast.msg}<style>{`@keyframes slideIn{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style></div>}
    {useDemoData&&<div style={{position:"fixed",bottom:16,left:"50%",transform:"translateX(-50%)",background:T.card,border:`1px solid ${T.brdL}`,borderRadius:20,padding:"8px 16px",fontSize:12,color:T.txtM,zIndex:200}}>Modo demo</div>}
  </div>);
}
