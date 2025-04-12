import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { HomeIcon, UsersIcon, ClipboardListIcon, SettingsIcon, InfoIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  
  const navItems = [
    { href: "/", label: "Dashboard", icon: HomeIcon },
    { href: "/students", label: "Students", icon: UsersIcon },
    { href: "/reports", label: "Reports", icon: ClipboardListIcon },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ];
  
  const sidebarClass = cn(
    "md:flex md:flex-shrink-0 transition-all duration-300",
    isOpen 
      ? "fixed inset-0 z-40 flex"
      : "hidden"
  );
  
  return (
    <div id="sidebar" className={sidebarClass}>
      <div className="flex flex-col w-64 bg-gray-800">
        {/* Mobile sidebar close button */}
        {isOpen && (
          <div className="absolute top-0 right-0 -mr-12 pt-2 md:hidden">
            <button
              onClick={onClose}
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              <span className="sr-only">Close sidebar</span>
              <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center h-16 px-4 bg-gray-900">
          <span className="text-white text-xl font-semibold">Student Management</span>
        </div>
        
        {/* Nav Links */}
        <div className="flex flex-col flex-grow overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const ItemIcon = item.icon;
              
              return (
                <Link 
                  href={item.href} 
                  key={item.href}
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      onClose();
                    }
                  }}
                >
                  <a className={cn(
                    "flex items-center px-2 py-2 text-sm font-medium rounded-md group",
                    isActive 
                      ? "text-white bg-gray-900" 
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  )}>
                    <ItemIcon className={cn(
                      "mr-3 h-6 w-6",
                      isActive ? "text-gray-300" : "text-gray-400"
                    )} />
                    {item.label}
                  </a>
                </Link>
              );
            })}
          </nav>
          
          {/* Database Status */}
          <div className="p-4">
            <div className="bg-gray-700 rounded-md p-3">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <InfoIcon className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-white">Database Status</h3>
                  <div className="mt-1 text-xs text-gray-300">
                    <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-100">Connected</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
