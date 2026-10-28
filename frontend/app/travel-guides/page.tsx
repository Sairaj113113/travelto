
"use client";

import { useEffect, useState } from "react";
import {
  MapPin,
  Languages,
  IndianRupee,
  Users,
  Plus,
  X,
  Loader2,
  Search,
  ArrowLeft,
  UserRound,
  CheckCircle,
  AlertCircle,
  Edit3,
  Compass,
  Globe,
  Star,
  Clock,
} from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Guide = {
  id: number;
  full_name: string;
  location: string;
  places_covered: string[];
  price_per_day: number;
  languages: string[];
  experience?: string | null;
  about_me?: string | null;
  profile_photo?: string | null;
  is_available: boolean;
  phone?: string | null;
};

type GuideForm = {
  full_name: string;
  phone: string;
  location: string;
  places_covered: string;
  price_per_day: string;
  languages: string;
  experience: string;
  about_me: string;
  profile_photo: string;
  is_available: boolean;
};

const emptyForm: GuideForm = {
  full_name: "",
  phone: "",
  location: "",
  places_covered: "",
  price_per_day: "",
  languages: "",
  experience: "",
  about_me: "",
  profile_photo: "",
  is_available: true,
};

export default function LocalGuidesPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<GuideForm>(emptyForm);
  const [myGuide, setMyGuide] = useState<Guide | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);

  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error">(
    "success"
  );

  useEffect(() => {
    void loadGuides();
    void loadMyGuide();
  }, []);

  function getToken() {
    return localStorage.getItem("travelto_token");
  }

  function showNotice(message: string, type: "success" | "error") {
    setNotice(message);
    setNoticeType(type);
    window.setTimeout(() => setNotice(""), 4000);
  }

  async function loadGuides() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/local-guides`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to fetch local guides.");
      }

      const data = await response.json();
      setGuides(Array.isArray(data.guides) ? data.guides : []);
    } catch (err) {
      console.error("Loading guides failed:", err);
      setError(
        "Unable to load local guides. Please check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadMyGuide() {
    const token = getToken();

    if (!token) {
      setMyGuide(null);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/local-guides/me/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!response.ok) return;

      const data = await response.json();
      setMyGuide(data.is_guide && data.guide ? data.guide : null);
    } catch (err) {
      console.error("Loading your guide profile failed:", err);
    }
  }

  function openRegistration() {
    const token = getToken();

    if (!token) {
      showNotice("Please log in before registering as a guide.", "error");
      return;
    }

    if (myGuide) {
      setForm({
        full_name: myGuide.full_name || "",
        phone: myGuide.phone || "",
        location: myGuide.location || "",
        places_covered: (myGuide.places_covered || []).join(", "),
        price_per_day: String(myGuide.price_per_day ?? ""),
        languages: (myGuide.languages || []).join(", "),
        experience: myGuide.experience || "",
        about_me: myGuide.about_me || "",
        profile_photo: myGuide.profile_photo || "",
        is_available: myGuide.is_available,
      });
      setEditing(true);
    } else {
      setForm(emptyForm);
      setEditing(false);
    }

    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
  }

  function updateField<K extends keyof GuideForm>(
    field: K,
    value: GuideForm[K]
  ) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getToken();

    if (!token) {
      showNotice("Please log in again before saving your profile.", "error");
      return;
    }

    const places = form.places_covered
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const languages = form.languages
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!places.length || !languages.length) {
      showNotice(
        "Enter at least one tourist place and one language.",
        "error"
      );
      return;
    }

    const price = Number(form.price_per_day);

    if (!Number.isFinite(price) || price < 0) {
      showNotice("Enter a valid daily price.", "error");
      return;
    }

    const payload = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      location: form.location.trim(),
      places_covered: places,
      price_per_day: price,
      languages,
      experience: form.experience.trim() || null,
      about_me: form.about_me.trim() || null,
      profile_photo: form.profile_photo.trim() || null,
      is_available: form.is_available,
    };

    setSaving(true);

    try {
      const response = await fetch(
        editing ? `${API_URL}/local-guides/me` : `${API_URL}/local-guides`,
        {
          method: editing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Unable to save your guide profile.");
      }

      showNotice(
        editing
          ? "Your guide profile was updated successfully!"
          : "Congratulations! You are now registered as a local guide!",
        "success"
      );

      setShowForm(false);
      await Promise.all([loadGuides(), loadMyGuide()]);
    } catch (err) {
      showNotice(
        err instanceof Error ? err.message : "Something went wrong.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredGuides = guides.filter((guide) => {
    const query = search.toLowerCase().trim();
    if (!query) return true;

    return [
      guide.full_name,
      guide.location,
      ...(guide.places_covered || []),
      ...(guide.languages || []),
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  return (
    <main className="lg-page">
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        .lg-page {
          min-height: 100vh;
          background: #f6f8fb;
          color: #172033;
          font-family: Arial, Helvetica, sans-serif;
        }

        .lg-page button,
        .lg-page input,
        .lg-page textarea {
          font: inherit;
        }

        .lg-page button {
          cursor: pointer;
        }

        .lg-page button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .lg-container {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
        }

        .lg-header {
          position: sticky;
          top: 0;
          z-index: 20;
          background: rgba(255, 255, 255, 0.96);
          border-bottom: 1px solid #e4eaf0;
          backdrop-filter: blur(14px);
        }

        .lg-nav {
          min-height: 76px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .lg-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 0;
          background: transparent;
          color: #526174;
          font-size: 14px;
          font-weight: 600;
        }

        .lg-back:hover {
          color: #0f766e;
        }

        .lg-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 19px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .lg-brand-icon {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 13px;
          background: #0f766e;
          color: white;
        }

        .lg-brand-accent {
          color: #0f766e;
        }

        .lg-primary,
        .lg-secondary,
        .lg-white-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 44px;
          padding: 11px 17px;
          border-radius: 12px;
          border: 1px solid transparent;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
          transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
        }

        .lg-primary {
          color: #fff;
          background: #0f766e;
          box-shadow: 0 5px 12px rgba(15, 118, 110, 0.12);
        }

        .lg-primary:hover {
          background: #115e59;
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(15, 118, 110, 0.2);
        }

        .lg-secondary {
          background: #e7f5f2;
          color: #0f766e;
        }

        .lg-secondary:hover {
          background: #d3eee8;
        }

        .lg-hero {
          position: relative;
          overflow: hidden;
          background: linear-gradient(125deg, #082f36, #0f766e 58%, #16866e);
          color: #fff;
        }

        .lg-hero::before,
        .lg-hero::after {
          content: "";
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        .lg-hero::before {
          width: 440px;
          height: 440px;
          right: -120px;
          top: -240px;
          background: rgba(255, 255, 255, 0.07);
        }

        .lg-hero::after {
          width: 340px;
          height: 340px;
          right: 20%;
          bottom: -260px;
          background: rgba(153, 246, 228, 0.08);
        }

        .lg-hero-content {
          position: relative;
          z-index: 1;
          padding: 82px 0 74px;
          max-width: 790px;
        }

        .lg-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 13px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
          color: #e0f2f1;
          font-size: 13px;
          font-weight: 600;
        }

        .lg-hero h1 {
          margin: 25px 0 0;
          font-size: clamp(38px, 5.5vw, 64px);
          line-height: 1.08;
          letter-spacing: -2.5px;
          font-weight: 850;
        }

        .lg-hero h1 span {
          color: #99f6e4;
        }

        .lg-hero-copy {
          max-width: 680px;
          margin: 22px 0 0;
          color: #d7f4ee;
          font-size: 17px;
          line-height: 1.85;
        }

        .lg-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 29px;
        }

        .lg-white-btn {
          color: #115e59;
          background: white;
          padding: 13px 20px;
        }

        .lg-white-btn:hover {
          background: #ecfdf5;
          transform: translateY(-1px);
        }

        .lg-outline-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
          padding: 12px 20px;
          border: 1px solid rgba(255, 255, 255, 0.45);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.06);
          color: white;
          font-size: 14px;
          font-weight: 700;
        }

        .lg-outline-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .lg-benefits {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
          margin-top: 31px;
          color: #e1f5f0;
          font-size: 13px;
        }

        .lg-benefit {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .lg-join-wrap {
          padding-top: 30px;
        }

        .lg-join-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 25px 28px;
          border: 1px solid #ccebe5;
          border-radius: 20px;
          background: linear-gradient(110deg, #eaf9f6, #f3fbf8);
        }

        .lg-join-copy {
          display: flex;
          align-items: center;
          gap: 17px;
        }

        .lg-join-icon {
          flex-shrink: 0;
          display: grid;
          place-items: center;
          width: 54px;
          height: 54px;
          border-radius: 16px;
          background: #0f766e;
          color: white;
        }

        .lg-join-card h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.4px;
        }

        .lg-join-card p {
          max-width: 650px;
          margin: 8px 0 0;
          color: #5b6878;
          font-size: 14px;
          line-height: 1.7;
        }

        .lg-guides-section {
          padding: 78px 0 88px;
        }

        .lg-section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 25px;
        }

        .lg-section-label {
          color: #0f766e;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .lg-section-heading h2 {
          margin: 10px 0 0;
          color: #172033;
          font-size: clamp(28px, 3.5vw, 39px);
          font-weight: 850;
          letter-spacing: -1.4px;
        }

        .lg-section-heading p {
          margin: 10px 0 0;
          color: #64748b;
          font-size: 15px;
          line-height: 1.6;
        }

        .lg-search {
          position: relative;
          width: min(360px, 100%);
          flex-shrink: 0;
        }

        .lg-search svg {
          position: absolute;
          top: 50%;
          left: 15px;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }

        .lg-search input {
          width: 100%;
          min-height: 49px;
          padding: 12px 15px 12px 44px;
          border: 1px solid #dbe3ec;
          border-radius: 13px;
          background: white;
          color: #172033;
          font-size: 14px;
          outline: none;
        }

        .lg-search input:focus,
        .lg-field input:focus,
        .lg-field textarea:focus {
          border-color: #0d9488;
          box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.11);
        }

        .lg-result-count {
          margin: 30px 0 16px;
          color: #64748b;
          font-size: 13px;
        }

        .lg-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
        }

        .lg-guide-card {
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          background: white;
          box-shadow: 0 4px 15px rgba(15, 23, 42, 0.025);
          transition: transform 0.22s, box-shadow 0.22s;
        }

        .lg-guide-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.09);
        }

        .lg-guide-cover {
          position: relative;
          display: grid;
          place-items: center;
          height: 170px;
          overflow: hidden;
          background: linear-gradient(130deg, #0f766e, #34a78a);
          color: white;
        }

        .lg-guide-cover img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .lg-guide-cover::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(0deg, rgba(0, 0, 0, 0.28), transparent 65%);
          pointer-events: none;
        }

        .lg-guide-badge {
          position: absolute;
          z-index: 1;
          left: 14px;
          bottom: 13px;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.96);
          color: #0f766e;
          font-size: 11px;
          font-weight: 800;
        }

        .lg-guide-content {
          padding: 21px;
        }

        .lg-guide-content h3 {
          margin: 0;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .lg-guide-location {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 9px;
          color: #64748b;
          font-size: 13px;
        }

        .lg-mini-label {
          margin: 22px 0 10px;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.2px;
          text-transform: uppercase;
        }

        .lg-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .lg-chip {
          padding: 7px 10px;
          border-radius: 999px;
          background: #f1f5f9;
          color: #475569;
          font-size: 11px;
          font-weight: 600;
        }

        .lg-languages {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-top: 17px;
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
        }

        .lg-price-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 21px;
          padding-top: 17px;
          border-top: 1px solid #edf1f5;
        }

        .lg-price-label {
          color: #94a3b8;
          font-size: 11px;
        }

        .lg-price {
          display: flex;
          align-items: center;
          margin-top: 5px;
          color: #0f766e;
          font-size: 22px;
          font-weight: 850;
          letter-spacing: -0.5px;
        }

        .lg-empty {
          margin-top: 26px;
          padding: 60px 25px;
          border: 1px dashed #cbd5e1;
          border-radius: 22px;
          background: white;
          text-align: center;
        }

        .lg-empty-icon {
          display: grid;
          place-items: center;
          width: 68px;
          height: 68px;
          margin: 0 auto;
          border-radius: 50%;
          background: #e8f7f3;
          color: #0f766e;
        }

        .lg-empty h3 {
          margin: 20px 0 0;
          font-size: 22px;
          font-weight: 800;
        }

        .lg-empty p {
          max-width: 490px;
          margin: 10px auto 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.7;
        }

        .lg-empty button {
          margin-top: 22px;
        }

        .lg-loading {
          display: flex;
          min-height: 260px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          color: #64748b;
          font-size: 14px;
        }

        .lg-spinner {
          animation: lg-spin 1s linear infinite;
          color: #0f766e;
        }

        @keyframes lg-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .lg-error {
          margin-top: 30px;
          padding: 28px;
          border: 1px solid #fecaca;
          border-radius: 18px;
          background: #fff7f7;
          color: #991b1b;
          text-align: center;
        }

        .lg-error button {
          margin-top: 16px;
          border: 0;
          border-radius: 10px;
          padding: 10px 17px;
          background: #dc2626;
          color: white;
          font-weight: 700;
        }

        .lg-footer {
          padding: 25px 20px;
          border-top: 1px solid #e2e8f0;
          background: white;
          color: #94a3b8;
          text-align: center;
          font-size: 13px;
        }

        .lg-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          overflow-y: auto;
          padding: 22px 15px;
          background: rgba(8, 22, 36, 0.67);
          backdrop-filter: blur(5px);
        }

        .lg-modal {
          width: 100%;
          max-width: 680px;
          margin: auto 0;
          overflow: hidden;
          border-radius: 23px;
          background: white;
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.25);
        }

        .lg-modal-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 23px 26px;
          background: #115e59;
          color: white;
        }

        .lg-modal-head p {
          margin: 0;
          color: #b9eee4;
          font-size: 12px;
        }

        .lg-modal-head h2 {
          margin: 6px 0 0;
          font-size: 21px;
          font-weight: 800;
        }

        .lg-icon-button {
          display: grid;
          flex-shrink: 0;
          place-items: center;
          width: 38px;
          height: 38px;
          border: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.12);
          color: white;
        }

        .lg-icon-button:hover {
          background: rgba(255, 255, 255, 0.23);
        }

        .lg-form {
          padding: 26px;
        }

        .lg-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 19px;
        }

        .lg-field.full {
          grid-column: 1 / -1;
        }

        .lg-field label {
          display: block;
          margin-bottom: 8px;
          color: #334155;
          font-size: 12px;
          font-weight: 800;
        }

        .lg-field input,
        .lg-field textarea {
          display: block;
          width: 100%;
          padding: 12px 13px;
          border: 1px solid #dbe3ec;
          border-radius: 11px;
          background: white;
          color: #172033;
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .lg-field textarea {
          min-height: 105px;
          resize: vertical;
          line-height: 1.6;
        }

        .lg-help {
          margin: 6px 0 0;
          color: #94a3b8;
          font-size: 11px;
          line-height: 1.5;
        }

        .lg-availability {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-top: 22px;
          padding: 16px;
          border-radius: 13px;
          background: #f1f8f6;
        }

        .lg-availability input {
          width: 17px;
          height: 17px;
          margin-top: 3px;
          accent-color: #0f766e;
        }

        .lg-availability strong {
          display: block;
          color: #334155;
          font-size: 13px;
        }

        .lg-availability p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 11px;
          line-height: 1.6;
        }

        .lg-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #edf1f5;
        }

        .lg-cancel {
          min-height: 43px;
          padding: 10px 17px;
          border: 1px solid #dbe3ec;
          border-radius: 11px;
          background: white;
          color: #475569;
          font-size: 13px;
          font-weight: 700;
        }

        .lg-cancel:hover {
          background: #f8fafc;
        }

        .lg-details-modal {
          width: 100%;
          max-width: 510px;
          margin: auto 0;
          overflow: hidden;
          border-radius: 23px;
          background: white;
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.25);
        }

        .lg-details-cover {
          position: relative;
          display: grid;
          place-items: center;
          height: 185px;
          overflow: hidden;
          background: linear-gradient(130deg, #115e59, #34a78a);
          color: white;
        }

        .lg-details-cover img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .lg-details-close {
          position: absolute;
          top: 15px;
          right: 15px;
          z-index: 2;
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          border: 0;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.28);
          color: white;
        }

        .lg-details-content {
          padding: 25px;
        }

        .lg-details-content h2 {
          margin: 0;
          font-size: 25px;
          font-weight: 850;
          letter-spacing: -0.7px;
        }

        .lg-details-block {
          margin-top: 22px;
        }

        .lg-details-block h3 {
          margin: 0;
          color: #334155;
          font-size: 13px;
          font-weight: 800;
        }

        .lg-details-block p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.8;
          white-space: pre-wrap;
        }

        .lg-details-price {
          margin-top: 23px;
          padding: 17px;
          border-radius: 14px;
          background: #eaf8f4;
        }

        .lg-details-price span {
          color: #64748b;
          font-size: 12px;
        }

        .lg-details-price strong {
          display: flex;
          align-items: center;
          margin-top: 5px;
          color: #0f766e;
          font-size: 26px;
        }

        .lg-details-note {
          margin: 15px 0 0;
          color: #94a3b8;
          font-size: 11px;
          line-height: 1.6;
        }

        .lg-notice {
          position: fixed;
          right: 20px;
          bottom: 20px;
          z-index: 70;
          display: flex;
          align-items: flex-start;
          gap: 11px;
          max-width: min(420px, calc(100% - 40px));
          padding: 16px;
          border: 1px solid #bbf7d0;
          border-radius: 14px;
          background: white;
          box-shadow: 0 14px 45px rgba(15, 23, 42, 0.16);
          color: #166534;
          font-size: 13px;
          font-weight: 600;
          line-height: 1.6;
        }

        .lg-notice.error {
          border-color: #fecaca;
          color: #b91c1c;
        }

        .lg-notice-message {
          flex: 1;
        }

        .lg-notice-dismiss {
          border: 0;
          background: transparent;
          color: inherit;
        }

        @media (max-width: 900px) {
          .lg-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .lg-section-heading {
            align-items: stretch;
            flex-direction: column;
          }

          .lg-search {
            width: 100%;
            max-width: 460px;
          }

          .lg-join-card {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 600px) {
          .lg-container {
            width: calc(100% - 30px);
          }

          .lg-nav {
            min-height: 66px;
            gap: 9px;
          }

          .lg-brand {
            gap: 7px;
            font-size: 14px;
          }

          .lg-brand-icon {
            width: 34px;
            height: 34px;
            border-radius: 10px;
          }

          .lg-back {
            font-size: 12px;
          }

          .lg-nav > .lg-primary {
            min-height: 38px;
            padding: 9px;
            font-size: 12px;
          }

          .lg-hero-content {
            padding: 59px 0 53px;
          }

          .lg-hero h1 {
            font-size: 39px;
            letter-spacing: -1.5px;
          }

          .lg-hero-copy {
            font-size: 14px;
            line-height: 1.8;
          }

          .lg-benefits {
            gap: 14px;
            flex-direction: column;
          }

          .lg-join-card {
            padding: 19px;
          }

          .lg-join-copy {
            align-items: flex-start;
            gap: 12px;
          }

          .lg-join-icon {
            width: 43px;
            height: 43px;
            border-radius: 12px;
          }

          .lg-join-card h2 {
            font-size: 17px;
          }

          .lg-join-card p {
            font-size: 12px;
          }

          .lg-guides-section {
            padding: 55px 0 60px;
          }

          .lg-grid {
            grid-template-columns: minmax(0, 1fr);
            gap: 17px;
          }

          .lg-guide-cover {
            height: 185px;
          }

          .lg-form {
            padding: 19px;
          }

          .lg-modal-head {
            padding: 19px;
          }

          .lg-form-grid {
            grid-template-columns: minmax(0, 1fr);
            gap: 17px;
          }

          .lg-field.full {
            grid-column: auto;
          }

          .lg-form-actions {
            flex-direction: column-reverse;
          }

          .lg-form-actions button {
            width: 100%;
          }

          .lg-details-content {
            padding: 20px;
          }
        }
      `}</style>

      <header className="lg-header">
        <div className="lg-container lg-nav">
          <button
            onClick={() => window.history.back()}
            className="lg-back"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>

          <div className="lg-brand">
            <span className="lg-brand-icon">
              <Compass size={21} />
            </span>
            <span>
              Travelto <span className="lg-brand-accent">Local Guides</span>
            </span>
          </div>

          <button onClick={openRegistration} className="lg-primary">
            {myGuide ? <Edit3 size={16} /> : <Plus size={17} />}
            <span className="lg-desktop-label">
              {myGuide ? "Edit My Profile" : "Become a Guide"}
            </span>
            <span className="lg-mobile-label">
              {myGuide ? "Edit" : "Join"}
            </span>
          </button>
        </div>
      </header>

      <section className="lg-hero">
        <div className="lg-container">
          <div className="lg-hero-content">
            <div className="lg-eyebrow">
              <MapPin size={15} />
              Discover places with local experts
            </div>

            <h1>
              Explore like a local.
              <br />
              <span>Travel like a pro.</span>
            </h1>

            <p className="lg-hero-copy">
              Discover amazing places with people who know them best.
              Find local guides, explore hidden gems, and experience
              destinations beyond the usual tourist spots.
            </p>

            <div className="lg-hero-actions">
              <a href="#available-guides" className="lg-white-btn">
                Explore Guides
              </a>
              <button
                onClick={openRegistration}
                className="lg-outline-btn"
              >
                Become a Local Guide
              </button>
            </div>

            <div className="lg-benefits">
              <div className="lg-benefit">
                <CheckCircle size={17} />
                Local knowledge
              </div>
              <div className="lg-benefit">
                <CheckCircle size={17} />
                Transparent daily prices
              </div>
              <div className="lg-benefit">
                <CheckCircle size={17} />
                Explore at your pace
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lg-container lg-join-wrap">
        <div className="lg-join-card">
          <div className="lg-join-copy">
            <div className="lg-join-icon">
              <Users size={25} />
            </div>
            <div>
              <h2>
                {myGuide
                  ? "Your Local Guide Profile"
                  : "Know your city inside out?"}
              </h2>
              <p>
                {myGuide
                  ? `Your profile is registered for ${myGuide.location}. Update your details or change your availability anytime.`
                  : "Share your local knowledge, help travelers discover amazing places, and set your own price per day."}
              </p>
            </div>
          </div>

          <button onClick={openRegistration} className="lg-primary">
            {myGuide ? "Edit My Profile" : "Register as a Guide"}
          </button>
        </div>
      </section>

      <section id="available-guides" className="lg-container lg-guides-section">
        <div className="lg-section-heading">
          <div>
            <div className="lg-section-label">Meet the locals</div>
            <h2>Available Local Guides</h2>
            <p>Find the right guide for your next adventure.</p>
          </div>

          <div className="lg-search">
            <Search size={19} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search city, guide or place..."
              aria-label="Search local guides"
            />
          </div>
        </div>

        {loading ? (
          <div className="lg-loading">
            <Loader2 size={34} className="lg-spinner" />
            <span>Finding available local guides...</span>
          </div>
        ) : error ? (
          <div className="lg-error">
            <AlertCircle size={30} style={{ margin: "0 auto 12px" }} />
            <p>{error}</p>
            <button onClick={() => void loadGuides()}>Try Again</button>
          </div>
        ) : filteredGuides.length === 0 ? (
          <div className="lg-empty">
            <div className="lg-empty-icon">
              {search ? <Search size={28} /> : <MapPin size={30} />}
            </div>
            <h3>
              {search ? "No matching guides found" : "No guides available yet"}
            </h3>
            <p>
              {search
                ? "Try searching for another location, tourist attraction or language."
                : "Be one of the first local guides on Travelto. Register your profile to help travelers explore your city."}
            </p>
            {!search && (
              <button onClick={openRegistration} className="lg-primary">
                Become the First Guide
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="lg-result-count">
              {filteredGuides.length}{" "}
              {filteredGuides.length === 1 ? "guide" : "guides"} found
            </div>

            <div className="lg-grid">
              {filteredGuides.map((guide) => (
                <article key={guide.id} className="lg-guide-card">
                  <div className="lg-guide-cover">
                    {guide.profile_photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={guide.profile_photo} alt={guide.full_name} />
                    ) : (
                      <UserRound size={62} />
                    )}
                    <div className="lg-guide-badge">Local Expert</div>
                  </div>

                  <div className="lg-guide-content">
                    <h3>{guide.full_name}</h3>

                    <div className="lg-guide-location">
                      <MapPin size={16} />
                      {guide.location}
                    </div>

                    <div className="lg-mini-label">Places covered</div>
                    <div className="lg-chips">
                      {(guide.places_covered || [])
                        .slice(0, 3)
                        .map((place) => (
                          <span className="lg-chip" key={place}>
                            {place}
                          </span>
                        ))}
                      {(guide.places_covered || []).length > 3 && (
                        <span className="lg-chip">
                          +{guide.places_covered.length - 3} more
                        </span>
                      )}
                    </div>

                    <div className="lg-languages">
                      <Languages
                        size={17}
                        style={{ flexShrink: 0, color: "#0f766e" }}
                      />
                      <span>
                        {(guide.languages || []).join(", ") ||
                          "Languages not specified"}
                      </span>
                    </div>

                    <div className="lg-price-row">
                      <div>
                        <div className="lg-price-label">Price per day</div>
                        <div className="lg-price">
                          <IndianRupee size={19} />
                          {Number(guide.price_per_day).toLocaleString("en-IN")}
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedGuide(guide)}
                        className="lg-secondary"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <footer className="lg-footer">
        Explore more. Discover locally. Travel with Travelto.
      </footer>

      {showForm && (
        <div
          className="lg-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <div className="lg-modal">
            <div className="lg-modal-head">
              <div>
                <p>Travelto Local Guides</p>
                <h2>
                  {editing ? "Edit Your Guide Profile" : "Become a Local Guide"}
                </h2>
              </div>

              <button
                onClick={closeForm}
                disabled={saving}
                className="lg-icon-button"
                aria-label="Close form"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={submitForm} className="lg-form">
              <div className="lg-form-grid">
                <div className="lg-field">
                  <label>Full Name *</label>
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    value={form.full_name}
                    onChange={(e) => updateField("full_name", e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="lg-field">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    maxLength={20}
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="Your contact number"
                  />
                  <p className="lg-help">
                    Your phone number is not displayed publicly.
                  </p>
                </div>

                <div className="lg-field">
                  <label>City / Location *</label>
                  <input
                    required
                    minLength={2}
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    placeholder="e.g. Araku Valley"
                  />
                </div>

                <div className="lg-field">
                  <label>Price Per Day (₹) *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    max="1000000"
                    step="0.01"
                    value={form.price_per_day}
                    onChange={(e) =>
                      updateField("price_per_day", e.target.value)
                    }
                    placeholder="e.g. 1000"
                  />
                </div>

                <div className="lg-field full">
                  <label>Tourist Places Covered *</label>
                  <input
                    required
                    value={form.places_covered}
                    onChange={(e) =>
                      updateField("places_covered", e.target.value)
                    }
                    placeholder="Charminar, Golconda Fort, Hussain Sagar"
                  />
                  <p className="lg-help">Separate places with commas.</p>
                </div>

                <div className="lg-field full">
                  <label>Languages Spoken *</label>
                  <input
                    required
                    value={form.languages}
                    onChange={(e) => updateField("languages", e.target.value)}
                    placeholder="Telugu, English, Hindi"
                  />
                  <p className="lg-help">Separate languages with commas.</p>
                </div>

                <div className="lg-field full">
                  <label>Experience</label>
                  <input
                    value={form.experience}
                    onChange={(e) => updateField("experience", e.target.value)}
                    placeholder="e.g. 2 years of local guiding experience"
                  />
                </div>

                <div className="lg-field full">
                  <label>About Me</label>
                  <textarea
                    maxLength={1500}
                    value={form.about_me}
                    onChange={(e) => updateField("about_me", e.target.value)}
                    placeholder="Tell travelers about yourself and what makes your tours special..."
                  />
                </div>

                <div className="lg-field full">
                  <label>Profile Photo URL (Optional)</label>
                  <input
                    type="url"
                    value={form.profile_photo}
                    onChange={(e) =>
                      updateField("profile_photo", e.target.value)
                    }
                    placeholder="https://example.com/your-photo.jpg"
                  />
                </div>
              </div>

              <label className="lg-availability">
                <input
                  type="checkbox"
                  checked={form.is_available}
                  onChange={(e) =>
                    updateField("is_available", e.target.checked)
                  }
                />
                <span>
                  <strong>Available for guiding</strong>
                  <p>
                    When enabled, your profile appears in the available guides
                    list. Turn this off whenever you are unavailable.
                  </p>
                </span>
              </label>

              <div className="lg-form-actions">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="lg-cancel"
                >
                  Cancel
                </button>

                <button type="submit" disabled={saving} className="lg-primary">
                  {saving && <Loader2 size={17} className="lg-spinner" />}
                  {saving
                    ? "Saving..."
                    : editing
                      ? "Update Profile"
                      : "Register as a Guide"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedGuide && (
        <div
          className="lg-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedGuide(null);
          }}
        >
          <div className="lg-details-modal">
            <div className="lg-details-cover">
              {selectedGuide.profile_photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedGuide.profile_photo}
                  alt={selectedGuide.full_name}
                />
              ) : (
                <UserRound size={76} />
              )}

              <button
                onClick={() => setSelectedGuide(null)}
                className="lg-details-close"
                aria-label="Close details"
              >
                <X size={21} />
              </button>
            </div>

            <div className="lg-details-content">
              <h2>{selectedGuide.full_name}</h2>

              <div className="lg-guide-location">
                <MapPin size={17} />
                {selectedGuide.location}
              </div>

              {selectedGuide.about_me && (
                <div className="lg-details-block">
                  <h3>About the Guide</h3>
                  <p>{selectedGuide.about_me}</p>
                </div>
              )}

              {selectedGuide.experience && (
                <div className="lg-details-block">
                  <h3>Experience</h3>
                  <p>{selectedGuide.experience}</p>
                </div>
              )}

              <div className="lg-details-block">
                <h3>Places Covered</h3>
                <div className="lg-chips" style={{ marginTop: 10 }}>
                  {(selectedGuide.places_covered || []).map((place) => (
                    <span key={place} className="lg-chip">
                      {place}
                    </span>
                  ))}
                </div>
              </div>

              <div className="lg-details-block">
                <h3>Languages</h3>
                <p>
                  <Languages
                    size={16}
                    style={{
                      display: "inline",
                      verticalAlign: "middle",
                      marginRight: 7,
                    }}
                  />
                  {(selectedGuide.languages || []).join(", ")}
                </p>
              </div>

              <div className="lg-details-price">
                <span>Guide price per day</span>
                <strong>
                  <IndianRupee size={23} />
                  {Number(selectedGuide.price_per_day).toLocaleString("en-IN")}
                </strong>
              </div>

              <p className="lg-details-note">
                Contact details are not displayed publicly. Booking and contact
                functionality can be added separately.
              </p>

              <button
                onClick={() => setSelectedGuide(null)}
                className="lg-primary"
                style={{ width: "100%", marginTop: 18 }}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className={`lg-notice ${noticeType === "error" ? "error" : ""}`}
        >
          {noticeType === "success" ? (
            <CheckCircle size={20} />
          ) : (
            <AlertCircle size={20} />
          )}

          <span className="lg-notice-message">{notice}</span>

          <button
            onClick={() => setNotice("")}
            className="lg-notice-dismiss"
            aria-label="Dismiss notification"
          >
            <X size={17} />
          </button>
        </div>
      )}
    </main>
  );
}
