import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";

type Preferences = { keepAwake: boolean; haptics: boolean };
const KEY = "liftwise-device-workout-preferences-v1";
let snapshot = { keepAwake: true, haptics: true, ready: false };
const listeners = new Set<() => void>();
let loading: Promise<void> | undefined;
let writes: Promise<void> = Promise.resolve();
const publish = (value: typeof snapshot) => { snapshot = value; listeners.forEach(listener => listener()); };
export const getLocalWorkoutPreferences = () => snapshot;
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function loadLocalWorkoutPreferences() {
  loading ??= (async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const value = raw ? JSON.parse(raw) as Partial<Preferences> : {};
      publish({ keepAwake: typeof value.keepAwake === "boolean" ? value.keepAwake : true, haptics: typeof value.haptics === "boolean" ? value.haptics : true, ready: true });
    } catch { publish({ ...snapshot, ready: true }); }
  })();
  return loading;
}
export function saveLocalWorkoutPreferences(patch: Partial<Preferences>) {
  const write = writes.catch(() => undefined).then(async () => {
    await loadLocalWorkoutPreferences();
    const previous = snapshot;
    const next = { ...previous, ...patch };
    publish(next);
    try { await AsyncStorage.setItem(KEY, JSON.stringify({ keepAwake: next.keepAwake, haptics: next.haptics })); }
    catch (error) { if (snapshot === next) publish(previous); throw error; }
  });
  writes = write;
  return write;
}
export function useLocalWorkoutPreferences() {
  const value = useSyncExternalStore(subscribe, getLocalWorkoutPreferences, getLocalWorkoutPreferences);
  useEffect(() => { void loadLocalWorkoutPreferences(); }, []);
  return value;
}
