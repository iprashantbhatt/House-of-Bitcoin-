import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts";

// ── FONTS: IBM Plex Mono (readable) + Orbitron (display) ─────────────────
// Much more readable than Space Mono, larger base sizes

const LOADER_STEPS = [
"Initializing Bitcoin Core node…",
"Connecting to Electrs indexer…",
"Syncing Mempool.space data…",
"Fetching live block height…",
"Loading CoinGecko market feed…",
"Calibrating Fear & Greed Index…",
"Rendering dashboard…",
"House of Bitcoin is Ready!",
];

// ── THEMES ────────────────────────────────────────────────────────────────
const THEMES = {
"Dark Neon": {
bg:"#060612", sidebar:"#04040e", card:"rgba(0,255,200,0.04)",
cardBorder:"rgba(0,255,200,0.14)", header:"rgba(6,6,18,0.96)",
accent:"#00ffcc", accent2:"#00aaff", text:"#e8fff8",
textSec:"rgba(200,255,245,0.75)", textMuted:"rgba(150,230,220,0.55)",
green:"#00ff88", red:"#ff3366", chartLine:"#00ffcc",
navActive:"rgba(0,255,200,0.14)", navActiveBorder:"#00ffcc",
glass:false,
},
"Liquid Glass": {
bg:"#0e1117", sidebar:"rgba(14,17,24,0.75)", card:"rgba(255,255,255,0.08)",
cardBorder:"rgba(255,255,255,0.18)", header:"rgba(14,17,24,0.65)",
accent:"#f7931a", accent2:"#a855f7", text:"#ffffff",
textSec:"rgba(255,255,255,0.78)", textMuted:"rgba(255,255,255,0.50)",
green:"#34d399", red:"#f87171", chartLine:"#a78bfa",
navActive:"rgba(168,85,247,0.18)", navActiveBorder:"#a855f7",
glass:true, liquidGlass:true,
},
"Sunset Glow": {
bg:"#0f080a", sidebar:"#0a0508", card:"rgba(255,100,50,0.06)",
cardBorder:"rgba(255,100,50,0.16)", header:"rgba(15,8,10,0.95)",
accent:"#ff6b35", accent2:"#ff2d55", text:"#fff0ec",
textSec:"rgba(255,230,220,0.75)", textMuted:"rgba(255,200,180,0.55)",
green:"#00e676", red:"#ff1744", chartLine:"#ff6b35",
navActive:"rgba(255,107,53,0.15)", navActiveBorder:"#ff6b35",
glass:false,
},
"Ocean Blue": {
bg:"#030d1a", sidebar:"#020b16", card:"rgba(0,120,255,0.06)",
cardBorder:"rgba(0,120,255,0.16)", header:"rgba(3,13,26,0.95)",
accent:"#0088ff", accent2:"#00ddff", text:"#e8f4ff",
textSec:"rgba(180,220,255,0.75)", textMuted:"rgba(120,180,240,0.55)",
green:"#00e5ff", red:"#ff1744", chartLine:"#0088ff",
navActive:"rgba(0,136,255,0.15)", navActiveBorder:"#0088ff",
glass:false,
},
"Forest Green": {
bg:"#040f08", sidebar:"#030c06", card:"rgba(0,200,80,0.06)",
cardBorder:"rgba(0,200,80,0.16)", header:"rgba(4,15,8,0.95)",
accent:"#00c853", accent2:"#69f0ae", text:"#e8fff0",
textSec:"rgba(180,255,210,0.75)", textMuted:"rgba(120,220,160,0.55)",
green:"#00e676", red:"#ff1744", chartLine:"#00c853",
navActive:"rgba(0,200,83,0.15)", navActiveBorder:"#00c853",
glass:false,
},
"Royal Purple": {
bg:"#08040f", sidebar:"#060310", card:"rgba(150,50,255,0.06)",
cardBorder:"rgba(150,50,255,0.16)", header:"rgba(8,4,15,0.95)",
accent:"#9633ff", accent2:"#cc44ff", text:"#f0e8ff",
textSec:"rgba(220,180,255,0.75)", textMuted:"rgba(180,130,240,0.55)",
green:"#00e676", red:"#ff1744", chartLine:"#9633ff",
navActive:"rgba(150,51,255,0.15)", navActiveBorder:"#9633ff",
glass:false,
},
"Light Mode": {
bg:"#f0f4ff", sidebar:"#ffffff", card:"rgba(255,255,255,0.85)",
cardBorder:"rgba(0,0,0,0.10)", header:"rgba(240,244,255,0.95)",
accent:"#f7931a", accent2:"#7c3aed", text:"#1a1a2e",
textSec:"rgba(26,26,46,0.72)", textMuted:"rgba(26,26,46,0.48)",
green:"#16a34a", red:"#dc2626", chartLine:"#7c3aed",
navActive:"rgba(124,58,237,0.10)", navActiveBorder:"#7c3aed",
glass:false,
},
};

// ── HELPERS ───────────────────────────────────────────────────────────────
function genSparkline(base, points, vol) {
var out = []; var v = base;
for (var i = 0; i < points; i++) {
v = v * (1 + (Math.random() - 0.48) * vol);
out.push({ v: parseFloat(v.toFixed(2)) });
}
return out;
}
function genChart(base, days) {
var out = []; var v = base * 0.92; var now = Date.now();
for (var i = days * 24; i >= 0; i -= 4) {
v = v * (1 + (Math.random() - 0.47) * 0.008);
var d = new Date(now - i * 3600000);
out.push({ t: d.toLocaleDateString("en-US", { month:"short", day:"numeric" }), p: parseFloat(v.toFixed(2)) });
}
out[out.length - 1].p = base;
return out;
}
function calcSupply(bh) {
var eras = [[0,209999,50],[210000,419999,25],[420000,629999,12.5],[630000,839999,6.25],[840000,1049999,3.125]];
var s = 0;
for (var i = 0; i < eras.length; i++) {
var e = eras[i];
if (bh > e[1]) { s += (e[1]-e[0]+1)*e[2]; }
else if (bh >= e[0]) { s += (bh-e[0]+1)*e[2]; break; }
}
return Math.round(s);
}
function fmtU(n) {
if (!n) return "—";
if (n>=1e12) return "$"+(n/1e12).toFixed(2)+"T";
if (n>=1e9)  return "$"+(n/1e9).toFixed(2)+"B";
if (n>=1e6)  return "$"+(n/1e6).toFixed(2)+"M";
return "$"+n.toLocaleString();
}
function fmtP(n) {
return n ? "$"+n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}) : "Fetching…";
}

// ── BTC ICON ──────────────────────────────────────────────────────────────
function BtcIcon(props) {
var size = props.size||32; var glow = props.glow||"#f7931a";
return (
<svg width={size} height={size} viewBox="0 0 100 100" fill="none"
style={{filter:"drop-shadow(0 0 "+(size*0.15)+"px "+glow+")",flexShrink:0}}>
<circle cx="50" cy="50" r="48" fill="#f7931a"/>
<path d="M68.5 43.5c1-6.7-4.1-10.3-11.1-12.7l2.3-9.1-5.6-1.4-2.2 8.9c-1.5-.4-3-.7-4.5-1.1l2.2-8.9-5.6-1.4-2.3 9.1c-1.2-.3-2.4-.5-3.6-.8l-7.7-1.9-1.5 6s4.1 1 4 1c2.2.6 2.6 2.1 2.5 3.3l-6 24.2c-.3.7-1 1.7-2.6 1.3.1.1-4-1-4-1l-2.7 6.4 7.3 1.8c1.4.3 2.7.7 4.1 1l-2.3 9.3 5.6 1.4 2.3-9.2c1.5.4 3 .8 4.5 1.1l-2.3 9.2 5.6 1.4 2.3-9.3c9.6 1.8 16.8.5 19.8-7.6 2.4-6.9-.1-10.9-5.1-13.5 3.7-.9 6.4-3.4 7.1-8.6zm-12.7 17.8c-1.7 6.9-13.3 3.2-17.1 2.2l3.1-12.3c3.8 1 15.9 2.8 14 10.1zm1.7-17.9c-1.6 6.3-11.3 3.1-14.5 2.3l2.8-11.2c3.2.8 13.5 2.3 11.7 8.9z" fill="white"/>
</svg>
);
}

