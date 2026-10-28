"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";

import {
  LayoutDashboard,
  Map,
  CalendarDays,

  Wallet,
  Users,
  UserRound,
  Images,
  MapPin,
  Plus,
  ArrowRight,

  Plane,
  Menu,
  X,
  LogOut,
  Home,
  UserCircle,
  Clock3,
  Car,
  ChevronRight,
} from "lucide-react";

/* =========================================================
   API
========================================================= */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000";

/* =========================================================
   TYPES
========================================================= */

type User = {
  id: number;
  name: string;
  email: string;
};

type BackendTrip = {
  id: number;
  user_id: number;

  title: string;
  destination: string;

  start_date: string;
  end_date: string;

  travelers: number;
  budget: number;

  travel_style?: string | null;
  interests?: string | null;
  transport_preference?: string | null;

  status: string;

  created_at?: string;
  updated_at?: string;
};

type Trip = BackendTrip & {
  days: number;
};

/* =========================================================
   DESTINATION IMAGES
========================================================= */

function getTripImage(destination: string) {
  const place = destination.toLowerCase().trim();

  if (
    place.includes("araku") ||
    place.includes("arak") ||
    place.includes("visakhapatnam") ||
    place.includes("vizag")
  ) {
    return "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=85";
  }

  if (
    place.includes("hyderabad")
  ) {
    return "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1600&q=85";
  }

  if (
    place.includes("goa")
  ) {
    return "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1600&q=85";
  }

  if (
    place.includes("ooty") ||
    place.includes("coorg") ||
    place.includes("munnar")
  ) {
    return "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=85";
  }

  if (
    place.includes("kerala") ||
    place.includes("alleppey") ||
    place.includes("alappuzha")
  ) {
    return "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1600&q=85";
  }

  if (
    place.includes("manali") ||
    place.includes("shimla") ||
    place.includes("kashmir")
  ) {
    return "https://images.unsplash.com/photo-1486911278844-a81c5267e227?auto=format&fit=crop&w=1600&q=85";
  }

  if (
    place.includes("delhi") ||
    place.includes("agra") ||
    place.includes("jaipur")
  ) {
    return "https://images.unsplash.com/photo-1524498250077-390f9e378fc0?auto=format&fit=crop&w=1600&q=85";
  }

  if (
    place.includes("mumbai")
  ) {
    return "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1600&q=85";
  }

  if (
    place.includes("bangalore") ||
    place.includes("bengaluru")
  ) {
    return "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1600&q=85";
  }

  /* Default scenic travel image */
  return "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1600&q=85";
}

/* =========================================================
   HELPERS
========================================================= */

