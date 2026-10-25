import type { OnboardingValues } from "./validations/onboarding-validation";

export type Reminder = NonNullable<OnboardingValues["reminder"]>;
export const TRAINING_DAYS = [
    { value: 2, label: "Mon", name: "Monday" },
    { value: 3, label: "Tue", name: "Tuesday" },
    { value: 4, label: "Wed", name: "Wednesday" },
    { value: 5, label: "Thu", name: "Thursday" },
    { value: 6, label: "Fri", name: "Friday" },
    { value: 7, label: "Sat", name: "Saturday" },
    { value: 1, label: "Sun", name: "Sunday" },
];
export const reminderDays = (reminder?: Reminder) => reminder?.days ?? [1, 2, 3, 4, 5, 6, 7];
export function nextWorkoutReminder(reminder: Reminder, now = new Date()) {
    if (!reminder.enabled) return null;
    const days = reminderDays(reminder);
    for (let offset = 0; offset <= 7; offset++) {
        const date = new Date(now);
        date.setDate(date.getDate() + offset);
        date.setHours(reminder.hour, reminder.minute, 0, 0);
        if (date > now && days.includes(date.getDay() + 1)) return date;
    }
    return null;
}
export const reminderTimeLabel = (hour: number, minute: number) => `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
