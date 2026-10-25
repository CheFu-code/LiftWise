import { useCallback, useRef } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

export function useActiveWorkoutAwake(enabled: boolean) {
  const tag = useRef("");
  if (!tag.current) tag.current = `liftwise-workout-${Date.now()}-${Math.random()}`;
  const operations = useRef<Promise<void>>(Promise.resolve());
  useFocusEffect(useCallback(() => {
    let active = true;
    const update = (foreground: boolean) => {
      operations.current = operations.current.catch(() => undefined).then(async () => {
        if (active && enabled && foreground) await activateKeepAwakeAsync(tag.current);
        else await deactivateKeepAwake(tag.current);
      }).catch(() => undefined);
    };
    update(AppState.currentState === "active");
    const listener = AppState.addEventListener("change", state => update(state === "active"));
    return () => { active = false; listener.remove(); update(false); };
  }, [enabled]));
}
