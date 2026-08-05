import { useEffect, useMemo, useRef, useState } from 'react';

const START_BALANCE = 10000;
const BETS = [10,25,50,100,250,500];
const ADD_VALUES = [1000,2500,5000,10000,25000,50000];
const games = [
  {id:'fortune',name:'Neku Fortune',tag:'FREE SPINS',theme:'fortune',desc:'Wild, Scatter e Tigre Dourado.'},
  {id:'dragon',name:'Dragon Inferno',tag:'HOLD & WIN',theme:'dragon',desc:'Acenda os seis cristais do dragão.'},
  {id:'royal',name:'Royal Gems',tag:'CASCATA',theme:'royal',desc:'Combinações desaparecem e multiplicam.'},
  {id:'jungle',name:'Jungle Spirit',tag:'RODADAS BÔNUS',theme:'jungle',desc:'Totens despertam o modo selvagem.'},
  {id:'crash',name:'Neku Rocket',tag:'AO VIVO',theme:'crash',desc:'Duas mãos e rodadas contínuas.'},
];
const configs={
 fortune:{symbols:['tiger','crown','lantern','coin','jade','ace','king'],special:'lantern',goal:5,cols:5,rows:3},
 dragon:{symbols:['dragon','orb','flame','temple','coin','ace','king'],special:'orb',goal:6,cols:5,rows:3},
 royal:{symbols:['diamond','ruby','crown','seven','bar','ace','queen'],special:'diamond',goal:4,cols:5,rows:3},
 jungle:{symbols:['mask','totem','sun','leaf','ruby','ace','king'],special:'totem',goal:4,cols:6,rows:4},
};
const fmt=(v)=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const random=()=>{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296};
const pick=(arr)=>arr[Math.floor(random()*arr.length)];
const makeGrid=(id)=>{const c=configs[id];return Array.from({length:c.cols*c.rows},()=>pick(c.symbols))};
const emptyHand=(bet=50)=>({bet,queued:false,active:false,cashed:false,payout:0,mult:0});

