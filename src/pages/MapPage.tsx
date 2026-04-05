import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MyMap, type Marker, type Session } from "@/components/MyMap";
import { Navbar } from "@/components/Navbar";
import type { MapRef } from "@/components/ui/map";
import type { WaterType } from "@/types";
import { WATER_TYPES } from "@/types";

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

export function MapPage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();

  // Validate water type from URL
  const activeWaterType: WaterType = WATER_TYPES.includes(type as WaterType)
    ? (type as WaterType)
    : "lake";

  const mapRef = useRef<MapRef>(null);
  useEffect(() => {
    const handleFlyTo = (e: CustomEvent<{lat: number, lng: number}>) => {
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [e.detail.lng, e.detail.lat],
          zoom: 15,
          duration: 1500,
        });
      }
    };
    window.addEventListener("flyToPoint", handleFlyTo as EventListener);        
    return () => window.removeEventListener("flyToPoint", handleFlyTo as EventListener);
  }, []);
  const [draftMarkersByType, setDraftMarkersByType] =
    useState<Record<WaterType, Marker[]>>(initialMarkersByType);
  const [submittedMarkersByType, setSubmittedMarkersByType] =
    useState<Record<WaterType, Marker[]>>(initialMarkersByType);
  const [, setSessionsByType] =
    useState<Record<WaterType, Session[]>>(initialSessionsByType);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFormActive, setIsFormActive] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showTiles, setShowTiles] = useState(true);

  const draftMarkers = draftMarkersByType[activeWaterType];
  const submittedMarkers = submittedMarkersByType[activeWaterType];

  const setDraftMarkers = useCallback(
    (next: Marker[] | ((prev: Marker[]) => Marker[])) => {
      setDraftMarkersByType((prev) => ({
        ...prev,
        [activeWaterType]: typeof next === "function" ? next(prev[activeWaterType]) : next,
      }));
    },
    [activeWaterType]
  );

  const handleWaterTypeChange = useCallback(
    (type: WaterType) => {
      navigate(`/map/${type}`);
    },
    [navigate]
  );

  const handleSubmitDraftMarkers = useCallback(
    (markers: Marker[]) => {
      if (markers.length === 0) return;

      setSubmittedMarkersByType((prev) => ({
        ...prev,
        [activeWaterType]: [...prev[activeWaterType], ...markers],
      }));

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

  const handleResubmitRejectedSession = useCallback((markers: Marker[]) => {    
    if (markers.length === 0) return;

    // Load markers into draft (replacing existing drafts for this water type) and open the form UI
    setDraftMarkersByType((prev) => ({
      ...prev,
      [activeWaterType]: markers.map(m => ({ ...m, id: `${Date.now()}-${Math.random()}` }))
    }));
    
    // Set form active so users can resubmit
    setIsFormActive(true);

    // Zoom map to the first marker
    if (mapRef.current && markers[0]) {
      mapRef.current.flyTo({
        center: [markers[0].longitude, markers[0].latitude],
        zoom: 15,
        duration: 1500,
      });
    }
  }, [activeWaterType]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar onRejectedSessionResubmit={handleResubmitRejectedSession} />

      <div className="flex-1 overflow-hidden relative flex">
        {/* Map Container */}
        <div className="transition-all duration-300 ease-in-out overflow-hidden relative flex-1 flex">
          {/* Water Type Dropdown Selection (Top Right) */}
          <div className={`absolute top-6 z-20 transition-all duration-300 ease-in-out ${isFormActive ? 'right-[420px]' : 'right-[140px]'}`}>
            <div className="flex flex-col gap-3">
              <div className="relative">
                <button
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 bg-card/95 backdrop-blur-md border border-border shadow-lg px-4 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors w-32 justify-between"
                aria-label="Select water type"
              >
                <span className="capitalize">{activeWaterType === 'ponds' ? 'Ponds' : activeWaterType}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
              </button>
              
              {/* Dropdown Options */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col">
                  {(["lake", "river", "ponds"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        handleWaterTypeChange(type);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        activeWaterType === type
                          ? "bg-primary/20 text-primary font-medium"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="capitalize">{type === 'ponds' ? 'Ponds' : type}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            </div>
          </div>

          {/* Toggle Buttons for Markers and Tiles (Top Center) */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
            <div className="flex gap-2">
              <button
                onClick={() => setShowMarkers(!showMarkers)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showMarkers
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
                title="Toggle marker visibility"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {showMarkers ? "Markers" : "Hidden"}
              </button>

              <button
                onClick={() => setShowTiles(!showTiles)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showTiles
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
                title="Toggle tile visibility"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                {showTiles ? "Tiles" : "Hidden"}
              </button>
            </div>
          </div>

          {/* Map */}
          <MyMap
            draftMarkers={draftMarkers}
            submittedMarkers={submittedMarkers}
            onDraftMarkersChange={setDraftMarkers}
            onSubmitDraftMarkers={handleSubmitDraftMarkers}
            onRejectDraftSession={handleRecordRejectedSession}
            onProcessingChange={() => {}}
            mapRef={mapRef}
            waterType={activeWaterType}
            onFormActiveChange={setIsFormActive}
            isFormActive={isFormActive}
            showMarkers={showMarkers}
            showTiles={showTiles}
          />
        </div>
      </div>
    </div>
  );
}