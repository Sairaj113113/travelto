
"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import Link from "next/link";
import {
  Plane,
  ArrowLeft,
  Images,
  Upload,
  Camera,
  Download,
  Trash2,
  X,
  Search,
  Plus,
  Sparkles,
  MapPin,
  CalendarDays,
  ImagePlus,
  ChevronLeft,
  ChevronRight,
  FolderHeart,
  CloudUpload,
  Heart,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const STORAGE_KEY = "travelto_memories_v1";

type MemoryPhoto = {
  id: string;
  name: string;
  dataUrl: string;
  album: string;
  uploadedAt: string;
  size: number;
  favorite: boolean;
};

const DEFAULT_ALBUM = "My Travel Memories";

export default function MemoriesPage() {
  const [photos, setPhotos] = useState<MemoryPhoto[]>([]);
  const [album, setAlbum] = useState(DEFAULT_ALBUM);
  const [search, setSearch] = useState("");
  const [selectedPhoto, setSelectedPhoto] =
    useState<MemoryPhoto | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showAlbumForm, setShowAlbumForm] = useState(false);
  const [newAlbum, setNewAlbum] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] =
    useState<"success" | "error">("success");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setPhotos(parsed);
        }
      }
    } catch (error) {
      console.error("Unable to load saved memories:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
      } catch {
        showNotice(
          "Browser storage is full. Download your photos and remove some large images.",
          "error"
        );
      }
    }
  }, [photos, loading]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function showNotice(
    message: string,
    type: "success" | "error" = "success"
  ) {
    setNotice(message);
    setNoticeType(type);
  }

  const albums = Array.from(
    new Set(photos.map((photo) => photo.album))
  );

  const filteredPhotos = photos.filter((photo) => {
    const matchesAlbum = photo.album === album;
    const matchesSearch = photo.name
      .toLowerCase()
      .includes(search.toLowerCase().trim());

    const matchesFavorite = !favoritesOnly || photo.favorite;

    return matchesAlbum && matchesSearch && matchesFavorite;
  });

  const totalSize = photos.reduce(
    (total, photo) => total + photo.size,
    0
  );

  function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function createId() {
    return `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;

    if (files) {
      void addPhotos(Array.from(files));
    }

    // Allows selecting the same photo again if needed.
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);

    const files = Array.from(event.dataTransfer.files);
    void addPhotos(files);
  }

  async function addPhotos(files: File[]) {
    const imageFiles = files.filter((file) =>
      file.type.startsWith("image/")
    );

    if (!imageFiles.length) {
      showNotice("Please select image files such as JPG, PNG or WEBP.", "error");
      return;
    }

    const invalidFiles = imageFiles.filter(
      (file) => file.size > 5 * 1024 * 1024
    );

    if (invalidFiles.length) {
      showNotice(
        "Each photo must be 5 MB or smaller. Please choose smaller images.",
        "error"
      );
      return;
    }

    const currentCount = photos.length;

    if (currentCount + imageFiles.length > 100) {
      showNotice("You can save up to 100 photos in this browser gallery.", "error");
      return;
    }

    setUploading(true);

    try {
      const converted = await Promise.all(
        imageFiles.map(
          (file) =>
            new Promise<MemoryPhoto>((resolve, reject) => {
              const reader = new FileReader();

              reader.onload = () => {
                if (typeof reader.result !== "string") {
                  reject(new Error("Unable to read image."));
                  return;
                }

                resolve({
                  id: createId(),
                  name: file.name,
                  dataUrl: reader.result,
                  album,
                  uploadedAt: new Date().toISOString(),
                  size: file.size,
                  favorite: false,
                });
              };

              reader.onerror = () =>
                reject(new Error(`Unable to read ${file.name}`));

              reader.readAsDataURL(file);
            })
        )
      );

      setPhotos((previous) => [...converted, ...previous]);

      showNotice(
        `${converted.length} photo${converted.length === 1 ? "" : "s"} added to ${album}.`
      );
    } catch (error) {
      console.error("Photo upload failed:", error);
      showNotice("Unable to process your photos. Please try again.", "error");
    } finally {
      setUploading(false);
    }
  }

  function downloadPhoto(photo: MemoryPhoto) {
    const link = document.createElement("a");

    link.href = photo.dataUrl;
    link.download = photo.name || "travel-memory.jpg";

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function downloadAlbum() {
    if (!filteredPhotos.length) {
      showNotice("There are no photos to download.", "error");
      return;
    }

    // Downloading multiple files may trigger the browser's
    // multiple-download permission prompt.
    for (let index = 0; index < filteredPhotos.length; index++) {
      downloadPhoto(filteredPhotos[index]);

      // Give the browser a short interval between downloads.
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    showNotice(
      `Started downloading ${filteredPhotos.length} photo(s). Check your Downloads folder.`
    );
  }

  function deletePhoto(id: string) {
    const photo = photos.find((item) => item.id === id);

    if (!photo) return;

    const confirmed = window.confirm(
      `Delete "${photo.name}" from your memories?`
    );

    if (!confirmed) return;

    setPhotos((previous) => previous.filter((item) => item.id !== id));

    if (selectedPhoto?.id === id) {
      setSelectedPhoto(null);
    }

    showNotice("Photo removed from your gallery.");
  }

  function toggleFavorite(id: string) {
    setPhotos((previous) =>
      previous.map((photo) =>
        photo.id === id
          ? { ...photo, favorite: !photo.favorite }
          : photo
      )
    );

    if (selectedPhoto?.id === id) {
      setSelectedPhoto((previous) =>
        previous
          ? { ...previous, favorite: !previous.favorite }
          : null
      );
    }
  }

  function createAlbum(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = newAlbum.trim();

    if (!name) return;

    if (albums.some((item) => item.toLowerCase() === name.toLowerCase())) {
      showNotice("An album with that name already exists.", "error");
      return;
    }

    setAlbum(name);
    setNewAlbum("");
    setShowAlbumForm(false);
    setFavoritesOnly(false);
    showNotice(`Album "${name}" is ready. Upload photos to add memories.`);
  }

  function movePhoto(direction: number) {
    if (!selectedPhoto) return;

    const currentIndex = filteredPhotos.findIndex(
      (photo) => photo.id === selectedPhoto.id
    );

    if (currentIndex === -1 || filteredPhotos.length < 2) return;

    const nextIndex =
      (currentIndex + direction + filteredPhotos.length) %
      filteredPhotos.length;

    setSelectedPhoto(filteredPhotos[nextIndex]);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!selectedPhoto) return;

      if (event.key === "Escape") setSelectedPhoto(null);
      if (event.key === "ArrowRight") movePhoto(1);
      if (event.key === "ArrowLeft") movePhoto(-1);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPhoto, filteredPhotos]);

  return (
    <main className="memory-page">
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        .memory-page {
          min-height: 100vh;
          background: #f7f9fc;
          color: #172033;
          font-family: Arial, Helvetica, sans-serif;
        }

        .memory-page button,
        .memory-page input {
          font: inherit;
        }

        .memory-page button {
          cursor: pointer;
        }

        .memory-page button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .memory-container {
          width: min(1200px, calc(100% - 40px));
          margin: 0 auto;
        }

        .memory-navbar {
          position: sticky;
          top: 0;
          z-index: 15;
          border-bottom: 1px solid #e8edf3;
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(12px);
        }

        .memory-nav-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 74px;
          gap: 20px;
        }

        .memory-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #172033;
          text-decoration: none;
          font-size: 21px;
          font-weight: 850;
          letter-spacing: -0.6px;
        }

        .memory-brand-icon {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: #0f766e;
          color: white;
        }

        .memory-brand span:last-child span {
          color: #0f766e;
        }

        .memory-nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .memory-back {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 0;
          background: transparent;
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
        }

        .memory-back:hover {
          color: #0f766e;
        }

        .memory-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 43px;
          padding: 11px 16px;
          border: 1px solid transparent;
          border-radius: 12px;
          background: #0f766e;
          color: white;
          font-size: 13px;
          font-weight: 750;
          text-decoration: none;
          transition: 0.2s ease;
        }

        .memory-btn:hover {
          background: #115e59;
          transform: translateY(-1px);
        }

        .memory-btn-light {
          background: white;
          border-color: #dce5ed;
          color: #334155;
        }

        .memory-btn-light:hover {
          background: #f1f5f9;
          color: #0f766e;
        }

        .memory-hero {
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 85% 20%,
              rgba(153, 246, 228, 0.18),
              transparent 27%
            ),
            linear-gradient(125deg, #082f36, #0f766e 62%, #16866e);
          color: white;
        }

        .memory-hero::after {
          content: "";
          position: absolute;
          right: -90px;
          bottom: -260px;
          width: 520px;
          height: 520px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 50%;
          box-shadow:
            0 0 0 45px rgba(255, 255, 255, 0.025),
            0 0 0 95px rgba(255, 255, 255, 0.025);
          pointer-events: none;
        }

        .memory-hero-content {
          position: relative;
          z-index: 1;
          padding: 68px 0 62px;
        }

        .memory-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 12px;
          border: 1px solid rgba(255, 255, 255, 0.23);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.09);
          color: #d1fae5;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.6px;
        }

        .memory-hero h1 {
          margin: 23px 0 0;
          max-width: 760px;
          font-size: clamp(38px, 5vw, 61px);
          line-height: 1.1;
          font-weight: 850;
          letter-spacing: -2px;
        }

        .memory-hero h1 span {
          color: #99f6e4;
        }

        .memory-hero p {
          max-width: 650px;
          margin: 18px 0 0;
          color: #d8f5ef;
          font-size: 16px;
          line-height: 1.85;
        }

        .memory-hero-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 30px;
          margin-top: 29px;
        }

        .memory-stat {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .memory-stat-icon {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.12);
          color: #ccfbf1;
        }

        .memory-stat strong {
          display: block;
          font-size: 16px;
          font-weight: 800;
        }

        .memory-stat span {
          display: block;
          margin-top: 4px;
          color: #c7e9e3;
          font-size: 11px;
        }

        .memory-main {
          padding: 42px 0 80px;
        }

        .memory-upload-card {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 24px;
          padding: 27px;
          border: 1px solid #dce8e9;
          border-radius: 22px;
          background: white;
          box-shadow: 0 8px 30px rgba(15, 23, 42, 0.035);
        }

        .memory-upload-heading {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .memory-upload-icon {
          display: grid;
          flex-shrink: 0;
          place-items: center;
          width: 54px;
          height: 54px;
          border-radius: 17px;
          background: #e6f6f2;
          color: #0f766e;
        }

        .memory-upload-heading h2 {
          margin: 2px 0 0;
          font-size: 20px;
          font-weight: 850;
          letter-spacing: -0.5px;
        }

        .memory-upload-heading p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.7;
        }

        .memory-upload-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .memory-dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          margin-top: 23px;
          padding: 27px;
          border: 2px dashed #cbdedc;
          border-radius: 20px;
          background: #f9fcfb;
          text-align: center;
          transition: 0.2s ease;
        }

        .memory-dropzone.dragging {
          border-color: #0f766e;
          background: #e7f8f3;
          transform: scale(1.005);
        }

        .memory-drop-icon {
          display: grid;
          place-items: center;
          width: 59px;
          height: 59px;
          border-radius: 19px;
          background: #e3f5f0;
          color: #0f766e;
        }

        .memory-dropzone h3 {
          margin: 15px 0 0;
          font-size: 17px;
          font-weight: 800;
        }

        .memory-dropzone p {
          margin: 8px 0 17px;
          color: #64748b;
          font-size: 12px;
          line-height: 1.7;
        }

        .memory-dropzone small {
          margin-top: 11px;
          color: #94a3b8;
          font-size: 11px;
        }

        .memory-album-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 22px;
          margin-top: 60px;
        }

        .memory-section-label {
          color: #0f766e;
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 1.8px;
          text-transform: uppercase;
        }

        .memory-album-heading h2 {
          margin: 9px 0 0;
          font-size: clamp(27px, 3vw, 36px);
          font-weight: 850;
          letter-spacing: -1.3px;
        }

        .memory-album-heading p {
          margin: 9px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.7;
        }

        .memory-gallery-tools {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 26px;
        }

        .memory-album-tabs {
          display: flex;
          flex: 1;
          align-items: center;
          gap: 8px;
          overflow-x: auto;
          padding: 3px 1px 8px;
        }

        .memory-album-tab {
          display: inline-flex;
          flex-shrink: 0;
          align-items: center;
          gap: 8px;
          min-height: 39px;
          padding: 9px 13px;
          border: 1px solid #e2e8f0;
          border-radius: 11px;
          background: white;
          color: #64748b;
          font-size: 12px;
          font-weight: 750;
        }

        .memory-album-tab.active {
          border-color: #0f766e;
          background: #0f766e;
          color: white;
        }

        .memory-album-tab span {
          display: inline-grid;
          place-items: center;
          min-width: 20px;
          height: 20px;
          padding: 0 5px;
          border-radius: 6px;
          background: rgba(100, 116, 139, 0.1);
          font-size: 10px;
        }

        .memory-album-tab.active span {
          background: rgba(255, 255, 255, 0.17);
        }

        .memory-search {
          position: relative;
          width: 230px;
          flex-shrink: 0;
        }

        .memory-search svg {
          position: absolute;
          top: 50%;
          left: 12px;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }

        .memory-search input {
          width: 100%;
          min-height: 41px;
          padding: 10px 12px 10px 36px;
          border: 1px solid #dce5ed;
          border-radius: 11px;
          background: white;
          color: #172033;
          font-size: 12px;
          outline: none;
        }

        .memory-search input:focus {
          border-color: #0f766e;
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
        }

        .memory-gallery-topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin: 19px 0;
          color: #64748b;
          font-size: 12px;
        }

        .memory-gallery-topline strong {
          color: #334155;
        }

        .memory-gallery-top-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .memory-small-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 35px;
          padding: 8px 11px;
          border: 1px solid #dce5ed;
          border-radius: 10px;
          background: white;
          color: #475569;
          font-size: 11px;
          font-weight: 750;
        }

        .memory-small-btn:hover {
          border-color: #0f766e;
          color: #0f766e;
        }

        .memory-small-btn.active {
          border-color: #fbcfe8;
          background: #fff1f7;
          color: #be185d;
        }

        .memory-photo-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 17px;
        }

        .memory-photo-card {
          position: relative;
          overflow: hidden;
          min-width: 0;
          border: 1px solid #e2e8f0;
          border-radius: 17px;
          background: white;
          box-shadow: 0 4px 15px rgba(15, 23, 42, 0.025);
          transition: transform 0.22s, box-shadow 0.22s;
        }

        .memory-photo-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 15px 30px rgba(15, 23, 42, 0.11);
        }

        .memory-photo-image-wrap {
          position: relative;
          overflow: hidden;
          height: 220px;
          background: #e2e8f0;
        }

        .memory-photo-image {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          cursor: zoom-in;
          transition: transform 0.45s ease;
        }

        .memory-photo-card:hover .memory-photo-image {
          transform: scale(1.055);
        }

        .memory-photo-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding: 11px;
          background: linear-gradient(
            180deg,
            rgba(0, 0, 0, 0.32),
            transparent 30%,
            transparent 70%,
            rgba(0, 0, 0, 0.16)
          );
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: none;
        }

        .memory-photo-card:hover .memory-photo-overlay,
        .memory-photo-card:focus-within .memory-photo-overlay {
          opacity: 1;
        }

        .memory-photo-overlay button {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.96);
          color: #334155;
          pointer-events: auto;
        }

        .memory-photo-overlay button:hover {
          background: white;
          color: #0f766e;
        }

        .memory-photo-overlay .favorite {
          color: #e11d48;
        }

        .memory-photo-info {
          padding: 13px 14px 14px;
        }

        .memory-photo-name {
          overflow: hidden;
          margin: 0;
          color: #334155;
          font-size: 12px;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .memory-photo-date {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 9px;
          color: #94a3b8;
          font-size: 10px;
        }

        .memory-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 310px;
          margin-top: 18px;
          padding: 30px;
          border: 1px dashed #cbd5e1;
          border-radius: 21px;
          background: white;
          text-align: center;
        }

        .memory-empty-icon {
          display: grid;
          place-items: center;
          width: 73px;
          height: 73px;
          border-radius: 23px;
          background: #e6f6f2;
          color: #0f766e;
        }

        .memory-empty h3 {
          margin: 19px 0 0;
          font-size: 20px;
          font-weight: 850;
        }

        .memory-empty p {
          max-width: 440px;
          margin: 10px 0 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.8;
        }

        .memory-empty .memory-btn {
          margin-top: 19px;
        }

        .memory-loading {
          display: flex;
          min-height: 240px;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: #64748b;
          font-size: 13px;
        }

        .memory-spinner {
          animation: memory-spin 1s linear infinite;
        }

        @keyframes memory-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .memory-journal-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
          margin-top: 58px;
          padding: 27px;
          border: 1px solid #d8eae7;
          border-radius: 21px;
          background: linear-gradient(110deg, #eaf8f4, #f4faf8);
        }

        .memory-journal-copy {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .memory-journal-icon {
          display: grid;
          flex-shrink: 0;
          place-items: center;
          width: 51px;
          height: 51px;
          border-radius: 16px;
          background: #0f766e;
          color: white;
        }

        .memory-journal-copy h3 {
          margin: 2px 0 0;
          font-size: 19px;
          font-weight: 850;
        }

        .memory-journal-copy p {
          max-width: 650px;
          margin: 8px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.8;
        }

        .memory-footer {
          padding: 24px 15px;
          border-top: 1px solid #e2e8f0;
          background: white;
          color: #94a3b8;
          text-align: center;
          font-size: 11px;
        }

        .memory-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(7, 15, 25, 0.88);
          backdrop-filter: blur(7px);
        }

        .memory-lightbox {
          display: flex;
          flex-direction: column;
          width: min(1050px, 100%);
          max-height: 94vh;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 19px;
          background: #111827;
          color: white;
        }

        .memory-lightbox-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 14px 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .memory-lightbox-top strong {
          display: block;
          overflow: hidden;
          max-width: 65vw;
          font-size: 13px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .memory-lightbox-top span {
          display: block;
          margin-top: 5px;
          color: #9ca3af;
          font-size: 10px;
        }

        .memory-lightbox-actions {
          display: flex;
          gap: 8px;
        }

        .memory-lightbox-actions button {
          display: grid;
          place-items: center;
          width: 37px;
          height: 37px;
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.08);
          color: white;
        }

        .memory-lightbox-actions button:hover {
          background: rgba(255, 255, 255, 0.17);
        }

        .memory-lightbox-image-area {
          position: relative;
          display: flex;
          flex: 1;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          overflow: hidden;
          padding: 15px;
        }

        .memory-lightbox-image {
          display: block;
          max-width: 100%;
          max-height: calc(94vh - 150px);
          object-fit: contain;
        }

        .memory-lightbox-arrow {
          position: absolute;
          top: 50%;
          display: grid;
          place-items: center;
          width: 43px;
          height: 43px;
          transform: translateY(-50%);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.45);
          color: white;
        }

        .memory-lightbox-arrow.left {
          left: 15px;
        }

        .memory-lightbox-arrow.right {
          right: 15px;
        }

        .memory-lightbox-bottom {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 13px 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          color: #9ca3af;
          font-size: 11px;
        }

        .memory-notice {
          position: fixed;
          right: 20px;
          bottom: 20px;
          z-index: 90;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          max-width: min(420px, calc(100% - 40px));
          padding: 15px;
          border: 1px solid #bbf7d0;
          border-radius: 13px;
          background: white;
          box-shadow: 0 15px 40px rgba(15, 23, 42, 0.16);
          color: #166534;
          font-size: 12px;
          font-weight: 650;
          line-height: 1.6;
        }

        .memory-notice.error {
          border-color: #fecaca;
          color: #b91c1c;
        }

        .memory-notice span {
          flex: 1;
        }

        .memory-notice button {
          border: 0;
          background: transparent;
          color: inherit;
        }

        @media (max-width: 1000px) {
          .memory-photo-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .memory-photo-image-wrap {
            height: 210px;
          }

          .memory-upload-card {
            grid-template-columns: 1fr;
          }

          .memory-upload-actions {
            padding-left: 70px;
          }

          .memory-search {
            width: 190px;
          }
        }

        @media (max-width: 700px) {
          .memory-container {
            width: calc(100% - 28px);
          }

          .memory-nav-inner {
            min-height: 65px;
            gap: 8px;
          }

          .memory-brand {
            gap: 7px;
            font-size: 16px;
          }

          .memory-brand-icon {
            width: 35px;
            height: 35px;
            border-radius: 11px;
          }

          .memory-back {
            font-size: 11px;
          }

          .memory-nav-actions {
            gap: 5px;
          }

          .memory-nav-actions .memory-btn {
            min-height: 36px;
            padding: 8px;
            font-size: 11px;
          }

          .memory-hero-content {
            padding: 49px 0;
          }

          .memory-hero h1 {
            font-size: 40px;
            letter-spacing: -1.4px;
          }

          .memory-hero p {
            font-size: 13px;
          }

          .memory-hero-stats {
            gap: 16px;
          }

          .memory-stat-icon {
            width: 36px;
            height: 36px;
          }

          .memory-main {
            padding-top: 25px;
          }

          .memory-upload-card {
            padding: 19px;
          }

          .memory-upload-heading {
            gap: 12px;
          }

          .memory-upload-icon {
            width: 43px;
            height: 43px;
            border-radius: 13px;
          }

          .memory-upload-heading h2 {
            font-size: 17px;
          }

          .memory-upload-heading p {
            font-size: 12px;
          }

          .memory-upload-actions {
            padding-left: 0;
          }

          .memory-upload-actions button {
            flex: 1;
          }

          .memory-dropzone {
            min-height: 180px;
            padding: 19px;
          }

          .memory-album-heading {
            align-items: flex-start;
            flex-direction: column;
            margin-top: 44px;
          }

          .memory-gallery-tools {
            align-items: stretch;
            flex-direction: column;
          }

          .memory-search {
            width: 100%;
          }

          .memory-photo-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 11px;
          }

          .memory-photo-image-wrap {
            height: 170px;
          }

          .memory-photo-info {
            padding: 11px;
          }

          .memory-photo-name {
            font-size: 11px;
          }

          .memory-photo-overlay {
            opacity: 1;
          }

          .memory-photo-overlay button {
            width: 30px;
            height: 30px;
          }

          .memory-journal-banner {
            align-items: flex-start;
            flex-direction: column;
            padding: 20px;
            margin-top: 40px;
          }

          .memory-journal-copy {
            gap: 12px;
          }

          .memory-journal-copy h3 {
            font-size: 16px;
          }

          .memory-journal-banner > .memory-btn {
            width: 100%;
          }

          .memory-lightbox-image-area {
            padding: 10px;
          }

          .memory-lightbox-image {
            max-height: calc(90vh - 170px);
          }
        }

        @media (max-width: 390px) {
          .memory-brand {
            font-size: 14px;
          }

          .memory-back span {
            display: none;
          }

          .memory-photo-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .memory-photo-image-wrap {
            height: 235px;
          }

          .memory-photo-info {
            padding: 13px;
          }
        }
      `}</style>

      {/* NAVBAR */}

      <header className="memory-navbar">
        <div className="memory-container memory-nav-inner">
          <Link href="/" className="memory-brand">
            <span className="memory-brand-icon">
              <Plane size={19} />
            </span>
            <span>
              Travelto <span>Memories</span>
            </span>
          </Link>

          <div className="memory-nav-actions">
            <button
              className="memory-back"
              onClick={() => window.history.back()}
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>

            <button
              className="memory-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus size={16} />
              Add Photos
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}

      <section className="memory-hero">
        <div className="memory-container memory-hero-content">
          <div className="memory-eyebrow">
            <Images size={14} />
            YOUR TRAVEL MEMORIES
          </div>

          <h1>
            Turn your photos
            <br />
            into <span>memories.</span>
          </h1>

          <p>
            Every journey has a story. Keep your favourite moments,
            beautiful places, and unforgettable experiences together
            in your own personal travel gallery.
          </p>

          <div className="memory-hero-stats">
            <div className="memory-stat">
              <div className="memory-stat-icon">
                <Images size={19} />
              </div>
              <div>
                <strong>{photos.length}</strong>
                <span>Photos saved</span>
              </div>
            </div>

            <div className="memory-stat">
              <div className="memory-stat-icon">
                <FolderHeart size={19} />
              </div>
              <div>
                <strong>{albums.length}</strong>
                <span>Albums</span>
              </div>
            </div>

            <div className="memory-stat">
              <div className="memory-stat-icon">
                <CloudUpload size={19} />
              </div>
              <div>
                <strong>{formatBytes(totalSize)}</strong>
                <span>Photo storage size</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="memory-container memory-main">
        {/* UPLOAD */}

        <div className="memory-upload-card">
          <div className="memory-upload-heading">
            <div className="memory-upload-icon">
              <Camera size={25} />
            </div>

            <div>
              <h2>Upload your trip photos</h2>
              <p>
                Add photos from your phone or laptop and build your own
                travel gallery.
              </p>
            </div>
          </div>

          <div className="memory-upload-actions">
            <button
              className="memory-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="memory-spinner" size={17} />
              ) : (
                <Upload size={17} />
              )}
              {uploading ? "Adding..." : "Choose Photos"}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={handleFileChange}
          />

          <div
            className={`memory-dropzone ${dragging ? "dragging" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <div className="memory-drop-icon">
              <ImagePlus size={28} />
            </div>

            <h3>
              {dragging
                ? "Drop your photos here"
                : "Drag and drop your photos here"}
            </h3>

            <p>
              Or click the button above to select multiple photos.
              <br />
              JPG, PNG, WEBP and other browser-supported image formats.
            </p>

            <button
              className="memory-btn memory-btn-light"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Images size={16} />
              Browse Gallery
            </button>

            <small>Maximum 5 MB per photo · Up to 100 photos in this browser</small>
          </div>
        </div>

        {/* ALBUM HEADING */}

        <div className="memory-album-heading">
          <div>
            <div className="memory-section-label">YOUR COLLECTION</div>
            <h2>{album}</h2>
            <p>
              Your favourite moments, all in one place.
              Open any photo to view or download it.
            </p>
          </div>

          <button
            className="memory-btn memory-btn-light"
            onClick={() => setShowAlbumForm((previous) => !previous)}
          >
            <Plus size={16} />
            New Album
          </button>
        </div>

        {/* CREATE ALBUM */}

        {showAlbumForm && (
          <form
            onSubmit={createAlbum}
            style={{
              display: "flex",
              gap: 10,
              marginTop: 20,
              padding: 17,
              border: "1px solid #dce8e9",
              borderRadius: 14,
              background: "white",
            }}
          >
            <input
              autoFocus
              required
              maxLength={60}
              value={newAlbum}
              onChange={(event) => setNewAlbum(event.target.value)}
              placeholder="e.g. Araku Valley Memories"
              style={{
                flex: 1,
                minWidth: 0,
                padding: 12,
                border: "1px solid #dce5ed",
                borderRadius: 10,
                outlineColor: "#0f766e",
                fontSize: 13,
              }}
            />

            <button type="submit" className="memory-btn">
              Create
            </button>

            <button
              type="button"
              className="memory-btn memory-btn-light"
              onClick={() => setShowAlbumForm(false)}
              aria-label="Cancel creating album"
            >
              <X size={16} />
            </button>
          </form>
        )}

        {/* GALLERY FILTERS */}

        <div className="memory-gallery-tools">
          <div className="memory-album-tabs">
            <button
              className={`memory-album-tab ${
                album === DEFAULT_ALBUM ? "active" : ""
              }`}
              onClick={() => {
                setAlbum(DEFAULT_ALBUM);
                setFavoritesOnly(false);
              }}
            >
              All Memories
              <span>
                {photos.filter((photo) => photo.album === DEFAULT_ALBUM).length}
              </span>
            </button>

            {albums
              .filter((item) => item !== DEFAULT_ALBUM)
              .map((item) => (
                <button
                  key={item}
                  className={`memory-album-tab ${
                    album === item ? "active" : ""
                  }`}
                  onClick={() => {
                    setAlbum(item);
                    setFavoritesOnly(false);
                  }}
                >
                  <FolderHeart size={14} />
                  {item}
                  <span>
                    {photos.filter((photo) => photo.album === item).length}
                  </span>
                </button>
              ))}
          </div>

          <div className="memory-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search photos..."
              aria-label="Search photos"
            />
          </div>
        </div>

        {/* GALLERY TOOLBAR */}

        <div className="memory-gallery-topline">
          <span>
            Showing <strong>{filteredPhotos.length}</strong>{" "}
            {filteredPhotos.length === 1 ? "photo" : "photos"}
          </span>

          <div className="memory-gallery-top-actions">
            <button
              className={`memory-small-btn ${
                favoritesOnly ? "active" : ""
              }`}
              onClick={() => setFavoritesOnly((previous) => !previous)}
            >
              <Heart size={14} fill={favoritesOnly ? "currentColor" : "none"} />
              Favorites
            </button>

            <button
              className="memory-small-btn"
              onClick={() => void downloadAlbum()}
              disabled={!filteredPhotos.length}
            >
              <Download size={14} />
              Download All
            </button>
          </div>
        </div>

        {/* PHOTO GALLERY */}

        {loading ? (
          <div className="memory-loading">
            <Loader2 className="memory-spinner" size={28} />
            Loading your memories...
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="memory-empty">
            <div className="memory-empty-icon">
              {search || favoritesOnly ? (
                <Search size={30} />
              ) : (
                <Images size={32} />
              )}
            </div>

            <h3>
              {search
                ? "No matching photos"
                : favoritesOnly
                  ? "No favourite photos yet"
                  : photos.length === 0
                    ? "Your travel story starts here"
                    : "This album is empty"}
            </h3>

            <p>
              {search
                ? "Try another search term to find your photos."
                : favoritesOnly
                  ? "Click the heart on any photo to save it as a favourite."
                  : "Upload your favourite trip photos to create your own beautiful travel gallery."}
            </p>

            {!search && !favoritesOnly && (
              <button
                className="memory-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={17} />
                Upload Your First Photos
              </button>
            )}
          </div>
        ) : (
          <div className="memory-photo-grid">
            {filteredPhotos.map((photo) => (
              <article key={photo.id} className="memory-photo-card">
                <div className="memory-photo-image-wrap">
                  <img
                    src={photo.dataUrl}
                    alt={photo.name}
                    className="memory-photo-image"
                    onClick={() => setSelectedPhoto(photo)}
                  />

                  <div className="memory-photo-overlay">
                    <button
                      className={photo.favorite ? "favorite" : ""}
                      onClick={() => toggleFavorite(photo.id)}
                      aria-label={
                        photo.favorite
                          ? "Remove from favourites"
                          : "Add to favourites"
                      }
                      title="Favourite"
                    >
                      <Heart
                        size={16}
                        fill={photo.favorite ? "currentColor" : "none"}
                      />
                    </button>

                    <button
                      onClick={() => downloadPhoto(photo)}
                      aria-label="Download photo"
                      title="Download"
                    >
                      <Download size={16} />
                    </button>

                    <button
                      onClick={() => deletePhoto(photo.id)}
                      aria-label="Delete photo"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="memory-photo-info">
                  <p className="memory-photo-name" title={photo.name}>
                    {photo.name}
                  </p>

                  <div className="memory-photo-date">
                    <CalendarDays size={12} />
                    {formatDate(photo.uploadedAt)}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* AI JOURNAL */}

        <div className="memory-journal-banner">
          <div className="memory-journal-copy">
            <div className="memory-journal-icon">
              <Sparkles size={24} />
            </div>

            <div>
              <h3>Create your AI Travel Journal</h3>
              <p>
                Turn your travel moments into a beautiful journal
                with stories and highlights from your adventures.
              </p>
            </div>
          </div>

          <button
            className="memory-btn"
            onClick={() =>
              showNotice(
                "The AI Journal feature needs to be connected to your AI backend.",
                "error"
              )
            }
          >
            <Sparkles size={16} />
            Create AI Journal
          </button>
        </div>
      </section>

      {/* FOOTER */}

      <footer className="memory-footer">
        Made for your journeys. Keep your favourite moments with Travelto.
      </footer>

      {/* FULL-SCREEN PHOTO VIEWER */}

      {selectedPhoto && (
        <div
          className="memory-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedPhoto(null);
            }
          }}
        >
          <div className="memory-lightbox">
            <div className="memory-lightbox-top">
              <div>
                <strong>{selectedPhoto.name}</strong>
                <span>
                  {formatDate(selectedPhoto.uploadedAt)} ·{" "}
                  {formatBytes(selectedPhoto.size)}
                </span>
              </div>

              <div className="memory-lightbox-actions">
                <button
                  onClick={() => toggleFavorite(selectedPhoto.id)}
                  aria-label="Toggle favourite"
                  title="Favourite"
                >
                  <Heart
                    size={17}
                    fill={selectedPhoto.favorite ? "currentColor" : "none"}
                  />
                </button>

                <button
                  onClick={() => downloadPhoto(selectedPhoto)}
                  aria-label="Download photo"
                  title="Download"
                >
                  <Download size={17} />
                </button>

                <button
                  onClick={() => setSelectedPhoto(null)}
                  aria-label="Close viewer"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="memory-lightbox-image-area">
              <img
                className="memory-lightbox-image"
                src={selectedPhoto.dataUrl}
                alt={selectedPhoto.name}
              />

              {filteredPhotos.length > 1 && (
                <>
                  <button
                    className="memory-lightbox-arrow left"
                    onClick={() => movePhoto(-1)}
                    aria-label="Previous photo"
                  >
                    <ChevronLeft size={23} />
                  </button>

                  <button
                    className="memory-lightbox-arrow right"
                    onClick={() => movePhoto(1)}
                    aria-label="Next photo"
                  >
                    <ChevronRight size={23} />
                  </button>
                </>
              )}
            </div>

            <div className="memory-lightbox-bottom">
              <span>{selectedPhoto.album}</span>
              <span>
                {Math.max(
                  1,
                  filteredPhotos.findIndex(
                    (photo) => photo.id === selectedPhoto.id
                  ) + 1
                )}{" "}
                / {filteredPhotos.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS */}

      {notice && (
        <div
          className={`memory-notice ${
            noticeType === "error" ? "error" : ""
          }`}
          role="status"
        >
          {noticeType === "success" ? (
            <CheckCircle size={19} />
          ) : (
            <AlertCircle size={19} />
          )}

          <span>{notice}</span>

          <button
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </main>
  );
}
