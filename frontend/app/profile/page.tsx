"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  User,
  LogOut,
  Plane,
} from "lucide-react";
import AuthenticatedNavbar from "../../components/AuthenticatedNavbar";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type UserData = {
  id: number;
  name: string;
  email: string;
};

export default function ProfilePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const token = localStorage.getItem("travelto_token");

      if (!token) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        localStorage.removeItem("travelto_token");
        localStorage.removeItem("travelto_user");
        window.location.href = "/login";
        return;
      }

      setUser(await response.json());
    } catch {
      const saved = localStorage.getItem("travelto_user");

      if (saved) {
        try {
          setUser(JSON.parse(saved));
        } catch {
          window.location.href = "/login";
        }
      } else {
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("travelto_token");
    localStorage.removeItem("travelto_user");
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner" />
        <p>Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="authenticated-page">
      <AuthenticatedNavbar />

      <main className="profile-page">
        <div className="profile-container">
          <Link href="/dashboard" className="profile-back">
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>

          <div className="profile-heading">
            <p>ACCOUNT</p>
            <h1>Your Profile</h1>
            <span>Manage your Travelto account information.</span>
          </div>

          <section className="profile-card">
            <div className="profile-avatar">
              {user?.name?.charAt(0).toUpperCase() || "T"}
            </div>

            <div className="profile-info">
              <h2>{user?.name || "Traveler"}</h2>

              <div className="profile-detail">
                <User size={17} />
                <div>
                  <span>Name</span>
                  <strong>{user?.name || "Traveler"}</strong>
                </div>
              </div>

              <div className="profile-detail">
                <Mail size={17} />
                <div>
                  <span>Email</span>
                  <strong>{user?.email || "—"}</strong>
                </div>
              </div>
            </div>

            <div className="profile-actions">
              <Link href="/dashboard" className="profile-primary">
                <Plane size={16} />
                Go to Dashboard
              </Link>

              <button
                type="button"
                className="profile-logout"
                onClick={logout}
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
