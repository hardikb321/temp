import { Link } from "react-router-dom";
import { ProfileDropdown } from "./ProfileDropdown";
import type { Marker } from "@/components/MyMap";

const mockUser = {
  name: "Hardik Sharma",
  email: "hardik.sharma@example.com",
  phone: "+91 98765 43210",
  userId: "WQA-2024-0042",
};

interface NavbarProps {
  onRejectedSessionResubmit?: (markers: Marker[]) => void;
}

export function Navbar({ onRejectedSessionResubmit }: NavbarProps) {
  return (
    <header className="w-full border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center justify-between h-14 px-6">
        <Link to="/dashboard" className="flex items-center gap-2 group">        
          <div className="font-semibold text-base bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Water Quality Monitor
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <ProfileDropdown user={mockUser} onRejectedSessionResubmit={onRejectedSessionResubmit} />
        </div>
      </div>
    </header>
  );
}
