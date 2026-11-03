import { Text, TextInput, View } from "react-native";
import { useAppThemeColor } from "@/theme/app-theme";

type Props = { value?: string; onChange: (value: string) => void };

export default function LimitationsStep({ value, onChange }: Props) {
  const border = useAppThemeColor("inputBorder");
  return (
    <View className="w-full flex-1">
      <Text accessibilityRole="header" className="mt-6 font-inter-bold text-[28px] leading-9 text-foreground">
        Anything to work around?
      </Text>
      <Text className="mt-2 font-inter text-[15px] leading-6 text-muted-foreground">
        Optional. Tell us about injuries, limitations, or movements you avoid.
      </Text>
      <TextInput
        accessibilityLabel="Injuries, limitations, or movements to avoid"
        className="mt-8 min-h-32 rounded-xl border bg-input px-4 py-4 font-inter text-[16px] text-foreground"
        multiline
        onChangeText={onChange}
        placeholder="For example: avoid jumping or overhead pressing"
        placeholderTextColor={border}
        textAlignVertical="top"
        value={value ?? ""}
      />
      <Text className="mt-2 text-right font-inter text-[12px] text-muted-foreground">
        {(value?.length ?? 0)}/500
      </Text>
    </View>
  );
}
