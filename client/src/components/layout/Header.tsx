import { BellIcon, Search, LogOut, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onSidebarToggle: () => void;
}

export default function Header({ onSidebarToggle }: HeaderProps) {
  const [location, setLocation] = useLocation();
  const [searchParams, setSearchParams] = useSearch();
  const { user, logoutMutation } = useAuth();
  
  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const searchQuery = formData.get('search') as string;
    
    // Only apply search on students page
    if (location === '/students') {
      const params = new URLSearchParams(searchParams);
      params.set('search', searchQuery);
      setSearchParams(params.toString());
    } else {
      // Navigate to students page with search query
      setLocation(`/students?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <div className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
      <button 
        id="sidebar-toggle" 
        className="px-4 border-r border-gray-200 text-gray-500 md:hidden"
        onClick={onSidebarToggle}
      >
        <span className="sr-only">Open sidebar</span>
        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      
      <div className="flex-1 flex px-4 md:px-0">
        <div className="flex-1 flex items-center justify-between px-4 md:px-6">
          <div className="flex flex-1">
            <form className="w-full max-w-2xl" onSubmit={handleSearch}>
              <div className="relative text-gray-400 focus-within:text-gray-600">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5" />
                </div>
                <Input
                  id="search"
                  name="search"
                  className="block w-full pl-10 pr-3 py-2 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:placeholder-gray-400 sm:text-sm"
                  placeholder="Search for students..."
                  type="search"
                />
              </div>
            </form>
          </div>
          
          <div className="ml-4 flex items-center md:ml-6">
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">View notifications</span>
              <BellIcon className="h-6 w-6" />
            </Button>
            
            <div className="ml-3 relative">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="max-w-xs bg-white flex items-center text-sm rounded-full">
                      <span className="sr-only">Open user menu</span>
                      <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
                        <span className="font-medium">
                          {user.username.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span>{user.username}</span>
                        <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} disabled={logoutMutation.isPending} className="cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>{logoutMutation.isPending ? "Logging out..." : "Logout"}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild variant="default" size="sm">
                  <Link href="/auth">Login</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
