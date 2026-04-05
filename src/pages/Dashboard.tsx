import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Map } from "lucide-react";

export function Dashboard() {
  const navigate = useNavigate();

  const handleWQIMapClick = () => {
    navigate("/map/lake");
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0d1117 0%, #161b27 40%, #0d1117 100%)" }}>
      <Navbar />

      {/* Hero Section */}
      <section className="relative px-6 md:px-12 py-16 md:py-24">
        {/* Subtle background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #1e90ff 0%, transparent 70%)" }}></div>
          <div className="absolute bottom-10 right-1/4 w-64 h-64 rounded-full opacity-8" style={{ background: "radial-gradient(circle, #00bcd4 0%, transparent 70%)" }}></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">

          {/* Header */}
          <div className="mb-14">
            <h1 className="text-5xl md:text-6xl font-extrabold mb-4 tracking-tight" style={{ color: "#ffffff" }}>
              Water Quality{" "}
              <span style={{ background: "linear-gradient(90deg, #1e90ff, #00e5ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Monitor
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-xl leading-relaxed">
              Real-time monitoring and analysis of water quality across lakes, rivers, and ponds
            </p>
          </div>

          {/* Parameter filter pills */}
          <div className="flex flex-wrap gap-3 mb-12">
            {["WQI", "pH", "DO", "BOD", "Turbidity", "TDS", "Nitrates", "Coliform"].map((param, i) => (
              <button
                key={param}
                className="px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200"
                style={
                  i === 0
                    ? { background: "#1e90ff", color: "#fff", border: "1px solid #1e90ff" }
                    : { background: "transparent", color: "#94a3b8", border: "1px solid #2a3347" }
                }
              >
                {param}
              </button>
            ))}
          </div>

          {/* Main Layout: Info left + Map card right */}
          <div className="flex flex-col lg:flex-row items-start gap-10">

            {/* Left: Stats & Info */}
            <div className="flex-1">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4 mb-10">
                {[
                  { value: "22", label: "Parameters", color: "#00e5ff" },
                  { value: "100+", label: "Monitoring Points", color: "#1e90ff" },
                  { value: "Live", label: "Real-Time Feed", color: "#00e676" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl p-5"
                    style={{ background: "#161b27", border: "1px solid #1e2a3a" }}
                  >
                    <div className="text-2xl font-bold mb-1" style={{ color: stat.color }}>{stat.value}</div>
                    <div className="text-xs text-slate-500">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Trending Alerts */}
              <div>
                <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-widest mb-4">Trending Alerts</h3>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {[
                    { emoji: "⚠️", title: "High Turbidity", sub: "Narmada River, MP" },
                    { emoji: "✅", title: "Good WQI", sub: "Bhopal Upper Lake" },
                    { emoji: "🔴", title: "Low DO Level", sub: "Indore Pond Network" },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex-shrink-0 flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ background: "#1a2235", border: "1px solid #1e2a3a", minWidth: 200 }}
                    >
                      <span className="text-2xl">{item.emoji}</span>
                      <div>
                        <div className="text-sm font-semibold text-white">{item.title}</div>
                        <div className="text-xs text-slate-500">{item.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Dark WQI Map Card */}
            <div className="flex-shrink-0 w-full lg:w-80">
              <button
                onClick={handleWQIMapClick}
                className="group w-full rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: "#111827",
                  border: "1.5px solid #1e90ff",
                  boxShadow: "0 0 0 4px rgba(30,144,255,0.12), 0 8px 40px rgba(0,0,0,0.7), 0 0 50px rgba(30,144,255,0.3)",
                }}
              >
                {/* Top blue accent bar */}
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ background: "rgba(30,144,255,0.08)", borderBottom: "1px solid rgba(30,144,255,0.2)" }}
                >
                  <div className="flex items-center gap-2">
                    <Map className="w-3.5 h-3.5" style={{ color: "#60a5fa" }} />
                    <span className="text-sm font-bold" style={{ color: "#60a5fa" }}>WQI Map</span>
                  </div>
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.35)", color: "#4ade80" }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block"></span>
                    Live
                  </div>
                </div>

                {/* Terrain map SVG */}
                <div className="relative overflow-hidden" style={{ height: 210 }}>
                  <svg className="w-full h-full" viewBox="0 0 320 210" xmlns="http://www.w3.org/2000/svg">
                    <rect width="320" height="210" fill="#c8d8a0" />
                    <rect x="0" y="0" width="100" height="80" fill="#b5cc8a" />
                    <rect x="100" y="0" width="120" height="60" fill="#cddca0" />
                    <rect x="220" y="0" width="100" height="90" fill="#bfd090" />
                    <rect x="0" y="80" width="80" height="80" fill="#d4e4a8" />
                    <rect x="150" y="80" width="90" height="70" fill="#c2d695" />
                    <rect x="240" y="90" width="80" height="80" fill="#b8cc82" />
                    <rect x="0" y="160" width="130" height="50" fill="#c5d898" />
                    <rect x="200" y="150" width="120" height="60" fill="#cce0a2" />
                    <line x1="0" y1="110" x2="320" y2="110" stroke="#f5e6c8" strokeWidth="3" />
                    <line x1="160" y1="0" x2="160" y2="210" stroke="#f5e6c8" strokeWidth="2" />
                    <line x1="80" y1="0" x2="60" y2="210" stroke="#ede0c0" strokeWidth="1.5" opacity="0.7" />
                    <line x1="240" y1="0" x2="260" y2="210" stroke="#ede0c0" strokeWidth="1.5" opacity="0.7" />
                    <path d="M 30 90 Q 70 75 110 95 Q 140 108 160 100 Q 185 90 200 105 Q 220 118 250 108 Q 270 100 300 112" stroke="#5aabdc" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.85" />
                    <ellipse cx="75" cy="155" rx="28" ry="16" fill="#7ec8e3" opacity="0.8" />
                    <ellipse cx="255" cy="65" rx="22" ry="12" fill="#7ec8e3" opacity="0.7" />
                    <rect x="130" y="90" width="60" height="40" fill="#ddd6c0" opacity="0.6" rx="2" />
                    <rect x="50" y="120" width="40" height="30" fill="#ddd6c0" opacity="0.5" rx="2" />
                    <circle cx="60" cy="85" r="10" fill="#ef4444" opacity="0.85" />
                    <text x="60" y="89" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">42</text>
                    <circle cx="120" cy="75" r="10" fill="#f97316" opacity="0.85" />
                    <text x="120" y="79" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">61</text>
                    <circle cx="170" cy="92" r="10" fill="#eab308" opacity="0.85" />
                    <text x="170" y="96" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">73</text>
                    <circle cx="220" cy="78" r="10" fill="#22c55e" opacity="0.85" />
                    <text x="220" y="82" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">88</text>
                    <circle cx="260" cy="95" r="8" fill="#3b82f6" opacity="0.85" />
                    <text x="260" y="99" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">91</text>
                    <circle cx="90" cy="145" r="8" fill="#ef4444" opacity="0.75" />
                    <text x="90" y="149" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">38</text>
                    <circle cx="200" cy="135" r="9" fill="#22c55e" opacity="0.75" />
                    <text x="200" y="139" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">82</text>
                    {/* Legend */}
                    <rect x="0" y="188" width="320" height="22" fill="rgba(15,23,42,0.72)" />
                    <circle cx="14" cy="199" r="4" fill="#ef4444" />
                    <text x="22" y="203" fill="#cbd5e1" fontSize="7" fontFamily="system-ui,sans-serif">Poor</text>
                    <circle cx="55" cy="199" r="4" fill="#eab308" />
                    <text x="63" y="203" fill="#cbd5e1" fontSize="7" fontFamily="system-ui,sans-serif">Fair</text>
                    <circle cx="93" cy="199" r="4" fill="#22c55e" />
                    <text x="101" y="203" fill="#cbd5e1" fontSize="7" fontFamily="system-ui,sans-serif">Good</text>
                    <circle cx="136" cy="199" r="4" fill="#3b82f6" />
                    <text x="144" y="203" fill="#cbd5e1" fontSize="7" fontFamily="system-ui,sans-serif">Excellent</text>
                  </svg>
                </div>

                {/* Blue accent divider */}
                <div style={{ height: "1px", background: "linear-gradient(90deg, rgba(30,144,255,0.05), rgba(30,144,255,0.4), rgba(30,144,255,0.05))" }} />

                {/* Footer with blue tint */}
                <div
                  className="flex items-center justify-between px-5 py-4"
                  style={{ background: "rgba(30,144,255,0.07)", borderTop: "none" }}
                >
                  <div>
                    <div className="text-sm font-bold text-white">Open Full Map</div>
                    <div className="text-xs mt-0.5" style={{ color: "#64748b" }}>View all monitoring points</div>
                  </div>
                  <div
                    className="flex items-center justify-center rounded-full group-hover:translate-x-0.5 transition-transform duration-200"
                    style={{ background: "#1e90ff", width: 34, height: 34 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7h8M7 3l4 4-4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </button>

              <div className="mt-3 flex items-center gap-1.5 text-slate-500 text-xs px-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="10" r="3" stroke="#64748b" strokeWidth="2" /><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#64748b" strokeWidth="2" /></svg>
                India · MP Region
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}