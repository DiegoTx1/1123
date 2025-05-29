
let win = 0, loss = 0, stopAtivo = false;

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
  const url = "https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=EUR&to_symbol=USD&interval=1min&apikey=64913c84a4194725945d04a19ff7f8f6&outputsize=compact";
  try {
    const res = await fetch(url);
    const data = await res.json();
    const series = data["Time Series FX (1min)"];
    if (!series) return;
    const candles = Object.entries(series).slice(0, 100).reverse().map(([time, val]) => {
      return {
        open: parseFloat(val["1. open"]),
        high: parseFloat(val["2. high"]),
        low: parseFloat(val["3. low"]),
        close: parseFloat(val["4. close"])
      };
    });
    avaliarSinal(candles);
  } catch (e) {
    console.error("Erro ao buscar da Alpha Vantage:", e);
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

function detectarEngolfo(o1, c1, o2, c2) {
  return (c2 > o2 && o2 < c1 && c2 > o1) || (c2 < o2 && o2 > c1 && c2 < o1) ? 1 : 0;
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
    criterios.push("Engolfo"); score += 20;
  }

  const tendencia = forcaVelas(candles);
  if (tendencia !== "ESPERAR") {
    criterios.push("Força Velas: " + tendencia); score += 20;
  }

  const sma = cruzamentoSMA(candles);
  const ema = calcularEMA(candles);
  const close = candles[candles.length - 1].close;
  if ((sma === "CALL" && close > ema) || (sma === "PUT" && close < ema)) {
    criterios.push("EMA confirmando"); score += 20;
  }

  if (score >= 60) {
    document.getElementById("comando").textContent = sma;
    document.getElementById("score").textContent = `${score}%`;
    document.getElementById("hora").textContent = new Date().toLocaleTimeString();
    const li = document.createElement("li");
    li.textContent = `${sma} (${score}%) - ` + new Date().toLocaleTimeString();
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
