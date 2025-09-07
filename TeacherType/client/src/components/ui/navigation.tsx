import { useLocation } from "wouter";
import { Link } from "wouter";
import logoUrl from "@assets/image_1756908725398.png";

export function AppNavigation() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Full Translator" },
    { href: "/streamlined", label: "Batch Mode" },
    { href: "/speech", label: "Speech Interface" }
  ];

  return (
    <header className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col">
          <div className="flex items-center space-x-3 mb-1">
            <img 
              src={logoUrl} 
              alt="Globalytix Logo" 
              className="h-12 w-auto"
            />
          </div>
          <p className="text-sm font-medium text-gray-600 italic">Breaking Barriers, Building Bridges</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-gray-600">Connected</span>
          </div>
        </div>
      </div>
      
      <nav className="flex gap-4 mb-4">
        {navItems.map((item) => (
          <Link 
            key={item.href}
            href={item.href} 
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              location === item.href 
                ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
                : "text-gray-500 hover:text-emerald-600 hover:bg-emerald-50"
            }`}
            data-testid={`nav-${item.href.slice(1) || 'home'}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}