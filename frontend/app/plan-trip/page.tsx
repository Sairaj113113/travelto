 "use client";



import { FormEvent, useMemo, useState } from "react";

import {

  ArrowRight,

  Bike,

  BusFront,

  CalendarDays,

  Car,

  Check,

  ChevronDown,

  CircleDollarSign,

  Clock3,

  Compass,

  Fuel,

  MapPin,

  Plane,

  Route,

  Sparkles,

  TrainFront,

  Users,

  Wallet,

  Zap,

} from "lucide-react";



const API_URL =

  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";



type TransportMode =

  | "train"

  | "bus"

  | "flight"

  | "own_car"

  | "own_bike"

  | "rental"

  | "ai_recommend";



type Priority =

  | "save_money"

  | "save_time"

  | "comfort"

  | "more_places"

  | "less_travel"

  | "balanced";



type TravelStyle =

  | "Balanced"

  | "Adventure"

  | "Relaxed"

  | "Culture";



const interests = [

  "Nature",

  "Adventure",

  "Beaches",

  "Culture",

  "Food",

  "History",

  "Shopping",

  "Photography",

  "Nightlife",

  "Relaxation",

];



const transportOptions: {

  id: TransportMode;

  label: string;

  description: string;

  icon: React.ReactNode;

}[] = [

  {

    id: "train",

    label: "Train",

    description: "Affordable long-distance travel",

    icon: <TrainFront size={20} />,

  },

  {

    id: "bus",

    label: "Bus",

    description: "Flexible and practical",

    icon: <BusFront size={20} />,

  },

  {

    id: "flight",

    label: "Flight",

    description: "Best for long distances",

    icon: <Plane size={20} />,

  },

  {

    id: "own_car",

    label: "Own Car",

    description: "Fuel + toll + parking estimate",

    icon: <Car size={20} />,

  },

  {

    id: "own_bike",

    label: "Own Bike",

    description: "Fuel + toll + parking estimate",

    icon: <Bike size={20} />,

  },

  {

    id: "rental",

    label: "Rental",

    description: "Car or bike rental",

    icon: <Route size={20} />,

  },

  {

    id: "ai_recommend",

    label: "Not sure",

    description: "Let Travelto AI recommend",

    icon: <Sparkles size={20} />,

  },

];



const priorityOptions = [

  ["save_money", "Save money", "Keep the total cost low"],

  ["save_time", "Save time", "Reduce travel and waiting"],

  ["comfort", "Comfort", "Prefer convenient options"],

  ["more_places", "More places", "Fit more experiences"],

  ["less_travel", "Less travel", "Spend more time exploring"],

  ["balanced", "Balanced", "Balance cost, time and comfort"],

] as const;



const styleOptions = [

  {

    id: "Balanced" as TravelStyle,

    description: "A mix of sightseeing, food and relaxation",

  },

  {

    id: "Adventure" as TravelStyle,

    description: "Outdoor activities and exciting experiences",

  },

  {

    id: "Relaxed" as TravelStyle,

    description: "Slow travel with plenty of free time",

  },

  {

    id: "Culture" as TravelStyle,

    description: "Local places, history, food and traditions",

  },

];



