"""NL summaries — generate human-readable portfolio summaries."""

from .models import PortfolioSummary, TokenBalance


def generate_portfolio_summary(
    address: str,
    chain_id: int,
    native_balance: str,
    token_balances: list[dict] | None = None,
) -> PortfolioSummary:
    """Generate a natural language summary of a wallet's portfolio."""
    tokens = []
    total_usd = 0.0

    # Native token
    eth_balance = int(native_balance) / 1e18 if native_balance.isdigit() else 0
    tokens.append({
        "symbol": "ETH",
        "name": "Ethereum",
        "balance": f"{eth_balance:.4f}",
        "balance_usd": 0.0,  # Would need price feed
    })

    # ERC20 tokens
    for token in (token_balances or []):
        tokens.append(token)
        total_usd += token.get("balance_usd", 0)

    # Build NL summary
    summary_parts = []
    summary_parts.append(f"Wallet {address[:6]}...{address[-4:]} on chain {chain_id}:")
    summary_parts.append(f"Native balance: {eth_balance:.4f} ETH")

    if len(tokens) > 1:
        summary_parts.append(f"Holding {len(tokens)} token(s) total")

    if total_usd > 0:
        summary_parts.append(f"Estimated total: ${total_usd:.2f}")

    return PortfolioSummary(
        user_id="",
        wallet_address=address,
        chain_id=chain_id,
        total_balance_usd=total_usd,
        tokens=tokens,
        summary_nl=" ".join(summary_parts),
    )


def generate_tx_summary(transactions: list[dict]) -> str:
    """Generate a natural language summary of recent transactions."""
    if not transactions:
        return "No recent transactions."

    count = len(transactions)
    incoming = sum(1 for tx in transactions if tx.get("to"))
    outgoing = count - incoming

    parts = [f"Recent {count} transaction(s):"]
    if outgoing > 0:
        parts.append(f"{outgoing} outgoing")
    if incoming > 0:
        parts.append(f"{incoming} incoming")

    return ", ".join(parts)


# ✅ COMPLIES WITH: AGENTS.md §9
# ✅ SERVICE: analytics-service
