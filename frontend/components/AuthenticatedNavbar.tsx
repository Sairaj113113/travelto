"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  LogOut,
  Plane,
  UserCircle,
} from "lucide-react";

export default function AuthenticatedNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  const pageNames: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/plan-trip": "Plan Trip",
    "/trips": "My Trips",
    "/itinerary": "Itinerary",
    "/ai-agent": "AI Travel Agent",
    "/bookings": "Bookings",
    "/budget": "Budget",
    "/travel-buddy": "Travel Buddy",
    "/travel-guides": "Local Guides",
    "/memories": "Travel Memories",
    "/profile": "Profile",
  };

  const currentPage =
    pageNames[pathname] ||
    Object.entries(pageNames).find(
      ([path]) => pathname.startsWith(`${path}/`)
    )?.[1] ||
    "Travelto";

  function handleLogout() {
    localStorage.removeItem("travelto_token");
    localStorage.removeItem("travelto_user");
    router.replace("/login");
  }

  return (
    <>
      <header className="tt-auth-navbar">
        <div className="tt-auth-navbar-inner">
          <Link
            href="/dashboard"
            className="tt-auth-logo"
            aria-label="Travelto Dashboard"
          >
            <span className="tt-auth-logo-icon">
              <Plane size={19} strokeWidth={2.5} />
            </span>

            <span className="tt-auth-logo-text">
              Travelto
            </span>
          </Link>

          <div className="tt-auth-current">
            {currentPage}
          </div>

          <nav className="tt-auth-nav">
            <Link
              href="/"
              className="tt-auth-link"
            >
              <Home size={15} />
              Home
            </Link>

            <Link
              href="/profile"
              className={`tt-auth-link ${
                pathname === "/profile" ? "active" : ""
              }`}
            >
              <UserCircle size={15} />
              Profile
            </Link>

            <button
              type="button"
              className="tt-auth-logout"
              onClick={handleLogout}
            >
              <LogOut size={15} />
              Logout
            </button>
          </nav>
        </div>
      </header>

      <style jsx global>{`
        .tt-auth-navbar {
          position: sticky;
          top: 0;
          z-index: 1000;
          width: 100%;
          height: 68px;
          background: rgba(255, 255, 255, 0.97);
          border-bottom: 1px solid #e2e8f0;
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }

        .tt-auth-navbar-inner {
          width: min(1380px, calc(100% - 56px));
          height: 100%;
          margin: 0 auto;
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .tt-auth-logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
          color: #0f172a;
          text-decoration: none;
        }

        .tt-auth-logo-icon {
          width: 39px;
          height: 39px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          color: white;
          background: linear-gradient(
            135deg,
            #0f766e,
            #10b981
          );
          box-shadow:
            0 7px 18px rgba(15, 118, 110, 0.18);
        }

        .tt-auth-logo-text {
          font-size: 21px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .tt-auth-current {
          height: 34px;
          display: inline-flex;
          align-items: center;
          padding: 0 12px;
          margin-left: 8px;
          border-radius: 9px;
          color: #0f766e;
          background: #ecfdf5;
          border: 1px solid #d1fae5;
          font-size: 12px;
          font-weight: 700;
        }

        .tt-auth-nav {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .tt-auth-link,
        .tt-auth-logout {
          height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 12px;
          border: 1px solid transparent;
          border-radius: 9px;
          color: #64748b;
          background: transparent;
          font-family: inherit;
          font-size: 12px;
          font-weight: 650;
          text-decoration: none;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .tt-auth-link:hover {
          color: #0f766e;
          background: #f0fdfa;
        }

        .tt-auth-link.active {
          color: #0f766e;
          background: #ecfdf5;
          border-color: #d1fae5;
        }

        .tt-auth-logout:hover {
          color: #dc2626;
          background: #fef2f2;
          border-color: #fecaca;
        }

        @media (max-width: 700px) {
          .tt-auth-navbar {
            height: 64px;
          }

          .tt-auth-navbar-inner {
            width: calc(100% - 24px);
            gap: 10px;
          }

          .tt-auth-logo-text {
            font-size: 19px;
          }

          .tt-auth-current {
            margin-left: 2px;
            padding: 0 9px;
            font-size: 11px;
          }

          .tt-auth-link,
          .tt-auth-logout {
            padding: 0 8px;
            font-size: 11px;
          }
        }

        @media (max-width: 500px) {
          .tt-auth-current {
            display: none;
          }

          .tt-auth-logo-text {
            display: none;
          }

          .tt-auth-link svg,
          .tt-auth-logout svg {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
