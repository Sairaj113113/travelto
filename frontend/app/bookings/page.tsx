import Link from "next/link";

const bookings = [
  {
    type: "Hotel",
    icon: "🏨",
    name: "Green Valley Resort",
    location: "Araku Valley",
    date: "18 Oct – 20 Oct",
    price: "₹5,300",
    status: "Confirmed",
  },
  {
    type: "Transport",
    icon: "🚗",
    name: "Private Cab",
    location: "Vizag → Araku",
    date: "18 Oct",
    price: "₹2,400",
    status: "Confirmed",
  },
  {
    type: "Activity",
    icon: "🎟️",
    name: "Borra Caves",
    location: "Araku",
    date: "18 Oct",
    price: "₹300",
    status: "Confirmed",
  },
];

export default function Bookings() {
  return (
    <main className="app-page">

      <header className="inner-navbar">

        <Link href="/" className="logo">
          <span className="logo-icon">✈</span>
          <span className="logo-text">Travelto</span>
        </Link>

        <nav className="nav-links">
          <Link href="/">Home</Link>
          <Link href="/plan-trip">Plan Trip</Link>
          <Link href="/ai-agent">AI Agent</Link>
          <Link href="/itinerary">Trips</Link>
          <Link href="/travel-guides">Guides</Link>
        </nav>

        <Link href="/login" className="signin-btn">
          Sign In
        </Link>

      </header>


      <section className="content-page">

        <div className="page-heading left-heading">

          <span className="page-badge">
            YOUR BOOKINGS
          </span>

          <h1>
            Manage your
            <span> bookings.</span>
          </h1>

          <p>
            Keep hotels, transport and activities together.
          </p>

        </div>


        <div className="booking-tabs">

          <button className="active-booking-tab">
            All
          </button>

          <button>Hotels</button>
          <button>Transport</button>
          <button>Activities</button>

        </div>


        <div className="booking-list">

          {bookings.map((booking) => (

            <div className="booking-card" key={booking.name}>

              <div className="booking-icon">
                {booking.icon}
              </div>

              <div className="booking-main">

                <span className="booking-type">
                  {booking.type}
                </span>

                <h3>{booking.name}</h3>

                <p>
                  📍 {booking.location}
                </p>

                <p>
                  📅 {booking.date}
                </p>

              </div>

              <div className="booking-right">

                <strong>{booking.price}</strong>

                <span className="confirmed">
                  ✓ {booking.status}
                </span>

                <button>
                  View Details
                </button>

              </div>

            </div>

          ))}

        </div>

      </section>

    </main>
  );
}