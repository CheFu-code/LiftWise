import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { OnboardingValues } from "@/lib/validations/onboarding-validation";
import { useAppThemeColor } from "@/theme/app-theme";
import OnboardingOptionCard from "./onboarding-option-card";

type Props = {
  value?: OnboardingValues["trainingLocation"];
  onSelect: (value: NonNullable<OnboardingValues["trainingLocation"]>) => void;
};
const options = [
  ["home", "At home", "I mainly train at home.", "home"],
  ["gym", "At a gym", "I have access to a gym.", "briefcase"],
  ["mixed", "Both", "I switch between home and gym training.", "shuffle"],
] as const;

export default function TrainingLocationStep({ value, onSelect }: Props) {
  const foreground = useAppThemeColor("foreground");
  const primary = useAppThemeColor("primary");
  return (
    <View className="w-full flex-1">
      <Text accessibilityRole="header" className="mt-6 font-inter-bold text-[28px] leading-9 text-foreground">
        Where do you train?
      </Text>
      <Text className="mt-2 font-inter text-[15px] leading-6 text-muted-foreground">
        We can use this to make exercise suggestions more relevant.
      </Text>
      <View accessibilityRole="radiogroup" className="mt-8 w-full gap-4">
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
