import { useMemo, useState } from 'react';

const symbols = ['🐯', '👑', '🏆', '🧧', '🪙', '💎'];
const rouletteNumbers = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27];

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export default function App() {
  const [tab, setTab] = useState('lobby');
  const [balance, setBalance] = useState(2500);
  const [bet, setBet] = useState(50);
  const [reels, setReels] = useState(['👑', '🐯', '💎', '🏆', '🪙']);
  const [rouletteResult, setRouletteResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState('Bem-vindo ao Neku. Você recebeu 2.500 moedas virtuais.');
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [sound, setSound] = useState(true);
  const [maintenance, setMaintenance] = useState(false);

  const totalPlayed = useMemo(
    () => history.reduce((sum, item) => sum + item.bet, 0),
    [history]
  );

  const addHistory = (game, wager, payout, result) => {
    setHistory((current) => [
      { id: crypto.randomUUID(), game, bet: wager, payout, result, at: new Date().toLocaleTimeString('pt-BR') },
      ...current,
    ].slice(0, 20));
  };

  const canPlay = () => {
    if (maintenance) {
      setMessage('Jogos temporariamente pausados pelo painel administrativo.');
      return false;
    }
    if (bet < 10 || bet > 500) {
      setMessage('A aposta virtual deve ficar entre 10 e 500 moedas.');
      return false;
    }
    if (balance < bet) {
      setMessage('Saldo virtual insuficiente. Use o bônus diário ou reinicie a conta demo.');
      return false;
    }
    return true;
  };

  const spinSlots = () => {
    if (!canPlay()) return;

    const next = Array.from({ length: 5 }, () => randomItem(symbols));
    const counts = next.reduce((accumulator, symbol) => {
      accumulator[symbol] = (accumulator[symbol] || 0) + 1;
      return accumulator;
    }, {});
    const highestMatch = Math.max(...Object.values(counts));
    const winningSymbol = Object.keys(counts).find((symbol) => counts[symbol] === highestMatch);

    let multiplier = 0;
    if (highestMatch === 5) multiplier = winningSymbol === '🐯' ? 50 : 30;
    else if (highestMatch === 4) multiplier = 12;
    else if (highestMatch === 3) multiplier = 5;
    else if (highestMatch === 2) multiplier = 2;

    const payout = bet * multiplier;
    setReels(next);
    setBalance((value) => value - bet + payout);
    setMessage(
      payout
        ? `${winningSymbol} combinação premium! Você ganhou ${payout.toLocaleString('pt-BR')} moedas.`
        : 'Não foi dessa vez. Tente novamente com responsabilidade.'
    );
    addHistory('Neku Golden Reels', bet, payout, next.join(' '));
  };

  const playRoulette = (choice) => {
    if (!canPlay()) return;
    const number = randomItem(rouletteNumbers);
    const color = number === 0 ? 'verde' : number % 2 === 0 ? 'preto' : 'vermelho';
    const won = choice === color;
    const payout = won ? bet * (choice === 'verde' ? 14 : 2) : 0;
    setRouletteResult({ number, color });
    setBalance((value) => value - bet + payout);
    setMessage(won ? `Acertou ${color}! Prêmio virtual: ${payout.toLocaleString('pt-BR')} moedas.` : `Saiu ${number} ${color}.`);
    addHistory('Roleta Neku', bet, payout, `${number} ${color}`);
  };

  const claimDaily = () => {
    if (dailyClaimed) return;
    setBalance((value) => value + 500);
    setDailyClaimed(true);
    setMessage('Bônus diário resgatado: +500 moedas virtuais.');
  };

  const resetDemo = () => {
    setBalance(2500);
    setHistory([]);
    setDailyClaimed(false);
    setMessage('Conta demonstrativa reiniciada.');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setTab('lobby')}><span>N</span> NEKU</button>
        <nav>
          {['lobby', 'slots', 'roleta', 'historico', 'admin'].map((item) => (
            <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>
          ))}
        </nav>
        <div className="wallet"><small>Saldo virtual</small><strong>🪙 {balance.toLocaleString('pt-BR')}</strong></div>
      </header>

      <main>
        <section className="notice">18+ · Cassino social demonstrativo · Sem depósitos, saques ou prêmios em dinheiro real.</section>
        <section className="hero">
          <div>
            <span className="eyebrow">SOCIAL CASINO EXPERIENCE</span>
            <h1>Entre no universo <em>Neku</em></h1>
            <p>Jogos demonstrativos, recompensas virtuais, histórico e controle administrativo em uma interface responsiva.</p>
          </div>
          <button className="sound" onClick={() => setSound(!sound)}>{sound ? '🔊 Som ligado' : '🔇 Som desligado'}</button>
        </section>

        <div className="status">{message}</div>

        {tab === 'lobby' && (
          <section className="grid">
            <article className="game-card featured" onClick={() => setTab('slots')}><span>🎰</span><h2>Neku Golden Reels</h2><p>Cinco colunas premium com símbolos dourados e multiplicadores especiais.</p><button>Jogar agora</button></article>
            <article className="game-card" onClick={() => setTab('roleta')}><span>🎡</span><h2>Roleta Neon</h2><p>Escolha uma cor e acompanhe o resultado da rodada.</p><button>Abrir roleta</button></article>
            <article className="bonus-card"><span>🎁</span><h2>Bônus diário</h2><p>Receba 500 moedas virtuais para continuar testando.</p><button onClick={claimDaily} disabled={dailyClaimed}>{dailyClaimed ? 'Resgatado hoje' : 'Resgatar bônus'}</button></article>
            <article className="stats-card"><span>📊</span><h2>Sua sessão</h2><div><b>{history.length}</b><small>rodadas</small></div><div><b>{totalPlayed.toLocaleString('pt-BR')}</b><small>moedas jogadas</small></div></article>
          </section>
        )}

        {tab === 'slots' && (
          <section className="game-panel premium-slots">
            <div className="game-heading"><div><span className="eyebrow">CINCO ROLOS PREMIUM</span><h2>Neku Golden Reels</h2></div><BetControl bet={bet} setBet={setBet} /></div>
            <div className="slot-crown">✦ JACKPOT ROYAL ✦</div>
            <div className="slot-machine">{reels.map((symbol, index) => <div className="reel" key={`${symbol}-${index}`}><span>{symbol}</span></div>)}</div>
            <button className="primary" onClick={spinSlots}>Girar por {bet} moedas</button>
            <p className="rules">5 tigres: 50x · 5 iguais: 30x · 4 iguais: 12x · 3 iguais: 5x · 2 iguais: 2x.</p>
          </section>
        )}

        {tab === 'roleta' && (
          <section className="game-panel">
            <div className="game-heading"><div><span className="eyebrow">ROLETA DEMO</span><h2>Roleta Neon</h2></div><BetControl bet={bet} setBet={setBet} /></div>
            <div className="roulette-result">{rouletteResult ? <><strong>{rouletteResult.number}</strong><span>{rouletteResult.color}</span></> : <><strong>?</strong><span>aguardando rodada</span></>}</div>
            <div className="roulette-actions"><button className="red" onClick={() => playRoulette('vermelho')}>Vermelho 2x</button><button className="black" onClick={() => playRoulette('preto')}>Preto 2x</button><button className="green" onClick={() => playRoulette('verde')}>Verde 14x</button></div>
          </section>
        )}

        {tab === 'historico' && (
          <section className="table-card"><h2>Histórico da sessão</h2>{history.length === 0 ? <p>Nenhuma rodada realizada.</p> : <div className="table-wrap"><table><thead><tr><th>Hora</th><th>Jogo</th><th>Aposta</th><th>Resultado</th><th>Prêmio</th></tr></thead><tbody>{history.map((item) => <tr key={item.id}><td>{item.at}</td><td>{item.game}</td><td>{item.bet}</td><td>{item.result}</td><td className={item.payout ? 'win' : ''}>{item.payout}</td></tr>)}</tbody></table></div>}</section>
        )}

        {tab === 'admin' && (
          <section className="admin-grid">
            <article><span>⚙️</span><h2>Controle dos jogos</h2><p>Pause ou libere todas as partidas demonstrativas.</p><button onClick={() => setMaintenance(!maintenance)}>{maintenance ? 'Reativar jogos' : 'Ativar manutenção'}</button></article>
            <article><span>🪙</span><h2>Economia virtual</h2><p>Reinicie saldo e histórico desta demonstração local.</p><button onClick={resetDemo}>Reiniciar conta demo</button></article>
            <article><span>🛡️</span><h2>Conformidade</h2><p>Sem dinheiro real, saque, depósito, PIX, cripto ou conversão monetária.</p><button disabled>Proteção ativa</button></article>
          </section>
        )}
      </main>

      <footer><strong>NEKU</strong><span>Entretenimento virtual responsável.</span><span>© 2026</span></footer>
    </div>
  );
}

function BetControl({ bet, setBet }) {
  return (
    <label className="bet-control">Aposta virtual
      <select value={bet} onChange={(event) => setBet(Number(event.target.value))}>
        {[10, 25, 50, 100, 250, 500].map((value) => <option value={value} key={value}>{value} moedas</option>)}
      </select>
    </label>
  );
}
