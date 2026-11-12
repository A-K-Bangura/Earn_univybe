import { Link } from "react-router-dom";
import { Home, BookOpen, Library, User, MessageSquare } from "lucide-react";
import { useUIStore } from "../../store/uiStore";
import { useFeedTabStore } from "../../store/feedTabStore";
import { isAuthenticated } from "../../services/auth";
import {
  brandIconBlack160,
  brandIconWhite160,
  brandWordBlack,
  brandWordWhite,
} from "../../assets/brand";
import { GuestHeader } from "./GuestHeader";

export const TopNav = () => {
  const darkMode = useUIStore((state) => state.darkMode);
  const lastVisitedFeedTab = useFeedTabStore((state) => state.lastVisitedFeedTab);
  const authenticated = isAuthenticated();
  const logo = darkMode ? brandIconWhite160 : brandIconBlack160;
  const wordmark = darkMode ? brandWordWhite : brandWordBlack;

  // Guests get the landing page's header (desktop only; mobile guests keep
  // BottomNav). It's `fixed`, so reserve its height to keep content below it.
  if (!authenticated) {
    return (
      <>
        <GuestHeader variant="app" />
        <div aria-hidden className="hidden h-[65px] md:block" />
      </>
    );
  }

  const navItems = [
    { path: "/dashboard", icon: Home, label: "Home" },
    // Reopens whichever of Feed/Opportunities/Gigs was last visited this
    // session — see src/store/feedTabStore.ts and docs/DECISIONS.md.
    { path: lastVisitedFeedTab, key: "/feed", icon: MessageSquare, label: "Feed" },
    { path: "/courses", icon: BookOpen, label: "Courses" },
    { path: "/resources", icon: Library, label: "Resources" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="hidden md:flex top-0 sticky z-50 bg-white dark:bg-gray-800 shadow-md">
      <div className="max-w-7xl mx-auto w-full px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-1">
            <div className="w-20 h-10 rounded-lg flex items-center justify-center">
              <img
                src={logo.src}
                width={logo.width}
                height={logo.height}
                alt="logo"
                className="w-15 h-15"
              />
            </div>
            <img
              src={wordmark.src}
              width={wordmark.width}
              height={wordmark.height}
              alt="UniVybe"
              className="h-8 lg:h-12 w-auto"
            />
          </Link>

          {/* Navigation Links - Desktop */}
          <div className="flex-1 flex items-center justify-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.key ?? item.path}
                to={item.path}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-azure-500 dark:hover:text-azure-400 transition-colors"
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => useUIStore.getState().toggleDarkMode()}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode ? "🌙" : "☀️"}
          </button>
        </div>
      </div>
    </nav>
  );
};
