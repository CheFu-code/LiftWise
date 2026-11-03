import { useState } from "react";
import { Text, View, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";
import Pressable from "@/components/ui/guarded-pressable";
import { useAppThemeColor } from "@/theme/app-theme";
import { calculatePlates, PLATES } from "@/lib/plate-calculator";
import type { WeightUnit } from "@/lib/weight";

const parse = (value: string) => {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d{1,4}(?:\.\d{0,2})?$/.test(normalized)) {
    throw new Error("Enter a valid weight with up to two decimal places.");
  }
  return Number(normalized);
};

export default function PlateCalculator({
  initialUnit = "kg",
}: {
  initialUnit?: WeightUnit;
}) {
  const [unit, setUnit] = useState<WeightUnit>(initialUnit);
  const [target, setTarget] = useState(initialUnit === "kg" ? "60" : "135");
  const [bar, setBar] = useState(initialUnit === "kg" ? "20" : "45");
  const [available, setAvailable] = useState(PLATES[initialUnit]);
  const [showPlates, setShowPlates] = useState(false);
  const foreground = useAppThemeColor("foreground");
  const primary = useAppThemeColor("primary");
  const muted = useAppThemeColor("mutedForeground");

  let result: ReturnType<typeof calculatePlates> | undefined;
  let error: string | undefined;
  try {
    result = calculatePlates(parse(target), parse(bar), available);
  } catch (cause) {
    error =
      cause instanceof Error ? cause.message : "Check the entered weights.";
  }
  const changeUnit = (next: WeightUnit) => {
    if (next === unit) return;
    setUnit(next);
    setAvailable(PLATES[next]);
    setBar(next === "kg" ? "20" : "45");
    setTarget(next === "kg" ? "60" : "135");
  };
  const togglePlate = (weight: number) =>
    setAvailable((current) =>
      current.includes(weight)
        ? current.filter((item) => item !== weight)
        : [...current, weight],
    );

  return (
    <View className="gap-5">
      <View className="gap-5 rounded-3xl bg-card p-5">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="flex-1 font-inter-semibold text-[15px] text-foreground">
            Target weight
          </Text>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Weight unit"
            className="flex-row rounded-xl bg-muted p-1"
          >
            {(["kg", "lb"] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityLabel={value === "kg" ? "Kilograms" : "Pounds"}
                accessibilityState={{ checked: unit === value }}
                onPress={() => changeUnit(value)}
                className={`min-h-11 min-w-14 items-center justify-center rounded-lg px-3 ${unit === value ? "bg-card" : ""}`}
              >
                <Text
                  className={`font-inter-semibold text-[14px] ${unit === value ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View className="gap-2">
          <View className="min-h-20 flex-row items-center gap-3 rounded-2xl bg-muted px-4">
            <TextInput
              accessibilityLabel={`Target weight including bar in ${unit}`}
              keyboardType="decimal-pad"
              maxLength={7}
              value={target}
              onChangeText={setTarget}
              placeholder="0"
              placeholderTextColor={muted}
              selectionColor={primary}
              selectTextOnFocus
              style={{ paddingVertical: 12, includeFontPadding: false }}
              className="min-w-0 flex-1 font-inter-bold text-[40px] text-foreground"
            />
            <Text className="font-inter-medium text-[18px] text-muted-foreground">
              {unit}
            </Text>
          </View>
          <Text className="font-inter text-[13px] text-muted-foreground">
            Total weight, including the bar.
          </Text>
        </View>
        <View className="flex-row items-center justify-between gap-4 border-t border-border pt-4">
          <Text className="flex-1 font-inter-medium text-[14px] text-foreground">
            Bar weight
          </Text>
          <View className="min-h-12 flex-row items-center gap-2 rounded-xl border border-input-border px-3">
            <TextInput
              accessibilityLabel={`Bar weight in ${unit}`}
              keyboardType="decimal-pad"
              maxLength={7}
              value={bar}
              onChangeText={setBar}
              placeholder="0"
              placeholderTextColor={muted}
              selectionColor={primary}
              selectTextOnFocus
              style={{ paddingVertical: 8, includeFontPadding: false }}
              className="w-16 font-inter-semibold text-[17px] text-foreground"
            />
            <Text className="font-inter text-[13px] text-muted-foreground">
              {unit}
            </Text>
          </View>
        </View>
      </View>

      <View
        accessibilityLiveRegion="polite"
        className="gap-4 rounded-3xl bg-card p-5"
      >
        <View className="gap-1">
          <Text
            accessibilityRole="header"
            className="font-inter-bold text-[20px] text-foreground"
          >
            Load on each side
          </Text>
          <Text className="font-inter text-[13px] leading-5 text-muted-foreground">
            Use the same plates on both ends of the bar.
          </Text>
        </View>
        {error ? (
          <Text className="font-inter text-[14px] leading-6 text-destructive">
            {error}
          </Text>
        ) : result ? (
          <>
            {result.plates.length ? (
              <View className="gap-3">
                {result.plates.map((plate) => (
                  <View
                    key={plate.weight}
                    className="flex-row items-center gap-3"
                  >
                    <View className="h-10 w-1 rounded-full bg-primary" />
                    <Text className="flex-1 font-inter-semibold text-[20px] text-foreground">
                      {plate.weight}{" "}
                      <Text className="font-inter text-[14px] text-muted-foreground">
                        {unit}
                      </Text>
                    </Text>
                    <Text className="font-inter-medium text-[15px] text-muted-foreground">
                      {plate.count} {plate.count === 1 ? "plate" : "plates"}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="font-inter-medium text-[16px] text-foreground">
                {result.shortfall > 0
                  ? "Bar only. No available plates fit this target."
                  : "Bar only. No plates needed."}
              </Text>
            )}
            <View className="gap-1 border-t border-border pt-4">
              <View className="flex-row flex-wrap items-baseline justify-between gap-2">
                <Text className="font-inter text-[14px] text-muted-foreground">
                  Total with bar
                </Text>
                <Text className="font-inter-bold text-[20px] text-foreground">
                  {result.achieved} {unit}
                </Text>
              </View>
              {result.shortfall > 0 && (
                <Text className="font-inter text-[13px] leading-5 text-muted-foreground">
                  {result.shortfall} {unit} below target. Try enabling more
                  plate sizes below.
                </Text>
              )}
            </View>
          </>
        ) : null}
      </View>

      <View className="rounded-2xl border border-border">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Available plate sizes"
          accessibilityState={{ expanded: showPlates }}
          onPress={() => setShowPlates((current) => !current)}
          className="min-h-16 flex-row items-center gap-3 p-4"
        >
          <View className="flex-1 gap-1">
            <Text className="font-inter-medium text-[14px] text-foreground">
              Available plates
            </Text>
            <Text className="font-inter text-[12px] text-muted-foreground">
              {available.length === PLATES[unit].length
                ? "All standard sizes selected"
                : `${available.length} of ${PLATES[unit].length} sizes selected`}
            </Text>
          </View>
          <Feather
            name={showPlates ? "chevron-up" : "chevron-down"}
            size={18}
            color={foreground}
          />
        </Pressable>
        {showPlates && (
          <View className="gap-4 px-4 pb-4">
            <View className="flex-row flex-wrap gap-2">
              {PLATES[unit].map((weight) => {
                const selected = available.includes(weight);
                return (
                  <Pressable
                    key={weight}
                    accessibilityRole="checkbox"
                    accessibilityLabel={`${weight} ${unit} plates available`}
                    accessibilityState={{ checked: selected }}
                    onPress={() => togglePlate(weight)}
                    className={`min-h-11 flex-row items-center justify-center gap-2 rounded-xl border px-3 ${selected ? "border-primary bg-primary/10" : "border-border"}`}
                  >
                    <Feather
                      name={selected ? "check-square" : "square"}
                      size={15}
                      color={selected ? primary : muted}
                    />
                    <Text
                      className={`font-inter-medium text-[14px] ${selected ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {weight} {unit}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="font-inter text-[12px] leading-5 text-muted-foreground">
              Assumes enough matching pairs of each selected size.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
