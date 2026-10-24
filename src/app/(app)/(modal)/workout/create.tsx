import { useActionModal } from "@/components/ui/action-modal";
import { useToast } from "@/components/ui/toast";
import Button from "@/components/ui/button";
import SafeAreaScreen from "@/components/ui/safe-area-screen";
import { useWorkoutDraft } from "@/contexts/workout-draft-context";
import { createWorkoutMutationFn } from "@/lib/api";
import { cacheCreatedWorkout } from "@/lib/workout-cache";
import { useAppThemeColor } from "@/theme/app-theme";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Text,
  TextInput,
  View,
} from "react-native";
import Pressable from "@/components/ui/guarded-pressable";
import {
  KeyboardAwareScrollView,
  KeyboardToolbar,
} from "react-native-keyboard-controller";
import { z } from "zod";

const formSchema = z.object({
  exercises: z.array(z.unknown()).min(1, "Add at least one exercise"),
  name: z.string().trim().min(1, "Enter a workout name"),
});

const CreateWorkout = () => {
  const showModal = useActionModal();
  const { showToast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const muted = useAppThemeColor("mutedForeground");
  const primary = useAppThemeColor("primary");

  const [name, setName] = useState("");
  const saveLock = useRef(false);
  const pickerLock = useRef(false);
  const [pickingImage, setPickingImage] = useState(false);
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState<{
    base64: string;
    uri: string;
  } | null>(null);

  const [selectedExercises, setSelectedExercises] = useWorkoutDraft();

  const createMutation = useMutation({
    mutationFn: () =>
      createWorkoutMutationFn({
        name: name,
        description: description || "",
        exercises: selectedExercises.map((exercise) => ({
          id: exercise.id,
          reps: exercise.reps,
          sets: exercise.sets,
          rest: exercise.rest,
        })),
        image: coverImage?.base64,
      }),
    onError: () =>
      showToast("Failed to create workout. Your draft is ready to retry."),
    onSuccess: (workout) => {
      if (workout) cacheCreatedWorkout(queryClient, workout);
      setSelectedExercises([]);
      router.push("/workouts");
    },
    onSettled: () => {
      saveLock.current = false;
    },
  });

  const updateExercise = (
    id: string,
    field: "reps" | "rest" | "sets",
    amount: number,
  ) => {
    setSelectedExercises((prev) =>
      prev.map((exercise) =>
        exercise.id === id
          ? {
              ...exercise,
              [field]: Math.max(1, exercise[field] + amount),
            }
          : exercise,
      ),
    );
  };

  const saveWorkout = () => {
    if (saveLock.current || pickerLock.current) return;
    const result = formSchema.safeParse({
      exercises: selectedExercises,
      name,
    });
    if (!result.success) {
      showModal("Missing details", result.error.issues[0].message);
      return;
    }
    saveLock.current = true;
    createMutation.mutate();
  };

  const pickImage = async () => {
    if (pickerLock.current || saveLock.current) return;
    pickerLock.current = true;
    setPickingImage(true);
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showModal(
          "Photo permission needed",
          "Allow photo access in Settings to choose a workout cover",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: Linking.openSettings },
          ],
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [16, 9],
        base64: true,
        mediaTypes: ["images"],
        quality: 0.6,
      });
      const image = result.assets?.[0];
      if (!result.canceled && image?.base64) {
        setCoverImage({
          base64: image.base64,
          uri: image.uri,
        });
      }
    } catch {
      showToast("Failed to open photos. Please try again.");
    } finally {
      pickerLock.current = false;
      setPickingImage(false);
    }
  };

  const removeExercise = (exerciseId: string) => {
    setSelectedExercises((prev) => prev.filter(({ id }) => id !== exerciseId));
  };
  return (
    <SafeAreaScreen edges={["top", "bottom"]}>
      <KeyboardAwareScrollView
        bottomOffset={27}
        contentContainerClassName="flex-grow"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-grow px-5 pt-3 pb-8">
          <View className="flex-row items-center justify-between">
            <Pressable
              disabled={createMutation.isPending}
              onPress={() => router.back()}
            >
              <Text className="font-inter-medium text-[13px] text-destructive">
                Cancel
              </Text>
            </Pressable>
            <Text className="font-inter-bold text-[16px] text-foreground">
              {" "}
              Create Workout
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save workout"
              accessibilityState={{
                busy: createMutation.isPending,
                disabled: createMutation.isPending || pickingImage,
              }}
              disabled={createMutation.isPending || pickingImage}
              onPress={saveWorkout}
              className="min-h-11 flex-row items-center gap-2"
            >
              {createMutation.isPending && (
                <ActivityIndicator size="small" color={primary} />
              )}
              <Text className="font-inter-medium text-[13px] text-primary">
                {createMutation.isPending ? "Saving…" : "Save"}
              </Text>
            </Pressable>
          </View>

          <View
            className="mt-4 gap-5"
            pointerEvents={createMutation.isPending ? "none" : "auto"}
          >
            <Pressable
              disabled={pickingImage || createMutation.isPending}
              accessibilityState={{
                busy: pickingImage,
                disabled: pickingImage || createMutation.isPending,
              }}
              onPress={pickImage}
              className="h-44 items-center justify-center overflow-hidden rounded-xl border border-input-border bg-muted"
            >
              {coverImage ? (
                <Image
                  className="h-full w-full"
                  source={{ uri: coverImage.uri }}
                />
              ) : (
                <>
                  <Feather color={muted} name="image" size={28} />
                  <Text className="mt-2 font-inter-medium text-[13px] text-muted-foreground">
                    Choose cover image
                  </Text>
                </>
              )}
              {coverImage && (
                <View className="absolute bottom-3 rounded-full bg-black/60 px-4 py-2">
                  <Text className="font-inter-semibold text-[12px] text-white">
                    Change Image
                  </Text>
                </View>
              )}
              {pickingImage && (
                <View className="absolute inset-0 items-center justify-center bg-black/40">
                  <ActivityIndicator color="white" />
                </View>
              )}
            </Pressable>

            <View className="gap-2">
              <Text className="font-inter-medium text-[14px] text-foreground">
                Workout Name
              </Text>
              <TextInput
                editable={!createMutation.isPending}
                className="h-14 rounded-xl border border-input-border bg-input px-4 font-inter text-[14px] text-foreground"
                onChangeText={setName}
                maxLength={80}
                placeholder="e.g. Push Day"
                placeholderTextColor={muted}
                selectionColor={primary}
                value={name}
              />
            </View>

            <View className="gap-2">
              <Text className="font-inter-medium text-[14px] text-foreground">
                Description (Optional)
              </Text>
              <TextInput
                editable={!createMutation.isPending}
                className="h-24 rounded-xl border border-input-border bg-input px-4 py-3 font-inter text-[14px] text-foreground"
                multiline
                value={description}
                onChangeText={setDescription}
                maxLength={500}
                placeholder="Add a description..."
                placeholderTextColor={muted}
                selectionColor={primary}
                textAlignVertical="top"
              />
            </View>

            <View>
              <Text className="font-inter-bold text-[16px] text-foreground">
                Exercises
              </Text>
              <Text className="mb-3 mt-1 font-inter text-sm text-muted-foreground">
                {selectedExercises.length} exercises added
              </Text>

              {selectedExercises.map((exercise) => (
                <View
                  key={exercise.id}
                  className="mb-3  rounded-xl border border-border bg-card p-3"
                >
                  <View className="flex-row items-center">
                    {exercise.image ? (
                      <Image
                        className="h-11 w-12 rounded-lg bg-muted"
                        source={{ uri: exercise.image }}
                      />
                    ) : (
                      <View className="h-11 w-12 items-center justify-center rounded-lg bg-muted">
                        <Feather color={muted} name="image" size={17} />
                      </View>
                    )}

                    <View className="ml-3 flex-1 ">
                      <Text className="font-inter-semibold text-[13px] text-foreground">
                        {exercise.name}
                      </Text>
                      <Text className="mt-1 font-inter capitalize text-[12px] text-muted-foreground">
                        {exercise.muscles}
                      </Text>
                    </View>
                    <Pressable onPress={() => removeExercise(exercise.id)}>
                      <Feather color={muted} name="x" size={20} />
                    </Pressable>
                  </View>

                  {(
                    [
                      ["Sets", "sets", exercise.sets, 1],
                      ["Reps", "reps", exercise.reps, 1],
                      ["Rest Time", "rest", `${exercise.rest} sec`, 15],
                    ] as const
                  ).map(([label, field, value, step]) => (
                    <View
                      key={field}
                      className="mt-3 flex-row items-center justify-between"
                    >
                      <Text className="font-inter text-[12px] text-muted-foreground">
                        {label}
                      </Text>

                      <View className="flex-row items-center justify-center gap-3">
                        <Pressable
                          tapGuardInterval={150}
                          className="h-8 w-8 items-center justify-center rounded-lg bg-muted"
                          onPress={() =>
                            updateExercise(exercise.id, field, -step)
                          }
                        >
                          <Feather color={muted} name="minus" size={15} />
                        </Pressable>
                        <Text className="w-14 text-center font-inter-semibold text-[12px] text-foreground">
                          {value}
                        </Text>
                        <Pressable
                          tapGuardInterval={150}
                          className="h-8 w-8 items-center justify-center rounded-lg bg-muted"
                          onPress={() =>
                            updateExercise(exercise.id, field, step)
                          }
                        >
                          <Feather color={muted} name="plus" size={15} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ))}

              <Button
                leftIcon={<Feather color={primary} name="plus" size={18} />}
                onPress={() => router.push("/workout/exercises")}
                size="sm"
                variant="outline"
              >
                Add Exercise
              </Button>
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>
      <KeyboardToolbar />
    </SafeAreaScreen>
  );
};

export default CreateWorkout;
