import type { WeightUnit } from "./weight";
export const PLATES: Record<WeightUnit, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5, 1.25],
};
const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
export function calculatePlates(target: number, bar: number, available: number[]) {
  if (![target, bar].every(value => Number.isFinite(value) && value >= 0 && value <= 2000)) throw new Error("Enter weights between 0 and 2,000.");
  if ([target, bar].some(value => Math.abs(Math.round(value * 100) - value * 100) > 0.0001)) throw new Error("Use up to two decimal places.");
  if (target < bar) throw new Error("Target weight must include at least the bar weight.");
  if (!available.length && target > bar) throw new Error("Select at least one plate size.");
  if (available.some(value => !Number.isFinite(value) || value <= 0 || value > 100 || Math.abs(Math.round(value * 100) - value * 100) > 0.0001)) throw new Error("Invalid plate size.");
  const values = [...new Set(available.map(value => Math.round(value * 100)))].sort((a, b) => b - a);
  const step = values.reduce(gcd, 0) || 1;
  const goal = Math.floor((Math.round(target * 100) - Math.round(bar * 100)) / (2 * step));
  const coins = values.map(value => value / step);
  const counts = Array<number>(goal + 1).fill(Infinity);
  const previous = Array<number>(goal + 1).fill(-1);
  counts[0] = 0;
  for (let amount = 1; amount <= goal; amount++) {
    coins.forEach((coin, index) => {
      if (coin <= amount && counts[amount - coin] + 1 < counts[amount]) {
        counts[amount] = counts[amount - coin] + 1;
        previous[amount] = index;
      }
    });
  }
  let reachable = goal;
  while (reachable > 0 && !Number.isFinite(counts[reachable])) reachable--;
  const result = new Map<number, number>();
  for (let remaining = reachable; remaining > 0;) {
    const index = previous[remaining];
    result.set(values[index], (result.get(values[index]) ?? 0) + 1);
    remaining -= coins[index];
  }
  const achieved = (Math.round(bar * 100) + 2 * reachable * step) / 100;
  return { achieved, shortfall: Math.max(0, Math.round((target - achieved) * 100) / 100), plates: [...result].sort((a, b) => b[0] - a[0]).map(([weight, count]) => ({ weight: weight / 100, count })) };
}
