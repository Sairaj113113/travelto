"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  CalendarDays,
  Check,
  CircleDollarSign,
  CloudSun,
  ExternalLink,
  Hotel,
  MapPin,
  Navigation,
  RefreshCw,
  Sparkles,
  Ticket,
  TrainFront,
  Plane,
  Utensils,
  Wallet,
  Clock3,
  Route,
  Map,
  Waves,
  Mountain,
  Landmark,
  ShoppingBag,
  AlertTriangle,
  X,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type AnyObject = Record<string, any>;

export default function AIAgentPage() {
  const [result, setResult] = useState<AnyObject | null>(null);
  const [request, setRequest] = useState<AnyObject | null>(null);

  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const [error, setError] = useState("");

  /*
   * ---------------------------------------------------------
   * LOAD SAVED AGENT RESULT
   * ---------------------------------------------------------
   */

  useEffect(() => {
    try {
      const savedResult = localStorage.getItem(
        "travelto_agent_result"
      );

      if (savedResult) {
        setResult(JSON.parse(savedResult));
      }
    } catch {
      setError("Unable to read the saved Agent result.");
    }

    try {
      const savedRequest = localStorage.getItem(
        "travelto_agent_request"
      );

      if (savedRequest) {
        setRequest(JSON.parse(savedRequest));
      }
    } catch {
      // Ignore invalid request.
    }

    setLoading(false);
  }, []);

  /*
   * ---------------------------------------------------------
   * NORMALIZED DATA
   * ---------------------------------------------------------
   */

  const experiencePlan = useMemo(
    () => extractExperiencePlan(result),
    [result]
  );

  const transport = useMemo(
    () => extractTransport(result),
    [result]
  );

  const hotels = useMemo(
    () => extractHotels(result),
    [result]
  );

  const verifiedPlaces = useMemo(
    () => extractPlaces(result),
    [result]
  );

  const restaurants = useMemo(
    () => extractRestaurants(result),
    [result]
  );

  const routes = useMemo(
    () => extractRoutes(result),
    [result]
  );

  const aiAnalysis =
    result?.final_analysis ??
    result?.ai_analysis ??
    result?.analysis ??
    null;

  const budget =
    result?.budget ??
    result?.budget_analysis ??
    aiAnalysis?.budget ??
    null;

  /*
   * ---------------------------------------------------------
   * SAVE CURRENT RESEARCH
   * ---------------------------------------------------------
   */

  function saveResearch() {
    if (!result) return;

    localStorage.setItem(
      "travelto_agent_result",
      JSON.stringify(result)
    );

    localStorage.setItem(
      "travelto_agent_research",
      JSON.stringify({
        request,
        result,
        saved_at: new Date().toISOString(),
      })
    );
  }

  /*
   * ---------------------------------------------------------
   * FINAL ITINERARY
   * ---------------------------------------------------------
   *
   * The final itinerary must use:
   *
   * 1. Original user requirements
   * 2. Gemini experience plan
   * 3. Real transport
   * 4. Real hotels
   * 5. Real places
   * 6. Real restaurant information
   * 7. Real routes
   * 8. Weather
   *
   * Gemini then creates the connected itinerary.
   */

  async function generateFinalItinerary() {
    if (!request || !result) {
      setError(
        "Trip research is missing. Please research the trip again."
      );
      return;
    }

    const token = localStorage.getItem(
      "travelto_token"
    );

    if (!token) {
      window.location.href = "/login";
      return;
    }

    setFinalizing(true);
    setError("");

    const payload = {
      original_request: request,

      experience_plan:
        result.experience_plan ??
        result.research_plan ??
        result.trip_plan ??
        experiencePlan,

      verified_research: {
        transport:
          result.transport ??
          result.flights ??
          result.trains ??
          null,

        hotels:
          result.hotels ?? null,

        places:
          result.places ?? null,

        restaurants:
          result.restaurants ?? null,

        weather:
          result.weather ?? null,

        routes:
          result.routes ??
          result.route ??
          null,
      },

      ai_analysis: aiAnalysis,

      budget,

      created_at: new Date().toISOString(),
    };

    try {
      /*
       * New backend endpoint.
       *
       * The backend will:
       *
       *   verified data
       *        +
       *   Gemini experience plan
       *        ↓
       *   final Gemini itinerary
       */

      const response = await fetch(
        `${API_URL}/ai-agent/finalize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const responseText =
        await response.text();

      let data: AnyObject = {};

      try {
        data = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        data = {};
      }

      if (response.status === 401) {
        localStorage.removeItem(
          "travelto_token"
        );

        localStorage.removeItem(
          "travelto_user"
        );

        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(
          Array.isArray(data?.detail)
            ? data.detail
                .map(
                  (item: any) =>
                    item?.msg ||
                    "Invalid field"
                )
                .join(", ")
            : data?.detail ||
                data?.message ||
                "Final itinerary generation failed."
        );
      }

      /*
       * Save final itinerary result.
       */

      localStorage.setItem(
        "travelto_final_itinerary",
        JSON.stringify(data)
      );

      localStorage.setItem(
        "travelto_final_plan_request",
        JSON.stringify(payload)
      );

      /*
       * If backend returns a real trip ID,
       * use it.
       */

      const tripId =
        data?.trip?.id ??
        data?.trip_id ??
        data?.itinerary?.trip_id ??
        null;

      if (tripId) {
        window.location.href =
          `/itinerary/${tripId}`;
        return;
      }

      /*
       * Fallback for the current itinerary page.
       */

      window.location.href =
        "/itinerary?agent_ready=true";
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate the final itinerary."
      );
    } finally {
      setFinalizing(false);
    }
  }

  /*
   * ---------------------------------------------------------
   * BOOKING
   * ---------------------------------------------------------
   *
   * Travelto never pretends that it completed
   * an external booking.
   */

  function bookNow() {
    const transportUrl =
      findBookingUrl(
        transport[0]
      );

    const hotelUrl =
      findBookingUrl(
        hotels[0]
      );

    const url =
      transportUrl ||
      hotelUrl;

    if (url) {
      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );
      return;
    }

    setError(
      "No external provider booking link was returned for these results."
    );
  }

  function bookLater() {
    saveResearch();

    localStorage.setItem(
      "travelto_saved_booking_options",
      JSON.stringify({
        request,
        transport,
        hotels,
        saved_at:
          new Date().toISOString(),
      })
    );

    setError(
      "Your researched travel options have been saved for later."
    );
  }

  /*
   * ---------------------------------------------------------
   * RESEARCH AGAIN
   * ---------------------------------------------------------
   */

  async function researchAgain() {
    const token = localStorage.getItem(
      "travelto_token"
    );

    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (!request) {
      setError(
        "Trip request is missing. Please start again from Plan Trip."
      );
      return;
    }

    setResearching(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/ai-agent/arrange`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(request),
        }
      );

      const responseText =
        await response.text();

      let data: AnyObject = {};

      try {
        data = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        data = {};
      }

      if (response.status === 401) {
        localStorage.removeItem(
          "travelto_token"
        );

        localStorage.removeItem(
          "travelto_user"
        );

        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(
          Array.isArray(data?.detail)
            ? data.detail
                .map(
                  (item: any) =>
                    item?.msg ||
                    "Invalid field"
                )
                .join(", ")
            : data?.detail ||
                data?.message ||
                "Agent research failed."
        );
      }

      localStorage.setItem(
        "travelto_agent_result",
        JSON.stringify(data)
      );

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to research the trip again."
      );
    } finally {
      setResearching(false);
    }
  }

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (loading) {
    return <LoadingScreen />;
  }

  /*
   * ---------------------------------------------------------
   * NO RESULT
   * ---------------------------------------------------------
   */

  if (!result) {
    return (
      <>
        <main className="agent-page">
          <div className="agent-shell">
            <Header />

            <div className="error-box">
              <X size={20} />

              <div>
                <b>
                  AI Travel Agent result not found
                </b>

                <p>
                  {error ||
                    "Start from Plan Trip and choose Let AI Arrange My Trip."}
                </p>
              </div>
            </div>
          </div>
        </main>

        <Styles />
      </>
    );
  }

  /*
   * ---------------------------------------------------------
   * PAGE
   * ---------------------------------------------------------
   */

  return (
    <>
      <main className="agent-page">
        <div className="agent-shell">

          <Header />

          {/* ==================================================
              HERO
          ================================================== */}

          <section className="hero">
            <div>
              <span className="eyebrow">
                <Sparkles size={13} />
                AI TRAVEL AGENT
              </span>

              <h1>
                Your trip is being{" "}
                <em>arranged.</em>
              </h1>

              <p>
                Travelto first understands what kind of
                experience fits your trip, then verifies
                real-world travel information before creating
                the final itinerary.
              </p>
            </div>

            <div className="complete">
              <Check size={17} />

              <div>
                <b>
                  Research complete
                </b>

                <span>
                  No booking or payment has been made
                </span>
              </div>
            </div>
          </section>

          {/* ==================================================
              ERROR
          ================================================== */}

          {error && (
            <div className="inline-error">
              <X size={15} />
              {error}
            </div>
          )}

          {/* ==================================================
              TRIP SUMMARY
          ================================================== */}

          <section className="summary">

            <Summary
              icon={<MapPin size={15} />}
              label="Route"
              value={`${request?.starting_location || "—"} → ${
                request?.destination || "—"
              }`}
            />

            <Summary
              icon={<CalendarDays size={15} />}
              label="Dates"
              value={`${request?.start_date || "—"} → ${
                request?.end_date || "—"
              }`}
            />

            <Summary
              icon={<Wallet size={15} />}
              label="Budget"
              value={
                request?.budget
                  ? `₹${money(
                      request.budget
                    )}`
                  : "—"
              }
            />

            <Summary
              icon={<Ticket size={15} />}
              label="Travelers"
              value={String(
                request?.travelers ||
                  "—"
              )}
            />

          </section>

          {/* ==================================================
              AGENT FLOW
          ================================================== */}

          <section className="agent-flow">

            <FlowStep
              number="01"
              icon={<Sparkles size={17} />}
              title="Gemini understands your trip"
              description="The AI identifies the experiences, areas, activities and food style that make sense for this destination."
              active
            />

            <div className="flow-line" />

            <FlowStep
              number="02"
              icon={<Navigation size={17} />}
              title="Travelto verifies reality"
              description="Real APIs provide transport, hotels, routes, weather and other available real-world information."
              active
            />

            <div className="flow-line" />

            <FlowStep
              number="03"
              icon={<Check size={17} />}
              title="Gemini connects everything"
              description="The final itinerary is created using the verified travel information instead of guessed timings or prices."
              active
            />

          </section>

          {/* ==================================================
              EXPERIENCE PLAN
          ================================================== */}

          {experiencePlan.length > 0 && (
            <section className="section-card">

              <SectionHeading
                icon={<Sparkles size={18} />}
                title="Your AI experience plan"
                description="Gemini selected the kind of experiences that fit your destination and preferences."
              />

              <div className="experience-grid">
                {experiencePlan
                  .slice(0, 12)
                  .map(
                    (
                      item,
                      index
                    ) => (
                      <ExperienceCard
                        key={`experience-${index}`}
                        item={item}
                      />
                    )
                  )}
              </div>

            </section>
          )}

          {/* ==================================================
              VERIFIED TRANSPORT
          ================================================== */}

          <section className="section-card">

            <SectionHeading
              icon={<Plane size={18} />}
              title="Verified transport"
              description="These are real transport results returned by the connected travel providers."
            />

            {transport.length > 0 ? (
              <div className="result-list">
                {transport
                  .slice(0, 8)
                  .map(
                    (
                      item,
                      index
                    ) => (
                      <TransportCard
                        key={`transport-${index}`}
                        item={item}
                      />
                    )
                  )}
              </div>
            ) : (
              <EmptyState
                icon={<Plane size={17} />}
                text="No transport results were returned."
              />
            )}

          </section>

          {/* ==================================================
              VERIFIED HOTELS
          ================================================== */}

          <section className="section-card">

            <SectionHeading
              icon={<BedDouble size={18} />}
              title="Verified accommodation"
              description="Real accommodation results are used by the final itinerary instead of invented hotel data."
            />

            {hotels.length > 0 ? (
              <div className="hotel-grid">
                {hotels
                  .slice(0, 8)
                  .map(
                    (
                      hotel,
                      index
                    ) => (
                      <HotelCard
                        key={`hotel-${index}`}
                        item={hotel}
                      />
                    )
                  )}
              </div>
            ) : (
              <EmptyState
                icon={<Hotel size={17} />}
                text="No hotel results were returned."
              />
            )}

          </section>

          {/* ==================================================
              VERIFIED PLACES
          ================================================== */}

          <section className="section-card">

            <SectionHeading
              icon={<Map size={18} />}
              title="Places & experiences verified"
              description="The AI decides what experiences matter. Real place data is then used to verify locations and routes."
            />

            {verifiedPlaces.length > 0 ? (
              <div className="place-grid">
                {verifiedPlaces
                  .slice(0, 12)
                  .map(
                    (
                      place,
                      index
                    ) => (
                      <PlaceCard
                        key={`place-${index}`}
                        item={place}
                      />
                    )
                  )}
              </div>
            ) : (
              <EmptyState
                icon={<MapPin size={17} />}
                text="No verified place data was returned."
              />
            )}

          </section>

          {/* ==================================================
              FOOD
          ================================================== */}

          <section className="section-card">

            <SectionHeading
              icon={<Utensils size={18} />}
              title="Food planning"
              description="Restaurants are part of the itinerary automatically. You do not need to manually select one."
            />

            {restaurants.length > 0 ? (
              <div className="restaurant-grid">
                {restaurants
                  .slice(0, 8)
                  .map(
                    (
                      restaurant,
                      index
                    ) => (
                      <RestaurantCard
                        key={`restaurant-${index}`}
                        item={restaurant}
                      />
                    )
                  )}
              </div>
            ) : (
              <div className="food-note">
                <Utensils size={18} />

                <div>
                  <b>
                    Food will be arranged automatically
                  </b>

                  <p>
                    The final AI itinerary can include
                    suitable food stops based on location,
                    timing and the selected travel style.
                  </p>
                </div>
              </div>
            )}

          </section>

          {/* ==================================================
              WEATHER + ROUTES + BUDGET
          ================================================== */}

          <div className="info-grid">

            <InfoCard
              title="Weather"
              icon={<CloudSun size={18} />}
              data={result.weather}
              type="weather"
            />

            <InfoCard
              title="Route verification"
              icon={<Route size={18} />}
              data={
                result.routes ??
                result.route ??
                routes
              }
              type="route"
            />

            <InfoCard
              title="Budget"
              icon={<CircleDollarSign size={18} />}
              data={budget}
              type="budget"
              request={request}
              transport={transport}
              hotels={hotels}
            />

          </div>

          {/* ==================================================
              AI ANALYSIS
          ================================================== */}

          {aiAnalysis && (
            <AIAnalysis
              analysis={aiAnalysis}
            />
          )}

          {/* ==================================================
              FINAL ITINERARY
          ================================================== */}

          <section className="finalize">

            <div>

              <span className="eyebrow">
                <Sparkles size={12} />
                FINAL AI ITINERARY
              </span>

              <h2>
                Let Travelto connect the whole journey.
              </h2>

              <p>
                Gemini will combine the experience plan
                with verified transport, hotels, routes,
                weather and real-world information to create
                your detailed day-by-day itinerary.
              </p>

              <div className="final-points">

                <Point
                  text="No invented transport timings"
                />

                <Point
                  text="No invented hotel prices"
                />

                <Point
                  text="Routes based on real travel data"
                />

                <Point
                  text="Food and experiences arranged automatically"
                />

              </div>

            </div>

            <div className="actions">

              <button
                className="secondary"
                onClick={bookLater}
              >
                <Wallet size={15} />
                Save for Later
              </button>

              <button
                className="secondary"
                onClick={bookNow}
              >
                <ExternalLink size={15} />
                Open Booking
              </button>

              <button
                className="primary"
                onClick={generateFinalItinerary}
                disabled={finalizing}
              >
                {finalizing ? (
                  <>
                    <RefreshCw
                      size={15}
                      className="spin"
                    />
                    Creating itinerary...
                  </>
                ) : (
                  <>
                    Generate Final Itinerary
                    <ArrowRight
                      size={16}
                    />
                  </>
                )}
              </button>

            </div>

          </section>

          {/* ==================================================
              FOOTER
          ================================================== */}

          <div className="footer-actions">

            <button
              className="ghost"
              onClick={researchAgain}
              disabled={researching}
            >
              <RefreshCw
                size={14}
                className={
                  researching
                    ? "spin"
                    : ""
                }
              />

              {researching
                ? "Researching..."
                : "Research again"}
            </button>

            <span>
              Provider availability and prices may change
              closer to booking.
            </span>

          </div>

        </div>
      </main>

      <Styles />
    </>
  );
}

