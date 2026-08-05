import { useEffect, useMemo, useRef, useState } from 'react';

const START_BALANCE = 100000;
const BETS = [100, 250, 500, 1000, 2500, 5000];
const games = [
  { id: 'tiger', name: 'Neku Fortune', icon: '🐯', tag: 'MAIS JOGADO', desc: '5 rolos, Wild, Scatter e giros grátis.' },
  { id: 'dragon', name: 'Dragon Coins', icon: '🐉', tag: 'BÔNUS 10X', desc: 'Junte moedas e acenda o dragão.' },
  { id: 'jungle', name: 'Jungle Link', icon: '🦜', tag: 'CLUSTER', desc: 'Grupos de símbolos pagam em cascata.' },
  { id: 'vault', name: 'Diamond Vault', icon: '💎', tag: 'ESCOLHA', desc: 'Encontre 3 chaves e abra o cofre.' },
  { id: 'crash', name: 'Neku Crash', icon: '🚀', tag: 'AO VIVO', desc: 'Saque antes do multiplicador explodir.' },
];

const configs = {
  tiger: { symbols: ['🐯','👑','🧧','🏮','🍊','A','K'], cols: 5, rows: 3 },
  dragon: { symbols: ['🐉','🪙','🔥','🏯','🥁','A','K'], cols: 5, rows: 3 },
  jungle: { symbols: ['🦜','🐒','🦁','🍌','🌺','💎'], cols: 6, rows: 4 },
  vault: { symbols: ['💎','🔑','👑','🪙','7','⭐'], cols: 5, rows: 3 },
};

const randomItem = (items) => items[Math.floor(Math.random() * items.length)];
const fmt = (value) => Number(value).toLocaleString('pt-BR');
const makeGrid = (id) => {
  const c = configs[id];
  return Array.from({ length: c.cols * c.rows }, () => randomItem(c.symbols));
};

