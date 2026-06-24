"use client";

import { useState, useEffect, useCallback } from "react";
import { GeoLocation, GeoPermissionStatus } from "@/types/driver.types";

interface UseGeolocationReturn {
  location: GeoLocation | null;
  permissionStatus: GeoPermissionStatus;
  error: string | null;
  requestPermission: () => void;
}

export function useGeolocation(): UseGeolocationReturn {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<GeoPermissionStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setPermissionStatus("unavailable");
      setError("Geolocalização não disponível neste navegador.");
      return;
    }

    setPermissionStatus("loading");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
        setPermissionStatus("granted");
        setError(null);
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setPermissionStatus("denied");
            setError("Permissão de localização negada.");
            break;
          case err.POSITION_UNAVAILABLE:
            setPermissionStatus("unavailable");
            setError("Localização indisponível.");
            break;
          case err.TIMEOUT:
            setPermissionStatus("granted");
            setError("Tempo esgotado ao buscar localização.");
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions) {
      getCurrentPosition();
      return;
    }

    // Fail-safe: se o browser travar em loading (acontece em alguns mobile
    // browsers via URLs customizadas tipo cloudflared tunnel), libera a UI
    // após 5s assumindo GPS indisponível.
    const safetyTimeout = setTimeout(() => {
      setPermissionStatus((prev) =>
        prev === "loading" ? "unavailable" : prev,
      );
    }, 5000);

    navigator.permissions
      .query({ name: "geolocation" })
      .then((result) => {
        if (result.state === "granted") {
          getCurrentPosition();
        } else if (result.state === "denied") {
          setPermissionStatus("denied");
          setError("Permissão de localização negada.");
        } else {
          setPermissionStatus("prompt");
        }
      })
      .catch(() => {
        getCurrentPosition();
      });

    return () => clearTimeout(safetyTimeout);
  }, [getCurrentPosition]);

  const requestPermission = useCallback(() => {
    getCurrentPosition();
  }, [getCurrentPosition]);

  return { location, permissionStatus, error, requestPermission };
}