/*
=========================================================
HEADER
=========================================================
*/

function Header() {
  return (
    <header className="header">

      <div className="brand">

        <div className="brand-icon">
          <Sparkles size={18} />
        </div>

        <section>
          <span>TRAVELTO AI</span>
          <b>Travel Agent</b>
        </section>

      </div>

      <button
        className="ghost"
        onClick={() => {
          window.location.href =
            "/plan-trip";
        }}
      >
        <ArrowLeft size={15} />
        Edit trip details
      </button>

    </header>
  );
}

/*
=========================================================
SUMMARY
=========================================================
*/

function Summary({
  icon,
  label,
  value: val,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="summary-item">

      <span>{icon}</span>

      <div>
        <small>{label}</small>
        <b>{val}</b>
      </div>

    </div>
  );
}

/*
=========================================================
FLOW
=========================================================
*/

function FlowStep({
  number,
  icon,
  title,
  description,
  active,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flow-step ${
        active ? "active" : ""
      }`}
    >

      <div className="flow-number">
        {number}
      </div>

      <div className="flow-icon">
        {icon}
      </div>

      <div className="flow-content">
        <b>{title}</b>
        <p>{description}</p>
      </div>

    </div>
  );
}

/*
=========================================================
SECTION HEADING
=========================================================
*/

function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="section-heading">

      <div className="section-icon">
        {icon}
      </div>

      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

    </div>
  );
}

/*
=========================================================
EXPERIENCE CARD
=========================================================
*/

function ExperienceCard({
  item,
}: {
  item: AnyObject;
}) {
  const title =
    item.title ??
    item.name ??
    item.experience ??
    item.activity ??
    "Travel experience";

  const area =
    item.area ??
    item.region ??
    item.location ??
    "";

  const category =
    item.category ??
    item.type ??
    item.experience_type ??
    "Experience";

  const duration =
    item.duration_minutes ??
    item.duration ??
    null;

  const description =
    item.description ??
    item.reason ??
    item.why ??
    "";

  return (
    <div className="experience-card">

      <div className="experience-top">

        <div className="experience-category">
          {experienceIcon(
            category
          )}
        </div>

        <span>
          {pretty(category)}
        </span>

      </div>

      <h3>
        {value(title)}
      </h3>

      {area && (
        <div className="mini-line">
          <MapPin size={11} />
          {value(area)}
        </div>
      )}

      {duration && (
        <div className="mini-line">
          <Clock3 size={11} />
          {formatGenericDuration(
            duration
          )}
        </div>
      )}

      {description && (
        <p>
          {value(description)}
        </p>
      )}

    </div>
  );
}

/*
=========================================================
TRANSPORT CARD
=========================================================
*/

function TransportCard({
  item,
}: {
  item: AnyObject;
}) {
  const isTrain =
    item.kind === "train" ||
    item.trainNumber ||
    item.train_number ||
    item.trainName;

  const isFlight =
    item.kind === "flight" ||
    item.airline ||
    item.flight_number;

  const title = isTrain
    ? item.trainName ??
      item.train_name ??
      item.name ??
      "Train"
    : item.airline ??
      item.airline_name ??
      "Flight";

  const number = isTrain
    ? item.trainNumber ??
      item.train_number
    : item.flight_number ??
      item.flightNumber;

  const departure =
    item.departure_time ??
    item.departureTime ??
    item.departure?.time ??
    "";

  const arrival =
    item.arrival_time ??
    item.arrivalTime ??
    item.arrival?.time ??
    "";

  const price =
    item.price ??
    item.extracted_price ??
    item.total_price ??
    item.totalPrice ??
    item.fare;

  const duration =
    item.duration ??
    item.total_duration ??
    item.travel_time;

  return (
    <div className="transport-card">

      <div className="transport-brand">
        {isTrain ? (
          <TrainFront size={17} />
        ) : (
          <Plane size={17} />
        )}
      </div>

      <div className="transport-info">

        <span>
          {isTrain
            ? "TRAIN"
            : "FLIGHT"}

          {number
            ? ` • ${number}`
            : ""}
        </span>

        <b>{value(title)}</b>

        <small>
          {departure || "—"}

          {arrival
            ? ` → ${arrival}`
            : ""}
        </small>

      </div>

      <div className="transport-meta">

        {duration && (
          <small>
            {formatGenericDuration(
              duration
            )}
          </small>
        )}

        {price !== undefined &&
          price !== null &&
          price !== "" && (
            <strong>
              ₹{money(price)}
            </strong>
          )}

      </div>

    </div>
  );
}

/*
=========================================================
HOTEL CARD
=========================================================
*/

function HotelCard({
  item,
}: {
  item: AnyObject;
}) {
  const name =
    item.name ??
    item.hotel_name ??
    item.title ??
    "Hotel";

  const rating =
    item.overall_rating ??
    item.rating ??
    item.stars;

  const reviews =
    item.reviews ??
    item.reviews_count ??
    item.review_count;

  const price =
    item.extracted_price ??
    item.price ??
    item.rate ??
    item.price_per_night;

  const total =
    item.total_price ??
    item.totalPrice;

  return (
    <div className="hotel-card">

      {item.thumbnail && (
        <img
          src={item.thumbnail}
          alt=""
        />
      )}

      <div className="hotel-content">

        <span>
          <Hotel size={10} />
          ACCOMMODATION
        </span>

        <h3>
          {value(name)}
        </h3>

        <div className="hotel-rating">

          {rating && (
            <b>
              ★ {value(rating)}
            </b>
          )}

          {reviews && (
            <small>
              {value(reviews)}
              {" "}
              reviews
            </small>
          )}

        </div>

        {item.address && (
          <p>
            {value(item.address)}
          </p>
        )}

      </div>

      <div className="hotel-price">

        {price !== undefined &&
          price !== null &&
          price !== "" && (
            <>
              <strong>
                ₹{money(price)}
              </strong>

              <small>
                per night
              </small>
            </>
          )}

        {total !== undefined &&
          total !== null &&
          total !== "" && (
            <small>
              ₹{money(total)}
              {" "}
              total
            </small>
          )}

      </div>

    </div>
  );
}

/*
=========================================================
PLACE CARD
=========================================================
*/

function PlaceCard({
  item,
}: {
  item: AnyObject;
}) {
  const properties =
    item.properties ??
    item;

  const name =
    properties.name ??
    item.name ??
    item.title ??
    "Place";

  const categories =
    properties.categories ??
    item.category ??
    item.categories ??
    item.type ??
    "Attraction";

  const distance =
    properties.distance ??
    item.distance;

  const address =
    properties.formatted ??
    properties.address_line2 ??
    item.address;

  return (
    <div className="place-card">

      <div className="place-icon">
        <Navigation size={16} />
      </div>

      <div>

        <span>
          {humanizeCategory(
            categories
          )}
        </span>

        <h3>
          {value(name)}
        </h3>

        {address && (
          <p>
            {value(address)}
          </p>
        )}

      </div>

      {distance !== undefined &&
        distance !== null && (
          <strong>
            {roundDistance(
              distance
            )} km
          </strong>
        )}

    </div>
  );
}

/*
=========================================================
RESTAURANT CARD
=========================================================
*/

function RestaurantCard({
  item,
}: {
  item: AnyObject;
}) {
  const properties =
    item.properties ??
    item;

  const name =
    properties.name ??
    item.name ??
    item.restaurant_name ??
    "Restaurant";

  const cuisine =
    properties.catering?.cuisine ??
    properties.cuisine ??
    item.cuisine ??
    item.cuisines ??
    "";

  const address =
    properties.formatted ??
    item.address ??
    "";

  return (
    <div className="restaurant-card">

      <div className="restaurant-icon">
        <Utensils size={16} />
      </div>

      <div>

        <h3>
          {value(name)}
        </h3>

        <span>
          {cuisine
            ? humanizeCategory(
                cuisine
              )
            : "Restaurant"}
        </span>

        {address && (
          <p>
            {value(address)}
          </p>
        )}

      </div>

    </div>
  );
}

/*
=========================================================
INFO CARD
=========================================================
*/

function InfoCard({
  title,
  icon,
  data,
  type,
  request,
  transport,
  hotels,
}: {
  title: string;
  icon: React.ReactNode;
  data: any;
  type: string;
  request?: AnyObject | null;
  transport?: AnyObject[];
  hotels?: AnyObject[];
}) {
  const friendly =
    getFriendlyInfo(
      data,
      type
    );

  return (
    <section className="info-card">

      <h2>
        {icon}
        {title}
      </h2>

      {friendly ? (
        friendly
      ) : data ? (
        <JsonPreview
          data={data}
        />
      ) : type === "budget" ? (
        <BudgetFallback
          request={request}
          transport={
            transport ?? []
          }
          hotels={
            hotels ?? []
          }
        />
      ) : (
        <p className="muted">
          No data returned yet.
        </p>
      )}

    </section>
  );
}

/*
=========================================================
AI ANALYSIS
=========================================================
*/

function AIAnalysis({
  analysis,
}: {
  analysis: AnyObject;
}) {
  const fields = [
    [
      "Trip recommendation",
      analysis.recommendation ??
        analysis.summary,
    ],
    [
      "Recommended transport",
      analysis.recommended_transport,
    ],
    [
      "Recommended hotel",
      analysis.recommended_hotel,
    ],
    [
      "Experience strategy",
      analysis.experience_strategy ??
        analysis.recommended_experiences,
    ],
    [
      "Food strategy",
      analysis.food_strategy ??
        analysis.recommended_restaurants,
    ],
    [
      "Weather advice",
      analysis.weather_advice,
    ],
    [
      "Budget observation",
      analysis.budget_observation,
    ],
    [
      "Route observations",
      analysis.route_observations,
    ],
    [
      "Warnings",
      analysis.warnings,
    ],
  ].filter(
    ([, data]) =>
      data !== undefined &&
      data !== null &&
      data !== ""
  );

  if (!fields.length) {
    return null;
  }

  return (
    <section className="ai-analysis">

      <div className="analysis-heading">

        <div className="analysis-icon">
          <Sparkles size={18} />
        </div>

        <div>
          <span>
            TRAVELTO AI
          </span>

          <h2>
            Agent intelligence
          </h2>
        </div>

      </div>

      <div className="analysis-grid">

        {fields.map(
          ([label, data]) => (
            <div
              className="analysis-item"
              key={String(label)}
            >
              <small>
                {label}
              </small>

              <div>
                {value(data)}
              </div>
            </div>
          )
        )}

      </div>

    </section>
  );
}

/*
=========================================================
BUDGET FALLBACK
=========================================================
*/

function BudgetFallback({
  request,
  transport,
  hotels,
}: {
  request?: AnyObject | null;
  transport: AnyObject[];
  hotels: AnyObject[];
}) {
  const transportPrices =
    transport
      .map(
        (item) =>
          Number(
            item.price ??
              item.extracted_price ??
              item.total_price ??
              item.totalFare ??
              item.total_fare ??
              NaN
          )
      )
      .filter(Number.isFinite);

  const hotelPrices =
    hotels
      .map(
        (item) =>
          Number(
            item.extracted_price ??
              item.price ??
              item.rate ??
              NaN
          )
      )
      .filter(Number.isFinite);

  const minTransport =
    transportPrices.length
      ? Math.min(
          ...transportPrices
        )
      : null;

  const minHotel =
    hotelPrices.length
      ? Math.min(
          ...hotelPrices
        )
      : null;

  return (
    <div className="budget-box">

      <div>
        <span>
          Requested budget
        </span>

        <b>
          ₹
          {money(
            request?.budget ??
              0
          )}
        </b>
      </div>

      {minTransport !==
        null && (
        <div>
          <span>
            Lowest transport
          </span>

          <b>
            ₹
            {money(
              minTransport
            )}
          </b>
        </div>
      )}

      {minHotel !==
        null && (
        <div>
          <span>
            Lowest hotel price
          </span>

          <b>
            ₹
            {money(
              minHotel
            )}
          </b>
        </div>
      )}

      <p>
        Provider-returned prices are
        shown here. Final costs may change
        and food, activities and local
        transport are only included when
        verified data is available.
      </p>

    </div>
  );
}

/*
=========================================================
EMPTY
=========================================================
*/

function EmptyState({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="empty-state">
      {icon}
      <span>{text}</span>
    </div>
  );
}

/*
=========================================================
POINT
=========================================================
*/

function Point({
  text,
}: {
  text: string;
}) {
  return (
    <span className="final-point">
      <Check size={11} />
      {text}
    </span>
  );
}

/*
=========================================================
LOADING
=========================================================
*/

function LoadingScreen() {
  return (
    <>
      <main className="agent-page">
        <div className="loading">

          <div className="orb">
            <Sparkles size={27} />
          </div>

          <span className="eyebrow">
            <Sparkles size={13} />
            TRAVELTO AI TRAVEL AGENT
          </span>

          <h1>
            Arranging your{" "}
            <em>trip.</em>
          </h1>

          <p>
            Travelto is understanding your
            travel preferences and checking
            real-world information.
          </p>

          <div className="steps">

            <LoadingStep
              number="1"
              text="Understanding your trip"
            />

            <LoadingStep
              number="2"
              text="Planning destination experiences"
            />

            <LoadingStep
              number="3"
              text="Checking real transport"
            />

            <LoadingStep
              number="4"
              text="Finding real accommodation"
            />

            <LoadingStep
              number="5"
              text="Verifying routes and weather"
            />

            <LoadingStep
              number="6"
              text="Preparing AI recommendations"
            />

          </div>

        </div>
      </main>

      <Styles />
    </>
  );
}

function LoadingStep({
  number,
  text,
}: {
  number: string;
  text: string;
}) {
  return (
    <div className="loading-step">

      <span>
        {number}
      </span>

      <b>{text}</b>

    </div>
  );
}

/*
=========================================================
EXTRACT EXPERIENCE PLAN
=========================================================
*/

function extractExperiencePlan(
  result: AnyObject | null
): AnyObject[] {
  if (!result) return [];

  const source =
    result.experience_plan ??
    result.research_plan?.experience_plan ??
    result.trip_plan?.experience_plan ??
    result.experiences ??
    result.ai_analysis?.experience_plan ??
    [];

  if (Array.isArray(source)) {
    return source;
  }

  if (source && Array.isArray(source.items)) {
    return source.items;
  }

  // Current backend shape:
  // {
  //   summary,
  //   experience_categories,
  //   regions: [
  //     {
  //       name,
  //       reason,
  //       priority,
  //       recommended_days,
  //       places: [...]
  //     }
  //   ]
  // }
  if (source && Array.isArray(source.regions)) {
    const output: AnyObject[] = [];

    for (const region of source.regions) {
      if (!region || typeof region !== "object") {
        continue;
      }

      const places = Array.isArray(region.places)
        ? region.places
        : [];

      if (places.length === 0) {
        output.push({
          type: "region",
          name: region.name,
          title: region.name,
          region: region.name,
          reason: region.reason,
          priority: region.priority,
          recommended_days: region.recommended_days,
        });
        continue;
      }

      for (const place of places) {
        output.push({
          ...place,
          region: region.name,
          region_reason: region.reason,
          region_priority: region.priority,
          recommended_days: region.recommended_days,
        });
      }
    }

    return output;
  }

  return [];
}
/*
=========================================================
EXTRACT TRANSPORT
=========================================================
*/

function extractTransport(
  result: AnyObject | null
): AnyObject[] {
  if (!result) return [];

  const output: AnyObject[] =
    [];

  const flightSource =
    result.flights;

  if (
    flightSource?.status ===
    "success"
  ) {
    const data =
      flightSource.data;

    const groups = [
      data?.best_flights,
      data?.other_flights,
      data?.flights,
      data?.results,
    ];

    for (const group of groups) {
      if (Array.isArray(group)) {
        for (const item of group) {
          const normalized =
            normalizeFlight(
              item
            );

          if (normalized) {
            output.push(
              normalized
            );
          }
        }
      }
    }
  }

  const trainSource =
    result.trains;

  if (
    trainSource?.status ===
    "success"
  ) {
    const data =
      trainSource.data;

    const trains =
      extractArray(
        data,
        [
          "trains",
          "results",
          "data",
          "items",
        ]
      );

    for (const item of trains) {
      const normalized =
        normalizeTrain(
          item
        );

      if (normalized) {
        output.push(
          normalized
        );
      }
    }
  }

  const generic =
    result.transport ??
    result.transport_options;

  if (Array.isArray(generic)) {
    output.push(
      ...generic
    );
  }

  return dedupe(
    output
  );
}

/*
=========================================================
EXTRACT HOTELS
=========================================================
*/

function extractHotels(
  result: AnyObject | null
): AnyObject[] {
  if (!result?.hotels) {
    return [];
  }

  const source =
    result.hotels;

  if (
    source.status ===
    "error"
  ) {
    return [];
  }

  const data =
    source.data;

  const hotels =
    data?.properties ??
    data?.hotels ??
    data?.results ??
    [];

  if (!Array.isArray(hotels)) {
    return [];
  }

  return hotels.map(
    normalizeHotel
  );
}

/*
=========================================================
EXTRACT PLACES
=========================================================
*/

function extractPlaces(
  result: AnyObject | null
): AnyObject[] {
  if (!result?.places) {
    return [];
  }

  const source =
    result.places;

  if (
    source.status ===
    "error"
  ) {
    return [];
  }

  const data =
    source.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (
    Array.isArray(
      data?.features
    )
  ) {
    return data.features;
  }

  if (
    Array.isArray(
      data?.results
    )
  ) {
    return data.results;
  }

  if (
    Array.isArray(
      data?.places
    )
  ) {
    return data.places;
  }

  return [];
}

/*
=========================================================
EXTRACT RESTAURANTS
=========================================================
*/

function extractRestaurants(
  result: AnyObject | null
): AnyObject[] {
  if (!result?.restaurants) {
    return [];
  }

  const source =
    result.restaurants;

  if (
    source.status ===
    "error"
  ) {
    return [];
  }

  const data =
    source.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (
    Array.isArray(
      data?.features
    )
  ) {
    return data.features;
  }

  if (
    Array.isArray(
      data?.results
    )
  ) {
    return data.results;
  }

  if (
    Array.isArray(
      data?.restaurants
    )
  ) {
    return data.restaurants;
  }

  return [];
}

/*
=========================================================
EXTRACT ROUTES
=========================================================
*/

function extractRoutes(
  result: AnyObject | null
): AnyObject[] {
  if (!result) return [];

  const source =
    result.routes ??
    result.route ??
    [];

  if (Array.isArray(source)) {
    return source;
  }

  if (source) {
    return [source];
  }

  return [];
}

/*
=========================================================
FLIGHT NORMALIZATION
=========================================================
*/

function normalizeFlight(
  flight: AnyObject
): AnyObject | null {
  if (!flight) {
    return null;
  }

  const legs =
    flight.flights ??
    flight.segments ??
    [];

  const first =
    Array.isArray(legs) &&
    legs.length
      ? legs[0]
      : flight;

  const last =
    Array.isArray(legs) &&
    legs.length
      ? legs[
          legs.length - 1
        ]
      : flight;

  return {
    ...flight,

    kind: "flight",

    airline:
      first?.airline ??
      flight.airline ??
      "Flight",

    flight_number:
      first?.flight_number ??
      first?.flightNumber ??
      flight.flight_number ??
      "",

    departure_time:
      first?.departure_airport
        ?.time ??
      first?.departure_time ??
      flight.departure_time ??
      "",

    arrival_time:
      last?.arrival_airport
        ?.time ??
      last?.arrival_time ??
      flight.arrival_time ??
      "",

    duration:
      flight.total_duration ??
      flight.duration ??
      first?.duration,

    price:
      flight.price ??
      flight.extracted_price ??
      flight.total_price,

    booking_url:
      flight.booking_url ??
      flight.booking_token ??
      flight.link ??
      null,
  };
}

/*
=========================================================
TRAIN NORMALIZATION
=========================================================
*/

function normalizeTrain(
  train: AnyObject
): AnyObject | null {
  if (!train) {
    return null;
  }

  const number =
    train.trainNumber ??
    train.train_number ??
    train.number ??
    train.train?.number;

  const name =
    train.trainName ??
    train.train_name ??
    train.name ??
    train.train?.name;

  if (!number && !name) {
    return null;
  }

  return {
    ...train,

    kind: "train",

    trainNumber:
      number,

    trainName:
      name,

    price:
      train.totalFare ??
      train.total_fare ??
      train.fare ??
      train.price,

    availability:
      train.availability ??
      train.seatAvailability ??
      train.status,
  };
}

/*
=========================================================
HOTEL NORMALIZATION
=========================================================
*/

function normalizeHotel(
  hotel: AnyObject
): AnyObject {
  return {
    ...hotel,

    name:
      hotel.name ??
      hotel.hotel_name ??
      hotel.title ??
      "Hotel",

    extracted_price:
      hotel.extracted_price ??
      hotel.price ??
      hotel.rate,

    overall_rating:
      hotel.overall_rating ??
      hotel.rating,

    reviews:
      hotel.reviews ??
      hotel.reviews_count,

    thumbnail:
      hotel.thumbnail ??
      hotel.image,

    total_price:
      hotel.total_price ??
      hotel.totalPrice,

    booking_url:
      hotel.booking_url ??
      hotel.link ??
      hotel.booking_link,
  };
}

/*
=========================================================
FRIENDLY INFO
=========================================================
*/

function getFriendlyInfo(
  data: any,
  type: string
): React.ReactNode | null {
  if (!data) {
    return null;
  }

  if (
    data.status ===
    "error"
  ) {
    if (type === "weather") {
      return (
        <div className="friendly-message">
          <CloudSun size={17} />

          <div>
            <b>
              Forecast not available yet
            </b>

            <p>
              Weather forecasting for these
              dates is not available from the
              current provider yet. This is
              normal for trips that are still
              far in advance.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="friendly-message">
        <AlertTriangle size={17} />

        <div>
          <b>
            Data unavailable
          </b>

          <p>
            {data.error ||
              "The provider did not return data for this category."}
          </p>
        </div>
      </div>
    );
  }

  if (
    type === "weather" &&
    data.data?.current
  ) {
    const current =
      data.data.current;

    return (
      <div className="weather-box">

        {current.temperature_2m !==
          undefined && (
          <div>
            <span>
              Temperature
            </span>

            <b>
              {
                current.temperature_2m
              }
              °
            </b>
          </div>
        )}

        {current.apparent_temperature !==
          undefined && (
          <div>
            <span>
              Feels like
            </span>

            <b>
              {
                current.apparent_temperature
              }
              °
            </b>
          </div>
        )}

        {current.relative_humidity_2m !==
          undefined && (
          <div>
            <span>
              Humidity
            </span>

            <b>
              {
                current.relative_humidity_2m
              }
              %
            </b>
          </div>
        )}

        <p>
          Weather data may change closer
          to the actual travel date.
        </p>

      </div>
    );
  }

  if (
    type === "route" &&
    data.distance !==
      undefined
  ) {
    return (
      <div className="route-box">

        <div>
          <span>
            Distance
          </span>

          <b>
            {(
              Number(
                data.distance
              ) / 1000
            ).toFixed(1)}
            {" "}
            km
          </b>
        </div>

        {data.duration !==
          undefined && (
          <div>
            <span>
              Travel time
            </span>

            <b>
              {formatRouteDuration(
                data.duration
              )}
            </b>
          </div>
        )}

        {data.summary && (
          <p>
            {value(
              data.summary
            )}
          </p>
        )}

      </div>
    );
  }

  return null;
}

/*
=========================================================
JSON PREVIEW
=========================================================
*/

function JsonPreview({
  data,
}: {
  data: any;
}) {
  if (
    typeof data ===
    "string"
  ) {
    return (
      <p className="json-text">
        {data}
      </p>
    );
  }

  if (Array.isArray(data)) {
    return (
      <div className="json-preview">

        {data
          .slice(0, 5)
          .map(
            (
              item,
              index
            ) => (
              <div
                key={index}
              >
                {value(item)}
              </div>
            )
          )}

      </div>
    );
  }

  if (
    typeof data ===
      "object" &&
    data !== null
  ) {
    return (
      <div className="json-preview">

        {Object.entries(
          data
        )
          .filter(
            ([, item]) =>
              item !== null &&
              item !== undefined &&
              item !== ""
          )
          .slice(0, 7)
          .map(
            ([key, item]) => (
              <div
                key={key}
              >
                <span>
                  {pretty(key)}
                </span>

                <b>
                  {value(item)}
                </b>
              </div>
            )
          )}

      </div>
    );
  }

  return (
    <p className="json-text">
      {value(data)}
    </p>
  );
}

/*
=========================================================
GENERIC HELPERS
=========================================================
*/

function extractArray(
  source: any,
  keys: string[]
): any[] {
  if (!source) {
    return [];
  }

  if (Array.isArray(source)) {
    return source;
  }

  for (const key of keys) {
    if (
      Array.isArray(
        source?.[key]
      )
    ) {
      return source[key];
    }
  }

  return [];
}

function dedupe(
  items: AnyObject[]
): AnyObject[] {
  const seen =
    new Set<string>();

  return items.filter(
    (item) => {
      const key =
        JSON.stringify({
          kind: item.kind,
          name:
            item.name ??
            item.trainName ??
            item.airline,
          number:
            item.trainNumber ??
            item.flight_number,
        });

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    }
  );
}

function findBookingUrl(
  item?: AnyObject
): string | null {
  if (!item) {
    return null;
  }

  return (
    item.booking_url ??
    item.bookingUrl ??
    item.link ??
    item.url ??
    item.provider_link ??
    null
  );
}

function value(
  x: any
): string {
  if (
    x === null ||
    x === undefined
  ) {
    return "—";
  }

  if (
    typeof x ===
      "string" ||
    typeof x ===
      "number" ||
    typeof x ===
      "boolean"
  ) {
    return String(x);
  }

  if (Array.isArray(x)) {
    return x
      .slice(0, 6)
      .map(value)
      .join(", ");
  }

  if (
    typeof x ===
      "object"
  ) {
    const direct =
      x.name ??
      x.title ??
      x.message ??
      x.description ??
      x.summary;

    if (
      direct !==
      undefined
    ) {
      return value(
        direct
      );
    }

    return Object.entries(
      x
    )
      .slice(0, 5)
      .map(
        ([key, item]) =>
          `${pretty(
            key
          )}: ${value(
            item
          )}`
      )
      .join(" • ");
  }

  return String(x);
}

function pretty(
  key: string
) {
  return key
    .replace(
      /_/g,
      " "
    )
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase()
    );
}

function money(
  x: any
) {
  const number =
    Number(x);

  return Number.isFinite(
    number
  )
    ? number.toLocaleString(
        "en-IN"
      )
    : value(x);
}

function roundDistance(
  x: any
) {
  const number =
    Number(x);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return "—";
  }

  return (
    Math.round(
      (number / 1000) *
        10
    ) / 10
  );
}

function formatGenericDuration(
  input: any
): string {
  if (
    typeof input === "string" &&
    input.trim()
  ) {
    return input;
  }

  const number = Number(input);

  if (!Number.isFinite(number)) {
    return value(input);
  }

  const minutes = Math.round(number);

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  return remaining > 0
    ? `${hours}h ${remaining}m`
    : `${hours}h`;
}
function formatRouteDuration(
  seconds: any
): string {
  const number =
    Number(seconds);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return value(
      seconds
    );
  }

  const minutes =
    Math.round(
      number / 60
    );

  const hours =
    Math.floor(
      minutes / 60
    );

  const remaining =
    minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remaining}m`;
  }

  return `${remaining} min`;
}

