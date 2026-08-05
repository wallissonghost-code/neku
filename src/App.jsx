import { useEffect, useMemo, useRef, useState } from 'react';

const START_BALANCE=10000;
const BETS=[10,25,50,100,250,500];
const ADD_VALUES=[1000,2500,5000,10000,25000,50000];
const games=[
{id:'fortune',name:'Neku Fortune',tag:'FREE SPINS',desc:'Wild, Scatter e Tigre Dourado.'},
{id:'dragon',name:'Dragon Inferno',tag:'HOLD & WIN',desc:'Acenda os seis cristais do dragão.'},
{id:'royal',name:'Royal Gems',tag:'CASCATA',desc:'Combinações desaparecem e multiplicam.'},
{id:'jungle',name:'Jungle Spirit',tag:'RODADAS BÔNUS',desc:'Totens despertam o modo selvagem.'},
{id:'crash',name:'Neku Rocket',tag:'AO VIVO',desc:'Duas mãos, bônus de voo e auto saque.'}
];
const configs={
fortune:{symbols:['tiger','crown','lantern','coin','jade','ace','king'],special:'lantern',goal:5,cols:5,rows:3},
dragon:{symbols:['dragon','orb','flame','temple','coin','ace','king'],special:'orb',goal:6,cols:5,rows:3},
royal:{symbols:['diamond','ruby','crown','seven','bar','ace','queen'],special:'diamond',goal:4,cols:5,rows:3},
jungle:{symbols:['mask','totem','sun','leaf','ruby','ace','king'],special:'totem',goal:4,cols:6,rows:4}
};
const fmt=v=>Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const rng=()=>{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296};
const pick=a=>a[Math.floor(rng()*a.length)];
const makeGrid=id=>{const c=configs[id];return Array.from({length:c.cols*c.rows},()=>pick(c.symbols))};
const emptyHand=(bet=50)=>({bet,queued:false,active:false,cashed:false,payout:0,mult:0,autoEnabled:false,autoAt:2});

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
 const [recent,setRecent]=useState([1.72,2.47,2.28,1.12,1.05,8.31,3.46]);
 const [hands,setHands]=useState([emptyHand(50),emptyHand(100)]);
 const [flightBonus,setFlightBonus]=useState(null);
 const target=useRef(2),raf=useRef(null),started=useRef(0),multRef=useRef(1),bonusEvent=useRef(null),bonusUsed=useRef(false);
 const current=games.find(g=>g.id===screen);
 const totalPlayed=useMemo(()=>history.reduce((s,h)=>s+h.bet,0),[history]);

 useEffect(()=>()=>cancelAnimationFrame(raf.current),[]);
 useEffect(()=>{if(screen!=='crash')return;let timer;
  if(roundPhase==='waiting')timer=setInterval(()=>setCountdown(v=>v<=1?(startRound(),6):v-1),1000);
  if(roundPhase==='crashed')timer=setTimeout(()=>{setRoundPhase('waiting');setCountdown(6);setMultiplier(1);setPath([{x:2,y:94}]);setFlightBonus(null);setHands(h=>h.map(x=>({...x,active:false,cashed:false,payout:0,mult:0})))},1700);
  return()=>{clearInterval(timer);clearTimeout(timer)};
 },[screen,roundPhase]);

 const addHistory=(game,wager,payout,detail)=>setHistory(h=>[{id:crypto.randomUUID(),game,bet:wager,payout,detail,time:new Date().toLocaleTimeString('pt-BR')},...h].slice(0,40));
 const openGame=id=>{setScreen(id);setWin(null);if(configs[id])setGrid(makeGrid(id))};

 function weightedGrid(id){const c=configs[id],result=makeGrid(id),r=rng();
  if(r<.70){for(let i=0;i<result.length;i++)result[i]=c.symbols[i%c.symbols.length];result.sort(()=>rng()-.5)}
  else if(r<.92){const s=pick(c.symbols.filter(x=>x!==c.special));for(let i=0;i<3+Math.floor(rng()*2);i++)result[Math.floor(rng()*result.length)]=s}
  else for(let i=0;i<2+Math.floor(rng()*3);i++)result[Math.floor(rng()*result.length)]=c.special;
  return result;
 }
 function evaluateSlot(id,result,wager){const c=configs[id],counts=result.reduce((a,s)=>(a[s]=(a[s]||0)+1,a),{}),best=Math.max(...Object.values(counts)),specials=counts[c.special]||0;let payout=0,detail='Sem prêmio nesta rodada',meter=meters[id];
  if(best>=9)payout=wager*10;else if(best>=7)payout=wager*5;else if(best>=6&&rng()<.65)payout=wager*2;else if(best>=5&&rng()<.25)payout=wager;
  if(specials>=3){meter=Math.min(c.goal,meter+2);detail=`${specials} símbolos bônus conectados`}else if(specials>0&&rng()<.5){meter=Math.min(c.goal,meter+1);detail='Medidor de bônus avançou'}
  if(id==='royal'&&payout>0&&rng()<.28){payout*=2;detail='Cascata x2 ativada'}
  if(meter>=c.goal){meter=0;payout+=wager*(5+Math.floor(rng()*9));setFreeSpins(f=>({...f,[id]:f[id]+(id==='fortune'?6:3)}));detail=id==='dragon'?'HOLD & WIN LIBERADO':id==='jungle'?'MODO SELVAGEM LIBERADO':id==='royal'?'CASCATA REAL COMPLETA':'6 GIROS GRÁTIS'}
  setMeters(m=>({...m,[id]:meter}));payout=Math.floor(payout);if(payout){setBalance(v=>v+payout);setWin({title:payout>=wager*10?'MEGA WIN':payout>=wager*4?'BIG WIN':'VOCÊ GANHOU',amount:payout,detail})}addHistory(current.name,wager,payout,detail);
 }
 function spin(){if(spinning)return;const free=freeSpins[screen]>0;if(!free&&balance<bet)return setWin({title:'SALDO INSUFICIENTE',amount:0,detail:'Adicione saldo fictício ou reduza a aposta.'});setWin(null);setSpinning(true);if(free)setFreeSpins(f=>({...f,[screen]:f[screen]-1}));else setBalance(v=>v-bet);let t=0;const id=setInterval(()=>{t++;setGrid(makeGrid(screen));if(t>=15){clearInterval(id);const final=weightedGrid(screen);setGrid(final);setSpinning(false);evaluateSlot(screen,final,bet)}},58)}

 function generateCrash(){const r=rng();return Math.min(60,Math.max(1.02,Number((.96/Math.max(.016,1-r)).toFixed(2))))}
 function generateBonus(){const r=rng();if(r<.52)return null;if(r<.76)return 2;if(r<.90)return 5;if(r<.965)return 20;if(r<.988)return 50;if(r<.997)return 100;return 1000}
 function queueHand(i){if(roundPhase!=='waiting')return;setHands(h=>h.map((x,n)=>n===i?{...x,queued:!x.queued}:x))}
 function setHandBet(i,v){if(roundPhase!=='waiting')return;setHands(h=>h.map((x,n)=>n===i?{...x,bet:v}:x))}
 function setAuto(i,patch){setHands(h=>h.map((x,n)=>n===i?{...x,...patch}:x))}
 function startRound(){let cost=0;setHands(h=>h.map(x=>{if(x.queued&&balance-cost>=x.bet){cost+=x.bet;return {...x,queued:false,active:true,cashed:false,payout:0,mult:0}}return {...x,active:false,cashed:false,payout:0,mult:0}}));setBalance(v=>Math.max(0,v-cost));target.current=generateCrash();const bonus=generateBonus();bonusEvent.current=bonus?{value:bonus,at:1.35+rng()*2.8}:null;bonusUsed.current=false;setFlightBonus(null);multRef.current=1;setMultiplier(1);setPath([{x:2,y:94}]);setRoundPhase('flying');started.current=performance.now();raf.current=requestAnimationFrame(animateCrash)}
 function animateCrash(now){const sec=(now-started.current)/1000;let m=1+Math.pow(sec*.72,1.55);if(bonusEvent.current&&!bonusUsed.current&&m>=bonusEvent.current.at){bonusUsed.current=true;m+=bonusEvent.current.value;setFlightBonus({value:bonusEvent.current.value,at:m});started.current=now-Math.pow(Math.max(.01,m-1),1/1.55)/.72*1000;setTimeout(()=>setFlightBonus(null),1200)}m=Number(m.toFixed(2));if(m>=target.current)return finishCrash();multRef.current=m;setMultiplier(m);setHands(h=>h.map((x,i)=>{if(x.active&&!x.cashed&&x.autoEnabled&&m>=x.autoAt){setTimeout(()=>cashHand(i,m),0)}return x}));const x=Math.min(94,3+sec*8.4),y=Math.max(9,94-Math.log(Math.max(m,1))*25);setPath(p=>[...p.slice(-130),{x,y}]);raf.current=requestAnimationFrame(animateCrash)}
 function finishCrash(){cancelAnimationFrame(raf.current);setMultiplier(target.current);setRecent(r=>[target.current,...r].slice(0,10));setHands(h=>h.map(x=>{if(x.active&&!x.cashed)addHistory('Neku Rocket',x.bet,0,`Crash ${target.current.toFixed(2)}x`);return {...x,active:false}}));setRoundPhase('crashed')}
 function cashHand(i,forced){if(roundPhase!=='flying')return;setHands(h=>h.map((x,n)=>{if(n!==i||!x.active||x.cashed)return x;const m=forced||multRef.current,payout=Math.floor(x.bet*m);setBalance(v=>v+payout);addHistory(`Neku Rocket · Mão ${i+1}`,x.bet,payout,`Saque ${m.toFixed(2)}x`);setWin({title:'VOCÊ SACOU',amount:payout,detail:`Mão ${i+1} retirada em ${m.toFixed(2)}x`});return {...x,cashed:true,payout,mult:m}}))}
 const d=path.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' '),last=path.at(-1)||{x:2,y:94};

 return <div className="neku-v6"><header className="v6-header"><button className="brand" onClick={()=>setScreen('lobby')}><span>N</span><div><b>NEKU</b><small>PLAY CLUB</small></div></button><nav><button onClick={()=>setScreen('lobby')}>Lobby</button><button onClick={()=>setScreen('crash')}>Crash</button><button onClick={()=>setScreen('history')}>Histórico</button></nav><button className="wallet" onClick={()=>setShowWallet(true)}><strong>{fmt(balance)}</strong><i>+</i></button></header>
 {showWallet&&<div className="wallet-modal" onClick={()=>setShowWallet(false)}><section onClick={e=>e.stopPropagation()}><button onClick={()=>setShowWallet(false)}>×</button><small>SALDO FICTÍCIO</small><h2>Adicionar valor</h2><div>{ADD_VALUES.map(v=><button key={v} onClick={()=>{setBalance(b=>b+v);setShowWallet(false)}}>{fmt(v)}</button>)}</div><p>Somente demonstração, sem dinheiro real.</p></section></div>}
 {screen==='lobby'&&<main className="lobby-v6"><section className="hero-v6"><div><small>NEKU ORIGINALS</small><h1>Slots premium e Crash em tempo real.</h1><p>RNG demonstrativo, bônus progressivos e duas mãos independentes.</p><button onClick={()=>openGame('crash')}>JOGAR NEKU ROCKET</button></div><div className="hero-orbit"><i/><b>NEKU</b></div></section><h2>Jogos em destaque</h2><section className="cards-v6">{games.map(g=><button key={g.id} className={`card-${g.id}`} onClick={()=>openGame(g.id)}><span>{g.tag}</span><div className="art"><i/></div><footer><b>{g.name}</b><small>{g.desc}</small></footer></button>)}</section></main>}
 {configs[screen]&&<main className={`slot-v6 ${screen}`}><div className="page-title"><button onClick={()=>setScreen('lobby')}>← Voltar</button><div><small>NEKU ORIGINAL</small><h1>{current.name}</h1></div><strong>{fmt(balance)}</strong></div><section className="cabinet-v6"><header><div><small>MODO</small><b>{freeSpins[screen]?`${freeSpins[screen]} GIROS GRÁTIS`:'JOGO BASE'}</b></div><div className="meter"><small>BÔNUS</small><div>{Array.from({length:configs[screen].goal},(_,i)=><i className={i<meters[screen]?'on':''} key={i}/>)}</div></div></header><div className={`reels ${spinning?'spinning':''}`} style={{gridTemplateColumns:`repeat(${configs[screen].cols},1fr)`}}>{grid.map((s,i)=><div className={`symbol ${s}`} key={`${i}-${s}-${spinning}`}><i/><span>{s.toUpperCase()}</span></div>)}</div><div className="slot-actions"><label><small>APOSTA</small><select value={bet} onChange={e=>setBet(Number(e.target.value))}>{BETS.map(v=><option key={v} value={v}>{fmt(v)}</option>)}</select></label><button className="spin" onClick={spin} disabled={spinning}>{spinning?'GIRANDO':'GIRAR'}</button><div><small>FALTA</small><b>{configs[screen].goal-meters[screen]} símbolos</b></div></div></section></main>}
 {screen==='crash'&&<main className="crash-v6"><div className="page-title"><button onClick={()=>setScreen('lobby')}>← Voltar</button><div><small>RODADAS CONTÍNUAS</small><h1>Neku Rocket</h1></div><strong>{fmt(balance)}</strong></div><div className="recent">{recent.map((v,i)=><span className={v<2?'low':v>=5?'high':''} key={i}>{v.toFixed(2)}x</span>)}</div><section className="crash-stage"><div className={`board ${roundPhase}`}><svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="area6" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffcf57" stopOpacity=".62"/><stop offset="1" stopColor="#ff3f16" stopOpacity="0"/></linearGradient></defs><path className="grid" d="M0 20H100M0 40H100M0 60H100M0 80H100M20 0V100M40 0V100M60 0V100M80 0V100"/><path className="area" d={`${d} L ${last.x} 100 L 2 100 Z`}/><path className="line" d={d}/></svg>{roundPhase==='waiting'&&<div className="waiting"><small>PRÓXIMA RODADA</small><strong>{countdown}</strong><span>Entre na fila abaixo</span></div>}{roundPhase==='flying'&&<><div className="mult">{multiplier.toFixed(2)}x</div><div className="rocket" style={{left:`${last.x}%`,top:`${last.y}%`}}><div className="tiger"><i/><b/></div><div className="body"/><div className="flame"/></div>{flightBonus&&<div className="bonus-burst">BÔNUS +{flightBonus.value}x</div>}</>}{roundPhase==='crashed'&&<div className="crashed"><b>CRASH!</b><strong>{multiplier.toFixed(2)}x</strong></div>}</div></section><section className="hands-compact">{hands.map((h,i)=><article className={h.queued?'queued':h.active?'active':''} key={i}><header><b>MÃO {i+1}</b><span>{h.queued?'AGUARDANDO JOGADA':h.active?(h.cashed?'SACOU':'EM VOO'):'DISPONÍVEL'}</span></header><div className="hand-main"><strong>{fmt(h.bet)}</strong><div className="bet-row">{BETS.map(v=><button className={h.bet===v?'on':''} key={v} onClick={()=>setHandBet(i,v)}>{v}</button>)}</div></div><div className="auto-row"><label><input type="checkbox" checked={h.autoEnabled} onChange={e=>setAuto(i,{autoEnabled:e.target.checked})}/> Auto cash out</label><select value={h.autoAt} onChange={e=>setAuto(i,{autoAt:Number(e.target.value)})}>{[1.5,2,3,5,10,20].map(v=><option key={v} value={v}>{v.toFixed(1)}x</option>)}</select></div>{roundPhase==='waiting'?<button className="primary" onClick={()=>queueHand(i)}>{h.queued?'CANCELAR FILA':'ENTRAR NA PRÓXIMA'}</button>:roundPhase==='flying'&&h.active&&!h.cashed?<button className="cash" onPointerDown={()=>cashHand(i)}>SACAR {multiplier.toFixed(2)}x <small>{fmt(Math.floor(h.bet*multiplier))}</small></button>:<button className="primary muted">{h.cashed?`GANHOU ${fmt(h.payout)}`:'AGUARDANDO PRÓXIMA'}</button>}</article>)}</section><div className="bonus-info"><b>BÔNUS DE VOO RNG</b><span>2x e 5x são incomuns; 20x, 50x, 100x e 1000x são progressivamente raros. O bônus acelera o multiplicador, mas o crash pode acontecer logo depois.</span></div></main>}
 {screen==='history'&&<main className="history-v6"><h1>Histórico</h1><p>{fmt(totalPlayed)} jogados nesta sessão.</p>{history.map(h=><div key={h.id}><span>{h.time}</span><b>{h.game}</b><small>{h.detail}</small><em>{fmt(h.bet)}</em><strong>{fmt(h.payout)}</strong></div>)}</main>}
 {win&&<div className="win-modal" onClick={()=>setWin(null)}><section><button>×</button><small>{win.detail}</small><h2>{win.title}</h2>{win.amount>0&&<strong>{fmt(win.amount)}</strong>}<span>TOQUE PARA CONTINUAR</span></section></div>}
 </div>
}
