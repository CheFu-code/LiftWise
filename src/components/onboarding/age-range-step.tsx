import { Text, View } from "react-native";
import { OnboardingValues } from "@/lib/validations/onboarding-validation";
import OnboardingOptionCard from "./onboarding-option-card";

type Props = {
  value?: OnboardingValues["ageRange"];
  onSelect: (value: NonNullable<OnboardingValues["ageRange"]>) => void;
};
const options = [
  ["under-18", "Under 18"], ["18-24", "18–24"], ["25-34", "25–34"],
  ["35-44", "35–44"], ["45-54", "45–54"], ["55-plus", "55+"],
  ["prefer-not-to-say", "Prefer not to say"],
] as const;

export default function AgeRangeStep({ value, onSelect }: Props) {
  return (
    <View className="w-full flex-1">
      <Text accessibilityRole="header" className="mt-6 font-inter-bold text-[28px] leading-9 text-foreground">
        What&apos;s your age range?
      </Text>
      <Text className="mt-2 font-inter text-[15px] leading-6 text-muted-foreground">
        Optional. Choose not to share if you prefer.
      </Text>
      <View className="mt-6 w-full gap-3">
        {options.map(([option, label], index) => (
          <OnboardingOptionCard
            key={option}
            delay={(index + 1) * 50}
            icon={<Text className="font-inter-semibold text-[16px] text-foreground">{label.slice(0, 2)}</Text>}
            label={label}
            onPress={() => onSelect(option)}
            selected={value === option}
          />
        ))}
      </View>
    </View>
  );
}
