/**
 * P2-04: Live GIWA Testnet Transaction Test
 *
 * Requirements:
 *   1. Set GIWA_TEST_PRIVATE_KEY env var (hex, no 0x prefix)
 *   2. Wallet must have GIWA Sepolia ETH (get from faucet)
 *   3. docker compose up -d  (to start RPC)
 *
 * Usage:
 *   GIWA_TEST_PRIVATE_KEY=abc123... node tests/live/test-giwa-tx.mjs
 */
import { createPublicClient, createWalletClient, http, parseEther, formatEther, getAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const GIWA_SEPOLIA = {
  id: 91342,
  name: 'GIWA Sepolia',
  rpcUrl: 'https://sepolia-rpc.giwa.io',
  explorerUrl: 'https://sepolia-explorer.giwa.io',
};

function getPrivateKey() {
  const key = process.env.GIWA_TEST_PRIVATE_KEY;
  if (!key) {
    console.error('❌ Set GIWA_TEST_PRIVATE_KEY env var (hex, no 0x prefix)');
    process.exit(1);
  }
  return key.startsWith('0x') ? key.slice(2) : key;
}

async function main() {
  const privateKey = getPrivateKey();
  const account = privateKeyToAccount(`0x${privateKey}`);

  console.log('🔗 Connecting to GIWA Sepolia...');
  console.log(`   RPC:   ${GIWA_SEPOLIA.rpcUrl}`);
  console.log(`   Chain: ${GIWA_SEPOLIA.name} (${GIWA_SEPOLIA.id})`);

  const publicClient = createPublicClient({
    chain: GIWA_SEPOLIA,
    transport: http(GIWA_SEPOLIA.rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: GIWA_SEPOLIA,
    transport: http(GIWA_SEPOLIA.rpcUrl),
  });

  // 1. Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`\n💰 Wallet: ${account.address}`);
  console.log(`   Balance: ${formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.error('❌ Wallet has 0 ETH. Get testnet ETH from GIWA Sepolia faucet.');
    process.exit(1);
  }

  // 2. Get block number
  const blockNumber = await publicClient.getBlockNumber();
  console.log(`\n📦 Current block: ${blockNumber}`);

  // 3. Simulate a self-transfer (send 0 ETH to yourself)
  const toAddress = account.address;
  const value = parseEther('0');

  console.log(`\n🧪 Simulating self-transfer...`);
  try {
    const result = await publicClient.call({
      account: account.address,
      to: toAddress,
      value,
    });
    console.log(`   ✅ Simulation passed (dry-run succeeded)`);
  } catch (err) {
    console.error(`   ❌ Simulation failed: ${err.message}`);
    process.exit(1);
  }

  // 4. Build and sign the transaction
  console.log(`\n📝 Signing transaction...`);
  const nonce = await publicClient.getTransactionCount({ address: account.address });
  console.log(`   Nonce: ${nonce}`);

  const hash = await walletClient.sendTransaction({
    to: toAddress,
    value,
    nonce,
    chain: GIWA_SEPOLIA,
  });

  console.log(`\n🚀 TX submitted!`);
  console.log(`   Hash: ${hash}`);
  console.log(`   Explorer: ${GIWA_SEPOLIA.explorerUrl}/tx/${hash}`);

  // 5. Wait for confirmation
  console.log(`\n⏳ Waiting for confirmation...`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  console.log(`\n✅ TX confirmed!`);
  console.log(`   Block: ${receipt.blockNumber}`);
  console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
  console.log(`   Status: ${receipt.status === 'success' ? 'SUCCESS' : 'FAILED'}`);

  console.log(`\n🎉 P2-04 COMPLETE — Live TX on GIWA testnet succeeded!`);
}

main().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
