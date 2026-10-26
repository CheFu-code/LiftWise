import { Text } from "react-native";
export default function ReminderTimePicker(_props: {
    hour: number;
    minute: number;
    disabled: boolean;
    onChange: (hour: number, minute: number) => void;
}) {
    return (
        <Text className="font-inter text-[14px] text-muted-foreground">
            Time selection is available in the Android and iOS apps.
        </Text>
    );
}
