import { useAppThemeColor } from "@/theme/app-theme";
import { Switch, Text, View } from "react-native";

export function PreferenceSwitch({
    label,
    value,
    disabled,
    onChange,
}: {
    label: string;
    value: boolean;
    disabled: boolean;
    onChange: (value: boolean) => void;
}) {
    const primary = useAppThemeColor("primary");
    return (
        <View className="min-h-8 flex-row items-center gap-3">
            <Text className="flex-1 font-inter-semibold text-[15px] text-foreground">
                {label}
            </Text>

            <Switch
                accessibilityLabel={label}
                value={value}
                onValueChange={onChange}
                disabled={disabled}
                trackColor={{ true: primary }}
            />
        </View>
    );
}