// ── BTC SUPPLY RING ───────────────────────────────────────────────────────
function BtcRing(props) {
var pct=props.pct; var accent=props.accent; var accent2=props.accent2; var textCol=props.textCol;
var circ = 2*Math.PI*90;
var dash = circ*(pct/100);
var ang = (pct/100*360-90)*Math.PI/180;
return (
<div style={{position:"relative",width:220,height:220}}>
<svg width="220" height="220" viewBox="0 0 220 220" style={{position:"absolute",top:0,left:0}}>
<defs>
<linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" stopColor={accent}/>
<stop offset="100%" stopColor={accent2}/>
</linearGradient>
</defs>
<path id="ap" d="M 30 110 A 80 80 0 0 1 190 110" fill="none"/>
<text fontSize="8" fill={textCol+"44"} letterSpacing="4">
<textPath href="#ap">CIRCULATING SUPPLY • BITCOIN • MAX 21M •</textPath>
</text>
<circle cx="110" cy="110" r="90" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
<circle cx="110" cy="110" r="90" fill="none" stroke="url(#rg)" strokeWidth="6"
strokeLinecap="round" strokeDasharray={dash+" "+circ} transform="rotate(-90 110 110)"
style={{filter:"drop-shadow(0 0 8px "+accent+")"}}/>
<circle cx={110+90*Math.cos(ang)} cy={110+90*Math.sin(ang)} r="5" fill={accent}
style={{filter:"drop-shadow(0 0 6px "+accent+")"}}/>
</svg>
<div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
<BtcIcon size={68} glow={accent}/>
<div style={{fontSize:17,fontWeight:900,color:textCol,fontFamily:"‘Orbitron’,monospace"}}>{pct}%</div>
</div>
</div>
);
}

// ── FEAR & GREED ──────────────────────────────────────────────────────────
function FGGauge(props) {
var value=props.value||72; var T=props.T;
var pct=value/100; var arcLen=251.2;
var offset=arcLen-arcLen*pct; var needle=-90+pct*180;
var col=value<=20?"#ef4444":value<=40?"#f97316":value<=60?"#eab308":value<=80?"#84cc16":"#22c55e";
var lbl=value<=20?"Extreme Fear":value<=40?"Fear":value<=60?"Neutral":value<=80?"Greed":"Extreme Greed";
return (
<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
<div style={{position:"relative",width:160,height:90}}>
<svg viewBox="0 0 200 110" width="160" height="90" style={{overflow:"visible"}}>
<defs>
<linearGradient id="fgg" x1="0%" y1="0%" x2="100%" y2="0%">
<stop offset="0%" stopColor="#ef4444"/><stop offset="25%" stopColor="#f97316"/>
<stop offset="50%" stopColor="#eab308"/><stop offset="75%" stopColor="#84cc16"/>
<stop offset="100%" stopColor="#22c55e"/>
</linearGradient>
</defs>
<path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" strokeLinecap="round"/>
<path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#fgg)" strokeWidth="14"
strokeLinecap="round" strokeDasharray={arcLen} strokeDashoffset={offset}
style={{transition:"stroke-dashoffset 1s ease"}}/>
<g style={{transformOrigin:"100px 100px",transform:"rotate("+needle+"deg)",transition:"transform 1s ease"}}>
<line x1="100" y1="100" x2="100" y2="30" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.9"/>
<circle cx="100" cy="100" r="5" fill="white" opacity="0.9"/>
</g>
</svg>
<div style={{position:"absolute",bottom:-4,left:"50%",transform:"translateX(-50%)",textAlign:"center"}}>
<div style={{fontSize:30,fontWeight:900,color:col,fontFamily:"‘Orbitron’,monospace",lineHeight:1}}>{value}</div>
</div>
</div>
<div style={{fontSize:14,fontWeight:700,color:col,marginTop:4}}>{lbl}</div>
</div>
);
}

// ── HALVING CLOCK ─────────────────────────────────────────────────────────
function HalvingClock(props) {
var secs=props.secs; var accent=props.accent; var textCol=props.textCol; var textMuted=props.textMuted;
var d=Math.floor(secs/86400); var rem=secs%86400;
var h=Math.floor(rem/3600); rem=rem%3600;
var m=Math.floor(rem/60); var s=rem%60;
function pad(n){return String(n).padStart(2,"0");}
var numS={fontFamily:"‘Orbitron’,monospace",fontWeight:900,fontSize:"clamp(22px,3.5vw,54px)",color:textCol,lineHeight:1};
var lblS={fontSize:"clamp(8px,1.5vw,12px)",letterSpacing:"0.15em",color:textMuted,textTransform:"uppercase",marginTop:4};
var sepS={fontFamily:"‘Orbitron’,monospace",fontSize:"clamp(18px,3vw,48px)",fontWeight:900,color:accent,paddingBottom:18,opacity:0.9};
function Unit(val,lbl){return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:0}}><div style={numS}>{pad(val)}</div><div style={lblS}>{lbl}</div></div>);}
return (
<div style={{display:"flex",alignItems:"flex-end",gap:"clamp(6px,1.5vw,14px)",justifyContent:"center",flexWrap:"wrap",maxWidth:"100%",overflow:"hidden"}}>
{Unit(d,"Days")}<div style={sepS}>:</div>
{Unit(h,"Hours")}<div style={sepS}>:</div>
{Unit(m,"Minutes")}<div style={sepS}>:</div>
{Unit(s,"Seconds")}
</div>
);
}

