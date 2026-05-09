import type { RiskItem } from '../lib/types';

export function RiskMatrix({ items }: { items: RiskItem[] }) {
  return (
    <div className="risk-matrix">
      {items.map((item) => (
        <div key={item.threat} className="risk-node">
          <strong>{item.score}</strong>
          <div>{item.threat}</div>
        </div>
      ))}
    </div>
  );
}
