// Popup UI for Blockmind Wallet Extension

let currentAddress = null;
let balance = '0';

async function init() {
  const stored = await chrome.storage.local.get(['walletAddress', 'chainId']);
  currentAddress = stored.walletAddress;

  render();

  if (currentAddress) {
    await refreshBalance();
  }
}

function render() {
  const root = document.getElementById('root');

  if (!currentAddress) {
    root.innerHTML = `
      <div style="padding: 24px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 16px;">⬡</div>
        <h1 style="font-size: 20px; margin-bottom: 8px;">Blockmind Wallet</h1>
        <p style="color: #94a3b8; margin-bottom: 24px;">AI-powered blockchain assistant</p>
        <button id="connect-btn" style="
          width: 100%; padding: 12px; background: #6366f1; border: none;
          border-radius: 8px; color: white; font-size: 16px; cursor: pointer;
        ">Connect Wallet</button>
        <div style="margin-top: 16px;">
          <input id="address-input" placeholder="Or enter wallet address" style="
            width: 100%; padding: 10px; background: #1e293b; border: 1px solid #334155;
            border-radius: 8px; color: white; font-size: 14px;
          " />
        </div>
      </div>
    `;

    document.getElementById('connect-btn').onclick = async () => {
      // In production: connect to GIWA Wallet / MetaMask
      const input = document.getElementById('address-input');
      if (input.value) {
        currentAddress = input.value;
        await chrome.storage.local.set({ walletAddress: currentAddress });
        render();
        refreshBalance();
      }
    };
  } else {
    const short = `${currentAddress.slice(0, 6)}...${currentAddress.slice(-4)}`;
    root.innerHTML = `
      <div style="padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div style="font-size: 18px; font-weight: 700; color: #6366f1;">⬡ Blockmind</div>
          <button id="disconnect-btn" style="
            background: none; border: 1px solid #334155; color: #94a3b8;
            padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;
          ">Disconnect</button>
        </div>

        <div style="background: #1e293b; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
          <div style="color: #94a3b8; font-size: 12px; margin-bottom: 4px;">Balance</div>
          <div style="font-size: 28px; font-weight: 700;">${balance} ETH</div>
          <div style="color: #6366f1; font-size: 12px; font-family: monospace; margin-top: 4px;">${short}</div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
          <button style="
            padding: 12px; background: #1e293b; border: 1px solid #334155;
            border-radius: 8px; color: white; cursor: pointer;
          ">Send</button>
          <button style="
            padding: 12px; background: #1e293b; border: 1px solid #334155;
            border-radius: 8px; color: white; cursor: pointer;
          ">Receive</button>
        </div>

        <div style="background: #1e293b; border-radius: 12px; padding: 12px;">
          <div style="color: #94a3b8; font-size: 12px; margin-bottom: 8px;">🤖 AI Assistant</div>
          <div style="display: flex; gap: 8px;">
            <input id="ai-input" placeholder="Ask about your wallet..." style="
              flex: 1; padding: 8px; background: #0f172a; border: 1px solid #334155;
              border-radius: 6px; color: white; font-size: 13px;
            " />
            <button id="ai-send" style="
              padding: 8px 12px; background: #6366f1; border: none;
              border-radius: 6px; color: white; cursor: pointer;
            ">→</button>
          </div>
          <div id="ai-response" style="margin-top: 8px; font-size: 13px; color: #94a3b8;"></div>
        </div>

        <div style="margin-top: 12px; text-align: center;">
          <span style="font-size: 11px; color: #64748b;">GIWA Sepolia Testnet</span>
        </div>
      </div>
    `;

    document.getElementById('disconnect-btn').onclick = async () => {
      await chrome.storage.local.remove(['walletAddress']);
      currentAddress = null;
      balance = '0';
      render();
    };

    document.getElementById('ai-send').onclick = async () => {
      const input = document.getElementById('ai-input');
      const responseDiv = document.getElementById('ai-response');
      if (!input.value) return;

      responseDiv.textContent = 'Thinking...';

      const response = await chrome.runtime.sendMessage({
        type: 'AI_QUERY',
        query: input.value,
      });

      responseDiv.textContent = response.response || response.error || 'No response';
      input.value = '';
    };
  }
}

async function refreshBalance() {
  if (!currentAddress) return;

  const response = await chrome.runtime.sendMessage({
    type: 'GET_BALANCE',
    address: currentAddress,
    network: 'sepolia',
  });

  if (response.balance) {
    balance = response.balance;
    render();
  }
}

init();
