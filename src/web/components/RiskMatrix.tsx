import type { RiskItem } from '../lib/types';

const levelToNum = { Low: 1, Medium: 2, High: 3 } as const;

export function RiskMatrix({ items }: { items: RiskItem[] }) {
  return (
    <div className="risk-matrix" role="img" aria-label="Risk matrix placeholder">
      {items.map((item) => {
        const posX = levelToNum[item.likelihood];
        const posY = 4 - levelToNum[item.impact];
        return (
          <div
            key={item.threat}
            className="risk-node"
            style={{ gridColumn: posX, gridRow: posY }}
            title={`${item.threat}: ${item.score}`}
          >
            {item.threat}
          </div>
        );
      })}
    </div>
  );
}
