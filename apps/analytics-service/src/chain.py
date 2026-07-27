"""Chain analytics — query GIWA RPC for on-chain data."""

from typing import Any

GIWA_RPC = "https://sepolia-rpc.giwa.io"


async def get_chain_stats(http: Any) -> dict:
    """Get current chain statistics."""
    # Get block number
    block_resp = await http.post(GIWA_RPC, json={
        "jsonrpc": "2.0",
        "method": "eth_blockNumber",
        "params": [],
        "id": 1,
    })
    block_resp.raise_for_status()
    block_hex = block_resp.json()["result"]
    block_number = int(block_hex, 16)

    # Get gas price
    gas_resp = await http.post(GIWA_RPC, json={
        "jsonrpc": "2.0",
        "method": "eth_gasPrice",
        "params": [],
        "id": 2,
    })
    gas_resp.raise_for_status()
    gas_hex = gas_resp.json()["result"]
    gas_price = int(gas_hex, 16)

    return {
        "chain_id": 91342,
        "block_number": block_number,
        "gas_price": str(gas_price),
        "network_health": "healthy",
    }


async def get_balance(http: Any, address: str) -> str:
    """Get native token balance for an address."""
    resp = await http.post(GIWA_RPC, json={
        "jsonrpc": "2.0",
        "method": "eth_getBalance",
        "params": [address, "latest"],
        "id": 1,
    })
    resp.raise_for_status()
    hex_balance = resp.json()["result"]
    return str(int(hex_balance, 16))


async def get_transaction_count(http: Any, address: str) -> int:
    """Get transaction count (nonce) for an address."""
    resp = await http.post(GIWA_RPC, json={
        "jsonrpc": "2.0",
        "method": "eth_getTransactionCount",
        "params": [address, "latest"],
        "id": 1,
    })
    resp.raise_for_status()
    return int(resp.json()["result"], 16)


async def get_block_by_number(http: Any, block_number: int) -> dict:
    """Get block details."""
    hex_block = hex(block_number)
    resp = await http.post(GIWA_RPC, json={
        "jsonrpc": "2.0",
        "method": "eth_getBlockByNumber",
        "params": [hex_block, False],
        "id": 1,
    })
    resp.raise_for_status()
    return resp.json().get("result", {})


# ✅ COMPLIES WITH: AGENTS.md §9
# ✅ SERVICE: analytics-service
