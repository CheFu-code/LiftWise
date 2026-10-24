import { forwardRef, useRef, useState, type ComponentRef } from "react";
import {
  Pressable as NativePressable,
  TouchableOpacity as NativeTouchableOpacity,
  type PressableProps,
  type TouchableOpacityProps,
} from "react-native";
import { showToast } from "@/lib/toast-store";

type GuardOptions = {
  /** Minimum gap between accepted taps. The first tap always runs immediately. */
  tapGuardInterval?: number;
};

function useGuardedPress(
  onPress: PressableProps["onPress"],
  disabled: boolean | null | undefined,
  interval: number,
) {
  const guard = useRef({ lastTap: -Infinity, inFlight: false });
  const [pending, setPending] = useState(false);
  const handlePress: PressableProps["onPress"] = (event) => {
    const now = Date.now();
    if (
      disabled ||
      !onPress ||
      guard.current.inFlight ||
      now - guard.current.lastTap < interval
    ) {
      event.preventDefault();
      return;
    }
    guard.current.lastTap = now;
    guard.current.inFlight = true;
    const release = () => {
      guard.current.inFlight = false;
      setPending(false);
    };
    const fail = () => {
      release();
      showToast("Something went wrong. Please try again.");
    };
    try {
      const result: unknown = onPress(event);
      if (
        result &&
        typeof (result as PromiseLike<unknown>).then === "function"
      ) {
        setPending(true);
        void Promise.resolve(result).then(release, fail);
      } else release();
    } catch {
      fail();
    }
  };
  return { pending, handlePress };
}

const Pressable = forwardRef<
  ComponentRef<typeof NativePressable>,
  PressableProps & GuardOptions
>(
  (
    { onPress, disabled, accessibilityState, tapGuardInterval = 400, ...props },
    ref,
  ) => {
    const { pending, handlePress } = useGuardedPress(
      onPress,
      disabled,
      tapGuardInterval,
    );
    return (
      <NativePressable
        {...props}
        ref={ref}
        onPress={handlePress}
        disabled={Boolean(disabled || pending)}
        accessibilityState={{
          ...accessibilityState,
          disabled: Boolean(disabled || pending),
          busy: Boolean(accessibilityState?.busy || pending),
        }}
      />
    );
  },
);
Pressable.displayName = "GuardedPressable";

export const TouchableOpacity = forwardRef<
  ComponentRef<typeof NativeTouchableOpacity>,
  TouchableOpacityProps & GuardOptions
>(
  (
    { onPress, disabled, accessibilityState, tapGuardInterval = 400, ...props },
    ref,
  ) => {
    const { pending, handlePress } = useGuardedPress(
      onPress,
      disabled,
      tapGuardInterval,
    );
    return (
      <NativeTouchableOpacity
        {...props}
        ref={ref}
        onPress={handlePress}
        disabled={Boolean(disabled || pending)}
        accessibilityState={{
          ...accessibilityState,
          disabled: Boolean(disabled || pending),
          busy: Boolean(accessibilityState?.busy || pending),
        }}
      />
    );
  },
);
TouchableOpacity.displayName = "GuardedTouchableOpacity";

export default Pressable;
