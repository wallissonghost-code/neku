import { useEffect, useMemo, useRef, useState } from 'react';

const symbols = ['🐯', '👑', '🏆', '🪙', '💎', '🧧'];
const rouletteNumbers = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27];
const TEST_BALANCE = 100000;
const randomItem = (items) => items[Math.floor(Math.random() * items.length)];
const fmt = (value) => Number(value).toLocaleString('pt-BR');

function generateCrashPoint() {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  const random = bytes[0] / 4294967296;
  const point = Math.max(1.01, Math.min(50, 0.99 / Math.max(0.01, 1 - random)));
  return Number(point.toFixed(2));
}

function makeRoundHash() {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export default function App() {
  const [tab, setTab] = useState('lobby');
  const [balance, setBalance] = useState(TEST_BALANCE);
  const [bet, setBet] = useState(5000);
  const [reels, setReels] = useState(['🐯', '👑', '🏆', '🪙', '💎']);
  const [rouletteResult, setRouletteResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState('Bem-vindo ao Neku. Você recebeu 100.000 moedas virtuais para teste.');
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [crashState, setCrashState] = useState('ready');
  const [multiplier, setMultiplier] = useState(1);
  const [crashPoints, setCrashPoints] = useState([{ x: 2, y: 96 }]);
  const [recentCrash, setRecentCrash] = useState([7.86, 1.32, 3.42, 2.18, 12.45, 1.05, 4.01, 1.71]);
  const [hasCashedOut, setHasCashedOut] = useState(false);
  const [lastCashout, setLastCashout] = useState(null);
  const [roundHash, setRoundHash] = useState(makeRoundHash());

  const crashTarget = useRef(2);
  const animationFrame = useRef(null);
  const flightStartedAt = useRef(0);
  const multiplierRef = useRef(1);
  const cashedOut = useRef(false);

  useEffect(() => () => cancelAnimationFrame(animationFrame.current), []);

  const totalPlayed = useMemo(() => history.reduce((sum, item) => sum + item.bet, 0), [history]);
  const crashPlayers = useMemo(() => {
    const base = [
      { name: 'Ghostzada', mult: 3.42, payout: 17100, status: 'win' },
      { name: 'Vini777', mult: 2.18, payout: 10900, status: 'win' },
      { name: 'Luana', mult: 1.52, payout: 7600, status: 'win' },
      { name: 'JeanXP', mult: 4.01, payout: 20050, status: 'win' },
    ];
    if (lastCashout) base.unshift({ name: 'Você', mult: lastCashout.multiplier, payout: lastCashout.payout, status: 'you' });
    return base.slice(0, 5);
  }, [lastCashout]);

  const addHistory = (game, wager, payout, result) => setHistory((current) => [
    { id: crypto.randomUUID(), game, bet: wager, payout, result, at: new Date().toLocaleTimeString('pt-BR') },
    ...current,
  ].slice(0, 30));

  const canPlay = () => {
    if (maintenance) return setMessage('Jogos pausados pelo painel administrativo.'), false;
    if (balance < bet) return setMessage('Saldo virtual insuficiente.'), false;
    return true;
  };

  const spinSlots = () => {
    if (!canPlay()) return;
    const next = Array.from({ length: 5 }, () => randomItem(symbols));
    const counts = next.reduce((map, item) => ({ ...map, [item]: (map[item] || 0) + 1 }), {});
    const best = Math.max(...Object.values(counts));
    const multi = next.every((item) => item === '🐯') ? 50 : best === 5 ? 30 : best === 4 ? 12 : best === 3 ? 5 : best === 2 ? 2 : 0;
    const payout = bet * multi;
    setReels(next);
    setBalance((value) => value - bet + payout);
    setMessage(payout ? `Prêmio premium: ${fmt(payout)} moedas!` : 'A máquina girou. Tente novamente.');
    addHistory('Golden Reels', bet, payout, next.join(' '));
  };

  const playRoulette = (choice) => {
    if (!canPlay()) return;
    const number = randomItem(rouletteNumbers);
    const color = number === 0 ? 'verde' : number % 2 === 0 ? 'preto' : 'vermelho';
    const payout = choice === color ? bet * (choice === 'verde' ? 14 : 2) : 0;
    setRouletteResult({ number, color });
    setBalance((value) => value - bet + payout);
    setMessage(payout ? `Acertou ${color}: +${fmt(payout)} moedas.` : `Saiu ${number} ${color}.`);
    addHistory('Roleta Neku', bet, payout, `${number} ${color}`);
  };

  const finishCrash = () => {
    cancelAnimationFrame(animationFrame.current);
    const finalMultiplier = crashTarget.current;
    multiplierRef.current = finalMultiplier;
    setMultiplier(finalMultiplier);
    setCrashState('crashed');
    setRecentCrash((items) => [finalMultiplier, ...items].slice(0, 10));
    if (!cashedOut.current) {
      setMessage(`CRASH em ${finalMultiplier.toFixed(2)}x. Você não retirou a tempo.`);
      addHistory('Neku Crash', bet, 0, `Crash ${finalMultiplier.toFixed(2)}x`);
    }
  };

  const animateCrash = (now) => {
    const seconds = Math.max(0, now - flightStartedAt.current) / 1000;
    const current = Number((1 + Math.pow(seconds * 0.7, 1.58)).toFixed(2));
    if (current >= crashTarget.current) return finishCrash();

    multiplierRef.current = current;
    setMultiplier(current);
    const progress = Math.min(1, seconds / 11);
    const x = Math.min(96, 3 + progress * 93);
    const normalized = Math.log(Math.max(current, 1)) / Math.log(Math.max(crashTarget.current, 2));
    const y = Math.max(8, 96 - normalized * 82);
    setCrashPoints((points) => [...points.slice(-120), { x, y }]);
    animationFrame.current = requestAnimationFrame(animateCrash);
  };

  const startCrash = () => {
    if (crashState === 'flying' || !canPlay()) return;
    cancelAnimationFrame(animationFrame.current);
    cashedOut.current = false;
    setHasCashedOut(false);
    setLastCashout(null);
    setRoundHash(makeRoundHash());
    crashTarget.current = generateCrashPoint();
    setBalance((value) => value - bet);
    multiplierRef.current = 1;
    setMultiplier(1);
    setCrashPoints([{ x: 2, y: 96 }]);
    setCrashState('flying');
    setMessage('Rodada RNG iniciada. Saque antes do crash.');
    flightStartedAt.current = performance.now();
    animationFrame.current = requestAnimationFrame(animateCrash);
  };

  const cashOut = () => {
    if (crashState !== 'flying' || cashedOut.current) return;
    cashedOut.current = true;
    setHasCashedOut(true);
    const instantMultiplier = multiplierRef.current;
    const payout = Math.floor(bet * instantMultiplier);
    setBalance((value) => value + payout);
    setLastCashout({ multiplier: instantMultiplier, payout, bet });
    setMessage(`Você retirou em ${instantMultiplier.toFixed(2)}x e ganhou ${fmt(payout)} moedas.`);
    addHistory('Neku Crash', bet, payout, `Saque ${instantMultiplier.toFixed(2)}x`);
  };

  const path = crashPoints.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const lastPoint = crashPoints[crashPoints.length - 1] || { x: 2, y: 96 };
  const claimDaily = () => { if (!dailyClaimed) { setBalance((value) => value + 500); setDailyClaimed(true); setMessage('Bônus diário: +500 moedas.'); } };
  const resetDemo = () => {
    cancelAnimationFrame(animationFrame.current);
    multiplierRef.current = 1;
    cashedOut.current = false;
    setHasCashedOut(false);
    setLastCashout(null);
    setBalance(TEST_BALANCE);
    setHistory([]);
    setDailyClaimed(false);
    setMultiplier(1);
    setCrashPoints([{ x: 2, y: 96 }]);
    setCrashState('ready');
    setMessage('Conta demo reiniciada com 100.000 moedas virtuais.');
  };

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => setTab('lobby')}><span>N</span> NEKU</button>
      <nav>{['lobby', 'slots', 'crash', 'roleta', 'historico', 'admin'].map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}</nav>
      <div className="wallet"><small>Saldo virtual</small><strong>🪙 {fmt(balance)}</strong></div>
    </header>
    <main>
      <section className="notice">18+ · Demonstração com moedas virtuais · Sem depósito, saque ou prêmio em dinheiro.</section>
      <section className="hero"><div><span className="eyebrow">NEKU GOLDEN EXPERIENCE</span><h1>Jogos premium <em>Neku</em></h1><p>Slots, crash e roleta em uma experiência demonstrativa responsiva.</p></div></section>
      <div className="status">{message}</div>

      {tab === 'lobby' && <section className="grid">
        <article className="game-card featured" onClick={() => setTab('slots')}><span>🐯</span><h2>Golden Reels</h2><p>Máquina premium com cinco colunas.</p><button>Jogar</button></article>
        <article className="game-card crash-card" onClick={() => setTab('crash')}><span>🚀</span><h2>Neku Crash</h2><p>Multiplicador RNG, gráfico ao vivo e saque instantâneo.</p><button>Decolar</button></article>
        <article className="game-card" onClick={() => setTab('roleta')}><span>🎡</span><h2>Roleta Neon</h2><p>Escolha uma cor e acompanhe o resultado.</p><button>Abrir</button></article>
        <article className="bonus-card"><span>🎁</span><h2>Bônus diário</h2><p>Receba 500 moedas virtuais.</p><button onClick={claimDaily} disabled={dailyClaimed}>{dailyClaimed ? 'Resgatado' : 'Resgatar'}</button></article>
      </section>}

      {tab === 'slots' && <section className="game-panel premium-slots">
        <div className="game-heading"><div><span className="eyebrow">JACKPOT ROYAL</span><h2>Neku Golden Reels</h2></div><BetControl bet={bet} setBet={setBet} /></div>
        <div className="slot-crown">✦ CINCO COLUNAS PREMIUM ✦</div>
        <div className="slot-machine">{reels.map((symbol, index) => <div className="reel" key={`${index}-${symbol}`}><span>{symbol}</span></div>)}</div>
        <button className="primary" onClick={spinSlots}>Girar por {fmt(bet)} moedas</button>
        <p className="rules">5 tigres: 50x · 5 iguais: 30x · 4 iguais: 12x · 3 iguais: 5x · 2 iguais: 2x.</p>
      </section>}

      {tab === 'crash' && <section className="game-panel crash-panel crash-v3">
        <div className="crash-rngbar">
          <div><span className="rng-ok">✓ RNG ATIVO</span><small>Hash da rodada: {roundHash.slice(0, 12)}…</small></div>
          <div className={`live-indicator ${crashState}`}>{crashState === 'flying' ? '● AO VIVO' : crashState === 'crashed' ? '● ENCERRADO' : '● PRONTO'}</div>
        </div>
        <div className="crash-layout">
          <div className={`crash-stage ${crashState}`}>
            <div className="axis-label axis-y">MULTIPLICADOR</div><div className="axis-label axis-x">TEMPO</div>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Gráfico RNG do multiplicador">
              <defs><linearGradient id="premiumArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffbf3c" stopOpacity=".62"/><stop offset=".55" stopColor="#ff6b00" stopOpacity=".22"/><stop offset="1" stopColor="#ff3000" stopOpacity="0"/></linearGradient></defs>
              <path className="crash-grid major" d="M0 20H100M0 40H100M0 60H100M0 80H100M20 0V100M40 0V100M60 0V100M80 0V100"/>
              <path className="crash-grid minor" d="M0 10H100M0 30H100M0 50H100M0 70H100M0 90H100M10 0V100M30 0V100M50 0V100M70 0V100M90 0V100"/>
              <path className="crash-area" d={`${path} L ${lastPoint.x} 100 L 2 100 Z`}/><path className="crash-line-shadow" d={path}/><path className="crash-line" d={path}/>{crashState === 'flying' && <circle className="flight-dot" cx={lastPoint.x} cy={lastPoint.y} r="1.6"/>}
            </svg>
            <div className="multiplier-wrap"><span>MULTIPLICADOR ATUAL</span><strong>{multiplier.toFixed(2)}x</strong></div>
            <div className="aircraft" style={crashState === 'flying' ? { left: `${lastPoint.x}%`, top: `${lastPoint.y}%` } : undefined}>{crashState === 'crashed' ? '💥' : '🚀'}</div>
            {crashState === 'crashed' && <div className="explosion"><strong>CRASH!</strong><span>{multiplier.toFixed(2)}x</span></div>}
          </div>
          <aside className="players-card"><header><strong>JOGADORES</strong><span>{crashPlayers.length}</span></header>{crashPlayers.map((player) => <div className={`player-row ${player.status}`} key={`${player.name}-${player.mult}`}><b>{player.name}</b><span>Sacou</span><em>{player.mult.toFixed(2)}x</em><strong>🪙 {fmt(player.payout)}</strong></div>)}</aside>
        </div>
        <div className="crash-controls">
          <div className="bet-card"><span>APOSTA</span><strong>🪙 {fmt(bet)}</strong><div className="quick-bets">{[1000,2500,5000,10000,25000,50000].map((value)=><button key={value} onClick={()=>setBet(value)}>{value>=1000?`${value/1000}K`:value}</button>)}</div></div>
          <button className="cashout" onPointerDown={cashOut} onClick={cashOut} disabled={crashState !== 'flying' || hasCashedOut}>{hasCashedOut ? 'RETIRADA CONCLUÍDA' : crashState === 'flying' ? <>SACAR AGORA <strong>{multiplier.toFixed(2)}x</strong><small>Você receberá 🪙 {fmt(Math.floor(bet * multiplier))}</small></> : 'AGUARDANDO RODADA'}</button>
          <button className="primary crash-start" onClick={startCrash} disabled={crashState === 'flying'}>{crashState === 'flying' ? 'RODADA EM ANDAMENTO' : `APOSTAR ${fmt(bet)} MOEDAS`}</button>
        </div>
        {lastCashout && <div className="cashout-result"><div className="cashout-tiger">🐯</div><div><span>VOCÊ SACOU!</span><p>Você retirou em <strong>{lastCashout.multiplier.toFixed(2)}x</strong></p></div><div><small>GANHOU</small><strong>🪙 {fmt(lastCashout.payout)}</strong></div></div>}
        <div className="crash-history-title">HISTÓRICO RECENTE</div><div className="crash-history">{recentCrash.map((value,index)=><span key={index} className={value<2?'low':value>=5?'high':''}>{value.toFixed(2)}x</span>)}</div>
        <div className="fair-strip"><span>✓ FAIR PLAY</span><span>◉ POWERED BY NEKU RNG</span><span>100% ALEATÓRIO E VERIFICÁVEL</span></div>
      </section>}

      {tab === 'roleta' && <section className="game-panel"><div className="game-heading"><div><span className="eyebrow">ROLETA DEMO</span><h2>Roleta Neon</h2></div><BetControl bet={bet} setBet={setBet} /></div><div className="roulette-result">{rouletteResult ? <><strong>{rouletteResult.number}</strong><span>{rouletteResult.color}</span></> : <><strong>?</strong><span>aguardando</span></>}</div><div className="roulette-actions"><button className="red" onClick={() => playRoulette('vermelho')}>Vermelho 2x</button><button className="black" onClick={() => playRoulette('preto')}>Preto 2x</button><button className="green" onClick={() => playRoulette('verde')}>Verde 14x</button></div></section>}
      {tab === 'historico' && <section className="table-card"><h2>Histórico da sessão</h2><p>{history.length ? `${history.length} rodadas · ${fmt(totalPlayed)} moedas jogadas` : 'Nenhuma rodada realizada.'}</p>{history.length > 0 && <div className="table-wrap"><table><thead><tr><th>Hora</th><th>Jogo</th><th>Aposta</th><th>Resultado</th><th>Prêmio</th></tr></thead><tbody>{history.map((item) => <tr key={item.id}><td>{item.at}</td><td>{item.game}</td><td>{fmt(item.bet)}</td><td>{item.result}</td><td className={item.payout ? 'win' : ''}>{fmt(item.payout)}</td></tr>)}</tbody></table></div>}</section>}
      {tab === 'admin' && <section className="admin-grid"><article><span>⚙️</span><h2>Controle dos jogos</h2><button onClick={() => setMaintenance(!maintenance)}>{maintenance ? 'Reativar jogos' : 'Ativar manutenção'}</button></article><article><span>🪙</span><h2>Economia virtual</h2><button onClick={resetDemo}>Reiniciar com 100 mil</button></article><article><span>🛡️</span><h2>Proteção</h2><p>Sem dinheiro real ou conversão monetária.</p><button disabled>Ativa</button></article></section>}
    </main>
    <footer><strong>NEKU</strong><span>Entretenimento virtual responsável.</span><span>© 2026</span></footer>
  </div>;
}

function BetControl({ bet, setBet }) {
  return <label className="bet-control">Aposta virtual<select value={bet} onChange={(event) => setBet(Number(event.target.value))}>{[10,25,50,100,250,500,1000,2500,5000,10000,25000,50000].map((value)=><option value={value} key={value}>{fmt(value)} moedas</option>)}</select></label>;
}