export default function App() {
  const [screen, setScreen] = useState('lobby');
  const [balance, setBalance] = useState(START_BALANCE);
  const [bet, setBet] = useState(500);
  const [grid, setGrid] = useState(makeGrid('tiger'));
  const [spinning, setSpinning] = useState(false);
  const [bonus, setBonus] = useState({ tiger: 0, dragon: 0, jungle: 0, vault: 0 });
  const [freeSpins, setFreeSpins] = useState(0);
  const [win, setWin] = useState(null);
  const [history, setHistory] = useState([]);
  const [vaultMode, setVaultMode] = useState(false);
  const [vaultPicks, setVaultPicks] = useState([]);
  const [crashState, setCrashState] = useState('ready');
  const [multiplier, setMultiplier] = useState(1);
  const [crashPath, setCrashPath] = useState([{x:2,y:95}]);
  const [cashout, setCashout] = useState(null);
  const crashTarget = useRef(2);
  const crashRaf = useRef(null);
  const crashStart = useRef(0);
  const cashed = useRef(false);
  const multiplierRef = useRef(1);

  const currentGame = games.find((g) => g.id === screen);
  const totalPlayed = useMemo(() => history.reduce((sum, item) => sum + item.bet, 0), [history]);

  useEffect(() => () => cancelAnimationFrame(crashRaf.current), []);

  const openGame = (id) => {
    setScreen(id);
    setWin(null);
    setCashout(null);
    if (configs[id]) setGrid(makeGrid(id));
  };

  const addHistory = (game, wager, payout, detail) => {
    setHistory((items) => [{ id: crypto.randomUUID(), game, bet: wager, payout, detail, time: new Date().toLocaleTimeString('pt-BR') }, ...items].slice(0, 30));
  };

  const showWin = (title, amount, subtitle, level = 'win') => {
    setWin({ title, amount, subtitle, level });
  };

  const evaluateSlot = (id, result) => {
    const wager = freeSpins > 0 ? 0 : bet;
    const counts = result.reduce((acc, symbol) => ({ ...acc, [symbol]: (acc[symbol] || 0) + 1 }), {});
    let payout = 0;
    let detail = 'Sem combinação';
    let nextBonus = bonus[id] || 0;

    if (id === 'tiger') {
      const scatters = counts['🏮'] || 0;
      const tigers = counts['🐯'] || 0;
      const best = Math.max(...Object.values(counts));
      payout = bet * (tigers >= 5 ? 12 : best >= 6 ? 6 : best >= 4 ? 3 : best >= 3 ? 1.5 : 0);
      if (scatters >= 3) {
        setFreeSpins((v) => v + 5);
        nextBonus = Math.min(5, nextBonus + 2);
        detail = '3 lanternas: 5 giros grátis';
      } else if (scatters) {
        nextBonus = Math.min(5, nextBonus + scatters);
        detail = `${scatters} lanterna(s) no medidor`;
      }
      if (nextBonus >= 5) {
        payout += bet * 10;
        nextBonus = 0;
        detail = 'Medidor completo: bônus 10x';
      }
    }

    if (id === 'dragon') {
      const coins = counts['🪙'] || 0;
      const dragons = counts['🐉'] || 0;
      payout = bet * (dragons >= 4 ? 8 : coins >= 5 ? 4 : coins >= 3 ? 2 : 0);
      nextBonus = Math.min(6, nextBonus + Math.min(coins, 3));
      detail = coins ? `${coins} moedas energizaram o dragão` : 'O dragão não acendeu';
      if (nextBonus >= 6) {
        payout += bet * 10;
        nextBonus = 0;
        detail = 'Dragão completo: prêmio 10x';
      }
    }

    if (id === 'jungle') {
      const best = Math.max(...Object.values(counts));
      payout = bet * (best >= 10 ? 15 : best >= 8 ? 8 : best >= 6 ? 4 : best >= 4 ? 1.5 : 0);
      nextBonus = Math.min(4, nextBonus + (best >= 6 ? 1 : 0));
      detail = best >= 4 ? `Cluster de ${best} símbolos` : 'Nenhum cluster grande';
      if (nextBonus >= 4) {
        payout += bet * 10;
        nextBonus = 0;
        detail = 'Cascata completa: prêmio 10x';
      }
    }

    if (id === 'vault') {
      const keys = counts['🔑'] || 0;
      const diamonds = counts['💎'] || 0;
      payout = bet * (diamonds >= 4 ? 7 : diamonds >= 3 ? 3 : 0);
      nextBonus = Math.min(3, nextBonus + Math.min(keys, 2));
      detail = keys ? `${keys} chave(s) encontrada(s)` : 'Nenhuma chave';
      if (nextBonus >= 3) {
        nextBonus = 0;
        setVaultMode(true);
        setVaultPicks([]);
        detail = 'Cofre liberado';
      }
    }

    setBonus((state) => ({ ...state, [id]: nextBonus }));
    const final = Math.floor(payout);
    if (final > 0) {
      setBalance((value) => value + final);
      const level = final >= bet * 10 ? 'mega' : final >= bet * 5 ? 'big' : 'win';
      showWin(level === 'mega' ? 'MEGA WIN!' : level === 'big' ? 'BIG WIN!' : 'VOCÊ GANHOU!', final, detail, level);
    }
    addHistory(currentGame?.name || id, wager, final, detail);
  };

  const spin = () => {
    if (spinning || vaultMode) return;
    if (freeSpins <= 0 && balance < bet) return showWin('SALDO INSUFICIENTE', 0, 'Reduza a aposta ou reinicie a demonstração.', 'lose');
    setWin(null);
    setSpinning(true);
    if (freeSpins > 0) setFreeSpins((v) => v - 1);
    else setBalance((value) => value - bet);

    let ticks = 0;
    const id = setInterval(() => {
      ticks += 1;
      setGrid(makeGrid(screen));
      if (ticks >= 10) {
        clearInterval(id);
        const finalGrid = makeGrid(screen);
        setGrid(finalGrid);
        setSpinning(false);
        evaluateSlot(screen, finalGrid);
      }
    }, 75);
  };

  const pickVault = (index) => {
    if (!vaultMode || vaultPicks.includes(index)) return;
    const multipliers = [2, 3, 5, 8, 10, 15];
    const mult = randomItem(multipliers);
    const picks = [...vaultPicks, index];
    setVaultPicks(picks);
    const prize = bet * mult;
    setBalance((v) => v + prize);
    showWin('COFRE ABERTO!', prize, `Você encontrou um prêmio de ${mult}x.`, mult >= 10 ? 'mega' : 'big');
    addHistory('Diamond Vault Bônus', 0, prize, `Escolha ${mult}x`);
    setTimeout(() => setVaultMode(false), 1200);
  };

  const generateCrash = () => {
    const data = new Uint32Array(1);
    crypto.getRandomValues(data);
    const r = data[0] / 4294967296;
    return Math.min(30, Math.max(1.05, Number((0.99 / Math.max(.03, 1-r)).toFixed(2))));
  };

  const finishCrash = () => {
    cancelAnimationFrame(crashRaf.current);
    setCrashState('crashed');
    setMultiplier(crashTarget.current);
    if (!cashed.current) addHistory('Neku Crash', bet, 0, `Crash ${crashTarget.current.toFixed(2)}x`);
  };

  const animateCrash = (now) => {
    const seconds = (now - crashStart.current) / 1000;
    const value = Number((1 + Math.pow(seconds * .72, 1.58)).toFixed(2));
    if (value >= crashTarget.current) return finishCrash();
    multiplierRef.current = value;
    setMultiplier(value);
    const x = Math.min(95, 3 + seconds * 8.4);
    const y = Math.max(8, 95 - Math.log(value) * 30);
    setCrashPath((points) => [...points.slice(-120), {x,y}]);
    crashRaf.current = requestAnimationFrame(animateCrash);
  };

  const startCrash = () => {
    if (crashState === 'flying' || balance < bet) return;
    setBalance((v) => v - bet);
    setCashout(null);
    setWin(null);
    cashed.current = false;
    crashTarget.current = generateCrash();
    multiplierRef.current = 1;
    setMultiplier(1);
    setCrashPath([{x:2,y:95}]);
    setCrashState('flying');
    crashStart.current = performance.now();
    crashRaf.current = requestAnimationFrame(animateCrash);
  };

  const cashOutCrash = () => {
    if (crashState !== 'flying' || cashed.current) return;
    cashed.current = true;
    const mult = multiplierRef.current;
    const payout = Math.floor(bet * mult);
    setBalance((v) => v + payout);
    setCashout({ mult, payout });
    showWin('VOCÊ SACOU!', payout, `Retirada realizada em ${mult.toFixed(2)}x.`, mult >= 5 ? 'mega' : 'big');
    addHistory('Neku Crash', bet, payout, `Saque ${mult.toFixed(2)}x`);
  };

  const crashD = crashPath.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
  const lastCrashPoint = crashPath.at(-1) || {x:2,y:95};

  return (
    <div className="casino-app">
      <header className="casino-header">
        <button className="casino-logo" onClick={() => setScreen('lobby')}><span>🐯</span><b>NEKU</b><small>SOCIAL CASINO</small></button>
        <nav className="casino-nav">
          <button className={screen === 'lobby' ? 'active' : ''} onClick={() => setScreen('lobby')}>Lobby</button>
          <button onClick={() => setScreen('history')}>Histórico</button>
          <button onClick={() => setScreen('vip')}>VIP</button>
        </nav>
        <div className="casino-wallet"><small>Saldo demo</small><strong>🪙 {fmt(balance)}</strong></div>
      </header>

      {screen === 'lobby' && <main className="casino-main">
        <section className="casino-hero"><div><span>✨ NOVA EXPERIÊNCIA NEKU</span><h1>Seu cassino social premium</h1><p>Cinco jogos demonstrativos com animações, bônus e moedas virtuais.</p><button onClick={() => openGame('tiger')}>Jogar destaque</button></div><div className="hero-tiger">🐯</div></section>
        <div className="section-title"><div><span>Jogos em destaque</span><h2>Escolha sua sorte</h2></div><small>Somente entretenimento virtual</small></div>
        <section className="casino-grid">{games.map((game) => <button className={`casino-card game-${game.id}`} key={game.id} onClick={() => openGame(game.id)}><span className="card-tag">{game.tag}</span><div className="card-art">{game.icon}</div><div className="card-info"><h3>{game.name}</h3><p>{game.desc}</p><span>JOGAR AGORA →</span></div></button>)}</section>
        <section className="casino-stats"><div><b>{history.length}</b><span>rodadas</span></div><div><b>{fmt(totalPlayed)}</b><span>moedas jogadas</span></div><div><b>5</b><span>jogos ativos</span></div></section>
      </main>}

      {configs[screen] && <main className={`game-screen theme-${screen}`}>
        <div className="game-toolbar"><button onClick={() => setScreen('lobby')}>← Lobby</button><div><span>{currentGame.icon}</span><h1>{currentGame.name}</h1></div><div className="mini-wallet">🪙 {fmt(balance)}</div></div>
        <section className="slot-shell">
          <div className="slot-top"><div><small>MODO</small><strong>{freeSpins > 0 ? `GIROS GRÁTIS ${freeSpins}` : 'JOGO BASE'}</strong></div><div className="bonus-meter"><small>MEDIDOR DE BÔNUS</small><div>{Array.from({ length: screen === 'dragon' ? 6 : screen === 'vault' ? 3 : screen === 'jungle' ? 4 : 5 }, (_, i) => <span className={i < (bonus[screen] || 0) ? 'lit' : ''} key={i}>◆</span>)}</div></div></div>
          <div className={`reel-grid cols-${configs[screen].cols} ${spinning ? 'spinning' : ''}`}>{grid.map((symbol, i) => <div className="slot-symbol" style={{ animationDelay: `${(i % configs[screen].cols) * 45}ms` }} key={`${i}-${symbol}-${spinning}`}>{symbol}</div>)}</div>
          <div className="slot-controls"><div className="bet-step"><button onClick={() => setBet(BETS[Math.max(0, BETS.indexOf(bet)-1)])}>−</button><div><small>APOSTA</small><b>🪙 {fmt(bet)}</b></div><button onClick={() => setBet(BETS[Math.min(BETS.length-1, BETS.indexOf(bet)+1)])}>+</button></div><button className="spin-button" onClick={spin} disabled={spinning}><span>{spinning ? 'GIRANDO' : 'GIRAR'}</span><small>{freeSpins > 0 ? 'GRÁTIS' : `${fmt(bet)} moedas`}</small></button><button className="info-button" onClick={() => showWin('COMO JOGAR', 0, currentGame.desc, 'info')}>?</button></div>
        </section>
        <p className="demo-note">Demo com moedas virtuais. Sem depósito, saque ou conversão em dinheiro.</p>
      </main>}

      {screen === 'crash' && <main className="game-screen crash-screen">
        <div className="game-toolbar"><button onClick={() => setScreen('lobby')}>← Lobby</button><div><span>🚀</span><h1>Neku Crash</h1></div><div className="mini-wallet">🪙 {fmt(balance)}</div></div>
        <section className={`crash-box ${crashState}`}>
          <div className="crash-status"><span>✓ RNG DEMONSTRATIVO</span><b>{crashState === 'flying' ? '● AO VIVO' : crashState === 'crashed' ? '● CRASH' : '● PRONTO'}</b></div>
          <div className="crash-chart"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="crashFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffbe38" stopOpacity=".65"/><stop offset="1" stopColor="#ff4000" stopOpacity="0"/></linearGradient></defs><path className="chart-grid" d="M0 20H100M0 40H100M0 60H100M0 80H100M20 0V100M40 0V100M60 0V100M80 0V100"/><path className="chart-area" d={`${crashD} L ${lastCrashPoint.x} 100 L 2 100 Z`}/><path className="chart-line" d={crashD}/></svg><div className="crash-multi">{multiplier.toFixed(2)}x</div><div className="rocket" style={crashState === 'flying' ? {left:`${lastCrashPoint.x}%`,top:`${lastCrashPoint.y}%`} : undefined}>{crashState === 'crashed' ? '💥' : '🚀'}</div>{crashState === 'crashed' && <div className="crash-word">CRASH!</div>}{cashout && <div className="cashout-toast"><b>VOCÊ SACOU!</b><span>{cashout.mult.toFixed(2)}x · 🪙 {fmt(cashout.payout)}</span></div>}</div>
          <div className="crash-controls-new"><div className="bet-step"><button onClick={() => setBet(BETS[Math.max(0, BETS.indexOf(bet)-1)])}>−</button><div><small>APOSTA</small><b>🪙 {fmt(bet)}</b></div><button onClick={() => setBet(BETS[Math.min(BETS.length-1, BETS.indexOf(bet)+1)])}>+</button></div><button className="cash-button" onPointerDown={cashOutCrash} disabled={crashState !== 'flying' || cashed.current}>SACAR AGORA<small>{crashState === 'flying' ? `🪙 ${fmt(Math.floor(bet * multiplier))}` : 'aguardando'}</small></button><button className="launch-button" onClick={startCrash} disabled={crashState === 'flying'}>{crashState === 'flying' ? 'EM VOO' : 'APOSTAR'}</button></div>
        </section>
      </main>}

      {screen === 'history' && <main className="simple-page"><button onClick={() => setScreen('lobby')}>← Voltar</button><h1>Histórico da sessão</h1>{history.length === 0 ? <p>Nenhuma rodada ainda.</p> : <div className="history-list">{history.map((item) => <div key={item.id}><span>{item.time}</span><b>{item.game}</b><small>{item.detail}</small><em className={item.payout ? 'positive' : ''}>{item.payout ? `+${fmt(item.payout)}` : `-${fmt(item.bet)}`}</em></div>)}</div>}</main>}
      {screen === 'vip' && <main className="simple-page"><button onClick={() => setScreen('lobby')}>← Voltar</button><h1>Clube VIP Neku</h1><div className="vip-card-demo"><span>👑</span><h2>Founder Demo</h2><p>Área demonstrativa de níveis, missões e recompensas virtuais.</p><button onClick={() => setBalance(START_BALANCE)}>Recarregar 100.000 moedas</button></div></main>}

      {vaultMode && <div className="vault-overlay"><div><span>💎</span><h2>ESCOLHA UM COFRE</h2><p>Cada cofre possui um multiplicador surpresa.</p><div className="vault-grid">{Array.from({length:6},(_,i)=><button className={vaultPicks.includes(i)?'opened':''} onClick={() => pickVault(i)} key={i}>{vaultPicks.includes(i)?'✨':'🔒'}</button>)}</div></div></div>}

      {win && <div className={`win-overlay ${win.level}`} onClick={() => setWin(null)}><div className="win-pop"><button onClick={() => setWin(null)}>×</button><div className="coin-rain">🪙 ✨ 🪙 ✨ 🪙</div><span className="win-icon">{win.level === 'lose' ? '😿' : win.level === 'info' ? 'ℹ️' : '🐯'}</span><h2>{win.title}</h2>{win.amount > 0 && <strong>🪙 {fmt(win.amount)}</strong>}<p>{win.subtitle}</p><small>Toque para continuar</small></div></div>}
    </div>
  );
}