function humanizeCategory(
  category: any
): string {
  if (
    Array.isArray(
      category
    )
  ) {
    return category
      .slice(0, 3)
      .map(
        humanizeCategory
      )
      .join(" • ");
  }

  if (
    typeof category !==
    "string"
  ) {
    return "Experience";
  }

  return category
    .replace(
      /^(tourism|catering)\./i,
      ""
    )
    .replace(
      /\./g,
      " "
    )
    .replace(
      /_/g,
      " "
    )
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase()
    );
}

function experienceIcon(
  category: any
) {
  const text =
    String(category)
      .toLowerCase();

  if (
    text.includes(
      "water"
    ) ||
    text.includes(
      "beach"
    )
  ) {
    return (
      <Waves size={16} />
    );
  }

  if (
    text.includes(
      "nature"
    ) ||
    text.includes(
      "mountain"
    ) ||
    text.includes(
      "waterfall"
    )
  ) {
    return (
      <Mountain size={16} />
    );
  }

  if (
    text.includes(
      "heritage"
    ) ||
    text.includes(
      "historic"
    ) ||
    text.includes(
      "culture"
    )
  ) {
    return (
      <Landmark size={16} />
    );
  }

  if (
    text.includes(
      "shopping"
    )
  ) {
    return (
      <ShoppingBag size={16} />
    );
  }

  return (
    <MapPin size={16} />
  );
}

