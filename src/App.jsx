import { useEffect, useMemo, useRef, useState } from 'react';

const symbols = ['🐯', '👑', '🏆', '🪙', '💎', '🧧'];
const rouletteNumbers = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27];
const randomItem = (items) => items[Math.floor(Math.random() * items.length)];

export default function App() {
  const [tab, setTab] = useState('lobby');
  const [balance, setBalance] = useState(2500);
  const [bet, setBet] = useState(50);
  const [reels, setReels] = useState(['🐯', '👑', '🏆', '🪙', '💎']);
  const [rouletteResult, setRouletteResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState('Bem-vindo ao Neku. Você recebeu 2.500 moedas virtuais.');
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [maintenance, setMaintenance] = useState(false);
  const [crashState, setCrashState] = useState('ready');
  const [multiplier, setMultiplier] = useState(1);
  const [crashPoints, setCrashPoints] = useState([{ x: 0, y: 98 }]);
  const [recentCrash, setRecentCrash] = useState([1.42, 3.18, 1.09, 6.74, 2.21]);
  const crashTarget = useRef(2);
  const timer = useRef(null);
  const cashedOut = useRef(false);

  useEffect(() => () => clearInterval(timer.current), []);

  const totalPlayed = useMemo(() => history.reduce((sum, item) => sum + item.bet, 0), [history]);
  const addHistory = (game, wager, payout, result) => setHistory((current) => [
    { id: crypto.randomUUID(), game, bet: wager, payout, result, at: new Date().toLocaleTimeString('pt-BR') },
    ...current,
  ].slice(0, 20));

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
    const tigerFive = next.every((item) => item === '🐯');
    const multi = tigerFive ? 50 : best === 5 ? 30 : best === 4 ? 12 : best === 3 ? 5 : best === 2 ? 2 : 0;
    const payout = bet * multi;
    setReels(next);
    setBalance((value) => value - bet + payout);
    setMessage(payout ? `Prêmio premium: ${payout} moedas!` : 'A máquina girou. Tente novamente.');
    addHistory('Golden Reels', bet, payout, next.join(' '));
  };

  const playRoulette = (choice) => {
    if (!canPlay()) return;
    const number = randomItem(rouletteNumbers);
    const color = number === 0 ? 'verde' : number % 2 === 0 ? 'preto' : 'vermelho';
    const payout = choice === color ? bet * (choice === 'verde' ? 14 : 2) : 0;
    setRouletteResult({ number, color });
    setBalance((value) => value - bet + payout);
    setMessage(payout ? `Acertou ${color}: +${payout} moedas.` : `Saiu ${number} ${color}.`);
    addHistory('Roleta Neku', bet, payout, `${number} ${color}`);
  };

  const startCrash = () => {
    if (crashState === 'flying' || !canPlay()) return;
    clearInterval(timer.current);
    cashedOut.current = false;
    const r = Math.random();
    crashTarget.current = Number((r < .35 ? 1.05 + Math.random() * .8 : r < .8 ? 1.8 + Math.random() * 3.2 : 5 + Math.random() * 9).toFixed(2));
    setBalance((value) => value - bet);
    setMultiplier(1);
    setCrashPoints([{ x: 0, y: 98 }]);
    setCrashState('flying');
    setMessage('Neku Crash decolou. Retire antes da explosão!');
    let tick = 0;
    timer.current = setInterval(() => {
      tick += 1;
      const current = Number((1 + Math.pow(tick / 28, 1.7)).toFixed(2));
      const x = Math.min(98, tick * 2.15);
      const y = Math.max(7, 98 - Math.log(current) * 36);
      setMultiplier(current);
      setCrashPoints((points) => [...points.slice(-48), { x, y }]);
      if (current >= crashTarget.current) {
        clearInterval(timer.current);
        setMultiplier(crashTarget.current);
        setCrashState('crashed');
        setRecentCrash((items) => [crashTarget.current, ...items].slice(0, 7));
        if (!cashedOut.current) {
          setMessage(`CRASH em ${crashTarget.current.toFixed(2)}x. A aeronave explodiu!`);
          addHistory('Neku Crash', bet, 0, `${crashTarget.current.toFixed(2)}x`);
        }
        setTimeout(() => setCrashState('ready'), 1800);
      }
    }, 90);
  };

  const cashOut = () => {
    if (crashState !== 'flying' || cashedOut.current) return;
    cashedOut.current = true;
    const payout = Math.floor(bet * multiplier);
    setBalance((value) => value + payout);
    setMessage(`Retirada em ${multiplier.toFixed(2)}x: +${payout} moedas.`);
    addHistory('Neku Crash', bet, payout, `Retirada ${multiplier.toFixed(2)}x`);
  };

  const path = crashPoints.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const claimDaily = () => { if (!dailyClaimed) { setBalance((v) => v + 500); setDailyClaimed(true); setMessage('Bônus diário: +500 moedas.'); } };
  const resetDemo = () => { clearInterval(timer.current); setBalance(2500); setHistory([]); setDailyClaimed(false); setCrashState('ready'); setMessage('Conta demo reiniciada.'); };

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => setTab('lobby')}><span>N</span> NEKU</button>
      <nav>{['lobby', 'slots', 'crash', 'roleta', 'historico', 'admin'].map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>)}</nav>
      <div className="wallet"><small>Saldo virtual</small><strong>🪙 {balance.toLocaleString('pt-BR')}</strong></div>
    </header>
    <main>
      <section className="notice">18+ · Demonstração com moedas virtuais · Sem depósito, saque ou prêmio em dinheiro.</section>
      <section className="hero"><div><span className="eyebrow">NEKU GOLDEN EXPERIENCE</span><h1>Jogos premium <em>Neku</em></h1><p>Slots, crash e roleta em uma experiência demonstrativa responsiva.</p></div></section>
      <div className="status">{message}</div>

      {tab === 'lobby' && <section className="grid">
        <article className="game-card featured" onClick={() => setTab('slots')}><span>🐯</span><h2>Golden Reels</h2><p>Máquina premium com cinco colunas.</p><button>Jogar</button></article>
        <article className="game-card crash-card" onClick={() => setTab('crash')}><span>🚀</span><h2>Neku Crash</h2><p>Veja o multiplicador subir e retire antes da explosão.</p><button>Decolar</button></article>
        <article className="game-card" onClick={() => setTab('roleta')}><span>🎡</span><h2>Roleta Neon</h2><p>Escolha uma cor e acompanhe o resultado.</p><button>Abrir</button></article>
        <article className="bonus-card"><span>🎁</span><h2>Bônus diário</h2><p>Receba 500 moedas virtuais.</p><button onClick={claimDaily} disabled={dailyClaimed}>{dailyClaimed ? 'Resgatado' : 'Resgatar'}</button></article>
      </section>}

      {tab === 'slots' && <section className="game-panel premium-slots">
        <div className="game-heading"><div><span className="eyebrow">JACKPOT ROYAL</span><h2>Neku Golden Reels</h2></div><BetControl bet={bet} setBet={setBet} /></div>
        <div className="slot-crown">✦ CINCO COLUNAS PREMIUM ✦</div>
        <div className="slot-machine">{reels.map((symbol, index) => <div className="reel" key={`${index}-${symbol}`}><span>{symbol}</span></div>)}</div>
        <button className="primary" onClick={spinSlots}>Girar por {bet} moedas</button>
        <p className="rules">5 tigres: 50x · 5 iguais: 30x · 4 iguais: 12x · 3 iguais: 5x · 2 iguais: 2x.</p>
      </section>}

      {tab === 'crash' && <section className="game-panel crash-panel">
        <div className="game-heading"><div><span className="eyebrow">MULTIPLICADOR AO VIVO</span><h2>Neku Crash</h2></div><BetControl bet={bet} setBet={setBet} /></div>
        <div className="crash-history">{recentCrash.map((value, i) => <span key={i} className={value < 2 ? 'low' : value >= 5 ? 'high' : ''}>{value.toFixed(2)}x</span>)}</div>
        <div className={`crash-stage ${crashState}`}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Gráfico do multiplicador"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffd54f" stopOpacity=".5"/><stop offset="1" stopColor="#ff3d00" stopOpacity="0"/></linearGradient></defs><path className="crash-grid" d="M0 25H100M0 50H100M0 75H100M25 0V100M50 0V100M75 0V100"/><path className="crash-area" d={`${path} L 100 100 L 0 100 Z`}/><path className="crash-line" d={path}/></svg>
          <div className="multiplier">{multiplier.toFixed(2)}x</div>
          <div className="aircraft">{crashState === 'crashed' ? '💥' : '🚀'}</div>
          {crashState === 'crashed' && <div className="explosion">CRASH!</div>}
        </div>
        <div className="crash-actions">
          <button className="primary" onClick={startCrash} disabled={crashState === 'flying'}>{crashState === 'flying' ? 'Em voo...' : `Apostar ${bet} moedas`}</button>
          <button className="cashout" onClick={cashOut} disabled={crashState !== 'flying' || cashedOut.current}>Retirar {crashState === 'flying' ? `${Math.floor(bet * multiplier)} moedas` : ''}</button>
        </div>
        <p className="rules">O ponto de crash é aleatório. Retire enquanto o multiplicador estiver subindo.</p>
      </section>}

      {tab === 'roleta' && <section className="game-panel"><div className="game-heading"><div><span className="eyebrow">ROLETA DEMO</span><h2>Roleta Neon</h2></div><BetControl bet={bet} setBet={setBet} /></div><div className="roulette-result">{rouletteResult ? <><strong>{rouletteResult.number}</strong><span>{rouletteResult.color}</span></> : <><strong>?</strong><span>aguardando</span></>}</div><div className="roulette-actions"><button className="red" onClick={() => playRoulette('vermelho')}>Vermelho 2x</button><button className="black" onClick={() => playRoulette('preto')}>Preto 2x</button><button className="green" onClick={() => playRoulette('verde')}>Verde 14x</button></div></section>}

      {tab === 'historico' && <section className="table-card"><h2>Histórico da sessão</h2><p>{history.length ? `${history.length} rodadas · ${totalPlayed} moedas jogadas` : 'Nenhuma rodada realizada.'}</p>{history.length > 0 && <div className="table-wrap"><table><thead><tr><th>Hora</th><th>Jogo</th><th>Aposta</th><th>Resultado</th><th>Prêmio</th></tr></thead><tbody>{history.map((item) => <tr key={item.id}><td>{item.at}</td><td>{item.game}</td><td>{item.bet}</td><td>{item.result}</td><td className={item.payout ? 'win' : ''}>{item.payout}</td></tr>)}</tbody></table></div>}</section>}

      {tab === 'admin' && <section className="admin-grid"><article><span>⚙️</span><h2>Controle dos jogos</h2><button onClick={() => setMaintenance(!maintenance)}>{maintenance ? 'Reativar jogos' : 'Ativar manutenção'}</button></article><article><span>🪙</span><h2>Economia virtual</h2><button onClick={resetDemo}>Reiniciar demo</button></article><article><span>🛡️</span><h2>Proteção</h2><p>Sem dinheiro real ou conversão monetária.</p><button disabled>Ativa</button></article></section>}
    </main>
    <footer><strong>NEKU</strong><span>Entretenimento virtual responsável.</span><span>© 2026</span></footer>
  </div>;
}

function BetControl({ bet, setBet }) {
  return <label className="bet-control">Aposta virtual<select value={bet} onChange={(event) => setBet(Number(event.target.value))}>{[10, 25, 50, 100, 250, 500].map((value) => <option value={value} key={value}>{value} moedas</option>)}</select></label>;
}
