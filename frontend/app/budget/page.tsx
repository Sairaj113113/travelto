import Link from "next/link";

export default function Budget() {

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
            AI BUDGET MANAGER
          </span>

          <h1>
            Stay within your
            <span> budget.</span>
          </h1>

          <p>
            Track your trip spending and let AI find cheaper alternatives.
          </p>

        </div>


        <div className="budget-overview">

          <div className="budget-main-card">

            <div className="budget-circle">
              <strong>₹12,500</strong>
              <span>Spent</span>
            </div>

            <div className="budget-details">

              <small>Total Budget</small>
              <strong>₹20,000</strong>

              <div className="budget-progress">
                <span />
              </div>

              <p>
                ₹7,500 remaining
              </p>

            </div>

          </div>


          <div className="budget-stats">

            <div>
              <span>🏨</span>
              <strong>₹6,000</strong>
              <small>Hotels</small>
            </div>

            <div>
              <span>🚗</span>
              <strong>₹3,200</strong>
              <small>Transport</small>
            </div>

            <div>
              <span>🍛</span>
              <strong>₹1,800</strong>
              <small>Food</small>
            </div>

            <div>
              <span>🎟️</span>
              <strong>₹1,500</strong>
              <small>Activities</small>
            </div>

          </div>

        </div>


        <div className="budget-ai-card">

          <div className="budget-ai-icon">
            ✨
          </div>

          <div>

            <h3>AI Budget Suggestion</h3>

            <p>
              Your hotel spending is higher than planned.
              I can find alternatives and save approximately ₹1,500.
            </p>

          </div>

          <button>
            Find Cheaper Options
          </button>

        </div>

      </section>

    </main>
  );
}