/*
=========================================================
STYLES
=========================================================
*/

function Styles() {
  return (
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
        font-family:
          Inter,
          ui-sans-serif,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;

        background: #f3faf8;
        color: #0f172a;
      }

      button {
        font: inherit;
        cursor: pointer;
      }

      button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .agent-page {
        min-height: 100vh;
        padding: 25px 20px 65px;

        background:
          radial-gradient(
            circle at 8% 5%,
            rgba(
              45,
              212,
              191,
              0.14
            ),
            transparent 27%
          ),
          radial-gradient(
            circle at 92% 12%,
            rgba(
              16,
              185,
              129,
              0.09
            ),
            transparent 25%
          ),
          linear-gradient(
            180deg,
            #effaf8,
            #f8fcfb 52%,
            #edf7f4
          );
      }

      .agent-shell {
        width: min(
          1180px,
          100%
        );

        margin: auto;
      }

      /* HEADER */

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;

        margin-bottom: 20px;
        gap: 15px;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .brand-icon {
        width: 39px;
        height: 39px;

        display: grid;
        place-items: center;

        color: white;

        background:
          linear-gradient(
            135deg,
            #0f766e,
            #14b8a6
          );

        border-radius: 11px;
      }

      .brand section {
        display: grid;
        gap: 1px;
      }

      .brand span {
        font-size: 8px;
        font-weight: 900;
        letter-spacing: 1.4px;
        color: #0f8f83;
      }

      .brand b {
        font-size: 15px;
      }

      .ghost,
      .secondary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;

        min-height: 39px;
        padding: 0 13px;

        border: 1px solid #cfe5e0;
        border-radius: 10px;

        background: white;
        color: #0f766e;

        font-size: 9px;
        font-weight: 850;
      }

      /* HERO */

      .hero {
        display: grid;
        grid-template-columns: 1fr 260px;

        gap: 25px;
        align-items: center;

        padding: 31px 34px;
        margin-bottom: 15px;

        border: 1px solid #cde6e1;
        border-radius: 22px;

        background:
          linear-gradient(
            135deg,
            rgba(
              255,
              255,
              255,
              0.97
            ),
            rgba(
              232,
              249,
              245,
              0.92
            )
          );

        box-shadow:
          0 17px 40px
          rgba(
            15,
            118,
            110,
            0.07
          );
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 6px;

        color: #0f766e;

        font-size: 8px;
        font-weight: 900;
        letter-spacing: 1.2px;
      }

      .hero h1 {
        margin: 8px 0;

        font-size: clamp(
          34px,
          5vw,
          51px
        );

        line-height: 1.02;
        letter-spacing: -2px;
      }

      .hero em {
        font-style: normal;
        color: #0f8f83;
      }

      .hero p {
        max-width: 720px;

        margin: 0;

        color: #64748b;

        font-size: 11px;
        line-height: 1.7;
      }

      .complete {
        display: flex;
        gap: 10px;

        padding: 15px;

        border: 1px solid #c9e5df;
        border-radius: 14px;

        background:
          rgba(
            255,
            255,
            255,
            0.75
          );
      }

      .complete > svg {
        padding: 8px;

        width: 35px;
        height: 35px;

        color: white;

        background: #0f9b8e;
        border-radius: 10px;
      }

      .complete div {
        display: grid;
        gap: 4px;
      }

      .complete b {
        font-size: 10px;
      }

      .complete span {
        font-size: 8px;
        color: #81919a;
      }

      /* SUMMARY */

      .summary {
        display: grid;
        grid-template-columns:
          repeat(4, 1fr);

        gap: 9px;
        margin-bottom: 15px;
      }

      .summary-item {
        display: flex;
        gap: 9px;
        align-items: center;

        padding: 12px;

        border: 1px solid #d7e9e5;
        border-radius: 12px;

        background: #ffffffd9;
      }

      .summary-item > span {
        width: 30px;
        height: 30px;

        display: grid;
        place-items: center;

        color: #0f766e;
        background: #eaf8f5;

        border-radius: 9px;
      }

      .summary-item div {
        display: grid;
        gap: 3px;

        min-width: 0;
      }

      .summary-item small {
        font-size: 7px;

        text-transform:
          uppercase;

        color: #94a3b8;
        font-weight: 800;
      }

      .summary-item b {
        font-size: 9px;

        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      /* FLOW */

      .agent-flow {
        display: grid;
        grid-template-columns:
          1fr 35px 1fr 35px 1fr;

        align-items: stretch;

        margin-bottom: 15px;

        padding: 14px;

        border: 1px solid #cde6e1;
        border-radius: 16px;

        background: #ffffffd9;
      }

      .flow-step {
        display: flex;
        align-items: center;
        gap: 8px;

        padding: 8px;
      }

      .flow-number {
        width: 24px;
        height: 24px;

        display: grid;
        place-items: center;

        flex: 0 0 auto;

        color: #0f766e;
        background: #eaf8f5;

        border-radius: 7px;

        font-size: 7px;
        font-weight: 900;
      }

      .flow-icon {
        width: 31px;
        height: 31px;

        display: grid;
        place-items: center;

        flex: 0 0 auto;

        color: #0f766e;
        background: #f0faf8;

        border-radius: 9px;
      }

      .flow-content {
        min-width: 0;
      }

      .flow-content b {
        display: block;

        font-size: 9px;
      }

      .flow-content p {
        margin: 4px 0 0;

        color: #7b8c92;

        font-size: 7px;
        line-height: 1.45;
      }

      .flow-line {
        align-self: center;

        height: 1px;

        background: #cde6e1;
      }

      /* SECTION */

      .section-card {
        margin-bottom: 15px;
        padding: 18px;

        border: 1px solid #d5e8e3;
        border-radius: 16px;

        background: #ffffffe8;

        box-shadow:
          0 7px 25px
          rgba(
            15,
            118,
            110,
            0.04
          );
      }

      .section-heading {
        display: flex;
        gap: 10px;

        margin-bottom: 14px;
      }

      .section-icon {
        width: 34px;
        height: 34px;

        display: grid;
        place-items: center;

        flex: 0 0 auto;

        color: #0f766e;
        background: #eaf8f5;

        border-radius: 9px;
      }

      .section-heading h2 {
        margin: 0;

        font-size: 13px;
      }

      .section-heading p {
        margin: 4px 0 0;

        color: #87979e;

        font-size: 8px;
        line-height: 1.5;
      }

      /* EXPERIENCE */

      .experience-grid {
        display: grid;

        grid-template-columns:
          repeat(
            3,
            minmax(0, 1fr)
          );

        gap: 9px;
      }

      .experience-card {
        padding: 13px;

        border: 1px solid #dcebe8;
        border-radius: 12px;

        background: #fbfefd;
      }

      .experience-top {
        display: flex;
        align-items: center;
        gap: 7px;
      }

      .experience-category {
        width: 29px;
        height: 29px;

        display: grid;
        place-items: center;

        color: #0f766e;
        background: #eaf8f5;

        border-radius: 8px;
      }

      .experience-top > span {
        color: #0f8f83;

        font-size: 7px;
        font-weight: 900;

        text-transform:
          uppercase;
      }

      .experience-card h3 {
        margin: 10px 0 6px;

        font-size: 10px;
      }

      .experience-card p {
        margin: 7px 0 0;

        color: #7c8d94;

        font-size: 7px;
        line-height: 1.5;
      }

      .mini-line {
        display: flex;
        align-items: center;
        gap: 4px;

        margin-top: 4px;

        color: #81929a;

        font-size: 7px;
      }

      /* TRANSPORT */

      .result-list {
        display: grid;
        gap: 7px;
      }

      .transport-card {
        display: flex;
        align-items: center;
        gap: 10px;

        padding: 10px;

        border: 1px solid #dcebe8;
        border-radius: 10px;

        background: #fbfefd;
      }

      .transport-brand {
        width: 34px;
        height: 34px;

        display: grid;
        place-items: center;

        flex: 0 0 auto;

        color: #0f766e;
        background: #eaf8f5;

        border-radius: 9px;
      }

      .transport-info {
        display: grid;
        gap: 3px;

        min-width: 0;
        flex: 1;
      }

      .transport-info > span {
        color: #0f8f83;

        font-size: 7px;
        font-weight: 850;
      }

      .transport-info b {
        font-size: 9px;

        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .transport-info small {
        color: #7d8e95;
        font-size: 7px;
      }

      .transport-meta {
        display: grid;
        justify-items: end;
        gap: 3px;
      }

      .transport-meta small {
        color: #8b999e;
        font-size: 7px;
      }

      .transport-meta strong {
        color: #0f766e;
        font-size: 9px;
      }

      /* HOTELS */

      .hotel-grid {
        display: grid;

        grid-template-columns:
          repeat(
            2,
            minmax(0, 1fr)
          );

        gap: 8px;
      }

      .hotel-card {
        display: flex;
        align-items: center;
        gap: 9px;

        min-width: 0;

        padding: 9px;

        border: 1px solid #dcebe8;
        border-radius: 10px;

        background: #fbfefd;
      }

      .hotel-card img {
        width: 57px;
        height: 57px;

        flex: 0 0 auto;

        object-fit: cover;

        border-radius: 8px;
      }

      .hotel-content {
        min-width: 0;
        flex: 1;

        display: grid;
        gap: 3px;
      }

      .hotel-content > span {
        display: flex;
        align-items: center;
        gap: 4px;

        color: #0f8f83;

        font-size: 7px;
        font-weight: 850;
      }

      .hotel-content h3 {
        margin: 0;

        font-size: 9px;

        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .hotel-rating {
        display: flex;
        gap: 6px;
        align-items: center;
      }

      .hotel-rating b {
        color: #d28b00;
        font-size: 7px;
      }

      .hotel-rating small {
        color: #8b999e;
        font-size: 7px;
      }

      .hotel-content p {
        margin: 0;

        color: #81929a;

        font-size: 7px;

        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .hotel-price {
        display: grid;
        justify-items: end;
        gap: 2px;
      }

      .hotel-price strong {
        color: #0f766e;
        font-size: 9px;
      }

      .hotel-price small {
        color: #8b999e;
        font-size: 6px;
      }

      /* PLACES */

      .place-grid {
        display: grid;

        grid-template-columns:
          repeat(
            3,
            minmax(0, 1fr)
          );

        gap: 8px;
      }

      .place-card {
        display: grid;
        grid-template-columns:
          32px 1fr auto;

        align-items: center;

        gap: 8px;

        padding: 10px;

        border: 1px solid #dcebe8;
        border-radius: 10px;

        background: #fbfefd;
      }

      .place-icon {
        width: 32px;
        height: 32px;

        display: grid;
        place-items: center;

        color: #0f766e;
        background: #eaf8f5;

        border-radius: 8px;
      }

      .place-card > div:nth-child(2) {
        min-width: 0;
      }

      .place-card span {
        color: #0f8f83;

        font-size: 6px;
        font-weight: 850;

        text-transform:
          uppercase;
      }

      .place-card h3 {
        margin: 3px 0;

        font-size: 8px;

        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .place-card p {
        margin: 0;

        color: #8b999e;

        font-size: 6px;

        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .place-card > strong {
        color: #0f766e;
        font-size: 7px;
      }

      /* RESTAURANTS */

      .restaurant-grid {
        display: grid;

        grid-template-columns:
          repeat(
            2,
            minmax(0, 1fr)
          );

        gap: 8px;
      }

      .restaurant-card {
        display: flex;
        align-items: center;
        gap: 9px;

        padding: 10px;

        border: 1px solid #dcebe8;
        border-radius: 10px;

        background: #fbfefd;
      }

      .restaurant-icon {
        width: 32px;
        height: 32px;

        display: grid;
        place-items: center;

        flex: 0 0 auto;

        color: #0f766e;
        background: #eaf8f5;

        border-radius: 8px;
      }

      .restaurant-card h3 {
        margin: 0 0 3px;

        font-size: 9px;
      }

      .restaurant-card span {
        color: #0f8f83;
        font-size: 7px;
      }

      .restaurant-card p {
        margin: 3px 0 0;

        color: #8b999e;
        font-size: 6px;
      }

      .food-note {
        display: flex;
        align-items: flex-start;
        gap: 10px;

        padding: 13px;

        border: 1px solid #dcebe8;
        border-radius: 10px;

        background: #f7fcfb;

        color: #0f766e;
      }

      .food-note b {
        display: block;

        color: #263640;

        font-size: 9px;
      }

      .food-note p {
        margin: 4px 0 0;

        color: #7b8c92;

        font-size: 7px;
        line-height: 1.5;
      }

      /* INFO */

      .info-grid {
        display: grid;

        grid-template-columns:
          repeat(
            3,
            minmax(0, 1fr)
          );

        gap: 15px;

        margin-top: 15px;
      }

      .info-card {
        min-width: 0;

        padding: 18px;

        border: 1px solid #d5e8e3;
        border-radius: 16px;

        background: #ffffffe8;

        box-shadow:
          0 7px 25px
          rgba(
            15,
            118,
            110,
            0.04
          );
      }

      .info-card h2 {
        display: flex;
        align-items: center;
        gap: 7px;

        margin: 0 0 12px;

        font-size: 12px;
      }

      .info-card h2 svg {
        color: #0f766e;
      }

      .weather-box,
      .route-box,
      .budget-box {
        display: grid;
        gap: 7px;
      }

      .weather-box > div,
      .route-box > div,
      .budget-box > div {
        display: flex;
        justify-content: space-between;
        gap: 10px;

        padding-bottom: 5px;

        border-bottom:
          1px solid
          #edf3f1;
      }

      .weather-box span,
      .route-box span,
      .budget-box span {
        color: #7b8c92;
        font-size: 8px;
      }

      .weather-box b,
      .route-box b,
      .budget-box b {
        color: #263640;
        font-size: 8px;
      }

      .weather-box p,
      .route-box p,
      .budget-box p {
        margin: 3px 0 0;

        color: #71838b;

        font-size: 7px;
        line-height: 1.5;
      }

      .json-preview {
        display: grid;
        gap: 6px;
      }

      .json-preview > div {
        display: flex;
        justify-content: space-between;
        gap: 10px;

        padding-bottom: 5px;

        border-bottom:
          1px solid
          #edf3f1;

        color: #64748b;

        font-size: 8px;
      }

      .json-preview > div:last-child {
        border-bottom: 0;
      }

      .json-preview b {
        max-width: 65%;

        text-align: right;

        color: #263640;

        font-size: 8px;

        overflow-wrap: anywhere;
      }

      .json-text {
        margin: 0;

        color: #71838b;

        font-size: 8px;
        line-height: 1.5;
      }

      .muted {
        color: #94a3b8;
        font-size: 8px;
      }

      .friendly-message {
        display: flex;
        align-items: flex-start;
        gap: 9px;

        padding: 10px;

        border: 1px solid #dcece8;
        border-radius: 10px;

        background: #f7fcfb;
      }

      .friendly-message > svg {
        flex: 0 0 auto;
        color: #0f766e;
      }

      .friendly-message b {
        display: block;

        margin-bottom: 4px;

        font-size: 9px;
      }

      .friendly-message p {
        margin: 0;

        color: #71838b;

        font-size: 7px;
        line-height: 1.5;
      }

      /* AI ANALYSIS */

      .ai-analysis {
        margin-top: 15px;

        padding: 20px;

        color: white;

        border: 1px solid #cde6e1;
        border-radius: 17px;

        background:
          linear-gradient(
            135deg,
            #0d756e,
            #0f9489
          );

        box-shadow:
          0 15px 31px
          rgba(
            15,
            118,
            110,
            0.16
          );
      }

      .analysis-heading {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .analysis-icon {
        width: 35px;
        height: 35px;

        display: grid;
        place-items: center;

        background:
          rgba(
            255,
            255,
            255,
            0.13
          );

        border-radius: 10px;
      }

      .analysis-heading span {
        font-size: 7px;
        font-weight: 900;

        letter-spacing: 1.2px;

        opacity: 0.75;
      }

      .analysis-heading h2 {
        margin: 2px 0 0;

        font-size: 15px;
      }

      .analysis-grid {
        display: grid;

        grid-template-columns:
          repeat(
            2,
            minmax(0, 1fr)
          );

        gap: 8px;

        margin-top: 15px;
      }

      .analysis-item {
        padding: 10px;

        border: 1px solid
          rgba(
            255,
            255,
            255,
            0.12
          );

        border-radius: 10px;

        background:
          rgba(
            255,
            255,
            255,
            0.07
          );
      }

      .analysis-item small {
        display: block;

        margin-bottom: 5px;

        color:
          rgba(
            255,
            255,
            255,
            0.65
          );

        font-size: 7px;

        font-weight: 900;

        text-transform:
          uppercase;
      }

      .analysis-item div {
        color:
          rgba(
            255,
            255,
            255,
            0.9
          );

        font-size: 8px;
        line-height: 1.55;
      }

      /* FINALIZE */

      .finalize {
        display: grid;

        grid-template-columns:
          1fr auto;

        gap: 25px;
        align-items: center;

        margin-top: 17px;
        padding: 22px;

        border: 1px solid #cde6e1;
        border-radius: 17px;

        background: #fffffff0;
      }

      .finalize h2 {
        margin: 5px 0;

        font-size: 18px;
      }

      .finalize p {
        max-width: 720px;

        margin: 0;

        color: #788991;

        font-size: 8px;
        line-height: 1.5;
      }

      .final-points {
        display: flex;
        flex-wrap: wrap;

        gap: 6px;

        margin-top: 12px;
      }

      .final-point {
        display: inline-flex;
        align-items: center;
        gap: 4px;

        padding: 6px 8px;

        border:
          1px solid
          #d6e8e4;

        border-radius: 999px;

        color: #0f766e;

        background: #edf9f6;

        font-size: 7px;
      }

      .actions {
        display: grid;

        gap: 7px;

        min-width: 215px;
      }

      .primary {
        min-height: 43px;

        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;

        border: 0;
        border-radius: 10px;

        color: white;

        background:
          linear-gradient(
            135deg,
            #0f8f83,
            #0d9488
          );

        font-size: 9px;
        font-weight: 900;
      }

      .footer-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;

        margin-top: 12px;
      }

      .footer-actions span {
        color: #91a0a5;
        font-size: 7px;
      }

      /* EMPTY */

      .empty-state {
        display: flex;
        align-items: center;
        gap: 8px;

        min-height: 55px;

        color: #94a3b8;

        font-size: 8px;
      }

      /* ERROR */

      .error-box,
      .inline-error {
        display: flex;
        gap: 10px;

        padding: 14px;

        color: #991b1b;

        background: #fff6f6;

        border:
          1px solid
          #fecaca;

        border-radius: 12px;

        font-size: 9px;
      }

      .error-box {
        margin-top: 20px;
        padding: 22px;
      }

      .error-box p {
        margin: 5px 0 0;
      }

      .inline-error {
        margin-bottom: 15px;
      }

      /* LOADING */

      .loading {
        min-height: 100vh;

        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;

        text-align: center;
      }

      .orb {
        width: 64px;
        height: 64px;

        display: grid;
        place-items: center;

        margin-bottom: 16px;

        color: white;

        background:
          linear-gradient(
            135deg,
            #0f766e,
            #14b8a6
          );

        border-radius: 18px;

        box-shadow:
          0 15px 30px
          rgba(
            15,
            118,
            110,
            0.17
          );
      }

      .loading h1 {
        margin: 8px 0;

        font-size: 38px;
      }

      .loading em {
        font-style: normal;
        color: #0f8f83;
      }

      .loading p {
        color: #71838b;
        font-size: 10px;
      }

      .steps {
        width: min(
          450px,
          100%
        );

        display: grid;
        gap: 6px;

        margin-top: 18px;

        text-align: left;
      }

      .loading-step {
        display: flex;
        align-items: center;
        gap: 9px;

        padding: 9px 11px;

        background: #ffffffe8;

        border:
          1px solid
          #d9eae6;

        border-radius: 10px;
      }

      .loading-step span {
        width: 22px;
        height: 22px;

        display: grid;
        place-items: center;

        color: #0f766e;
        background: #eaf8f5;

        border-radius: 6px;

        font-size: 7px;
        font-weight: 900;
      }

      .loading-step b {
        font-size: 8px;
      }

      .spin {
        animation:
          spin 0.9s
          linear infinite;
      }

      @keyframes spin {
        from {
          transform:
            rotate(0deg);
        }

        to {
          transform:
            rotate(360deg);
        }
      }

      /* RESPONSIVE */

      @media (max-width: 1000px) {
        .experience-grid {
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
        }

        .place-grid {
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );
        }
      }

      @media (max-width: 900px) {
        .hero {
          grid-template-columns: 1fr;
        }

        .summary {
          grid-template-columns:
            1fr 1fr;
        }

        .info-grid {
          grid-template-columns: 1fr;
        }

        .finalize {
          grid-template-columns: 1fr;
        }

        .agent-flow {
          grid-template-columns: 1fr;
        }

        .flow-line {
          display: none;
        }
      }

      @media (max-width: 680px) {
        .agent-page {
          padding:
            16px 10px 45px;
        }

        .header {
          align-items:
            flex-start;
        }

        .hero {
          padding:
            24px 18px;
        }

        .hero h1 {
          font-size: 34px;
        }

        .summary {
          grid-template-columns: 1fr;
        }

        .experience-grid,
        .hotel-grid,
        .place-grid,
        .restaurant-grid {
          grid-template-columns: 1fr;
        }

        .analysis-grid {
          grid-template-columns: 1fr;
        }

        .actions {
          min-width: 0;
        }

        .footer-actions {
          align-items:
            flex-start;

          flex-direction:
            column;

          gap: 8px;
        }
      }
    `}</style>
  );
}