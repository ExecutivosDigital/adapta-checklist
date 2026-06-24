"use client";

import React, { createContext, useContext } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { GeoLocation, GeoPermissionStatus } from "@/types/driver.types";

interface GeolocationContextType {
  location: GeoLocation | null;
  permissionStatus: GeoPermissionStatus;
  error: string | null;
  requestPermission: () => void;
}

const GeolocationContext = createContext<GeolocationContextType>({
  location: null,
  permissionStatus: "loading",
  error: null,
  requestPermission: () => {},
});

export function GeolocationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const geo = useGeolocation();

  return (
    <GeolocationContext.Provider value={geo}>
      {children}
    </GeolocationContext.Provider>
  );
}

export function useGeolocationContext() {
  return useContext(GeolocationContext);
}
