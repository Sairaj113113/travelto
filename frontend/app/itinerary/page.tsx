"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Compass,
  Hotel,
  MapPin,
  Plane,
  Sparkles,
  Ticket,
  TrainFront,
  Utensils,
  Wallet,
  X,
  MessageCircle,
  Send,
  Image as ImageIcon,
} from "lucide-react";

import { useRouter, useSearchParams } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Activity = {
  id?: number;
  start_time?: string | null;
  end_time?: string | null;
  activity_type: string;
  title: string;
  description?: string | null;
  location?: string | null;
  estimated_cost: number;
  duration_minutes?: number | null;
  status?: string;
};

type Day = {
  id?: number;
  day_number: number;
  date: string;
  title: string;
  summary?: string | null;
  estimated_cost: number;
  activities: Activity[];
};

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
};

type SelectedActivity = Activity & {
  dayNumber: number;
  dayDate: string;
};

function formatMoney(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function formatDate(dateString: string) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );
}

function shortDate(dateString: string) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
    }
  );
}

function getActivityIcon(type: string) {
  const value = String(type || "").toLowerCase();

  if (value.includes("travel") || value.includes("transport")) {
    return <Car size={19} />;
  }

  if (value.includes("food") || value.includes("restaurant")) {
    return <Utensils size={19} />;
  }

  if (
    value.includes("hotel") ||
    value.includes("stay") ||
    value.includes("check")
  ) {
    return <Hotel size={19} />;
  }

  if (
    value.includes("sight") ||
    value.includes("view") ||
    value.includes("nature")
  ) {
    return <Compass size={19} />;
  }

  return <Ticket size={19} />;
}

