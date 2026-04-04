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

          {/* Parameter filter pills — inspired by AQI.in's top filter bar */}
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

              {/* Trending / featured section inspired by AQI "Trending in India" */}
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

            {/* Right: Small colorful WQI Map Card */}
            <div className="flex-shrink-0 w-full lg:w-72">
              <button
                onClick={handleWQIMapClick}
                className="group w-full rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                style={{
                  background: "linear-gradient(145deg, #0f1923, #1a2a3a)",
                  border: "1px solid #1e3a5f",
                  boxShadow: "0 0 30px rgba(30,144,255,0.15)",
                }}
              >
                {/* Colorful map preview */}
                <div className="relative h-48 overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
                    {/* Background */}
                    <rect width="300" height="200" fill="#0d1b2a" />
                    {/* Grid lines */}
                    {[30, 60, 90, 120, 150, 180].map(y => (
                      <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="#1a2a3a" strokeWidth="0.5" />
                    ))}
                    {[50, 100, 150, 200, 250].map(x => (
                      <line key={x} x1={x} y1="0" x2={x} y2="200" stroke="#1a2a3a" strokeWidth="0.5" />
                    ))}
                    {/* River paths */}
                    <path d="M 20 80 Q 80 60 140 90 T 280 75" stroke="#1e90ff" strokeWidth="2.5" fill="none" opacity="0.7" strokeDasharray="6 3" />
                    <path d="M 10 140 Q 70 120 130 145 T 290 130" stroke="#00bcd4" strokeWidth="1.5" fill="none" opacity="0.5" />
                    {/* Monitoring points — colorful like AQI dots */}
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

                    {/* Legend dots */}
                    <circle cx="15" cy="175" r="4" fill="#ef4444" />
                    <text x="23" y="179" fill="#94a3b8" fontSize="6">Poor</text>
                    <circle cx="55" cy="175" r="4" fill="#eab308" />
                    <text x="63" y="179" fill="#94a3b8" fontSize="6">Fair</text>
                    <circle cx="93" cy="175" r="4" fill="#22c55e" />
                    <text x="101" y="179" fill="#94a3b8" fontSize="6">Good</text>
                  </svg>
                  {/* Top label overlay */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: "rgba(30,144,255,0.2)", border: "1px solid rgba(30,144,255,0.4)", color: "#60a5fa" }}>
                    <Map className="w-3 h-3" />
                    WQI Map
                  </div>
                  {/* Live badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold" style={{ background: "rgba(34,197,94,0.2)", border: "1px solid rgba(34,197,94,0.4)", color: "#4ade80" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block"></span>
                    Live
                  </div>
                </div>

                {/* Card footer */}
                <div className="px-5 py-4 flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold text-sm">Open Full Map</div>
                    <div className="text-slate-500 text-xs mt-0.5">View all monitoring points</div>
                  </div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform" style={{ background: "#1e90ff" }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M7 3l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                </div>
              </button>

              {/* India label below card like AQI.in */}
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