// Resolve known IDs rather than trusting arbitrary navigation parameters.
export const appShortcuts = [
    { id: "start-workout", title: "Start Workout", subtitle: "Choose a workout", params: { href: "/workouts" } },
    { id: "history", title: "Workout History", params: { href: "/history" } },
    { id: "profile", title: "Profile", params: { href: "/profile" } },
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