export default function App(){
 const [screen,setScreen]=useState('lobby');
 const [balance,setBalance]=useState(START_BALANCE);
 const [showWallet,setShowWallet]=useState(false);
 const [bet,setBet]=useState(50);
 const [grid,setGrid]=useState(makeGrid('fortune'));
 const [spinning,setSpinning]=useState(false);
 const [meters,setMeters]=useState({fortune:0,dragon:0,royal:0,jungle:0});
 const [freeSpins,setFreeSpins]=useState({fortune:0,dragon:0,royal:0,jungle:0});
 const [win,setWin]=useState(null);
 const [history,setHistory]=useState([]);
 const [roundPhase,setRoundPhase]=useState('waiting');
 const [countdown,setCountdown]=useState(6);
 const [multiplier,setMultiplier]=useState(1);
 const [path,setPath]=useState([{x:2,y:94}]);
 const [recent,setRecent]=useState([1.12,1.05,8.31,1.42,2.18,7.86,1.09]);
 const [hands,setHands]=useState([emptyHand(50),emptyHand(100)]);
 const target=useRef(2); const raf=useRef(null); const started=useRef(0); const multRef=useRef(1);
 const current=games.find(g=>g.id===screen);
 const totalPlayed=useMemo(()=>history.reduce((s,h)=>s+h.bet,0),[history]);

 useEffect(()=>()=>cancelAnimationFrame(raf.current),[]);
 useEffect(()=>{if(screen!=='crash')return;let id;
  if(roundPhase==='waiting') id=setInterval(()=>setCountdown(v=>v<=1?(startRound(),6):v-1),1000);
  if(roundPhase==='crashed') id=setTimeout(()=>{setRoundPhase('waiting');setCountdown(6);setMultiplier(1);setPath([{x:2,y:94}]);setHands(h=>h.map(x=>({...x,active:false,cashed:false,payout:0,mult:0})))},1800);
  return()=>{clearInterval(id);clearTimeout(id)};
 },[screen,roundPhase]);

 const addHistory=(game,wager,payout,detail)=>setHistory(h=>[{id:crypto.randomUUID(),game,bet:wager,payout,detail,time:new Date().toLocaleTimeString('pt-BR')},...h].slice(0,40));
 const addMoney=(amount)=>{setBalance(v=>v+amount);setShowWallet(false)};
 const openGame=(id)=>{setScreen(id);setWin(null);if(configs[id])setGrid(makeGrid(id))};

 function weightedGrid(id){
  const c=configs[id];
  const result=makeGrid(id);
  const chance=random();
  if(chance<.62){
   const unique=[...c.symbols];
   for(let i=0;i<result.length;i++) result[i]=unique[i%unique.length];
   result.sort(()=>random()-.5);
  }else if(chance<.88){
   const sym=pick(c.symbols.filter(s=>s!==c.special));
   const count=3+Math.floor(random()*2);
   for(let i=0;i<count;i++)result[Math.floor(random()*result.length)]=sym;
  }else{
   const specialCount=2+Math.floor(random()*3);
   for(let i=0;i<specialCount;i++)result[Math.floor(random()*result.length)]=c.special;
  }
  return result;
 }
 function evaluateSlot(id,result,wager){
  const c=configs[id]; const counts=result.reduce((a,s)=>(a[s]=(a[s]||0)+1,a),{});
  const best=Math.max(...Object.values(counts)); const specials=counts[c.special]||0;
  let payout=0; let detail='Sem prêmio nesta rodada'; let meter=meters[id];
  if(best>=8)payout=wager*8; else if(best>=6)payout=wager*4; else if(best>=5)payout=wager*2; else if(best>=4&&random()<.38)payout=wager;
  if(specials>=3){meter=Math.min(c.goal,meter+2);detail=`${specials} símbolos bônus conectados`;}
  else if(specials>0){meter=Math.min(c.goal,meter+1);detail='Medidor de bônus avançou';}
  if(id==='royal'&&payout>0&&random()<.32){payout*=2;detail='Cascata x2 ativada';}
  if(meter>=c.goal){meter=0;const bonusWin=wager*(6+Math.floor(random()*10));payout+=bonusWin;setFreeSpins(f=>({...f,[id]:f[id]+(id==='fortune'?6:3)}));detail=id==='dragon'?'HOLD & WIN: cristais completos':id==='jungle'?'MODO SELVAGEM LIBERADO':id==='royal'?'CASCATA REAL COMPLETA':'6 GIROS GRÁTIS LIBERADOS';}
  setMeters(m=>({...m,[id]:meter}));
  payout=Math.floor(payout);
  if(payout>0){setBalance(v=>v+payout);setWin({title:payout>=wager*10?'MEGA WIN':payout>=wager*4?'BIG WIN':'VOCÊ GANHOU',amount:payout,detail});}
  addHistory(current.name,wager,payout,detail);
 }
 function spin(){
  if(spinning)return; const isFree=freeSpins[screen]>0; if(!isFree&&balance<bet)return setWin({title:'SALDO INSUFICIENTE',amount:0,detail:'Adicione saldo fictício ou reduza a aposta.'});
  setWin(null);setSpinning(true);if(isFree)setFreeSpins(f=>({...f,[screen]:f[screen]-1}));else setBalance(v=>v-bet);
  let ticks=0;const timer=setInterval(()=>{ticks++;setGrid(makeGrid(screen));if(ticks>=14){clearInterval(timer);const final=weightedGrid(screen);setGrid(final);setSpinning(false);evaluateSlot(screen,final,isFree?bet:bet)}},60);
 }

 function generateCrash(){const r=random();return Math.min(40,Math.max(1.02,Number((.96/Math.max(.025,1-r)).toFixed(2))))}
 function queueHand(index){
  if(roundPhase!=='waiting')return;
  setHands(h=>h.map((hand,i)=>{if(i!==index)return hand;if(hand.queued)return {...hand,queued:false};if(balance<hand.bet)return hand;return {...hand,queued:true}}));
 }
 function setHandBet(index,value){if(roundPhase!=='waiting')return;setHands(h=>h.map((x,i)=>i===index?{...x,bet:value}:x))}
 function startRound(){
  let cost=0;setHands(h=>h.map(x=>{if(x.queued){cost+=x.bet;return {...x,queued:false,active:true,cashed:false,payout:0,mult:0}}return {...x,active:false,cashed:false,payout:0,mult:0}}));
  setBalance(v=>Math.max(0,v-cost));target.current=generateCrash();multRef.current=1;setMultiplier(1);setPath([{x:2,y:94}]);setRoundPhase('flying');started.current=performance.now();raf.current=requestAnimationFrame(animateCrash);
 }
 function animateCrash(now){const sec=(now-started.current)/1000;const m=Number((1+Math.pow(sec*.72,1.55)).toFixed(2));if(m>=target.current)return finishCrash();multRef.current=m;setMultiplier(m);const x=Math.min(95,3+sec*8.5);const y=Math.max(8,94-Math.log(m)*29);setPath(p=>[...p.slice(-130),{x,y}]);raf.current=requestAnimationFrame(animateCrash)}
 function finishCrash(){cancelAnimationFrame(raf.current);setMultiplier(target.current);setRecent(r=>[target.current,...r].slice(0,10));setHands(h=>h.map(x=>{if(x.active&&!x.cashed)addHistory('Neku Rocket',x.bet,0,`Crash ${target.current.toFixed(2)}x`);return {...x,active:false}}));setRoundPhase('crashed')}
 function cashHand(index){if(roundPhase!=='flying')return;setHands(h=>h.map((x,i)=>{if(i!==index||!x.active||x.cashed)return x;const payout=Math.floor(x.bet*multRef.current);setBalance(v=>v+payout);addHistory(`Neku Rocket · Mão ${index+1}`,x.bet,payout,`Saque ${multRef.current.toFixed(2)}x`);setWin({title:'VOCÊ SACOU',amount:payout,detail:`Mão ${index+1} retirada em ${multRef.current.toFixed(2)}x`});return {...x,cashed:true,payout,mult:multRef.current}}))}
 const d=path.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ');const last=path.at(-1)||{x:2,y:94};

 return <div className="neku-v5">
  <header className="v5-header"><button className="v5-logo" onClick={()=>setScreen('lobby')}><span>N</span><div><b>NEKU</b><small>PLAY CLUB</small></div></button><nav><button onClick={()=>setScreen('lobby')}>Lobby</button><button onClick={()=>setScreen('crash')}>Crash</button><button onClick={()=>setScreen('history')}>Histórico</button></nav><button className="balance" onClick={()=>setShowWallet(true)}><strong>{fmt(balance)}</strong><i>+</i></button></header>
  {showWallet&&<div className="wallet-overlay" onClick={()=>setShowWallet(false)}><section onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setShowWallet(false)}>×</button><small>SALDO FICTÍCIO</small><h2>Adicionar valor para brincar</h2><div>{ADD_VALUES.map(v=><button key={v} onClick={()=>addMoney(v)}>{fmt(v)}</button>)}</div><p>Não há depósito, saque ou dinheiro real.</p></section></div>}

  {screen==='lobby'&&<main className="v5-main"><section className="v5-hero"><div><span>NEKU ORIGINALS</span><h1>Uma experiência mais viva, colorida e imersiva.</h1><p>Slots com RNG, bônus progressivos e Crash contínuo com duas mãos.</p><button onClick={()=>openGame('fortune')}>ENTRAR NO CASSINO</button></div><div className="hero-machine"><i/><b>JACKPOT</b></div></section><div className="title"><div><small>JOGOS EM DESTAQUE</small><h2>Escolha sua próxima rodada</h2></div></div><section className="game-grid">{games.map(g=><button className={`game-cover ${g.theme}`} key={g.id} onClick={()=>openGame(g.id)}><span>{g.tag}</span><div className="cover-symbol"><i/></div><footer><div><b>{g.name}</b><small>{g.desc}</small></div><em>JOGAR</em></footer></button>)}</section></main>}

  {configs[screen]&&<main className={`slot-page-v5 ${screen}`}><div className="game-bar"><button onClick={()=>setScreen('lobby')}>← Voltar</button><div><small>NEKU ORIGINAL</small><h1>{current.name}</h1></div><strong>{fmt(balance)}</strong></div><section className="slot-cabinet-v5"><header><div><small>MODO</small><b>{freeSpins[screen]>0?`${freeSpins[screen]} GIROS GRÁTIS`:'JOGO BASE'}</b></div><div className="meter-v5"><small>ATIVADOR DE BÔNUS</small><div>{Array.from({length:configs[screen].goal},(_,i)=><i className={i<meters[screen]?'on':''} key={i}/>)}</div></div></header><div className={`reels-v5 ${spinning?'spinning':''}`} style={{gridTemplateColumns:`repeat(${configs[screen].cols},1fr)`}}>{grid.map((s,i)=><div className={`slot-symbol ${s}`} key={`${i}-${s}-${spinning}`}><i/><span>{s.toUpperCase()}</span></div>)}</div><div className="pay-glow"/><div className="slot-bottom"><label><small>APOSTA</small><select value={bet} onChange={e=>setBet(Number(e.target.value))}>{BETS.map(v=><option key={v} value={v}>{fmt(v)}</option>)}</select></label><button className="spin-v5" onClick={spin} disabled={spinning}><i/> {spinning?'GIRANDO':'GIRAR'}</button><div><small>PRÓXIMO BÔNUS</small><b>{configs[screen].goal-meters[screen]} símbolos</b></div></div><p>Resultados definidos por RNG local demonstrativo. Nem toda rodada gera prêmio.</p></section></main>}

  {screen==='crash'&&<main className="crash-v5"><div className="game-bar"><button onClick={()=>setScreen('lobby')}>← Voltar</button><div><small>RODADAS CONTÍNUAS</small><h1>Neku Rocket</h1></div><strong>{fmt(balance)}</strong></div><div className="recent-v5">{recent.map((v,i)=><span className={v<2?'low':v>=5?'high':''} key={i}>{v.toFixed(2)}x</span>)}</div><section className="crash-grid-v5"><div className={`crash-board-v5 ${roundPhase}`}><svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="crasharea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffb126" stopOpacity=".55"/><stop offset="1" stopColor="#ff4010" stopOpacity="0"/></linearGradient></defs><path className="grid" d="M0 20H100M0 40H100M0 60H100M0 80H100M20 0V100M40 0V100M60 0V100M80 0V100"/><path className="area" d={`${d} L ${last.x} 100 L 2 100 Z`}/><path className="line" d={d}/></svg>{roundPhase==='waiting'&&<div className="waiting-v5"><small>PRÓXIMA RODADA EM</small><strong>{countdown}</strong><span>Entre na fila com uma ou duas mãos</span></div>}{roundPhase==='flying'&&<><div className="mult-v5">{multiplier.toFixed(2)}x</div><div className="tiger-rocket" style={{left:`${last.x}%`,top:`${last.y}%`}}><div className="tiger-face"><i/><b/></div><div className="rocket-body"/><div className="fire"/></div></>}{roundPhase==='crashed'&&<div className="crash-pop-v5"><b>CRASH!</b><strong>{multiplier.toFixed(2)}x</strong></div>}</div><aside className="live-list"><header><b>JOGADORES</b><span>AO VIVO</span></header>{['Ghostzada','Vini777','Luana','JeanXP','MestreNeko'].map((n,i)=><div key={n}><b>{n}</b><span>{roundPhase==='flying'?(1.1+i*.37).toFixed(2)+'x':'Aguardando'}</span></div>)}</aside></section><section className="hands-v5">{hands.map((h,i)=><article className={h.queued?'queued':h.active?'active':''} key={i}><header><b>MÃO {i+1}</b><span>{h.queued?'AGUARDANDO JOGADA':h.active?(h.cashed?'SACOU':'EM VOO'):'DISPONÍVEL'}</span></header><strong>{fmt(h.bet)}</strong><div className="hand-bets">{BETS.map(v=><button className={h.bet===v?'on':''} key={v} onClick={()=>setHandBet(i,v)}>{fmt(v)}</button>)}</div>{roundPhase==='waiting'?<button className="queue-btn" onClick={()=>queueHand(i)}>{h.queued?'CANCELAR FILA':'ENTRAR NA PRÓXIMA RODADA'}</button>:roundPhase==='flying'&&h.active&&!h.cashed?<button className="cash-btn" onPointerDown={()=>cashHand(i)}>SACAR AGORA <b>{multiplier.toFixed(2)}x</b><small>{fmt(Math.floor(h.bet*multiplier))}</small></button>:<button className="queue-btn disabled">{h.cashed?`GANHOU ${fmt(h.payout)}`:'AGUARDANDO PRÓXIMA JOGADA'}</button>}</article>)}</section></main>}

  {screen==='history'&&<main className="history-v5"><div className="title"><div><small>SESSÃO LOCAL</small><h2>Histórico</h2></div><b>{fmt(totalPlayed)} jogados</b></div>{history.length===0?<p>Nenhuma rodada realizada.</p>:<div className="history-table">{history.map(h=><div key={h.id}><span>{h.time}</span><b>{h.game}</b><small>{h.detail}</small><em>{fmt(h.bet)}</em><strong className={h.payout?'win':''}>{fmt(h.payout)}</strong></div>)}</div>}</main>}

  {win&&<div className="win-overlay" onClick={()=>setWin(null)}><div><button onClick={()=>setWin(null)}>×</button><small>{win.detail}</small><h2>{win.title}</h2>{win.amount>0&&<strong>{fmt(win.amount)}</strong>}<div className="coins">{Array.from({length:12},(_,i)=><i style={{'--i':i}} key={i}/>)}</div><span>TOQUE PARA CONTINUAR</span></div></div>}
 </div>
}
