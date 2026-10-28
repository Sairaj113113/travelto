import Link from "next/link";

export default function TravelCompanion() {

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


      <section className="companion-page">

        <div className="page-heading">

          <span className="page-badge">
            ✨ DURING YOUR TRIP
          </span>

          <h1>
            Your AI travel
            <span> companion.</span>
          </h1>

          <p>
            Get contextual help while you're exploring.
          </p>

        </div>


        <div className="companion-layout">

          <div className="companion-chat">

            <div className="companion-message">

              <span>🤖</span>

              <div>
                <strong>Travelto AI</strong>

                <p>
                  You have about 2 hours free near Baga Beach.
                  Would you like something relaxing, food-focused
                  or adventurous?
                </p>
              </div>

            </div>


            <div className="companion-options">

              <button>🍛 Find food nearby</button>
              <button>🌊 Nearby beach</button>
              <button>📸 Photography spot</button>
              <button>🎯 Something adventurous</button>

            </div>


            <div className="companion-input">

              <input
                placeholder="Ask your companion anything..."
              />

              <button>
                →
              </button>

            </div>

          </div>


          <div className="nearby-card">

            <h3>Nearby</h3>

            <div>
              <span>🍛</span>
              <strong>Beach Shack</strong>
              <small>8 min away</small>
            </div>

            <div>
              <span>📸</span>
              <strong>Sunset Point</strong>
              <small>12 min away</small>
            </div>

            <div>
              <span>☕</span>
              <strong>Local Cafe</strong>
              <small>5 min away</small>
            </div>

          </div>

        </div>

      </section>

    </main>
  );
}