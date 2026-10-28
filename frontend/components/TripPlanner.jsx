"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Itinerary from "./Itinerary";

export default function TripPlanner() {
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState(10000);
  const [interests, setInterests] = useState("");

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateTrip(e) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setTrip(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/trips/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            destination,
            days: Number(days),
            budget: Number(budget),
            interests: interests
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to generate trip");
      }

      setTrip(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">

      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 text-center"
      >
        <h1 className="text-5xl font-bold">
          AI Tourism Portal
        </h1>

        <p className="mt-3 text-slate-400">
          Plan your perfect trip with AI
        </p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={generateTrip}
        className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl"
      >

        <div className="grid gap-6 md:grid-cols-2">

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Destination
            </label>

            <input
              type="text"
              placeholder="Araku Valley"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Number of Days
            </label>

            <input
              type="number"
              min="1"
              max="30"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Budget
            </label>

            <input
              type="number"
              min="1"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Interests
            </label>

            <input
              type="text"
              placeholder="nature, waterfalls, food"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 outline-none focus:border-blue-500"
            />

            <p className="mt-2 text-xs text-slate-500">
              Separate interests using commas
            </p>
          </div>

        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-8 w-full rounded-xl bg-blue-600 py-4 font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Generating your trip..." : "Generate AI Trip"}
        </button>

      </motion.form>

      {error && (
        <div className="mx-auto mt-6 max-w-3xl rounded-xl border border-red-800 bg-red-950 p-4 text-red-300">
          {error}
        </div>
      )}

      {trip && <Itinerary trip={trip} />}

    </div>
  );
}