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

    const foreground = useAppThemeColor("foreground");
    const primary = useAppThemeColor("primary");
    const onPrimary = useAppThemeColor("primaryForeground");
    const card = useAppThemeColor("card");
    const border = useAppThemeColor("border");
    const muted = useAppThemeColor("mutedForeground");

    // Calculate the plate combination.
    let result: ReturnType<typeof calculatePlates> | undefined;
    let error: string | undefined;

    try {
        result = calculatePlates(parse(target), parse(bar), available);
    } catch (cause) {
        error =
            cause instanceof Error
                ? cause.message
                : "Check the entered weights.";
    }

    // Switch units and restore the corresponding defaults.
    const changeUnit = (nextUnit: WeightUnit) => {
        if (nextUnit === unit) return;

        setUnit(nextUnit);
        setAvailable(PLATES[nextUnit]);
        setBar(nextUnit === "kg" ? "20" : "45");
        setTarget(nextUnit === "kg" ? "60" : "135");
    };

    // Toggle available plate sizes.
    const togglePlate = (weight: number) => {
        setAvailable((current) =>
            current.includes(weight)
                ? current.filter((item) => item !== weight)
                : [...current, weight],
        );
    };

    return (
        <View className="gap-5">
            {/* LOAD SETUP */}
            <View className="gap-3">
                <View className="flex-row items-center gap-2 px-1">
                    <Feather name="sliders" size={14} color={muted} />

                    <Text className="font-inter-semibold text-[12px] uppercase tracking-wide text-muted-foreground">
                        Load Setup
                    </Text>
                </View>

                <View className="gap-5 rounded-2xl border border-border bg-card p-4">
                    {/* Weight unit selection */}
                    <View className="flex-row items-center justify-between gap-3">
                        <View className="min-w-0 flex-1 gap-1">
                            <Text className="font-inter-semibold text-[15px] text-foreground">
                                Weight unit
                            </Text>

                            <Text className="font-inter text-[12px] text-muted-foreground">
                                Kilograms or pounds
                            </Text>
                        </View>

                        <View className="flex-row gap-2">
                            {(["kg", "lb"] as const).map((value) => {
                                const selected = unit === value;

                                return (
                                    <Pressable
                                        key={value}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Calculate in ${value}`}
                                        accessibilityState={{
                                            selected,
                                        }}
                                        onPress={() => changeUnit(value)}
                                        style={{
                                            backgroundColor: selected
                                                ? primary
                                                : card,
                                            borderColor: selected
                                                ? primary
                                                : border,
                                        }}
                                        className="min-h-10 min-w-14 items-center justify-center rounded-lg border px-3"
                                    >
                                        <Text
                                            style={{
                                                color: selected
                                                    ? onPrimary
                                                    : foreground,
                                            }}
                                            className="font-inter-semibold text-[13px]"
                                        >
                                            {value}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>

                    <View className="h-px bg-border" />

                    {/* Weight inputs */}
                    <View className="flex-row gap-3">
                        {/* Target weight */}
                        <View className="min-w-0 flex-1 gap-2">
                            <Text className="font-inter-medium text-[13px] text-foreground">
                                Total weight
                            </Text>

                            <View className="h-14 flex-row items-center rounded-xl border border-input-border bg-input px-3">
                                <TextInput
                                    accessibilityLabel={`Total weight including bar in ${unit}`}
                                    accessibilityHint="Includes the weight of the bar"
                                    keyboardType="decimal-pad"
                                    maxLength={7}
                                    value={target}
                                    onChangeText={setTarget}
                                    placeholder="0"
                                    placeholderTextColor={muted}
                                    selectionColor={primary}
                                    selectTextOnFocus
                                    textAlignVertical="center"
                                    style={{
                                        paddingVertical: 0,
                                        includeFontPadding: false,
                                    }}
                                    className="h-full min-w-0 flex-1 font-inter-semibold text-[18px] text-foreground"
                                />

                                <View className="h-full min-w-8 items-end justify-center pl-2">
                                    <Text
                                        style={{
                                            includeFontPadding: false,
                                        }}
                                        className="font-inter-medium text-[13px] text-muted-foreground"
                                    >
                                        {unit}
                                    </Text>
                                </View>
                            </View>

                            <Text className="font-inter text-[11px] text-muted-foreground">
                                Including bar
                            </Text>
                        </View>

                        {/* Bar weight */}
                        <View className="min-w-0 flex-1 gap-2">
                            <Text className="font-inter-medium text-[13px] text-foreground">
                                Bar weight
                            </Text>

                            <View className="h-14 flex-row items-center rounded-xl border border-input-border bg-input px-3">
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
                                    textAlignVertical="center"
                                    style={{
                                        paddingVertical: 0,
                                        includeFontPadding: false,
                                    }}
                                    className="h-full min-w-0 flex-1 font-inter-semibold text-[18px] text-foreground"
                                />

                                <View className="h-full min-w-8 items-end justify-center pl-2">
                                    <Text
                                        style={{
                                            includeFontPadding: false,
                                        }}
                                        className="font-inter-medium text-[13px] text-muted-foreground"
                                    >
                                        {unit}
                                    </Text>
                                </View>
                            </View>

                            <Text className="font-inter text-[11px] text-muted-foreground">
                                Empty bar
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* AVAILABLE PLATES */}
            <View className="gap-3">
                <View className="flex-row items-center justify-between px-1">
                    <View className="flex-row items-center gap-2">
                        <Feather name="layers" size={14} color={muted} />

                        <Text className="font-inter-semibold text-[12px] uppercase tracking-wide text-muted-foreground">
                            Available Plates
                        </Text>
                    </View>

                    <Text className="font-inter-medium text-[12px] text-muted-foreground">
                        {available.length} selected
                    </Text>
                </View>

                <View className="gap-4 rounded-2xl border border-border bg-card p-4">
                    <Text className="font-inter text-[13px] leading-5 text-muted-foreground">
                        Select the plate sizes available at your gym.
                    </Text>

                    <View className="flex-row flex-wrap gap-2">
                        {PLATES[unit].map((weight) => {
                            const selected = available.includes(weight);

                            return (
                                <Pressable
                                    key={weight}
                                    accessibilityRole="checkbox"
                                    accessibilityLabel={`${weight} ${unit} plates available`}
                                    accessibilityState={{
                                        checked: selected,
                                    }}
                                    onPress={() => togglePlate(weight)}
                                    style={{
                                        backgroundColor: selected
                                            ? primary
                                            : card,
                                        borderColor: selected
                                            ? primary
                                            : border,
                                    }}
                                    className="min-h-11 min-w-14 flex-row items-center justify-center gap-1.5 rounded-xl border px-3"
                                >
                                    {selected && (
                                        <Feather
                                            name="check"
                                            size={13}
                                            color={onPrimary}
                                        />
                                    )}

                                    <Text
                                        style={{
                                            color: selected
                                                ? onPrimary
                                                : foreground,
                                        }}
                                        className="font-inter-semibold text-[13px]"
                                    >
                                        {weight}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    <View className="flex-row items-start gap-2">
                        <Feather
                            name="info"
                            size={14}
                            color={muted}
                            style={{ marginTop: 2 }}
                        />

                        <Text className="min-w-0 flex-1 font-inter text-[12px] leading-5 text-muted-foreground">
                            Assumes enough matching pairs of each selected plate
                            size.
                        </Text>
                    </View>
                </View>
            </View>

            {/* CALCULATION RESULT */}
            <View className="gap-3">
                <View className="flex-row items-center gap-2 px-1">
                    <Feather name="target" size={14} color={muted} />

                    <Text className="font-inter-semibold text-[12px] uppercase tracking-wide text-muted-foreground">
                        Your Loadout
                    </Text>
                </View>

                <View
                    accessibilityLiveRegion="polite"
                    className="gap-4 rounded-2xl border border-border bg-card p-4"
                >
                    {error ? (
                        <View className="flex-row items-start gap-3">
                            <Feather
                                name="alert-circle"
                                size={20}
                                color={foreground}
                            />

                            <View className="min-w-0 flex-1 gap-1">
                                <Text className="font-inter-semibold text-[15px] text-foreground">
                                    Check your weights
                                </Text>

                                <Text className="font-inter text-[13px] leading-5 text-muted-foreground">
                                    {error}
                                </Text>
                            </View>
                        </View>
                    ) : result ? (
                        <>
                            {/* Result status */}
                            <View className="flex-row items-center justify-between gap-3">
                                <Text className="font-inter-medium text-[13px] text-muted-foreground">
                                    Calculated load
                                </Text>

                                <View className="flex-row items-center gap-1.5 rounded-full border border-border px-3 py-1.5">
                                    <Feather
                                        name={
                                            result.shortfall > 0
                                                ? "alert-circle"
                                                : "check-circle"
                                        }
                                        size={13}
                                        color={
                                            result.shortfall > 0
                                                ? muted
                                                : primary
                                        }
                                    />

                                    <Text
                                        style={{
                                            color:
                                                result.shortfall > 0
                                                    ? foreground
                                                    : primary,
                                        }}
                                        className="font-inter-semibold text-[11px]"
                                    >
                                        {result.shortfall > 0
                                            ? "Below target"
                                            : "Exact match"}
                                    </Text>
                                </View>
                            </View>

                            {/* Total loaded weight */}
                            <View className="gap-1">
                                <View className="flex-row items-baseline gap-2">
                                    <Text className="font-inter-bold text-[32px] text-foreground">
                                        {result.achieved}
                                    </Text>

                                    <Text className="font-inter-semibold text-[16px] text-muted-foreground">
                                        {unit}
                                    </Text>
                                </View>

                                <Text className="font-inter text-[12px] text-muted-foreground">
                                    Total weight including the bar
                                </Text>
                            </View>

                            <View className="h-px bg-border" />

                            {/* Plate loading instructions */}
                            <View className="gap-3">
                                <View className="flex-row items-center justify-between gap-2">
                                    <Text className="font-inter-semibold text-[15px] text-foreground">
                                        Load on each side
                                    </Text>

                                    <Feather
                                        name="layers"
                                        size={17}
                                        color={muted}
                                    />
                                </View>

                                {result.plates.length > 0 ? (
                                    <View className="gap-3">
                                        {result.plates.map((plate) => (
                                            <View
                                                key={plate.weight}
                                                className="flex-row items-center justify-between gap-3"
                                            >
                                                <View className="min-w-0 flex-1 flex-row items-center gap-3">
                                                    <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                                                        <Feather
                                                            name="disc"
                                                            size={18}
                                                            color={primary}
                                                        />
                                                    </View>

                                                    <Text className="font-inter-medium text-[14px] text-foreground">
                                                        {plate.weight} {unit}
                                                    </Text>
                                                </View>

                                                <View className="rounded-lg border border-border px-3 py-1.5">
                                                    <Text className="font-inter-semibold text-[13px] text-foreground">
                                                        × {plate.count}
                                                    </Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <View className="flex-row items-center gap-3">
                                        <Feather
                                            name="check-circle"
                                            size={17}
                                            color={primary}
                                        />

                                        <Text className="flex-1 font-inter text-[13px] text-muted-foreground">
                                            Bar only. No additional plates
                                            needed.
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Calculation explanation */}
                            {result.shortfall > 0 ? (
                                <View className="flex-row items-start gap-3 rounded-xl border border-border p-3">
                                    <Feather
                                        name="alert-circle"
                                        size={17}
                                        color={muted}
                                        style={{ marginTop: 2 }}
                                    />

                                    <Text className="min-w-0 flex-1 font-inter text-[12px] leading-5 text-muted-foreground">
                                        This combination is {result.shortfall}{" "}
                                        {unit} below your target. Select
                                        additional plate sizes to see if you can
                                        reach the exact weight.
                                    </Text>
                                </View>
                            ) : (
                                <View className="flex-row items-center gap-2 rounded-xl border border-border p-3">
                                    <Feather
                                        name="check-circle"
                                        size={17}
                                        color={primary}
                                    />

                                    <Text className="min-w-0 flex-1 font-inter text-[12px] leading-5 text-muted-foreground">
                                        Perfect match. Load the same plates on
                                        both sides of the bar.
                                    </Text>
                                </View>
                            )}
                        </>
                    ) : null}
                </View>
            </View>
        </View>
    );
}
