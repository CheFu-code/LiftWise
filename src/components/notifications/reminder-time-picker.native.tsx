import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Text, View } from "react-native";
import { useColorScheme } from "nativewind";
import { Feather } from "@expo/vector-icons";
import Pressable from "@/components/ui/guarded-pressable";
import Button from "@/components/ui/button";
import { useAppThemeColor } from "@/theme/app-theme";
import { reminderTimeLabel } from "@/lib/reminder-schedule";

export default function ReminderTimePicker({ hour, minute, disabled, onChange }: { hour: number; minute: number; disabled: boolean; onChange: (hour: number, minute: number) => void }) {
  const [open, setOpen] = useState(false);
  const foreground = useAppThemeColor("foreground");
  const { colorScheme } = useColorScheme();
  const value = new Date();
  value.setHours(hour, minute, 0, 0);
  return <View className="gap-3">
    <Pressable accessibilityRole="button" accessibilityLabel={`Change reminder time, ${reminderTimeLabel(hour, minute)}`} disabled={disabled}
      onPress={() => {
        if (Platform.OS === "android") DateTimePickerAndroid.open({ value, mode: "time", is24Hour: true, onChange: (event, date) => { if (event.type === "set" && date) onChange(date.getHours(), date.getMinutes()); } });
        else setOpen(!open);
      }} className="flex-row items-center justify-between rounded-xl border border-input-border bg-input px-4 py-3">
      <Text className="font-inter-semibold text-[20px] text-foreground">{reminderTimeLabel(hour, minute)}</Text>
      <Feather name="clock" size={20} color={foreground} />
    </Pressable>
    {open && Platform.OS === "ios" && <View>
      <DateTimePicker value={value} mode="time" display="spinner" themeVariant={colorScheme === "dark" ? "dark" : "light"} textColor={foreground}
        onChange={(_event, date) => { if (date) onChange(date.getHours(), date.getMinutes()); }} />
      <Button size="sm" variant="secondary" onPress={() => setOpen(false)}>Done</Button>
    </View>}
  </View>;
}
