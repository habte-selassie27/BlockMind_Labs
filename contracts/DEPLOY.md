# Deploy BlockMindAgentVault to GIWA Sepolia

## Option 1: Remix IDE (Easiest)

1. Go to https://remix.ethereum.org
2. Create new file `BlockMindAgentVault.sol` and paste the contract code
3. Go to **Solidity Compiler** → compile with `0.8.20`
4. Go to **Deploy & Run** → select **Injected Provider** (MetaMask)
5. Make sure MetaMask is on **GIWA Sepolia** (Chain ID 91342)
6. Click **Deploy** → confirm in MetaMask
7. Copy the deployed contract address

## Option 2: Hardhat

```bash
npx hardhat compile
npx hardhat run scripts/deploy.ts --network giwaSepolia
```

## Add to .env

```
CONTRACT_ADDRESS=<your-deployed-address>
```

## Verify on Explorer

1. Go to https://sepolia-explorer.giwa.io
2. Search your contract address
3. Click **Verify and Publish**
4. Select **Solidity (Single file)**
5. Compiler: 0.8.20, license: MIT
6. Paste the contract source code
7. Verify
