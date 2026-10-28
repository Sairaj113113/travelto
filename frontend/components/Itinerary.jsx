"use client";

import { motion } from "framer-motion";

export default function Itinerary({ trip }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto mt-12 max-w-5xl"
    >

      <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">

        <h2 className="text-4xl font-bold">
          {trip.destination}
        </h2>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-300">
          <span>📅 {trip.days} Days</span>
          <span>💰 Budget: ₹{trip.budget}</span>
          <span>💸 Estimated: ₹{trip.total_estimated_cost}</span>
        </div>

      </div>

      <div className="space-y-8">

        {trip.itinerary.map((day) => (
          <motion.div
            key={day.day}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-3xl border border-slate-800 bg-slate-900 p-8"
          >

            <h3 className="mb-6 text-2xl font-bold">
              Day {day.day}
            </h3>

            <div className="mb-8">
              <h4 className="mb-4 text-lg font-semibold text-blue-400">
                📍 Places
              </h4>

              <div className="grid gap-4 md:grid-cols-2">
                {day.places.map((place, index) => (
                  <div
                    key={index}
                    className="rounded-2xl bg-slate-800 p-5"
                  >
                    <h5 className="text-lg font-semibold">
                      {place.name}
                    </h5>

                    <p className="mt-2 text-sm text-slate-400">
                      {place.description}
                    </p>

                    <p className="mt-3 font-medium text-green-400">
                      ₹{place.estimated_cost}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <h4 className="mb-4 text-lg font-semibold text-orange-400">
                🍴 Food
              </h4>

              <ul className="space-y-2">
                {day.food.map((food, index) => (
                  <li
                    key={index}
                    className="rounded-xl bg-slate-800 p-3 text-slate-300"
                  >
                    {food}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-lg font-semibold text-purple-400">
                🎯 Activities
              </h4>

              <ul className="space-y-2">
                {day.activities.map((activity, index) => (
                  <li
                    key={index}
                    className="rounded-xl bg-slate-800 p-3 text-slate-300"
                  >
                    {activity}
                  </li>
                ))}
              </ul>
            </div>

          </motion.div>
        ))}

      </div>

      <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-8">

        <h3 className="mb-4 text-2xl font-bold">
          💡 Travel Tips
        </h3>

        <ul className="space-y-3">
          {trip.tips.map((tip, index) => (
            <li
              key={index}
              className="rounded-xl bg-slate-800 p-4 text-slate-300"
            >
              {tip}
            </li>
          ))}
        </ul>

      </div>

    </motion.section>
  );
}