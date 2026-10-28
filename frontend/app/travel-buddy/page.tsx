"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

const INTERESTS = [
  "Adventure",
  "Nature",
  "Food",
  "Photography",
  "Hiking",
  "Culture",
  "Beaches",
  "Shopping",
  "History",
  "Camping",
];

type Buddy = {
  id: number | string;
  name: string;
  age?: number | null;
  destination?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  interests?: string[] | string | null;
  match_percentage?: number | null;
  profile_image?: string | null;
  connection_status?: string | null;
};

type SearchResponse =
  | Buddy[]
  | { buddies?: Buddy[]; results?: Buddy[] };

function getToken() {
  if (typeof window === "undefined") return null;

  return (
    localStorage.getItem("travelto_token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")
  );
}

function getInterests(value: Buddy["interests"]): string[] {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    return value
      .split(/[•,;]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "TB"
  );
}

function formatDate(date?: string | null) {
  if (!date) return "";

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getResults(data: SearchResponse): Buddy[] {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data.buddies)) return data.buddies;

  if (Array.isArray(data.results)) return data.results;

  return [];
}

export default function TravelBuddyPage() {
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [connectingId, setConnectingId] = useState<
    number | string | null
  >(null);

  const searchBuddies = useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault();

      setLoading(true);
      setError("");
      setMessage("");
      setSearched(true);

      if (startDate && endDate && startDate > endDate) {
        setError("End date must be on or after the start date.");
        setBuddies([]);
        setLoading(false);
        return;
      }

      try {
        const params = new URLSearchParams();

        if (destination.trim()) {
          params.set("destination", destination.trim());
        }

        if (startDate) {
          params.set("start_date", startDate);
        }

        if (endDate) {
          params.set("end_date", endDate);
        }

        selectedInterests.forEach((interest) => {
          params.append("interests", interest);
        });

        const token = getToken();

        const response = await fetch(
          `${API_URL}/travel-buddy/search?${params.toString()}`,
          {
            method: "GET",
            headers: token
              ? { Authorization: `Bearer ${token}` }
              : {},
            cache: "no-store",
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(
              "The travel buddy search API is not available in your backend yet."
            );
          }

          if (response.status === 401) {
            throw new Error(
              "Please sign in to search for travel buddies."
            );
          }

          const body = await response.json().catch(() => ({}));

          throw new Error(
            body.detail ||
              body.message ||
              `Search failed with status ${response.status}.`
          );
        }

        const data: SearchResponse = await response.json();

        setBuddies(getResults(data));
      } catch (err) {
        setBuddies([]);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load travelers."
        );
      } finally {
        setLoading(false);
      }
    },
    [destination, startDate, endDate, selectedInterests]
  );

  useEffect(() => {
    void searchBuddies();
    // Load the initial traveler list once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleInterest(interest: string) {
    setSelectedInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest]
    );
  }

  async function clearFilters() {
    setDestination("");
    setStartDate("");
    setEndDate("");
    setSelectedInterests([]);

    setError("");
    setMessage("");

    setLoading(true);
    setSearched(true);

    try {
      const token = getToken();

      const response = await fetch(
        `${API_URL}/travel-buddy/search`,
        {
          headers: token
            ? { Authorization: `Bearer ${token}` }
            : {},
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error("Unable to load travelers.");
      }

      const data: SearchResponse = await response.json();

      setBuddies(getResults(data));
    } catch (err) {
      setBuddies([]);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load travelers."
      );
    } finally {
      setLoading(false);
    }
  }

  async function connectBuddy(buddy: Buddy) {
    const token = getToken();

    if (!token) {
      setMessage("Please sign in before connecting with travelers.");
      return;
    }

    if (
      buddy.connection_status === "pending" ||
      buddy.connection_status === "accepted"
    ) {
      return;
    }

    setConnectingId(buddy.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/travel-buddy/connect`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            receiver_id: buddy.id,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            "Unable to send the connection request."
        );
      }

      const status =
        data.connection_status || data.status || "pending";

      setBuddies((current) =>
        current.map((item) =>
          item.id === buddy.id
            ? { ...item, connection_status: status }
            : item
        )
      );

      setMessage(`Connection request sent to ${buddy.name}.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect. Please try again."
      );
    } finally {
      setConnectingId(null);
    }
  }

  function connectionLabel(buddy: Buddy) {
    if (connectingId === buddy.id) return "Sending request...";

    if (buddy.connection_status === "pending") {
      return "Request sent";
    }

    if (buddy.connection_status === "accepted") {
      return "Connected";
    }

    return "Connect";
  }

  return (
    <main className="travel-page">
      {/* NAVBAR */}

      <header className="navbar">
        <Link href="/" className="brand">
          <span className="brand-icon">✈</span>
          <span>Travelto</span>
        </Link>

        <nav className="nav-links">
          <Link href="/">Home</Link>
          <Link href="/plan-trip">Plan Trip</Link>
          <Link href="/ai-agent">AI Agent</Link>
          <Link href="/itinerary">Trips</Link>
          <Link href="/travel-guides">Guides</Link>
        </nav>

        <Link href="/login" className="sign-in">
          Sign In <span>↗</span>
        </Link>
      </header>

      {/* HERO SECTION */}

      <section className="hero">
        <div className="hero-background" />

        <div className="hero-content">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            TRAVEL TOGETHER
          </div>

          <h1>
            Good trips are better
            <span> together.</span>
          </h1>

          <p>
            Meet people who share your destination, travel dates,
            and sense of adventure.
          </p>

          <a href="#find-buddies" className="hero-button">
            Find your travel buddy <span>↓</span>
          </a>
        </div>

        <div className="hero-note">
          <span className="note-icon">✦</span>

          <div>
            <strong>Your next story starts here</strong>
            <small>Find your kind of travel people.</small>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}

      <section className="content" id="find-buddies">
        <div className="section-heading">
          <div>
            <span className="section-kicker">
              YOUR TRAVEL COMMUNITY
            </span>

            <h2>
              Find your people<span>.</span>
            </h2>

            <p>
              Discover travelers who match your journey.
            </p>
          </div>

          <div className="live-badge">
            <span /> Live matching
          </div>
        </div>

        {/* SEARCH FORM */}

        <form className="search-panel" onSubmit={searchBuddies}>
          <div className="search-heading">
            <div>
              <span className="panel-kicker">
                PERSONALIZE YOUR SEARCH
              </span>

              <h3>Where are you headed?</h3>
            </div>

            <button
              type="button"
              className="clear-button"
              onClick={clearFilters}
            >
              Clear filters ↺
            </button>
          </div>

          <div className="search-fields">
            <label className="field">
              <span>⌖ Destination</span>

              <input
                type="text"
                placeholder="e.g. Goa, Araku Valley"
                value={destination}
                onChange={(event) =>
                  setDestination(event.target.value)
                }
              />
            </label>

            <label className="field">
              <span>▦ From</span>

              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) =>
                  setStartDate(event.target.value)
                }
              />
            </label>

            <label className="field">
              <span>▦ To</span>

              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) =>
                  setEndDate(event.target.value)
                }
              />
            </label>

            <button
              className="search-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Searching..." : "Find buddies"}
              <span>↗</span>
            </button>
          </div>

          {/* INTEREST FILTERS */}

          <div className="interest-section">
            <div className="interest-heading">
              <strong>What do you enjoy?</strong>

              <span>
                {selectedInterests.length
                  ? `${selectedInterests.length} selected`
                  : "Choose your interests"}
              </span>
            </div>

            <div className="interest-list">
              {INTERESTS.map((interest) => {
                const active =
                  selectedInterests.includes(interest);

                return (
                  <button
                    type="button"
                    key={interest}
                    className={`interest-chip ${
                      active ? "active" : ""
                    }`}
                    onClick={() => toggleInterest(interest)}
                    aria-pressed={active}
                  >
                    {active ? "✓" : "+"} {interest}
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        {/* MESSAGES */}

        {message && (
          <div className="success-message" role="status">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="error-message" role="alert">
            <strong>Something went wrong</strong>
            <p>{error}</p>
          </div>
        )}

        {/* TRAVELER RESULTS */}

        <div className="results-heading">
          <div>
            <span className="section-kicker">
              COMPANIONS FOR YOUR JOURNEY
            </span>

            <h2>Travelers you may like</h2>
          </div>

          <span className="result-count">
            {buddies.length}{" "}
            {buddies.length === 1 ? "traveler" : "travelers"}
          </span>
        </div>

        {loading ? (
          <div className="state-panel">
            <div className="spinner" />

            <h3>Finding your travel people</h3>

            <p>
              Checking destinations, dates, and interests...
            </p>
          </div>
        ) : buddies.length === 0 ? (
          <div className="state-panel">
            <div className="empty-icon">🌍</div>

            <h3>
              {error
                ? "Travelers could not be loaded"
                : searched
                ? "No matching travelers yet"
                : "Ready for your next adventure?"}
            </h3>

            <p>
              {error
                ? "Check your backend API and try again."
                : "Try a different destination or remove some filters. Travelers will appear when matching profiles are available."}
            </p>

            {!error && (
              <button
                className="secondary-button"
                onClick={clearFilters}
                type="button"
              >
                Show all travelers
              </button>
            )}
          </div>
        ) : (
          <div className="buddy-grid">
            {buddies.map((buddy) => {
              const interests = getInterests(buddy.interests);

              const pending =
                buddy.connection_status === "pending";

              const accepted =
                buddy.connection_status === "accepted";

              const busy = connectingId === buddy.id;

              return (
                <article
                  className="buddy-card"
                  key={buddy.id}
                >
                  <div className="card-top">
                    <div className="avatar">
                      {buddy.profile_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={buddy.profile_image}
                          alt={buddy.name}
                        />
                      ) : (
                        <span>{getInitials(buddy.name)}</span>
                      )}
                    </div>

                    <span className="match-badge">
                      ✦{" "}
                      {typeof buddy.match_percentage === "number"
                        ? `${Math.round(
                            buddy.match_percentage
                          )}% match`
                        : "Travel match"}
                    </span>
                  </div>

                  <div className="buddy-info">
                    <h3>{buddy.name}</h3>

                    <p>
                      {buddy.age != null
                        ? `${buddy.age} years old`
                        : "Travelto traveler"}
                    </p>
                  </div>

                  <div className="destination-line">
                    <span>⌖</span>

                    <strong>
                      {buddy.destination ||
                        destination ||
                        "Flexible destination"}
                    </strong>
                  </div>

                  {(buddy.start_date || buddy.end_date) && (
                    <div className="date-line">
                      ▦{" "}
                      {formatDate(buddy.start_date) ||
                        "Flexible dates"}

                      {buddy.end_date
                        ? ` – ${formatDate(buddy.end_date)}`
                        : ""}
                    </div>
                  )}

                  <div className="divider" />

                  <span className="card-label">
                    TRAVEL INTERESTS
                  </span>

                  <div className="card-interests">
                    {interests.length ? (
                      interests.slice(0, 4).map((interest) => (
                        <span key={interest}>{interest}</span>
                      ))
                    ) : (
                      <span>Open to exploring</span>
                    )}
                  </div>

                  <button
                    className={`connect-button ${
                      pending || accepted ? "connected" : ""
                    }`}
                    type="button"
                    disabled={busy || pending || accepted}
                    onClick={() => connectBuddy(buddy)}
                  >
                    {connectionLabel(buddy)}

                    <span>
                      {accepted ? "✓" : pending ? "◷" : "↗"}
                    </span>
                  </button>
                </article>
              );
            })}
          </div>
        )}

        {/* SAFETY NOTE */}

        <div className="safety-note">
          <span className="safety-icon">♡</span>

          <p>
            <strong>Travel kindly. Travel safely.</strong>
            {" "}Get to know your travel buddy, communicate
            clearly, and meet in public places.
          </p>
        </div>
      </section>

      {/* FOOTER */}

      <footer className="footer">
        <Link href="/" className="footer-brand">
          ✈ Travelto
        </Link>

        <span>Made for journeys worth sharing.</span>

        <Link href="/privacy">Travel safely ↗</Link>
      </footer>

      {/* COMPLETE CSS */}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap');

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          font-family: "DM Sans", Arial, sans-serif;
          background: #f7faf8;
        }

        button,
        input {
          font: inherit;
        }

        button:focus-visible,
        a:focus-visible,
        input:focus-visible {
          outline: 3px solid #55cabb;
          outline-offset: 3px;
        }

        .travel-page {
          --teal: #078c7e;
          --dark-teal: #076e65;
          --ink: #142b2a;
          --muted: #70817f;
          --line: #dce9e5;

          min-height: 100vh;
          color: var(--ink);
          background: #f7faf8;
        }

        /* NAVBAR */

        .navbar {
          min-height: 76px;
          padding: 12px clamp(18px, 5vw, 76px);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          background: #fff;
          border-bottom: 1px solid #e5eeeb;
          position: sticky;
          top: 0;
          z-index: 20;
        }

        .brand,
        .footer-brand {
          display: flex;
          align-items: center;
          gap: 11px;
          color: var(--ink);
          text-decoration: none;
          font-family: "Manrope", sans-serif;
          font-size: 22px;
          font-weight: 800;
          white-space: nowrap;
        }

        .brand-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          color: #fff;
          background: linear-gradient(140deg, #0cae9b, #087b70);
          box-shadow: 0 7px 18px #078c7e2b;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: clamp(14px, 2.5vw, 32px);
        }

        .nav-links a {
          color: #607572;
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
        }

        .nav-links a:hover {
          color: var(--teal);
        }

        .sign-in {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          color: #fff;
          background: var(--teal);
          border-radius: 11px;
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .sign-in:hover {
          background: var(--dark-teal);
        }

        /* HERO */

        .hero {
          min-height: 365px;
          padding: 55px clamp(24px, 9vw, 140px);
          position: relative;
          display: flex;
          align-items: center;
          overflow: hidden;
          color: white;
          background: #103d38;
        }

        .hero-background {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              90deg,
              rgba(7, 37, 34, 0.91),
              rgba(7, 47, 42, 0.65) 55%,
              rgba(7, 47, 42, 0.15)
            ),
            url("https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=2200&q=85")
              center 52% / cover;
        }

        .hero-content {
          position: relative;
          z-index: 1;
          max-width: 680px;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #9be4d8;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .eyebrow-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #63e0c9;
        }

        .hero h1 {
          margin: 20px 0 14px;
          font-family: "Manrope", sans-serif;
          font-size: clamp(36px, 5vw, 62px);
          font-weight: 800;
          line-height: 1.12;
          letter-spacing: -2px;
        }

        .hero h1 span {
          color: #7be0d0;
        }

        .hero-content > p {
          max-width: 480px;
          color: #e0eeeb;
          font-size: 14px;
          line-height: 1.8;
        }

        .hero-button {
          display: inline-flex;
          align-items: center;
          gap: 24px;
          margin-top: 20px;
          padding: 14px 18px;
          border-radius: 10px;
          color: #103d38;
          background: #fff;
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
          transition: transform 0.2s;
        }

        .hero-button:hover {
          transform: translateY(-2px);
        }

        .hero-note {
          position: absolute;
          right: 7%;
          bottom: 25px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          border: 1px solid #ffffff55;
          border-radius: 14px;
          color: var(--ink);
          background: #ffffffeb;
          box-shadow: 0 12px 35px #001f1c26;
        }

        .note-icon {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 11px;
          color: var(--teal);
          background: #e0f5ef;
          font-size: 22px;
        }

        .hero-note strong,
        .hero-note small {
          display: block;
        }

        .hero-note strong {
          font-size: 12px;
        }

        .hero-note small {
          margin-top: 5px;
          color: var(--muted);
          font-size: 10px;
        }

        /* CONTENT */

        .content {
          width: min(1180px, calc(100% - 48px));
          margin: 0 auto;
          padding: 55px 0 48px;
        }

        .section-heading,
        .results-heading {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 20px;
        }

        .section-kicker,
        .panel-kicker {
          color: var(--teal);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.7px;
        }

        .section-heading h2,
        .results-heading h2 {
          margin: 9px 0 7px;
          font-family: "Manrope", sans-serif;
          font-size: clamp(25px, 3vw, 34px);
          font-weight: 800;
          letter-spacing: -1px;
        }

        .section-heading h2 > span {
          color: var(--teal);
        }

        .section-heading p {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.7;
        }

        .live-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 12px;
          border: 1px solid #cdebe2;
          border-radius: 30px;
          color: #287e70;
          background: #ecfaf5;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .live-badge span {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #20b88d;
        }

        /* SEARCH PANEL */

        .search-panel {
          margin-top: 27px;
          padding: 25px;
          border: 1px solid var(--line);
          border-radius: 18px;
          background: white;
          box-shadow: 0 15px 45px #1c51400a;
        }

        .search-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          margin-bottom: 22px;
        }

        .panel-kicker {
          color: #8a9a97;
          font-size: 9px;
        }

        .search-heading h3 {
          margin: 7px 0 0;
          font-family: "Manrope", sans-serif;
          font-size: 20px;
        }

        .clear-button {
          border: none;
          background: transparent;
          color: #70817f;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .clear-button:hover {
          color: var(--teal);
        }

        .search-fields {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr auto;
          align-items: end;
          gap: 13px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 9px;
          min-width: 0;
        }

        .field > span {
          color: #4e6460;
          font-size: 11px;
          font-weight: 800;
        }

        .field input {
          width: 100%;
          min-height: 47px;
          padding: 0 12px;
          border: 1px solid #dce8e4;
          border-radius: 9px;
          outline: none;
          color: var(--ink);
          background: #fbfdfc;
          font-size: 12px;
        }

        .field input:focus {
          border-color: #49b9a8;
          box-shadow: 0 0 0 3px #078c7e14;
        }

        .field input::placeholder {
          color: #9aa9a6;
        }

        .search-button {
          min-height: 47px;
          padding: 0 16px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 18px;
          border: none;
          border-radius: 9px;
          color: white;
          background: var(--teal);
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
          cursor: pointer;
        }

        .search-button:hover:not(:disabled) {
          background: var(--dark-teal);
        }

        .search-button:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        /* INTERESTS */

        .interest-section {
          margin-top: 23px;
          padding-top: 19px;
          border-top: 1px solid #edf2f0;
        }

        .interest-heading {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 13px;
        }

        .interest-heading strong {
          color: #4e6460;
          font-size: 11px;
        }

        .interest-heading span {
          color: #8b9a97;
          font-size: 11px;
        }

        .interest-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .interest-chip {
          padding: 8px 12px;
          border: 1px solid #dfeae6;
          border-radius: 30px;
          color: #647773;
          background: white;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .interest-chip:hover,
        .interest-chip.active {
          border-color: #a7e0d5;
          color: #087b70;
          background: #e9f8f3;
        }

        /* NOTIFICATIONS */

        .success-message,
        .error-message {
          margin-top: 20px;
          padding: 14px;
          border-radius: 11px;
          font-size: 13px;
        }

        .success-message {
          color: #126c55;
          background: #e8f8ef;
          border: 1px solid #cceedd;
        }

        .error-message {
          color: #9d3b35;
          background: #fff1ef;
          border: 1px solid #f6d5d1;
        }

        .error-message p {
          margin: 5px 0 0;
          font-size: 12px;
        }

        /* RESULTS */

        .results-heading {
          margin: 47px 0 20px;
        }

        .results-heading h2 {
          margin-bottom: 0;
          font-size: 25px;
        }

        .result-count {
          padding: 8px 12px;
          border: 1px solid #dce9e5;
          border-radius: 30px;
          color: #6c817c;
          background: white;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
        }

        .buddy-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .buddy-card {
          min-width: 0;
          padding: 23px;
          border: 1px solid var(--line);
          border-radius: 17px;
          background: white;
          box-shadow: 0 12px 32px #214e4008;
          transition:
            transform 0.2s,
            box-shadow 0.2s,
            border-color 0.2s;
        }

        .buddy-card:hover {
          transform: translateY(-4px);
          border-color: #b9e5dc;
          box-shadow: 0 18px 38px #214e4012;
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
        }

        .avatar {
          width: 62px;
          height: 62px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          overflow: hidden;
          border-radius: 17px;
          color: #087b70;
          background: linear-gradient(135deg, #d8f5ed, #e8edff);
          font-family: "Manrope", sans-serif;
          font-size: 19px;
          font-weight: 800;
        }

        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .match-badge {
          padding: 7px 9px;
          border-radius: 30px;
          color: #12866d;
          background: #eaf8f2;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .buddy-info {
          margin-top: 17px;
        }

        .buddy-info h3 {
          margin: 0;
          font-family: "Manrope", sans-serif;
          font-size: 19px;
          font-weight: 800;
        }

        .buddy-info p {
          margin: 5px 0 0;
          color: #83928f;
          font-size: 11px;
        }

        .destination-line,
        .date-line {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          color: #70817d;
          font-size: 12px;
        }

        .destination-line > span,
        .date-line {
          color: var(--teal);
        }

        .destination-line strong {
          color: #34534d;
        }

        .date-line {
          margin-top: 10px;
          font-size: 11px;
        }

        .divider {
          height: 1px;
          margin: 17px 0 14px;
          background: #edf2f0;
        }

        .card-label {
          color: #91a09c;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.4px;
        }

        .card-interests {
          min-height: 32px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 11px;
        }

        .card-interests span {
          padding: 6px 9px;
          border-radius: 7px;
          color: #5e716d;
          background: #f4f7f6;
          font-size: 10px;
          font-weight: 700;
        }

        .connect-button {
          width: 100%;
          min-height: 43px;
          margin-top: 19px;
          padding: 0 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          border: 1px solid var(--teal);
          border-radius: 9px;
          color: white;
          background: var(--teal);
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .connect-button:hover:not(:disabled) {
          background: var(--dark-teal);
        }

        .connect-button.connected,
        .connect-button:disabled {
          border-color: #d1ece3;
          color: #47766d;
          background: #e8f6f1;
          cursor: default;
        }

        /* LOADING AND EMPTY STATES */

        .state-panel {
          min-height: 245px;
          padding: 35px 20px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          border: 1px dashed #cbded8;
          border-radius: 17px;
          background: #fcfefd;
          text-align: center;
        }

        .state-panel h3 {
          margin: 13px 0 7px;
          font-family: "Manrope", sans-serif;
          font-size: 18px;
        }

        .state-panel p {
          max-width: 450px;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.7;
        }

        .spinner {
          width: 33px;
          height: 33px;
          border: 3px solid #d7eee7;
          border-top-color: var(--teal);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .empty-icon {
          font-size: 36px;
        }

        .secondary-button {
          margin-top: 12px;
          padding: 10px 14px;
          border: 1px solid #c9e6dd;
          border-radius: 9px;
          color: var(--dark-teal);
          background: #f0faf6;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        /* SAFETY NOTE */

        .safety-note {
          margin-top: 28px;
          padding: 17px 20px;
          display: flex;
          align-items: center;
          gap: 13px;
          border: 1px solid #e0ece7;
          border-radius: 13px;
          background: #f0f8f4;
        }

        .safety-icon {
          width: 35px;
          height: 35px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          border-radius: 11px;
          color: var(--teal);
          background: white;
          font-size: 20px;
        }

        .safety-note p {
          margin: 0;
          color: #71837e;
          font-size: 11px;
          line-height: 1.7;
        }

        .safety-note strong {
          color: #31534a;
        }

        /* FOOTER */

        .footer {
          min-height: 82px;
          padding: 20px clamp(24px, 7vw, 100px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border-top: 1px solid #e2ece8;
          background: white;
        }

        .footer-brand {
          font-size: 17px;
        }

        .footer > span {
          color: #879590;
          font-size: 11px;
        }

        .footer > a:last-child {
          color: #5d7770;
          text-decoration: none;
          font-size: 11px;
          font-weight: 700;
        }

        /* TABLET */

        @media (max-width: 900px) {
          .nav-links {
            gap: 12px;
          }

          .nav-links a {
            font-size: 10px;
          }

          .search-fields {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .search-button {
            width: 100%;
          }

          .buddy-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .hero-note {
            right: 24px;
          }
        }

        /* MOBILE */

        @media (max-width: 640px) {
          .navbar {
            padding: 13px 18px;
            flex-wrap: wrap;
            gap: 12px;
          }

          .brand {
            font-size: 19px;
          }

          .brand-icon {
            width: 37px;
            height: 37px;
          }

          .nav-links {
            order: 3;
            width: 100%;
            overflow-x: auto;
            padding: 7px 0 2px;
            gap: 20px;
          }

          .nav-links a {
            flex-shrink: 0;
            font-size: 11px;
          }

          .sign-in {
            margin-left: auto;
            padding: 10px 12px;
          }

          .hero {
            min-height: 400px;
            padding: 43px 24px 120px;
            align-items: flex-start;
          }

          .hero h1 {
            font-size: 39px;
            letter-spacing: -1.5px;
          }

          .hero-content > p {
            font-size: 13px;
          }

          .hero-note {
            right: 18px;
            bottom: 16px;
            left: 18px;
            padding: 10px 13px;
          }

          .content {
            width: calc(100% - 32px);
            padding-top: 39px;
          }

          .section-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .search-panel {
            padding: 17px;
            border-radius: 15px;
          }

          .search-heading {
            align-items: flex-start;
          }

          .search-heading h3 {
            font-size: 18px;
          }

          .search-fields {
            grid-template-columns: 1fr;
          }

          .interest-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .results-heading {
            align-items: flex-start;
          }

          .results-heading h2 {
            font-size: 21px;
          }

          .buddy-grid {
            grid-template-columns: 1fr;
          }

          .buddy-card {
            padding: 20px;
          }

          .footer {
            flex-wrap: wrap;
            padding: 20px 18px;
          }

          .footer > span {
            order: 3;
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}