export default function ItineraryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tripId = searchParams.get("trip_id");

  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<Day[]>([]);

  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedActivity, setSelectedActivity] =
    useState<SelectedActivity | null>(null);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const [bookingOpen, setBookingOpen] = useState(false);
  const [askHelpOpen, setAskHelpOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    { role: "assistant" | "user"; content: string }[]
  >([
    {
      role: "assistant",
      content: "Hi! I'm Travelto AI. Ask me about your itinerary, timings, places, budget, or changing an activity.",
    },
  ]);

  useEffect(() => {
    if (!tripId) {
      setError("Trip ID is missing.");
      setLoading(false);
      return;
    }

    loadItinerary();
  }, [tripId]);

  async function generateItinerary() {
    if (!tripId) {
      setError("Trip ID is missing.");
      return false;
    }

    const token = localStorage.getItem("travelto_token");

    if (!token) {
      router.push("/login");
      return false;
    }

    try {
      setGenerating(true);
      setError("");

      const response = await fetch(
        `${API_URL}/itinerary/trips/${tripId}/generate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            "Travelto could not build the itinerary."
        );
      }

      return true;
    } catch (err: any) {
      setError(
        err?.message ||
          "Something went wrong while creating your itinerary."
      );
      return false;
    } finally {
      setGenerating(false);
    }
  }

  async function loadItinerary() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("travelto_token");

      if (!token) {
        router.push("/login");
        return;
      }

      const tripResponse = await fetch(
        `${API_URL}/trips/${tripId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!tripResponse.ok) {
        throw new Error("Unable to load trip.");
      }

      const tripData = await tripResponse.json();

      /*
       * IMPORTANT:
       * A newly created trip does not have itinerary days yet.
       * Automatically generate the itinerary instead of showing
       * the old "NO DAYS YET" screen.
       */
      let daysResponse = await fetch(
        `${API_URL}/itinerary/trips/${tripId}/days`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!daysResponse.ok) {
        throw new Error("Unable to load itinerary.");
      }

      let dayData = await daysResponse.json();

      if (!Array.isArray(dayData)) {
        dayData = [];
      }

      /*
       * If this is a new trip, create its itinerary now.
       * The backend generator is idempotent, so an existing
       * itinerary will not be duplicated.
       */
      if (dayData.length === 0) {
        setGenerating(true);

        const generateResponse = await fetch(
          `${API_URL}/itinerary/trips/${tripId}/generate`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const generateData = await generateResponse
          .json()
          .catch(() => null);

        if (!generateResponse.ok) {
          throw new Error(
            generateData?.detail ||
              generateData?.message ||
              "Travelto could not build your itinerary."
          );
        }

        /*
         * Generation succeeded. Fetch the newly-created days
         * again so the UI renders the actual database records.
         */
        daysResponse = await fetch(
          `${API_URL}/itinerary/trips/${tripId}/days`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!daysResponse.ok) {
          throw new Error(
            "Itinerary was created, but the days could not be loaded."
          );
        }

        dayData = await daysResponse.json();

        if (!Array.isArray(dayData)) {
          dayData = [];
        }
      }

      const normalizedDays = await Promise.all(
        dayData.map(async (day: any) => {
          const activitiesResponse = await fetch(
            `${API_URL}/itinerary/days/${day.id}/activities`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          let activities: Activity[] = [];

          if (activitiesResponse.ok) {
            const activityData = await activitiesResponse.json();

            if (Array.isArray(activityData)) {
              activities = activityData;
            }
          }

          return {
            ...day,
            estimated_cost: Number(day.estimated_cost || 0),
            activities: activities.map((activity: any) => ({
              ...activity,
              estimated_cost: Number(
                activity.estimated_cost || 0
              ),
            })),
          };
        })
      );

      setTrip({
        ...tripData,
        budget: Number(tripData.budget || 0),
      });

      setDays(normalizedDays);

      if (normalizedDays.length > 0) {
        setSelectedDay(0);
      }
    } catch (err: any) {
      setError(
        err?.message ||
          "Something went wrong while loading your itinerary."
      );
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  }

  async function buildItineraryFromButton() {
    const success = await generateItinerary();

    if (success) {
      await loadItinerary();
    }
  }

  
  const currentDay = days[selectedDay];

  /*
   * IMPORTANT:
   *
   * Trip budget = the budget user gave while planning.
   *
   * Planned estimate = sum of day estimates.
   *
   * We do NOT calculate trip budget by randomly adding
   * visible activities from only the currently selected day.
   */
  const plannedEstimate = useMemo(() => {
    return days.reduce(
      (total, day) =>
        total + Number(day.estimated_cost || 0),
      0
    );
  }, [days]);

  const remainingBudget = useMemo(() => {
    return Math.max(
      Number(trip?.budget || 0) - plannedEstimate,
      0
    );
  }, [trip, plannedEstimate]);

  const budgetUsedPercentage = useMemo(() => {
    if (!trip?.budget || trip.budget <= 0) {
      return 0;
    }

    return Math.min(
      Math.round(
        (plannedEstimate / trip.budget) * 100
      ),
      100
    );
  }, [trip, plannedEstimate]);

  const destinationGallery = useMemo(() => {
    const destination = String(trip?.destination || "").toLowerCase();
    if (destination.includes("goa")) {
      return [
        { name: "Baga Beach", category: "Beach", image: "photo-1512343879784-a960bf40e7f2" },
        { name: "Palolem Beach", category: "Coastal escape", image: "photo-1500375592092-40eb2168fd21" },
        { name: "Goa Water Sports", category: "Adventure", image: "photo-1502680390469-be75c86b636f" },
        { name: "Fort Aguada", category: "History", image: "photo-1590050752117-238cb0fb12b1" },
        { name: "Goa Nightlife", category: "Nightlife", image: "photo-1514933651103-005eec06c04b" },
        { name: "Old Goa Churches", category: "Culture", image: "photo-1603565816030-6b389eeb23cb" },
      ];
    }
    if (destination.includes("araku") || destination.includes("arak")) {
      return [
        { name: "Araku Coffee Plantations", category: "Nature", image: "photo-1447933601403-0c6688de566e" },
        { name: "Borra Caves", category: "Caves", image: "photo-1509316785289-025f5b846b35" },
        { name: "Katiki Waterfalls", category: "Waterfall", image: "photo-1433086966358-54859d0ed716" },
        { name: "Padmapuram Gardens", category: "Gardens", image: "photo-1441974231531-c6227db76b6e" },
        { name: "Galikonda Viewpoint", category: "Viewpoint", image: "photo-1464822759023-fed622ff2c3b" },
        { name: "Araku Valley", category: "Scenic valley", image: "photo-1472396961693-142e6e269027" },
      ];
    }
    if (destination.includes("vizag") || destination.includes("visakhapatnam")) {
      return [
        { name: "RK Beach", category: "Beach", image: "photo-1500375592092-40eb2168fd21" },
        { name: "Kailasagiri", category: "Viewpoint", image: "photo-1464822759023-fed622ff2c3b" },
        { name: "Yarada Beach", category: "Coastal escape", image: "photo-1512343879784-a960bf40e7f2" },
        { name: "Borra Caves", category: "Caves", image: "photo-1509316785289-025f5b846b35" },
        { name: "Waterfall Trails", category: "Nature", image: "photo-1433086966358-54859d0ed716" },
        { name: "Local Food & Cafés", category: "Food", image: "photo-1555396273-367ea4eb4db5" },
      ];
    }
    const place = trip?.destination || "Your destination";
    return [
      { name: `${place} Highlights`, category: "Sightseeing", image: "photo-1500530855697-b586d89ba3ee" },
      { name: `${place} Nature Spots`, category: "Nature", image: "photo-1472396961693-142e6e269027" },
      { name: `${place} Local Culture`, category: "Culture", image: "photo-1513635269975-59663e0ac1ad" },
      { name: `${place} Food Stops`, category: "Food", image: "photo-1555396273-367ea4eb4db5" },
      { name: `${place} Viewpoints`, category: "Views", image: "photo-1464822759023-fed622ff2c3b" },
      { name: `${place} Experiences`, category: "Explore", image: "photo-1500530855697-b586d89ba3ee" },
    ];
  }, [trip?.destination]);

  async function sendAskHelpMessage() {
    const message = chatInput.trim();
    if (!message || chatSending) return;
    setChatMessages((current) => [...current, { role: "user", content: message }]);
    setChatInput("");
    setChatSending(true);
    try {
      const token = localStorage.getItem("travelto_token");
      const response = await fetch(`${API_URL}/ai-agent/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          trip_id: trip?.id,
          message,
          destination: trip?.destination,
          trip: trip ? {
            title: trip.title,
            destination: trip.destination,
            start_date: trip.start_date,
            end_date: trip.end_date,
            travelers: trip.travelers,
            budget: trip.budget,
          } : null,
          itinerary: days,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || data.message || "The AI chat service is not connected yet.");
      const answer = data.reply || data.response || data.message || data.answer;
      if (!answer) throw new Error("The AI returned an empty response.");
      setChatMessages((current) => [...current, { role: "assistant", content: String(answer) }]);
    } catch (error) {
      setChatMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: error instanceof Error
            ? `${error.message} Please make sure the backend Gemini chat endpoint is enabled.`
            : "I couldn't reach the AI service. Please try again.",
        },
      ]);
    } finally {
      setChatSending(false);
    }
  }

  function openActivity(
    activity: Activity,
    day: Day
  ) {
    setSelectedActivity({
      ...activity,
      dayNumber: day.day_number,
      dayDate: day.date,
    });
  }

  function goPreviousDay() {
    setSelectedDay((current) =>
      Math.max(0, current - 1)
    );
  }

  function goNextDay() {
    setSelectedDay((current) =>
      Math.min(days.length - 1, current + 1)
    );
  }

  function goToAgent() {
    router.push(
      `/ai-agent?trip_id=${tripId}`
    );
  }

  function goBackToTrips() {
    router.push("/dashboard");
  }

  if (loading) {
    return (
      <>
        <style jsx>{styles}</style>

        <div className="travel-loading">
          <div className="loading-orbit">
            <Plane size={30} />
          </div>

          <div className="loading-spinner" />

          <h2>Preparing your journey ✈️</h2>

          <p>
            Travelto is putting your places,
            activities and plans together...
          </p>
        </div>
      </>
    );
  }

  if (error || !trip) {
    return (
      <>
        <style jsx>{styles}</style>

        <div className="travel-error">
          <div className="error-card">
            <div className="error-icon">😕</div>

            <h2>We couldn't load this trip</h2>

            <p>
              {error ||
                "The requested trip could not be found."}
            </p>

            <button
              className="primary-button"
              onClick={goBackToTrips}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style jsx>{styles}</style>

      <div className="page">

        {/* =====================================================
            NAVBAR
        ===================================================== */}

        <header className="travel-navbar">
          <div className="nav-left">
            <button
              className="brand"
              onClick={() => router.push("/dashboard")}
            >
              <span className="brand-icon">
                <Plane size={21} />
              </span>

              <span>Travelto</span>
            </button>

            <div className="page-badge">
              My Journey
            </div>
          </div>

          <nav className="nav-right">
            <button
              onClick={() =>
                router.push("/dashboard")
              }
            >
              Home
            </button>

            <button
              onClick={() =>
                router.push("/profile")
              }
            >
              Profile
            </button>

            <button
              onClick={() => {
                localStorage.removeItem(
                  "travelto_token"
                );

                localStorage.removeItem(
                  "travelto_user"
                );

                router.push("/login");
              }}
            >
              Logout
            </button>
          </nav>
        </header>

        {/* =====================================================
            HERO
        ===================================================== */}

        <main className="container">

          <div className="breadcrumbs">
            <button
              onClick={goBackToTrips}
            >
              ← Dashboard
            </button>

            <span>/</span>

            <span>My Journey</span>
          </div>

          {generating && (
            <div className="generation-banner">
              <div className="generation-spinner" />
              <div>
                <strong>Building your itinerary...</strong>
                <span>
                  Travelto is arranging your days, places, activities and timings.
                </span>
              </div>
            </div>
          )}

          <section className="trip-hero">

            <div className="hero-visual">
              <div className="hero-visual-glow hero-glow-one" />
              <div className="hero-visual-glow hero-glow-two" />
              <div className="hero-visual-content">
                <div className="destination-orbit">
                  <Compass size={34} />
                </div>
                <span className="hero-visual-label">YOUR DESTINATION</span>
                <strong>{trip.destination}</strong>
                <span className="hero-visual-subtitle">
                  Your AI-curated journey, organized day by day.
                </span>
              </div>
              <div className="hero-visual-footer">
                <span><CalendarDays size={14} /> {days.length} {days.length === 1 ? "Day" : "Days"}</span>
                <span><MapPin size={14} /> {trip.destination}</span>
              </div>
            </div>

            <div className="hero-content">

              <div className="hero-eyebrow">
                ✈️ YOUR TRAVEL PLAN
              </div>

              <h1>
                {trip.title}
              </h1>

              <p className="hero-description">
                Your personalized journey through{" "}
                <strong>
                  {trip.destination}
                </strong>
                . Every day, place and activity
                organized in one simple travel plan.
              </p>

              <div className="trip-tags">
                <span>
                  📅{" "}
                  {days.length}{" "}
                  {days.length === 1
                    ? "Day"
                    : "Days"}
                </span>

                <span>
                  👥 {trip.travelers}{" "}
                  {trip.travelers === 1
                    ? "Traveller"
                    : "Travellers"}
                </span>

                {trip.travel_style && (
                  <span>
                    ✨ {trip.travel_style}
                  </span>
                )}

                {trip.transport_preference && (
                  <span>
                    🚗{" "}
                    {trip.transport_preference}
                  </span>
                )}
              </div>

              <div className="hero-actions">

                <button
                  className="primary-button"
                  onClick={goToAgent}
                >
                  <Sparkles size={18} />
                  Manage with AI Agent
                </button>

                <button
                  className="secondary-button"
                  onClick={() =>
                    setBookingOpen(true)
                  }
                >
                  <Ticket size={18} />
                  Plan & Book
                </button>

              </div>

            </div>
          </section>

          {/* =====================================================
              BUDGET STRIP
          ===================================================== */}

          <section className="budget-section">

            <div className="budget-header">
              <div>
                <span className="section-label">
                  💰 TRIP MONEY
                </span>

                <h2>
                  Keep your journey on budget
                </h2>
              </div>

              <div className="budget-percent">
                {budgetUsedPercentage}% planned
              </div>
            </div>

            <div className="budget-grid">

              <div className="budget-card budget-main">
                <div className="budget-icon">
                  💳
                </div>

                <div>
                  <span>
                    Trip budget
                  </span>

                  <strong>
                    {formatMoney(
                      trip.budget
                    )}
                  </strong>
                </div>
              </div>

              <div className="budget-card">
                <div className="budget-icon green">
                  🧾
                </div>

                <div>
                  <span>
                    Planned estimate
                  </span>

                  <strong>
                    {formatMoney(
                      plannedEstimate
                    )}
                  </strong>
                </div>
              </div>

              <div className="budget-card">
                <div className="budget-icon blue">
                  🪙
                </div>

                <div>
                  <span>
                    Remaining
                  </span>

                  <strong>
                    {formatMoney(
                      remainingBudget
                    )}
                  </strong>
                </div>
              </div>

            </div>

            <div className="budget-progress">
              <div
                style={{
                  width: `${budgetUsedPercentage}%`,
                }}
              />
            </div>

            <div className="budget-note">
              <span>
                📌 Planned estimates are based on
                your complete itinerary.
              </span>

              <button
                onClick={goToAgent}
              >
                Adjust with AI Agent →
              </button>
            </div>

          </section>

          {/* =====================================================
              ITINERARY HEADER
          ===================================================== */}

          <section className="journey-section">

            <div className="journey-heading">

              <div>
                <span className="section-label">
                  🗺️ YOUR JOURNEY
                </span>

                <h2>
                  Explore your trip
                </h2>

                <p>
                  Choose a day to see where
                  you're going and what you're doing.
                </p>
              </div>

              <div className="day-navigation">

                <button
                  className="arrow-button"
                  disabled={selectedDay === 0}
                  onClick={goPreviousDay}
                >
                  <ChevronLeft size={20} />
                </button>

                {days.map(
                  (day, index) => (
                    <button
                      key={
                        day.id ||
                        day.day_number
                      }
                      className={`day-button ${
                        selectedDay === index
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setSelectedDay(index)
                      }
                    >
                      <strong>
                        DAY{" "}
                        {day.day_number}
                      </strong>

                      <span>
                        {shortDate(
                          day.date
                        )}
                      </span>
                    </button>
                  )
                )}

                <button
                  className="arrow-button"
                  disabled={
                    selectedDay ===
                    days.length - 1
                  }
                  onClick={goNextDay}
                >
                  <ChevronRight size={20} />
                </button>

              </div>

            </div>

            {/* Sticky destination inspiration gallery */}
            <section className="destination-gallery" aria-label={`${trip?.destination || "Destination"} places to explore`}>
              <div className="destination-gallery-heading">
                <div>
                  <span className="section-label"><ImageIcon size={13} /> DESTINATION INSPIRATION</span>
                  <h3>Explore {trip?.destination || "your destination"}</h3>
                  <p>Places and experiences to discover during your trip.</p>
                </div>
              </div>
              <div className="destination-gallery-track">
                {destinationGallery.map((place) => (
                  <article className="destination-photo-card" key={`${place.name}-${place.category}`}>
                    <img
                      src={`https://images.unsplash.com/${place.image}?auto=format&fit=crop&w=500&q=80`}
                      alt={place.name}
                      loading="lazy"
                    />
                    <div className="destination-photo-overlay">
                      <span>{place.category}</span>
                      <strong>{place.name}</strong>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* =====================================================
                DAY CARD
            ===================================================== */}

            {days.length === 0 ? (
              <div className="empty-itinerary">
                <div className="empty-itinerary-icon">
                  <Compass size={28} />
                </div>
                <span className="section-label">NO DAYS YET</span>
                <h3>Your itinerary is ready for planning</h3>
                <p>Ask Travelto AI to create activities, timings and experiences for this trip.</p>
                <button
                  className="primary-button"
                  onClick={buildItineraryFromButton}
                  disabled={generating}
                >
                  <Sparkles size={17} />
                  {generating ? "Building your itinerary..." : "Build my itinerary"}
                </button>
              </div>
            ) : currentDay && (
              <article className="day-card">

                <div className="day-cover">

                  <div className="day-number">
                    {String(
                      currentDay.day_number
                    ).padStart(2, "0")}
                  </div>

                  <div className="day-information">

                    <span className="day-date">
                      📅{" "}
                      {formatDate(
                        currentDay.date
                      )}
                    </span>

                    <h3>
                      {currentDay.title}
                    </h3>

                    <p>
                      {currentDay.summary ||
                        "A memorable day filled with places, experiences and moments."}
                    </p>

                  </div>

                  <div className="day-budget">
                    <span>
                      Day estimate
                    </span>

                    <strong>
                      {formatMoney(
                        currentDay.estimated_cost
                      )}
                    </strong>
                  </div>

                </div>

                {/* =================================================
                    ACTIVITIES
                ================================================= */}

                <div className="activity-list">

                  {currentDay.activities.length ===
                  0 ? (
                    <div className="empty-day">
                      <span>🌴</span>

                      <h3>
                        Nothing planned yet
                      </h3>

                      <p>
                        Ask Travelto AI to
                        build this day for you.
                      </p>

                      <button
                        className="primary-button"
                        onClick={goToAgent}
                      >
                        <Sparkles size={17} />
                        Ask AI Agent
                      </button>
                    </div>
                  ) : (
                    currentDay.activities.map(
                      (
                        activity,
                        activityIndex
                      ) => (
                        <div
                          className="activity-row"
                          key={
                            activity.id ||
                            activityIndex
                          }
                        >

                          <div className="activity-time">
                            <strong>
                              {activity.start_time ||
                                "--:--"}
                            </strong>

                            <span>
                              {activity.end_time ||
                                ""}
                            </span>
                          </div>

                          <div className="activity-line">

                            <div className="activity-icon">
                              {getActivityIcon(
                                activity.activity_type
                              )}
                            </div>

                            {activityIndex <
                              currentDay
                                .activities
                                .length -
                                1 && (
                              <div className="timeline-line" />
                            )}

                          </div>

                          <div className="activity-card">

                            <div className="activity-visual">
                              <div className="activity-visual-pattern" />
                              <div className="activity-visual-icon">
                                {getActivityIcon(activity.activity_type)}
                              </div>
                              <span className="activity-visual-label">
                                {activity.activity_type || "Experience"}
                              </span>
                            </div>

                            <div className="activity-content">

                              <div className="activity-top">

                                <span className="activity-type">
                                  {activity.activity_type}
                                </span>

                                <strong className="activity-cost">
                                  {formatMoney(
                                    activity.estimated_cost
                                  )}
                                </strong>

                              </div>

                              <h4>
                                {activity.title}
                              </h4>

                              <p>
                                {activity.description ||
                                  "A special experience waiting for you."}
                              </p>

                              <div className="activity-meta">

                                {activity.location && (
                                  <span>
                                    <MapPin
                                      size={14}
                                    />

                                    {
                                      activity.location
                                    }
                                  </span>
                                )}

                                {activity.duration_minutes && (
                                  <span>
                                    <Clock3
                                      size={14}
                                    />

                                    {
                                      activity.duration_minutes
                                    }{" "}
                                    min
                                  </span>
                                )}

                              </div>

                              <div className="activity-actions">
                                <button
                                  className="ask-help-button"
                                  onClick={() => {
                                    setChatMessages((current) => [
                                      ...current,
                                      {
                                        role: "assistant",
                                        content: `I can help with “${activity.title}” on Day ${currentDay.day_number}. Ask me to change its timing, suggest alternatives, or check its budget impact.`,
                                      },
                                    ]);
                                    setAskHelpOpen(true);
                                  }}
                                >
                                  <MessageCircle size={15} />
                                  Ask Help
                                </button>
                              </div>

                            </div>

                          </div>

                        </div>
                      )
                    )
                  )}

                </div>

              </article>
            )}

          </section>

        </main>

        {askHelpOpen && (
          <div className="ask-help-backdrop" onClick={() => setAskHelpOpen(false)}>
            <section
              className="ask-help-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Ask Travelto AI for help"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="ask-help-header">
                <div className="ask-help-avatar"><Sparkles size={18} /></div>
                <div>
                  <strong>Ask Travelto AI</strong>
                  <span>Help with your trip plan</span>
                </div>
                <button className="ask-help-close" onClick={() => setAskHelpOpen(false)} aria-label="Close chat">
                  <X size={19} />
                </button>
              </header>
              <div className="ask-help-messages">
                {chatMessages.map((item, index) => (
                  <div key={`${item.role}-${index}`} className={`ask-help-message ${item.role}`}>
                    {item.content}
                  </div>
                ))}
                {chatSending && <div className="ask-help-message assistant">Thinking about your trip…</div>}
              </div>
              <form
                className="ask-help-composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendAskHelpMessage();
                }}
              >
                <input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Ask about places, timings or budget…"
                  aria-label="Message Travelto AI"
                />
                <button type="submit" disabled={!chatInput.trim() || chatSending} aria-label="Send message">
                  <Send size={17} />
                </button>
              </form>
              <p className="ask-help-note">AI suggestions can help you revise your plan. Confirm live prices and availability before booking.</p>
            </section>
          </div>
        )}

        {/* =====================================================
            ACTIVITY DETAILS MODAL
        ===================================================== */}

        {selectedActivity && (
          <div
            className="modal-backdrop"
            onClick={() =>
              setSelectedActivity(null)
            }
          >
            <div
              className="experience-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <button
                className="modal-close"
                onClick={() =>
                  setSelectedActivity(null)
                }
              >
                <X size={20} />
              </button>

              <div className="modal-visual">
                <div className="modal-visual-glow" />
                <div className="modal-visual-icon">
                  {getActivityIcon(selectedActivity.activity_type)}
                </div>
                <span>{selectedActivity.activity_type}</span>
              </div>

              <div className="modal-content">

                <div className="modal-day">
                  DAY{" "}
                  {selectedActivity.dayNumber}
                  {" • "}
                  {shortDate(
                    selectedActivity.dayDate
                  )}
                </div>

                <h2>
                  {selectedActivity.title}
                </h2>

                <p className="modal-description">
                  {selectedActivity.description ||
                    "Make this one of the memorable moments of your journey."}
                </p>

                <div className="modal-info-grid">

                  <div>
                    <MapPin size={17} />
                    <span>
                      <small>
                        Location
                      </small>

                      <strong>
                        {selectedActivity.location ||
                          "Travel location"}
                      </strong>
                    </span>
                  </div>

                  <div>
                    <Clock3 size={17} />
                    <span>
                      <small>
                        Timing
                      </small>

                      <strong>
                        {selectedActivity.start_time ||
                          "--:--"}{" "}
                        –{" "}
                        {selectedActivity.end_time ||
                          "--:--"}
                      </strong>
                    </span>
                  </div>

                  <div>
                    <Wallet size={17} />
                    <span>
                      <small>
                        Estimated cost
                      </small>

                      <strong>
                        {formatMoney(
                          selectedActivity.estimated_cost
                        )}
                      </strong>
                    </span>
                  </div>

                  <div>
                    <CalendarDays size={17} />
                    <span>
                      <small>
                        Duration
                      </small>

                      <strong>
                        {selectedActivity.duration_minutes
                          ? `${selectedActivity.duration_minutes} minutes`
                          : "Flexible"}
                      </strong>
                    </span>
                  </div>

                </div>

                <div className="modal-divider" />

                <div className="modal-booking-box">

                  <div>
                    <strong>
                      Ready to add this to your trip?
                    </strong>

                    <p>
                      Travelto AI can help arrange
                      the related travel, tickets,
                      stays and bookings.
                    </p>
                  </div>

                  <button
                    onClick={goToAgent}
                  >
                    <Sparkles size={17} />
                    Ask AI Agent
                  </button>

                </div>

              </div>

            </div>
          </div>
        )}

        {/* =====================================================
            BOOKING / PLANNING MODAL
        ===================================================== */}

        {bookingOpen && (
          <div
            className="modal-backdrop"
            onClick={() =>
              setBookingOpen(false)
            }
          >
            <div
              className="booking-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <button
                className="modal-close"
                onClick={() =>
                  setBookingOpen(false)
                }
              >
                <X size={20} />
              </button>

              <div className="booking-header">
                <div className="booking-logo">
                  ✈️
                </div>

                <div>
                  <span>
                    TRAVELTO BOOKINGS
                  </span>

                  <h2>
                    Build your journey
                  </h2>

                  <p>
                    Plan everything you need for
                    {` ${trip.destination}`}.
                  </p>
                </div>
              </div>

              <div className="booking-options">

                <button
                  onClick={goToAgent}
                >
                  <div className="booking-option-icon">
                    🤖
                  </div>

                  <div>
                    <strong>
                      Let AI arrange it
                    </strong>

                    <span>
                      Hotels, transport,
                      tickets and activities
                    </span>
                  </div>

                  <ArrowRight size={18} />
                </button>

                <button
                  onClick={goToAgent}
                >
                  <div className="booking-option-icon">
                    🏨
                  </div>

                  <div>
                    <strong>
                      Hotels & stays
                    </strong>

                    <span>
                      Find accommodation for
                      your trip
                    </span>
                  </div>

                  <ArrowRight size={18} />
                </button>

                <button
                  onClick={goToAgent}
                >
                  <div className="booking-option-icon">
                    🚆
                  </div>

                  <div>
                    <strong>
                      Travel & transport
                    </strong>

                    <span>
                      Flights, trains,
                      buses and local travel
                    </span>
                  </div>

                  <ArrowRight size={18} />
                </button>

                <button
                  onClick={goToAgent}
                >
                  <div className="booking-option-icon">
                    🎟️
                  </div>

                  <div>
                    <strong>
                      Activities & tickets
                    </strong>

                    <span>
                      Attractions and experiences
                    </span>
                  </div>

                  <ArrowRight size={18} />
                </button>

              </div>

              <div className="booking-footer">
                <Check size={16} />

                <span>
                  You will always confirm before
                  any booking or payment.
                </span>
              </div>

            </div>
          </div>
        )}

      </div>
    </>
  );
}

const styles = `
* {
  box-sizing: border-box;
}

.page {
  min-height: 100vh;
  background:
    radial-gradient(
      circle at 80% 5%,
      rgba(16, 185, 129, 0.08),
      transparent 30%
    ),
    #f4f9f8;
  color: #0f172a;
  font-family:
    Arial,
    Helvetica,
    sans-serif;
}

/* =========================================================
   NAVBAR
========================================================= */

.travel-navbar {
  height: 72px;
  padding: 0 6%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255,255,255,0.94);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid #dceae7;
  position: sticky;
  top: 0;
  z-index: 30;
}

.nav-left,
.nav-right {
  display: flex;
  align-items: center;
}

.nav-left {
  gap: 20px;
}

.nav-right {
  gap: 26px;
}

.brand {
  border: 0;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 11px;
  color: #0f172a;
  font-size: 23px;
  font-weight: 800;
  cursor: pointer;
}

.brand-icon {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  background:
    linear-gradient(
      135deg,
      #0f766e,
      #10b981
    );
  border-radius: 13px;
  box-shadow:
    0 8px 20px
    rgba(15,118,110,0.22);
}

.page-badge {
  padding: 8px 14px;
  border-radius: 10px;
  background: #e9f9f5;
  border: 1px solid #bceee2;
  color: #08766e;
  font-size: 13px;
  font-weight: 700;
}

.nav-right button {
  border: 0;
  background: transparent;
  color: #52657c;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s;
}

.nav-right button:hover {
  color: #0f766e;
}

/* =========================================================
   CONTAINER
========================================================= */

.container {
  width: min(1280px, 92%);
  margin: 0 auto;
  padding: 28px 0 70px;
}

.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #8090a5;
  font-size: 13px;
  margin-bottom: 22px;
}

.breadcrumbs button {
  border: 0;
  background: transparent;
  color: #0f766e;
  font-weight: 700;
  cursor: pointer;
}

/* =========================================================
   HERO
========================================================= */

.trip-hero {
  min-height: 430px;
  display: grid;
  grid-template-columns: 0.95fr 1.05fr;
  overflow: hidden;
  border-radius: 30px;
  background: white;
  border: 1px solid #d7e9e5;
  box-shadow:
    0 20px 55px
    rgba(15,118,110,0.10);
}






.hero-content {
  padding: 52px 54px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.hero-eyebrow,
.section-label {
  color: #087a71;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 2px;
}

.hero-content h1 {
  margin: 12px 0 16px;
  font-size: clamp(40px, 4vw, 64px);
  line-height: 0.98;
  letter-spacing: -2.5px;
}

.hero-description {
  max-width: 600px;
  color: #62748a;
  font-size: 16px;
  line-height: 1.7;
}

.hero-description strong {
  color: #0f766e;
}

.trip-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 24px;
}

.trip-tags span {
  padding: 9px 13px;
  border-radius: 999px;
  background: #f0faf8;
  border: 1px solid #c9eee7;
  color: #27716c;
  font-size: 12px;
  font-weight: 700;
}

.hero-actions {
  display: flex;
  gap: 12px;
  margin-top: 30px;
}

.primary-button,
.secondary-button {
  min-height: 46px;
  padding: 0 18px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: 0.2s;
}

.primary-button {
  border: 0;
  color: white;
  background:
    linear-gradient(
      135deg,
      #0f766e,
      #0b8f82
    );
  box-shadow:
    0 10px 22px
    rgba(15,118,110,0.22);
}

.primary-button:hover {
  transform: translateY(-2px);
}

.primary-button:disabled {
  opacity: 0.65;
  cursor: wait;
  transform: none;
}

.secondary-button {
  color: #0f766e;
  border: 1px solid #a9ddd5;
  background: white;
}

/* =========================================================
   BUDGET
========================================================= */

.budget-section {
  margin-top: 32px;
  padding: 28px;
  border-radius: 24px;
  background:
    linear-gradient(
      135deg,
      #ffffff,
      #f0fbf8
    );
  border: 1px solid #d4e9e5;
}

.budget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.budget-header h2 {
  margin: 5px 0 0;
  font-size: 24px;
}

.budget-percent {
  padding: 8px 13px;
  border-radius: 999px;
  background: #e3f7f1;
  color: #0b776e;
  font-size: 12px;
  font-weight: 800;
}

.budget-grid {
  display: grid;
  grid-template-columns:
    repeat(3, 1fr);
  gap: 14px;
}

.budget-card {
  min-height: 95px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  background: white;
  border: 1px solid #dbe9e7;
  border-radius: 16px;
}

.budget-icon {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff7e7;
  font-size: 20px;
}

.budget-icon.green {
  background: #e8faf3;
}

.budget-icon.blue {
  background: #eaf4ff;
}

.budget-card span {
  display: block;
  color: #8291a4;
  font-size: 12px;
  margin-bottom: 4px;
}

.budget-card strong {
  display: block;
  font-size: 22px;
}

.budget-progress {
  height: 8px;
  margin-top: 20px;
  overflow: hidden;
  border-radius: 999px;
  background: #dcece9;
}

.budget-progress div {
  height: 100%;
  border-radius: inherit;
  background:
    linear-gradient(
      90deg,
      #10b981,
      #0f766e
    );
  transition: width 0.5s ease;
}

.budget-note {
  margin-top: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  color: #718198;
  font-size: 12px;
}

.budget-note button {
  border: 0;
  background: transparent;
  color: #0f766e;
  font-weight: 800;
  cursor: pointer;
}

/* =========================================================
   JOURNEY
========================================================= */

.journey-section {
  margin-top: 42px;
}

.journey-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 30px;
  margin-bottom: 22px;
}

.journey-heading h2 {
  margin: 7px 0 4px;
  font-size: 32px;
  letter-spacing: -1px;
}

.journey-heading p {
  color: #718198;
  font-size: 14px;
}

.day-navigation {
  display: flex;
  align-items: center;
  gap: 8px;
}

.arrow-button,
.day-button {
  height: 54px;
  border-radius: 13px;
  border: 1px solid #d4e5e2;
  background: white;
  cursor: pointer;
}

.arrow-button {
  width: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0f766e;
}

.arrow-button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.day-button {
  min-width: 105px;
  padding: 0 15px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 3px;
  color: #44576d;
}

.day-button strong {
  font-size: 11px;
}

.day-button span {
  font-size: 12px;
}

.day-button.active {
  color: white;
  border-color: #0f766e;
  background:
    linear-gradient(
      135deg,
      #0f766e,
      #0b9487
    );
  box-shadow:
    0 10px 22px
    rgba(15,118,110,0.20);
}

/* =========================================================
   DAY CARD
========================================================= */

.day-card {
  overflow: hidden;
  border-radius: 26px;
  background: white;
  border: 1px solid #d5e7e3;
  box-shadow:
    0 16px 45px
    rgba(15,118,110,0.07);
}

.day-cover {
  padding: 28px 30px;
  display: grid;
  grid-template-columns: 68px 1fr auto;
  align-items: center;
  gap: 18px;
  background:
    linear-gradient(
      110deg,
      #eafaf6,
      #ffffff
    );
  border-bottom: 1px solid #dcebe8;
}

.day-number {
  width: 58px;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 17px;
  color: white;
  font-size: 19px;
  font-weight: 900;
  background:
    linear-gradient(
      135deg,
      #0f766e,
      #10b981
    );
  box-shadow:
    0 10px 20px
    rgba(15,118,110,0.20);
}

.day-date {
  display: block;
  margin-bottom: 5px;
  color: #087a71;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1.3px;
  text-transform: uppercase;
}

.day-information h3 {
  margin: 0 0 6px;
  font-size: 22px;
}

.day-information p {
  margin: 0;
  max-width: 750px;
  color: #64768b;
  font-size: 13px;
  line-height: 1.6;
}

.day-budget {
  text-align: right;
}

.day-budget span {
  display: block;
  color: #8392a5;
  font-size: 11px;
}

.day-budget strong {
  display: block;
  margin-top: 3px;
  color: #0f766e;
  font-size: 20px;
}

/* =========================================================
   ACTIVITIES
========================================================= */

.activity-list {
  padding: 30px;
}

.activity-row {
  display: grid;
  grid-template-columns: 72px 50px 1fr;
  gap: 12px;
  position: relative;
}

.activity-time {
  padding-top: 12px;
  text-align: right;
}

.activity-time strong {
  display: block;
  color: #183149;
  font-size: 13px;
}

.activity-time span {
  display: block;
  margin-top: 2px;
  color: #91a0b2;
  font-size: 10px;
}

.activity-line {
  position: relative;
  display: flex;
  justify-content: center;
}

.activity-icon {
  position: relative;
  z-index: 2;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  color: #0f766e;
  background: #e9faf6;
  border: 1px solid #bfe9df;
}

.timeline-line {
  position: absolute;
  top: 38px;
  bottom: -18px;
  width: 1px;
  background: #cce3df;
}

.activity-card {
  min-height: 160px;
  margin-bottom: 18px;
  display: grid;
  grid-template-columns: 210px 1fr;
  overflow: hidden;
  border: 1px solid #d7e8e5;
  border-radius: 18px;
  background: white;
  transition: 0.25s;
}

.activity-card:hover {
  border-color: #91d8ca;
  box-shadow:
    0 12px 30px
    rgba(15,118,110,0.08);
  transform: translateY(-2px);
}





.activity-content {
  padding: 20px 22px;
}

.activity-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
}

.activity-type {
  padding: 5px 9px;
  border-radius: 999px;
  color: #08776e;
  background: #eaf9f5;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.activity-cost {
  color: #08776e;
  font-size: 15px;
}

.activity-content h4 {
  margin: 11px 0 5px;
  font-size: 19px;
}

.activity-content p {
  margin: 0;
  color: #66798f;
  font-size: 12px;
  line-height: 1.6;
}

.activity-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 12px;
}

.activity-meta span {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #6d8094;
  font-size: 11px;
}

.activity-actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.details-button,
.book-mini-button {
  height: 34px;
  padding: 0 11px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.details-button {
  color: #0f766e;
  border: 1px solid #9eddd3;
  background: white;
}

.book-mini-button {
  color: white;
  border: 0;
  background: #0f766e;
}

/* =========================================================
   EMPTY DAY
========================================================= */

.empty-day {
  padding: 60px 20px;
  text-align: center;
}

.empty-day > span {
  font-size: 40px;
}

.empty-day h3 {
  margin: 10px 0 5px;
}

.empty-day p {
  color: #718198;
  font-size: 13px;
}

/* =========================================================
   AI BANNER
========================================================= */

.ai-banner {
  position: relative;
  overflow: hidden;
  margin-top: 30px;
  padding: 28px 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 25px;
  border-radius: 24px;
  color: white;
  background:
    linear-gradient(
      110deg,
      #083f3b,
      #0f766e
    );
  box-shadow:
    0 18px 40px
    rgba(15,118,110,0.20);
}

.ai-glow {
  position: absolute;
  width: 260px;
  height: 260px;
  right: 80px;
  top: -180px;
  border-radius: 50%;
  background: rgba(16,185,129,0.35);
  filter: blur(20px);
}

.ai-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 17px;
}

.ai-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 15px;
  background: rgba(255,255,255,0.14);
  font-size: 24px;
}

.ai-content span {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1.5px;
  color: #a7f3d0;
}

.ai-content h2 {
  margin: 5px 0;
  font-size: 21px;
}

.ai-content p {
  margin: 0;
  color: #cce9e5;
  font-size: 12px;
}

.ai-banner > button {
  position: relative;
  height: 43px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 11px;
  color: #075e57;
  background: white;
  font-weight: 800;
  cursor: pointer;
}

/* =========================================================
   MODALS
========================================================= */

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(6,25,29,0.68);
  backdrop-filter: blur(8px);
}

.experience-modal {
  position: relative;
  width: min(760px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 25px;
  background: white;
  box-shadow:
    0 30px 80px
    rgba(0,0,0,0.30);
}

.modal-close {
  position: absolute;
  z-index: 4;
  top: 15px;
  right: 15px;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  color: #173044;
  background: rgba(255,255,255,0.92);
  cursor: pointer;
}





.modal-content {
  padding: 27px;
}

.modal-day {
  color: #0f766e;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1.3px;
}

.modal-content h2 {
  margin: 8px 0;
  font-size: 30px;
}

.modal-description {
  color: #687b90;
  font-size: 14px;
  line-height: 1.7;
}

.modal-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-top: 20px;
}

.modal-info-grid > div {
  padding: 14px;
  display: flex;
  gap: 10px;
  border-radius: 13px;
  background: #f5faf9;
  color: #0f766e;
}

.modal-info-grid span {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.modal-info-grid small {
  color: #8190a2;
  font-size: 10px;
}

.modal-info-grid strong {
  color: #173044;
  font-size: 12px;
}

.modal-divider {
  height: 1px;
  margin: 22px 0;
  background: #e1ecea;
}

.modal-booking-box {
  padding: 17px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  border-radius: 15px;
  background:
    linear-gradient(
      110deg,
      #eafaf6,
      #f6fbfa
    );
  border: 1px solid #ccebe4;
}

.modal-booking-box strong {
  font-size: 14px;
}

.modal-booking-box p {
  margin: 4px 0 0;
  color: #708196;
  font-size: 11px;
}

.modal-booking-box button {
  height: 40px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 7px;
  border: 0;
  border-radius: 10px;
  color: white;
  background: #0f766e;
  font-weight: 800;
  cursor: pointer;
}

/* =========================================================
   BOOKING MODAL
========================================================= */

.booking-modal {
  position: relative;
  width: min(650px, 100%);
  padding: 30px;
  border-radius: 25px;
  background: white;
  box-shadow:
    0 30px 80px
    rgba(0,0,0,0.30);
}

.booking-header {
  display: flex;
  align-items: center;
  gap: 15px;
  padding-right: 35px;
}

.booking-logo {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 15px;
  background: #e9faf6;
  font-size: 25px;
}

.booking-header span {
  color: #0f766e;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1.3px;
}

.booking-header h2 {
  margin: 4px 0;
  font-size: 25px;
}

.booking-header p {
  margin: 0;
  color: #718198;
  font-size: 12px;
}

.booking-options {
  margin-top: 23px;
  display: grid;
  gap: 9px;
}

.booking-options button {
  width: 100%;
  padding: 15px;
  display: grid;
  grid-template-columns: 45px 1fr auto;
  align-items: center;
  gap: 13px;
  text-align: left;
  border: 1px solid #dce9e7;
  border-radius: 14px;
  background: white;
  cursor: pointer;
  transition: 0.2s;
}

.booking-options button:hover {
  border-color: #8bd3c7;
  background: #f5fbf9;
  transform: translateX(2px);
}

.booking-option-icon {
  width: 43px;
  height: 43px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #edf9f6;
  font-size: 20px;
}

.booking-options strong,
.booking-options span {
  display: block;
}

.booking-options strong {
  color: #172f43;
  font-size: 13px;
}

.booking-options span {
  margin-top: 3px;
  color: #8090a3;
  font-size: 11px;
}

.booking-options button > svg {
  color: #0f766e;
}

.booking-footer {
  margin-top: 18px;
  padding: 11px;
  display: flex;
  align-items: center;
  gap: 7px;
  border-radius: 10px;
  color: #5e7880;
  background: #f3faf8;
  font-size: 10px;
}

.booking-footer svg {
  color: #10a77e;
}

.generation-banner {
  margin: 0 0 22px;
  padding: 13px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #bfe9df;
  border-radius: 14px;
  background: linear-gradient(135deg, #ecfbf7, #f8fdfc);
  color: #0f766e;
}

.generation-banner strong {
  display: block;
  font-size: 13px;
  margin-bottom: 2px;
}

.generation-banner span {
  display: block;
  color: #718198;
  font-size: 11px;
}

.generation-spinner {
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  border: 2px solid #c9f3eb;
  border-top-color: #0f766e;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* =========================================================
   LOADING
========================================================= */

.travel-loading {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(
      circle at center,
      #e6f8f4,
      #f5faf9 45%,
      #eef5f4
    );
  text-align: center;
}

.loading-orbit {
  width: 70px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 22px;
  color: white;
  background:
    linear-gradient(
      135deg,
      #0f766e,
      #10b981
    );
  box-shadow:
    0 15px 30px
    rgba(15,118,110,0.20);
}

.loading-spinner {
  width: 38px;
  height: 38px;
  margin-top: 22px;
  border: 3px solid #c9f3eb;
  border-top-color: #0f766e;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.travel-loading h2 {
  margin: 20px 0 5px;
  font-size: 22px;
}

.travel-loading p {
  color: #718198;
  font-size: 13px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* =========================================================
   ERROR
========================================================= */

.travel-error {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f4f9f8;
  padding: 20px;
}

.error-card {
  width: min(450px, 100%);
  padding: 40px;
  text-align: center;
  border-radius: 22px;
  background: white;
  border: 1px solid #dce9e7;
}

.error-icon {
  font-size: 45px;
}

.error-card h2 {
  margin: 12px 0 7px;
}

.error-card p {
  color: #718198;
  line-height: 1.6;
  font-size: 13px;
  margin-bottom: 22px;
}

/* =========================================================
   IMAGE-FREE TRAVEL VISUALS
========================================================= */

.hero-visual {
  position: relative;
  min-height: 430px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 25% 25%, rgba(16,185,129,.34), transparent 30%),
    radial-gradient(circle at 80% 75%, rgba(14,165,233,.20), transparent 34%),
    linear-gradient(145deg, #063d39 0%, #0f766e 48%, #073b48 100%);
  color: white;
}

.hero-visual::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px);
  background-size: 34px 34px;
  mask-image: linear-gradient(to bottom, rgba(0,0,0,.8), transparent);
}

.hero-visual-content {
  position: relative;
  z-index: 2;
  width: min(390px, 82%);
  text-align: center;
}

.destination-orbit {
  width: 86px;
  height: 86px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,255,255,.25);
  border-radius: 28px;
  background: rgba(255,255,255,.11);
  box-shadow: 0 20px 55px rgba(0,0,0,.20);
  backdrop-filter: blur(12px);
}

.hero-visual-label {
  display: block;
  color: #a7f3d0;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 2px;
}

.hero-visual-content strong {
  display: block;
  margin-top: 9px;
  font-size: clamp(32px, 4vw, 52px);
  line-height: 1;
  letter-spacing: -1.8px;
}

.hero-visual-subtitle {
  display: block;
  margin: 16px auto 0;
  max-width: 320px;
  color: rgba(255,255,255,.72);
  font-size: 13px;
  line-height: 1.6;
}

.hero-visual-footer {
  position: absolute;
  z-index: 3;
  left: 22px;
  right: 22px;
  bottom: 22px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.hero-visual-footer span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 11px;
  border: 1px solid rgba(255,255,255,.16);
  border-radius: 999px;
  color: rgba(255,255,255,.82);
  background: rgba(0,0,0,.16);
  backdrop-filter: blur(10px);
  font-size: 10px;
  font-weight: 700;
}

.hero-visual-glow {
  position: absolute;
  width: 210px;
  height: 210px;
  border-radius: 50%;
  filter: blur(4px);
  opacity: .35;
}

.hero-glow-one {
  top: -90px;
  left: -80px;
  background: #34d399;
}

.hero-glow-two {
  right: -80px;
  bottom: -100px;
  background: #38bdf8;
}

.activity-visual {
  position: relative;
  min-height: 160px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background:
    radial-gradient(circle at 20% 20%, rgba(16,185,129,.22), transparent 35%),
    linear-gradient(145deg, #e7f8f4, #dcefee);
  border-right: 1px solid #d7e8e5;
}

.activity-visual-pattern {
  position: absolute;
  inset: 0;
  opacity: .5;
  background:
    linear-gradient(135deg, transparent 48%, rgba(15,118,110,.07) 49%, transparent 51%);
  background-size: 28px 28px;
}

.activity-visual-icon {
  position: relative;
  z-index: 2;
  width: 58px;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 19px;
  color: #0f766e;
  background: rgba(255,255,255,.76);
  border: 1px solid rgba(15,118,110,.14);
  box-shadow: 0 12px 28px rgba(15,118,110,.12);
}

.activity-visual-label {
  position: relative;
  z-index: 2;
  max-width: 150px;
  color: #4d706d;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 1.1px;
  text-transform: uppercase;
  text-align: center;
}

.empty-itinerary {
  padding: 70px 25px;
  text-align: center;
  border: 1px dashed #b8dcd5;
  border-radius: 22px;
  background: linear-gradient(145deg, #f8fdfc, #eef9f6);
}

.empty-itinerary-icon {
  width: 62px;
  height: 62px;
  margin: 0 auto 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  color: #0f766e;
  background: #e3f8f2;
  border: 1px solid #c7ebe2;
}

.empty-itinerary h3 {
  margin: 8px 0 6px;
  font-size: 21px;
}

.empty-itinerary p {
  max-width: 460px;
  margin: 0 auto 20px;
  color: #718198;
  font-size: 13px;
  line-height: 1.6;
}

.modal-visual {
  position: relative;
  height: 220px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 13px;
  color: white;
  background:
    radial-gradient(circle at 25% 25%, rgba(16,185,129,.36), transparent 34%),
    linear-gradient(145deg, #073f3b, #0f766e 55%, #075985);
}

.modal-visual::before {
  content: "";
  position: absolute;
  inset: 0;
  opacity: .3;
  background:
    linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px),
    linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px);
  background-size: 30px 30px;
}

.modal-visual-icon,
.modal-visual span {
  position: relative;
  z-index: 2;
}

.modal-visual-icon {
  width: 68px;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 22px;
  background: rgba(255,255,255,.13);
  border: 1px solid rgba(255,255,255,.20);
  backdrop-filter: blur(10px);
}

.modal-visual span {
  padding: 7px 11px;
  border-radius: 999px;
  background: rgba(0,0,0,.16);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1px;
  text-transform: uppercase;
}

/* =========================================================
   RESPONSIVE
========================================================= */

@media (max-width: 1000px) {

  .travel-navbar {
    padding: 0 3%;
  }

  .container {
    width: 94%;
  }

  .trip-hero {
    grid-template-columns: 1fr;
  }

  .hero-visual {
    min-height: 330px;
  }

  .budget-grid {
    grid-template-columns: 1fr;
  }

  .journey-heading {
    flex-direction: column;
    align-items: flex-start;
  }

  .day-navigation {
    width: 100%;
    overflow-x: auto;
    padding-bottom: 4px;
  }

}

@media (max-width: 700px) {

  .travel-navbar {
    height: 64px;
  }

  .nav-right {
    gap: 10px;
  }

  .nav-right button {
    font-size: 11px;
  }

  .page-badge {
    display: none;
  }

  .brand {
    font-size: 20px;
  }

  .container {
    width: 94%;
    padding-top: 18px;
  }

  .hero-content {
    padding: 30px 24px;
  }

  .hero-content h1 {
    font-size: 40px;
  }

  .hero-actions {
    flex-direction: column;
  }

  .budget-section {
    padding: 20px;
  }

  .budget-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .day-cover {
    grid-template-columns: 55px 1fr;
  }

  .day-budget {
    grid-column: 2;
    text-align: left;
  }

  .activity-list {
    padding: 18px;
  }

  .activity-row {
    grid-template-columns: 52px 32px 1fr;
  }

  .activity-card {
    grid-template-columns: 1fr;
  }

  .activity-visual {
    min-height: 145px;
    border-right: 0;
    border-bottom: 1px solid #d7e8e5;
  }

  .modal-info-grid {
    grid-template-columns: 1fr;
  }

  .modal-booking-box {
    flex-direction: column;
    align-items: flex-start;
  }

  .ai-banner {
    flex-direction: column;
    align-items: flex-start;
  }

  .budget-note {
    align-items: flex-start;
    flex-direction: column;
  }

}

@media (max-width: 480px) {

  .nav-right button:nth-child(2) {
    display: none;
  }

  .hero-visual {
    min-height: 245px;
  }

  .hero-content h1 {
    font-size: 34px;
  }

  .journey-heading h2 {
    font-size: 27px;
  }

  .activity-row {
    grid-template-columns: 42px 25px 1fr;
  }

  .activity-time strong {
    font-size: 11px;
  }

  .activity-time span {
    font-size: 9px;
  }

  .activity-content {
    padding: 15px;
  }

  .activity-top {
    align-items: flex-start;
  }

  .activity-cost {
    font-size: 13px;
  }

}

/* Ask Help action */
.activity-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}
.ask-help-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid #9bded4;
  border-radius: 9px;
  background: #effcf9;
  color: #087f75;
  padding: 8px 13px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: background .2s, transform .2s;
}
.ask-help-button:hover { background: #d8f7f0; transform: translateY(-1px); }

/* Sticky, destination-specific photo strip */
.destination-gallery {
  position: sticky;
  top: 10px;
  z-index: 20;
  margin: 0 0 22px;
  padding: 14px;
  border: 1px solid rgba(193, 226, 220, .95);
  border-radius: 18px;
  background: rgba(248, 255, 253, .96);
  box-shadow: 0 8px 24px rgba(10, 72, 66, .09);
  backdrop-filter: blur(12px);
}
.destination-gallery-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.destination-gallery-heading .section-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.destination-gallery-heading h3 {
  margin: 4px 0 2px;
  font-size: 17px;
  color: #122b3d;
}
.destination-gallery-heading p {
  margin: 0;
  color: #718198;
  font-size: 11px;
}
.destination-gallery-track {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 9px;
}
.destination-photo-card {
  position: relative;
  min-width: 0;
  height: 105px;
  overflow: hidden;
  border-radius: 11px;
  background: #dceee9;
}
.destination-photo-card img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  transition: transform .3s ease;
}
.destination-photo-card:hover img { transform: scale(1.06); }
.destination-photo-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 3px;
  padding: 9px;
  color: white;
  background: linear-gradient(180deg, transparent 20%, rgba(0, 24, 30, .78) 100%);
}
.destination-photo-overlay span {
  width: fit-content;
  border-radius: 4px;
  padding: 2px 5px;
  background: rgba(11, 135, 120, .9);
  font-size: 9px;
  font-weight: 800;
}
.destination-photo-overlay strong {
  font-size: 11px;
  line-height: 1.25;
}

/* Ask Help chat box */
.ask-help-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 24px;
  background: rgba(7, 26, 34, .18);
}
.ask-help-panel {
  width: min(390px, calc(100vw - 28px));
  height: min(560px, calc(100dvh - 40px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #cce5df;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 22px 70px rgba(0, 35, 39, .24);
}
.ask-help-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  color: #fff;
  background: linear-gradient(120deg, #064e49, #0f8a7c);
}
.ask-help-avatar {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: rgba(255,255,255,.16);
}
.ask-help-header > div:nth-child(2) { display: flex; flex: 1; flex-direction: column; gap: 3px; }
.ask-help-header strong { font-size: 14px; }
.ask-help-header span { font-size: 11px; opacity: .85; }
.ask-help-close {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 9px;
  background: rgba(255,255,255,.14);
  color: white;
  cursor: pointer;
}
.ask-help-messages {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding: 16px;
  background: #f6fbfa;
}
.ask-help-message {
  max-width: 88%;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  padding: 10px 12px;
  border-radius: 13px;
  font-size: 12px;
  line-height: 1.55;
}
.ask-help-message.assistant {
  align-self: flex-start;
  border: 1px solid #d9e9e5;
  border-bottom-left-radius: 4px;
  background: white;
  color: #284251;
}
.ask-help-message.user {
  align-self: flex-end;
  border-bottom-right-radius: 4px;
  background: #0f8276;
  color: white;
}
.ask-help-composer {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #e3eeeb;
}
.ask-help-composer input {
  flex: 1;
  min-width: 0;
  border: 1px solid #d3e5e0;
  border-radius: 10px;
  outline: none;
  padding: 11px 12px;
  font: inherit;
  font-size: 12px;
}
.ask-help-composer input:focus { border-color: #0f8a7c; }
.ask-help-composer button {
  width: 42px;
  border: 0;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: white;
  background: #0f8276;
  cursor: pointer;
}
.ask-help-composer button:disabled { opacity: .45; cursor: not-allowed; }
.ask-help-note {
  margin: 0;
  padding: 0 12px 12px;
  color: #778892;
  font-size: 10px;
  line-height: 1.4;
}
@media (max-width: 900px) {
  .destination-gallery-track { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .destination-photo-card { height: 95px; }
  .destination-gallery { top: 4px; }
}
@media (max-width: 560px) {
  .destination-gallery { padding: 10px; }
  .destination-gallery-track { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .destination-photo-card { height: 88px; }
  .destination-gallery-heading p { display: none; }
  .ask-help-backdrop { padding: 10px; align-items: flex-end; justify-content: center; }
}
`;