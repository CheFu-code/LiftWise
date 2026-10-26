// Resolve known IDs rather than trusting arbitrary navigation parameters.
export const appShortcuts = [
    { id: "start-workout", title: "Start Workout", subtitle: "Choose a workout", icon: "shortcut_workout", params: { href: "/workouts" } },
    { id: "history", title: "Workout History", icon: "shortcut_history", params: { href: "/history" } },
    { id: "profile", title: "Profile", icon: "shortcut_profile", params: { href: "/profile" } },
] as const;

export function shortcutDestination(id: string) {
    switch (id) {
        case "start-workout": return "/workouts";
        case "history": return "/history";
        case "profile": return "/profile";
        // Previously installed/pinned shortcuts must still lead somewhere valid.
        case "progress": return "/";
        default: return null;
    }
}
