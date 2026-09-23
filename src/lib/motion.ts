/**
 * Shared easing curves. The built-in CSS/Framer named easings (e.g. "easeOut")
 * are too weak to read as intentional — these are the stronger custom curves
 * every entrance/exit in the app should share instead of hand-rolling one-offs.
 */
export const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
export const EASE_IN_OUT: [number, number, number, number] = [0.77, 0, 0.175, 1];
