"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Trip = {
  id: number;
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
};

type Activity = {
  start_time?: string | null;
  end_time?: string | null;
  activity_type: string;
  title: string;
  description?: string | null;
  location?: string | null;
  estimated_cost: number;
  duration_minutes?: number | null;
};

type SimulationDay = {
  day_number: number;
  date: string;
  title: string;
  summary?: string | null;
  estimated_cost: number;
  activities: Activity[];
};

type Simulation = {
  scenario: string;
  original_budget: number;
  simulated_budget: number;
  days: SimulationDay[];
};

const API_URL = "http://127.0.0.1:8000";

export default function WhatIfPage() {
  const router = useRouter();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState("");

  const [scenario, setScenario] = useState(
    "Reduce the total trip budget while keeping the trip enjoyable."
  );

  const [budget, setBudget] = useState("");
  const [travelers, setTravelers] = useState("");
  const [transport, setTransport] = useState("");

  const [simulation, setSimulation] = useState<Simulation | null>(null);

  const [loadingTrips, setLoadingTrips] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [applying, setApplying] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================================
  // LOAD USER TRIPS
  // =====================================================

  useEffect(() => {
    loadTrips();
  }, []);

  async function loadTrips() {
    try {
      setLoadingTrips(true);
      setError("");

      const token = localStorage.getItem("travelto_token");

      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(`${API_URL}/trips/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("travelto_token");
        localStorage.removeItem("travelto_user");
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load trips");
      }

      const data = await response.json();

      setTrips(data);

      if (data.length > 0) {
        const firstTrip = data[0];

        setSelectedTripId(String(firstTrip.id));
        setBudget(String(firstTrip.budget));
        setTravelers(String(firstTrip.travelers));
        setTransport(firstTrip.transport_preference || "");
      }
    } catch (err: any) {
      setError(err.message || "Unable to load trips");
    } finally {
      setLoadingTrips(false);
    }
  }

  // =====================================================
  // HANDLE TRIP SELECTION
  // =====================================================

  function handleTripChange(value: string) {
    setSelectedTripId(value);
    setSimulation(null);
    setSuccess("");
    setError("");

    const selectedTrip = trips.find(
      (trip) => String(trip.id) === value
    );

    if (!selectedTrip) {
      return;
    }

    setBudget(String(selectedTrip.budget));
    setTravelers(String(selectedTrip.travelers));
    setTransport(
      selectedTrip.transport_preference || ""
    );
  }

  // =====================================================
  // GET SELECTED TRIP
  // =====================================================

  const selectedTrip = trips.find(
    (trip) => String(trip.id) === selectedTripId
  );

  // =====================================================
  // SIMULATE
  // =====================================================

  async function handleSimulation() {
    setError("");
    setSuccess("");
    setSimulation(null);

    if (!selectedTrip) {
      setError("Please select a trip.");
      return;
    }

    if (!scenario.trim()) {
      setError("Please describe what you want to change.");
      return;
    }

    const newBudget = Number(budget);
    const newTravelers = Number(travelers);

    if (!Number.isFinite(newBudget) || newBudget < 0) {
      setError("Please enter a valid budget.");
      return;
    }

    if (
      !Number.isFinite(newTravelers) ||
      newTravelers < 1
    ) {
      setError("Please enter a valid number of travelers.");
      return;
    }

    try {
      setSimulating(true);

      const token = localStorage.getItem("travelto_token");

      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(
        `${API_URL}/what-if/simulate`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            trip_id: selectedTrip.id,
            scenario: scenario.trim(),
            new_budget: newBudget,
            new_travelers: newTravelers,
            new_transport_preference:
              transport || null,
          }),
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("travelto_token");
        localStorage.removeItem("travelto_user");
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.detail || "Simulation failed"
        );
      }

      setSimulation(data.simulation);

      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth",
      });
    } catch (err: any) {
      setError(
        err.message || "Unable to generate simulation."
      );
    } finally {
      setSimulating(false);
    }
  }

  // =====================================================
  // APPLY SIMULATION
  // =====================================================

  async function handleApplySimulation() {
    if (!simulation || !selectedTrip) {
      return;
    }

    const confirmed = window.confirm(
      "Apply this alternative itinerary? Your current itinerary will be replaced."
    );

    if (!confirmed) {
      return;
    }

    try {
      setApplying(true);
      setError("");
      setSuccess("");

      const token = localStorage.getItem("travelto_token");

      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(
        `${API_URL}/what-if/apply`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            trip_id: selectedTrip.id,
            days: simulation.days,
          }),
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("travelto_token");
        localStorage.removeItem("travelto_user");
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.detail || "Failed to apply simulation"
        );
      }

      setSuccess(
        "Your alternative itinerary has been applied successfully."
      );

      // Update local trip budget
      setTrips((previousTrips) =>
        previousTrips.map((trip) =>
          trip.id === selectedTrip.id
            ? {
                ...trip,
                budget: simulation.simulated_budget,
              }
            : trip
        )
      );
    } catch (err: any) {
      setError(
        err.message ||
          "Unable to apply the simulation."
      );
    } finally {
      setApplying(false);
    }
  }

  // =====================================================
  // FORMAT MONEY
  // =====================================================

  function formatMoney(value: number) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  }

  // =====================================================
  // FORMAT DATE
  // =====================================================

  function formatDate(dateString: string) {
    return new Date(
      `${dateString}T00:00:00`
    ).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // =====================================================
  // ACTIVITY ICON
  // =====================================================

  function getActivityIcon(type: string) {
    const value = type.toLowerCase();

    if (value.includes("travel")) return "🚗";
    if (value.includes("food")) return "🍴";
    if (value.includes("sight")) return "📍";
    if (value.includes("relax")) return "🌿";
    if (value.includes("hotel")) return "🏨";
    if (value.includes("shopping")) return "🛍️";

    return "✨";
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loadingTrips) {
    return (
      <>
        <div className="loading-page">
          <div className="loading-spinner"></div>
          <p>Loading your trips...</p>
        </div>

        <style jsx>{`
          .loading-page {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 16px;
            background: #f8fafc;
            color: #64748b;
          }

          .loading-spinner {
            width: 42px;
            height: 42px;
            border: 4px solid #e2e8f0;
            border-top-color: #0f766e;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="page">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="header">

        <div
          className="brand"
          onClick={() => router.push("/dashboard")}
        >
          <div className="brand-icon">
            T
          </div>

          <div>
            <div className="brand-name">
              Travelto
            </div>

            <div className="brand-subtitle">
              AI-Powered Travel
            </div>
          </div>
        </div>

        <button
          className="back-button"
          onClick={() => router.push("/dashboard")}
        >
          ← Dashboard
        </button>

      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="container">

        {/* HERO */}

        <section className="hero">

          <div className="hero-icon">
            ✨
          </div>

          <div>

            <div className="eyebrow">
              TRAVELTO AI
            </div>

            <h1>
              What-If Travel Simulator
            </h1>

            <p>
              Explore alternative travel plans before
              changing your actual itinerary.
            </p>

          </div>

        </section>

        {/* ERROR */}

        {error && (
          <div className="alert error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* SUCCESS */}

        {success && (
          <div className="alert success">
            <span>✓</span>
            <span>{success}</span>
          </div>
        )}

        {trips.length === 0 ? (

          <div className="empty-card">

            <div className="empty-icon">
              🧳
            </div>

            <h2>
              No trips found
            </h2>

            <p>
              Create a trip first before using
              the What-If Simulator.
            </p>

            <button
              className="primary-button"
              onClick={() =>
                router.push("/plan-trip")
              }
            >
              ✨ Plan a Trip
            </button>

          </div>

        ) : (

          <>
            {/* =================================================
                CONFIGURATION CARD
            ================================================= */}

            <section className="card">

              <div className="section-heading">

                <div>
                  <div className="section-label">
                    STEP 1
                  </div>

                  <h2>
                    Configure your scenario
                  </h2>

                  <p>
                    Tell Travelto what you want to
                    change about your trip.
                  </p>
                </div>

              </div>

              {/* TRIP */}

              <div className="form-group">

                <label>
                  Select trip
                </label>

                <select
                  value={selectedTripId}
                  onChange={(e) =>
                    handleTripChange(
                      e.target.value
                    )
                  }
                >
                  {trips.map((trip) => (
                    <option
                      key={trip.id}
                      value={trip.id}
                    >
                      {trip.destination} —{" "}
                      {formatDate(
                        trip.start_date
                      )}
                    </option>
                  ))}
                </select>

              </div>

              {/* CURRENT TRIP SUMMARY */}

              {selectedTrip && (
                <div className="trip-summary">

                  <div className="trip-summary-main">

                    <div className="destination-icon">
                      📍
                    </div>

                    <div>

                      <h3>
                        {selectedTrip.destination}
                      </h3>

                      <p>
                        {formatDate(
                          selectedTrip.start_date
                        )}{" "}
                        →{" "}
                        {formatDate(
                          selectedTrip.end_date
                        )}
                      </p>

                    </div>

                  </div>

                  <div className="summary-budget">

                    <span>
                      Current budget
                    </span>

                    <strong>
                      {formatMoney(
                        selectedTrip.budget
                      )}
                    </strong>

                  </div>

                </div>
              )}

              {/* SCENARIO */}

              <div className="form-group">

                <label>
                  What would you like to change?
                </label>

                <textarea
                  value={scenario}
                  onChange={(e) =>
                    setScenario(
                      e.target.value
                    )
                  }
                  placeholder="Example: Reduce my budget to ₹7000 while keeping the trip enjoyable."
                  rows={4}
                />

                <div className="input-hint">
                  Describe the change naturally.
                  Travelto AI will create an alternative
                  itinerary.
                </div>

              </div>

              {/* GRID */}

              <div className="form-grid">

                {/* BUDGET */}

                <div className="form-group">

                  <label>
                    Simulated budget
                  </label>

                  <div className="input-with-prefix">

                    <span>
                      ₹
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={budget}
                      onChange={(e) =>
                        setBudget(
                          e.target.value
                        )
                      }
                    />

                  </div>

                </div>

                {/* TRAVELERS */}

                <div className="form-group">

                  <label>
                    Travelers
                  </label>

                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={travelers}
                    onChange={(e) =>
                      setTravelers(
                        e.target.value
                      )
                    }
                  />

                </div>

                {/* TRANSPORT */}

                <div className="form-group">

                  <label>
                    Transport
                  </label>

                  <select
                    value={transport}
                    onChange={(e) =>
                      setTransport(
                        e.target.value
                      )
                    }
                  >

                    <option value="">
                      Flexible
                    </option>

                    <option value="Car">
                      🚗 Car
                    </option>

                    <option value="Bike">
                      🏍️ Bike
                    </option>

                    <option value="Bus">
                      🚌 Bus
                    </option>

                    <option value="Train">
                      🚆 Train
                    </option>

                    <option value="Flight">
                      ✈️ Flight
                    </option>

                  </select>

                </div>

              </div>

              {/* SIMULATE */}

              <button
                className="simulate-button"
                onClick={handleSimulation}
                disabled={simulating}
              >

                {simulating ? (
                  <>
                    <span className="button-spinner"></span>
                    AI is creating alternatives...
                  </>
                ) : (
                  <>
                    ✨ Simulate Changes
                  </>
                )}

              </button>

            </section>

            {/* =================================================
                SIMULATION RESULT
            ================================================= */}

            {simulation && (

              <section className="result-section">

                {/* RESULT HEADER */}

                <div className="result-header">

                  <div>

                    <div className="section-label">
                      STEP 2
                    </div>

                    <h2>
                      AI Alternative Plan
                    </h2>

                    <p>
                      Review the simulated itinerary
                      before applying it.
                    </p>

                  </div>

                  <div className="ai-badge">
                    ✨ AI Generated
                  </div>

                </div>

                {/* BUDGET COMPARISON */}

                <div className="budget-comparison">

                  <div className="budget-box">

                    <span>
                      Original
                    </span>

                    <strong>
                      {formatMoney(
                        simulation.original_budget
                      )}
                    </strong>

                  </div>

                  <div className="budget-arrow">
                    →
                  </div>

                  <div className="budget-box simulated">

                    <span>
                      Simulated
                    </span>

                    <strong>
                      {formatMoney(
                        simulation.simulated_budget
                      )}
                    </strong>

                  </div>

                  <div className="budget-change">

                    {simulation.simulated_budget <
                    simulation.original_budget
                      ? `${formatMoney(
                          simulation.original_budget -
                            simulation.simulated_budget
                        )} saved`
                      : simulation.simulated_budget >
                        simulation.original_budget
                      ? `${formatMoney(
                          simulation.simulated_budget -
                            simulation.original_budget
                        )} additional`
                      : "No budget change"}

                  </div>

                </div>

                {/* SCENARIO */}

                <div className="scenario-card">

                  <span>
                    Your scenario
                  </span>

                  <p>
                    “{simulation.scenario}”
                  </p>

                </div>

                {/* DAYS */}

                <div className="days">

                  {simulation.days.map(
                    (day) => (

                      <article
                        className="day-card"
                        key={day.day_number}
                      >

                        {/* DAY HEADER */}

                        <div className="day-header">

                          <div className="day-number">
                            {day.day_number}
                          </div>

                          <div className="day-info">

                            <div className="day-date">
                              {formatDate(
                                day.date
                              )}
                            </div>

                            <h3>
                              {day.title}
                            </h3>

                            {day.summary && (
                              <p>
                                {day.summary}
                              </p>
                            )}

                          </div>

                          <div className="day-cost">

                            <span>
                              Estimated
                            </span>

                            <strong>
                              {formatMoney(
                                day.estimated_cost
                              )}
                            </strong>

                          </div>

                        </div>

                        {/* ACTIVITIES */}

                        <div className="activities">

                          {day.activities.map(
                            (activity, index) => (

                              <div
                                className="activity"
                                key={`${day.day_number}-${index}`}
                              >

                                <div className="activity-icon">
                                  {getActivityIcon(
                                    activity.activity_type
                                  )}
                                </div>

                                <div className="activity-content">

                                  <div className="activity-top">

                                    <span className="activity-time">
                                      {activity.start_time ||
                                        "--:--"}

                                      {activity.end_time
                                        ? ` – ${activity.end_time}`
                                        : ""}
                                    </span>

                                    <span className="activity-type">
                                      {
                                        activity.activity_type
                                      }
                                    </span>

                                  </div>

                                  <h4>
                                    {activity.title}
                                  </h4>

                                  {activity.description && (
                                    <p>
                                      {
                                        activity.description
                                      }
                                    </p>
                                  )}

                                  {activity.location && (
                                    <div className="location">
                                      📍{" "}
                                      {
                                        activity.location
                                      }
                                    </div>
                                  )}

                                </div>

                                <div className="activity-cost">
                                  {formatMoney(
                                    activity.estimated_cost
                                  )}
                                </div>

                              </div>

                            )
                          )}

                        </div>

                      </article>

                    )
                  )}

                </div>

                {/* ACTIONS */}

                <div className="result-actions">

                  <button
                    className="discard-button"
                    onClick={() =>
                      setSimulation(null)
                    }
                    disabled={applying}
                  >
                    ← Discard Simulation
                  </button>

                  <button
                    className="apply-button"
                    onClick={
                      handleApplySimulation
                    }
                    disabled={applying}
                  >

                    {applying ? (
                      <>
                        <span className="button-spinner dark"></span>
                        Applying...
                      </>
                    ) : (
                      <>
                        ✓ Apply This Plan
                      </>
                    )}

                  </button>

                </div>

              </section>

            )}

          </>
        )}

      </main>

      {/* =================================================
          STYLES
      ================================================= */}

      <style jsx>{`

        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background:
            linear-gradient(
              180deg,
              #f8fafc 0%,
              #f1f5f9 100%
            );
          color: #0f172a;
        }

        /* HEADER */

        .header {
          height: 76px;
          background: rgba(255, 255, 255, 0.95);
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 6%;
          position: sticky;
          top: 0;
          z-index: 20;
          backdrop-filter: blur(14px);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
          cursor: pointer;
        }

        .brand-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(
            135deg,
            #0f766e,
            #10b981
          );
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 800;
        }

        .brand-name {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .brand-subtitle {
          font-size: 10px;
          color: #64748b;
          margin-top: 1px;
        }

        .back-button {
          border: 1px solid #e2e8f0;
          background: white;
          color: #334155;
          border-radius: 10px;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .back-button:hover {
          border-color: #0f766e;
          color: #0f766e;
        }

        /* CONTAINER */

        .container {
          width: min(1100px, 92%);
          margin: 0 auto;
          padding: 54px 0 80px;
        }

        /* HERO */

        .hero {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 34px;
        }

        .hero-icon {
          width: 62px;
          height: 62px;
          flex-shrink: 0;
          border-radius: 18px;
          background: #ccfbf1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 29px;
        }

        .eyebrow,
        .section-label {
          color: #0f766e;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.5px;
          margin-bottom: 5px;
        }

        .hero h1 {
          margin: 0;
          font-size: clamp(30px, 4vw, 42px);
          letter-spacing: -1.5px;
        }

        .hero p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 16px;
        }

        /* ALERT */

        .alert {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 17px;
          border-radius: 12px;
          margin-bottom: 20px;
          font-size: 14px;
          font-weight: 600;
        }

        .alert.error {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }

        .alert.success {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }

        /* CARD */

        .card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 22px;
          padding: 32px;
          box-shadow:
            0 10px 30px rgba(15, 23, 42, 0.05);
        }

        .section-heading {
          margin-bottom: 28px;
        }

        .section-heading h2,
        .result-header h2 {
          margin: 0;
          font-size: 24px;
          letter-spacing: -0.7px;
        }

        .section-heading p,
        .result-header p {
          margin: 7px 0 0;
          color: #64748b;
          font-size: 14px;
        }

        /* FORM */

        .form-group {
          margin-bottom: 22px;
        }

        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #334155;
          margin-bottom: 8px;
        }

        select,
        input,
        textarea {
          width: 100%;
          border: 1px solid #dbe3ec;
          border-radius: 11px;
          padding: 12px 14px;
          font-size: 14px;
          color: #0f172a;
          background: white;
          outline: none;
          transition: 0.2s ease;
          font-family: inherit;
        }

        select:focus,
        input:focus,
        textarea:focus {
          border-color: #0f766e;
          box-shadow:
            0 0 0 3px rgba(15, 118, 110, 0.1);
        }

        textarea {
          resize: vertical;
          min-height: 110px;
          line-height: 1.6;
        }

        .input-hint {
          color: #94a3b8;
          font-size: 12px;
          margin-top: 7px;
        }

        .form-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .input-with-prefix {
          position: relative;
        }

        .input-with-prefix span {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          font-weight: 700;
          pointer-events: none;
        }

        .input-with-prefix input {
          padding-left: 30px;
        }

        /* TRIP SUMMARY */

        .trip-summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 15px;
          padding: 17px;
          margin-bottom: 24px;
        }

        .trip-summary-main {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .destination-icon {
          width: 43px;
          height: 43px;
          border-radius: 12px;
          background: #ccfbf1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .trip-summary h3 {
          margin: 0;
          font-size: 16px;
        }

        .trip-summary p {
          margin: 4px 0 0;
          color: #64748b;
          font-size: 12px;
        }

        .summary-budget {
          text-align: right;
        }

        .summary-budget span {
          display: block;
          color: #94a3b8;
          font-size: 11px;
        }

        .summary-budget strong {
          display: block;
          margin-top: 3px;
          font-size: 18px;
          color: #0f766e;
        }

        /* SIMULATE */

        .simulate-button {
          width: 100%;
          border: none;
          background: linear-gradient(
            135deg,
            #0f766e,
            #10b981
          );
          color: white;
          border-radius: 12px;
          padding: 14px 20px;
          font-size: 15px;
          font-weight: 750;
          cursor: pointer;
          transition: 0.2s ease;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 9px;
        }

        .simulate-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 8px 20px rgba(15, 118, 110, 0.2);
        }

        button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .button-spinner {
          width: 17px;
          height: 17px;
          border: 2px solid rgba(255, 255, 255, 0.35);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .button-spinner.dark {
          border-color: #99f6e4;
          border-top-color: #0f766e;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* RESULT */

        .result-section {
          margin-top: 38px;
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 20px;
        }

        .ai-badge {
          background: #ccfbf1;
          color: #0f766e;
          border-radius: 999px;
          padding: 8px 13px;
          font-size: 12px;
          font-weight: 750;
          white-space: nowrap;
        }

        /* BUDGET */

        .budget-comparison {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 22px;
          display: flex;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .budget-box {
          min-width: 150px;
        }

        .budget-box span {
          display: block;
          color: #94a3b8;
          font-size: 12px;
          margin-bottom: 4px;
        }

        .budget-box strong {
          font-size: 25px;
          letter-spacing: -0.8px;
        }

        .budget-box.simulated strong {
          color: #0f766e;
        }

        .budget-arrow {
          font-size: 25px;
          color: #94a3b8;
        }

        .budget-change {
          margin-left: auto;
          background: #ecfdf5;
          color: #047857;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
        }

        /* SCENARIO */

        .scenario-card {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 15px;
          padding: 17px;
          margin-bottom: 20px;
        }

        .scenario-card span {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 800;
          color: #92400e;
        }

        .scenario-card p {
          margin: 7px 0 0;
          color: #78350f;
          font-size: 14px;
          line-height: 1.6;
        }

        /* DAY */

        .days {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .day-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          overflow: hidden;
        }

        .day-header {
          display: grid;
          grid-template-columns:
            48px minmax(0, 1fr) auto;
          align-items: center;
          gap: 15px;
          padding: 22px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .day-number {
          width: 44px;
          height: 44px;
          border-radius: 13px;
          background: #0f766e;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          font-weight: 800;
        }

        .day-date {
          color: #0f766e;
          font-size: 11px;
          font-weight: 750;
          margin-bottom: 3px;
        }

        .day-info h3 {
          margin: 0;
          font-size: 17px;
        }

        .day-info p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.5;
        }

        .day-cost {
          text-align: right;
        }

        .day-cost span {
          display: block;
          color: #94a3b8;
          font-size: 10px;
        }

        .day-cost strong {
          font-size: 15px;
        }

        /* ACTIVITIES */

        .activities {
          padding: 5px 22px;
        }

        .activity {
          display: grid;
          grid-template-columns:
            40px minmax(0, 1fr) auto;
          gap: 13px;
          align-items: start;
          padding: 18px 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .activity:last-child {
          border-bottom: none;
        }

        .activity-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
        }

        .activity-top {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
          flex-wrap: wrap;
        }

        .activity-time {
          color: #0f766e;
          font-size: 11px;
          font-weight: 750;
        }

        .activity-type {
          color: #64748b;
          background: #f1f5f9;
          border-radius: 999px;
          padding: 3px 7px;
          font-size: 9px;
          font-weight: 700;
        }

        .activity-content h4 {
          margin: 0;
          font-size: 14px;
        }

        .activity-content p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.55;
        }

        .location {
          margin-top: 7px;
          color: #64748b;
          font-size: 11px;
        }

        .activity-cost {
          font-size: 13px;
          font-weight: 750;
          color: #334155;
          white-space: nowrap;
        }

        /* ACTIONS */

        .result-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 20px;
        }

        .discard-button,
        .apply-button {
          border-radius: 11px;
          padding: 12px 18px;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: 0.2s ease;
        }

        .discard-button {
          background: white;
          border: 1px solid #e2e8f0;
          color: #475569;
        }

        .discard-button:hover {
          border-color: #94a3b8;
        }

        .apply-button {
          background: #0f766e;
          border: 1px solid #0f766e;
          color: white;
        }

        .apply-button:hover:not(:disabled) {
          background: #115e59;
        }

        /* EMPTY */

        .empty-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 22px;
          padding: 70px 30px;
          text-align: center;
        }

        .empty-icon {
          font-size: 45px;
          margin-bottom: 15px;
        }

        .empty-card h2 {
          margin: 0;
          font-size: 24px;
        }

        .empty-card p {
          color: #64748b;
          font-size: 14px;
          margin: 8px auto 22px;
          max-width: 430px;
        }

        .primary-button {
          border: none;
          background: #0f766e;
          color: white;
          padding: 12px 20px;
          border-radius: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        /* RESPONSIVE */

        @media (max-width: 760px) {

          .header {
            padding: 0 4%;
          }

          .brand-subtitle {
            display: none;
          }

          .back-button {
            padding: 9px 12px;
          }

          .container {
            width: 94%;
            padding-top: 35px;
          }

          .hero {
            align-items: flex-start;
          }

          .hero-icon {
            width: 52px;
            height: 52px;
          }

          .card {
            padding: 22px;
          }

          .form-grid {
            grid-template-columns: 1fr;
            gap: 0;
          }

          .trip-summary {
            align-items: flex-start;
            flex-direction: column;
          }

          .summary-budget {
            text-align: left;
          }

          .result-header {
            flex-direction: column;
          }

          .budget-arrow {
            display: none;
          }

          .budget-change {
            margin-left: 0;
          }

          .day-header {
            grid-template-columns:
              44px minmax(0, 1fr);
          }

          .day-cost {
            grid-column: 2;
            text-align: left;
          }

          .activity {
            grid-template-columns:
              36px minmax(0, 1fr);
          }

          .activity-cost {
            grid-column: 2;
          }

          .result-actions {
            flex-direction: column-reverse;
          }

          .discard-button,
          .apply-button {
            width: 100%;
          }
        }

        @media (max-width: 450px) {

          .hero h1 {
            font-size: 28px;
          }

          .hero p {
            font-size: 14px;
          }

          .brand-name {
            font-size: 18px;
          }

          .card {
            border-radius: 17px;
            padding: 18px;
          }

          .budget-comparison {
            padding: 17px;
          }

          .budget-box strong {
            font-size: 21px;
          }

          .day-header {
            padding: 17px;
          }

          .activities {
            padding: 3px 17px;
          }

        }

      `}</style>
    </div>
  );
}