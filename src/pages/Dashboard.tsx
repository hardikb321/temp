import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { ArrowRight, Map } from "lucide-react";

export function Dashboard() {
  const navigate = useNavigate();

  const handleWQIMapClick = () => {
    navigate("/map/lake");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 md:px-8 py-12 md:py-16">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse animation-delay-2000"></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 md:mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
              Water Quality Monitor
            </h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Real-time monitoring and analysis of water quality across lakes, rivers, and ponds
            </p>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* WQI Map Card - Large Featured Card */}
            <button
              onClick={handleWQIMapClick}
              className="lg:col-span-2 group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-600/40 rounded-2xl overflow-hidden hover:border-cyan-400/50 transition-all duration-300 shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-15 transition-opacity"></div>
              <div className="relative p-8 md:p-10">
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">WQI Map</h2>
                    <p className="text-slate-400">View real-time water quality data</p>
                  </div>
                  <div className="p-3 bg-cyan-500/20 rounded-lg group-hover:bg-cyan-500/30 transition-colors">
                    <Map className="w-6 h-6 md:w-7 md:h-7 text-cyan-400" />
                  </div>
                </div>
                
                {/* Mini Map Preview */}
                <div className="relative bg-slate-700/50 rounded-lg overflow-hidden mb-6 h-40 md:h-48 border border-slate-600/30">
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                    <svg className="w-full h-full opacity-40" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
                      <path d="M 80 100 Q 120 80 160 100 T 240 100" stroke="#3b82f6" strokeWidth="2" fill="none" />
                      <circle cx="100" cy="120" r="6" fill="#ef4444" opacity="0.6" />
                      <circle cx="150" cy="110" r="6" fill="#eab308" opacity="0.6" />
                      <circle cx="200" cy="130" r="6" fill="#22c55e" opacity="0.6" />
                      <circle cx="250" cy="115" r="6" fill="#3b82f6" opacity="0.6" />
                      <circle cx="300" cy="125" r="5" fill="#ef4444" opacity="0.6" />
                    </svg>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-cyan-400 group-hover:text-cyan-300 transition-colors font-semibold">
                  Open Map
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            {/* Quick Stats Card */}
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-600/40 rounded-2xl p-8 shadow-xl">
              <h3 className="text-sm font-semibold text-slate-400 mb-6 uppercase tracking-wider">Quick Stats</h3>
              <div className="space-y-6">
                <div>
                  <div className="text-3xl font-bold text-cyan-400 mb-1">22</div>
                  <p className="text-sm text-slate-400">Parameters</p>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-400 mb-1">Real-Time</div>
                  <p className="text-sm text-slate-400">Analysis</p>
                </div>
                <div>
                  <div className="text-3xl font-bold text-emerald-400 mb-1">100+</div>
                  <p className="text-sm text-slate-400">Monitoring Points</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
