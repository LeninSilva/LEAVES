import { requestPlaceName } from "./ai";
import { saveMeta } from "./db";

/**
 * Place is never captured without the person's say. The browser asks for
 * permission the first time. Coordinates are used once to look up a coarse
 * name and are never stored.
 */
export async function lookUpPlace(): Promise<string | null> {
  if (!("geolocation" in navigator)) return null;
  await saveMeta({ locationAsked: true });
  const position = await new Promise<GeolocationPosition | null>((resolve) =>
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), {
      enableHighAccuracy: false,
      maximumAge: 10 * 60_000,
      timeout: 12_000,
    }),
  );
  if (!position) return null;
  try {
    const { name } = await requestPlaceName(position.coords.latitude, position.coords.longitude);
    return name;
  } catch {
    return null;
  }
}

export async function locationPermission(): Promise<PermissionState | "unknown"> {
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return "unknown";
  }
}
