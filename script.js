
let win = 0, loss = 0, stopAtivo = false;
let ultimos = [];

const API_KEY = "64913c84a4194725945d04a19ff7f8f6"; // Substitua pelo seu da Twelve Data
const SYMBOL = "EUR/USD";
const INTERVAL = "1min";

function registrar(tipo) {
  if (tipo === 'WIN') win++;
  else loss++;
  document.getElementById("historico").textContent = `${win} WIN / ${loss} LOSS`;
  if (loss >= 2) {
    stopAtivo = true;
    document.getElementById("comando").textContent = "STOP";
  }
}

async function buscarCandles() {
  const url = `https://api.twelvedata.com/time_series?symbol=EURUSD&interval=1min&outputsize=100&apikey=${API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.values) return;
    const candles = data.values.reverse().map(c => ({
      open: parseFloat(c.open),
      high: parseFloat(c.high),
      low: parseFloat(c.low),
      close: parseFloat(c.close)
    }));
    avaliarSinal(candles);
  } catch (e) {
    console.error("Erro ao buscar candles:", e);
  }
}

function calcularRSI(candles) {
  let gains = 0, losses = 0;
  for (let i = 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / candles.length;
  const avgLoss = losses / candles.length;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function detectarEngolfo(open1, close1, open2, close2) {
  return (close2 > open2 && open2 < close1 && close2 > open1) ||
         (close2 < open2 && open2 > close1 && close2 < open1) ? 1 : 0;
}

function forcaVelas(candles) {
  let altas = 0, baixas = 0;
  for (let i = candles.length - 3; i < candles.length; i++) {
    if (candles[i].close > candles[i].open) altas++;
    else if (candles[i].close < candles[i].open) baixas++;
  }
  if (altas >= 3) return "CALL";
  else if (baixas >= 3) return "PUT";
  return "ESPERAR";
}

function calcularEMA(candles, periodo = 10) {
  let k = 2 / (periodo + 1);
  let ema = candles[0].close;
  for (let i = 1; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
  }
  return ema;
}

function cruzamentoSMA(candles) {
  const sma5 = candles.slice(-5).reduce((s, c) => s + c.close, 0) / 5;
  const sma10 = candles.slice(-10).reduce((s, c) => s + c.close, 0) / 10;
  if (sma5 > sma10) return "CALL";
  else if (sma5 < sma10) return "PUT";
  return "ESPERAR";
}

function avaliarSinal(candles) {
  if (candles.length < 15 || stopAtivo) return;

  let criterios = [], score = 0;
  const rsi = calcularRSI(candles);
  if (rsi > 60) { criterios.push("RSI alto"); score += 20; }
  else if (rsi < 40) { criterios.push("RSI baixo"); score += 20; }

  if (detectarEngolfo(candles[8].open, candles[8].close, candles[9].open, candles[9].close)) {
    criterios.push("Padrão de Engolfo"); score += 20;
  }

  const tendencia = forcaVelas(candles);
  if (tendencia !== "ESPERAR") {
    criterios.push("Força das Velas: " + tendencia);
    score += 20;
  }

  const sma = cruzamentoSMA(candles);
  const ema = calcularEMA(candles);
  const close = candles[candles.length - 1].close;
  if ((sma === "CALL" && close > ema) || (sma === "PUT" && close < ema)) {
    criterios.push("Confirmação por EMA"); score += 20;
  }

  if (score >= 60) {
    document.getElementById("comando").textContent = sma;
    document.getElementById("score").textContent = `${score}%`;
    document.getElementById("hora").textContent = new Date().toLocaleTimeString();
    const li = document.createElement("li");
    li.textContent = `${sma} (${score}%) - ${new Date().toLocaleTimeString()}`;
    document.getElementById("ultimos").prepend(li);
    criterios.forEach(c => {
      const el = document.createElement("li");
      el.textContent = c;
      document.getElementById("criterios").appendChild(el);
    });
  }
}

setInterval(() => {
  document.getElementById("criterios").innerHTML = "";
  buscarCandles();
}, 60000);

window.onload = buscarCandles;
