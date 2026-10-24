import { Feather } from "@expo/vector-icons";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Pressable from "@/components/ui/guarded-pressable";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppThemeColor } from "@/theme/app-theme";

type ModalAction = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  selected?: boolean;
  onPress?: () => void | Promise<unknown>;
};
type ShowActionModal = (
  title: string,
  message?: string,
  actions?: ModalAction[],
) => void;
type Dialog = {
  id: number;
  title: string;
  message?: string;
  actions: ModalAction[];
};
const ActionModalContext = createContext<ShowActionModal | null>(null);

export function ActionModalProvider({ children }: { children: ReactNode }) {
  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  const nextId = useRef(0);
  const handledId = useRef(0);
  const showModal = useCallback<ShowActionModal>((title, message, actions) => {
    Keyboard.dismiss();
    const dialog = {
      id: ++nextId.current,
      title,
      message,
      actions: actions?.length ? actions : [{ text: "OK" }],
    };
    setDialogs((queue) => [...queue, dialog]);
  }, []);
  const dialog = dialogs[0];
  const orderedActions = dialog
    ? [
        ...dialog.actions.filter((action) => action.selected !== undefined),
        ...dialog.actions.filter(
          (action) =>
            action.selected === undefined && action.style === "cancel",
        ),
        ...dialog.actions.filter(
          (action) =>
            action.selected === undefined && action.style !== "cancel",
        ),
      ]
    : [];
  const card = useAppThemeColor("card");
  const foreground = useAppThemeColor("foreground");
  const muted = useAppThemeColor("mutedForeground");
  const primary = useAppThemeColor("primary");
  const primaryForeground = useAppThemeColor("primaryForeground");
  const secondary = useAppThemeColor("secondary");
  const destructive = useAppThemeColor("destructive");
  const destructiveForeground = useAppThemeColor("destructiveForeground");
  const border = useAppThemeColor("border");

  const choose = (action: ModalAction) => {
    if (!dialog || handledId.current >= dialog.id) return;
    handledId.current = dialog.id;
    setDialogs((queue) => queue.filter((item) => item.id !== dialog.id));
    // Dismiss before invoking callbacks, which may navigate or open another dialog.
    void Promise.resolve()
      .then(() => action.onPress?.())
      .catch((error: unknown) => {
        showModal(
          "Something went wrong",
          error instanceof Error ? error.message : "Please try again.",
        );
      });
  };
  const dismiss = () => {
    if (!dialog) return;
    const cancel = dialog.actions.find((action) => action.style === "cancel");
    if (cancel) choose(cancel);
    else if (dialog.actions.length === 1) choose({ text: "Dismiss" });
  };

  return (
    <ActionModalContext.Provider value={showModal}>
      {children}
      <Modal
        transparent
        visible={!!dialog}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={dismiss}
      >
        <View style={styles.overlay}>
          <Pressable
            cssInterop={false}
            style={StyleSheet.absoluteFill}
            onPress={dismiss}
            accessible={false}
            importantForAccessibility="no"
          />
          <SafeAreaView
            style={styles.safeArea}
            edges={["top", "bottom", "left", "right"]}
            pointerEvents="box-none"
          >
            {dialog && (
              <View
                accessibilityViewIsModal
                onAccessibilityEscape={dismiss}
                style={[
                  styles.card,
                  { backgroundColor: card, borderColor: border },
                ]}
              >
                <ScrollView bounces={false} contentContainerStyle={styles.body}>
                  <Text
                    accessibilityRole="header"
                    style={[styles.title, { color: foreground }]}
                  >
                    {dialog.title}
                  </Text>
                  {!!dialog.message && (
                    <Text style={[styles.message, { color: muted }]}>
                      {dialog.message}
                    </Text>
                  )}
                  <View style={styles.actions}>
                    {orderedActions.map((action, index) => {
                      const cancel = action.style === "cancel";
                      const danger = action.style === "destructive";
                      const choice = action.selected !== undefined;
                      const backgroundColor = danger
                        ? destructive
                        : cancel
                          ? "transparent"
                          : choice
                            ? secondary
                            : primary;
                      const color = danger
                        ? destructiveForeground
                        : cancel
                          ? muted
                          : choice
                            ? foreground
                            : primaryForeground;
                      return (
                        <Pressable
                          cssInterop={false}
                          key={`${dialog.id}-${index}`}
                          accessibilityRole={choice ? "radio" : "button"}
                          accessibilityState={
                            choice ? { checked: action.selected } : undefined
                          }
                          onPress={() => choose(action)}
                          style={({ pressed }) => [
                            styles.action,
                            choice
                              ? styles.choiceAction
                              : cancel
                                ? styles.cancelAction
                                : styles.mainAction,
                            {
                              backgroundColor,
                              borderColor: action.selected
                                ? primary
                                : "transparent",
                              opacity: pressed ? 0.75 : 1,
                            },
                          ]}
                        >
                          <Text style={[styles.actionText, { color }]}>
                            {action.text}
                          </Text>
                          {choice && (
                            <Feather
                              name={action.selected ? "check-circle" : "circle"}
                              size={21}
                              color={action.selected ? primary : muted}
                            />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </ActionModalContext.Provider>
  );
}

export function useActionModal() {
  const showModal = useContext(ActionModalContext);
  if (!showModal) throw new Error("ActionModalProvider is required.");
  return showModal;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.55)" },
  safeArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "100%",
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  body: { padding: 24 },
  title: { fontFamily: "Inter_700Bold", fontSize: 22, lineHeight: 30 },
  message: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 24,
    marginTop: 12,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    marginTop: 24,
  },
  choiceAction: { width: "100%" },
  cancelAction: { marginRight: "auto", paddingHorizontal: 8, flexShrink: 1 },
  mainAction: { flexShrink: 1, minWidth: 80 },
  action: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  actionText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    flexShrink: 1,
  },
});