export default function PlanTripPage() {

  const [startingLocation, setStartingLocation] = useState("");

  const [destination, setDestination] = useState("");



  const [transport, setTransport] =

    useState<TransportMode>("ai_recommend");



  const [vehicleType, setVehicleType] =

    useState<"car" | "bike">("car");



  const [fuelType, setFuelType] =

    useState<"petrol" | "diesel" | "cng" | "ev">("petrol");



  const [mileage, setMileage] = useState("15");



  const [rentalType, setRentalType] =

    useState<"car" | "bike">("car");



  const [startDate, setStartDate] = useState("");

  const [endDate, setEndDate] = useState("");



  const [adults, setAdults] = useState(2);

  const [children, setChildren] = useState(0);

  const [childrenAges, setChildrenAges] = useState<string[]>([]);



  const [budget, setBudget] = useState("");



  const [includeTransport, setIncludeTransport] =

    useState(true);

  const [includeAccommodation, setIncludeAccommodation] =

    useState(true);

  const [includeFood, setIncludeFood] =

    useState(true);

  const [includeActivities, setIncludeActivities] =

    useState(true);

  const [includeLocalTravel, setIncludeLocalTravel] =

    useState(true);



  const [priority, setPriority] =

    useState<Priority>("balanced");



  const [travelStyle, setTravelStyle] =

    useState<TravelStyle>("Balanced");



  const [selectedInterests, setSelectedInterests] =

    useState<string[]>(["Nature"]);



  const [flexibleDates, setFlexibleDates] =

    useState(false);



  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");



  const totalTravelers = adults + children;



  const transportLabel = useMemo(

    () =>

      transportOptions.find(

        (item) => item.id === transport

      )?.label || "Not sure",

    [transport]

  );



  function toggleInterest(interest: string) {

    setSelectedInterests((current) =>

      current.includes(interest)

        ? current.filter((item) => item !== interest)

        : [...current, interest]

    );

  }



  function updateChildrenCount(value: number) {

    const next = Math.max(0, Math.min(8, value));

    setChildren(next);



    setChildrenAges((current) => {

      if (next === 0) return [];

      return Array.from(

        { length: next },

        (_, index) => current[index] || ""

      );

    });

  }



  function validate() {

    if (!startingLocation.trim()) {

      return "Please enter your starting location.";

    }



    if (!destination.trim()) {

      return "Please enter your destination.";

    }



    if (!startDate || !endDate) {

      return "Please select your travel dates.";

    }



    if (new Date(endDate) < new Date(startDate)) {

      return "End date cannot be before the start date.";

    }



    if (adults < 1) {

      return "At least one adult traveler is required.";

    }



    if (children < 0) {

      return "Children count cannot be negative.";

    }



    if (totalTravelers > 50) {

      return "The maximum number of travelers is 50.";

    }



    if (children > 0) {

      if (childrenAges.length !== children) {

        return "Please enter the age of every child.";

      }



      const invalidAge = childrenAges.some((age) => {

        const numericAge = Number(age);



        return (

          age.trim() === "" ||

          !Number.isInteger(numericAge) ||

          numericAge < 0 ||

          numericAge > 12

        );

      });



      if (invalidAge) {

        return "Enter a valid age between 0 and 12 for every child.";

      }

    }



    if (!budget || Number(budget) <= 0) {

      return "Please enter your total trip budget.";

    }



    if (selectedInterests.length === 0) {

      return "Select at least one interest.";

    }



    if (

      (transport === "own_car" ||

        transport === "own_bike") &&

      (!mileage || Number(mileage) <= 0)

    ) {

      return "Enter a valid vehicle mileage.";

    }



    return "";

  }



  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
  
    const validationError = validate();
  
    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
  
    setError("");
    setLoading(true);
  
    try {
      const token = localStorage.getItem("travelto_token");
  
      if (!token) {
        window.location.href = "/login";
        return;
      }
  
      const payload = {
        starting_location: startingLocation.trim(),
        destination: destination.trim(),
  
        start_date: startDate,
        end_date: endDate,
        flexible_dates: flexibleDates,
  
        travelers: Number(totalTravelers),
        adults: Number(adults),
        children: Number(children),
        children_ages: childrenAges.map(Number),
  
        budget: Number(budget),
        budget_includes: {
          transport: includeTransport,
          accommodation: includeAccommodation,
          food: includeFood,
          activities: includeActivities,
          local_travel: includeLocalTravel,
        },
  
        transport_preference: transportLabel,
        travel: {
          mode: transport,
          mode_label: transportLabel,
          vehicle:
            transport === "own_car" || transport === "own_bike"
              ? {
                  type: vehicleType,
                  fuel_type: fuelType,
                  mileage_kmpl: Number(mileage),
                }
              : null,
          rental:
            transport === "rental"
              ? {
                  type: rentalType,
                }
              : null,
        },
  
        priority,
        travel_style: travelStyle,
        interests: selectedInterests,
      };
  
      console.log("Generating AI trip with payload:", payload);
  
      const response = await fetch(
        `${API_URL}/ai/generate-trip`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
  
      if (response.status === 401) {
        localStorage.removeItem("travelto_token");
        localStorage.removeItem("travelto_user");
        localStorage.removeItem("travelto_trip");
        localStorage.removeItem("travelto_trip_request");
        window.location.href = "/login";
        return;
      }
  
      const responseText = await response.text().catch(() => "");
      let result: any = {};
  
      try {
        result = responseText
          ? JSON.parse(responseText)
          : {};
      } catch {
        result = {};
      }
  
      if (!response.ok) {
        console.error("AI trip generation failed:", result);
  
        const message = Array.isArray(result?.detail)
          ? result.detail
              .map(
                (item: any) =>
                  item?.msg || "Invalid field"
              )
              .join(", ")
          : result?.detail ||
            responseText ||
            `Unable to generate trip (${response.status})`;
  
        throw new Error(message);
      }
  
      const generatedTrip = result?.trip;
      const generatedItinerary = result?.itinerary;
  
      if (!generatedTrip?.id) {
        throw new Error(
          "The AI generated a trip, but the server did not return a trip ID."
        );
      }
  
      if (!generatedItinerary?.days) {
        throw new Error(
          "The trip was created, but no itinerary was returned."
        );
      }
  
      const tripRequest = {
        starting_location: startingLocation.trim(),
        destination: destination.trim(),
        travel: {
          mode: transport,
          mode_label: transportLabel,
          vehicle:
            transport === "own_car" || transport === "own_bike"
              ? {
                  type: vehicleType,
                  fuel_type: fuelType,
                  mileage_kmpl: Number(mileage),
                }
              : null,
          rental:
            transport === "rental"
              ? { type: rentalType }
              : null,
        },
        dates: {
          start_date: startDate,
          end_date: endDate,
          flexible: flexibleDates,
        },
        travelers: {
          adults,
          children,
          total: totalTravelers,
          children_ages: childrenAges.map(Number),
        },
        budget: {
          total: Number(budget),
          currency: "INR",
          includes: {
            transport: includeTransport,
            accommodation: includeAccommodation,
            food: includeFood,
            activities: includeActivities,
            local_travel: includeLocalTravel,
          },
        },
        priority,
        travel_style: travelStyle,
        interests: selectedInterests,
      };
  
      localStorage.setItem(
        "travelto_trip_request",
        JSON.stringify(tripRequest)
      );
      localStorage.setItem(
        "travelto_trip",
        JSON.stringify(generatedTrip)
      );
      localStorage.setItem(
        "travelto_itinerary",
        JSON.stringify(generatedItinerary)
      );
  
      window.location.href =
        `/itinerary?trip_id=${generatedTrip.id}`;
    } catch (err) {
      console.error("Plan trip error:", err);
  
      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate your trip. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }
  


  return (

    <main className="plan-page">

      <div className="plan-shell">



        {/* =====================================================

            HEADER

        ===================================================== */}



        <header className="plan-header">



          <div className="plan-brand">

            <div className="plan-brand-icon">

              <Compass size={20} />

            </div>



            <div>

              <span>TRAVELTO AI</span>

              <strong>AI Trip Planner</strong>

            </div>

          </div>



          <div className="plan-header-note">

            <Sparkles size={15} />

            Personalized planning

          </div>



        </header>





        {/* =====================================================

            HERO

        ===================================================== */}



        <section className="plan-hero">



          <div className="plan-hero-badge">

            <Sparkles size={14} />

            AI TRAVEL PLANNER

          </div>



          <h1>

            Let's plan your

            <span> perfect trip.</span>

          </h1>



          <p>

            Tell us where you are starting, where you want to travel and what matters to you. Travelto AI will research the real trip first, compare real options against your total group budget and let you decide before the final itinerary is generated.

          </p>



          <div className="plan-flow">



            <div>

              <span>01</span>

              Start

            </div>



            <div className="flow-line" />



            <div>

              <span>02</span>

              Transport

            </div>



            <div className="flow-line" />



            <div>

              <span>03</span>

              Dates

            </div>



            <div className="flow-line" />



            <div>

              <span>04</span>

              Plan

            </div>



          </div>



        </section>





        {error && (

          <div className="plan-error">

            <strong>Check your trip details</strong>

            <span>{error}</span>

          </div>

        )}





        <form

          className="planner-form"

          onSubmit={handleSubmit}

        >



          {/* ===================================================

              01 START + DESTINATION

          =================================================== */}



          <section className="planner-card">



            <SectionHeading

              number="01"

              icon={<MapPin size={18} />}

              title="Where are you starting from?"

              description="We use this to plan your route, travel time and transportation cost."

            />



            <div className="location-grid">



              <Field

                label="Starting location"

                hint="City, town or airport"

                icon={<MapPin size={17} />}

              >

                <input

                  value={startingLocation}

                  onChange={(event) =>

                    setStartingLocation(

                      event.target.value

                    )

                  }

                  placeholder="e.g. Hyderabad"

                  autoComplete="address-level2"

                />

              </Field>



              <div className="route-arrow">

                <ArrowRight size={20} />

              </div>



              <Field

                label="Destination"

                hint="Where do you want to go?"

                icon={<Compass size={17} />}

              >

                <input

                  value={destination}

                  onChange={(event) =>

                    setDestination(

                      event.target.value

                    )

                  }

                  placeholder="e.g. Araku Valley"

                />

              </Field>



            </div>



            <div className="location-tip">

              <MapPin size={15} />

              <span>

                You can enter a city, landmark, airport

                or any destination. Travelto will plan

                from your starting point to the destination

                and back.

              </span>

            </div>



          </section>





          {/* ===================================================

              02 TRANSPORT

          =================================================== */}



          <section className="planner-card">



            <SectionHeading

              number="02"

              icon={<Route size={18} />}

              title="How do you want to travel?"

              description="Choose your preferred mode. If you're unsure, let Travelto AI compare the practical options."

            />



            <div className="transport-grid">



              {transportOptions.map((option) => {



                const active =

                  transport === option.id;



                return (

                  <button

                    type="button"

                    key={option.id}

                    className={`transport-option ${

                      active ? "active" : ""

                    }`}

                    onClick={() =>

                      setTransport(option.id)

                    }

                  >



                    <div className="transport-icon">

                      {option.icon}

                    </div>



                    <div>

                      <strong>

                        {option.label}

                      </strong>



                      <span>

                        {option.description}

                      </span>

                    </div>



                    {active && (

                      <span className="selected-check">

                        <Check size={13} />

                      </span>

                    )}



                  </button>

                );

              })}



            </div>





            {/* OWN VEHICLE */}



            {(transport === "own_car" ||

              transport === "own_bike") && (



              <div className="transport-details">



                <div className="details-title">

                  <Fuel size={17} />

                  Vehicle details

                </div>



                <div className="details-grid">



                  <Field

                    label="Vehicle"

                    hint="Your vehicle"

                  >

                    <select

                      value={vehicleType}

                      onChange={(event) =>

                        setVehicleType(

                          event.target.value as

                            | "car"

                            | "bike"

                        )

                      }

                    >

                      <option value="car">

                        Car

                      </option>

                      <option value="bike">

                        Bike

                      </option>

                    </select>

                  </Field>



                  <Field

                    label="Fuel"

                    hint="Fuel / power type"

                  >

                    <select

                      value={fuelType}

                      onChange={(event) =>

                        setFuelType(

                          event.target.value as

                            | "petrol"

                            | "diesel"

                            | "cng"

                            | "ev"

                        )

                      }

                    >

                      <option value="petrol">

                        Petrol

                      </option>

                      <option value="diesel">

                        Diesel

                      </option>

                      <option value="cng">

                        CNG

                      </option>

                      <option value="ev">

                        Electric

                      </option>

                    </select>

                  </Field>



                  <Field

                    label="Mileage"

                    hint="km per litre / equivalent"

                  >

                    <div className="input-suffix">

                      <input

                        type="number"

                        min="1"

                        step="0.1"

                        value={mileage}

                        onChange={(event) =>

                          setMileage(

                            event.target.value

                          )

                        }

                      />

                      <span>

                        km/l

                      </span>

                    </div>

                  </Field>



                </div>



                <p className="detail-note">

                  Travelto will estimate fuel, tolls,

                  parking and local driving separately.

                </p>



              </div>

            )}





            {/* RENTAL */}



            {transport === "rental" && (



              <div className="transport-details">



                <div className="details-title">

                  <Car size={17} />

                  Rental preference

                </div>



                <div className="rental-toggle">



                  <button

                    type="button"

                    className={

                      rentalType === "car"

                        ? "active"

                        : ""

                    }

                    onClick={() =>

                      setRentalType("car")

                    }

                  >

                    <Car size={18} />

                    Car

                  </button>



                  <button

                    type="button"

                    className={

                      rentalType === "bike"

                        ? "active"

                        : ""

                    }

                    onClick={() =>

                      setRentalType("bike")

                    }

                  >

                    <Bike size={18} />

                    Bike

                  </button>



                </div>



                <p className="detail-note">

                  The final plan can compare rental cost,

                  fuel, deposit information and local travel.

                </p>



              </div>

            )}



          </section>





          {/* ===================================================

              03 DATES

          =================================================== */}



          <section className="planner-card">



            <SectionHeading

              number="03"

              icon={<CalendarDays size={18} />}

              title="When are you travelling?"

              description="Dates are used for duration, route planning and later availability checks."

            />



            <div className="date-grid">



              <Field

                label="Start date"

                hint="Departure date"

              >

                <input

                  type="date"

                  value={startDate}

                  onChange={(event) =>

                    setStartDate(

                      event.target.value

                    )

                  }

                />

              </Field>



              <Field

                label="End date"

                hint="Return / final day"

              >

                <input

                  type="date"

                  value={endDate}

                  min={startDate || undefined}

                  onChange={(event) =>

                    setEndDate(

                      event.target.value

                    )

                  }

                />

              </Field>



            </div>



            <label className="checkbox-row">



              <input

                type="checkbox"

                checked={flexibleDates}

                onChange={(event) =>

                  setFlexibleDates(

                    event.target.checked

                  )

                }

              />



              <span className="custom-check">

                {flexibleDates && (

                  <Check size={12} />

                )}

              </span>



              <span>

                <strong>

                  My dates are flexible

                </strong>



                <small>

                  Allow Travelto to compare nearby

                  dates if the preferred option is unavailable

                  or significantly more expensive.

                </small>

              </span>



            </label>



          </section>





          {/* ===================================================

              04 TRAVELERS

          =================================================== */}



          <section className="planner-card">



            <SectionHeading

              number="04"

              icon={<Users size={18} />}

              title="Who's travelling?"

              description="Traveler count helps estimate transport, hotels, food and activity costs."

            />



            <div className="traveler-grid">



              <Counter

                label="Adults"

                description="Age 13+"

                value={adults}

                min={1}

                onChange={setAdults}

              />



              <Counter

                label="Children"

                description="Under 13"

                value={children}

                min={0}

                onChange={updateChildrenCount}

              />



            </div>



            {children > 0 && (

              <div className="children-ages">



                <div className="details-title">

                  <Users size={16} />

                  Children's ages

                </div>



                <div className="age-grid">



                  {childrenAges.map(

                    (age, index) => (

                      <input

                        key={index}

                        type="number"

                        min="0"

                        max="12"

                        placeholder={`Child ${

                          index + 1

                        }`}

                        value={age}

                        onChange={(event) => {

                          const next = [

                            ...childrenAges,

                          ];



                          next[index] =

                            event.target.value;



                          setChildrenAges(next);

                        }}

                      />

                    )

                  )}



                </div>



              </div>

            )}



            <div className="traveler-total">

              <Users size={16} />

              <strong>

                {totalTravelers}

              </strong>

              travelers total

            </div>



          </section>





          {/* ===================================================

              05 BUDGET

          =================================================== */}



          <section className="planner-card">



            <SectionHeading

              number="05"

              icon={<Wallet size={18} />}

              title="What's your budget?"

              description="Give us your total trip budget so the AI can keep the complete plan realistic."

            />



            <div className="budget-field">



              <span>₹</span>



              <input

                type="number"

                min="1"

                value={budget}

                onChange={(event) =>

                  setBudget(

                    event.target.value

                  )

                }

                placeholder="20,000"

              />



              <small>

                Total trip budget

              </small>



            </div>



            <p className="budget-note">

              Travelto will try to include the selected

              cost categories within this amount and will

              clearly show estimated transport, hotel,

              food, activities and local travel costs.

            </p>



            <div className="budget-options">



              <BudgetCheck

                label="Transportation"

                checked={includeTransport}

                onChange={setIncludeTransport}

              />



              <BudgetCheck

                label="Accommodation"

                checked={includeAccommodation}

                onChange={setIncludeAccommodation}

              />



              <BudgetCheck

                label="Food"

                checked={includeFood}

                onChange={setIncludeFood}

              />



              <BudgetCheck

                label="Activities"

                checked={includeActivities}

                onChange={setIncludeActivities}

              />



              <BudgetCheck

                label="Local travel"

                checked={includeLocalTravel}

                onChange={setIncludeLocalTravel}

              />



            </div>



          </section>





          {/* ===================================================

              06 PRIORITY

          =================================================== */}



          <section className="planner-card">



            <SectionHeading

              number="06"

              icon={<Zap size={18} />}

              title="What matters most?"

              description="This helps the planner decide how to trade off cost, time and comfort."

            />



            <div className="priority-grid">



              {priorityOptions.map(

                ([id, title, description]) => {



                  const active =

                    priority === id;



                  return (

                    <button

                      type="button"

                      key={id}

                      className={`priority-option ${

                        active ? "active" : ""

                      }`}

                      onClick={() =>

                        setPriority(

                          id as Priority

                        )

                      }

                    >



                      <div className="priority-dot">

                        {active && (

                          <Check size={12} />

                        )}

                      </div>



                      <div>

                        <strong>

                          {title}

                        </strong>



                        <span>

                          {description}

                        </span>

                      </div>



                    </button>

                  );

                }

              )}



            </div>



          </section>





          {/* ===================================================

              07 STYLE

          =================================================== */}



          <section className="planner-card">



            <SectionHeading

              number="07"

              icon={<Sparkles size={18} />}

              title="What's your travel style?"

              description="Choose how you want the trip to feel."

            />



            <div className="style-grid">



              {styleOptions.map((option) => {



                const active =

                  travelStyle === option.id;



                return (

                  <button

                    type="button"

                    key={option.id}

                    className={`style-option ${

                      active ? "active" : ""

                    }`}

                    onClick={() =>

                      setTravelStyle(

                        option.id

                      )

                    }

                  >



                    <div className="style-radio">

                      {active && (

                        <span />

                      )}

                    </div>



                    <div>

                      <strong>

                        {option.id}

                      </strong>



                      <span>

                        {option.description}

                      </span>

                    </div>



                  </button>

                );

              })}



            </div>



          </section>





          {/* ===================================================

              08 INTERESTS

          =================================================== */}



          <section className="planner-card">



            <SectionHeading

              number="08"

              icon={<Compass size={18} />}

              title="What are you interested in?"

              description="Select everything you would enjoy."

            />



            <div className="interest-grid">



              {interests.map((interest) => {



                const active =

                  selectedInterests.includes(

                    interest

                  );



                return (

                  <button

                    type="button"

                    key={interest}

                    className={`interest-chip ${

                      active ? "active" : ""

                    }`}

                    onClick={() =>

                      toggleInterest(

                        interest

                      )

                    }

                  >



                    {active && (

                      <Check size={13} />

                    )}



                    {interest}



                  </button>

                );

              })}



            </div>



          </section>





          {/* ===================================================

              AI PROMISE

          =================================================== */}



          <section className="ai-plan-card">

            <div className="ai-plan-icon"><Sparkles size={24} /></div>

            <div><span>TRAVELTO AI TRAVEL AGENT</span><h2>Let AI arrange the real trip before you finalize it.</h2><p>Travelto will research real transport, hotels, places, weather and routes, then compare the results around your total group budget and preferences. Restaurants are added naturally when the final itinerary is generated. You review the options before anything is booked or finalized.</p></div>

          </section>



          <div className="submit-area">

            <div className="submit-summary"><div><MapPin size={15}/><span>{startingLocation || "Starting point"}</span><ArrowRight size={14}/><strong>{destination || "Destination"}</strong></div><div><Users size={15}/>{totalTravelers} travelers<span className="summary-divider"/>{transportLabel}<span className="summary-divider"/>₹{budget || "—"}</div></div>

            <button type="submit" className="generate-button" disabled={loading}>{loading ? <><span className="spinner"/>Researching your trip...</> : <>Let AI Arrange My Trip<Sparkles size={18}/></>}</button>

            <p className="submit-disclaimer">No booking or payment happens here. Travelto first researches the trip and lets you review the real options.</p>

          </div>



        </form>



      </div>





      {/* =====================================================

          CSS

      ===================================================== */}



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

          background: #f1f8f6;

          color: #0f172a;

          font-family:

            Inter,

            ui-sans-serif,

            system-ui,

            -apple-system,

            BlinkMacSystemFont,

            "Segoe UI",

            sans-serif;

        }



        button,

        input,

        select {

          font: inherit;

        }



        button {

          cursor: pointer;

        }



        .plan-page {

          min-height: 100vh;

          padding: 28px 20px 70px;



          background:

            radial-gradient(

              circle at 12% 8%,

              rgba(45, 212, 191, 0.13),

              transparent 28%

            ),

            radial-gradient(

              circle at 90% 18%,

              rgba(20, 184, 166, 0.09),

              transparent 26%

            ),

            linear-gradient(

              180deg,

              #effaf8 0%,

              #f7fbfa 45%,

              #edf6f4 100%

            );

        }



        .plan-shell {

          width: min(1040px, 100%);

          margin: 0 auto;

        }



        /* HEADER */



        .plan-header {

          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 20px;

          margin-bottom: 30px;

        }



        .plan-brand {

          display: flex;

          align-items: center;

          gap: 11px;

        }



        .plan-brand-icon {

          width: 40px;

          height: 40px;



          display: grid;

          place-items: center;



          color: white;

          background:

            linear-gradient(

              135deg,

              #0f8f83,

              #14b8a6

            );



          border-radius: 12px;

          box-shadow:

            0 8px 20px

              rgba(15, 118, 110, 0.16);

        }



        .plan-brand div:last-child {

          display: grid;

          gap: 2px;

        }



        .plan-brand span {

          color: #0f8f83;

          font-size: 9px;

          font-weight: 900;

          letter-spacing: 1.5px;

        }



        .plan-brand strong {

          font-size: 15px;

          letter-spacing: -0.2px;

        }



        .plan-header-note {

          display: inline-flex;

          align-items: center;

          gap: 7px;



          padding: 8px 12px;



          color: #0f766e;

          background: rgba(255,255,255,0.7);



          border: 1px solid #cce6e1;

          border-radius: 999px;



          font-size: 10px;

          font-weight: 800;

        }



        /* HERO */



        .plan-hero {

          position: relative;

          overflow: hidden;



          padding: 38px 42px 34px;

          margin-bottom: 20px;



          border: 1px solid #cde5e1;

          border-radius: 24px;



          background:

            linear-gradient(

              135deg,

              rgba(255,255,255,0.96),

              rgba(235,249,246,0.90)

            );



          box-shadow:

            0 18px 45px

              rgba(15,118,110,0.07);

        }



        .plan-hero::after {

          content: "";

          position: absolute;

          width: 280px;

          height: 280px;

          right: -120px;

          top: -150px;



          border-radius: 50%;

          background:

            rgba(45,212,191,0.12);

          filter: blur(3px);

        }



        .plan-hero-badge {

          position: relative;

          z-index: 1;



          display: inline-flex;

          align-items: center;

          gap: 7px;



          color: #0f766e;

          font-size: 10px;

          font-weight: 900;

          letter-spacing: 1.2px;

        }



        .plan-hero h1 {

          position: relative;

          z-index: 1;



          max-width: 700px;



          margin: 13px 0 10px;



          color: #0f172a;



          font-size: clamp(34px, 5vw, 53px);

          line-height: 1.02;

          letter-spacing: -2.3px;

          font-weight: 900;

        }



        .plan-hero h1 span {

          color: #0f8f83;

        }



        .plan-hero > p {

          position: relative;

          z-index: 1;



          max-width: 720px;



          margin: 0;



          color: #64748b;



          font-size: 13px;

          line-height: 1.75;

        }



        .plan-flow {

          position: relative;

          z-index: 1;



          display: flex;

          align-items: center;



          max-width: 590px;



          margin-top: 25px;

        }



        .plan-flow > div:not(.flow-line) {

          display: flex;

          align-items: center;

          gap: 7px;



          color: #334155;



          font-size: 10px;

          font-weight: 800;

          white-space: nowrap;

        }



        .plan-flow span {

          display: grid;

          place-items: center;



          width: 25px;

          height: 25px;



          color: white;

          background: #0f8f83;



          border-radius: 8px;



          font-size: 8px;

        }



        .flow-line {

          flex: 1;

          height: 1px;

          margin: 0 10px;

          background: #c9dfdc;

        }



        /* ERROR */



        .plan-error {

          display: grid;

          gap: 3px;



          padding: 13px 16px;

          margin-bottom: 16px;



          color: #991b1b;

          background: #fff5f5;



          border: 1px solid #fecaca;

          border-radius: 13px;



          font-size: 11px;

        }



        /* FORM */



        .planner-form {

          display: grid;

          gap: 16px;

        }



        .planner-card {

          padding: 26px;



          border: 1px solid #d4e7e3;

          border-radius: 20px;



          background:

            rgba(255,255,255,0.91);



          box-shadow:

            0 8px 28px

              rgba(15,118,110,0.045);

        }



        .section-heading {

          display: flex;

          align-items: flex-start;

          gap: 13px;

          margin-bottom: 21px;

        }



        .section-number {

          flex: 0 0 auto;



          display: grid;

          place-items: center;



          width: 35px;

          height: 35px;



          color: #0f766e;

          background: #e9f8f5;



          border: 1px solid #c7e9e3;

          border-radius: 10px;



          font-size: 10px;

          font-weight: 900;

        }



        .section-heading-content {

          min-width: 0;

        }



        .section-heading-content > div {

          display: flex;

          align-items: center;

          gap: 7px;



          margin-bottom: 4px;



          color: #0f766e;

        }



        .section-heading h2 {

          margin: 0;



          color: #0f172a;



          font-size: 19px;

          line-height: 1.2;

          letter-spacing: -0.5px;

          font-weight: 850;

        }



        .section-heading p {

          margin: 0;



          color: #71838b;



          font-size: 11px;

          line-height: 1.55;

        }



        /* LOCATION */



        .location-grid {

          display: grid;

          grid-template-columns:

            minmax(0,1fr)

            42px

            minmax(0,1fr);



          align-items: end;

          gap: 10px;

        }



        .route-arrow {

          width: 42px;

          height: 42px;



          display: grid;

          place-items: center;



          color: #0f8f83;

          background: #effaf8;



          border: 1px solid #cce7e2;

          border-radius: 12px;

        }



        .field {

          display: grid;

          gap: 7px;

        }



        .field > label,

        .field-label {

          display: flex;

          align-items: center;

          gap: 6px;



          color: #334155;



          font-size: 10px;

          font-weight: 850;

        }



        .field-hint {

          color: #94a3b8;

          font-size: 9px;

          font-weight: 500;

        }



        .field input,

        .field select,

        .age-grid input {

          width: 100%;

          min-height: 45px;



          padding: 0 13px;



          color: #0f172a;

          background: #fbfefd;



          border: 1px solid #cfe3df;

          border-radius: 11px;



          outline: none;



          transition:

            border-color 0.18s ease,

            box-shadow 0.18s ease;

        }



        .field input:focus,

        .field select:focus,

        .age-grid input:focus {

          border-color: #14b8a6;



          box-shadow:

            0 0 0 3px

              rgba(20,184,166,0.10);

        }



        .field input::placeholder {

          color: #a1adb5;

        }



        .location-tip {

          display: flex;

          align-items: flex-start;

          gap: 8px;



          margin-top: 13px;



          color: #64748b;



          font-size: 10px;

          line-height: 1.5;

        }



        .location-tip svg {

          flex: 0 0 auto;

          color: #0f8f83;

          margin-top: 1px;

        }



        /* TRANSPORT */



        .transport-grid {

          display: grid;



          grid-template-columns:

            repeat(4, minmax(0, 1fr));



          gap: 10px;

        }



        .transport-option {

          position: relative;



          display: flex;

          align-items: center;

          gap: 10px;



          min-height: 78px;



          padding: 12px;



          text-align: left;



          color: #334155;

          background: #fbfefd;



          border: 1px solid #d2e5e1;

          border-radius: 13px;



          transition:

            border-color 0.18s ease,

            background 0.18s ease,

            transform 0.18s ease;

        }



        .transport-option:hover {

          transform: translateY(-1px);

          border-color: #9bd8cf;

        }



        .transport-option.active {

          color: #0f766e;

          background: #eefaf8;

          border-color: #0faaa0;



          box-shadow:

            0 6px 18px

              rgba(15,118,110,0.08);

        }



        .transport-icon {

          flex: 0 0 auto;



          width: 36px;

          height: 36px;



          display: grid;

          place-items: center;



          color: #0f8f83;

          background: white;



          border: 1px solid #d7e9e5;

          border-radius: 10px;

        }



        .transport-option > div:nth-child(2) {

          display: grid;

          gap: 3px;

        }



        .transport-option strong {

          color: #0f172a;

          font-size: 11px;

        }



        .transport-option span:not(.selected-check) {

          color: #81919a;

          font-size: 8px;

          line-height: 1.35;

        }



        .selected-check {

          position: absolute;

          top: 8px;

          right: 8px;



          width: 18px;

          height: 18px;



          display: grid;

          place-items: center;



          color: white;

          background: #0f9b8e;

          border-radius: 50%;

        }



        .transport-details {

          margin-top: 13px;

          padding: 17px;



          background: #f6fbfa;



          border: 1px solid #d6e9e5;

          border-radius: 14px;

        }



        .details-title {

          display: flex;

          align-items: center;

          gap: 7px;



          margin-bottom: 13px;



          color: #0f766e;



          font-size: 11px;

          font-weight: 850;

        }



        .details-grid {

          display: grid;

          grid-template-columns:

            repeat(3, minmax(0, 1fr));

          gap: 10px;

        }



        .input-suffix {

          position: relative;

        }



        .input-suffix input {

          padding-right: 52px;

        }



        .input-suffix span {

          position: absolute;

          right: 12px;

          top: 50%;

          transform: translateY(-50%);



          color: #94a3b8;

          font-size: 9px;

          font-weight: 700;

        }



        .detail-note {

          margin: 12px 0 0;



          color: #7b8d94;

          font-size: 9px;

          line-height: 1.5;

        }



        .rental-toggle {

          display: flex;

          gap: 8px;

        }



        .rental-toggle button {

          display: inline-flex;

          align-items: center;

          gap: 7px;



          min-height: 40px;

          padding: 0 14px;



          color: #64748b;

          background: white;



          border: 1px solid #d2e5e1;

          border-radius: 10px;



          font-size: 10px;

          font-weight: 800;

        }



        .rental-toggle button.active {

          color: #0f766e;

          background: #eaf9f6;

          border-color: #0faaa0;

        }



        /* DATES */



        .date-grid {

          display: grid;

          grid-template-columns: 1fr 1fr;

          gap: 12px;

        }



        .checkbox-row {

          display: flex;

          align-items: flex-start;

          gap: 10px;



          margin-top: 14px;



          cursor: pointer;

        }



        .checkbox-row input {

          position: absolute;

          opacity: 0;

          pointer-events: none;

        }



        .custom-check {

          flex: 0 0 auto;



          width: 19px;

          height: 19px;



          display: grid;

          place-items: center;



          color: white;

          background: white;



          border: 1px solid #bdd8d3;

          border-radius: 6px;

        }



        .checkbox-row input:checked + .custom-check {

          background: #0f9b8e;

          border-color: #0f9b8e;

        }



        .checkbox-row > span:last-child {

          display: grid;

          gap: 3px;

        }



        .checkbox-row strong {

          color: #334155;

          font-size: 10px;

        }



        .checkbox-row small {

          color: #81919a;

          font-size: 9px;

          line-height: 1.45;

        }



        /* TRAVELERS */



        .traveler-grid {

          display: grid;

          grid-template-columns: 1fr 1fr;

          gap: 12px;

        }



        .counter {

          display: flex;

          align-items: center;

          justify-content: space-between;



          min-height: 72px;

          padding: 12px 14px;



          background: #fbfefd;

          border: 1px solid #d2e5e1;

          border-radius: 13px;

        }



        .counter-info {

          display: grid;

          gap: 3px;

        }



        .counter-info strong {

          font-size: 11px;

        }



        .counter-info span {

          color: #94a3b8;

          font-size: 9px;

        }



        .counter-controls {

          display: flex;

          align-items: center;

          gap: 10px;

        }



        .counter-controls button {

          width: 31px;

          height: 31px;



          display: grid;

          place-items: center;



          color: #0f766e;

          background: #effaf8;



          border: 1px solid #cbe5e0;

          border-radius: 9px;

        }



        .counter-value {

          min-width: 22px;

          text-align: center;



          color: #0f172a;

          font-size: 14px;

          font-weight: 900;

        }



        .children-ages {

          margin-top: 14px;

          padding: 15px;



          background: #f8fcfb;



          border: 1px solid #dbece8;

          border-radius: 13px;

        }



        .age-grid {

          display: grid;

          grid-template-columns:

            repeat(4, minmax(0, 1fr));

          gap: 8px;

        }



        .age-grid input {

          min-height: 40px;

        }



        .traveler-total {

          display: inline-flex;

          align-items: center;

          gap: 6px;



          margin-top: 14px;



          color: #64748b;

          font-size: 10px;

        }



        .traveler-total svg {

          color: #0f8f83;

        }



        .traveler-total strong {

          color: #0f766e;

          font-size: 12px;

        }



        /* BUDGET */



        .budget-field {

          position: relative;



          display: flex;

          align-items: center;



          max-width: 560px;

          min-height: 62px;



          padding: 0 17px;



          background: #fbfefd;



          border: 1px solid #cfe3df;

          border-radius: 13px;

        }



        .budget-field > span {

          margin-right: 9px;



          color: #0f766e;



          font-size: 21px;

          font-weight: 900;

        }



        .budget-field input {

          width: 100%;



          padding-right: 90px;



          color: #0f172a;



          background: transparent;



          border: 0;

          outline: 0;



          font-size: 21px;

          font-weight: 850;

        }



        .budget-field small {

          position: absolute;

          right: 15px;



          color: #94a3b8;

          font-size: 8px;

          font-weight: 800;

        }



        .budget-note {

          max-width: 700px;



          margin: 10px 0 14px;



          color: #81919a;

          font-size: 9px;

          line-height: 1.55;

        }



        .budget-options {

          display: flex;

          flex-wrap: wrap;

          gap: 8px;

        }



        .budget-check {

          display: inline-flex;

          align-items: center;

          gap: 7px;



          min-height: 34px;

          padding: 0 10px;



          color: #52636b;

          background: #f5faf9;



          border: 1px solid #d4e6e2;

          border-radius: 9px;



          font-size: 9px;

          font-weight: 750;



          cursor: pointer;

        }



        .budget-check input {

          accent-color: #0f9b8e;

        }



        /* PRIORITY */



        .priority-grid {

          display: grid;



          grid-template-columns:

            repeat(3, minmax(0, 1fr));



          gap: 9px;

        }



        .priority-option {

          display: flex;

          align-items: center;

          gap: 10px;



          min-height: 65px;

          padding: 11px;



          text-align: left;



          background: #fbfefd;

          border: 1px solid #d4e6e2;

          border-radius: 12px;

        }



        .priority-option.active {

          background: #eefaf8;

          border-color: #0faaa0;

        }



        .priority-dot {

          flex: 0 0 auto;



          width: 19px;

          height: 19px;



          display: grid;

          place-items: center;



          color: white;



          border: 1px solid #c4ddd9;

          border-radius: 50%;

        }



        .priority-option.active

        .priority-dot {

          background: #0f9b8e;

          border-color: #0f9b8e;

        }



        .priority-option > div:last-child {

          display: grid;

          gap: 3px;

        }



        .priority-option strong {

          color: #263640;

          font-size: 10px;

        }



        .priority-option span {

          color: #8a999f;

          font-size: 8px;

          line-height: 1.35;

        }



        /* STYLE */



        .style-grid {

          display: grid;

          grid-template-columns:

            repeat(4, minmax(0, 1fr));

          gap: 10px;

        }



        .style-option {

          display: flex;

          align-items: flex-start;

          gap: 10px;



          min-height: 83px;

          padding: 13px;



          text-align: left;



          background: #fbfefd;

          border: 1px solid #d4e6e2;

          border-radius: 12px;

        }



        .style-option.active {

          background: #eefaf8;

          border-color: #0faaa0;

        }



        .style-radio {

          flex: 0 0 auto;



          width: 18px;

          height: 18px;



          display: grid;

          place-items: center;



          border: 1px solid #b9d4cf;

          border-radius: 50%;

        }



        .style-radio span {

          width: 8px;

          height: 8px;



          border-radius: 50%;

          background: #0f9b8e;

        }



        .style-option > div:last-child {

          display: grid;

          gap: 4px;

        }



        .style-option strong {

          color: #25333b;

          font-size: 10px;

        }



        .style-option span {

          color: #84939a;

          font-size: 8px;

          line-height: 1.45;

        }



        /* INTERESTS */



        .interest-grid {

          display: flex;

          flex-wrap: wrap;

          gap: 8px;

        }



        .interest-chip {

          display: inline-flex;

          align-items: center;

          gap: 5px;



          min-height: 34px;

          padding: 0 12px;



          color: #60727a;

          background: #fbfefd;



          border: 1px solid #d4e6e2;

          border-radius: 999px;



          font-size: 9px;

          font-weight: 750;

        }



        .interest-chip.active {

          color: white;

          background: #0f9388;

          border-color: #0f9388;

        }



        /* AI CARD */



        .ai-plan-card {

          position: relative;

          overflow: hidden;



          display: flex;

          align-items: flex-start;

          gap: 15px;



          padding: 23px 25px;



          border-radius: 19px;



          color: white;



          background:

            linear-gradient(

              135deg,

              #0d756e,

              #0f9489

            );



          box-shadow:

            0 16px 35px

              rgba(15,118,110,0.17);

        }



        .ai-plan-card::after {

          content: "";



          position: absolute;



          width: 260px;

          height: 260px;



          right: -100px;

          top: -150px;



          border-radius: 50%;



          background:

            rgba(255,255,255,0.13);

        }



        .ai-plan-icon {

          position: relative;

          z-index: 1;



          flex: 0 0 auto;



          width: 43px;

          height: 43px;



          display: grid;

          place-items: center;



          background:

            rgba(255,255,255,0.15);



          border:

            1px solid

            rgba(255,255,255,0.20);



          border-radius: 13px;

        }



        .ai-plan-card > div:last-child {

          position: relative;

          z-index: 1;

        }



        .ai-plan-card span {

          font-size: 8px;

          font-weight: 900;

          letter-spacing: 1.4px;

          opacity: 0.82;

        }



        .ai-plan-card h2 {

          margin: 5px 0 6px;



          font-size: 19px;

          line-height: 1.2;

          letter-spacing: -0.4px;

        }



        .ai-plan-card p {

          max-width: 780px;



          margin: 0;



          color:

            rgba(255,255,255,0.76);



          font-size: 10px;

          line-height: 1.65;

        }



        /* SUBMIT */



        .submit-area {

          display: grid;

          gap: 12px;



          padding-top: 5px;

        }



        .submit-summary {

          display: flex;

          align-items: center;

          justify-content: space-between;

          gap: 15px;



          padding: 13px 15px;



          color: #64748b;



          background:

            rgba(255,255,255,0.76);



          border: 1px solid #d6e8e4;

          border-radius: 13px;



          font-size: 9px;

        }



        .submit-summary > div {

          display: flex;

          align-items: center;

          gap: 7px;

          flex-wrap: wrap;

        }



        .submit-summary svg {

          color: #0f8f83;

        }



        .submit-summary strong {

          color: #0f172a;

        }



        .summary-divider {

          width: 1px;

          height: 13px;

          background: #d2e3df;

        }



        .generate-button {

          width: 100%;

          min-height: 57px;



          display: inline-flex;

          align-items: center;

          justify-content: center;

          gap: 9px;



          color: white;



          background:

            linear-gradient(

              135deg,

              #0f8f83,

              #0d9488

            );



          border: 0;

          border-radius: 14px;



          box-shadow:

            0 13px 25px

              rgba(15,118,110,0.18);



          font-size: 12px;

          font-weight: 900;



          transition:

            transform 0.18s ease,

            box-shadow 0.18s ease;

        }



        .generate-button:hover:not(:disabled) {

          transform: translateY(-2px);



          box-shadow:

            0 17px 30px

              rgba(15,118,110,0.24);

        }



        .generate-button:disabled {

          cursor: wait;

          opacity: 0.72;

        }



        .spinner {

          width: 16px;

          height: 16px;



          border: 2px solid

            rgba(255,255,255,0.35);



          border-top-color: white;



          border-radius: 50%;



          animation:

            plan-spin 0.7s linear infinite;

        }



        @keyframes plan-spin {

          to {

            transform: rotate(360deg);

          }

        }



        .submit-disclaimer {

          margin: 0;



          color: #8a999f;



          text-align: center;



          font-size: 8px;

          line-height: 1.5;

        }



        /* RESPONSIVE */



        @media (max-width: 900px) {



          .transport-grid {

            grid-template-columns:

              repeat(2, minmax(0, 1fr));

          }



          .priority-grid {

            grid-template-columns:

              repeat(2, minmax(0, 1fr));

          }



          .style-grid {

            grid-template-columns:

              repeat(2, minmax(0, 1fr));

          }



        }



        @media (max-width: 680px) {



          .plan-page {

            padding:

              18px 12px 45px;

          }



          .plan-header-note {

            display: none;

          }



          .plan-hero {

            padding:

              28px 21px;

            border-radius: 19px;

          }



          .plan-hero h1 {

            font-size: 36px;

            letter-spacing: -1.5px;

          }



          .plan-flow {

            display: none;

          }



          .planner-card {

            padding: 20px 16px;

            border-radius: 16px;

          }



          .location-grid {

            grid-template-columns: 1fr;

          }



          .route-arrow {

            display: none;

          }



          .transport-grid {

            grid-template-columns: 1fr;

          }



          .details-grid,

          .date-grid,

          .traveler-grid {

            grid-template-columns: 1fr;

          }



          .priority-grid,

          .style-grid {

            grid-template-columns: 1fr;

          }



          .age-grid {

            grid-template-columns:

              repeat(2, minmax(0, 1fr));

          }



          .submit-summary {

            align-items: flex-start;

            flex-direction: column;

          }



          .ai-plan-card {

            padding: 19px;

          }



        }



      `}</style>



    </main>

  );

}





/* ============================================================

   SMALL COMPONENTS

============================================================ */



function SectionHeading({

  number,

  icon,

  title,

  description,

}: {

  number: string;

  icon: React.ReactNode;

  title: string;

  description: string;

}) {

  return (

    <div className="section-heading">



      <div className="section-number">

        {number}

      </div>



      <div className="section-heading-content">



        <div>

          {icon}



          <h2>

            {title}

          </h2>

        </div>



        <p>

          {description}

        </p>



      </div>



    </div>

  );

}





function Field({

  label,

  hint,

  icon,

  children,

}: {

  label: string;

  hint?: string;

  icon?: React.ReactNode;

  children: React.ReactNode;

}) {

  return (

    <div className="field">



      <label>

        {icon}

        {label}



        {hint && (

          <span className="field-hint">

            • {hint}

          </span>

        )}

      </label>



      {children}



    </div>

  );

}





function Counter({

  label,

  description,

  value,

  min,

  onChange,

}: {

  label: string;

  description: string;

  value: number;

  min: number;

  onChange: (value: number) => void;

}) {

  return (

    <div className="counter">



      <div className="counter-info">

        <strong>{label}</strong>

        <span>{description}</span>

      </div>



      <div className="counter-controls">



        <button

          type="button"

          aria-label={`Decrease ${label}`}

          onClick={() =>

            onChange(

              Math.max(min, value - 1)

            )

          }

        >

          −

        </button>



        <span className="counter-value">

          {value}

        </span>



        <button

          type="button"

          aria-label={`Increase ${label}`}

          onClick={() =>

            onChange(value + 1)

          }

        >

          +

        </button>



      </div>



    </div>

  );

}





function BudgetCheck({

  label,

  checked,

  onChange,

}: {

  label: string;

  checked: boolean;

  onChange: (value: boolean) => void;

}) {

  return (

    <label className="budget-check">



      <input

        type="checkbox"

        checked={checked}

        onChange={(event) =>

          onChange(

            event.target.checked

          )

        }

      />



      {label}



    </label>

  );

}
