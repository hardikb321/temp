import { useState, useRef, useCallback } from "react";
import { Routes, Route } from "react-router-dom";
import { MyMap, type Marker, type Session } from "./components/MyMap";
import { Toolbar } from "./components/Toolbar";
import { AdminPage } from "./pages/AdminPage";
import type { MapRef } from "@/components/ui/map";
import type { WaterType } from "@/types";

const initialMarkersByType: Record<WaterType, Marker[]> = {
  ponds: [],
  river: [],
  lake: [],
};

const initialSessionsByType: Record<WaterType, Session[]> = {
  ponds: [],
  river: [],
  lake: [],
};

function MapPage() {
  const mapRef = useRef<MapRef>(null);
  const [activeWaterType, setActiveWaterType] = useState<WaterType>("ponds");
  const [draftMarkersByType, setDraftMarkersByType] =
    useState<Record<WaterType, Marker[]>>(initialMarkersByType);
  const [submittedMarkersByType, setSubmittedMarkersByType] =
    useState<Record<WaterType, Marker[]>>(initialMarkersByType);
  const [sessionsByType, setSessionsByType] =
    useState<Record<WaterType, Session[]>>(initialSessionsByType);
  const [isProcessingSubmit, setIsProcessingSubmit] = useState(false);

  const draftMarkers = draftMarkersByType[activeWaterType];
  const submittedMarkers = submittedMarkersByType[activeWaterType];
  const sessions = sessionsByType[activeWaterType];

  const setDraftMarkers = useCallback(
    (next: Marker[] | ((prev: Marker[]) => Marker[])) => {
      setDraftMarkersByType((prev) => ({
        ...prev,
        [activeWaterType]: typeof next === "function" ? next(prev[activeWaterType]) : next,
      }));
    },
    [activeWaterType]
  );

  const handleHistoryItemClick = useCallback(
    (markerId: string) => {
      const marker = submittedMarkers.find((m) => m.id === markerId);
      if (marker && mapRef.current) {
        mapRef.current.flyTo({
          center: [marker.longitude, marker.latitude],
          zoom: 14,
          duration: 1500,
        });
      }
    },
    [submittedMarkers]
  );

  const handleSubmitDraftMarkers = useCallback(
    (markers: Marker[]) => {
      if (markers.length === 0) return;

    // 1) Append to submitted markers
    setSubmittedMarkersByType((prev) => ({
      ...prev,
      [activeWaterType]: [...prev[activeWaterType], ...markers],
    }));

    // 2) Create a new session representing this "submit" action
    const newSession: Session = {
      id: `${Date.now()}`,
      createdAt: new Date(),
      waterType: activeWaterType,
      markers: markers.map((m) => ({ ...m })),
      status: "accepted",
    };

    setSessionsByType((prev) => ({
      ...prev,
      [activeWaterType]: [...prev[activeWaterType], newSession],
    }));
  },
  [activeWaterType]
  );

  const handleRecordRejectedSession = useCallback(
    (sessionMarkers: Marker[]) => {
      if (sessionMarkers.length === 0) return;
      const newSession: Session = {
        id: `${Date.now()}-rejected`,
        createdAt: new Date(),
        waterType: activeWaterType,
        markers: sessionMarkers.map((m) => ({ ...m })),
        status: "rejected",
      };

      setSessionsByType((prev) => ({
        ...prev,
        [activeWaterType]: [...prev[activeWaterType], newSession],
      }));
    },
    [activeWaterType]
  );

  const handleRetryRejectedSession = useCallback(
    (sessionId: string) => {
      // Find the session across all water types
      let foundSession: Session | null = null;
      let foundType: WaterType | null = null;
      (["ponds", "river", "lake"] as WaterType[]).forEach((type) => {
        if (foundSession) return;
        const s = sessionsByType[type].find((sess) => sess.id === sessionId);
        if (s) {
          foundSession = s;
          foundType = type;
        }
      });
      if (!foundSession || !foundType) return;

      // Switch to that water type and load markers back into drafts
      setActiveWaterType(foundType);
      setDraftMarkersByType((prev) => ({
        ...prev,
        [foundType!]: foundSession!.markers.map((m) => ({ ...m })),
      }));
    },
    [sessionsByType]
  );
  const handleRejectedSessionResubmit = useCallback(
  (markers: Marker[]) => {
    setDraftMarkersByType((prev) => ({
      ...prev,
      lake: markers,
    }));
    setActiveWaterType("lake");
  },
  []
);

  return (
    <div className="min-h-screen flex flex-col bg-background">
 <Toolbar
  activeWaterType={activeWaterType}
  onWaterTypeChange={setActiveWaterType}
  isProcessingSubmit={isProcessingSubmit}
  onPointClick={(lat, lng) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 15, duration: 1200 });
  }}
  onRejectedSessionResubmit={handleRejectedSessionResubmit}
/>
      <main className="flex-1 p-6">
        <MyMap
          draftMarkers={draftMarkers}
          submittedMarkers={submittedMarkers}
          onDraftMarkersChange={setDraftMarkers}
          onSubmitDraftMarkers={handleSubmitDraftMarkers}
          onRejectDraftSession={handleRecordRejectedSession}
          onProcessingChange={setIsProcessingSubmit}
          mapRef={mapRef}
          waterType={activeWaterType}
        />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MapPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}