// ── NEWS PAGE ─────────────────────────────────────────────────────────────
function NewsPage(props) {
var T=props.T; var onBack=props.onBack; var newsItems=props.newsItems||[];
var [loading,setLoading]=useState(newsItems.length===0);

// Fetch news from backend
useEffect(function(){
if(newsItems.length>0){setLoading(false);return;}
},[newsItems]);

var cats=["All","Markets","Technology","Regulation","Mining","DeFi","Institutional"];
var [cat,setCat]=useState("All");

var displayed=newsItems.length>0?newsItems:[
{title:"Bitcoin Breaks $97K Resistance Level",source:"CoinDesk",time:"2h ago",category:"Markets",summary:"BTC surged past the critical $97,000 resistance level amid strong institutional buying pressure from ETF inflows."},
{title:"Whales Accumulate 15,000 BTC in 24 Hours",source:"Glassnode",time:"3h ago",category:"Markets",summary:"On-chain data reveals significant whale accumulation activity with over 15,000 BTC moved to cold storage wallets."},
{title:"BlackRock Bitcoin ETF Hits Record $2.1B Inflows",source:"Bloomberg",time:"4h ago",category:"Institutional",summary:"The iShares Bitcoin Trust recorded its highest single-day inflow since launch, signaling growing institutional appetite."},
{title:"Lightning Network Capacity Reaches 5,000 BTC",source:"Bitcoin Magazine",time:"5h ago",category:"Technology",summary:"The Lightning Network has hit a new milestone with over 5,000 BTC locked in payment channels across 60,000+ nodes."},
{title:"Fed Signals Rate Cuts — Bitcoin Rallies 4%",source:"Reuters",time:"6h ago",category:"Markets",summary:"Federal Reserve minutes suggest potential rate cuts in Q2, sending risk assets including Bitcoin sharply higher."},
{title:"MicroStrategy Adds 10,000 BTC to Treasury",source:"CNBC",time:"8h ago",category:"Institutional",summary:"Michael Saylor’s company expanded its Bitcoin holdings to over 200,000 BTC with a $980M purchase."},
{title:"SEC Approves Three New Bitcoin ETF Options",source:"The Block",time:"10h ago",category:"Regulation",summary:"The Securities and Exchange Commission greenlit options trading on spot Bitcoin ETFs, expanding derivatives market."},
{title:"Bitcoin Mining Difficulty Hits All-Time High",source:"Decrypt",time:"12h ago",category:"Mining",summary:"Network difficulty adjusted upward by 3.2% as hashrate continues record-breaking climb above 750 EH/s."},
{title:"El Salvador Bitcoin Bonds Oversubscribed 3x",source:"CoinTelegraph",time:"1d ago",category:"Regulation",summary:"El Salvador’s volcano-powered Bitcoin bonds attracted $750M in demand against a $250M offering target."},
{title:"Coinbase Launches Bitcoin L2 Network",source:"The Block",time:"1d ago",category:"Technology",summary:"Coinbase’s Base network announces native Bitcoin bridging, enabling BTC use in DeFi protocols."},
{title:"Bitcoin Dominance Climbs to 54% — Altcoin Season Fades",source:"CryptoSlate",time:"1d ago",category:"Markets",summary:"BTC dominance index rose to 54%, its highest level since 2021, as capital rotates from altcoins to Bitcoin."},
{title:"Germany Considers Bitcoin Strategic Reserve",source:"Financial Times",time:"2d ago",category:"Regulation",summary:"A German parliamentary committee discussed adding Bitcoin to the country’s strategic reserves alongside gold."},
];

var filtered=cat==="All"?displayed:displayed.filter(function(n){return n.category===cat;});
var catColor=T.accent;

return (
<div style={{position:"fixed",inset:0,zIndex:500,background:T.bg,color:T.text,fontFamily:"‘IBM Plex Mono’,monospace",display:"flex",flexDirection:"column",overflow:"hidden"}}>
{/* Header */}
<div style={{height:60,flexShrink:0,background:T.sidebar,borderBottom:"1px solid "+T.cardBorder,display:"flex",alignItems:"center",padding:"0 24px",gap:16}}>
<button onClick={onBack}
style={{display:"flex",alignItems:"center",gap:8,padding:"7px 16px",background:T.card,border:"1px solid "+T.cardBorder,borderRadius:8,color:T.text,cursor:"pointer",fontSize:14,fontFamily:"‘IBM Plex Mono’,monospace",transition:"all .2s"}}
onMouseEnter={function(e){e.currentTarget.style.borderColor=T.accent;}}
onMouseLeave={function(e){e.currentTarget.style.borderColor=T.cardBorder;}}>
← Back
</button>
<div style={{display:"flex",alignItems:"center",gap:10}}>
<div style={{width:10,height:10,borderRadius:"50%",background:T.accent,boxShadow:"0 0 8px "+T.accent}}/>
<span style={{fontFamily:"‘Orbitron’,monospace",fontSize:16,fontWeight:700,color:T.text}}>
Bitcoin <span style={{color:T.accent}}>News</span>
</span>
</div>
<div style={{fontSize:13,color:T.textMuted,marginLeft:"auto"}}>{filtered.length} articles</div>
</div>

  {/* Category filter */}
  <div style={{padding:"14px 24px",borderBottom:"1px solid "+T.cardBorder,display:"flex",gap:8,flexWrap:"wrap",background:T.sidebar,flexShrink:0}}>
    {cats.map(function(c){
      var active=cat===c;
      return (
        <button key={c} onClick={function(){setCat(c);}}
          style={{padding:"6px 14px",borderRadius:20,fontSize:13,fontFamily:"'IBM Plex Mono',monospace",background:active?T.accent:"transparent",border:"1px solid "+(active?T.accent:T.cardBorder),color:active?"#000":T.textSec,cursor:"pointer",transition:"all .2s",fontWeight:active?700:400}}>
          {c}
        </button>
      );
    })}
  </div>

  {/* News grid */}
  <div style={{flex:1,overflowY:"auto",padding:24}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:16}}>
      {filtered.map(function(item,i){
        return (
          <div key={i}
            style={{background:T.card,border:"1px solid "+T.cardBorder,borderRadius:12,padding:"18px 20px",display:"flex",flexDirection:"column",gap:10,cursor:"pointer",transition:"all .2s"}}
            onMouseEnter={function(e){e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.transform="translateY(-2px)";}}
            onMouseLeave={function(e){e.currentTarget.style.borderColor=T.cardBorder;e.currentTarget.style.transform="none";}}>
            {/* Category + time */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:T.accent+"22",color:T.accent,border:"1px solid "+T.accent+"44",fontWeight:600}}>
                {item.category}
              </span>
              <span style={{fontSize:12,color:T.textMuted}}>{item.time}</span>
            </div>
            {/* Title */}
            <div style={{fontSize:15,fontWeight:700,color:T.text,lineHeight:1.4,fontFamily:"'IBM Plex Mono',monospace"}}>
              {item.title}
            </div>
            {/* Summary */}
            <div style={{fontSize:13,color:T.textSec,lineHeight:1.6}}>
              {item.summary}
            </div>
            {/* Source */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:4,paddingTop:10,borderTop:"1px solid "+T.cardBorder+"88"}}>
              <span style={{fontSize:12,color:T.accent,fontWeight:600}}>📰 {item.source}</span>
              <span style={{fontSize:12,color:T.textMuted}}>Read more →</span>
            </div>
          </div>
        );
      })}
    </div>
    {filtered.length===0&&(
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:300,fontSize:15,color:T.textMuted}}>
        No news in this category yet.
      </div>
    )}
  </div>
</div>

);
}

// ── CONSTANTS ─────────────────────────────────────────────────────────────
var COIN_COLORS={BTC:"#f7931a",ETH:"#627eea",USDT:"#26a17b",BNB:"#f3ba2f",SOL:"#9945ff"};
var BTC_MAX=21000000;
var HALVING_BLOCK=1050000;
var API_BASE="https://houseofbitcoin.app"; // backend port

