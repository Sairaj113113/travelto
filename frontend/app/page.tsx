import Link from "next/link";
import "./globals.css";

export default function Home() {
  return (
    <main className="landing-page">

      {/* ================= NAVBAR ================= */}
      <header className="navbar">

        {/* LOGO */}
        <Link href="/" className="logo">
          <span className="logo-icon">✈</span>
          <span className="logo-text">Travelto</span>
        </Link>


        {/* NAVIGATION */}
        <nav className="nav-links">

          <Link href="/" className="active">
            Home
          </Link>

          <Link href="#explore">
            Explore
          </Link>

          <Link href="/ai-agent">
            AI Agent
          </Link>

          <Link href="/itinerary">
            Trips
          </Link>

          <Link href="/travel-guides">
            Guides
          </Link>

          <Link href="#more">
            More
          </Link>

        </nav>


        {/* SIGN IN */}
        <Link href="/login" className="signin-btn">
          Sign In
        </Link>

      </header>


      {/* ================= HERO ================= */}
      <section className="hero">

        {/* BACKGROUND IMAGE */}
        <div className="hero-image" />

        {/* GREEN / DARK OVERLAY */}
        <div className="hero-overlay" />


        <div className="hero-content">

          {/* ================= HERO TEXT ================= */}
          <div className="hero-text">

            <div className="small-badge">
              <span>✨</span>
              AI Powered Travel
            </div>


            <h1>
              Discover
              <br />

              Plan
              <br />

              Travel Smarter
              <br />

              <span>with AI</span>
            </h1>


            <p>
              Your personal AI travel assistant for
              <br />
              unforgettable journeys.
            </p>

          </div>


          {/* ================= RIGHT TEXT ================= */}
          <div className="explore-text">

            <span>Explore</span>

            <br />

            More

            <br />

            <span>Live Better</span>

          </div>


          {/* ================= SEARCH / PLAN BOX ================= */}
          <div className="trip-search">


            {/* DESTINATION */}
            <Link
              href="/plan-trip"
              className="search-item"
            >

              <div className="search-icon">
                📍
              </div>

              <div className="search-info">

                <small>
                  Where do you want to go?
                </small>

                <strong>
                  Search destination
                </strong>

              </div>

            </Link>


            <div className="search-divider" />


            {/* DATES */}
            <Link
              href="/plan-trip"
              className="search-item"
            >

              <div className="search-icon">
                📅
              </div>

              <div className="search-info">

                <small>
                  Dates
                </small>

                <strong>
                  Select dates
                </strong>

              </div>

            </Link>


            <div className="search-divider" />


            {/* TRAVELERS */}
            <Link
              href="/plan-trip"
              className="search-item"
            >

              <div className="search-icon">
                👥
              </div>

              <div className="search-info">

                <small>
                  Travelers
                </small>

                <strong>
                  2 Travelers
                </strong>

              </div>

            </Link>


            {/* PLAN BUTTON */}
            <Link
              href="/plan-trip"
              className="plan-btn"
            >

              <span>
                Plan My Trip
              </span>

              <span className="arrow">
                →
              </span>

            </Link>

          </div>

        </div>

      </section>


      {/* =================================================
          FEATURES
      ================================================= */}
      <section
        className="features"
        id="explore"
      >

        {/* 1. PERSONALIZED ITINERARIES */}
        <FeatureCard
          href="/plan-trip"
          icon="✦"
          title="Personalized"
          subtitle="Itineraries"
        />


        {/* 2. AI TRAVEL AGENT */}
        <FeatureCard
          href="/ai-agent"
          icon="✧"
          title="AI Travel"
          subtitle="Agent"
        />


        {/* 3. BOOKINGS */}
        <FeatureCard
          href="/bookings"
          icon="▣"
          title="Best Deals"
          subtitle="& Bookings"
        />


        {/* 4. TRAVEL BUDDY */}
        <FeatureCard
          href="/travel-buddy"
          icon="♟"
          title="Travel Buddy"
          subtitle="Matching"
        />


        {/* 5. LOCAL GUIDES */}
        <FeatureCard
          href="/travel-guides"
          icon="⚝"
          title="Local"
          subtitle="Guides"
        />


        {/* 6. TRAVEL MEMORIES */}
        <FeatureCard
          href="/memories"
          icon="◉"
          title="Travel"
          subtitle="Memories"
        />

      </section>


      {/* =================================================
          LOWER CTA
      ================================================= */}
      <section
        className="bottom-section"
        id="more"
      >

        <div className="bottom-content">

          <span className="bottom-badge">
            AI-Powered Journeys
          </span>


          <h2>
            Your next adventure
            <br />
            starts here.
          </h2>


          <p>
            Create personalized journeys,
            discover new places and travel smarter
            with your AI travel assistant.
          </p>


          <Link
            href="/plan-trip"
            className="bottom-btn"
          >

            Start Planning

            <span>
              →
            </span>

          </Link>

        </div>

      </section>

    </main>
  );
}


/* =========================================================
   FEATURE CARD
========================================================= */

function FeatureCard({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="feature-card"
    >

      {/* ICON */}
      <div className="feature-icon">
        {icon}
      </div>


      {/* TITLE */}
      <div className="feature-title">
        {title}
      </div>


      {/* SUBTITLE */}
      <div className="feature-subtitle">
        {subtitle}
      </div>

    </Link>
  );
}