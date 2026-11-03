import { Text, TextInput, View } from "react-native";
import { OnboardingValues } from "@/lib/validations/onboarding-validation";
import { useAppThemeColor } from "@/theme/app-theme";

type Props = {
  height?: number;
  weight?: number;
  weightUnit?: OnboardingValues["weightUnit"];
  onChange: (values: Partial<OnboardingValues>) => void;
};

export default function HeightWeightStep({ height, weight, weightUnit = "kg", onChange }: Props) {
  const border = useAppThemeColor("inputBorder");
  return (
    <View className="w-full flex-1">
      <Text accessibilityRole="header" className="mt-6 font-inter-bold text-[28px] leading-9 text-foreground">
        Add your measurements
      </Text>
      <Text className="mt-2 font-inter text-[15px] leading-6 text-muted-foreground">
        Optional. These details help us improve future progress insights.
      </Text>
      <View className="mt-8 gap-5">
        <View>
          <Text className="mb-2 font-inter-semibold text-[14px] text-foreground">Height (cm)</Text>
          <TextInput
            accessibilityLabel="Height in centimetres"
            className="h-14 rounded-xl border bg-input px-4 font-inter text-[16px] text-foreground"
            keyboardType="numeric"
            onChangeText={(text) => onChange({ heightCm: text ? Number(text) : undefined })}
            placeholder="e.g. 175"
            placeholderTextColor={border}
            value={height === undefined ? "" : String(height)}
          />
        </View>
        <View>
          <Text className="mb-2 font-inter-semibold text-[14px] text-foreground">Weight ({weightUnit})</Text>
          <TextInput
            accessibilityLabel={`Weight in ${weightUnit}`}
            className="h-14 rounded-xl border bg-input px-4 font-inter text-[16px] text-foreground"
            keyboardType="decimal-pad"
            onChangeText={(text) => onChange({ weight: text ? Number(text) : undefined })}
            placeholder={`e.g. 75 ${weightUnit}`}
            placeholderTextColor={border}
            value={weight === undefined ? "" : String(weight)}
          />
        </View>
      </View>
    </View>
  );
}
