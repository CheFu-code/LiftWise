export type WeightUnit = "kg" | "lb";
const POUNDS_PER_KG = 2.2046226218487757;

// All API weights and volume use kilograms. Convert only at the UI boundary.
export function fromKilograms(value: number, unit: WeightUnit) {
  return unit === "lb" ? value * POUNDS_PER_KG : value;
}
export function toKilograms(value: number, unit: WeightUnit) {
  return unit === "lb" ? value / POUNDS_PER_KG : value;
}
export function formatWeight(value: number, unit: WeightUnit) {
  return fromKilograms(value, unit).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

export function weightInput(value: string, unit: WeightUnit) {
  const number = Number(value.trim().replace(",", "."));
  if (!value.trim() || !Number.isFinite(number) || number < 0)
    throw new Error("Enter a valid weight of zero or more.");
  return toKilograms(number, unit);
}
