import type { ComponentRef, ReactNode } from "react";
import { forwardRef, useRef, useState } from "react";
import type { PressableProps } from "react-native";
import { ActivityIndicator, Text } from "react-native";
import Pressable from "@/components/ui/guarded-pressable";

import { cn } from "@/lib/utils";
import { useAppThemeColor } from "@/theme/app-theme";
import { useToast } from "./toast";

const variants = {
  default: {
    button: "border-primary bg-primary active:bg-primary-hover",
    text: "text-primary-foreground",
  },
  outline: {
    button: "border-border bg-card active:bg-muted",
    text: "text-foreground",
  },
  secondary: {
    button: "border-secondary bg-secondary active:bg-muted",
    text: "text-secondary-foreground",
  },
} as const;

type ButtonProps = PressableProps & {
  children: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  size?: "default" | "sm";
  isLoading?: boolean;
  variant?: keyof typeof variants;
};

const Button = forwardRef<ComponentRef<typeof Pressable>, ButtonProps>(
  (
    {
      children,
      className,
      disabled,
      leftIcon,
      rightIcon,
      isLoading,
      accessibilityState,
      onPress,
      size = "default",
      variant = "default",
      ...props
    },
    ref,
  ) => {
    const primaryForeground = useAppThemeColor("primaryForeground");
    const foreground = useAppThemeColor("foreground");
    const secondaryForeground = useAppThemeColor("secondaryForeground");
    const [pending, setPending] = useState(false);
    const lock = useRef(false);
    const { showToast } = useToast();
    const loading = Boolean(isLoading || pending);
    const blocked = Boolean(disabled || loading);
    const handlePress: PressableProps["onPress"] = (event) => {
      if (blocked || lock.current || !onPress) return;
      lock.current = true;
      const release = () => {
        lock.current = false;
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
    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        className={cn(
          "flex-row items-center justify-center gap-2 rounded-xl border px-5",
          size === "sm" ? "h-11" : "h-14",
          variants[variant].button,
          blocked && "opacity-50",
          className,
        )}
        {...props}
        disabled={blocked}
        accessibilityState={{
          ...accessibilityState,
          disabled: blocked,
          busy: loading,
        }}
        onPress={handlePress}
      >
        {!loading ? (
          leftIcon
        ) : (
          <ActivityIndicator
            color={
              variant === "default"
                ? primaryForeground
                : variant === "secondary"
                  ? secondaryForeground
                  : foreground
            }
          />
        )}
        <Text
          className={cn(
            "text-center font-inter-semibold",
            size === "sm" ? "text-[13px]" : "text-[14px]",
            variants[variant].text,
          )}
        >
          {children}
        </Text>
        {rightIcon}
      </Pressable>
    );
  },
);

Button.displayName = "Button";

export default Button;