function calculateDays(
  startDate: string,
  endDate: string
) {
  const start = new Date(
    `${startDate}T00:00:00`
  );

  const end = new Date(
    `${endDate}T00:00:00`
  );

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return 1;
  }

  return Math.max(
    1,
    Math.round(
      (end.getTime() - start.getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1
  );
}

function mapTrip(
  trip: BackendTrip
): Trip {
  return {
    ...trip,
    budget: Number(trip.budget || 0),
    days: calculateDays(
      trip.start_date,
      trip.end_date
    ),
  };
}

function formatDate(date: string) {
  const parsed = new Date(
    `${date}T00:00:00`
  );

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatBudget(value: number) {
  return `₹${Number(value || 0).toLocaleString(
    "en-IN"
  )}`;
}

function getStatusLabel(
  status: string
) {
  switch (status) {
    case "planned":
      return "Planned";

    case "active":
      return "Active";

    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    case "draft":
      return "Draft";

    default:
      return status || "Planned";
  }
}

function getStatusClass(
  status: string
) {
  switch (status) {
    case "active":
      return "active";

    case "completed":
      return "completed";

    case "cancelled":
      return "cancelled";

    case "draft":
      return "draft";

    default:
      return "planned";
  }
}

/* =========================================================
   DASHBOARD
========================================================= */

export default function DashboardPage() {
  const [user, setUser] =
    useState<User | null>(null);

  const [trips, setTrips] =
    useState<Trip[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [mobileSidebar, setMobileSidebar] =
    useState(false);

  /* =======================================================
     LOAD DASHBOARD
  ======================================================= */

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const token =
        localStorage.getItem(
          "travelto_token"
        );

      if (!token) {
        window.location.replace("/login");
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [
        userResponse,
        tripsResponse,
      ] = await Promise.all([
        fetch(
          `${API_URL}/auth/me`,
          {
            headers,
          }
        ),

        fetch(
          `${API_URL}/trips/`,
          {
            headers,
          }
        ),
      ]);

      if (
        !userResponse.ok ||
        userResponse.status === 401
      ) {
        localStorage.removeItem(
          "travelto_token"
        );

        localStorage.removeItem(
          "travelto_user"
        );

        window.location.replace("/login");

        return;
      }

      const userData =
        await userResponse.json();

      setUser(userData);

      if (!tripsResponse.ok) {
        throw new Error(
          "Unable to load trips"
        );
      }

      const data =
        await tripsResponse.json();

      const allTrips: Trip[] =
        Array.isArray(data)
          ? data.map(mapTrip)
          : [];

      setTrips(allTrips);
    } catch (err) {
      console.error(
        "Dashboard error:",
        err
      );

      setError(
        "Unable to load your travel data. Please refresh the page."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     LOGOUT
  ======================================================= */

  function logout() {
    localStorage.removeItem(
      "travelto_token"
    );

    localStorage.removeItem(
      "travelto_user"
    );

    window.location.replace("/login");
  }

  /* =======================================================
     USER
  ======================================================= */

  const firstName =
    user?.name
      ?.trim()
      .split(/\s+/)[0] ||
    "Traveler";

  /* =======================================================
     SORT
  ======================================================= */

  const sortedTrips = useMemo(() => {
    return [...trips].sort(
      (a, b) =>
        new Date(
          `${a.start_date}T00:00:00`
        ).getTime() -
        new Date(
          `${b.start_date}T00:00:00`
        ).getTime()
    );
  }, [trips]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="tt-loading">
        <div className="tt-loading-icon">
          <Plane size={24} />
        </div>

        <div className="tt-loader" />

        <p>
          Preparing your Travelto dashboard...
        </p>

        <style jsx>{`
          .tt-loading {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 14px;
            background:
              linear-gradient(
                180deg,
                #edf8f5,
                #f8fbfb
              );
            color: #64748b;
            font-family:
              Arial,
              Helvetica,
              sans-serif;
          }

          .tt-loading-icon {
            width: 55px;
            height: 55px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 15px;
            color: white;
            background:
              linear-gradient(
                135deg,
                #0f766e,
                #10b981
              );
            box-shadow:
              0 10px 25px
              rgba(
                15,
                118,
                110,
                0.18
              );
          }

          .tt-loader {
            width: 21px;
            height: 21px;
            border:
              2px solid #cde5e1;
            border-top-color:
              #0f766e;
            border-radius: 50%;
            animation:
              spin 0.8s linear infinite;
          }

          .tt-loading p {
            margin: 0;
            font-size: 13px;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="tt-dashboard">

      {/* =================================================
          NAVBAR
      ================================================= */}

      <header className="tt-navbar">

        <div className="tt-navbar-left">

          <button
            className="tt-mobile-menu"
            onClick={() =>
              setMobileSidebar(true)
            }
          >
            <Menu size={21} />
          </button>

          <Link
            href="/dashboard"
            className="tt-logo"
          >
            <span className="tt-logo-icon">
              <Plane
                size={18}
                strokeWidth={2.6}
              />
            </span>

            <span className="tt-logo-text">
              Travelto
            </span>
          </Link>

          <span className="tt-dashboard-pill">
            Dashboard
          </span>

        </div>

        <nav className="tt-navbar-links">

          <Link
            href="/"
            className="tt-navbar-link"
          >
            <Home size={15} />
            Home
          </Link>

          <Link
            href="/profile"
            className="tt-navbar-link"
          >
            <UserCircle size={15} />
            Profile
          </Link>

          <button
            className="tt-navbar-logout"
            onClick={logout}
          >
            <LogOut size={15} />
            Logout
          </button>

        </nav>

      </header>

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside
        className={`tt-sidebar ${
          mobileSidebar
            ? "tt-sidebar-open"
            : ""
        }`}
      >

        <div className="tt-sidebar-header">

          <div>
            <span>
              WORKSPACE
            </span>

            <h3>
              Travelto
            </h3>
          </div>

          <button
            className="tt-sidebar-close"
            onClick={() =>
              setMobileSidebar(false)
            }
          >
            <X size={19} />
          </button>

        </div>

        {/* MAIN */}

        <div className="tt-sidebar-section">

          <span className="tt-sidebar-title">
            MAIN
          </span>

          <nav>

            <SidebarItem
              href="/dashboard"
              icon={
                <LayoutDashboard
                  size={18}
                />
              }
              label="Dashboard"
              active
              closeSidebar={() =>
                setMobileSidebar(false)
              }
            />

            <SidebarItem
              href="/plan-trip"
              icon={
                <Map size={18} />
              }
              label="Plan Trip"
              closeSidebar={() =>
                setMobileSidebar(false)
              }
            />
</nav>

        </div>

        {/* TRAVEL TOOLS */}

        <div className="tt-sidebar-section">

          <span className="tt-sidebar-title">
            TRAVEL TOOLS
          </span>

          <nav>


            <SidebarItem
              href="/travel-guides"
              icon={
                <UserRound size={18} />
              }
              label="Local Guides"
              closeSidebar={() =>
                setMobileSidebar(false)
              }
            />

            <SidebarItem
              href="/memories"
              icon={
                <Images size={18} />
              }
              label="Travel Memories"
              closeSidebar={() =>
                setMobileSidebar(false)
              }
            />

          </nav>

        </div>

        {/* BOTTOM */}

        <div className="tt-sidebar-bottom">
<button
            className="tt-sidebar-logout"
            onClick={logout}
          >
            <LogOut size={17} />
            Logout
          </button>

        </div>

      </aside>

      {/* MOBILE BACKDROP */}

      {mobileSidebar && (
        <button
          className="tt-sidebar-backdrop"
          onClick={() =>
            setMobileSidebar(false)
          }
        />
      )}

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="tt-main">

        <div className="tt-container">

          {/* =================================================
              WELCOME
          ================================================= */}

          <section className="tt-welcome">

            <div>

              <span className="tt-eyebrow">
                YOUR TRAVEL SPACE
              </span>

              <h1>
                Good morning,{" "}
                <span>
                  {firstName}
                </span>{" "}
                👋
              </h1>

              <p>
                Plan, manage and enjoy
                your journeys from one place.
              </p>

            </div>

            <Link
              href="/plan-trip"
              className="tt-plan-button"
            >
              <Plus size={18} />
              Plan New Trip
            </Link>

          </section>

          {/* ERROR */}

          {error && (
            <div className="tt-error">

              <div>
                <strong>
                  Something went wrong
                </strong>

                <p>
                  {error}
                </p>
              </div>

              <button
                onClick={loadDashboard}
              >
                Try Again
              </button>

            </div>
          )}

          {/* =================================================
              MY TRIPS
          ================================================= */}

          <section className="tt-trips-section">

            <div className="tt-section-heading">

              <div>

                <span>
                  YOUR JOURNEYS
                </span>

                <h2>
                  My Trips
                </h2>

              </div>

              {sortedTrips.length > 0 && (
                <div className="tt-trip-count">
                  {sortedTrips.length}{" "}
                  {sortedTrips.length === 1
                    ? "trip"
                    : "trips"}{" "}
                  saved
                </div>
              )}

            </div>

            {/* EMPTY */}

            {sortedTrips.length === 0 ? (

              <div className="tt-empty">

                <div className="tt-empty-icon">
                  <Plane size={25} />
                </div>

                <div className="tt-empty-content">

                  <h3>
                    Your next adventure
                    starts here
                  </h3>

                  <p>
                    Tell Travelto where
                    you want to go and let
                    AI build your
                    personalized itinerary.
                  </p>

                </div>

                <Link
                  href="/plan-trip"
                  className="tt-empty-button"
                >
                  Plan My Trip
                  <ArrowRight size={15} />
                </Link>

              </div>

            ) : (

              <div className="tt-trips-list">

                {sortedTrips.map(
                  (trip, index) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      index={index}
                    />
                  )
                )}

              </div>

            )}

          </section>
{/* FOOTER */}

          <footer className="tt-footer">

            <span>
              © 2026 Travelto
            </span>

            <span>
              Plan smarter. Travel better.
            </span>

          </footer>

        </div>

      </main>

      {/* =================================================
          GLOBAL CSS
      ================================================= */}

      <style jsx global>{`

        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
        }

        body {
          background: #f2f8f7;
        }

        /* =================================================
           DASHBOARD
        ================================================= */

        .tt-dashboard {
          min-height: 100vh;
          color: #0f172a;

          background:
            linear-gradient(
              180deg,
              #edf8f6 0%,
              #f7fbfa 45%,
              #edf6f4 100%
            );

          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        /* =================================================
           NAVBAR
        ================================================= */

        .tt-navbar {
          position: sticky;
          top: 0;
          z-index: 1100;

          height: 68px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 0 28px;

          background: rgba(
            255,
            255,
            255,
            0.96
          );

         
          border-bottom:
            1px solid #d4e3e1;

          box-shadow:
            0 4px 18px
            rgba(
              15,
              118,
              110,
              0.07
            );
        }

        .tt-navbar::before {
          content: "";

          position: absolute;

          top: 0;
          left: 0;
          right: 0;

          height: 3px;

          background:
            linear-gradient(
              90deg,
              #0f766e,
              #10b981,
              #5eead4
            );
        }

        .tt-navbar-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .tt-logo {
          display: flex;
          align-items: center;
          gap: 10px;

          color: #0f172a;
          text-decoration: none;
        }

        .tt-logo-icon {
          width: 39px;
          height: 39px;

          display: flex;
          align-items: center;
          justify-content: center;

          color: white;

          border-radius: 11px;

          background:
            linear-gradient(
              135deg,
              #0f766e,
              #10b981
            );

          box-shadow:
            0 8px 18px
            rgba(
              15,
              118,
              110,
              0.18
            );
        }

        .tt-logo-text {
          font-size: 21px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .tt-dashboard-pill {
          display: flex;
          align-items: center;

          height: 34px;
          padding: 0 13px;

          color: #0f766e;
          background: #e9f8f5;

          border:
            1px solid #bfe8df;

          border-radius: 9px;

          font-size: 12px;
          font-weight: 750;
        }

        .tt-navbar-links {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .tt-navbar-link,
        .tt-navbar-logout {
          height: 38px;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 7px;
          padding: 0 12px;

          border:
            1px solid transparent;

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

        .tt-navbar-link:hover {
          color: #0f766e;
          background: #eaf8f5;
        }

        .tt-navbar-logout:hover {
          color: #dc2626;
          background: #fef2f2;
          border-color: #fecaca;
        }

        .tt-mobile-menu {
          display: none;

          width: 38px;
          height: 38px;

          align-items: center;
          justify-content: center;

          border:
            1px solid #d7e4e2;

          border-radius: 9px;

          color: #475569;
          background: white;

          cursor: pointer;
        }

        /* =================================================
           SIDEBAR
        ================================================= */

        .tt-sidebar {
          position: fixed;

          left: 0;
          top: 68px;
          bottom: 0;

          z-index: 1000;

          width: 245px;

          display: flex;
          flex-direction: column;

          padding: 25px 15px 16px;

          overflow-y: auto;

          background:
            linear-gradient(
              180deg,
              #f2faf8 0%,
              #f7fbfa 48%,
              #eef7f5 100%
            );

          border-right:
            1px solid #c7ddda;

          box-shadow:
            5px 0 24px
            rgba(
              15,
              118,
              110,
              0.055
            );
        }

        .tt-sidebar::before {
          content: "";

          position: absolute;

          top: 0;
          left: 0;
          right: 0;

          height: 7px;

          background:
            linear-gradient(
              90deg,
              #0f766e,
              #10b981,
              #5eead4
            );
        }

        .tt-sidebar-header {
          position: relative;
          z-index: 1;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding:
            0 10px 19px;

          border-bottom:
            1px solid #d6e7e4;
        }

        .tt-sidebar-header span {
          display: block;
          margin-bottom: 4px;

          color: #819995;

          font-size: 9px;
          font-weight: 800;

          letter-spacing: 1.5px;
        }

        .tt-sidebar-header h3 {
          margin: 0;

          color: #0f172a;

          font-size: 15px;
          font-weight: 800;
        }

        .tt-sidebar-close {
          display: none;

          width: 34px;
          height: 34px;

          align-items: center;
          justify-content: center;

          border:
            1px solid #dbe5e3;

          border-radius: 8px;

          color: #64748b;
          background: white;
        }

        .tt-sidebar-section {
          position: relative;
          z-index: 1;

          margin-top: 22px;
        }

        .tt-sidebar-title {
          display: block;

          padding: 0 10px;
          margin-bottom: 8px;

          color: #8ba19e;

          font-size: 9px;
          font-weight: 800;

          letter-spacing: 1.4px;
        }

        .tt-sidebar-section nav {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .tt-sidebar-item {
          position: relative;

          min-height: 43px;

          display: flex;
          align-items: center;

          gap: 12px;

          padding: 0 12px;

          border-radius: 10px;

          color: #526477;

          font-size: 13px;
          font-weight: 650;

          text-decoration: none;

          transition: 0.18s ease;
        }

        .tt-sidebar-item:hover {
          color: #0f766e;

          background:
            linear-gradient(
              90deg,
              #e5f7f3,
              #f0faf8
            );

          transform:
            translateX(2px);
        }

        .tt-sidebar-item.active {
          color: #0b6b64;

          background:
            linear-gradient(
              90deg,
              #d9f3ed,
              #ecfaf7
            );

          border:
            1px solid #bde7dd;

          font-weight: 800;
        }

        .tt-sidebar-item.active::before {
          content: "";

          position: absolute;

          left: 0;
          top: 8px;
          bottom: 8px;

          width: 3px;

          border-radius:
            0 5px 5px 0;

          background:
            linear-gradient(
              180deg,
              #0f766e,
              #10b981
            );
        }

        .tt-sidebar-bottom {
          position: relative;
          z-index: 1;

          margin-top: auto;

          padding-top: 16px;

          border-top:
            1px solid #d7e8e5;
        }

        .tt-ai-mini {
          display: grid;

          grid-template-columns:
            34px 1fr 15px;

          align-items: center;

          gap: 9px;

          padding: 10px;
          margin-bottom: 9px;

          border:
            1px solid #c1e9df;

          border-radius: 12px;

          color: #0f172a;

          background:
            linear-gradient(
              135deg,
              #e8faf5,
              #f6fcfa
            );

          text-decoration: none;
        }

        .tt-ai-mini-icon {
          width: 34px;
          height: 34px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 9px;

          color: #0f766e;
          background: white;

          border:
            1px solid #d2eee8;
        }

        .tt-ai-mini strong {
          display: block;

          margin-bottom: 2px;

          color: #164e63;
          font-size: 11px;
        }

        .tt-ai-mini span {
          display: block;

          color: #7b8b98;
          font-size: 9px;
        }

        .tt-ai-mini > svg {
          color: #0f766e;
        }

        .tt-sidebar-logout {
          width: 100%;
          min-height: 40px;

          display: flex;
          align-items: center;

          gap: 11px;
          padding: 0 11px;

          border: 0;
          border-radius: 9px;

          color: #64748b;
          background: transparent;

          font-family: inherit;
          font-size: 12px;
          font-weight: 650;

          cursor: pointer;
          text-align: left;
        }

        .tt-sidebar-logout:hover {
          color: #dc2626;
          background: #fef2f2;
        }

        .tt-sidebar-backdrop {
          display: none;
        }

        /* =================================================
           MAIN
        ================================================= */

        .tt-main {
          min-height:
            calc(100vh - 68px);

          margin-left: 245px;
        }

        .tt-container {
          position: relative;

          width:
            min(
              1320px,
              calc(100% - 56px)
            );

          margin: 0 auto;

          padding:
            38px 0 48px;
        }

        /* =================================================
           WELCOME
        ================================================= */

        .tt-welcome {
          display: flex;

          align-items: flex-end;
          justify-content: space-between;

          gap: 30px;

          margin-bottom: 43px;
        }

        .tt-eyebrow {
          display: block;

          color: #0f766e;

          font-size: 9px;
          font-weight: 850;

          letter-spacing: 1.7px;
        }

        .tt-welcome h1 {
          margin:
            8px 0 7px;

          color: #0f172a;

          font-size:
            clamp(
              31px,
              3vw,
              44px
            );

          line-height: 1.08;
          letter-spacing: -1.6px;
          font-weight: 850;
        }

        .tt-welcome h1 span {
          color: #0f766e;
        }

        .tt-welcome p {
          margin: 0;

          color: #64748b;
          font-size: 13px;
        }

        .tt-plan-button {
          min-height: 43px;

          display: inline-flex;

          align-items: center;
          justify-content: center;

          gap: 7px;
          padding: 0 17px;

          border-radius: 10px;

          color: white;

          background:
            linear-gradient(
              135deg,
              #0f766e,
              #0d9488
            );

          box-shadow:
            0 9px 20px
            rgba(
              15,
              118,
              110,
              0.17
            );

          font-size: 12px;
          font-weight: 750;

          text-decoration: none;

          white-space: nowrap;

          transition: 0.2s ease;
        }

        .tt-plan-button:hover {
          transform:
            translateY(-2px);

          box-shadow:
            0 12px 24px
            rgba(
              15,
              118,
              110,
              0.23
            );
        }

        /* =================================================
           ERROR
        ================================================= */

        .tt-error {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 20px;

          padding: 15px 17px;
          margin-bottom: 22px;

          border:
            1px solid #fecaca;

          border-radius: 12px;

          background: #fff7f7;
          color: #991b1b;
        }

        .tt-error strong {
          display: block;
          margin-bottom: 3px;
          font-size: 12px;
        }

        .tt-error p {
          margin: 0;
          color: #b45353;
          font-size: 11px;
        }

        .tt-error button {
          min-height: 34px;

          padding: 0 12px;

          border:
            1px solid #fca5a5;

          border-radius: 8px;

          color: #991b1b;
          background: white;

          font-size: 11px;
          font-weight: 700;

          cursor: pointer;
        }

        /* =================================================
           TRIPS
        ================================================= */

        .tt-trips-section {
          margin-bottom: 39px;
        }

        .tt-section-heading {
          position: relative;

          display: flex;

          align-items: flex-end;
          justify-content: space-between;

          gap: 20px;

          margin-bottom: 20px;
        }

        .tt-section-heading::after {
          content: "";

          position: absolute;

          left: 0;
          bottom: -9px;

          width: 36px;
          height: 3px;

          border-radius: 99px;

          background:
            linear-gradient(
              90deg,
              #10b981,
              #2dd4bf
            );
        }

        .tt-section-heading
          > div:first-child
          > span {
          display: block;

          color: #0f766e;

          font-size: 9px;
          font-weight: 850;

          letter-spacing: 1.7px;
        }

        .tt-section-heading h2 {
          margin:
            6px 0 0;

          color: #0f172a;

          font-size: 25px;

          line-height: 1.1;

          letter-spacing: -0.7px;
        }

        .tt-trip-count {
          padding:
            6px 10px;

          border-radius: 99px;

          color: #0f766e;

          background: #e8f8f4;

          border:
            1px solid #c6e9e1;

          font-size: 10px;
          font-weight: 750;
        }

        .tt-trips-list {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        /* =================================================
           TRIP CARD
        ================================================= */

        .tt-trip-card {
          position: relative;

          display: grid;

          grid-template-columns:
            270px
            minmax(0, 1fr);

          min-height: 220px;

          overflow: hidden;

          background: white;

          border:
            1px solid #cfe2df;

          border-radius: 17px;

          box-shadow:
            0 10px 28px
            rgba(
              15,
              118,
              110,
              0.065
            );

          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            border-color 0.2s ease;
        }

        .tt-trip-card:hover {
          transform:
            translateY(-2px);

          border-color:
            #a8d5ce;

          box-shadow:
            0 16px 35px
            rgba(
              15,
              118,
              110,
              0.10
            );
        }

        .tt-trip-card::before {
          content: "";

          position: absolute;

          z-index: 10;

          top: 0;
          left: 0;
          right: 0;

          height: 4px;

          background:
            linear-gradient(
              90deg,
              #0f766e,
              #10b981,
              #5eead4
            );
        }

        /* =================================================
           LEFT IMAGE
        ================================================= */

        .tt-trip-visual {
          position: relative;

          min-height: 220px;

          overflow: hidden;

          background:
            #0f766e;
        }

        .tt-trip-visual-image {
          position: absolute;

          inset: 0;

          width: 100%;
          height: 100%;

          object-fit: cover;

          transform:
            scale(1.04);

          transition:
            transform 0.45s ease;
        }

        .tt-trip-card:hover
          .tt-trip-visual-image {
          transform:
            scale(1.09);
        }

        .tt-trip-visual::after {
          content: "";

          position: absolute;

          inset: 0;

          background:
            linear-gradient(
              180deg,
              rgba(
                15,
                23,
                42,
                0.02
              ) 15%,
              rgba(
                15,
                23,
                42,
                0.20
              ) 48%,
              rgba(
                15,
                23,
                42,
                0.82
              ) 100%
            );
        }

        .tt-trip-visual-content {
          position: absolute;

          z-index: 4;

          left: 21px;
          right: 21px;
          bottom: 20px;

          color: white;
        }

        .tt-trip-number {
          display: inline-flex;

          padding:
            5px 8px;

          margin-bottom: 8px;

          border-radius: 99px;

          color: white;

          background:
            rgba(
              255,
              255,
              255,
              0.18
            );

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.28
            );

          backdrop-filter:
            blur(8px);

          font-size: 9px;
          font-weight: 800;
        }

        .tt-trip-visual-content h3 {
          margin:
            0 0 5px;

          font-size: 24px;

          letter-spacing: -0.6px;
        }

        .tt-trip-visual-content p {
          display: flex;

          align-items: center;

          gap: 5px;

          margin: 0;

          color:
            rgba(
              255,
              255,
              255,
              0.86
            );

          font-size: 10px;
        }

        /* =================================================
           RIGHT TRIP DETAILS + BLURRED DESTINATION IMAGE
        ================================================= */

        .tt-trip-body {
          position: relative;
          isolation: isolate;

          min-width: 0;
          min-height: 220px;

          overflow: hidden;

          padding: 22px 24px;

          background: #eef6f4;
        }

        /* =================================================
           ACTUAL BLURRED DESTINATION IMAGE
        ================================================= */

        .tt-trip-blur-image {
          position: absolute;

          z-index: 0;

          top: -34px;
          right: -34px;
          bottom: -34px;
          left: -34px;

          background-repeat: no-repeat;
          background-position: center;
          background-size: cover;

          opacity: 0.68;
          filter: blur(18px);
          transform: scale(1.12);
          pointer-events: none;
        }

        /* =================================================
           SOFT GLASS OVERLAY
        ================================================= */

        .tt-trip-glass {
          position: absolute;

          z-index: 1;

          inset: 0;

          background:
            linear-gradient(
              90deg,
              rgba(248, 252, 251, 0.46) 0%,
              rgba(248, 252, 251, 0.34) 50%,
              rgba(248, 252, 251, 0.48) 100%
            );

          backdrop-filter: blur(2px);
          -webkit-backdrop-filter: blur(2px);

          pointer-events: none;
        }

        /* =================================================
           CONTENT ABOVE IMAGE + GLASS
        ================================================= */

        .tt-trip-content {
          position: relative;

          z-index: 5;

          min-height: 220px;

          display: flex;

          flex-direction: column;

          padding: 0;
        }

        /* =================================================
           TRIP TOP
        ================================================= */

        .tt-trip-top {
          display: flex;

          align-items: flex-start;

          justify-content:
            space-between;

          gap: 15px;
        }

        .tt-trip-title {
          margin:
            0 0 5px;

          color: #0f172a;

          font-size: 20px;

          font-weight: 850;

          letter-spacing: -0.5px;
        }

        .tt-trip-destination {
          display: flex;

          align-items: center;

          gap: 5px;

          color: #64748b;

          font-size: 11px;
        }

        /* =================================================
           STATUS
        ================================================= */

        .tt-trip-status {
          display: inline-flex;

          align-items: center;

          gap: 6px;

          padding:
            7px 10px;

          border-radius: 99px;

          font-size: 9px;
          font-weight: 800;

          white-space: nowrap;

          backdrop-filter:
            blur(8px);
        }

        .tt-trip-status::before {
          content: "";

          width: 6px;
          height: 6px;

          border-radius: 50%;

          background:
            currentColor;
        }

        .tt-trip-status.planned {
          color: #0f766e;

          background:
            rgba(
              229,
              250,
              245,
              0.90
            );

          border:
            1px solid
            rgba(
              167,
              230,
              220,
              0.9
            );
        }

        .tt-trip-status.active {
          color: #047857;

          background:
            rgba(
              220,
              252,
              231,
              0.90
            );
        }

        .tt-trip-status.completed {
          color: #2563eb;

          background:
            rgba(
              239,
              246,
              255,
              0.90
            );
        }

        .tt-trip-status.cancelled {
          color: #dc2626;

          background:
            rgba(
              254,
              242,
              242,
              0.90
            );
        }

        .tt-trip-status.draft {
          color: #64748b;

          background:
            rgba(
              241,
              245,
              249,
              0.90
            );
        }

        /* =================================================
           META CARDS
        ================================================= */

        .tt-trip-meta {
          display: grid;

          grid-template-columns:
            repeat(4, 1fr);

          gap: 10px;

          margin-top: 19px;
        }

  .tt-trip-meta-item {
  min-width: 0;

  min-height: 74px;

  padding: 11px 12px;

  border:
    1px solid
    rgba(205, 226, 222, 0.95);

  border-radius: 11px;

  background:
    rgba(255, 255, 255, 0.88);

  backdrop-filter:
    blur(6px);

  -webkit-backdrop-filter:
    blur(6px);

  box-shadow:
    0 3px 12px
    rgba(15, 118, 110, 0.025);
}

        .tt-trip-meta-icon {
          display: flex;

          align-items: center;

          color: #0f766e;

          margin-bottom: 6px;
        }

        .tt-trip-meta-label {
          display: block;

          margin-bottom: 3px;

          color: #8b9c99;

          font-size: 8px;

          font-weight: 800;

          text-transform:
            uppercase;

          letter-spacing: 0.6px;
        }

        .tt-trip-meta-value {
          display: block;

          overflow: hidden;

          color: #0f172a;

          font-size: 11px;

          font-weight: 800;

          text-overflow:
            ellipsis;

          white-space:
            nowrap;
        }

        /* =================================================
           BOTTOM
        ================================================= */

        .tt-trip-bottom {
          display: flex;

          align-items: center;

          justify-content:
            space-between;

          gap: 15px;

          margin-top: auto;

          padding-top: 17px;
        }

        .tt-trip-style {
          display: flex;

          align-items: center;

          gap: 6px;

          color: #64748b;

          font-size: 10px;
        }

        .tt-trip-style strong {
          color: #334155;
        }

        .tt-itinerary-button {
          min-height: 40px;

          display: inline-flex;

          align-items: center;

          justify-content:
            center;

          gap: 6px;

          padding: 0 15px;

          border-radius: 10px;

          color: white;

          background:
            linear-gradient(
              135deg,
              #0f8a7d,
              #0d9488
            );

          box-shadow:
            0 8px 17px
            rgba(
              15,
              118,
              110,
              0.17
            );

          font-size: 10px;
          font-weight: 800;

          text-decoration: none;

          white-space:
            nowrap;

          transition:
            0.2s ease;
        }

        .tt-itinerary-button:hover {
          transform:
            translateY(-1px);

          background:
            linear-gradient(
              135deg,
              #0b746b,
              #0f766e
            );

          box-shadow:
            0 11px 22px
            rgba(
              15,
              118,
              110,
              0.23
            );
        }

        /* =================================================
           EMPTY
        ================================================= */

        .tt-empty {
          min-height: 160px;

          display: flex;

          align-items: center;

          gap: 16px;

          padding:
            24px 26px;

          border:
            1px dashed #9fd4cc;

          border-radius: 15px;

          background:
            linear-gradient(
              135deg,
              #f8fdfc,
              #ffffff
            );
        }

        .tt-empty-icon {
          width: 50px;
          height: 50px;

          flex: 0 0 50px;

          display: flex;

          align-items: center;
          justify-content:
            center;

          border-radius: 13px;

          color: #0f766e;

          background: #e3f7f2;

          border:
            1px solid #c5ebe3;
        }

        .tt-empty-content {
          flex: 1;
        }

        .tt-empty-content h3 {
          margin:
            0 0 5px;

          font-size: 15px;
        }

        .tt-empty-content p {
          margin: 0;

          color: #64748b;

          font-size: 11px;

          line-height: 1.5;
        }

        .tt-empty-button {
          min-height: 39px;

          display: inline-flex;

          align-items: center;
          justify-content:
            center;

          gap: 6px;

          padding: 0 14px;

          border:
            1px solid #a7e6dc;

          border-radius: 9px;

          color: #0f766e;

          background: white;

          font-size: 11px;
          font-weight: 700;

          text-decoration: none;

          white-space:
            nowrap;
        }

        .tt-empty-button:hover {
          background:
            #effbf8;
        }

        /* =================================================
           AI BANNER
        ================================================= */

        .tt-ai-banner {
          position: relative;

          overflow: hidden;

          display: flex;

          align-items: center;

          gap: 17px;

          padding:
            22px 24px;

          border-radius: 15px;

          color: white;

          background:
            linear-gradient(
              120deg,
              #0f766e,
              #0d9488
            );

          box-shadow:
            0 12px 28px
            rgba(
              15,
              118,
              110,
              0.13
            );
        }

        .tt-ai-banner::after {
          content: "";

          position: absolute;

          width: 220px;
          height: 220px;

          right: -70px;
          top: -120px;

          border-radius: 50%;

          background:
            rgba(
              255,
              255,
              255,
              0.1
            );
        }

        .tt-ai-banner > * {
          position: relative;
          z-index: 1;
        }

        .tt-ai-banner-icon {
          width: 46px;
          height: 46px;

          flex: 0 0 46px;

          display: flex;

          align-items: center;
          justify-content:
            center;

          border-radius: 12px;

          background:
            rgba(
              255,
              255,
              255,
              0.13
            );

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.18
            );
        }

        .tt-ai-banner-content {
          flex: 1;
        }

        .tt-ai-banner-content span {
          font-size: 8px;

          font-weight: 800;

          letter-spacing: 1.5px;

          opacity: 0.82;
        }

        .tt-ai-banner-content h2 {
          margin:
            4px 0 4px;

          font-size: 18px;

          letter-spacing: -0.4px;
        }

        .tt-ai-banner-content p {
          max-width: 700px;

          margin: 0;

          color:
            rgba(
              255,
              255,
              255,
              0.8
            );

          font-size: 10px;

          line-height: 1.5;
        }

        .tt-ai-button {
          min-height: 39px;

          display: inline-flex;

          align-items: center;
          justify-content:
            center;

          gap: 6px;

          padding: 0 14px;

          border-radius: 9px;

          color: #0f766e;

          background: white;

          font-size: 11px;

          font-weight: 750;

          text-decoration: none;

          white-space:
            nowrap;
        }

        /* =================================================
           FOOTER
        ================================================= */

        .tt-footer {
          display: flex;

          justify-content:
            space-between;

          padding:
            25px 2px 0;

          color: #94a3b8;

          font-size: 10px;
        }

        /* =================================================
           RESPONSIVE
        ================================================= */

        @media (max-width: 1150px) {

          .tt-sidebar {
            width: 220px;
          }

          .tt-main {
            margin-left: 220px;
          }

          .tt-container {
            width:
              calc(100% - 38px);
          }

          .tt-trip-card {
            grid-template-columns:
              230px
              minmax(0, 1fr);
          }

          .tt-trip-meta {
            grid-template-columns:
              repeat(2, 1fr);
          }

        }

        @media (max-width: 850px) {

          .tt-mobile-menu {
            display: flex;
          }

          .tt-dashboard-pill {
            display: none;
          }

          .tt-sidebar {
            top: 0;

            left: -270px;

            width: 260px;

            height: 100vh;

            transition:
              left 0.22s ease;
          }

          .tt-sidebar-open {
            left: 0;
          }

          .tt-sidebar-close {
            display: flex;
          }

          .tt-sidebar-backdrop {
            position: fixed;

            inset: 0;

            z-index: 950;

            display: block;

            border: 0;

            background:
              rgba(
                15,
                23,
                42,
                0.35
              );
          }

          .tt-main {
            margin-left: 0;
          }

          .tt-container {
            width:
              calc(100% - 28px);

            padding-top: 30px;
          }

          .tt-welcome {
            align-items:
              flex-start;

            flex-direction:
              column;
          }

          .tt-plan-button {
            width: 100%;
          }

          .tt-trip-card {
            grid-template-columns:
              1fr;
          }

          .tt-trip-visual {
            min-height: 220px;
          }

          .tt-trip-body {
            min-height: 265px;
          }

          .tt-ai-banner {
            align-items:
              flex-start;

            flex-wrap:
              wrap;
          }

          .tt-ai-banner-content {
            min-width:
              calc(100% - 65px);
          }

          .tt-ai-button {
            width: 100%;
          }

        }

        @media (max-width: 560px) {

          .tt-navbar {
            padding: 0 13px;
          }

          .tt-logo-text {
            font-size: 19px;
          }

          .tt-navbar-links {
            gap: 2px;
          }

          .tt-navbar-link,
          .tt-navbar-logout {
            width: 35px;
            padding: 0;
            font-size: 0;
          }

          .tt-navbar-link svg,
          .tt-navbar-logout svg {
            width: 17px;
            height: 17px;
          }

          .tt-welcome h1 {
            font-size: 30px;
          }

          .tt-section-heading {
            align-items:
              flex-start;

            flex-direction:
              column;
          }

          .tt-trip-meta {
            grid-template-columns:
              1fr 1fr;
          }

          .tt-trip-bottom {
            align-items:
              stretch;

            flex-direction:
              column;
          }

          .tt-itinerary-button {
            width: 100%;
          }

          .tt-empty {
            align-items:
              flex-start;

            flex-wrap:
              wrap;
          }

          .tt-empty-content {
            min-width:
              calc(100% - 66px);
          }

          .tt-empty-button {
            width: 100%;
          }

          .tt-footer {
            flex-direction:
              column;

            gap: 6px;
          }

        }

      `}</style>

    </div>
  );
}

/* =========================================================
   SIDEBAR ITEM
========================================================= */

function SidebarItem({
  href,
  icon,
  label,
  active = false,
  closeSidebar,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
  closeSidebar?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={closeSidebar}
      className={`tt-sidebar-item ${
        active ? "active" : ""
      }`}
    >
      {icon}

      <span>
        {label}
      </span>
    </Link>
  );
}

/* =========================================================
   TRIP CARD
========================================================= */

function TripCard({
  trip,
  index,
}: {
  trip: Trip;
  index: number;
}) {
  const image = getTripImage(trip.destination);

  /*
   * Dynamic right-side image.
   * No Goa/Araku/Munnar/etc. hardcoding.
   * The actual destination is used to request a different
   * travel image from LoremFlickr. The lock keeps each trip
   * visually stable while ensuring it is not the left image.
   */
  const blurImage = `https://loremflickr.com/1600/900/${encodeURIComponent(
    `${trip.destination},travel,landscape`
  )}?lock=${trip.id}`;

  return (
    <article className="tt-trip-card">

      {/* =================================================
          LEFT IMAGE
      ================================================= */}

      <div className="tt-trip-visual">

        <img
          src={image}
          alt={trip.destination}
          className="tt-trip-visual-image"
        />

        <div className="tt-trip-visual-overlay" />

        <div className="tt-trip-visual-content">

          <span className="tt-trip-number">
            TRIP {String(index + 1).padStart(2, "0")}
          </span>

          <h3>
            {trip.destination}
          </h3>

          <p>
            <MapPin size={13} />
            {trip.destination}
          </p>

        </div>

      </div>


      {/* =================================================
          RIGHT SIDE
      ================================================= */}

      <div className="tt-trip-body">

        {/* =================================================
            DYNAMIC DIFFERENT BLURRED IMAGE
        ================================================= */}

        <div
          className="tt-trip-blur-image"
          style={{
            backgroundImage: `url("${blurImage}")`,
          }}
          aria-hidden="true"
        />

        {/* Soft glass layer */}

        <div className="tt-trip-glass" />


        {/* =================================================
            SHARP CONTENT
        ================================================= */}

        <div className="tt-trip-content">

          {/* TOP */}

          <div className="tt-trip-top">

            <div>

              <h3 className="tt-trip-title">
                {trip.title ||
                  `${trip.destination} Trip`}
              </h3>

              <div className="tt-trip-destination">

                <MapPin size={13} />

                {trip.destination}

              </div>

            </div>


            <span
              className={`tt-trip-status ${getStatusClass(
                trip.status
              )}`}
            >
              {getStatusLabel(
                trip.status
              )}
            </span>

          </div>


          {/* =================================================
              INFO BOXES
          ================================================= */}

          <div className="tt-trip-meta">

            <TripMeta
              icon={
                <CalendarDays size={14} />
              }
              label="Dates"
              value={`${formatDate(
                trip.start_date
              )} – ${formatDate(
                trip.end_date
              )}`}
            />

            <TripMeta
              icon={
                <Clock3 size={14} />
              }
              label="Duration"
              value={`${trip.days} ${
                trip.days === 1
                  ? "Day"
                  : "Days"
              }`}
            />

            <TripMeta
              icon={
                <Wallet size={14} />
              }
              label="Budget"
              value={formatBudget(
                trip.budget
              )}
            />

            <TripMeta
              icon={
                <Users size={14} />
              }
              label="Travelers"
              value={`${trip.travelers} ${
                trip.travelers === 1
                  ? "Person"
                  : "People"
              }`}
            />

          </div>


          {/* =================================================
              BOTTOM
          ================================================= */}

          <div className="tt-trip-bottom">

            <div className="tt-trip-style">

              <Car size={13} />

              <span>
                Travel style:
              </span>

              <strong>
                {trip.travel_style ||
                  "Flexible"}
              </strong>

            </div>


            <Link
              href={`/itinerary?trip_id=${trip.id}`}
              className="tt-itinerary-button"
            >

              Open Itinerary

              <ChevronRight size={15} />

            </Link>

          </div>

        </div>

      </div>

    </article>
  );
}

/* =========================================================
   TRIP META
========================================================= */

function TripMeta({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="tt-trip-meta-item">

      <div className="tt-trip-meta-icon">
        {icon}
      </div>

      <span className="tt-trip-meta-label">
        {label}
      </span>

      <span className="tt-trip-meta-value">
        {value}
      </span>

    </div>
  );
}