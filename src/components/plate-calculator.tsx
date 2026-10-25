import { useState } from "react";
import { Text, View, TextInput } from "react-native";
import Pressable from "@/components/ui/guarded-pressable";
import { useAppThemeColor } from "@/theme/app-theme";
import { calculatePlates, PLATES } from "@/lib/plate-calculator";
import type { WeightUnit } from "@/lib/weight";

const parse = (value: string) => {
  if (!/^\d{1,4}(?:[.,]\d{0,2})?$/.test(value.trim())) throw new Error("Enter a weight with up to two decimal places.");
  return Number(value.replace(",", "."));
};
export default function PlateCalculator({ initialUnit = "kg" }: { initialUnit?: WeightUnit }) {
  const [unit, setUnit] = useState(initialUnit);
  const [target, setTarget] = useState(initialUnit === "kg" ? "60" : "135");
  const [bar, setBar] = useState(initialUnit === "kg" ? "20" : "45");
  const [available, setAvailable] = useState(PLATES[initialUnit]);
  const foreground = useAppThemeColor("foreground");
  const primary = useAppThemeColor("primary");
  const onPrimary = useAppThemeColor("primaryForeground");
  const card = useAppThemeColor("card");
  const border = useAppThemeColor("border");
  const muted = useAppThemeColor("mutedForeground");
  let result: ReturnType<typeof calculatePlates> | undefined;
  let error: string | undefined;
  try { result = calculatePlates(parse(target), parse(bar), available); }
  catch (cause) { error = cause instanceof Error ? cause.message : "Check the entered weights."; }
  return <View className="gap-5">
    <Text className="font-inter text-[14px] leading-6 text-muted-foreground">Enter the total weight, including the bar. Load the same plates on both sides.</Text>
    <View className="flex-row gap-2">
      {(["kg", "lb"] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Calculate in ${value}`} accessibilityState={{ selected: unit === value }}
        onPress={() => { if (value === unit) return; setUnit(value); setAvailable(PLATES[value]); setBar(value === "kg" ? "20" : "45"); setTarget(value === "kg" ? "60" : "135"); }}
        style={{ backgroundColor: unit === value ? primary : card, borderColor: border }} className="min-h-11 flex-1 items-center justify-center rounded-xl border px-4">
        <Text style={{ color: unit === value ? onPrimary : foreground }} className="font-inter-semibold text-[14px]">{value}</Text>
      </Pressable>)}
    </View>
    <View className="flex-row flex-wrap gap-3">
      <View className="min-w-32 flex-1 gap-2">
        <Text className="font-inter-medium text-[14px] text-foreground">Total weight ({unit})</Text>
        <TextInput accessibilityLabel={`Total weight including bar in ${unit}`} keyboardType="decimal-pad" maxLength={7} value={target} onChangeText={setTarget}
          placeholder="0" placeholderTextColor={muted} selectionColor={primary} className="min-h-12 rounded-xl border border-input-border bg-input px-4 font-inter text-[18px] text-foreground" />
      </View>
      <View className="min-w-32 flex-1 gap-2">
        <Text className="font-inter-medium text-[14px] text-foreground">Bar weight ({unit})</Text>
        <TextInput accessibilityLabel={`Bar weight in ${unit}`} keyboardType="decimal-pad" maxLength={7} value={bar} onChangeText={setBar}
          placeholder="0" placeholderTextColor={muted} selectionColor={primary} className="min-h-12 rounded-xl border border-input-border bg-input px-4 font-inter text-[18px] text-foreground" />
      </View>
    </View>
    <View className="gap-3">
      <Text className="font-inter-semibold text-[16px] text-foreground">Available plates</Text>
      <View className="flex-row flex-wrap gap-2">
        {PLATES[unit].map(weight => <Pressable key={weight} accessibilityRole="checkbox" accessibilityLabel={`${weight} ${unit} plates available`} accessibilityState={{ checked: available.includes(weight) }}
          onPress={() => setAvailable(current => current.includes(weight) ? current.filter(item => item !== weight) : [...current, weight])}
          style={{ backgroundColor: available.includes(weight) ? primary : card, borderColor: border }} className="min-h-11 min-w-14 items-center justify-center rounded-xl border px-3">
          <Text style={{ color: available.includes(weight) ? onPrimary : foreground }} className="font-inter-medium text-[14px]">{weight}</Text>
        </Pressable>)}
      </View>
      <Text className="font-inter text-[12px] leading-5 text-muted-foreground">Assumes enough matching pairs of the plate sizes you select.</Text>
    </View>
    <View accessibilityLiveRegion="polite" className="gap-3 rounded-2xl border border-border bg-card p-5">
      {error ? <Text className="font-inter text-[14px] text-muted-foreground">{error}</Text> : result && <>
        <Text className="font-inter-semibold text-[16px] text-foreground">Load on each side</Text>
        {result.plates.length ? result.plates.map(plate => <View key={plate.weight} className="flex-row items-center justify-between gap-3">
          <Text className="font-inter text-[16px] text-foreground">{plate.weight} {unit}</Text>
          <Text className="font-inter-semibold text-[16px] text-foreground">x {plate.count}</Text>
        </View>) : <Text className="font-inter text-[14px] text-muted-foreground">Bar only. No plates needed.</Text>}
        <Text className="font-inter-bold text-[22px] text-foreground">{result.achieved} {unit} total</Text>
        {result.shortfall > 0 && <Text className="font-inter text-[13px] leading-5 text-muted-foreground">The selected plates cannot make the exact target. This load is {result.shortfall} {unit} below it.</Text>}
      </>}
    </View>
  </View>;
}
