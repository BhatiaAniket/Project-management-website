import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const links = [
    { label: "About", href: "#about" },
    { label: "Features", href: "#features" },
    { label: "Roles", href: "#roles" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between h-20 px-6">
        {/* Logo */}
        <Link to="/" className="font-heading text-2xl font-bold tracking-tight text-foreground">
          CognifyPM
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-10">
          {links.map((link) => (
            <a key={link.label} href={link.href} className="nav-link">
              {link.label}
            </a>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          
          <div className="hidden md:block relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="inline-flex items-center px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-medium tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              Get Started
            </button>
            
            {/* Dropdown */}
            <div
              className={`absolute right-0 top-full mt-2 z-[1000] transition-all duration-200 pointer-events-none ${
                isDropdownOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-[6px]"
              }`}
            >
              <div className="absolute -top-[6px] right-6 w-3 h-3 rotate-45 border-l border-t bg-[#ffffff] border-[#D5D5CE] dark:bg-[#1A1A1A] dark:border-[#2A2A2A]" />
              <div className="w-48 rounded-[14px] border bg-[#ffffff] border-[#D5D5CE] shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:bg-[#1A1A1A] dark:border-[#2A2A2A] dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)] overflow-hidden">
                <button
                  onClick={() => navigate("/login")}
                  className="w-full text-left px-5 py-2.5 text-[15px] font-medium text-[#0D0D0D] dark:text-[#F5F5F0] hover:bg-[#F0F0EA] dark:hover:bg-[#252525] transition-colors duration-200"
                >
                  Login
                </button>
                <div className="h-px bg-[#D5D5CE] dark:bg-[#2A2A2A]" />
                <div className="p-2">
                  <button
                    onClick={() => navigate("/register")}
                    className="w-full text-center px-5 py-2 rounded-full text-[15px] font-medium bg-[#0D0D0D] text-white dark:bg-white dark:text-[#0D0D0D] hover:opacity-90 transition-opacity"
                  >
                    Sign Up
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span
              className={`block w-6 h-0.5 bg-foreground transition-all duration-300 ${
                menuOpen ? "rotate-45 translate-y-2" : ""
              }`}
            />
            <span
              className={`block w-6 h-0.5 bg-foreground transition-all duration-300 ${
                menuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block w-6 h-0.5 bg-foreground transition-all duration-300 ${
                menuOpen ? "-rotate-45 -translate-y-2" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-500 bg-background/95 backdrop-blur-xl ${
          menuOpen ? "max-h-80 border-b border-border" : "max-h-0"
        }`}
      >
        <div className="flex flex-col gap-4 px-6 py-6">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="nav-link text-lg"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <Link
            to="/login"
            className="nav-link text-lg"
            onClick={() => setMenuOpen(false)}
          >
            Login
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-medium"
            onClick={() => setMenuOpen(false)}
          >
            Sign Up
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
