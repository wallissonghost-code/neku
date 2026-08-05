import { useEffect, useMemo, useRef, useState } from 'react';

const MONEY_OPTIONS = [1000, 2500, 5000, 10000, 25000, 50000];
const BETS = [10, 25, 50, 100, 250, 500];
const SLOT_GAMES = [
  { id:'fortune', name:'Neku Fortune', tag:'WILD & SCATTER', accent:'gold', symbols:['tiger','crown','lantern','coin','jade','ace'] },
  { id:'dragon', name:'Dragon Empire', tag:'DRAGON BONUS', accent:'red', symbols:['dragon','orb','temple','coin','fan','king'] },
  { id:'royal', name:'Royal Vault', tag:'LOCK & WIN', accent:'blue', symbols:['diamond','crown','key','vault','bar','seven'] },
  { id:'jungle', name:'Jungle Riches', tag:'CASCADING REELS', accent:'green', symbols:['mask','ruby','leaf','totem','sun','queen'] },
];

const fmt = (v) => Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const rng = (arr) => arr[Math.floor(Math.random()*arr.length)];
const gridFor = (game) => Array.from({length:15},()=>rng(game.symbols));

export default function App(){
  const [screen,setScreen]=useState('lobby');
  const [balance,setBalance]=useState(10000);
  const [walletOpen,setWalletOpen]=useState(false);
  const [bet,setBet]=useState(50);
  const [grid,setGrid]=useState(gridFor(SLOT_GAMES[0]));
  const [spinning,setSpinning]=useState(false);
  const [bonus,setBonus]=useState(0);
  const [freeSpins,setFreeSpins]=useState(0);
  const [win,setWin]=useState(null);
  const [history,setHistory]=useState([]);

  const [crashPhase,setCrashPhase]=useState('waiting');
  const [countdown,setCountdown]=useState(5);
  const [multiplier,setMultiplier]=useState(1);
  const [crashPath,setCrashPath]=useState([{x:2,y:95}]);
  const [queuedBet,setQueuedBet]=useState(false);
  const [activeBet,setActiveBet]=useState(0);
  const [cashed,setCashed]=useState(false);
  const [cashResult,setCashResult]=useState(null);
  const [recent,setRecent]=useState([1.42,2.18,7.86,1.09,3.41,12.22]);
  const crashTarget=useRef(2);
  const phaseTimer=useRef(null);
  const raf=useRef(null);
  const startedAt=useRef(0);
  const multRef=useRef(1);

  const currentGame=SLOT_GAMES.find(g=>g.id===screen) || SLOT_GAMES[0];
  const totalWon=useMemo(()=>history.reduce((s,h)=>s+h.payout,0),[history]);

  useEffect(()=>{
    if(screen==='crash' && crashPhase==='waiting' && !phaseTimer.current) startWaitingCycle();
    return ()=>{};
  },[screen]);

  useEffect(()=>()=>{clearInterval(phaseTimer.current);cancelAnimationFrame(raf.current)},[]);

  const addHistory=(game,wager,payout,detail)=>setHistory(h=>[{id:crypto.randomUUID(),game,wager,payout,detail,time:new Date().toLocaleTimeString('pt-BR')},...h].slice(0,30));
  const addFunds=(value)=>{setBalance(value);setWalletOpen(false)};

  const openSlot=(id)=>{const g=SLOT_GAMES.find(x=>x.id===id);setGrid(gridFor(g));setBonus(0);setFreeSpins(0);setWin(null);setScreen(id)};

  const evaluateSlot=(g,result,wager)=>{
    const counts=result.reduce((a,s)=>({...a,[s]:(a[s]||0)+1}),{});
    const best=Math.max(...Object.values(counts));
    const scatters=(counts.lantern||0)+(counts.key||0)+(counts.orb||0)+(counts.totem||0);
    let payout=0;
    if(best>=6) payout=wager*10;
    else if(best>=5) payout=wager*6;
    else if(best>=4) payout=wager*3;
    else if(best>=3) payout=wager*1.5;
    let nextBonus=Math.min(4,bonus+Math.min(2,scatters));
    let detail=best>=3?`${best} símbolos conectados`:'Sem linha premiada';
    if(scatters>=3){setFreeSpins(v=>v+5);detail='BÔNUS: 5 giros grátis';nextBonus=Math.min(4,nextBonus+1)}
    if(nextBonus>=4){payout+=wager*10;nextBonus=0;detail='MEDIDOR COMPLETO: bônus 10x'}
    setBonus(nextBonus);
    const final=Math.floor(payout);
    if(final>0){setBalance(v=>v+final);setWin({amount:final,title:final>=wager*10?'MEGA WIN':final>=wager*5?'BIG WIN':'VOCÊ GANHOU',detail})}
    addHistory(g.name,wager,final,detail);
  };

  const spin=()=>{
    if(spinning)return;
    const wager=freeSpins>0?0:bet;
    if(wager>balance){setWin({amount:0,title:'SALDO INSUFICIENTE',detail:'Adicione saldo de brincadeira.'});return}
    setWin(null);setSpinning(true);
    if(freeSpins>0)setFreeSpins(v=>v-1);else setBalance(v=>v-bet);
    let ticks=0;
    const interval=setInterval(()=>{
      ticks++;setGrid(gridFor(currentGame));
      if(ticks>=14){clearInterval(interval);const final=gridFor(currentGame);setGrid(final);setSpinning(false);evaluateSlot(currentGame,final,wager||bet)}
    },65);
  };

  const startWaitingCycle=()=>{
    clearInterval(phaseTimer.current);cancelAnimationFrame(raf.current);
    setCrashPhase('waiting');setCountdown(5);setMultiplier(1);setCrashPath([{x:2,y:95}]);setCashed(false);setCashResult(null);
    let left=5;
    phaseTimer.current=setInterval(()=>{
      left-=1;setCountdown(left);
      if(left<=0){clearInterval(phaseTimer.current);phaseTimer.current=null;launchCrash()}
    },1000);
  };

  const launchCrash=()=>{
    const data=new Uint32Array(1);crypto.getRandomValues(data);const r=data[0]/4294967296;
    crashTarget.current=Math.min(30,Math.max(1.05,Number((0.99/Math.max(.03,1-r)).toFixed(2))));
    setCrashPhase('flying');startedAt.current=performance.now();multRef.current=1;
    if(queuedBet){setQueuedBet(false);setActiveBet(bet);setBalance(v=>v-bet)}else setActiveBet(0);
    raf.current=requestAnimationFrame(animateCrash);
  };

  const animateCrash=(now)=>{
    const sec=(now-startedAt.current)/1000;const m=Number((1+Math.pow(sec*.73,1.6)).toFixed(2));
    if(m>=crashTarget.current){finishCrash();return}
    multRef.current=m;setMultiplier(m);
    const x=Math.min(96,3+sec*8.6);const y=Math.max(8,95-Math.log(m)*31);
    setCrashPath(p=>[...p.slice(-120),{x,y}]);raf.current=requestAnimationFrame(animateCrash);
  };

  const finishCrash=()=>{
    cancelAnimationFrame(raf.current);multRef.current=crashTarget.current;setMultiplier(crashTarget.current);setCrashPhase('crashed');setRecent(r=>[crashTarget.current,...r].slice(0,10));
    if(activeBet>0&&!cashed)addHistory('Neku Crash',activeBet,0,`Crash ${crashTarget.current.toFixed(2)}x`);
    setTimeout(()=>startWaitingCycle(),1800);
  };

  const queueCrashBet=()=>{
    if(crashPhase!=='waiting'||queuedBet)return;
    if(balance<bet){setWin({amount:0,title:'SALDO INSUFICIENTE',detail:'Escolha um saldo maior no painel.'});return}
    setQueuedBet(true);
  };

  const cashOut=()=>{
    if(crashPhase!=='flying'||!activeBet||cashed)return;
    const payout=Math.floor(activeBet*multRef.current);setCashed(true);setCashResult({mult:multRef.current,payout});setBalance(v=>v+payout);addHistory('Neku Crash',activeBet,payout,`Saque ${multRef.current.toFixed(2)}x`);
  };

  const d=crashPath.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ');const lp=crashPath.at(-1)||{x:2,y:95};

  return <div className="neku-v4">
    <header className="v4-header">
      <button className="v4-logo" onClick={()=>setScreen('lobby')}><span className="logo-mark">N</span><div><b>NEKU</b><small>PLAY CLUB</small></div></button>
      <nav><button onClick={()=>setScreen('lobby')}>Lobby</button><button onClick={()=>setScreen('crash')}>Crash</button><button onClick={()=>setScreen('history')}>Histórico</button></nav>
      <button className="money-pill" onClick={()=>setWalletOpen(true)}><small>SALDO TESTE</small><strong>{fmt(balance)}</strong><span>+</span></button>
    </header>

    {screen==='lobby'&&<main className="v4-main">
      <section className="v4-hero"><div><span>NEKU PREMIUM EXPERIENCE</span><h1>Jogos com visual de cassino e saldo de brincadeira.</h1><p>Slots animados, bônus progressivos e Crash em rodadas contínuas.</p><button onClick={()=>openSlot('fortune')}>Jogar agora</button></div><div className="hero-emblem"><i></i><b>NEKU</b><small>ROYAL SERIES</small></div></section>
      <div className="v4-title"><div><small>CATÁLOGO</small><h2>Jogos em destaque</h2></div><button onClick={()=>setWalletOpen(true)}>Adicionar saldo</button></div>
      <section className="v4-grid">
        {SLOT_GAMES.map(g=><button className={`v4-card ${g.accent}`} key={g.id} onClick={()=>openSlot(g.id)}><span>{g.tag}</span><div className={`cover-art art-${g.id}`}><i></i><b>{g.name}</b></div><footer><strong>{g.name}</strong><small>Jogar agora</small></footer></button>)}
        <button className="v4-card crash-cover" onClick={()=>setScreen('crash')}><span>RODADAS AO VIVO</span><div className="cover-art art-crash"><i></i><b>NEKU CRASH</b></div><footer><strong>Neku Crash</strong><small>Aguardar próxima rodada</small></footer></button>
      </section>
      <section className="v4-stats"><div><b>{history.length}</b><small>rodadas</small></div><div><b>{fmt(totalWon)}</b><small>ganhos demo</small></div><div><b>5</b><small>jogos ativos</small></div></section>
    </main>}

    {SLOT_GAMES.some(g=>g.id===screen)&&<main className={`slot-page ${currentGame.accent}`}>
      <div className="game-head"><button onClick={()=>setScreen('lobby')}>← Lobby</button><div><small>{currentGame.tag}</small><h1>{currentGame.name}</h1></div><strong>{fmt(balance)}</strong></div>
      <section className="premium-cabinet">
        <div className="cabinet-top"><div><small>MODO</small><b>{freeSpins>0?`GIROS GRÁTIS ${freeSpins}`:'JOGO BASE'}</b></div><div className="meter"><small>MEDIDOR BÔNUS 10X</small><div>{[0,1,2,3].map(i=><span key={i} className={i<bonus?'on':''}></span>)}</div></div></div>
        <div className={`reel-window ${spinning?'spinning':''}`}>{grid.map((s,i)=><div className={`symbol symbol-${s}`} key={`${i}-${s}`}><i></i><span>{s.toUpperCase()}</span></div>)}</div>
        <div className="payline"></div>
        <div className="slot-controls"><label>Aposta<select value={bet} onChange={e=>setBet(Number(e.target.value))}>{BETS.map(v=><option key={v} value={v}>{fmt(v)}</option>)}</select></label><button className="spin-button" onClick={spin} disabled={spinning}><span>{spinning?'':'GIRAR'}</span></button><div><small>Saldo</small><strong>{fmt(balance)}</strong></div></div>
        <p>3+ símbolos iguais pagam. Símbolos especiais carregam o bônus. Medidor completo paga 10x.</p>
      </section>
    </main>}

    {screen==='crash'&&<main className="crash-page-v4">
      <div className="game-head"><button onClick={()=>setScreen('lobby')}>← Lobby</button><div><small>RODADAS CONTÍNUAS</small><h1>Neku Crash</h1></div><strong>{fmt(balance)}</strong></div>
      <div className="recent-strip">{recent.map((v,i)=><span key={i} className={v<2?'low':v>=5?'high':''}>{v.toFixed(2)}x</span>)}</div>
      <section className="crash-v4-layout">
        <div className={`crash-board ${crashPhase}`}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="v4area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6b93b" stopOpacity=".55"/><stop offset="1" stopColor="#e74c3c" stopOpacity="0"/></linearGradient></defs><path className="grid-lines" d="M0 20H100M0 40H100M0 60H100M0 80H100M20 0V100M40 0V100M60 0V100M80 0V100"/><path className="area" d={`${d} L ${lp.x} 100 L 2 100 Z`}/><path className="curve" d={d}/></svg>
          {crashPhase==='waiting'&&<div className="waiting"><small>PRÓXIMA RODADA</small><strong>{countdown}</strong><span>{queuedBet?'APOSTA CONFIRMADA':'FAÇA SUA APOSTA'}</span></div>}
          {crashPhase==='flying'&&<><div className="live-mult">{multiplier.toFixed(2)}x</div><div className="rocket-shape" style={{left:`${lp.x}%`,top:`${lp.y}%`}}></div></>}
          {crashPhase==='crashed'&&<div className="crashed-pop"><b>CRASH</b><strong>{multiplier.toFixed(2)}x</strong></div>}
          {cashResult&&<div className="cash-banner"><small>VOCÊ SACOU EM {cashResult.mult.toFixed(2)}x</small><strong>GANHOU {fmt(cashResult.payout)}</strong></div>}
        </div>
        <aside className="crash-side"><small>APOSTA DA PRÓXIMA RODADA</small><strong>{fmt(bet)}</strong><div className="bet-chips">{BETS.map(v=><button key={v} onClick={()=>setBet(v)}>{fmt(v)}</button>)}</div>{crashPhase==='waiting'?<button className="join-btn" onClick={queueCrashBet} disabled={queuedBet}>{queuedBet?'AGUARDANDO INÍCIO':'ENTRAR NA PRÓXIMA RODADA'}</button>:<button className="join-btn muted">AGUARDE A PRÓXIMA</button>}{crashPhase==='flying'&&activeBet>0&&!cashed&&<button className="cash-btn" onPointerDown={cashOut}>SACAR AGORA<br/><strong>{fmt(activeBet*multiplier)}</strong></button>}</aside>
      </section>
    </main>}

    {screen==='history'&&<main className="history-v4"><div className="game-head"><button onClick={()=>setScreen('lobby')}>← Lobby</button><div><small>CONTA DEMO</small><h1>Histórico</h1></div><strong>{fmt(balance)}</strong></div>{history.length===0?<p>Nenhuma rodada ainda.</p>:<div className="history-list">{history.map(h=><div key={h.id}><span>{h.time}</span><b>{h.game}</b><small>{h.detail}</small><em>{h.payout?`+ ${fmt(h.payout)}`:`- ${fmt(h.wager)}`}</em></div>)}</div>}</main>}

    {walletOpen&&<div className="wallet-modal" onClick={()=>setWalletOpen(false)}><div onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setWalletOpen(false)}>×</button><small>SALDO DE BRINCADEIRA</small><h2>Escolha quanto quer usar</h2><p>Esse valor é apenas demonstrativo e não representa dinheiro real.</p><div>{MONEY_OPTIONS.map(v=><button key={v} onClick={()=>addFunds(v)}>{fmt(v)}</button>)}</div></div></div>}

    {win&&<div className="win-modal" onClick={()=>setWin(null)}><div><small>{win.detail}</small><h2>{win.title}</h2><strong>{fmt(win.amount)}</strong><button>CONTINUAR</button></div></div>}
  </div>
}
