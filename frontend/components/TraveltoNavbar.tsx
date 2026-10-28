"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plane } from "lucide-react";

export default function TraveltoNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    {
      label: "Home",
      href: "/",
    },
    {
      label: "Plan Trip",
      href: "/plan-trip",
    },
    {
      label: "AI Agent",
      href: "/ai-agent",
    },
    {
      label: "Trips",
      href: "/trips",
    },
  ];

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function handleDashboard() {
    const token = localStorage.getItem("travelto_token");

    if (token) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }

  function handleSignIn() {
    const token = localStorage.getItem("travelto_token");

    if (token) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }

  return (
    <header className="travelto-navbar">
      <div className="travelto-navbar-inner">

        {/* =====================================================
            LOGO
        ====================================================== */}

        <Link
          href="/"
          className="travelto-navbar-logo"
          aria-label="Travelto Home"
        >
          <span className="travelto-navbar-logo-icon">
            <Plane size={20} strokeWidth={2.5} />
          </span>

          <span className="travelto-navbar-logo-text">
            Travelto
          </span>
        </Link>


        {/* =====================================================
            NAVIGATION
        ====================================================== */}

        <nav
          className="travelto-navbar-links"
          aria-label="Main navigation"
        >
          {navItems.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? "travelto-navbar-link active"
                    : "travelto-navbar-link"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>


        {/* =====================================================
            ACTIONS
        ====================================================== */}

        <div className="travelto-navbar-actions">

          <button
            type="button"
            className="travelto-navbar-signin"
            onClick={handleSignIn}
          >
            Sign In
          </button>

          <button
            type="button"
            className="travelto-navbar-dashboard"
            onClick={handleDashboard}
          >
            Dashboard
          </button>

        </div>

      </div>
    </header>
  );
}