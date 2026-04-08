import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Map } from "lucide-react";

interface StateWQI {
  state_id: number;
  state_name: string;
  avg_wqi: number;
  lat: number;
  lng: number;
}

function getWqiColor(wqi: number | null) {
  if (wqi == null) return { color: "#6b7280", bgColor: "#6b728026", label: "Unknown" };
  if (wqi < 40)   return { color: "#ef4444", bgColor: "#ef444426", label: "Poor" };
  if (wqi < 65)   return { color: "#f59e0b", bgColor: "#f59e0b26", label: "Fair" };
  if (wqi < 85)   return { color: "#22c55e", bgColor: "#22c55e26", label: "Good" };
  return           { color: "#3b82f6", bgColor: "#3b82f626", label: "Excellent" };
}

// Large detailed architectural SVG illustrations (outline/line-art style like AQI.in)
function StateLandmarkIllustration({ stateName, color }: { stateName: string; color: string }) {
  const name = stateName.toLowerCase();
  const c = color;

  // TAJ MAHAL — Uttar Pradesh
  if (name.includes("uttar pradesh")) return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="82" width="110" height="6" rx="1" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.06"/>
      <rect x="15" y="78" width="90" height="4" rx="1" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.05"/>
      <rect x="30" y="56" width="60" height="22" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.05"/>
      <path d="M45 56 Q60 30 75 56" stroke={c} strokeWidth="1.5" fill={c} fillOpacity="0.1"/>
      <line x1="60" y1="30" x2="60" y2="22" stroke={c} strokeWidth="1.2"/>
      <ellipse cx="60" cy="21" rx="2" ry="3" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.3"/>
      <line x1="60" y1="18" x2="60" y2="14" stroke={c} strokeWidth="1"/>
      <circle cx="60" cy="13" r="1.5" fill={c} fillOpacity="0.7"/>
      <rect x="16" y="44" width="8" height="34" rx="1" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.05"/>
      <path d="M16 44 Q20 36 24 44" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.1"/>
      <line x1="20" y1="36" x2="20" y2="30" stroke={c} strokeWidth="1"/>
      <circle cx="20" cy="29" r="1.2" fill={c} fillOpacity="0.6"/>
      <rect x="96" y="44" width="8" height="34" rx="1" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.05"/>
      <path d="M96 44 Q100 36 104 44" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.1"/>
      <line x1="100" y1="36" x2="100" y2="30" stroke={c} strokeWidth="1"/>
      <circle cx="100" cy="29" r="1.2" fill={c} fillOpacity="0.6"/>
      <path d="M38 78 Q38 65 45 65 Q52 65 52 78" stroke={c} strokeWidth="1" fill="none"/>
      <path d="M54 78 Q54 62 60 62 Q66 62 66 78" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.08"/>
      <path d="M68 78 Q68 65 75 65 Q82 65 82 78" stroke={c} strokeWidth="1" fill="none"/>
      <line x1="30" y1="62" x2="90" y2="62" stroke={c} strokeWidth="0.8" strokeDasharray="3 2"/>
      <rect x="5" y="66" width="22" height="16" rx="1" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.04"/>
      <path d="M9 66 Q16 58 23 66" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.07"/>
      <rect x="93" y="66" width="22" height="16" rx="1" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.04"/>
      <path d="M97 66 Q104 58 111 66" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.07"/>
    </svg>
  );

  // GATEWAY OF INDIA — Maharashtra
  if (name.includes("maharashtra")) return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
      <rect x="10" y="82" width="100" height="6" rx="1" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.06"/>
      <rect x="20" y="40" width="18" height="42" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.05"/>
      <path d="M20 40 Q29 26 38 40" stroke={c} strokeWidth="1.3" fill={c} fillOpacity="0.12"/>
      <ellipse cx="29" cy="26" rx="3" ry="4" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.15"/>
      <line x1="29" y1="22" x2="29" y2="16" stroke={c} strokeWidth="1"/>
      <circle cx="29" cy="15" r="1.5" fill={c} fillOpacity="0.7"/>
      <rect x="82" y="40" width="18" height="42" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.05"/>
      <path d="M82 40 Q91 26 100 40" stroke={c} strokeWidth="1.3" fill={c} fillOpacity="0.12"/>
      <ellipse cx="91" cy="26" rx="3" ry="4" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.15"/>
      <line x1="91" y1="22" x2="91" y2="16" stroke={c} strokeWidth="1"/>
      <circle cx="91" cy="15" r="1.5" fill={c} fillOpacity="0.7"/>
      <rect x="38" y="52" width="44" height="30" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.04"/>
      <path d="M38 52 Q60 28 82 52" stroke={c} strokeWidth="1.8" fill={c} fillOpacity="0.1"/>
      <path d="M46 82 Q46 62 60 62 Q74 62 74 82" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.08"/>
      <path d="M38 52 L38 46 L82 46 L82 52" stroke={c} strokeWidth="1" fill="none"/>
      <rect x="24" y="55" width="10" height="12" rx="2" stroke={c} strokeWidth="0.8" fill={c} fillOpacity="0.08"/>
      <rect x="86" y="55" width="10" height="12" rx="2" stroke={c} strokeWidth="0.8" fill={c} fillOpacity="0.08"/>
      {[20,24,28,32,36].map(x => <rect key={x} x={x} y={38} width="2" height="3" fill={c} fillOpacity="0.5"/>)}
      {[82,86,90,94,98].map(x => <rect key={x} x={x} y={38} width="2" height="3" fill={c} fillOpacity="0.5"/>)}
    </svg>
  );

  // CHARMINAR — Telangana / Andhra Pradesh
  if (name.includes("telangana") || name.includes("andhra")) return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
      <rect x="15" y="82" width="90" height="6" rx="1" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.06"/>
      {[18, 42, 66, 90].map((x, i) => (
        <g key={i}>
          <rect x={x} y={38} width={12} height={44} rx="1" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.05"/>
          <path d={`M${x} 38 Q${x+6} 26 ${x+12} 38`} stroke={c} strokeWidth="1.1" fill={c} fillOpacity="0.1"/>
          <line x1={x+6} y1="26" x2={x+6} y2="18" stroke={c} strokeWidth="1"/>
          <circle cx={x+6} cy="17" r="1.5" fill={c} fillOpacity="0.7"/>
          <line x1={x} y1="52" x2={x+12} y2="52" stroke={c} strokeWidth="0.8"/>
          <line x1={x} y1="60" x2={x+12} y2="60" stroke={c} strokeWidth="0.8"/>
          <path d={`M${x+2} 82 Q${x+2} 70 ${x+6} 70 Q${x+10} 70 ${x+10} 82`} stroke={c} strokeWidth="0.9" fill={c} fillOpacity="0.06"/>
        </g>
      ))}
      <rect x="30" y="44" width="60" height="28" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.03"/>
      <path d="M30 44 Q60 28 90 44" stroke={c} strokeWidth="1.5" fill={c} fillOpacity="0.08"/>
      <circle cx="60" cy="48" r="7" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.07"/>
      <circle cx="60" cy="48" r="4" stroke={c} strokeWidth="0.8" fill="none"/>
      <line x1="60" y1="48" x2="60" y2="45" stroke={c} strokeWidth="1"/>
      <line x1="60" y1="48" x2="63" y2="50" stroke={c} strokeWidth="1"/>
    </svg>
  );

  // BRIHADEESWARAR TEMPLE — Tamil Nadu
  if (name.includes("tamil")) return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
      <rect x="5" y="82" width="110" height="6" rx="1" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.06"/>
      <rect x="25" y="72" width="70" height="10" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.07"/>
      <rect x="32" y="62" width="56" height="10" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.07"/>
      <rect x="39" y="52" width="42" height="10" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.08"/>
      <rect x="44" y="42" width="32" height="10" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.09"/>
      <rect x="48" y="32" width="24" height="10" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.1"/>
      <rect x="52" y="22" width="16" height="10" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.12"/>
      <rect x="55" y="14" width="10" height="8" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.14"/>
      <line x1="60" y1="14" x2="60" y2="8" stroke={c} strokeWidth="1.2"/>
      <ellipse cx="60" cy="7" rx="2.5" ry="3" fill={c} fillOpacity="0.6" stroke={c} strokeWidth="0.8"/>
      <path d="M45 82 Q45 70 60 70 Q75 70 75 82" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.07"/>
      <rect x="5" y="68" width="18" height="14" stroke={c} strokeWidth="0.9" fill={c} fillOpacity="0.04"/>
      <rect x="97" y="68" width="18" height="14" stroke={c} strokeWidth="0.9" fill={c} fillOpacity="0.04"/>
    </svg>
  );

  // LOTUS TEMPLE — Delhi
  if (name.includes("delhi")) return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
      <ellipse cx="60" cy="84" rx="45" ry="5" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.06"/>
      <path d="M60 80 Q30 60 35 38 Q42 52 60 58 Q78 52 85 38 Q90 60 60 80Z" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.07"/>
      <path d="M60 80 Q15 62 22 28 Q32 46 60 58 Q88 46 98 28 Q105 62 60 80Z" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.04"/>
      <path d="M60 80 Q10 64 18 18 Q28 40 60 58 Q92 40 102 18 Q110 64 60 80Z" stroke={c} strokeWidth="0.8" fill={c} fillOpacity="0.03"/>
      <path d="M60 80 Q40 66 42 50 Q50 60 60 62 Q70 60 78 50 Q80 66 60 80Z" stroke={c} strokeWidth="1.3" fill={c} fillOpacity="0.1"/>
      <ellipse cx="60" cy="56" rx="10" ry="8" stroke={c} strokeWidth="1.4" fill={c} fillOpacity="0.12"/>
      <ellipse cx="60" cy="88" rx="30" ry="3" stroke={c} strokeWidth="0.7" fill={c} fillOpacity="0.04" strokeDasharray="4 3"/>
      <rect x="30" y="80" width="60" height="4" rx="1" stroke={c} strokeWidth="0.8" fill={c} fillOpacity="0.05"/>
    </svg>
  );

  // HAWA MAHAL — Rajasthan
  if (name.includes("rajasthan")) return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
      <rect x="8" y="82" width="104" height="6" rx="1" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.06"/>
      <rect x="10" y="70" width="100" height="12" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.05"/>
      {[14,30,46,62,78,94].map((x, i) => (
        <g key={i}>
          <rect x={x} y={48} width={14} height={22} rx="1" stroke={c} strokeWidth="0.9" fill={c} fillOpacity="0.04"/>
          <path d={`M${x} 48 Q${x+7} 38 ${x+14} 48`} stroke={c} strokeWidth="1.1" fill={c} fillOpacity="0.1"/>
          <ellipse cx={x+7} cy={38} rx="3" ry="4" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.12"/>
          <line x1={x+7} y1="34" x2={x+7} y2="28" stroke={c} strokeWidth="0.9"/>
          <circle cx={x+7} cy="27" r="1.3" fill={c} fillOpacity="0.6"/>
          <rect x={x+3} y={54} width={8} height={10} rx="1" stroke={c} strokeWidth="0.7" fill={c} fillOpacity="0.06"/>
          <path d={`M${x+3} 54 Q${x+7} 50 ${x+11} 54`} stroke={c} strokeWidth="0.8" fill={c} fillOpacity="0.08"/>
        </g>
      ))}
      {[14,27,40,53,66,79,92].map((x, i) => (
        <g key={i}>
          <rect x={x} y={70} width={11} height={12} stroke={c} strokeWidth="0.8" fill={c} fillOpacity="0.04"/>
          <path d={`M${x} 70 Q${x+5.5} 63 ${x+11} 70`} stroke={c} strokeWidth="0.9" fill={c} fillOpacity="0.08"/>
        </g>
      ))}
      <line x1="10" y1="60" x2="110" y2="60" stroke={c} strokeWidth="0.7" strokeDasharray="3 3"/>
    </svg>
  );

  // GOLDEN TEMPLE — Punjab / Chandigarh
  if (name.includes("punjab") || name.includes("chandigarh")) return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
      <rect x="5" y="76" width="110" height="12" rx="2" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.05"/>
      <line x1="5" y1="80" x2="115" y2="80" stroke={c} strokeWidth="0.6" strokeDasharray="5 4"/>
      <rect x="30" y="62" width="60" height="14" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.07"/>
      <rect x="38" y="44" width="44" height="18" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.07"/>
      <path d="M42 44 Q60 22 78 44" stroke={c} strokeWidth="1.5" fill={c} fillOpacity="0.1"/>
      <line x1="60" y1="22" x2="60" y2="14" stroke={c} strokeWidth="1.2"/>
      <path d="M56 18 L60 10 L64 18Z" fill={c} fillOpacity="0.6" stroke={c} strokeWidth="0.8"/>
      <circle cx="60" cy="9" r="2" fill={c} fillOpacity="0.8"/>
      <path d="M38 44 Q46 36 54 44" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.08"/>
      <path d="M66 44 Q74 36 82 44" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.08"/>
      {[30, 82].map((x, i) => (
        <g key={i}>
          <rect x={x} y={48} width={8} height={28} stroke={c} strokeWidth="1" fill={c} fillOpacity="0.05"/>
          <path d={`M${x} 48 Q${x+4} 40 ${x+8} 48`} stroke={c} strokeWidth="1" fill={c} fillOpacity="0.1"/>
          <line x1={x+4} y1="40" x2={x+4} y2="34" stroke={c} strokeWidth="0.9"/>
          <circle cx={x+4} cy="33" r="1.2" fill={c} fillOpacity="0.6"/>
        </g>
      ))}
      <rect x="57" y="62" width="6" height="14" fill={c} fillOpacity="0.12" stroke={c} strokeWidth="0.7"/>
      <path d="M46 62 Q46 52 60 52 Q74 52 74 62" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.07"/>
      <line x1="38" y1="50" x2="82" y2="50" stroke={c} strokeWidth="0.7" strokeDasharray="2 2"/>
    </svg>
  );

  // VICTORIA MEMORIAL — West Bengal
  if (name.includes("west bengal")) return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
      <rect x="8" y="84" width="104" height="5" rx="1" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.06"/>
      <rect x="14" y="79" width="92" height="5" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.05"/>
      <rect x="22" y="58" width="76" height="21" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.05"/>
      <rect x="10" y="64" width="18" height="15" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.04"/>
      <rect x="92" y="64" width="18" height="15" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.04"/>
      <rect x="44" y="42" width="32" height="16" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.06"/>
      <path d="M44 42 Q60 22 76 42" stroke={c} strokeWidth="1.5" fill={c} fillOpacity="0.1"/>
      <ellipse cx="60" cy="42" rx="10" ry="4" stroke={c} strokeWidth="0.9" fill={c} fillOpacity="0.07"/>
      <line x1="60" y1="22" x2="60" y2="14" stroke={c} strokeWidth="1.2"/>
      <rect x="57" y="12" width="6" height="4" stroke={c} strokeWidth="0.8" fill={c} fillOpacity="0.3"/>
      <circle cx="60" cy="11" r="1.5" fill={c} fillOpacity="0.7"/>
      {[22, 76].map((x, i) => (
        <g key={i}>
          <rect x={x} y={50} width={10} height={29} stroke={c} strokeWidth="1" fill={c} fillOpacity="0.04"/>
          <path d={`M${x} 50 Q${x+5} 42 ${x+10} 50`} stroke={c} strokeWidth="1" fill={c} fillOpacity="0.09"/>
          <line x1={x+5} y1="42" x2={x+5} y2="36" stroke={c} strokeWidth="0.9"/>
          <circle cx={x+5} cy="35" r="1.2" fill={c} fillOpacity="0.6"/>
        </g>
      ))}
      {[28,34,40,68,74,80].map(x => (
        <line key={x} x1={x} y1="58" x2={x} y2="79" stroke={c} strokeWidth="0.7" opacity="0.5"/>
      ))}
      <path d="M48 79 Q48 68 60 68 Q72 68 72 79" stroke={c} strokeWidth="1.1" fill={c} fillOpacity="0.07"/>
    </svg>
  );

  // KONARK SUN TEMPLE — Odisha
  if (name.includes("odisha")) return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
      <rect x="5" y="82" width="110" height="6" rx="1" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.06"/>
      <circle cx="25" cy="82" r="10" stroke={c} strokeWidth="1.2" fill="none"/>
      {[0,45,90,135].map(a => {
        const r = a * Math.PI / 180;
        return <line key={a} x1={25 + 4*Math.cos(r)} y1={82 + 4*Math.sin(r)} x2={25 + 10*Math.cos(r)} y2={82 + 10*Math.sin(r)} stroke={c} strokeWidth="0.8"/>;
      })}
      <circle cx="25" cy="82" r="3" stroke={c} strokeWidth="0.8" fill={c} fillOpacity="0.2"/>
      <circle cx="95" cy="82" r="10" stroke={c} strokeWidth="1.2" fill="none"/>
      {[0,45,90,135].map(a => {
        const r = a * Math.PI / 180;
        return <line key={a} x1={95 + 4*Math.cos(r)} y1={82 + 4*Math.sin(r)} x2={95 + 10*Math.cos(r)} y2={82 + 10*Math.sin(r)} stroke={c} strokeWidth="0.8"/>;
      })}
      <circle cx="95" cy="82" r="3" stroke={c} strokeWidth="0.8" fill={c} fillOpacity="0.2"/>
      <rect x="35" y="56" width="50" height="26" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.05"/>
      <rect x="40" y="46" width="40" height="10" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.06"/>
      <rect x="44" y="36" width="32" height="10" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.07"/>
      <rect x="48" y="26" width="24" height="10" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.08"/>
      <rect x="52" y="18" width="16" height="8" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.1"/>
      <rect x="56" y="12" width="8" height="6" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.12"/>
      <line x1="60" y1="12" x2="60" y2="6" stroke={c} strokeWidth="1.2"/>
      <circle cx="60" cy="5" r="2" fill={c} fillOpacity="0.7"/>
      <rect x="42" y="64" width="36" height="18" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.04"/>
      <path d="M48 82 Q48 72 60 72 Q72 72 72 82" stroke={c} strokeWidth="1.1" fill={c} fillOpacity="0.07"/>
    </svg>
  );

  // MYSORE PALACE — Karnataka
  if (name.includes("karnataka")) return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
      <rect x="5" y="84" width="110" height="5" rx="1" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.06"/>
      <rect x="15" y="60" width="90" height="24" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.05"/>
      <rect x="46" y="40" width="28" height="20" stroke={c} strokeWidth="1.1" fill={c} fillOpacity="0.06"/>
      <path d="M46 40 Q60 22 74 40" stroke={c} strokeWidth="1.4" fill={c} fillOpacity="0.1"/>
      <ellipse cx="60" cy="40" rx="8" ry="3" stroke={c} strokeWidth="0.9" fill={c} fillOpacity="0.07"/>
      <line x1="60" y1="22" x2="60" y2="14" stroke={c} strokeWidth="1.2"/>
      <path d="M57 17 L60 10 L63 17Z" fill={c} fillOpacity="0.6"/>
      <circle cx="60" cy="9" r="1.8" fill={c} fillOpacity="0.8"/>
      {[15, 77].map((x, i) => (
        <g key={i}>
          <rect x={x} y={48} width={14} height={36} stroke={c} strokeWidth="1" fill={c} fillOpacity="0.05"/>
          <path d={`M${x} 48 Q${x+7} 36 ${x+14} 48`} stroke={c} strokeWidth="1.1" fill={c} fillOpacity="0.1"/>
          <line x1={x+7} y1="36" x2={x+7} y2="28" stroke={c} strokeWidth="1"/>
          <circle cx={x+7} cy="27" r="1.3" fill={c} fillOpacity="0.7"/>
          <path d={`M${x+2} 70 Q${x+7} 62 ${x+12} 70`} stroke={c} strokeWidth="0.9" fill={c} fillOpacity="0.07"/>
        </g>
      ))}
      {[19,32,45,58,71,84].map(x => (
        <path key={x} d={`M${x} 84 Q${x+6} 74 ${x+12} 84`} stroke={c} strokeWidth="0.9" fill={c} fillOpacity="0.06"/>
      ))}
      <line x1="15" y1="72" x2="105" y2="72" stroke={c} strokeWidth="0.7"/>
      {[19,32,45,58,71,84].map(x => (
        <path key={x} d={`M${x} 72 Q${x+6} 64 ${x+12} 72`} stroke={c} strokeWidth="0.8" fill={c} fillOpacity="0.05"/>
      ))}
    </svg>
  );

  // SANCHI STUPA — Madhya Pradesh / Chhattisgarh
  if (name.includes("madhya pradesh") || name.includes("chhattisgarh")) return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
      <rect x="5" y="84" width="110" height="5" rx="1" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.06"/>
      <rect x="15" y="78" width="90" height="6" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.06"/>
      <rect x="22" y="70" width="76" height="8" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.07"/>
      <path d="M25 70 Q60 28 95 70Z" stroke={c} strokeWidth="1.4" fill={c} fillOpacity="0.08"/>
      <rect x="51" y="36" width="18" height="10" stroke={c} strokeWidth="1.1" fill={c} fillOpacity="0.1"/>
      <line x1="60" y1="36" x2="60" y2="14" stroke={c} strokeWidth="1.2"/>
      <ellipse cx="60" cy="22" rx="9" ry="2.5" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.08"/>
      <ellipse cx="60" cy="17" rx="6" ry="2" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.08"/>
      <ellipse cx="60" cy="13" rx="3.5" ry="1.5" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.1"/>
      {[22, 86].map((x, i) => (
        <g key={i}>
          <line x1={x} y1="54" x2={x} y2="70" stroke={c} strokeWidth="1.5"/>
          <line x1={x+8} y1="54" x2={x+8} y2="70" stroke={c} strokeWidth="1.5"/>
          <line x1={x-2} y1="58" x2={x+10} y2="58" stroke={c} strokeWidth="1.1"/>
          <line x1={x-2} y1="62" x2={x+10} y2="62" stroke={c} strokeWidth="1.1"/>
        </g>
      ))}
    </svg>
  );

  // MAHABODHI TEMPLE — Bihar
  if (name.includes("bihar")) return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
      <rect x="10" y="83" width="100" height="5" rx="1" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.06"/>
      <rect x="44" y="20" width="32" height="63" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.05"/>
      {[0,1,2,3,4].map(i => (
        <line key={i} x1={44+i*2} y1={20+i*5} x2={76-i*2} y2={20+i*5} stroke={c} strokeWidth="0.8"/>
      ))}
      <path d="M50 20 Q60 6 70 20" stroke={c} strokeWidth="1.3" fill={c} fillOpacity="0.1"/>
      <line x1="60" y1="6" x2="60" y2="2" stroke={c} strokeWidth="1.2"/>
      <circle cx="60" cy="1.5" r="2" fill={c} fillOpacity="0.7"/>
      {[28, 82].map(x => (
        <g key={x}>
          <rect x={x} y={56} width={14} height={27} stroke={c} strokeWidth="0.9" fill={c} fillOpacity="0.04"/>
          <path d={`M${x} 56 Q${x+7} 44 ${x+14} 56`} stroke={c} strokeWidth="1" fill={c} fillOpacity="0.08"/>
          <line x1={x+7} y1="44" x2={x+7} y2="38" stroke={c} strokeWidth="0.9"/>
          <circle cx={x+7} cy="37" r="1.2" fill={c} fillOpacity="0.5"/>
        </g>
      ))}
      {[30,45,60].map(y => (
        <path key={y} d={`M50 ${y+12} Q60 ${y+4} 70 ${y+12}`} stroke={c} strokeWidth="0.9" fill={c} fillOpacity="0.07"/>
      ))}
    </svg>
  );

  // HIMALAYAN MONASTERY — NE / J&K / HP / Uttarakhand
  if (name.includes("arunachal") || name.includes("sikkim") || name.includes("himachal") || name.includes("uttarakhand") || name.includes("jammu")) return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
      <path d="M0 70 L25 40 L50 65 L65 30 L80 55 L100 35 L120 55 L120 100 L0 100Z" fill={c} fillOpacity="0.04" stroke={c} strokeWidth="0.7"/>
      <rect x="30" y="56" width="60" height="27" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.07"/>
      <rect x="38" y="44" width="44" height="12" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.07"/>
      <rect x="44" y="34" width="32" height="10" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.08"/>
      <path d="M26 56 L94 56 L90 52 L30 52Z" fill={c} fillOpacity="0.1" stroke={c} strokeWidth="0.9"/>
      <path d="M34 44 L86 44 L82 40 L38 40Z" fill={c} fillOpacity="0.1" stroke={c} strokeWidth="0.9"/>
      <path d="M40 34 L80 34 L76 30 L44 30Z" fill={c} fillOpacity="0.1" stroke={c} strokeWidth="0.9"/>
      <rect x="52" y="22" width="16" height="8" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.1"/>
      <path d="M48 22 L72 22 L68 18 L52 18Z" fill={c} fillOpacity="0.12" stroke={c} strokeWidth="0.9"/>
      <line x1="60" y1="18" x2="60" y2="12" stroke={c} strokeWidth="1.2"/>
      <circle cx="60" cy="11" r="2" fill={c} fillOpacity="0.7"/>
      {[34,50,66,82].map(x => (
        <rect key={x} x={x} y={60} width={10} height={12} rx="1" stroke={c} strokeWidth="0.8" fill={c} fillOpacity="0.06"/>
      ))}
      <line x1="20" y1="30" x2="100" y2="22" stroke={c} strokeWidth="0.6" strokeDasharray="4 3"/>
    </svg>
  );

  // HARYANA — Kurukshetra/generic
  if (name.includes("haryana")) return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
      <rect x="5" y="82" width="110" height="6" rx="1" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.06"/>
      <rect x="18" y="64" width="84" height="18" stroke={c} strokeWidth="1.1" fill={c} fillOpacity="0.05"/>
      <rect x="32" y="48" width="56" height="16" stroke={c} strokeWidth="1.1" fill={c} fillOpacity="0.06"/>
      <path d="M44 48 Q60 28 76 48" stroke={c} strokeWidth="1.5" fill={c} fillOpacity="0.1"/>
      <ellipse cx="60" cy="48" rx="10" ry="3.5" stroke={c} strokeWidth="0.9" fill={c} fillOpacity="0.07"/>
      <line x1="60" y1="28" x2="60" y2="18" stroke={c} strokeWidth="1.2"/>
      <path d="M56 22 L60 14 L64 22Z" fill={c} fillOpacity="0.6"/>
      <circle cx="60" cy="13" r="2" fill={c} fillOpacity="0.8"/>
      {[18, 88].map(x => (
        <g key={x}>
          <rect x={x} y={50} width={10} height={32} stroke={c} strokeWidth="1" fill={c} fillOpacity="0.05"/>
          <path d={`M${x} 50 Q${x+5} 40 ${x+10} 50`} stroke={c} strokeWidth="1" fill={c} fillOpacity="0.1"/>
          <line x1={x+5} y1="40" x2={x+5} y2="32" stroke={c} strokeWidth="0.9"/>
          <circle cx={x+5} cy="31" r="1.2" fill={c} fillOpacity="0.6"/>
        </g>
      ))}
      {[34,47,60,73].map(x => (
        <path key={x} d={`M${x} 82 Q${x+7} 73 ${x+14} 82`} stroke={c} strokeWidth="0.9" fill={c} fillOpacity="0.06"/>
      ))}
      <line x1="18" y1="70" x2="102" y2="70" stroke={c} strokeWidth="0.7" strokeDasharray="3 2"/>
    </svg>
  );

  // DEFAULT — elegant generic Indian monument
  return (
    <svg width="120" height="100" viewBox="0 0 120 100" fill="none">
      <rect x="8" y="83" width="104" height="5" rx="1" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.06"/>
      <rect x="18" y="73" width="84" height="10" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.05"/>
      <rect x="36" y="50" width="48" height="23" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.05"/>
      <rect x="42" y="38" width="36" height="12" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.06"/>
      <rect x="47" y="26" width="26" height="12" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.07"/>
      <rect x="52" y="16" width="16" height="10" stroke={c} strokeWidth="1" fill={c} fillOpacity="0.08"/>
      <line x1="60" y1="16" x2="60" y2="8" stroke={c} strokeWidth="1.2"/>
      <circle cx="60" cy="7" r="2.5" fill={c} fillOpacity="0.7"/>
      {[18,26,34].map(x => <line key={x} x1={x} y1="63" x2={x} y2="83" stroke={c} strokeWidth="1" opacity="0.4"/>)}
      {[86,94,102].map(x => <line key={x} x1={x} y1="63" x2={x} y2="83" stroke={c} strokeWidth="1" opacity="0.4"/>)}
      <line x1="18" y1="63" x2="36" y2="63" stroke={c} strokeWidth="0.8"/>
      <line x1="84" y1="63" x2="102" y2="63" stroke={c} strokeWidth="0.8"/>
      <path d="M46 73 Q46 60 60 60 Q74 60 74 73" stroke={c} strokeWidth="1.2" fill={c} fillOpacity="0.07"/>
      <line x1="36" y1="56" x2="84" y2="56" stroke={c} strokeWidth="0.7" strokeDasharray="3 2"/>
    </svg>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const [states, setStates] = useState<StateWQI[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/lakes/states/wqi")
      .then((r) => r.ok ? r.json() : Promise.reject("Failed to fetch states"))
      .then((json) => {
        const allStates = json?.data ?? [];
        // Filter out states with null or undefined WQI (states with no monitoring points)
        const filteredStates = allStates.filter((state: StateWQI) => state.avg_wqi != null);
        setStates(filteredStates);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching states:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0d1117 0%, #161b27 40%, #0d1117 100%)" }}>
      <Navbar />

      {/* Hero Section */}
      <section className="relative px-6 md:px-12 py-16 md:py-24">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #1e90ff 0%, transparent 70%)" }}></div>
          <div className="absolute bottom-10 right-1/4 w-64 h-64 rounded-full opacity-8" style={{ background: "radial-gradient(circle, #00bcd4 0%, transparent 70%)" }}></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
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

          <div className="flex flex-wrap gap-3 mb-12">
            {["WQI", "pH", "DO", "BOD", "Turbidity", "TDS", "Nitrates", "Coliform"].map((param, i) => (
              <button key={param} className="px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200"
                style={i === 0 ? { background: "#1e90ff", color: "#fff", border: "1px solid #1e90ff" } : { background: "transparent", color: "#94a3b8", border: "1px solid #2a3347" }}>
                {param}
              </button>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row items-start gap-10">
            <div className="flex-1">
              <div className="grid grid-cols-3 gap-4 mb-10">
                {[
                  { value: "22", label: "Parameters", color: "#00e5ff" },
                  { value: "100+", label: "Monitoring Points", color: "#1e90ff" },
                  { value: "Live", label: "Real-Time Feed", color: "#00e676" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl p-5" style={{ background: "#161b27", border: "1px solid #1e2a3a" }}>
                    <div className="text-2xl font-bold mb-1" style={{ color: stat.color }}>{stat.value}</div>
                    <div className="text-xs text-slate-500">{stat.label}</div>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-widest mb-4">Trending Alerts</h3>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {[
                    { emoji: "⚠️", title: "High Turbidity", sub: "Narmada River, MP" },
                    { emoji: "✅", title: "Good WQI", sub: "Bhopal Upper Lake" },
                    { emoji: "🔴", title: "Low DO Level", sub: "Indore Pond Network" },
                  ].map((item) => (
                    <div key={item.title} className="flex-shrink-0 flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ background: "#1a2235", border: "1px solid #1e2a3a", minWidth: 200 }}>
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

            <div className="flex-shrink-0 w-full lg:w-80">
              <button onClick={() => navigate("/map/lake")}
                className="group w-full rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                style={{ background: "#111827", border: "1.5px solid #1e90ff", boxShadow: "0 0 0 4px rgba(30,144,255,0.12), 0 8px 40px rgba(0,0,0,0.7), 0 0 50px rgba(30,144,255,0.3)" }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ background: "rgba(30,144,255,0.08)", borderBottom: "1px solid rgba(30,144,255,0.2)" }}>
                  <div className="flex items-center gap-2">
                    <Map className="w-3.5 h-3.5" style={{ color: "#60a5fa" }} />
                    <span className="text-sm font-bold" style={{ color: "#60a5fa" }}>WQI Map</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.35)", color: "#4ade80" }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block"></span>
                    Live
                  </div>
                </div>
                <div className="relative overflow-hidden" style={{ height: 210 }}>
                  <svg className="w-full h-full" viewBox="0 0 320 210" xmlns="http://www.w3.org/2000/svg">
                    <rect width="320" height="210" fill="#0f172a"/>
                    <path d="M60 30 Q120 20 180 35 Q240 50 280 30 L280 130 Q240 110 180 120 Q120 130 60 115 Z" fill="#1e293b" opacity="0.6"/>
                    <path d="M0 80 Q50 70 100 85 Q150 100 200 80 Q250 60 320 75 L320 160 Q270 145 220 160 Q170 175 120 160 Q70 145 0 155 Z" fill="#1e3a5f" opacity="0.4"/>
                    <circle cx="130" cy="85" r="12" fill="#f59e0b" opacity="0.85"/><text x="130" y="89" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">62</text>
                    <circle cx="170" cy="92" r="11" fill="#f59e0b" opacity="0.85"/><text x="170" y="96" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">73</text>
                    <circle cx="220" cy="78" r="10" fill="#22c55e" opacity="0.85"/><text x="220" y="82" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">88</text>
                    <circle cx="260" cy="95" r="8" fill="#3b82f6" opacity="0.85"/><text x="260" y="99" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">91</text>
                    <circle cx="90" cy="145" r="8" fill="#ef4444" opacity="0.75"/><text x="90" y="149" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">38</text>
                    <circle cx="200" cy="135" r="9" fill="#22c55e" opacity="0.75"/><text x="200" y="139" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">82</text>
                    <rect x="0" y="188" width="320" height="22" fill="rgba(15,23,42,0.72)"/>
                    <circle cx="14" cy="199" r="4" fill="#ef4444"/><text x="22" y="203" fill="#cbd5e1" fontSize="7">Poor</text>
                    <circle cx="55" cy="199" r="4" fill="#eab308"/><text x="63" y="203" fill="#cbd5e1" fontSize="7">Fair</text>
                    <circle cx="93" cy="199" r="4" fill="#22c55e"/><text x="101" y="203" fill="#cbd5e1" fontSize="7">Good</text>
                    <circle cx="136" cy="199" r="4" fill="#3b82f6"/><text x="144" y="203" fill="#cbd5e1" fontSize="7">Excellent</text>
                  </svg>
                </div>
                <div style={{ height: "1px", background: "linear-gradient(90deg, rgba(30,144,255,0.05), rgba(30,144,255,0.4), rgba(30,144,255,0.05))" }}/>
                <div className="flex items-center justify-between px-5 py-4" style={{ background: "rgba(30,144,255,0.07)" }}>
                  <div>
                    <div className="text-sm font-bold text-white">Open Full Map</div>
                    <div className="text-xs mt-0.5" style={{ color: "#64748b" }}>View all monitoring points</div>
                  </div>
                  <div className="flex items-center justify-center rounded-full group-hover:translate-x-0.5 transition-transform duration-200"
                    style={{ background: "#1e90ff", width: 34, height: 34 }}>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7h8M7 3l4 4-4 4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </button>
              <div className="mt-3 flex items-center gap-1.5 text-slate-500 text-xs px-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="10" r="3" stroke="#64748b" strokeWidth="2"/><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#64748b" strokeWidth="2"/></svg>
                India · MP Region
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* States WQI Section */}
      <section className="relative px-6 md:px-12 py-16">
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="mb-8">
            <h2 className="text-4xl font-bold mb-2" style={{ color: "#ffffff" }}>India's States</h2>
            <p className="text-slate-400 text-lg">Average Water Quality Index</p>
          </div>

          {!loading && states.length > 0 ? (
            <div className="overflow-x-auto pb-4 scrollbar-hide">
              <div style={{
                display: "grid",
                gridTemplateRows: "1fr 1fr",
                gridAutoFlow: "column",
                gridAutoColumns: 260,
                gap: 14,
                padding: "18px 4px 8px",
                width: "max-content",
              }}>
                {states.map((state) => {
                  const wqiStatus = getWqiColor(state.avg_wqi);
                  const statePath = state.state_name.toLowerCase().replace(/\s+/g, "-");
                  return (
                    <div
                      key={state.state_id}
                      onClick={() => navigate(`/dashboard/india/${statePath}`)}
                      className="transition-all duration-300 cursor-pointer"
                      style={{
                        background: "#131c2e",
                        border: `1px solid ${wqiStatus.color}28`,
                        borderRadius: 16,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLDivElement;
                        el.style.borderColor = wqiStatus.color + "66";
                        el.style.transform = "translateY(-3px)";
                        el.style.boxShadow = `0 12px 40px rgba(0,0,0,0.6), 0 0 20px ${wqiStatus.color}18`;
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLDivElement;
                        el.style.borderColor = wqiStatus.color + "28";
                        el.style.transform = "";
                        el.style.boxShadow = "";
                      }}
                    >
                      {/* Illustration area — large, fills top of card */}
                      <div style={{
                        background: `linear-gradient(160deg, ${wqiStatus.color}0e 0%, #0d1520 100%)`,
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        height: 108,
                        padding: "8px 8px 0",
                        borderBottom: `1px solid ${wqiStatus.color}18`,
                        position: "relative",
                        overflow: "hidden",
                      }}>
                        {/* Subtle radial glow behind illustration */}
                        <div style={{
                          position: "absolute",
                          bottom: -24,
                          left: "50%",
                          transform: "translateX(-50%)",
                          width: 140,
                          height: 70,
                          borderRadius: "50%",
                          background: `radial-gradient(ellipse, ${wqiStatus.color}1a 0%, transparent 70%)`,
                          pointerEvents: "none",
                        }}/>
                        <StateLandmarkIllustration stateName={state.state_name} color={wqiStatus.color} />
                      </div>

                      {/* Info area */}
                      <div style={{ padding: "12px 16px 14px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", lineHeight: 1.3 }}>{state.state_name}</span>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.35, marginTop: 1, flexShrink: 0 }}>
                            <path d="M3 13h10V3H9" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M10 2l3 3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 700, color: wqiStatus.color, lineHeight: 1.1, marginBottom: 10 }}>
                          {state.avg_wqi ? Number(state.avg_wqi).toFixed(0) : "—"}
                        </div>
                        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 1 }}>Lat</div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: "#cbd5e1" }}>{state.lat?.toFixed(2) ?? "—"}</div>
                          </div>
                          <div style={{ width: 1, background: "#1e2a3a", alignSelf: "stretch" }}/>
                          <div>
                            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 1 }}>Lng</div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: "#cbd5e1" }}>{state.lng?.toFixed(2) ?? "—"}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-slate-400">Loading states...</div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40">
              <div className="text-slate-400">No state data available</div>
            </div>
          )}
        </div>
      </section>

      <style>{`
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}