import { useRef, useState } from "react";
import { Animated, PanResponder, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { WorkoutExercise } from "@/lib/api";
import { useAppThemeColor } from "@/theme/app-theme";

type Drag = { from: number; to: number; height: number };
type Props = {
  exercises: WorkoutExercise[];
  disabled: boolean;
  onReorder: (ids: string[]) => void;
  onDraggingChange: (dragging: boolean) => void;
};

export default function WorkoutExerciseList({
  exercises,
  disabled,
  onReorder,
  onDraggingChange,
}: Props) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const currentDrag = useRef<Drag | null>(null);
  const layouts = useRef(new Map<string, { y: number; height: number }>());
  const move = (from: number, to: number) => {
    if (disabled || from === to) return;
    const reordered = [...exercises];
    const [exercise] = reordered.splice(from, 1);
    reordered.splice(to, 0, exercise);
    onReorder(reordered.map((item) => item.id));
  };
  const begin = (from: number) => {
    const row = layouts.current.get(exercises[from].id);
    currentDrag.current = { from, to: from, height: row?.height ?? 64 };
    setDrag(currentDrag.current);
    onDraggingChange(true);
  };
  const update = (dy: number) => {
    const active = currentDrag.current;
    if (!active) return 0;
    const first = layouts.current.get(exercises[0].id);
    const last = layouts.current.get(exercises[exercises.length - 1].id);
    const source = layouts.current.get(exercises[active.from].id);
    if (!first || !last || !source) return 0;
    const translation = Math.max(
      first.y - source.y,
      Math.min(dy, last.y + last.height - source.y - source.height),
    );
    const center = source.y + source.height / 2 + translation;
    let to = active.from;
    let distance = Infinity;
    exercises.forEach((exercise, index) => {
      const row = layouts.current.get(exercise.id);
      if (!row) return;
      const gap = Math.abs(center - (row.y + row.height / 2));
      if (gap < distance) {
        distance = gap;
        to = index;
      }
    });
    if (to !== active.to) {
      currentDrag.current = { ...active, to };
      setDrag(currentDrag.current);
    }
    return translation;
  };
  const end = (cancelled: boolean) => {
    const active = currentDrag.current;
    currentDrag.current = null;
    setDrag(null);
    onDraggingChange(false);
    if (!cancelled && active) move(active.from, active.to);
  };
  return (
    <View className="rounded-xl border border-border bg-card">
      {exercises.map((exercise, index) => {
        let offset = 0;
        if (drag && index !== drag.from) {
          if (drag.from < drag.to && index > drag.from && index <= drag.to)
            offset = -drag.height;
          if (drag.from > drag.to && index < drag.from && index >= drag.to)
            offset = drag.height;
        }
        return (
          <ExerciseRow
            key={exercise.id}
            exercise={exercise}
            index={index}
            count={exercises.length}
            disabled={disabled || exercises.length < 2}
            active={drag?.from === index}
            offset={offset}
            onLayout={(layout) => layouts.current.set(exercise.id, layout)}
            onBegin={() => begin(index)}
            onMove={update}
            onEnd={end}
            onMoveBy={(delta) =>
              move(
                index,
                Math.max(0, Math.min(exercises.length - 1, index + delta)),
              )
            }
          />
        );
      })}
    </View>
  );
}

type RowProps = {
  exercise: WorkoutExercise;
  index: number;
  count: number;
  disabled: boolean;
  active: boolean;
  offset: number;
  onLayout: (layout: { y: number; height: number }) => void;
  onBegin: () => void;
  onMove: (dy: number) => number;
  onEnd: (cancelled: boolean) => void;
  onMoveBy: (delta: number) => void;
};

function ExerciseRow(props: RowProps) {
  const latest = useRef(props);
  latest.current = props;
  const translation = useRef(new Animated.Value(0)).current;
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !latest.current.disabled,
      onMoveShouldSetPanResponder: () => !latest.current.disabled,
      onPanResponderGrant: () => latest.current.onBegin(),
      onPanResponderMove: (_event, gesture) =>
        translation.setValue(latest.current.onMove(gesture.dy)),
      onPanResponderRelease: () => {
        translation.setValue(0);
        latest.current.onEnd(false);
      },
      onPanResponderTerminate: () => {
        translation.setValue(0);
        latest.current.onEnd(true);
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;
  const muted = useAppThemeColor("mutedForeground");
  const primary = useAppThemeColor("primary");
  const card = useAppThemeColor("card");
  const { exercise, index, active, offset, disabled } = props;
  return (
    <Animated.View
      onLayout={(event) => props.onLayout(event.nativeEvent.layout)}
      className="min-h-16 flex-row items-center border-b border-border pl-4 last:border-b-0"
      style={{
        backgroundColor: card,
        zIndex: active ? 10 : 0,
        elevation: active ? 6 : 0,
        borderRadius: active ? 12 : 0,
        transform: [{ translateY: active ? translation : offset }],
      }}
    >
      <View className="h-9 w-9 items-center justify-center rounded-lg bg-muted">
        <Text className="font-inter-semibold text-[12px] text-muted-foreground">
          {index + 1}
        </Text>
      </View>
      <View className="ml-3 flex-1 py-3">
        <Text
          numberOfLines={2}
          className="font-inter-semibold text-[13px] text-foreground"
        >
          {exercise.name}
        </Text>
        <Text className="mt-1 font-inter text-[12px] text-muted-foreground">
          {exercise.sets} sets • {exercise.reps} reps • {exercise.rest}s rest
        </Text>
      </View>
      <View
        {...responder.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Reorder ${exercise.name}`}
        accessibilityHint="Drag up or down to change the exercise order. Use accessibility actions to move one position."
        accessibilityState={{ disabled }}
        accessibilityValue={{ min: 1, max: props.count, now: index + 1 }}
        accessibilityActions={
          disabled
            ? []
            : [
                { name: "decrement", label: "Move earlier" },
                { name: "increment", label: "Move later" },
              ]
        }
        onAccessibilityAction={(event) => {
          if (!disabled)
            props.onMoveBy(
              event.nativeEvent.actionName === "decrement" ? -1 : 1,
            );
        }}
        className="min-h-12 w-12 items-center justify-center"
        style={{ opacity: disabled ? 0.4 : 1 }}
      >
        <Feather name="menu" color={active ? primary : muted} size={20} />
      </View>
    </Animated.View>
  );
}
