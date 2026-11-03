import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { OnboardingValues } from "@/lib/validations/onboarding-validation";
import { useAppThemeColor } from "@/theme/app-theme";
import OnboardingOptionCard from "./onboarding-option-card";

type Props = {
  value?: OnboardingValues["fitnessLevel"];
  onSelect: (value: NonNullable<OnboardingValues["fitnessLevel"]>) => void;
};

const options = [
  ["low", "Getting started", "I am mostly inactive or returning after a break.", "activity"],
  ["moderate", "Moderately active", "I exercise regularly but want more structure.", "trending-up"],
  ["high", "Highly active", "I train often and want to keep progressing.", "zap"],
] as const;

export default function FitnessLevelStep({ value, onSelect }: Props) {
  const foreground = useAppThemeColor("foreground");
  const primary = useAppThemeColor("primary");
  return (
    <View className="w-full flex-1">
      <Text accessibilityRole="header" className="mt-6 font-inter-bold text-[28px] leading-9 text-foreground">
        How active are you today?
      </Text>
      <Text className="mt-2 font-inter text-[15px] leading-6 text-muted-foreground">
        This helps us set a realistic starting point.
      </Text>
      <View accessibilityRole="radiogroup" className="mt-6 w-full gap-4">
        {options.map(([option, label, description, icon], index) => (
          <OnboardingOptionCard
            key={option}
            delay={(index + 1) * 80}
            description={description}
            icon={<Feather color={value === option ? primary : foreground} name={icon} size={27} />}
            label={label}
            onPress={() => onSelect(option)}
            selected={value === option}
          />
        ))}
      </View>
    </View>
  );
}
