import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

export function StreakSkeleton() {
    const opacity = useRef(new Animated.Value(0.4)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 700,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.4,
                    duration: 700,
                    useNativeDriver: true,
                }),
            ]),
        );

        animation.start();

        return () => animation.stop();
    }, [opacity]);

    return (
        <Animated.View style={{ opacity }}>
            <View className="ml-1.5 mr-0.5 h-4 w-5 rounded-md bg-muted" />
        </Animated.View>
    );
}