var NAV_ITEMS=[
{icon:"⊞",label:"Dashboard"},{icon:"◈",label:"Market"},
{icon:"⌇",label:"Charts"},{icon:"⬡",label:"On-Chain"},
{icon:"◑",label:"Halving"},{icon:"⚡",label:"Fear & Greed"},
{icon:"▤",label:"News"},{icon:"⊕",label:"Heatmap"},
{icon:"◎",label:"API Status"},{icon:"◉",label:"About"},
];

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────
export default function Dashboard() {
var [themeName,setThemeName]=useState("Dark Neon");
var [themeOpen,setThemeOpen]=useState(false);
var [activePage,setActivePage]=useState("Dashboard");
var [chartRange,setChartRange]=useState("7D");
var [halvingSecs,setHalvingSecs]=useState(null);
var [isMobile,setIsMobile]=useState(window.innerWidth<768);
var [sidebarOpen,setSidebarOpen]=useState(window.innerWidth>=768);
var [appLoaded,setAppLoaded]=useState(false);
var [loadPct,setLoadPct]=useState(0);
var [loadIdx,setLoadIdx]=useState(0);
var [showNews,setShowNews]=useState(false);
var [newsItems,setNewsItems]=useState([]);
var [btc,setBtc]=useState({price:null,change24h:null,mcap:null,volume:null,high24h:null,low24h:null,dominance:null,blockHeight:null,hashrate:null,fearGreed:null,mempoolSize:null,txCount:null,difficulty:null,activeAddresses:null,circulatingSupply:null,ethPrice:null,ethChange:null,bnbPrice:null,bnbChange:null,solPrice:null,solChange:null});
var [dataStatus,setDataStatus]=useState("loading");
var [lastUpdated,setLastUpdated]=useState(null);
var [chartData,setChartData]=useState([]);
var [sparks,setSparks]=useState({});
var [fgSpark]=useState(function(){return genSparkline(50,40,0.04);});

var T=THEMES[themeName]||THEMES["Dark Neon"];

// Mobile detection
useEffect(function(){
function handleResize(){
var mobile=window.innerWidth<768;
setIsMobile(mobile);
if(mobile) setSidebarOpen(false);
}
window.addEventListener("resize",handleResize);
return function(){window.removeEventListener("resize",handleResize);};
},[]);

var T=THEMES[themeName]||THEMES["Dark Neon"];

// Loader animation
useEffect(function(){
var step=0; var total=LOADER_STEPS.length;
var iv=setInterval(function(){
step++;
setLoadPct(Math.min(100,Math.round(step/total*100)));
setLoadIdx(Math.min(step-1,total-1));
if(step>=total){clearInterval(iv);setTimeout(function(){setAppLoaded(true);},500);}
},300);
return function(){clearInterval(iv);};
},[]);

// Fetch BTC data from backend
var fetchData=useCallback(function(){
setDataStatus("loading");
fetch(API_BASE+"/api/btc",{signal:AbortSignal.timeout(12000)})
.then(function(r){return r.json();})
.then(function(d){
setBtc({price:d.price,change24h:d.change24h,mcap:d.mcap,volume:d.volume,high24h:d.high24h,low24h:d.low24h,dominance:d.dominance,blockHeight:d.blockHeight,hashrate:d.hashrate,fearGreed:d.fearGreed,mempoolSize:d.mempoolSize,txCount:d.txCount,difficulty:d.difficulty,activeAddresses:d.activeAddresses,circulatingSupply:d.circulatingSupply||null,ethPrice:d.ethPrice,ethChange:d.ethChange,bnbPrice:d.bnbPrice,bnbChange:d.bnbChange,solPrice:d.solPrice,solChange:d.solChange});
if(d.blockHeight) setHalvingSecs((HALVING_BLOCK-d.blockHeight)*10*60);
setChartData(genChart(d.price||97000,7));
setSparks({btc:genSparkline(d.price||97000,20,0.015),eth:genSparkline(d.ethPrice||3150,20,0.015),usdt:genSparkline(1,20,0.001),bnb:genSparkline(d.bnbPrice||590,20,0.015),sol:genSparkline(d.solPrice||152,20,0.02),vol:genSparkline(d.volume||28e9,20,0.04),mcap:genSparkline(d.mcap||1.3e12,20,0.01),dom:genSparkline(d.dominance||52,20,0.008)});
setDataStatus("live"); setLastUpdated(new Date());
})
.catch(function(){
// Fallback mock data when backend not available
var fb={price:97432,change24h:2.35,mcap:1.93e12,volume:28.45e9,high24h:98800,low24h:95100,dominance:52.41,blockHeight:894820,hashrate:748.3,fearGreed:72,mempoolSize:18.45,txCount:362591,difficulty:86.87,activeAddresses:1020000,circulatingSupply:19750000,ethPrice:3152,ethChange:1.25,bnbPrice:595,bnbChange:3.12,solPrice:152,solChange:4.21};
setBtc(fb);
setHalvingSecs((HALVING_BLOCK-fb.blockHeight)*10*60);
setChartData(genChart(fb.price,7));
setSparks({btc:genSparkline(fb.price,20,0.015),eth:genSparkline(fb.ethPrice,20,0.015),usdt:genSparkline(1,20,0.001),bnb:genSparkline(fb.bnbPrice,20,0.015),sol:genSparkline(fb.solPrice,20,0.02),vol:genSparkline(fb.volume,20,0.04),mcap:genSparkline(fb.mcap,20,0.01),dom:genSparkline(fb.dominance,20,0.008)});
setDataStatus("fallback"); setLastUpdated(new Date());
});
},[]);

// Fetch news from backend
var fetchNews=useCallback(function(){
fetch(API_BASE+"/api/news",{signal:AbortSignal.timeout(10000)})
.then(function(r){return r.json();})
.then(function(d){if(d&&d.length>0)setNewsItems(d);})
.catch(function(){});
},[]);

useEffect(function(){
fetchData();
fetchNews();
var iv=setInterval(fetchData,60000);
var ivN=setInterval(fetchNews,300000);
return function(){clearInterval(iv);clearInterval(ivN);};
},[]);

// Halving tick
useEffect(function(){
if(!halvingSecs) return;
var iv=setInterval(function(){setHalvingSecs(function(s){return Math.max(0,s-1);});},1000);
return function(){clearInterval(iv);};
},[halvingSecs!==null]);

// Theme dropdown close
useEffect(function(){
if(!themeOpen) return;
function h(e){if(!e.target.closest("#tp"))setThemeOpen(false);}
document.addEventListener("mousedown",h);
return function(){document.removeEventListener("mousedown",h);};
},[themeOpen]);

function chC(c){return (c||0)>=0?T.green:T.red;}
function chS(c){return (c||0)>=0?"+":"";}
function cardS(ex){
var isLG = T.liquidGlass;
var base = {
background: isLG ? "rgba(255,255,255,0.07)" : T.card,
backdropFilter: isLG ? "blur(40px) saturate(200%) brightness(1.15)" : T.glass ? "blur(20px) saturate(180%)" : "none",
WebkitBackdropFilter: isLG ? "blur(40px) saturate(200%) brightness(1.15)" : T.glass ? "blur(20px) saturate(180%)" : "none",
border: isLG ? "1px solid rgba(255,255,255,0.22)" : "1px solid " + T.cardBorder,
borderRadius: isLG ? 20 : 12,
boxShadow: isLG ? "0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.1), 0 0 0 0.5px rgba(255,255,255,0.12)" : "none",
};
return Object.assign(base, ex || {});
}

var circ=btc.circulatingSupply?btc.circulatingSupply:btc.blockHeight?calcSupply(btc.blockHeight):19750000;
var circPct=parseFloat((circ/BTC_MAX*100).toFixed(2));
var blocksLeft=btc.blockHeight?HALVING_BLOCK-btc.blockHeight:null;

var mktRows=[
{rank:1,name:"Bitcoin", sym:"BTC", price:btc.price,   ch:btc.change24h, mcap:btc.mcap,                               spark:sparks.btc, col:COIN_COLORS.BTC},
{rank:2,name:"Ethereum",sym:"ETH", price:btc.ethPrice,ch:btc.ethChange, mcap:btc.ethPrice?btc.ethPrice*120e6:null,    spark:sparks.eth, col:COIN_COLORS.ETH},
{rank:3,name:"Tether",  sym:"USDT",price:1.00,        ch:-0.01,         mcap:111e9,                                  spark:sparks.usdt,col:COIN_COLORS.USDT},
{rank:4,name:"BNB",     sym:"BNB", price:btc.bnbPrice,ch:btc.bnbChange, mcap:btc.bnbPrice?btc.bnbPrice*144e6:null,   spark:sparks.bnb, col:COIN_COLORS.BNB},
{rank:5,name:"Solana",  sym:"SOL", price:btc.solPrice,ch:btc.solChange, mcap:btc.solPrice?btc.solPrice*440e6:null,    spark:sparks.sol, col:COIN_COLORS.SOL},
];
var onChain=[
{icon:"👥",label:"Active Addresses (24h)",val:btc.activeAddresses?(btc.activeAddresses/1e6).toFixed(2)+"M":"1.02M",ch:5.23},
{icon:"⚡",label:"Hash Rate",             val:btc.hashrate?btc.hashrate+" EH/s":"748 EH/s",                          ch:2.17},
{icon:"🔄",label:"Transactions (24h)",    val:btc.txCount?btc.txCount.toLocaleString():"362,591",                    ch:3.45},
{icon:"📦",label:"Mempool Size",          val:btc.mempoolSize?btc.mempoolSize+" MB":"18.45 MB",                      ch:-1.23},
{icon:"🎯",label:"Network Difficulty",    val:btc.difficulty?btc.difficulty+"T":"86.87T",                            ch:0.45},
{icon:"⛏️",label:"Blocks (24h)",          val:"144",                                                                   ch:2.86},
];
var priceCards=[
{lbl:"BTC Price",         icon:"₿", val:fmtP(btc.price),                           ch:btc.change24h,           spark:sparks.btc, col:COIN_COLORS.BTC},
{lbl:"24h Volume",        icon:"📊",val:fmtU(btc.volume),                          ch:btc.volume?12.62:null,   spark:sparks.vol, col:T.accent2},
{lbl:"Market Cap",        icon:"💎",val:fmtU(btc.mcap),                            ch:btc.mcap?1.89:null,      spark:sparks.mcap,col:"#a78bfa"},
{lbl:"BTC Dominance",     icon:"👑",val:btc.dominance?btc.dominance+"%":"—",        ch:btc.dominance?-0.43:null,spark:sparks.dom, col:"#fbbf24"},
{lbl:"Circulating Supply",icon:"🔄",val:circ.toLocaleString()+" BTC",              ch:null,sub:"93.81% of 21M",spark:null,       col:T.green},
];

// News ticker items (first 7)
var tickerNews=newsItems.length>0
?newsItems.slice(0,7).map(function(n){return n.title;})
:["Bitcoin breaks $97K resistance","Whales accumulate 15K BTC in 24h","BlackRock increases BTC holdings","ETF inflows hit record $2.1B this week","Lightning Network reaches 5,000 BTC","Fed signals rate cuts — BTC rallies","MicroStrategy adds 10K BTC to treasury"];

// Global CSS — using IBM Plex Mono for readability
var CSS=[
"@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}",
"@keyframes spin{to{transform:rotate(360deg)}}",
"@keyframes spinR{to{transform:rotate(-360deg)}}",
"@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}",
"@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}",
"@keyframes btcGlow{0%,100%{filter:drop-shadow(0 0 12px #f7931a)}50%{filter:drop-shadow(0 0 28px #f7931a)}}",
"@keyframes orbF{0%,100%{transform:translate(0,0)scale(1)}25%{transform:translate(50px,-60px)scale(1.1)}50%{transform:translate(-30px,60px)scale(.92)}75%{transform:translate(70px,30px)scale(1.05)}}",
".ni{transition:all .2s;cursor:pointer}",
".ni:hover{opacity:.85}",
".ch:hover{transform:translateY(-2px);transition:transform .2s,box-shadow .3s,border-color .3s}",
".ch:hover{box-shadow:0 12px 40px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.2)}",
".lg-shine{position:relative;overflow:hidden}",
".lg-shine::before{content:’’;position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:conic-gradient(from 180deg at 50% 50%,rgba(255,255,255,0) 0deg,rgba(255,255,255,0.05) 60deg,rgba(255,255,255,0.12) 120deg,rgba(255,255,255,0.05) 180deg,rgba(255,255,255,0) 240deg,rgba(255,255,255,0.03) 300deg,rgba(255,255,255,0) 360deg);pointer-events:none;animation:lgRotate 8s linear infinite}",
"@keyframes lgRotate{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}",
".lg-refract{position:relative}",
".lg-refract::after{content:’’;position:absolute;top:0;left:0;right:0;height:40%;background:linear-gradient(180deg,rgba(255,255,255,0.10) 0%,rgba(255,255,255,0.02) 60%,transparent 100%);border-radius:inherit;pointer-events:none}",
/* Mobile overlay sidebar */
".mob-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:19}",
"@media(max-width:767px){",
".mob-overlay{display:block}",
".mob-sidebar{position:fixed!important;left:0;top:0;bottom:0;z-index:20;transform:translateX(-100%);transition:transform .25s ease}",
".mob-sidebar.open{transform:translateX(0)!important}",
".row1-grid{grid-template-columns:1fr!important}",
".row1-grid{grid-template-columns:1fr!important}",
    ".row2-grid{grid-template-columns:repeat(2,1fr)!important}",
".row3-grid{grid-template-columns:1fr!important}",
    ".row3-grid>div{min-width:0!important;overflow:hidden!important;width:100%!important}",
    ".row3-grid [style*=gridTemplateColumns]{grid-template-columns:20px 1fr 70px 46px 60px 40px!important}",
    ".row3-grid [style*=Orbitron]{font-size:11px!important}",
    ".price-card-val{font-size:clamp(13px,3.5vw,19px)!important}",
    "body,html{overflow-x:hidden!important;max-width:100vw!important}",
".desktop-only{display:none!important}",
"}",
].join("");

return (
<div style={{position:"relative",height:"100vh",overflow:"hidden",background:"#060612",fontFamily:"‘IBM Plex Mono’,monospace"}}>
<style>{"@import url(‘https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap’);*{box-sizing:border-box;margin:0;padding:0}html,body{overflow:hidden;max-width:100vw}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:"+T.accent+"44;border-radius:4px}"+CSS}</style>

  {/* NEWS PAGE OVERLAY */}
  {showNews&&<NewsPage T={T} onBack={function(){setShowNews(false);}} newsItems={newsItems}/>}

  {/* LOADER */}
  {!appLoaded&&(
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"#060612",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:36}}>
      <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
        <div style={{position:"absolute",width:500,height:500,top:-200,left:-150,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,255,200,.12),transparent 70%)",filter:"blur(80px)",animation:"orbF 18s linear infinite"}}/>
        <div style={{position:"absolute",width:350,height:350,bottom:-100,right:-100,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,170,255,.12),transparent 70%)",filter:"blur(80px)",animation:"orbF 24s linear infinite reverse"}}/>
      </div>
      <div style={{position:"relative",width:160,height:160}}>
        <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"2px solid transparent",borderTopColor:"#00ffcc",animation:"spin 1.2s linear infinite"}}/>
        <div style={{position:"absolute",inset:12,borderRadius:"50%",border:"2px solid transparent",borderTopColor:"#00aaff",animation:"spinR 1.8s linear infinite"}}/>
        <div style={{position:"absolute",inset:24,borderRadius:"50%",border:"2px solid transparent",borderTopColor:"rgba(0,255,200,.3)",animation:"spin 2.6s linear infinite"}}/>
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",animation:"btcGlow 2s ease-in-out infinite"}}>
          <BtcIcon size={88} glow="#f7931a"/>
        </div>
      </div>
      <div style={{textAlign:"center"}}>
        <div style={{fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:"clamp(20px,4vw,30px)",letterSpacing:"0.16em",color:"#ffffff"}}>
          HOUSE OF <span style={{color:"#f7931a"}}>BITCOIN</span>
        </div>
        <div style={{fontSize:12,color:"rgba(255,255,255,.4)",letterSpacing:"0.15em",marginTop:6}}>DECENTRALIZED INTELLIGENCE DASHBOARD</div>
      </div>
      <div style={{width:300,display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
        <div style={{width:"100%",height:3,background:"rgba(255,255,255,.08)",borderRadius:2,overflow:"hidden"}}>
          <div style={{height:"100%",width:loadPct+"%",background:"linear-gradient(90deg,#f7931a,#ffb347)",borderRadius:2,boxShadow:"0 0 12px rgba(247,147,26,.6)",transition:"width .3s ease"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",width:"100%",alignItems:"center"}}>
          <div style={{fontSize:12,color:"rgba(255,255,255,.45)",letterSpacing:"0.05em"}}>{LOADER_STEPS[loadIdx]}</div>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:14,fontWeight:700,color:"#f7931a"}}>{loadPct}%</div>
        </div>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
        {["Bitcoin Core","Electrs","Mempool.space","CoinGecko","RSS News"].map(function(n){
          return <div key={n} style={{padding:"4px 12px",borderRadius:20,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.09)",fontSize:11,color:"rgba(255,255,255,.35)"}}><span style={{color:"#f7931a"}}>●</span> {n}</div>;
        })}
      </div>
    </div>
  )}

  {/* DASHBOARD */}
  <div style={{display:"flex",height:"100vh",overflow:"hidden",background:T.bg,color:T.text,opacity:appLoaded?1:0,transition:"opacity .8s ease",pointerEvents:appLoaded?"all":"none"}}>

    {/* Mobile overlay - closes sidebar when tapped outside */}
    {isMobile&&sidebarOpen&&(
      <div className="mob-overlay" onClick={function(){setSidebarOpen(false);}}/>
    )}

    {/* SIDEBAR */}
    <div className={"mob-sidebar"+(sidebarOpen?" open":"")} style={{width:isMobile?210:(sidebarOpen?210:62),flexShrink:0,background:T.liquidGlass?"rgba(14,17,24,0.55)":T.sidebar,backdropFilter:T.liquidGlass?"blur(50px) saturate(200%) brightness(1.1)":"none",WebkitBackdropFilter:T.liquidGlass?"blur(50px) saturate(200%) brightness(1.1)":"none",borderRight:"1px solid "+(T.liquidGlass?"rgba(255,255,255,0.16)":T.cardBorder),display:"flex",flexDirection:"column",transition:"width .25s ease",overflow:"hidden",zIndex:20}}>
      {/* Logo */}
      <div style={{padding:"0 12px",height:58,display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid "+T.cardBorder,flexShrink:0,gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8,overflow:"hidden",flex:1,minWidth:0}}>
          <BtcIcon size={28} glow={T.accent}/>
          <div style={{opacity:sidebarOpen?1:0,maxWidth:sidebarOpen?200:0,overflow:"hidden",transition:"opacity .2s ease,max-width .25s ease",display:"flex",flexDirection:"column",gap:1}}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,fontWeight:900,letterSpacing:"0.05em",whiteSpace:"nowrap"}}>
              HOUSE OF <span style={{color:T.accent}}>BITCOIN</span>
            </div>
            <a href="https://prashantbhatt.net" target="_blank" rel="noopener noreferrer"
              style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:T.textMuted,textDecoration:"none",whiteSpace:"nowrap",transition:"color .2s"}}
              onMouseEnter={function(e){e.currentTarget.style.color=T.accent;}}
              onMouseLeave={function(e){e.currentTarget.style.color=T.textMuted;}}>
              by Prashant Bhatt ↗
            </a>
          </div>
        </div>
        <button onClick={function(){setSidebarOpen(function(o){return !o;});}}
          style={{width:28,height:28,borderRadius:7,flexShrink:0,background:T.card,border:"1px solid "+T.cardBorder,color:T.textSec,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .2s"}}
          onMouseEnter={function(e){e.currentTarget.style.borderColor=T.accent;e.currentTarget.style.color=T.accent;}}
          onMouseLeave={function(e){e.currentTarget.style.borderColor=T.cardBorder;e.currentTarget.style.color=T.textSec;}}>
          {sidebarOpen?"◀":"▶"}
        </button>
      </div>
      {/* Nav */}
      <nav style={{flex:1,padding:"12px 8px",display:"flex",flexDirection:"column",gap:3,overflowY:"auto"}}>
        {NAV_ITEMS.map(function(item){
          var active=activePage===item.label;
          var isNews=item.label==="News";
          return (
            <div key={item.label} className="ni"
              onClick={function(){
                setActivePage(item.label);
                if(isNews) setShowNews(true);
              }}
              style={{display:"flex",alignItems:"center",gap:10,padding:"10px 10px",borderRadius:8,background:active?T.navActive:"transparent",borderLeft:active?"3px solid "+T.navActiveBorder:"3px solid transparent",color:active?T.text:T.textSec,whiteSpace:"nowrap"}}>
              <span style={{fontSize:16,flexShrink:0,width:22,textAlign:"center"}}>{item.icon}</span>
              {sidebarOpen&&<span style={{fontSize:13}}>{item.label}</span>}
            </div>
          );
        })}
      </nav>
      {/* Footer */}
      {sidebarOpen&&(
        <div style={{padding:"14px 16px",borderTop:"1px solid "+T.cardBorder,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:dataStatus==="live"?T.green:"#ffaa00",animation:"pulse 2s ease-in-out infinite"}}/>
            <span style={{fontSize:11,color:T.textSec}}>{dataStatus==="live"?"Connected to API":"Connecting..."}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:T.green,animation:"pulse 2s ease-in-out infinite"}}/>
            <span style={{fontSize:11,color:T.textSec}}>Backend Online</span>
          </div>
          <div style={{fontSize:11,color:T.textMuted}}>House of Bitcoin</div>
          <div style={{fontSize:10,color:T.textMuted}}>v1.0.0</div>
        </div>
      )}
    </div>

    {/* MAIN */}
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>

      {/* HEADER */}
      <header style={{height:58,flexShrink:0,background:T.liquidGlass?"rgba(14,17,24,0.45)":T.header,backdropFilter:T.liquidGlass?"blur(50px) saturate(220%) brightness(1.12)":"blur(20px)",WebkitBackdropFilter:T.liquidGlass?"blur(50px) saturate(220%) brightness(1.12)":"blur(20px)",borderBottom:"1px solid "+(T.liquidGlass?"rgba(255,255,255,0.14)":T.cardBorder),display:"flex",alignItems:"center",padding:"0 16px",gap:12,zIndex:10}}>

        {/* Hamburger - mobile only */}
        {isMobile&&(
          <button onClick={function(){setSidebarOpen(function(o){return !o;});}}
            style={{width:36,height:36,borderRadius:8,background:T.card,border:"1px solid "+T.cardBorder,color:T.text,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            ☰
          </button>
        )}
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",background:"rgba(34,197,94,.12)",border:"1px solid rgba(34,197,94,.25)",borderRadius:20,fontSize:13,color:T.green,whiteSpace:"nowrap"}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:T.green,animation:"pulse 1.5s infinite"}}/> Market is Open
        </div>
        <div style={{flex:1,display:"flex",alignItems:"center",gap:8,background:T.card,border:"1px solid "+T.cardBorder,borderRadius:20,padding:"7px 16px"}}>
          <span style={{color:T.textMuted,fontSize:14}}>🔍</span>
          <input placeholder="Search anything..." style={{background:"transparent",border:"none",outline:"none",color:T.text,fontFamily:"'IBM Plex Mono',monospace",fontSize:13,flex:1,minWidth:0}}/>
        </div>
        <button className="desktop-only" style={{background:"none",border:"none",color:T.textSec,fontSize:20,cursor:"pointer"}}>☆</button>
        <button className="desktop-only" style={{background:"none",border:"none",color:T.textSec,fontSize:20,cursor:"pointer"}}>🔔</button>
        {/* Theme picker */}
        <div id="tp" style={{position:"relative"}}>
          <button onClick={function(){setThemeOpen(function(o){return !o;});}}
            style={{display:"flex",alignItems:"center",gap:8,padding:"7px 16px",background:T.card,border:"1px solid "+T.cardBorder,backdropFilter:"blur(10px)",borderRadius:20,cursor:"pointer",color:T.text,fontFamily:"'IBM Plex Mono',monospace",fontSize:13,whiteSpace:"nowrap"}}>
            ☀ Theme <span style={{color:T.textMuted}}>▾</span>
          </button>
          {themeOpen&&(
            <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,zIndex:100,background:"#060612",border:"1px solid "+T.cardBorder,borderRadius:12,padding:8,minWidth:180,boxShadow:"0 12px 40px rgba(0,0,0,.8)"}}>
              {Object.keys(THEMES).map(function(name){
                return (
                  <div key={name} className="ni" onClick={function(){setThemeName(name);setThemeOpen(false);}}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:8,background:themeName===name?"rgba(255,255,255,.08)":"transparent",color:themeName===name?T.accent:"rgba(255,255,255,.7)"}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:THEMES[name].accent,boxShadow:"0 0 6px "+THEMES[name].accent}}/>
                    <span style={{fontSize:13}}>{name}</span>
                    {themeName===name&&<span style={{marginLeft:"auto",color:T.accent,fontSize:12}}>✓</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* Status */}
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",background:T.card,border:"1px solid "+T.cardBorder,borderRadius:20,fontSize:11,color:T.textSec,whiteSpace:"nowrap"}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:dataStatus==="live"?T.green:"#ffaa00",animation:"pulse 1.5s infinite"}}/>
          {dataStatus==="live"?"LIVE":dataStatus==="fallback"?"DEMO":"SYNC"}
        </div>
      </header>

      {/* BODY */}
      <div style={{flex:1,overflowY:"auto",overflowX:"hidden",padding:16,position:"relative"}}>

        {/* Liquid Glass ambient light orbs - content refracts through these */}
        {T.liquidGlass&&(
          <div style={{position:"fixed",top:0,left:210,right:0,bottom:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
            <div style={{position:"absolute",width:500,height:500,top:"10%",left:"20%",borderRadius:"50%",background:"radial-gradient(circle,rgba(168,85,247,0.15),transparent 70%)",filter:"blur(100px)",animation:"orbF 22s linear infinite"}}/>
            <div style={{position:"absolute",width:400,height:400,top:"50%",right:"10%",borderRadius:"50%",background:"radial-gradient(circle,rgba(247,147,26,0.12),transparent 70%)",filter:"blur(100px)",animation:"orbF 28s linear infinite reverse"}}/>
            <div style={{position:"absolute",width:350,height:350,bottom:"10%",left:"40%",borderRadius:"50%",background:"radial-gradient(circle,rgba(52,211,153,0.10),transparent 70%)",filter:"blur(100px)",animation:"orbF 32s linear infinite"}}/>
          </div>
        )}

        {/* ROW 1 */}
        <div className="row1-grid" style={{display:"grid",gridTemplateColumns:"220px 1fr 290px",gap:12,marginBottom:12}}>

          {/* Supply Ring */}
          <div className={"ch"+(T.liquidGlass?" lg-shine lg-refract":"")} style={cardS({padding:"16px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,position:"relative",overflow:"hidden",minHeight:268})}>
            <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 50% 50%,"+T.accent+"18,transparent 70%)",pointerEvents:"none"}}/>
            <BtcRing pct={circPct} accent={T.accent} accent2={T.accent2} textCol={T.text}/>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,marginTop:2}}>
              <div style={{fontSize:13,fontWeight:700,color:T.text,fontFamily:"'Orbitron',monospace"}}>{circ.toLocaleString()} BTC</div>
              <div style={{fontSize:11,color:T.textMuted,letterSpacing:"0.08em",textTransform:"uppercase"}}>of 21,000,000 Max Supply</div>
              <div style={{marginTop:2,padding:"3px 12px",borderRadius:20,background:T.accent+"18",border:"1px solid "+T.accent+"33",fontSize:11,color:T.accent}}>
                {(BTC_MAX-circ).toLocaleString()} BTC unmined
              </div>
            </div>
          </div>

          {/* Halving Timer */}
          <div className={"ch"+(T.liquidGlass?" lg-shine lg-refract":"")} style={cardS({padding:"clamp(14px,2vw,22px) clamp(12px,2vw,26px)",display:"flex",flexDirection:"column",gap:16,position:"relative",overflow:"hidden"})}>
            <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 100%,"+T.accent2+"22,transparent 60%)",pointerEvents:"none"}}/>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontSize:12,letterSpacing:"0.2em",color:T.textMuted,textTransform:"uppercase"}}>Bitcoin Halving Countdown</div>
              <div style={{padding:"5px 14px",background:T.card,border:"1px solid "+T.cardBorder,borderRadius:6,color:T.textSec,fontSize:12}}>Next Halving</div>
            </div>
            {halvingSecs!==null
              ?<HalvingClock secs={halvingSecs} accent={T.accent} textCol={T.text} textMuted={T.textMuted}/>
              :<div style={{display:"flex",justifyContent:"center",alignItems:"center",height:80}}>
                <div style={{width:30,height:30,borderRadius:"50%",border:"3px solid "+T.accent+"44",borderTopColor:T.accent,animation:"spin .8s linear infinite"}}/>
              </div>
            }
            <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"center"}}>
              <div style={{fontSize:13,color:T.textSec}}>Estimated Date: <span style={{color:T.text,fontWeight:700}}>April 27, 2028</span></div>
              <div style={{fontSize:12,color:T.textMuted}}>~ {blocksLeft?blocksLeft.toLocaleString():"—"} blocks remaining</div>
            </div>
            <div style={{width:"100%",height:3,background:"rgba(255,255,255,.06)",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",width:circPct+"%",background:"linear-gradient(90deg,"+T.accent+","+T.accent2+")",borderRadius:2,transition:"width .5s ease"}}/>
            </div>
          </div>

          {/* Fear & Greed */}
          <div className={"ch"+(T.liquidGlass?" lg-shine lg-refract":"")} style={cardS({padding:"18px",display:"flex",flexDirection:"column",gap:12})}>
            <div style={{fontSize:12,letterSpacing:"0.18em",color:T.textMuted,textTransform:"uppercase"}}>Fear &amp; Greed Index</div>
            <FGGauge value={btc.fearGreed||72} T={T}/>
            <div style={{fontSize:13,color:T.textSec,textAlign:"center"}}>
              Market sentiment is <span style={{color:T.green,fontWeight:700}}>{btc.fearGreed?(btc.fearGreed>60?"Greed":btc.fearGreed>40?"Neutral":"Fear"):"Greed"}</span>
            </div>
            <div style={{fontSize:12,color:T.textMuted,textAlign:"center"}}>Yesterday: 68 <span style={{color:T.green}}>(Greed)</span></div>
            <div style={{width:"100%",height:64}}>
              <ResponsiveContainer width="100%" height={64}>
                <LineChart data={fgSpark}>
                  <Line type="monotone" dataKey="v" stroke={T.green} strokeWidth={2} dot={false}/>
                  <YAxis domain={[0,100]} hide/>
                  <ReferenceLine y={50} stroke="rgba(255,255,255,.1)" strokeDasharray="3 3"/>
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:T.textMuted}}>
              <span>0 Fear</span><span>50</span><span>100 Greed</span>
            </div>
          </div>
        </div>

        {/* ROW 2: Price Cards */}
        <div className="row2-grid" style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:12}}>
          {priceCards.map(function(item,i){
            return (
              <div key={i} className={"ch"+(T.liquidGlass?" lg-refract":"")} style={cardS({padding:"16px",display:"flex",flexDirection:"column",gap:7})}>
                <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:T.textMuted}}><span>{item.icon}</span>{item.lbl}</div>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:"clamp(14px,1.5vw,19px)",fontWeight:700,color:T.text,lineHeight:1.2}}>{item.val}</div>
                {item.ch!=null&&<div style={{fontSize:13,color:chC(item.ch),fontWeight:600}}>{item.ch>=0?"↑":"↓"} {chS(item.ch)}{Math.abs(item.ch).toFixed(2)}% (24h)</div>}
                {item.sub&&<div style={{fontSize:12,color:T.textMuted}}>{item.sub}</div>}
                {item.spark&&(
                  <div style={{width:"100%",height:38,marginTop:4}}>
                    <ResponsiveContainer width="100%" height={38}>
                      <LineChart data={item.spark}><Line type="monotone" dataKey="v" stroke={item.col} strokeWidth={1.8} dot={false}/></LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ROW 3 */}
        <div className="row3-grid" style={{display:"grid",gridTemplateColumns:"1fr 1.4fr 290px",gap:12}}>

          {/* Market Table */}
          <div style={cardS({padding:"18px",display:"flex",flexDirection:"column",gap:12})}>
            <div style={{fontSize:12,letterSpacing:"0.18em",color:T.textMuted,textTransform:"uppercase"}}>Market Overview</div>
            <div style={{display:"grid",gridTemplateColumns:"20px 1fr 86px 58px 76px 52px",gap:4,fontSize:11,color:T.textMuted,paddingBottom:8,borderBottom:"1px solid "+T.cardBorder}}>
              <span>#</span><span>Name</span><span>Price</span><span>24h%</span><span>Mkt Cap</span><span>7D</span>
            </div>
            {mktRows.map(function(row,i){
              return (
                <div key={i} style={{display:"grid",gridTemplateColumns:"20px 1fr 86px 58px 76px 52px",gap:4,alignItems:"center",fontSize:13,padding:"5px 0",borderBottom:i<mktRows.length-1?"1px solid "+T.cardBorder+"55":"none"}}>
                  <span style={{color:T.textMuted,fontSize:12}}>{row.rank}</span>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <div style={{width:24,height:24,borderRadius:"50%",background:row.col,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0}}>{row.sym[0]}</div>
                    <div>
                      <div style={{fontSize:13,color:T.text,fontWeight:600}}>{row.name}</div>
                      <div style={{fontSize:10,color:T.textMuted}}>{row.sym}</div>
                    </div>
                  </div>
                  <span style={{color:T.text,fontFamily:"'Orbitron',monospace",fontSize:12}}>{row.price?"$"+row.price.toLocaleString("en-US",{maximumFractionDigits:2}):"—"}</span>
                  <span style={{color:chC(row.ch),fontSize:12}}>{row.ch!=null?chS(row.ch)+Math.abs(row.ch).toFixed(2)+"%":"—"}</span>
                  <span style={{color:T.textSec,fontSize:12}}>{fmtU(row.mcap)}</span>
                  <div style={{width:"100%",height:26}}>
                    {row.spark&&<ResponsiveContainer width="100%" height={26}><LineChart data={row.spark}><Line type="monotone" dataKey="v" stroke={chC(row.ch)} strokeWidth={1.4} dot={false}/></LineChart></ResponsiveContainer>}
                  </div>
                </div>
              );
            })}
            <button style={{width:"100%",padding:"9px",background:T.card,border:"1px solid "+T.cardBorder,borderRadius:8,color:T.textSec,fontSize:13,cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace",transition:"border-color .2s"}}
              onMouseEnter={function(e){e.currentTarget.style.borderColor=T.accent;}}
              onMouseLeave={function(e){e.currentTarget.style.borderColor=T.cardBorder;}}>
              View All Markets
            </button>
          </div>

          {/* Price Chart */}
          <div style={cardS({padding:"18px",display:"flex",flexDirection:"column",gap:12})}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontSize:12,letterSpacing:"0.18em",color:T.textMuted,textTransform:"uppercase"}}>Bitcoin Price Chart</div>
              <div style={{display:"flex",gap:4}}>
                {["1D","7D","1M","3M","1Y","ALL"].map(function(r){
                  return (
                    <button key={r} onClick={function(){setChartRange(r);setChartData(genChart(btc.price||97000,r==="1D"?1:r==="7D"?7:r==="1M"?30:r==="3M"?90:r==="1Y"?365:730));}}
                      style={{padding:"4px 9px",borderRadius:6,fontSize:11,background:chartRange===r?T.accent:T.card,border:"1px solid "+(chartRange===r?T.accent:T.cardBorder),color:chartRange===r?"#000":T.textSec,cursor:"pointer",fontFamily:"'IBM Plex Mono',monospace",transition:"all .15s"}}>
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={226}>
              <LineChart data={chartData} margin={{top:5,right:5,bottom:5,left:0}}>
                <defs>
                  <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={T.chartLine} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={T.chartLine} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.cardBorder} vertical={false}/>
                <XAxis dataKey="t" tick={{fill:T.textMuted,fontSize:11}} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
                <YAxis tick={{fill:T.textMuted,fontSize:11}} tickLine={false} axisLine={false} tickFormatter={function(v){return "$"+(v/1000).toFixed(0)+"K";}} domain={["auto","auto"]} width={44}/>
                <Tooltip contentStyle={{background:T.sidebar,border:"1px solid "+T.cardBorder,borderRadius:8,fontSize:12,fontFamily:"'IBM Plex Mono',monospace"}} labelStyle={{color:T.textMuted}} itemStyle={{color:T.chartLine}} formatter={function(v){return["$"+v.toLocaleString(),"BTC"];}}/>
                <Line type="monotone" dataKey="p" stroke={T.chartLine} strokeWidth={2.5} dot={false} activeDot={{r:5,fill:T.chartLine}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* On-Chain */}
          <div style={cardS({padding:"18px",display:"flex",flexDirection:"column",gap:12})}>
            <div style={{fontSize:12,letterSpacing:"0.18em",color:T.textMuted,textTransform:"uppercase"}}>On-Chain Metrics</div>
            {onChain.map(function(item,i){
              return (
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:i<onChain.length-1?"1px solid "+T.cardBorder+"55":"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:15}}>{item.icon}</span>
                    <span style={{fontSize:12,color:T.textSec}}>{item.label}</span>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:1}}>
                    <span style={{fontSize:13,fontWeight:700,color:T.text,fontFamily:"'Orbitron',monospace"}}>{item.val}</span>
                    <span style={{fontSize:11,color:chC(item.ch)}}>{item.ch>=0?"↑":"↓"} {Math.abs(item.ch).toFixed(2)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* NEWS TICKER */}
      <div style={{height:40,flexShrink:0,background:T.sidebar,borderTop:"1px solid "+T.cardBorder,display:"flex",alignItems:"center",overflow:"hidden"}}>
        {/* NEWS label */}
        <div style={{padding:"0 16px",height:"100%",display:"flex",alignItems:"center",background:T.accent,flexShrink:0,gap:6,fontSize:12,fontWeight:700,color:"#000",letterSpacing:"0.08em"}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:"#000"}}/> NEWS
        </div>
        {/* Scrolling */}
        <div style={{flex:1,overflow:"hidden"}}>
          <div style={{display:"flex",gap:0,whiteSpace:"nowrap",animation:"ticker 35s linear infinite"}}>
            {[0,1].map(function(j){
              return (
                <div key={j} style={{display:"flex",gap:0,flexShrink:0}}>
                  {tickerNews.map(function(n,i){
                    return <span key={i} style={{fontSize:13,color:T.textSec,padding:"0 28px"}}><span style={{color:T.accent,marginRight:8}}>•</span>{n}</span>;
                  })}
                </div>
              );
            })}
          </div>
        </div>
        {/* More News button */}
        <button onClick={function(){setShowNews(true);}}
          style={{padding:"0 16px",height:"100%",flexShrink:0,background:"transparent",border:"none",borderLeft:"1px solid "+T.cardBorder,color:T.accent,cursor:"pointer",fontSize:13,fontFamily:"'IBM Plex Mono',monospace",fontWeight:600,whiteSpace:"nowrap",transition:"background .2s"}}
          onMouseEnter={function(e){e.currentTarget.style.background=T.accent+"22";}}
          onMouseLeave={function(e){e.currentTarget.style.background="transparent";}}>
          More &gt;
        </button>
        {/* Status */}
        <div style={{padding:"0 16px",flexShrink:0,display:"flex",alignItems:"center",gap:10,fontSize:11,color:T.textMuted,borderLeft:"1px solid "+T.cardBorder}}>
          <div style={{display:"flex",alignItems:"center",gap:5,color:T.green}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:T.green,animation:"pulse 1.5s infinite"}}/>
            Live data
          </div>
          <span>{lastUpdated?lastUpdated.toLocaleTimeString():"--:--"}</span>
          <button onClick={fetchData} style={{background:"none",border:"none",color:T.textMuted,cursor:"pointer",fontSize:15}}>↻</button>
        </div>
      </div>

    </div>
  </div>
</div>

);
}
