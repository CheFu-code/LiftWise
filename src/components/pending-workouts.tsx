import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useAuth } from "@/lib/chefu-auth";
import {
    readWorkoutJournal,
    retryBlockedCompletions,
    subscribeWorkoutJournal,
} from "@/lib/workout-journal";
import Button from "@/components/ui/button";

export default function PendingWorkouts() {
    const { userId } = useAuth();
    const [status, setStatus] = useState<{ uid?: string; count: number; blocked: boolean }>({ count: 0, blocked: false });
    useEffect(() => {
        let active = true;
        const update = async () => {
            if (!userId) return;
            try {
                const { pending } = await readWorkoutJournal(userId);
                if (active)
                    setStatus({
                        uid: userId,
                        count: Object.keys(pending).length,
                        blocked: Object.values(pending).some(
                            (entry) => entry.blocked,
                        ),
                    });
            } catch {
                /* The sync worker reports local storage errors. */
            }
        };
        void update();
        const stop = subscribeWorkoutJournal(() => void update());
        return () => {
            active = false;
            stop();
        };
    }, [userId]);
    if (status.uid !== userId || !status.count) return null;
    return (
        <View className="mb-4 gap-2 rounded-xl border border-border bg-card p-4">
            <Text
                accessibilityLiveRegion="polite"
                className="font-inter text-[13px] text-foreground"
            >
                {status.count}{" "}
                {status.count === 1 ? "workout saved" : "workouts saved"} on
                this device.{" "}
                {status.blocked
                    ? "Sign in again if needed, then retry syncing."
                    : "Waiting to sync. Keep the app open when connected."}
            </Text>
            {status.blocked && (
                <Button
                    size="sm"
                    onPress={() =>
                        userId ? retryBlockedCompletions(userId) : undefined
                    }
                >
                    Retry sync
                </Button>
            )}
        </View>
    );
}
