// Background service worker for Blockmind Wallet Extension

const GIWA_RPC = {
  mainnet: 'https://rpc.giwa.io',
  sepolia: 'https://sepolia-rpc.giwa.io',
};

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_BALANCE') {
    fetchBalance(message.address, message.network || 'sepolia')
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message }));
    return true; // async response
  }

  if (message.type === 'SEND_TRANSACTION') {
    // Forward to Blockmind API
    fetch('https://api.blockmind.ai/v1/chain/sign-and-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message.tx),
    })
      .then((res) => res.json())
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }

  if (message.type === 'AI_QUERY') {
    // Forward to Blockmind agent
    fetch('https://api.blockmind.ai/v1/agent/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: message.query, session_id: message.sessionId }),
    })
      .then((res) => res.json())
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message }));
    return true;
  }
});

async function fetchBalance(address, network) {
  const rpcUrl = GIWA_RPC[network] || GIWA_RPC.sepolia;
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getBalance',
      params: [address, 'latest'],
      id: 1,
    }),
  });
  const data = await res.json();
  const balanceWei = parseInt(data.result, 16);
  const balanceEth = balanceWei / 1e18;
  return { balance: balanceEth.toFixed(4), balanceWei: data.result };
}
