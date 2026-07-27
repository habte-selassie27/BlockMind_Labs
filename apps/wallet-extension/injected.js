// Content script injected into GIWA pages
// Provides postMessage API for dApps to interact with Blockmind

(function() {
  'use strict';

  window.postMessage({
    type: 'BLOCKMIND_WALLET_READY',
    version: '1.0.0',
  }, '*');

  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;
    if (event.data.type !== 'BLOCKMIND_REQUEST') return;

    const { id, method, params } = event.data;

    try {
      let result;

      switch (method) {
        case 'eth_requestAccounts':
        case 'eth_accounts': {
          // Get stored address or prompt connection
          const stored = await chrome.storage.local.get('walletAddress');
          result = stored.walletAddress ? [stored.walletAddress] : [];
          break;
        }

        case 'eth_chainId': {
          const stored = await chrome.storage.local.get('chainId');
          result = stored.chainId || '0x1651a'; // GIWA Sepolia
          break;
        }

        case 'eth_getBalance': {
          const response = await chrome.runtime.sendMessage({
            type: 'GET_BALANCE',
            address: params[0],
            network: 'sepolia',
          });
          result = response.balanceWei || '0x0';
          break;
        }

        case 'eth_sendTransaction': {
          const response = await chrome.runtime.sendMessage({
            type: 'SEND_TRANSACTION',
            tx: params[0],
          });
          result = response.hash || response.error;
          break;
        }

        case 'blockmind_query': {
          const response = await chrome.runtime.sendMessage({
            type: 'AI_QUERY',
            query: params.query,
            sessionId: params.sessionId,
          });
          result = response;
          break;
        }

        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      window.postMessage({
        type: 'BLOCKMIND_RESPONSE',
        id,
        result,
      }, '*');

    } catch (err) {
      window.postMessage({
        type: 'BLOCKMIND_RESPONSE',
        id,
        error: err.message,
      }, '*');
    }
  });
})();
