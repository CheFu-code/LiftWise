type ToastMessage = { id: number; message: string };
let current: ToastMessage | null = null;
let sequence = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

export const getToast = () => current;
export function subscribeToast(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function dismissToast() {
  clearTimeout(timer);
  current = null;
  listeners.forEach((listener) => listener());
}
export function showToast(message: string) {
  clearTimeout(timer);
  current = { id: ++sequence, message };
  listeners.forEach((listener) => listener());
  timer = setTimeout(dismissToast, 5000);
}
