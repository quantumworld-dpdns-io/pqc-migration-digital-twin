import { StatusPill } from './StatusPill';
import type { InventoryItem } from '../lib/types';

export function InventoryTable({ items }: { items: InventoryItem[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>System</th>
            <th>Algorithm</th>
            <th>Owner</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.system}>
              <td>{item.system}</td>
              <td>{item.algorithm}</td>
              <td>{item.owner}</td>
              <td>
                <StatusPill status={item.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
