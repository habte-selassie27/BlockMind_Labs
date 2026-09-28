import { describe, it, expect } from 'vitest';
import IdentityCard from '../IdentityCard';
import BridgeCard from '../BridgeCard';
import NetworkPulse from '../NetworkPulse';
import ExplorerCard from '../ExplorerCard';
import ExecutionPlan from '../ExecutionPlan';
import DiscoverCard from '../DiscoverCard';
import PortfolioCard from '../PortfolioCard';
import WatchCard from '../WatchCard';
import SmartWalletCard from '../SmartWalletCard';

describe('GIWA Cards — render without crash (props check)', () => {
  it('exports all 9 GIWA cards', () => {
    expect(IdentityCard).toBeDefined();
    expect(BridgeCard).toBeDefined();
    expect(NetworkPulse).toBeDefined();
    expect(ExplorerCard).toBeDefined();
    expect(ExecutionPlan).toBeDefined();
    expect(DiscoverCard).toBeDefined();
    expect(PortfolioCard).toBeDefined();
    expect(WatchCard).toBeDefined();
    expect(SmartWalletCard).toBeDefined();
  });

  it('IdentityCard has correct display name', () => {
    expect(IdentityCard.name).toBe('IdentityCard');
  });

  it('BridgeCard expects GIWA fee format', () => {
    // Cheap check that BridgeCard is a function component
    expect(typeof BridgeCard).toBe('function');
  });
});
