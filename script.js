// Configurações (substitua pela sua chave TAAPI no .env)
const TAAPI_KEY = process.env.TAAPI_API_KEY; 

async function getIndicator(indicator, params = {}) {
  const query = new URLSearchParams({ 
    secret: TAAPI_KEY,
    symbol: "IDX/BRL",
    interval: "5m",
    ...params
  }).toString();

  const response = await fetch(`https://api.taapi.io/${indicator}?${query}`);
  return await response.json();
}

async function updateSignal() {
  try {
    const [ema7, ema21, rsi, adx] = await Promise.all([
      getIndicator("ema", { period: 7 }),
      getIndicator("ema", { period: 21 }),
      getIndicator("rsi", { period: 12 }),
      getIndicator("adx", { period: 14 })
    ]);

    // Lógica do sinal
    let signal = "AGUARDANDO";
    let confidence = 0;

    if (ema7.value > ema21.value && adx.value > 25 && rsi.value > 30) {
      signal = "CALL";
      confidence = 80;
    } else if (ema7.value < ema21.value && adx.value > 25 && rsi.value < 70) {
      signal = "PUT";
      confidence = 75;
    }

    // Atualiza a interface
    document.getElementById("signal").className = `signal ${signal.toLowerCase()}`;
    document.getElementById("signal").innerHTML = `
      <span>${signal}</span>
      <p class="confidence">Confiança: <span>${confidence}%</span></p>
    `;

    document.getElementById("ema").textContent = `${ema7.value.toFixed(2)} / ${ema21.value.toFixed(2)}`;
    document.getElementById("rsi").textContent = rsi.value.toFixed(2);
    document.getElementById("adx").textContent = adx.value.toFixed(2);

  } catch (error) {
    console.error("Erro:", error);
  }
}

// Atualiza a cada 5 minutos
setInterval(updateSignal, 5 * 60 * 1000);
updateSignal(); // Executa imediatamente
