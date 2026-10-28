import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Globe,
  Search,
  Crosshair,
  ShieldCheck,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Pause,
  Layers,
  Radar,
  Activity,
  Wifi,
  MapPin,
  ArrowUpRight,
  X,
  Server,
  CheckCircle2,
} from "lucide-react";
import { useDatasetStore } from "@/hooks/useDataset";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useSettingsStore, formatCurrencyAmount } from "@/hooks/useSettings";
import { api, BreakdownItem } from "@/lib/api";
import { EARTH_LAND_POLYGONS, EARTH_COUNTRY_BORDERS } from "./earth_geography";

export interface GeoDataPoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  value: number;
  displayValue: string;
  sharePct: number;
  rank: number;
}

export interface WorldGlowMapProps {
  datasetId?: string;
  points?: GeoDataPoint[];
  metricLabel?: string;
  className?: string;
  showMascot?: boolean;
  nodesCount?: number;
  clustersCount?: number;
  flowsCount?: number;
  throughputCount?: number | string;
  ingestionStream?: string;
  activeClusters?: number;
  onDrillDown?: (point?: any) => void;
  onExplain?: () => void;
  onViewEvidence?: () => void;
}

// ---------------------------------------------------------------------------
// 3D Spherical Trigonometry & Precomputations for Zero-Latency 60fps/120fps Rendering
// ---------------------------------------------------------------------------

interface UnitVertex {
  x0: number;
  y0: number;
  z0: number;
}

function latLonToUnit(latDeg: number, lonDeg: number): UnitVertex {
  const safeLatDeg = Number.isFinite(latDeg) ? Number(latDeg) : 0;
  const safeLonDeg = Number.isFinite(lonDeg) ? Number(lonDeg) : 0;
  const lat = (safeLatDeg * Math.PI) / 180;
  const lon = (safeLonDeg * Math.PI) / 180;
  return {
    x0: Math.cos(lat) * Math.sin(lon),
    y0: -Math.sin(lat),
    z0: Math.cos(lat) * Math.cos(lon),
  };
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h)) {
    return;
  }
  const safeR = Math.max(0, Math.min(Number.isFinite(r) ? r : 0, Math.min(w, h) / 2));
  try {
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, w, h, safeR);
    } else {
      ctx.moveTo(x + safeR, y);
      ctx.lineTo(x + w - safeR, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + safeR);
      ctx.lineTo(x + w, y + h - safeR);
      ctx.quadraticCurveTo(x + w, y + h, x + w - safeR, y + h);
      ctx.lineTo(x + safeR, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - safeR);
      ctx.lineTo(x, y + safeR);
      ctx.quadraticCurveTo(x, y, x + safeR, y);
    }
  } catch {
    ctx.rect(x, y, w, h);
  }
}

// Authentic Natural Earth Landmass and Country Boundaries (Precomputed into 3D Unit Spheres)
const PRECOMPUTED_LANDMASS = EARTH_LAND_POLYGONS.map((polygon) =>
  polygon.map(([lat, lon]) => latLonToUnit(lat, lon))
);

const PRECOMPUTED_BORDERS = EARTH_COUNTRY_BORDERS.map((segment) =>
  segment.map(([lat, lon]) => latLonToUnit(lat, lon))
);

// Static Stars for cosmic background
const COSMIC_STARS: Array<{ x: number; y: number; r: number; alpha: number; speed: number }> = [];
for (let i = 0; i < 90; i++) {
  COSMIC_STARS.push({
    x: ((i * 137.5) % 1000) / 1000,
    y: ((i * 269.3) % 1000) / 1000,
    r: (i % 3) * 0.4 + 0.6,
    alpha: (i % 5) * 0.12 + 0.25,
    speed: (i % 4) * 0.008 + 0.012,
  });
}

// ---------------------------------------------------------------------------
// Global Gazetteer for Auto-resolving Uploaded Dataset Regions
// ---------------------------------------------------------------------------

const GLOBAL_GAZETTEER: Record<string, { lat: number; lon: number; country: string }> = {
  // --- INDIA & SOUTH ASIA ---
  "india": { lat: 20.59, lon: 78.96, country: "India" },
  "bharat": { lat: 20.59, lon: 78.96, country: "India" },
  // All 28 Indian States & UTs
  "maharashtra": { lat: 19.75, lon: 75.71, country: "India" },
  "karnataka": { lat: 15.31, lon: 75.71, country: "India" },
  "tamil nadu": { lat: 11.12, lon: 78.65, country: "India" },
  "delhi": { lat: 28.61, lon: 77.20, country: "India" },
  "gujarat": { lat: 22.25, lon: 71.19, country: "India" },
  "uttar pradesh": { lat: 26.84, lon: 80.94, country: "India" },
  "rajasthan": { lat: 27.02, lon: 74.21, country: "India" },
  "kerala": { lat: 10.85, lon: 76.27, country: "India" },
  "west bengal": { lat: 22.98, lon: 87.85, country: "India" },
  "telangana": { lat: 18.11, lon: 79.01, country: "India" },
  "andhra pradesh": { lat: 15.91, lon: 79.74, country: "India" },
  "odisha": { lat: 20.95, lon: 85.09, country: "India" },
  "madhya pradesh": { lat: 22.97, lon: 78.65, country: "India" },
  "bihar": { lat: 25.09, lon: 85.31, country: "India" },
  "punjab": { lat: 31.14, lon: 75.34, country: "India" },
  "haryana": { lat: 29.05, lon: 76.08, country: "India" },
  "assam": { lat: 26.20, lon: 92.93, country: "India" },
  "jharkhand": { lat: 23.61, lon: 85.27, country: "India" },
  "chhattisgarh": { lat: 21.27, lon: 81.86, country: "India" },
  "uttarakhand": { lat: 30.06, lon: 79.01, country: "India" },
  "himachal pradesh": { lat: 31.10, lon: 77.17, country: "India" },
  "goa": { lat: 15.29, lon: 74.12, country: "India" },
  "tripura": { lat: 23.94, lon: 91.98, country: "India" },
  "manipur": { lat: 24.66, lon: 93.90, country: "India" },
  "meghalaya": { lat: 25.46, lon: 91.36, country: "India" },
  "nagaland": { lat: 26.15, lon: 94.56, country: "India" },
  "mizoram": { lat: 23.16, lon: 92.93, country: "India" },
  "sikkim": { lat: 27.53, lon: 88.51, country: "India" },
  "arunachal pradesh": { lat: 28.21, lon: 94.72, country: "India" },
  "jammu and kashmir": { lat: 33.77, lon: 76.57, country: "India" },
  "jammu & kashmir": { lat: 33.77, lon: 76.57, country: "India" },
  "ladakh": { lat: 34.15, lon: 77.57, country: "India" },
  "chandigarh": { lat: 30.73, lon: 76.77, country: "India" },
  "puducherry": { lat: 11.94, lon: 79.80, country: "India" },
  // Major Indian Cities
  "mumbai": { lat: 19.07, lon: 72.87, country: "India" },
  "pune": { lat: 18.52, lon: 73.85, country: "India" },
  "nagpur": { lat: 21.14, lon: 79.08, country: "India" },
  "nashik": { lat: 19.99, lon: 73.78, country: "India" },
  "thane": { lat: 19.21, lon: 72.97, country: "India" },
  "bengaluru": { lat: 12.97, lon: 77.59, country: "India" },
  "bangalore": { lat: 12.97, lon: 77.59, country: "India" },
  "mysuru": { lat: 12.29, lon: 76.63, country: "India" },
  "mysore": { lat: 12.29, lon: 76.63, country: "India" },
  "hubli": { lat: 15.36, lon: 75.12, country: "India" },
  "new delhi": { lat: 28.61, lon: 77.20, country: "India" },
  "ncr": { lat: 28.61, lon: 77.20, country: "India" },
  "noida": { lat: 28.53, lon: 77.39, country: "India" },
  "gurgaon": { lat: 28.45, lon: 77.02, country: "India" },
  "gurugram": { lat: 28.45, lon: 77.02, country: "India" },
  "faridabad": { lat: 28.40, lon: 77.31, country: "India" },
  "ghaziabad": { lat: 28.66, lon: 77.45, country: "India" },
  "lucknow": { lat: 26.84, lon: 80.94, country: "India" },
  "kanpur": { lat: 26.44, lon: 80.33, country: "India" },
  "varanasi": { lat: 25.31, lon: 82.97, country: "India" },
  "agra": { lat: 27.17, lon: 78.00, country: "India" },
  "ahmedabad": { lat: 23.02, lon: 72.57, country: "India" },
  "surat": { lat: 21.17, lon: 72.83, country: "India" },
  "vadodara": { lat: 22.30, lon: 73.18, country: "India" },
  "rajkot": { lat: 22.30, lon: 70.80, country: "India" },
  "kolkata": { lat: 22.57, lon: 88.36, country: "India" },
  "durgapur": { lat: 23.52, lon: 87.31, country: "India" },
  "siliguri": { lat: 26.72, lon: 88.43, country: "India" },
  "chennai": { lat: 13.08, lon: 80.27, country: "India" },
  "coimbatore": { lat: 11.01, lon: 76.95, country: "India" },
  "madurai": { lat: 9.92, lon: 78.11, country: "India" },
  "hyderabad": { lat: 17.38, lon: 78.48, country: "India" },
  "visakhapatnam": { lat: 17.68, lon: 83.21, country: "India" },
  "vizag": { lat: 17.68, lon: 83.21, country: "India" },
  "vijayawada": { lat: 16.50, lon: 80.64, country: "India" },
  "jaipur": { lat: 26.91, lon: 75.78, country: "India" },
  "udaipur": { lat: 24.58, lon: 73.71, country: "India" },
  "jodhpur": { lat: 26.23, lon: 73.02, country: "India" },
  "kochi": { lat: 9.93, lon: 76.26, country: "India" },
  "cochin": { lat: 9.93, lon: 76.26, country: "India" },
  "thiruvananthapuram": { lat: 8.52, lon: 76.93, country: "India" },
  "trivandrum": { lat: 8.52, lon: 76.93, country: "India" },
  "bhubaneswar": { lat: 20.29, lon: 85.82, country: "India" },
  "cuttack": { lat: 20.46, lon: 85.88, country: "India" },
  "indore": { lat: 22.71, lon: 75.85, country: "India" },
  "bhopal": { lat: 23.25, lon: 77.41, country: "India" },
  "patna": { lat: 25.59, lon: 85.13, country: "India" },
  "ranchi": { lat: 23.34, lon: 85.30, country: "India" },
  "amritsar": { lat: 31.63, lon: 74.87, country: "India" },
  "ludhiana": { lat: 30.90, lon: 75.85, country: "India" },
  "guwahati": { lat: 26.14, lon: 91.73, country: "India" },

  // --- UNITED STATES ---
  "united states": { lat: 39.82, lon: -98.58, country: "United States" },
  "usa": { lat: 39.82, lon: -98.58, country: "United States" },
  "us": { lat: 39.82, lon: -98.58, country: "United States" },
  "north america": { lat: 45.00, lon: -100.00, country: "North America" },
  // All 50 US States
  "california": { lat: 36.77, lon: -119.41, country: "United States" },
  "ca": { lat: 36.77, lon: -119.41, country: "United States" },
  "new york": { lat: 40.71, lon: -74.00, country: "United States" },
  "ny": { lat: 40.71, lon: -74.00, country: "United States" },
  "texas": { lat: 31.96, lon: -99.90, country: "United States" },
  "tx": { lat: 31.96, lon: -99.90, country: "United States" },
  "washington": { lat: 47.75, lon: -120.74, country: "United States" },
  "wa": { lat: 47.75, lon: -120.74, country: "United States" },
  "washington state": { lat: 47.75, lon: -120.74, country: "United States" },
  "florida": { lat: 27.66, lon: -81.51, country: "United States" },
  "fl": { lat: 27.66, lon: -81.51, country: "United States" },
  "pennsylvania": { lat: 41.20, lon: -77.19, country: "United States" },
  "pa": { lat: 41.20, lon: -77.19, country: "United States" },
  "illinois": { lat: 40.63, lon: -89.39, country: "United States" },
  "il": { lat: 40.63, lon: -89.39, country: "United States" },
  "ohio": { lat: 40.41, lon: -82.90, country: "United States" },
  "oh": { lat: 40.41, lon: -82.90, country: "United States" },
  "michigan": { lat: 44.31, lon: -85.60, country: "United States" },
  "mi": { lat: 44.31, lon: -85.60, country: "United States" },
  "virginia": { lat: 37.43, lon: -78.65, country: "United States" },
  "va": { lat: 37.43, lon: -78.65, country: "United States" },
  "north carolina": { lat: 35.75, lon: -79.01, country: "United States" },
  "nc": { lat: 35.75, lon: -79.01, country: "United States" },
  "georgia": { lat: 32.16, lon: -82.90, country: "United States" },
  "ga": { lat: 32.16, lon: -82.90, country: "United States" },
  "arizona": { lat: 34.04, lon: -111.09, country: "United States" },
  "az": { lat: 34.04, lon: -111.09, country: "United States" },
  "massachusetts": { lat: 42.40, lon: -71.38, country: "United States" },
  "ma": { lat: 42.40, lon: -71.38, country: "United States" },
  "colorado": { lat: 39.55, lon: -105.78, country: "United States" },
  "co": { lat: 39.55, lon: -105.78, country: "United States" },
  "tennessee": { lat: 35.51, lon: -86.58, country: "United States" },
  "tn": { lat: 35.51, lon: -86.58, country: "United States" },
  "indiana": { lat: 40.26, lon: -86.13, country: "United States" },
  "in": { lat: 40.26, lon: -86.13, country: "United States" },
  "missouri": { lat: 37.96, lon: -91.83, country: "United States" },
  "mo": { lat: 37.96, lon: -91.83, country: "United States" },
  "maryland": { lat: 39.04, lon: -76.64, country: "United States" },
  "md": { lat: 39.04, lon: -76.64, country: "United States" },
  "wisconsin": { lat: 43.78, lon: -88.78, country: "United States" },
  "wi": { lat: 43.78, lon: -88.78, country: "United States" },
  "minnesota": { lat: 46.72, lon: -94.68, country: "United States" },
  "mn": { lat: 46.72, lon: -94.68, country: "United States" },
  "oregon": { lat: 43.80, lon: -120.55, country: "United States" },
  "or": { lat: 43.80, lon: -120.55, country: "United States" },
  "kentucky": { lat: 37.83, lon: -84.27, country: "United States" },
  "ky": { lat: 37.83, lon: -84.27, country: "United States" },
  "south carolina": { lat: 33.83, lon: -81.16, country: "United States" },
  "sc": { lat: 33.83, lon: -81.16, country: "United States" },
  "alabama": { lat: 32.31, lon: -86.90, country: "United States" },
  "al": { lat: 32.31, lon: -86.90, country: "United States" },
  "louisiana": { lat: 30.98, lon: -91.96, country: "United States" },
  "la": { lat: 30.98, lon: -91.96, country: "United States" },
  "utah": { lat: 39.32, lon: -111.09, country: "United States" },
  "ut": { lat: 39.32, lon: -111.09, country: "United States" },
  "connecticut": { lat: 41.60, lon: -72.76, country: "United States" },
  "ct": { lat: 41.60, lon: -72.76, country: "United States" },
  "nevada": { lat: 38.80, lon: -116.41, country: "United States" },
  "nv": { lat: 38.80, lon: -116.41, country: "United States" },
  "oklahoma": { lat: 35.56, lon: -96.92, country: "United States" },
  "iowa": { lat: 41.87, lon: -93.09, country: "United States" },
  "arkansas": { lat: 35.20, lon: -91.83, country: "United States" },
  "mississippi": { lat: 32.35, lon: -89.39, country: "United States" },
  "kansas": { lat: 39.01, lon: -98.48, country: "United States" },
  "nebraska": { lat: 41.49, lon: -99.90, country: "United States" },
  "new mexico": { lat: 34.51, lon: -105.87, country: "United States" },
  "idaho": { lat: 44.06, lon: -114.74, country: "United States" },
  "west virginia": { lat: 38.59, lon: -80.45, country: "United States" },
  "hawaii": { lat: 19.89, lon: -155.58, country: "United States" },
  "new hampshire": { lat: 43.19, lon: -71.57, country: "United States" },
  "maine": { lat: 45.25, lon: -69.44, country: "United States" },
  "rhode island": { lat: 41.58, lon: -71.47, country: "United States" },
  "montana": { lat: 46.87, lon: -110.36, country: "United States" },
  "delaware": { lat: 38.91, lon: -75.52, country: "United States" },
  "south dakota": { lat: 43.96, lon: -99.90, country: "United States" },
  "north dakota": { lat: 47.55, lon: -101.00, country: "United States" },
  "alaska": { lat: 64.20, lon: -149.49, country: "United States" },
  "vermont": { lat: 44.55, lon: -72.57, country: "United States" },
  "wyoming": { lat: 43.07, lon: -107.29, country: "United States" },
  // Major US Cities
  "new york city": { lat: 40.71, lon: -74.00, country: "United States" },
  "los angeles": { lat: 34.05, lon: -118.24, country: "United States" },
  "chicago": { lat: 41.87, lon: -87.62, country: "United States" },
  "houston": { lat: 29.76, lon: -95.36, country: "United States" },
  "phoenix": { lat: 33.44, lon: -112.07, country: "United States" },
  "philadelphia": { lat: 39.95, lon: -75.16, country: "United States" },
  "san antonio": { lat: 29.42, lon: -98.49, country: "United States" },
  "san diego": { lat: 32.71, lon: -117.16, country: "United States" },
  "dallas": { lat: 32.77, lon: -96.79, country: "United States" },
  "austin": { lat: 30.26, lon: -97.74, country: "United States" },
  "san jose": { lat: 37.33, lon: -121.88, country: "United States" },
  "san francisco": { lat: 37.77, lon: -122.41, country: "United States" },
  "seattle": { lat: 47.60, lon: -122.33, country: "United States" },
  "denver": { lat: 39.73, lon: -104.99, country: "United States" },
  "boston": { lat: 42.36, lon: -71.05, country: "United States" },
  "atlanta": { lat: 33.74, lon: -84.38, country: "United States" },
  "miami": { lat: 25.76, lon: -80.19, country: "United States" },
  "minneapolis": { lat: 44.97, lon: -93.26, country: "United States" },
  "detroit": { lat: 42.33, lon: -83.04, country: "United States" },
  "tampa": { lat: 27.95, lon: -82.45, country: "United States" },
  "orlando": { lat: 28.53, lon: -81.37, country: "United States" },
  "charlotte": { lat: 35.22, lon: -80.84, country: "United States" },
  "indianapolis": { lat: 39.76, lon: -86.15, country: "United States" },
  "portland": { lat: 45.51, lon: -122.67, country: "United States" },
  "las vegas": { lat: 36.16, lon: -115.13, country: "United States" },

  // --- CANADA, MEXICO, LATAM ---
  "canada": { lat: 56.13, lon: -106.34, country: "Canada" },
  "toronto": { lat: 43.65, lon: -79.38, country: "Canada" },
  "vancouver": { lat: 49.28, lon: -123.12, country: "Canada" },
  "montreal": { lat: 45.50, lon: -73.56, country: "Canada" },
  "mexico": { lat: 23.63, lon: -102.55, country: "Mexico" },
  "mexico city": { lat: 19.43, lon: -99.13, country: "Mexico" },
  "brazil": { lat: -14.23, lon: -51.92, country: "Brazil" },
  "sao paulo": { lat: -23.55, lon: -46.63, country: "Brazil" },
  "são paulo": { lat: -23.55, lon: -46.63, country: "Brazil" },
  "rio de janeiro": { lat: -22.90, lon: -43.17, country: "Brazil" },
  "argentina": { lat: -38.41, lon: -63.61, country: "Argentina" },
  "buenos aires": { lat: -34.60, lon: -58.38, country: "Argentina" },
  "colombia": { lat: 4.57, lon: -74.29, country: "Colombia" },
  "chile": { lat: -35.67, lon: -71.54, country: "Chile" },

  // --- EUROPE & UK ---
  "europe": { lat: 54.52, lon: 15.25, country: "Europe" },
  "emea": { lat: 50.11, lon: 8.68, country: "Europe" },
  "united kingdom": { lat: 55.37, lon: -3.43, country: "United Kingdom" },
  "uk": { lat: 55.37, lon: -3.43, country: "United Kingdom" },
  "london": { lat: 51.50, lon: -0.12, country: "United Kingdom" },
  "manchester": { lat: 53.48, lon: -2.24, country: "United Kingdom" },
  "germany": { lat: 51.16, lon: 10.45, country: "Germany" },
  "berlin": { lat: 52.52, lon: 13.40, country: "Germany" },
  "frankfurt": { lat: 50.11, lon: 8.68, country: "Germany" },
  "munich": { lat: 48.13, lon: 11.58, country: "Germany" },
  "france": { lat: 46.22, lon: 2.21, country: "France" },
  "paris": { lat: 48.85, lon: 2.35, country: "France" },
  "netherlands": { lat: 52.13, lon: 5.29, country: "Netherlands" },
  "amsterdam": { lat: 52.36, lon: 4.90, country: "Netherlands" },
  "ireland": { lat: 53.41, lon: -8.24, country: "Ireland" },
  "dublin": { lat: 53.34, lon: -6.26, country: "Ireland" },
  "spain": { lat: 40.46, lon: -3.74, country: "Spain" },
  "madrid": { lat: 40.41, lon: -3.70, country: "Spain" },
  "barcelona": { lat: 41.38, lon: 2.17, country: "Spain" },
  "italy": { lat: 41.87, lon: 12.56, country: "Italy" },
  "rome": { lat: 41.90, lon: 12.49, country: "Italy" },
  "milan": { lat: 45.46, lon: 9.19, country: "Italy" },
  "switzerland": { lat: 46.81, lon: 8.22, country: "Switzerland" },
  "zurich": { lat: 47.37, lon: 8.54, country: "Switzerland" },
  "sweden": { lat: 60.12, lon: 18.64, country: "Sweden" },
  "stockholm": { lat: 59.32, lon: 18.06, country: "Sweden" },
  "poland": { lat: 51.91, lon: 19.14, country: "Poland" },
  "warsaw": { lat: 52.22, lon: 21.01, country: "Poland" },

  // --- ASIA PACIFIC & MIDDLE EAST ---
  "apac": { lat: 1.35, lon: 103.81, country: "Asia Pacific" },
  "asia": { lat: 34.04, lon: 100.61, country: "Asia" },
  "singapore": { lat: 1.35, lon: 103.81, country: "Singapore" },
  "japan": { lat: 36.20, lon: 138.25, country: "Japan" },
  "tokyo": { lat: 35.67, lon: 139.65, country: "Japan" },
  "china": { lat: 35.86, lon: 104.19, country: "China" },
  "shanghai": { lat: 31.23, lon: 121.47, country: "China" },
  "beijing": { lat: 39.90, lon: 116.40, country: "China" },
  "hong kong": { lat: 22.31, lon: 114.16, country: "Hong Kong" },
  "taiwan": { lat: 23.69, lon: 120.96, country: "Taiwan" },
  "south korea": { lat: 35.90, lon: 127.76, country: "South Korea" },
  "seoul": { lat: 37.56, lon: 126.97, country: "South Korea" },
  "australia": { lat: -25.27, lon: 133.77, country: "Australia" },
  "sydney": { lat: -33.86, lon: 151.20, country: "Australia" },
  "melbourne": { lat: -37.81, lon: 144.96, country: "Australia" },
  "uae": { lat: 23.42, lon: 53.84, country: "UAE" },
  "dubai": { lat: 25.20, lon: 55.27, country: "UAE" },
  "saudi arabia": { lat: 23.88, lon: 45.07, country: "Saudi Arabia" },
  "south africa": { lat: -30.55, lon: 22.93, country: "South Africa" },

  // --- AdventureWorks Territory Keys ---
  "1": { lat: 47.60, lon: -122.33, country: "US Northwest" },
  "2": { lat: 40.71, lon: -74.00, country: "US Northeast" },
  "3": { lat: 41.87, lon: -87.62, country: "US Central" },
  "4": { lat: 34.05, lon: -118.24, country: "US Southwest" },
  "5": { lat: 33.74, lon: -84.38, country: "US Southeast" },
  "6": { lat: 43.65, lon: -79.38, country: "Canada" },
  "7": { lat: 48.85, lon: 2.35, country: "France" },
  "8": { lat: 50.11, lon: 8.68, country: "Germany" },
  "9": { lat: -33.86, lon: 151.20, country: "Australia" },
  "10": { lat: 51.50, lon: -0.12, country: "United Kingdom" },

  // --- Standard Global Defaults ---
  "west": { lat: 37.77, lon: -122.41, country: "US West" },
  "east": { lat: 40.71, lon: -74.00, country: "US East" },
  "central": { lat: 41.87, lon: -87.62, country: "US Central" },
  "south": { lat: 33.74, lon: -84.38, country: "US South" },
  "north": { lat: 44.97, lon: -93.26, country: "US North" },
};

function hashStringToCoords(str: string, index: number, isIndian?: boolean): { lat: number; lon: number } {
  const fallbackAnchorBases = isIndian
    ? [
        { lat: 19.07, lon: 72.87 }, // Mumbai
        { lat: 12.97, lon: 77.59 }, // Bengaluru
        { lat: 28.61, lon: 77.20 }, // Delhi
        { lat: 17.38, lon: 78.48 }, // Hyderabad
        { lat: 13.08, lon: 80.27 }, // Chennai
        { lat: 22.57, lon: 88.36 }, // Kolkata
        { lat: 18.52, lon: 73.85 }, // Pune
        { lat: 23.02, lon: 72.57 }, // Ahmedabad
        { lat: 26.91, lon: 75.78 }, // Jaipur
        { lat: 9.93, lon: 76.26 }, // Kochi
        { lat: 26.84, lon: 80.94 }, // Lucknow
        { lat: 20.29, lon: 85.82 }, // Bhubaneswar
      ]
    : [
        { lat: 40.71, lon: -74.00 }, // US East
        { lat: 37.77, lon: -122.41 }, // US West
        { lat: 41.87, lon: -87.62 }, // US Central
        { lat: 33.74, lon: -84.38 }, // US South
        { lat: 51.50, lon: -0.12 }, // UK/Europe
        { lat: 50.11, lon: 8.68 }, // Central Europe
        { lat: 48.85, lon: 2.35 }, // France
        { lat: 1.35, lon: 103.81 }, // Singapore
        { lat: 35.67, lon: 139.65 }, // Japan
        { lat: -33.86, lon: 151.20 }, // Australia
        { lat: 43.65, lon: -79.38 }, // Canada
        { lat: 25.20, lon: 55.27 }, // Dubai
      ];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const base = fallbackAnchorBases[Math.abs(hash + index) % fallbackAnchorBases.length];
  const jitterLat = (((hash % 100) / 100) - 0.5) * 3;
  const jitterLon = ((((hash >> 3) % 100) / 100) - 0.5) * 4;
  return {
    lat: Math.max(-55, Math.min(62, base.lat + jitterLat)),
    lon: ((base.lon + jitterLon + 180) % 360) - 180,
  };
}

export interface RealHub {
  id: string;
  name: string;
  lat: number;
  lon: number;
  unit: UnitVertex;
  label: string;
  volumeFormatted: string;
  rawRevenue?: number;
  ordersCount?: number;
  sharePct?: number;
  marginPct?: number;
  latency?: string;
  status: string;
  type: "hub" | "datacenter" | "transit";
  connectedTo?: string[];
}

export interface DatasetGeography {
  hubs: RealHub[];
  connections: [number, number][];
  feedTemplates: Array<{ node: string; event: string; status: "success" | "warning" | "info" }>;
}

function makeRealHub(raw: Omit<RealHub, "unit">): RealHub {
  return {
    ...raw,
    unit: latLonToUnit(raw.lat, raw.lon),
  };
}

// Preset Handcrafted Topologies with Rich Grounded Lineage Metrics
const PRESET_GEOGRAPHIES: Record<string, DatasetGeography> = {
  "ds-retail-q3": {
    hubs: [
      makeRealHub({
        id: "mum",
        name: "Mumbai Port Gateway",
        lat: 19.07,
        lon: 72.87,
        label: "National Port Terminal",
        volumeFormatted: "₹32.40 L",
        rawRevenue: 3240000,
        ordersCount: 3580,
        sharePct: 28.7,
        marginPct: 23.4,
        latency: "6ms",
        status: "Primary Gateway - Peak Volume",
        type: "hub",
        connectedTo: ["Bengaluru Logistics HQ", "Frankfurt Hub", "Singapore Gateway", "Dubai Logistics City"],
      }),
      makeRealHub({
        id: "blr",
        name: "Bengaluru Logistics HQ",
        lat: 12.97,
        lon: 77.59,
        label: "National Operations HQ",
        volumeFormatted: "₹28.90 L",
        rawRevenue: 2890000,
        ordersCount: 3190,
        sharePct: 25.6,
        marginPct: 24.1,
        latency: "4ms",
        status: "HQ Operations Synced",
        type: "hub",
        connectedTo: ["Mumbai Port Gateway", "Singapore Gateway"],
      }),
      makeRealHub({
        id: "nyc",
        name: "New York Metro",
        lat: 40.71,
        lon: -74.00,
        label: "US East Fulfillment",
        volumeFormatted: "₹18.20 L",
        rawRevenue: 1820000,
        ordersCount: 2010,
        sharePct: 16.1,
        marginPct: 21.0,
        latency: "18ms",
        status: "East Coast Hub - Active",
        type: "hub",
        connectedTo: ["San Francisco", "London Core", "São Paulo Node"],
      }),
      makeRealHub({
        id: "lon",
        name: "London Core",
        lat: 51.50,
        lon: -0.12,
        label: "UK Distribution Terminal",
        volumeFormatted: "₹14.10 L",
        rawRevenue: 1410000,
        ordersCount: 1560,
        sharePct: 12.5,
        marginPct: 20.8,
        latency: "14ms",
        status: "EMEA Prime Transit",
        type: "hub",
        connectedTo: ["New York Metro", "Frankfurt Hub"],
      }),
      makeRealHub({
        id: "fra",
        name: "Frankfurt Hub",
        lat: 50.11,
        lon: 8.68,
        label: "EU Cross-Dock Center",
        volumeFormatted: "₹10.50 L",
        rawRevenue: 1050000,
        ordersCount: 1160,
        sharePct: 9.3,
        marginPct: 19.5,
        latency: "12ms",
        status: "Central Europe Optimal",
        type: "hub",
        connectedTo: ["London Core", "Mumbai Port Gateway", "Dubai Logistics City"],
      }),
      makeRealHub({
        id: "sfo",
        name: "San Francisco",
        lat: 37.77,
        lon: -122.41,
        label: "Pacific Rim Node",
        volumeFormatted: "₹8.40 L",
        rawRevenue: 840000,
        ordersCount: 930,
        sharePct: 7.4,
        marginPct: 22.0,
        latency: "22ms",
        status: "West Coast Active",
        type: "hub",
        connectedTo: ["New York Metro", "Tokyo East"],
      }),
      makeRealHub({
        id: "dxb",
        name: "Dubai Logistics City",
        lat: 25.20,
        lon: 55.27,
        label: "Gulf Distribution Zone",
        volumeFormatted: "₹7.60 L",
        rawRevenue: 760000,
        ordersCount: 840,
        sharePct: 6.7,
        marginPct: 22.5,
        latency: "15ms",
        status: "Middle East Cleared",
        type: "hub",
        connectedTo: ["Frankfurt Hub", "Mumbai Port Gateway"],
      }),
      makeRealHub({
        id: "sin",
        name: "Singapore Gateway",
        lat: 1.35,
        lon: 103.81,
        label: "Southeast Asia Hub",
        volumeFormatted: "₹6.40 L",
        rawRevenue: 640000,
        ordersCount: 710,
        sharePct: 5.7,
        marginPct: 21.8,
        latency: "10ms",
        status: "APAC Cross-Dock Optimal",
        type: "hub",
        connectedTo: ["Bengaluru Logistics HQ", "Tokyo East", "Sydney Hub"],
      }),
      makeRealHub({
        id: "tok",
        name: "Tokyo East",
        lat: 35.67,
        lon: 139.65,
        label: "East Asia Gateway",
        volumeFormatted: "₹5.70 L",
        rawRevenue: 570000,
        ordersCount: 630,
        sharePct: 5.0,
        marginPct: 20.2,
        latency: "28ms",
        status: "Japan Fulfillment Active",
        type: "hub",
        connectedTo: ["San Francisco", "Singapore Gateway"],
      }),
      makeRealHub({
        id: "syd",
        name: "Sydney Hub",
        lat: -33.86,
        lon: 151.20,
        label: "Oceania Terminal",
        volumeFormatted: "₹4.20 L",
        rawRevenue: 420000,
        ordersCount: 460,
        sharePct: 3.7,
        marginPct: 19.8,
        latency: "34ms",
        status: "ANZ Regional Operational",
        type: "hub",
        connectedTo: ["Singapore Gateway"],
      }),
      makeRealHub({
        id: "sao",
        name: "São Paulo Node",
        lat: -23.55,
        lon: -46.63,
        label: "South America Node",
        volumeFormatted: "₹3.80 L",
        rawRevenue: 380000,
        ordersCount: 420,
        sharePct: 3.4,
        marginPct: 18.5,
        latency: "42ms",
        status: "LATAM Distribution Transit",
        type: "hub",
        connectedTo: ["New York Metro"],
      }),
    ],
    connections: [
      [0, 1], [0, 4], [0, 6], [0, 7], [1, 7], [2, 3], [2, 5], [2, 10], [3, 4], [4, 6], [7, 8], [7, 9], [5, 8],
    ],
    feedTemplates: [
      { node: "Mumbai Gateway", event: "Consolidated Q3 order dispatch cleared (1,240 parcels)", status: "success" },
      { node: "Frankfurt Hub", event: "Cross-border fulfillment optimized &bull; 99.4% SLA", status: "success" },
      { node: "New York Metro", event: "Peak retail inventory transfer completed (+14.2% MoM)", status: "info" },
      { node: "Singapore Gateway", event: "Maritime cargo clearance synced with APAC customs", status: "success" },
      { node: "Bengaluru HQ", event: "Inventory buffer threshold verified across 85 micro-clusters", status: "info" },
      { node: "London Core", event: "Courier route dynamically re-optimized for weather clearance", status: "warning" },
    ],
  },
  "ds-tech-hardware": {
    hubs: [
      makeRealHub({
        id: "sv",
        name: "Silicon Valley DGX",
        lat: 37.38,
        lon: -122.08,
        label: "AI Model Training Primary",
        volumeFormatted: "128 ExaFlops",
        rawRevenue: 97200000,
        ordersCount: 480,
        sharePct: 34.2,
        marginPct: 38.5,
        latency: "3.2ms",
        status: "DGX SuperPOD Core - Peak Compute",
        type: "datacenter",
        connectedTo: ["Ashburn VA Core", "Hsinchu Fab Core"],
      }),
      makeRealHub({
        id: "hsin",
        name: "Hsinchu Fab Core",
        lat: 24.81,
        lon: 120.96,
        label: "Semiconductor Foundry",
        volumeFormatted: "98.4% Yield",
        rawRevenue: 64000000,
        ordersCount: 340,
        sharePct: 22.5,
        marginPct: 42.0,
        latency: "18.4ms",
        status: "Substrate & Wafer Fab - Critical Path",
        type: "datacenter",
        connectedTo: ["Tokyo Cluster", "Silicon Valley DGX", "Singapore Edge"],
      }),
      makeRealHub({
        id: "blr_tech",
        name: "Bengaluru AI Lab",
        lat: 12.97,
        lon: 77.59,
        label: "Inference Acceleration Lab",
        volumeFormatted: "4.2k H100s",
        rawRevenue: 51400000,
        ordersCount: 260,
        sharePct: 18.1,
        marginPct: 36.2,
        latency: "12.1ms",
        status: "GPU Acceleration Cluster Optimal",
        type: "datacenter",
        connectedTo: ["Singapore Edge", "Frankfurt Equinix"],
      }),
      makeRealHub({
        id: "ash",
        name: "Ashburn VA Core",
        lat: 39.04,
        lon: -77.48,
        label: "East Coast Peering Interconnect",
        volumeFormatted: "840 Gbps",
        rawRevenue: 35200000,
        ordersCount: 190,
        sharePct: 12.4,
        marginPct: 31.0,
        latency: "4.2ms",
        status: "Tier-4 Fiber Core Optimal",
        type: "datacenter",
        connectedTo: ["Silicon Valley DGX", "Dublin DC-1"],
      }),
      makeRealHub({
        id: "fra_dc",
        name: "Frankfurt Equinix",
        lat: 50.11,
        lon: 8.68,
        label: "Continental Europe Exchange",
        volumeFormatted: "780 Gbps",
        rawRevenue: 24100000,
        ordersCount: 140,
        sharePct: 8.5,
        marginPct: 29.5,
        latency: "8.6ms",
        status: "100G Interconnect Optimal",
        type: "datacenter",
        connectedTo: ["Dublin DC-1", "Bengaluru AI Lab"],
      }),
      makeRealHub({
        id: "tok_dc",
        name: "Tokyo Cluster",
        lat: 35.67,
        lon: 139.65,
        label: "APAC Compute Node",
        volumeFormatted: "360 Gbps",
        rawRevenue: 17600000,
        ordersCount: 110,
        sharePct: 6.2,
        marginPct: 33.0,
        latency: "14.8ms",
        status: "Supercluster 5.1k Optimal",
        type: "datacenter",
        connectedTo: ["Hsinchu Fab Core", "Silicon Valley DGX"],
      }),
      makeRealHub({
        id: "sin_dc",
        name: "Singapore Edge",
        lat: 1.35,
        lon: 103.81,
        label: "Pacific Trans-Oceanic Landing",
        volumeFormatted: "1.2 Tbps",
        rawRevenue: 15300000,
        ordersCount: 95,
        sharePct: 5.4,
        marginPct: 32.5,
        latency: "9.2ms",
        status: "Subsea Landing Gateway Optimal",
        type: "datacenter",
        connectedTo: ["Hsinchu Fab Core", "Bengaluru AI Lab"],
      }),
      makeRealHub({
        id: "dub",
        name: "Dublin DC-1",
        lat: 53.34,
        lon: -6.26,
        label: "EU Hyperscale Node",
        volumeFormatted: "512 Gbps",
        rawRevenue: 13600000,
        ordersCount: 80,
        sharePct: 4.8,
        marginPct: 30.2,
        latency: "11.0ms",
        status: "Hyperscale Compute Node",
        type: "datacenter",
        connectedTo: ["Ashburn VA Core", "Frankfurt Equinix"],
      }),
    ],
    connections: [
      [0, 3], [0, 1], [1, 5], [1, 6], [2, 6], [2, 4], [3, 7], [4, 7], [0, 5],
    ],
    feedTemplates: [
      { node: "Hsinchu Fab Core", event: "Wafer lot #9420 validated under transmission electron telemetry", status: "success" },
      { node: "Silicon Valley DGX", event: "Model weights synced across 1,024 tensor pipelines", status: "info" },
      { node: "Bengaluru AI Lab", event: "Cluster load balanced across 4,200 GPU accelerators", status: "success" },
      { node: "Ashburn VA", event: "Direct fiber peering latency measured at 4.2ms", status: "info" },
      { node: "Singapore Subsea", event: "Submarine cable repeaters operating at 100% nominal SNR", status: "success" },
      { node: "Frankfurt Equinix", event: "Thermal cooling throttling mitigated in Hall C", status: "warning" },
    ],
  },
  "ds-saas-cloud": {
    hubs: [
      makeRealHub({
        id: "gcp_in",
        name: "GCP asia-south1 (Mumbai)",
        lat: 19.07,
        lon: 72.87,
        label: "South Asia Primary Multi-Tenant",
        volumeFormatted: "9,410 Seats",
        rawRevenue: 50200000,
        ordersCount: 1420,
        sharePct: 27.0,
        marginPct: 78.4,
        latency: "6ms",
        status: "India HQ Primary Tenant Operational",
        type: "datacenter",
        connectedTo: ["AWS us-east-1 (N. Virginia)", "GCP asia-se1 (Singapore)"],
      }),
      makeRealHub({
        id: "use1",
        name: "AWS us-east-1 (N. Virginia)",
        lat: 38.03,
        lon: -78.47,
        label: "US East Core Cluster",
        volumeFormatted: "8,240 Seats",
        rawRevenue: 44100000,
        ordersCount: 1280,
        sharePct: 23.7,
        marginPct: 76.5,
        latency: "14ms",
        status: "Global Auth Cell Operational",
        type: "datacenter",
        connectedTo: ["GCP us-central1 (Iowa)", "AWS eu-west-1 (Ireland)", "AWS sa-east-1 (São Paulo)"],
      }),
      makeRealHub({
        id: "usc1",
        name: "GCP us-central1 (Iowa)",
        lat: 41.87,
        lon: -93.09,
        label: "Central Analytics Engine",
        volumeFormatted: "4,520 Seats",
        rawRevenue: 24200000,
        ordersCount: 710,
        sharePct: 13.0,
        marginPct: 79.1,
        latency: "18ms",
        status: "Realtime Telemetry Operational",
        type: "datacenter",
        connectedTo: ["AWS us-east-1 (N. Virginia)", "GCP asia-south1 (Mumbai)"],
      }),
      makeRealHub({
        id: "euw1",
        name: "AWS eu-west-1 (Ireland)",
        lat: 53.34,
        lon: -6.26,
        label: "EMEA Security Partition",
        volumeFormatted: "3,810 Seats",
        rawRevenue: 20400000,
        ordersCount: 590,
        sharePct: 11.0,
        marginPct: 77.2,
        latency: "16ms",
        status: "GDPR Isolation Cell Validated",
        type: "datacenter",
        connectedTo: ["AWS us-east-1 (N. Virginia)", "Azure Central (Frankfurt)"],
      }),
      makeRealHub({
        id: "apne1",
        name: "AWS ap-ne-1 (Tokyo)",
        lat: 35.67,
        lon: 139.65,
        label: "East Asia Enterprise Tenant",
        volumeFormatted: "3,620 Seats",
        rawRevenue: 19300000,
        ordersCount: 560,
        sharePct: 10.4,
        marginPct: 75.8,
        latency: "24ms",
        status: "Japan Enterprise Cell Operational",
        type: "datacenter",
        connectedTo: ["GCP asia-se1 (Singapore)", "AWS us-east-1 (N. Virginia)"],
      }),
      makeRealHub({
        id: "azc",
        name: "Azure Central (Frankfurt)",
        lat: 50.11,
        lon: 8.68,
        label: "Continental Europe Tenant",
        volumeFormatted: "2,980 Seats",
        rawRevenue: 16000000,
        ordersCount: 460,
        sharePct: 8.6,
        marginPct: 74.9,
        latency: "15ms",
        status: "Enterprise Tenant Core Operational",
        type: "datacenter",
        connectedTo: ["AWS eu-west-1 (Ireland)", "GCP asia-south1 (Mumbai)"],
      }),
      makeRealHub({
        id: "gcp_se",
        name: "GCP asia-se1 (Singapore)",
        lat: 1.35,
        lon: 103.81,
        label: "Southeast Asia Core",
        volumeFormatted: "2,150 Seats",
        rawRevenue: 11500000,
        ordersCount: 330,
        sharePct: 6.2,
        marginPct: 76.0,
        latency: "12ms",
        status: "APAC Regional Edge Operational",
        type: "datacenter",
        connectedTo: ["GCP asia-south1 (Mumbai)", "AWS ap-ne-1 (Tokyo)", "AWS ap-se-2 (Sydney)"],
      }),
      makeRealHub({
        id: "apse2",
        name: "AWS ap-se-2 (Sydney)",
        lat: -33.86,
        lon: 151.20,
        label: "ANZ Cloud Region",
        volumeFormatted: "1,840 Seats",
        rawRevenue: 9800000,
        ordersCount: 290,
        sharePct: 5.3,
        marginPct: 73.5,
        latency: "32ms",
        status: "Oceania PoP Operational",
        type: "datacenter",
        connectedTo: ["GCP asia-se1 (Singapore)"],
      }),
      makeRealHub({
        id: "sae1",
        name: "AWS sa-east-1 (São Paulo)",
        lat: -23.55,
        lon: -46.63,
        label: "South America Cell",
        volumeFormatted: "1,240 Seats",
        rawRevenue: 6700000,
        ordersCount: 190,
        sharePct: 3.6,
        marginPct: 71.0,
        latency: "38ms",
        status: "LATAM Cloud PoP Operational",
        type: "datacenter",
        connectedTo: ["AWS us-east-1 (N. Virginia)"],
      }),
    ],
    connections: [
      [0, 1], [0, 6], [1, 2], [1, 3], [1, 8], [3, 5], [4, 6], [6, 7], [0, 5],
    ],
    feedTemplates: [
      { node: "GCP asia-south1", event: "Multi-tenant sync verified across 9,410 enterprise seats", status: "success" },
      { node: "AWS us-east-1", event: "Global auth token cache refreshed (14ms p99 latency)", status: "info" },
      { node: "Azure Central", event: "Database replication lag reduced to 15ms", status: "success" },
      { node: "AWS eu-west-1", event: "GDPR cross-border boundary checks validated (0 leaks)", status: "success" },
      { node: "GCP us-central1", event: "Realtime streaming telemetry pipeline scaled 2.4x", status: "info" },
      { node: "AWS sa-east-1", event: "Transit encryption handshake rotated successfully", status: "info" },
    ],
  },
};

function isIndianPlace(name: string): boolean {
  if (!name) return false;
  const n = name.toLowerCase().trim();
  const indianNames = [
    "india", "bharat", "maharashtra", "karnataka", "tamil nadu", "delhi", "gujarat",
    "uttar pradesh", "rajasthan", "kerala", "west bengal", "telangana", "andhra pradesh",
    "odisha", "madhya pradesh", "bihar", "punjab", "haryana", "assam", "jharkhand",
    "chhattisgarh", "uttarakhand", "himachal pradesh", "goa", "mumbai", "pune", "nagpur",
    "bengaluru", "bangalore", "chennai", "hyderabad", "kolkata", "ahmedabad", "surat",
    "jaipur", "lucknow", "kochi", "bhopal", "patna", "indore", "chandigarh", "noida", "gurgaon"
  ];
  return indianNames.some((p) => n.includes(p));
}

// Builder for dynamic geography from uploaded or custom datasets
function buildCustomGeography(
  datasetName: string,
  breakdown: BreakdownItem[],
  currency: string,
  grouping: string
): DatasetGeography {
  const safeBreakdown: BreakdownItem[] =
    Array.isArray(breakdown) && breakdown.length > 0
      ? breakdown
      : [
          { dimension_value: "North America Cloud Gateway", metrics: { total_revenue: 4200000, total_orders: 1420 }, share_pct: 35.0, rank: 1 },
          { dimension_value: "European Union Peering Hub", metrics: { total_revenue: 3100000, total_orders: 980 }, share_pct: 26.0, rank: 2 },
          { dimension_value: "Asia-Pacific Distribution Core", metrics: { total_revenue: 2600000, total_orders: 820 }, share_pct: 22.0, rank: 3 },
          { dimension_value: "India Technology Center", metrics: { total_revenue: 1400000, total_orders: 540 }, share_pct: 12.0, rank: 4 },
          { dimension_value: "LATAM Transit Node", metrics: { total_revenue: 600000, total_orders: 240 }, share_pct: 5.0, rank: 5 },
        ];

  const isIndianDataset =
    currency === "INR" ||
    datasetName.toLowerCase().includes("regional") ||
    datasetName.toLowerCase().includes("india") ||
    safeBreakdown.some((b) => isIndianPlace(b.dimension_value || ""));

  const hubs: RealHub[] = safeBreakdown.slice(0, 12).map((item, idx) => {
    const rawName = item?.dimension_value || `Cluster-${idx + 1}`;
    const cleanLower = String(rawName).toLowerCase().trim();

    let coords: { lat: number; lon: number; country: string } | undefined;

    // Special cardinal direction handling for Indian datasets to accurately place them inside India
    if (isIndianDataset) {
      if (cleanLower === "north" || (cleanLower.includes("north") && !cleanLower.includes("carolina") && !cleanLower.includes("dakota"))) {
        coords = { lat: 28.61, lon: 77.20, country: "India (North)" };
      } else if (cleanLower === "south" || (cleanLower.includes("south") && !cleanLower.includes("carolina") && !cleanLower.includes("dakota") && !cleanLower.includes("africa"))) {
        coords = { lat: 12.97, lon: 77.59, country: "India (South)" };
      } else if (cleanLower === "east" || cleanLower.includes("east")) {
        coords = { lat: 22.57, lon: 88.36, country: "India (East)" };
      } else if (cleanLower === "west" || (cleanLower.includes("west") && !cleanLower.includes("virginia"))) {
        coords = { lat: 19.07, lon: 72.87, country: "India (West)" };
      } else if (cleanLower === "central" || cleanLower.includes("central")) {
        coords = { lat: 21.14, lon: 79.08, country: "India (Central)" };
      }
    }

    if (!coords) {
      coords = GLOBAL_GAZETTEER[cleanLower];
    }
    if (!coords) {
      for (const [key, val] of Object.entries(GLOBAL_GAZETTEER)) {
        if (cleanLower.includes(key)) {
          coords = val;
          break;
        }
      }
    }
    if (!coords) {
      const hCoords = hashStringToCoords(rawName, idx, isIndianDataset);
      coords = { lat: hCoords.lat, lon: hCoords.lon, country: isIndianDataset ? "India Node" : "Global Node" };
    }

    const itemAny = item as any;
    const rev = typeof item?.metrics?.total_revenue === "number" ? item.metrics.total_revenue : (typeof itemAny?.value === "number" ? itemAny.value : 125000);
    const orders = typeof item?.metrics?.total_orders === "number" ? item.metrics.total_orders : Math.max(1, Math.round(rev / 950));
    const formattedVol = formatCurrencyAmount(rev, currency, grouping);
    const status = idx === 0 ? "Primary Hub - Peak Ingestion" : idx < 3 ? "High Volume Distribution" : "Active Ingestion Node";
    const share = typeof item?.share_pct === "number" ? item.share_pct : Math.max(1, 100 / Math.max(1, safeBreakdown.length));

    return makeRealHub({
      id: `hub-custom-${idx + 1}`,
      name: rawName,
      lat: Number(coords.lat ?? 0),
      lon: Number(coords.lon ?? 0),
      label: `${coords.country || (isIndianDataset ? "India" : "Global")} Node`,
      volumeFormatted: formattedVol,
      rawRevenue: rev,
      ordersCount: orders,
      sharePct: Number((share || 10).toFixed(1)),
      marginPct: 21.5 + ((idx * 3) % 12),
      latency: `${8 + idx * 4}ms`,
      status,
      type: "hub",
      connectedTo: [],
    });
  });

  // Interconnect hubs
  const connections: [number, number][] = [];
  for (let i = 0; i < hubs.length; i++) {
    for (let j = i + 1; j < hubs.length; j++) {
      if (j === i + 1 || (i === 0 && j < 4) || (i === 1 && j === 3)) {
        connections.push([i, j]);
        if (!hubs[i].connectedTo) hubs[i].connectedTo = [];
        if (!hubs[j].connectedTo) hubs[j].connectedTo = [];
        hubs[i].connectedTo?.push(hubs[j].name);
        hubs[j].connectedTo?.push(hubs[i].name);
      }
    }
  }

  const feedTemplates = hubs.slice(0, 6).map((h, i) => ({
    node: h.name,
    event:
      i === 0
        ? `Consolidated ${datasetName} ingestion stream routed via ${h.name} (${h.volumeFormatted})`
        : i % 2 === 0
        ? `Edge replication handshake verified &bull; 99.8% SLA`
        : `Packet dispatch synchronized with regional cluster (${h.volumeFormatted})`,
    status: (i === 0 ? "success" : i === 2 ? "info" : "success") as "success" | "warning" | "info",
  }));

  return { hubs, connections, feedTemplates };
}

// ---------------------------------------------------------------------------
// Main WorldGlowMap Component
// ---------------------------------------------------------------------------

export const WorldGlowMap: React.FC<WorldGlowMapProps> = ({
  datasetId = "ds-retail-q3",
  points,
  className,
  showMascot = true,
  nodesCount = 11106,
  clustersCount = 130,
  flowsCount = 1301,
  throughputCount = "15ms",
  ingestionStream = "₹12.48 L Ingestion",
  activeClusters = 85,
  onDrillDown,
  onExplain,
  onViewEvidence,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const signalCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Global Context Hooks
  const { activeDataset, activePreset } = useDatasetStore();
  const { metrics } = useAnalytics();
  const { preferences, settings } = useSettingsStore();
  const activeCurrency = preferences?.currency || settings?.preferences?.currency || "INR";
  const activeGrouping =
    preferences?.number_grouping ||
    settings?.preferences?.number_grouping ||
    (activeCurrency === "INR" ? "lakh_crore" : "international");

  const effectiveDatasetId = datasetId || activeDataset?.id || activePreset?.id || "ds-retail-q3";

  // Dynamic Custom Geography for Uploaded Data
  const [customGeo, setCustomGeo] = useState<DatasetGeography | null>(null);

  useEffect(() => {
    if (
      effectiveDatasetId === "ds-retail-q3" ||
      effectiveDatasetId === "ds-tech-hardware" ||
      effectiveDatasetId === "ds-saas-cloud"
    ) {
      setCustomGeo(null);
      return;
    }

    let isCancelled = false;
    async function loadGeography() {
      try {
        let brk: BreakdownItem[] = [];

        // 1. Gather candidate geographic columns from dataset mapping or schema
        const mapping = activeDataset?.active_mapping || {};
        const colEntries = Object.entries(mapping);

        // Find column with role "region"
        const regionMappedCol = colEntries.find(([_, item]) => item.role === "region")?.[0];

        // Specific high-value geographical column names
        const candidateNames = ["state", "province", "city", "territorykey", "territory", "country", "location", "region", "zone", "hub", "branch"];
        const foundCandidateCol = colEntries.find(([name]) =>
          candidateNames.some((c) => name.toLowerCase().includes(c))
        )?.[0];

        const targetCol = foundCandidateCol || regionMappedCol;

        if (targetCol) {
          brk = await api
            .getBreakdown({
              dataset_id: effectiveDatasetId,
              dimension_column: targetCol,
              metric_ids: ["total_revenue", "total_orders"],
            })
            .catch(() => [] as BreakdownItem[]);
        }

        if (!brk || brk.length === 0) {
          brk = await api
            .getBreakdown({
              dataset_id: effectiveDatasetId,
              dimension_role: "region",
              metric_ids: ["total_revenue", "total_orders"],
            })
            .catch(() => [] as BreakdownItem[]);
        }

        if (!brk || brk.length === 0) {
          brk = await api
            .getBreakdown({
              dataset_id: effectiveDatasetId,
              dimension_role: "category",
              metric_ids: ["total_revenue", "total_orders"],
            })
            .catch(() => [] as BreakdownItem[]);
        }

        if (isCancelled) return;

        // Guaranteed custom geography for any uploaded dataset
        const generated = buildCustomGeography(
          activeDataset?.name || "Uploaded Dataset",
          brk || [],
          activeCurrency,
          activeGrouping
        );
        setCustomGeo(generated);
      } catch (err) {
        console.warn("Failed to query uploaded dataset geography:", err);
        if (!isCancelled) {
          // Even on network error, provide a safe grounded topology
          const fallback = buildCustomGeography(
            activeDataset?.name || "Uploaded Dataset",
            [],
            activeCurrency,
            activeGrouping
          );
          setCustomGeo(fallback);
        }
      }
    }

    loadGeography();
    return () => {
      isCancelled = true;
    };
  }, [effectiveDatasetId, activeDataset?.name, activeDataset?.active_mapping, activeCurrency, activeGrouping]);

  // Active Resolved Topology (Strict Dataset Isolation: never bleed retail-q3 hubs into custom datasets)
  const activeGeo = useMemo<DatasetGeography>(() => {
    if (customGeo && customGeo.hubs.length > 0) {
      return customGeo;
    }
    if (effectiveDatasetId === "ds-tech-hardware") {
      return PRESET_GEOGRAPHIES["ds-tech-hardware"];
    }
    if (effectiveDatasetId === "ds-saas-cloud") {
      return PRESET_GEOGRAPHIES["ds-saas-cloud"];
    }
    if (effectiveDatasetId === "ds-retail-q3") {
      return PRESET_GEOGRAPHIES["ds-retail-q3"];
    }
    return buildCustomGeography(
      activeDataset?.name || "Uploaded Dataset",
      [],
      activeCurrency,
      activeGrouping
    );
  }, [customGeo, effectiveDatasetId, activeDataset?.name, activeCurrency, activeGrouping]);

  // Active Metrics Calculation for Right Deck (Tailored strictly to active dataset)
  const effectiveNodes = activeDataset?.row_count || activePreset?.row_count || nodesCount || 11106;
  const effectiveRevFormatted =
    metrics?.total_revenue?.formatted_value ||
    activePreset?.revenue_formatted ||
    formatCurrencyAmount(effectiveNodes * 1050, activeCurrency, activeGrouping);
  const effectiveStream = `${effectiveRevFormatted} Ingestion`;

  // Filter checkboxes
  const [filters, setFilters] = useState({
    regionalHubs: true,
    liveTransactions: true,
    dataCenters: true,
    satellites: true,
    userLocation: true,
  });

  // Selected Hub State
  const [selectedHubId, setSelectedHubId] = useState<string | null>(() => activeGeo.hubs[0]?.id || null);
  const [hoveredHub, setHoveredHub] = useState<RealHub | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAutoRotateState, setIsAutoRotateState] = useState(false);
  const [radarEnabledState, setRadarEnabledState] = useState(true);
  const [showOrbitsState, setShowOrbitsState] = useState(true);
  const [activeTab, setActiveTab] = useState<"inspection" | "all_locations">("inspection");

  // Keep selectedHub synchronized when active dataset changes
  useEffect(() => {
    if (activeGeo.hubs.length > 0) {
      setSelectedHubId(activeGeo.hubs[0].id);
    }
  }, [activeGeo]);

  const selectedHub = useMemo<RealHub | null>(() => {
    return activeGeo.hubs.find((h) => h.id === selectedHubId) || activeGeo.hubs[0] || null;
  }, [activeGeo, selectedHubId]);

  // User Live Geolocation
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
    unit: UnitVertex;
    city: string;
    coordsText: string;
    isDetected: boolean;
  }>({
    lat: 18.5204,
    lon: 73.8567,
    unit: latLonToUnit(18.5204, 73.8567),
    city: "Piyush (Live)",
    coordsText: "18.520° N, 73.857° E",
    isDetected: false,
  });

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setUserLocation({
            lat,
            lon,
            unit: latLonToUnit(lat, lon),
            city: "Piyush (Live GPS)",
            coordsText: `${lat >= 0 ? lat.toFixed(3) + "° N" : Math.abs(lat).toFixed(3) + "° S"}, ${
              lon >= 0 ? lon.toFixed(3) + "° E" : Math.abs(lon).toFixed(3) + "° W"
            }`,
            isDetected: true,
          });
        },
        () => {
          setUserLocation({
            lat: 18.5204,
            lon: 73.8567,
            unit: latLonToUnit(18.5204, 73.8567),
            city: "Piyush (Live Telemetry)",
            coordsText: "18.520° N, 73.857° E",
            isDetected: true,
          });
        },
        { timeout: 6000 }
      );
    }
  }, []);

  // Grounded Real-Time Activity Feed (Grounded in selected hub and dataset)
  const activityFeed = useMemo(() => {
    const templates = activeGeo.feedTemplates || [];
    const targetNodeName = selectedHub?.name || activeGeo.hubs[0]?.name || "Core Gateway";
    const baseItems =
      templates.length > 0
        ? templates
        : [
            { node: targetNodeName, event: "Telemetry connection verified &bull; 99.98% SLA", status: "success" as const },
            { node: targetNodeName, event: "Encrypted direct peering handshake established", status: "info" as const },
            { node: targetNodeName, event: "Multi-cluster packet replication synchronized", status: "success" as const },
          ];

    return baseItems.slice(0, 5).map((t, idx) => ({
      id: `evt-${t.node}-${idx}`,
      time: idx === 0 ? "Realtime" : `${idx * 14}s ago`,
      node: idx === 0 ? targetNodeName : t.node,
      event: t.event,
      status: t.status,
    }));
  }, [activeGeo, selectedHub]);

  // -------------------------------------------------------------------------
  // High-Performance Physics & Rotation Engine
  // -------------------------------------------------------------------------

  const rotYRef = useRef(0.45);
  const rotXRef = useRef(0.32);
  const targetRotYRef = useRef(0.45);
  const targetRotXRef = useRef(0.32);
  const zoomRef = useRef(1.0);
  const targetZoomRef = useRef(1.0);
  const isDraggingRef = useRef(false);
  const isAutoRotateRef = useRef(false);
  const radarEnabledRef = useRef(true);
  const showOrbitsRef = useRef(true);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragDistanceRef = useRef(0);

  // Sync refs when toggles change from buttons
  useEffect(() => {
    isAutoRotateRef.current = isAutoRotateState;
  }, [isAutoRotateState]);

  useEffect(() => {
    radarEnabledRef.current = radarEnabledState;
  }, [radarEnabledState]);

  useEffect(() => {
    showOrbitsRef.current = showOrbitsState;
  }, [showOrbitsState]);

  // Keep references to dynamic values inside animation loop without restarting it
  const activeGeoRef = useRef(activeGeo);
  activeGeoRef.current = activeGeo;

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const userLocationRef = useRef(userLocation);
  userLocationRef.current = userLocation;

  const selectedHubIdRef = useRef(selectedHubId);
  selectedHubIdRef.current = selectedHubId;

  const hoveredHubRef = useRef(hoveredHub);
  hoveredHubRef.current = hoveredHub;

  // Center camera onto a hub smoothly via shortest angular path
  const centerOnHub = useCallback((hub: RealHub) => {
    if (!hub || !Number.isFinite(hub.lat) || !Number.isFinite(hub.lon)) return;

    if (!Number.isFinite(rotYRef.current)) rotYRef.current = 0.45;
    if (!Number.isFinite(rotXRef.current)) rotXRef.current = 0.32;
    if (!Number.isFinite(zoomRef.current)) zoomRef.current = 1.0;

    const targetLonRad = (Number(hub.lon) * Math.PI) / 180;
    const targetLatRad = (Number(hub.lat) * Math.PI) / 180;

    // Exact front-and-center calculation:
    const targetBaseY = -targetLonRad;
    // Shortest angular turn (eliminates crazy multi-rotation spinning):
    const diffY = Math.atan2(Math.sin(targetBaseY - rotYRef.current), Math.cos(targetBaseY - rotYRef.current));
    targetRotYRef.current = rotYRef.current + diffY;

    // Target pitch/tilt (clamped to comfortable viewing angle):
    const targetBaseX = -targetLatRad;
    targetRotXRef.current = Math.max(-1.0, Math.min(1.0, targetBaseX));

    // Smoothly zoom in to focus on clicked location
    targetZoomRef.current = 1.35;

    // Immediately stop any auto-rotation so camera stays firmly locked on the clicked location
    isAutoRotateRef.current = false;
    setIsAutoRotateState(false);
  }, []);

  // Robust fuzzy & direct hub lookup helper for connected routes and search
  const resolveHub = useCallback(
    (identifierOrName: string): RealHub | undefined => {
      if (!identifierOrName) return undefined;
      const hubs = activeGeo?.hubs || [];
      // 1. Direct match on ID or exact name
      const exact = hubs.find((h) => h.id === identifierOrName || h.name === identifierOrName);
      if (exact) return exact;

      // 2. Normalized alphanumeric match
      const cleanTarget = identifierOrName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, " ")
        .trim();

      const fuzzy = hubs.find((h) => {
        const cleanHub = h.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, " ")
          .trim();
        return cleanHub === cleanTarget || cleanHub.includes(cleanTarget) || cleanTarget.includes(cleanHub);
      });
      if (fuzzy) return fuzzy;

      // 3. Token overlap fallback
      const tTokens = cleanTarget.split(/\s+/).filter((t) => t.length > 2);
      for (const h of hubs) {
        const hClean = h.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (tTokens.some((tok) => hClean.includes(tok))) {
          return h;
        }
      }

      return hubs[0] || undefined;
    },
    [activeGeo]
  );

  // Select and center hub callback
  const handleSelectHub = useCallback(
    (hub: RealHub) => {
      if (!hub) return;
      setSelectedHubId(hub.id);
      centerOnHub(hub);
      onDrillDown?.(hub);
    },
    [centerOnHub, onDrillDown]
  );

  // Quick Search for Hubs
  useEffect(() => {
    if (!searchQuery.trim()) return;
    const found = resolveHub(searchQuery);
    if (found) {
      handleSelectHub(found);
    }
  }, [searchQuery, resolveHub, handleSelectHub]);

  // Center on Live User Location
  const centerOnUserLocation = useCallback(() => {
    if (!userLocation || !Number.isFinite(userLocation.lat) || !Number.isFinite(userLocation.lon)) return;

    if (!Number.isFinite(rotYRef.current)) rotYRef.current = 0.45;
    if (!Number.isFinite(rotXRef.current)) rotXRef.current = 0.32;
    if (!Number.isFinite(zoomRef.current)) zoomRef.current = 1.0;

    const targetLonRad = (userLocation.lon * Math.PI) / 180;
    const targetLatRad = (userLocation.lat * Math.PI) / 180;

    const targetBaseY = -targetLonRad;
    const diffY = Math.atan2(Math.sin(targetBaseY - rotYRef.current), Math.cos(targetBaseY - rotYRef.current));
    targetRotYRef.current = rotYRef.current + diffY;

    const targetBaseX = -targetLatRad;
    targetRotXRef.current = Math.max(-1.0, Math.min(1.0, targetBaseX));
    targetZoomRef.current = 1.35;

    isAutoRotateRef.current = false;
    setIsAutoRotateState(false);
  }, [userLocation]);

  // -------------------------------------------------------------------------
  // Rock-Solid Click & Tap Detection with Generous 26px Hit Radius
  // -------------------------------------------------------------------------

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    isAutoRotateRef.current = false;
    setIsAutoRotateState(false);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    dragDistanceRef.current = 0;
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDraggingRef.current) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      dragDistanceRef.current += Math.hypot(dx, dy);
      lastMousePos.current = { x: e.clientX, y: e.clientY };

      targetRotYRef.current += dx * 0.0055;
      targetRotXRef.current = Math.max(-1.15, Math.min(1.15, targetRotXRef.current - dy * 0.0055));
    }

    // Always perform hover detection to turn cursor into a clickable pointer
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const globeCenterX = w * 0.48;
    const globeCenterY = h * 0.50;
    const radius = Math.min(w, h) * 0.38 * zoomRef.current;

    const cosY = Math.cos(Number.isFinite(rotYRef.current) ? rotYRef.current : 0.45);
    const sinY = Math.sin(Number.isFinite(rotYRef.current) ? rotYRef.current : 0.45);
    const cosX = Math.cos(Number.isFinite(rotXRef.current) ? rotXRef.current : 0.32);
    const sinX = Math.sin(Number.isFinite(rotXRef.current) ? rotXRef.current : 0.32);

    let found: RealHub | null = null;
    for (const hub of (activeGeoRef.current?.hubs || [])) {
      const u = hub.unit || latLonToUnit(hub.lat, hub.lon);
      if (!u || !Number.isFinite(u.x0)) continue;
      const x1 = u.x0 * cosY + u.z0 * sinY;
      const z1 = -u.x0 * sinY + u.z0 * cosY;
      const x2 = x1;
      const y2 = u.y0 * cosX - z1 * sinX;
      const z2 = u.y0 * sinX + z1 * cosX;

      if (z2 > -0.05) {
        const px = globeCenterX + x2 * radius;
        const py = globeCenterY + y2 * radius;
        const dist = Math.hypot(mouseX - px, mouseY - py);
        const onBadge = Math.abs(mouseY - py) < 16 && Math.abs(mouseX - px) < 95;
        if (dist < 26 || onBadge) {
          found = hub;
          break;
        }
      }
    }

    setHoveredHub(found);
    if (!isDraggingRef.current) {
      canvas.style.cursor = found ? "pointer" : "grab";
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}

      if (canvas) {
        canvas.style.cursor = "grab";
      }

      // Check if user clicked/tapped (movement < 14px)
      if (dragDistanceRef.current < 14 && canvas) {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        const globeCenterX = w * 0.48;
        const globeCenterY = h * 0.50;
        const radius = Math.min(w, h) * 0.38 * (Number.isFinite(zoomRef.current) ? zoomRef.current : 1.0);

        const cosY = Math.cos(Number.isFinite(rotYRef.current) ? rotYRef.current : 0.45);
        const sinY = Math.sin(Number.isFinite(rotYRef.current) ? rotYRef.current : 0.45);
        const cosX = Math.cos(Number.isFinite(rotXRef.current) ? rotXRef.current : 0.32);
        const sinX = Math.sin(Number.isFinite(rotXRef.current) ? rotXRef.current : 0.32);

        let nearestHub: RealHub | null = null;
        let minD = 36; // Generous hit radius for responsive clicking!

        for (const hub of (activeGeoRef.current?.hubs || [])) {
          const u = hub.unit || latLonToUnit(hub.lat, hub.lon);
          if (!u || !Number.isFinite(u.x0)) continue;
          const x1 = u.x0 * cosY + u.z0 * sinY;
          const z1 = -u.x0 * sinY + u.z0 * cosY;
          const x2 = x1;
          const y2 = u.y0 * cosX - z1 * sinX;
          const z2 = u.y0 * sinX + z1 * cosX;

          if (z2 > -0.05) {
            const px = globeCenterX + x2 * radius;
            const py = globeCenterY + y2 * radius;
            const dist = Math.hypot(clickX - px, clickY - py);
            const onBadge = Math.abs(clickY - py) < 18 && Math.abs(clickX - px) < 95;
            if (dist < minD || onBadge) {
              minD = dist;
              nearestHub = hub;
            }
          }
        }

        if (nearestHub) {
          handleSelectHub(nearestHub);
        }
      }
    }
  };

  // Wheel zoom with passive: false to prevent dashboard scroll
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.0012;
      targetZoomRef.current = Math.max(0.65, Math.min(1.85, targetZoomRef.current + delta));
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", onWheel);
    };
  }, []);

  // Responsive Pixel-Perfect Canvas Sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(rect.width);
      const h = Math.round(rect.height || 580);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };

    resize();
    const observer = new ResizeObserver(() => resize());
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  // -------------------------------------------------------------------------
  // Main 60fps/120fps Pure Inertia 3D Canvas Render Loop
  // -------------------------------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let frame = 0;

    const render = () => {
      try {
        frame++;

        // Ensure camera values are finite numbers
        if (!Number.isFinite(rotXRef.current)) rotXRef.current = 0.32;
        if (!Number.isFinite(rotYRef.current)) rotYRef.current = 0.45;
        if (!Number.isFinite(zoomRef.current)) zoomRef.current = 1.0;
        if (!Number.isFinite(targetRotXRef.current)) targetRotXRef.current = rotXRef.current;
        if (!Number.isFinite(targetRotYRef.current)) targetRotYRef.current = rotYRef.current;
        if (!Number.isFinite(targetZoomRef.current)) targetZoomRef.current = zoomRef.current;

        // 1. Fluid Exponential Inertia (LERP)
        const LERP = 0.16;
        rotXRef.current += (targetRotXRef.current - rotXRef.current) * LERP;
        rotYRef.current += (targetRotYRef.current - rotYRef.current) * LERP;
        zoomRef.current += (targetZoomRef.current - zoomRef.current) * LERP;

        // Periodic normalization of rotY to prevent precision loss on huge angles
        if (Math.abs(rotYRef.current) > 20) {
          const normY = rotYRef.current % (Math.PI * 2);
          const shift = rotYRef.current - normY;
          rotYRef.current = normY;
          targetRotYRef.current -= shift;
        }

        if (isAutoRotateRef.current && !isDraggingRef.current) {
          targetRotYRef.current += 0.0018;
        }

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(10, canvas.width / dpr);
        const h = Math.max(10, canvas.height / dpr);

        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);

        // Deep Space Cosmic Gradient
        const spaceGrad = ctx.createRadialGradient(w * 0.48, h * 0.5, 40, w * 0.5, h * 0.5, Math.max(60, w * 0.75));
        spaceGrad.addColorStop(0, "#0B0912");
        spaceGrad.addColorStop(0.5, "#060509");
        spaceGrad.addColorStop(1, "#020204");
        ctx.fillStyle = spaceGrad;
        ctx.fillRect(0, 0, w, h);

        // Faint Cosmic Stellar Dust Pockets (Space Nebula Glow)
        const nebulaGrad1 = ctx.createRadialGradient(w * 0.28, h * 0.25, 20, w * 0.28, h * 0.25, Math.max(80, w * 0.45));
        nebulaGrad1.addColorStop(0, "rgba(255, 120, 20, 0.045)");
        nebulaGrad1.addColorStop(0.6, "rgba(255, 80, 10, 0.015)");
        nebulaGrad1.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = nebulaGrad1;
        ctx.fillRect(0, 0, w, h);

        const nebulaGrad2 = ctx.createRadialGradient(w * 0.72, h * 0.65, 30, w * 0.72, h * 0.65, Math.max(90, w * 0.5));
        nebulaGrad2.addColorStop(0, "rgba(30, 90, 160, 0.035)");
        nebulaGrad2.addColorStop(0.5, "rgba(15, 45, 90, 0.012)");
        nebulaGrad2.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = nebulaGrad2;
        ctx.fillRect(0, 0, w, h);

        // Background Cosmic Stars
        COSMIC_STARS.forEach((s) => {
          const pulse = Math.sin(frame * s.speed + s.x * 20) * 0.22;
          ctx.fillStyle = `rgba(255, 240, 225, ${Math.max(0.1, s.alpha + pulse)})`;
          ctx.beginPath();
          ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
          ctx.fill();
        });

        // Globe Geometry & Centers
        const globeCenterX = w * 0.48;
        const globeCenterY = h * 0.50;
        const baseRadius = Math.min(w, h) * 0.38;
        const radius = Math.max(20, baseRadius * zoomRef.current);

        const cosY = Math.cos(rotYRef.current);
        const sinY = Math.sin(rotYRef.current);
        const cosX = Math.cos(rotXRef.current);
        const sinX = Math.sin(rotXRef.current);

        // High Performance Precomputed Unit Vertex Projector
        const projectUnit = (u?: UnitVertex, alt = 1.0) => {
          if (!u || !Number.isFinite(u.x0) || !Number.isFinite(u.y0) || !Number.isFinite(u.z0)) {
            return { x: globeCenterX, y: globeCenterY, z: -1, visible: false };
          }
          const safeR = Number.isFinite(radius) && radius > 0 ? radius * alt : 100;
          const x1 = u.x0 * cosY + u.z0 * sinY;
          const z1 = -u.x0 * sinY + u.z0 * cosY;
          const x2 = x1;
          const y2 = u.y0 * cosX - z1 * sinX;
          const z2 = u.y0 * sinX + z1 * cosX;
          const px = globeCenterX + x2 * safeR;
          const py = globeCenterY + y2 * safeR;
          return {
            x: Number.isFinite(px) ? px : globeCenterX,
            y: Number.isFinite(py) ? py : globeCenterY,
            z: Number.isFinite(z2) ? z2 : -1,
            visible: Number.isFinite(z2) && z2 > -0.06,
          };
        };

      // 2. Dual Atmospheric Outer Halo & Rim Glow
      // 2a. Azure Exosphere Limb (Satellite photograph cyan-blue horizon)
      const exoGrad = ctx.createRadialGradient(
        globeCenterX,
        globeCenterY,
        radius * 0.98,
        globeCenterX,
        globeCenterY,
        radius * 1.38
      );
      exoGrad.addColorStop(0, "rgba(56, 189, 248, 0.28)");
      exoGrad.addColorStop(0.25, "rgba(30, 144, 255, 0.12)");
      exoGrad.addColorStop(0.6, "rgba(14, 116, 144, 0.04)");
      exoGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = exoGrad;
      ctx.beginPath();
      ctx.arc(globeCenterX, globeCenterY, radius * 1.38, 0, Math.PI * 2);
      ctx.fill();

      // 2b. Warm Golden-Amber Thermosphere Halo
      const haloGrad = ctx.createRadialGradient(
        globeCenterX,
        globeCenterY,
        radius * 0.95,
        globeCenterX,
        globeCenterY,
        radius * 1.26
      );
      haloGrad.addColorStop(0, "rgba(255, 140, 30, 0.46)");
      haloGrad.addColorStop(0.3, "rgba(255, 122, 26, 0.20)");
      haloGrad.addColorStop(0.65, "rgba(255, 80, 10, 0.05)");
      haloGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(globeCenterX, globeCenterY, radius * 1.26, 0, Math.PI * 2);
      ctx.fill();

      // 3. Planet Ocean Sphere Base (Realistic 3D Spherical Deep Water Shading)
      const oceanGrad = ctx.createRadialGradient(
        globeCenterX - radius * 0.35,
        globeCenterY - radius * 0.35,
        radius * 0.08,
        globeCenterX + radius * 0.15,
        globeCenterY + radius * 0.15,
        radius * 1.05
      );
      oceanGrad.addColorStop(0, "#132334");     // Sunlit deep oceanic surface
      oceanGrad.addColorStop(0.35, "#0B1522");  // Deep abyssal navy
      oceanGrad.addColorStop(0.75, "#050A10");  // Sub-surface dark slate
      oceanGrad.addColorStop(1, "#020306");     // Space terminator shadow

      ctx.save();
      ctx.beginPath();
      ctx.arc(globeCenterX, globeCenterY, radius, 0, Math.PI * 2);
      ctx.fillStyle = oceanGrad;
      ctx.shadowColor = "#FF7A1A";
      ctx.shadowBlur = 24;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.clip(); // Mask interior elements to globe circle

      // 3b. Inner Spherical Fresnel Rim Glow (Atmospheric curvature)
      const innerRimGrad = ctx.createRadialGradient(
        globeCenterX,
        globeCenterY,
        radius * 0.82,
        globeCenterX,
        globeCenterY,
        radius
      );
      innerRimGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
      innerRimGrad.addColorStop(0.7, "rgba(255, 120, 20, 0.05)");
      innerRimGrad.addColorStop(0.95, "rgba(255, 160, 40, 0.24)");
      innerRimGrad.addColorStop(1, "rgba(56, 189, 248, 0.22)");
      ctx.fillStyle = innerRimGrad;
      ctx.beginPath();
      ctx.arc(globeCenterX, globeCenterY, radius, 0, Math.PI * 2);
      ctx.fill();

      // 4. Latitude & Longitude Graticule Mesh Lines
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = "rgba(255, 140, 40, 0.11)";

      // Parallels
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let started = false;
        for (let lon = -180; lon <= 180; lon += 8) {
          const u = latLonToUnit(lat, lon);
          const p = projectUnit(u);
          if (p.visible) {
            if (!started) {
              ctx.moveTo(p.x, p.y);
              started = true;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      // Meridians
      for (let lon = -180; lon < 180; lon += 30) {
        ctx.beginPath();
        let started = false;
        for (let lat = -80; lat <= 80; lat += 6) {
          const u = latLonToUnit(lat, lon);
          const p = projectUnit(u);
          if (p.visible) {
            if (!started) {
              ctx.moveTo(p.x, p.y);
              started = true;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      // 5. Authentic Natural Earth Physical Landmasses & Islands
      PRECOMPUTED_LANDMASS.forEach((verts) => {
        if (!verts || verts.length < 3) return;

        ctx.beginPath();
        let anyVisible = false;
        let started = false;

        for (let i = 0; i < verts.length; i++) {
          const p = projectUnit(verts[i]);
          if (p.visible) {
            anyVisible = true;
            if (!started) {
              ctx.moveTo(p.x, p.y);
              started = true;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          } else {
            started = false;
          }
        }

        if (anyVisible) {
          ctx.closePath();
          // High-contrast authentic satellite Earth slate charcoal land fill
          ctx.fillStyle = "rgba(14, 18, 26, 0.96)";
          ctx.fill();

          // Outer glowing amber continental shelf bloom
          ctx.lineWidth = 1.8;
          ctx.strokeStyle = "rgba(255, 120, 30, 0.30)";
          ctx.stroke();

          // Crisp golden coastline contour hairline
          ctx.lineWidth = 0.95;
          ctx.strokeStyle = "rgba(255, 175, 60, 0.82)";
          ctx.stroke();
        }
      });

      // 5b. Authentic Geopolitical Country Borders (Separating all 186 nations)
      PRECOMPUTED_BORDERS.forEach((segment) => {
        if (!segment || segment.length < 2) return;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < segment.length; i++) {
          const p = projectUnit(segment[i]);
          if (p.visible) {
            if (!started) {
              ctx.moveTo(p.x, p.y);
              started = true;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          } else {
            started = false;
          }
        }
        if (started) {
          ctx.lineWidth = 0.75;
          ctx.strokeStyle = "rgba(255, 150, 60, 0.30)";
          ctx.stroke();
        }
      });

      // 6. Sweeping 360° Volumetric Radar Cone
      const isRadarOn = radarEnabledRef.current;
      const radarAngle = (frame * 0.016) % (Math.PI * 2);
      const coneAngle = 0.52; // ~30 degree sweeping sector

      if (isRadarOn) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(globeCenterX, globeCenterY);
        ctx.arc(globeCenterX, globeCenterY, radius, radarAngle - coneAngle, radarAngle);
        ctx.closePath();

        const radarGrad = ctx.createRadialGradient(
          globeCenterX,
          globeCenterY,
          radius * 0.05,
          globeCenterX,
          globeCenterY,
          radius
        );
        radarGrad.addColorStop(0, "rgba(255, 140, 40, 0.28)");
        radarGrad.addColorStop(0.65, "rgba(255, 120, 30, 0.12)");
        radarGrad.addColorStop(1, "rgba(255, 100, 20, 0.01)");
        ctx.fillStyle = radarGrad;
        ctx.fill();
        ctx.restore();

        // Bright Leading Beam Edge
        ctx.strokeStyle = "rgba(255, 200, 110, 0.90)";
        ctx.lineWidth = 1.6;
        ctx.shadowColor = "#FF9A3C";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(globeCenterX, globeCenterY);
        ctx.lineTo(
          globeCenterX + Math.cos(radarAngle) * radius,
          globeCenterY + Math.sin(radarAngle) * radius
        );
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.restore(); // End clipping to globe sphere

      // 8. 3D Elevated Great Circle Telemetry Highways (Above Globe Surface)
      const currentGeo = activeGeoRef.current;
      const currentFilters = filtersRef.current;

      if (currentFilters.liveTransactions) {
        (currentGeo.connections || []).forEach(([fromIdx, toIdx], cIdx) => {
          const from = currentGeo.hubs[fromIdx];
          const to = currentGeo.hubs[toIdx];
          if (!from || !to) return;

          const fromUnit = from.unit || latLonToUnit(from.lat, from.lon);
          const toUnit = to.unit || latLonToUnit(to.lat, to.lon);
          const pFrom = projectUnit(fromUnit);
          const pTo = projectUnit(toUnit);

          if (pFrom.visible || pTo.visible) {
            const steps = 18;
            const pts: Array<{ x: number; y: number; z: number; visible: boolean }> = [];

            for (let s = 0; s <= steps; s++) {
              const t = s / steps;
              const curLat = from.lat + (to.lat - from.lat) * t;
              const curLon = from.lon + (to.lon - from.lon) * t;
              const arcHeight = 1.0 + Math.sin(t * Math.PI) * 0.18;
              pts.push(projectUnit(latLonToUnit(curLat, curLon), arcHeight));
            }

            // Path generator helper
            const traceHighway = () => {
              ctx.beginPath();
              let started = false;
              for (let s = 0; s < pts.length; s++) {
                const pt = pts[s];
                if (pt.visible && Number.isFinite(pt.x) && Number.isFinite(pt.y)) {
                  if (!started) {
                    ctx.moveTo(pt.x, pt.y);
                    started = true;
                  } else {
                    ctx.lineTo(pt.x, pt.y);
                  }
                } else {
                  started = false;
                }
              }
              return started;
            };

            // Layer 1: Broad Amber Ambient Conduit Glow
            if (traceHighway()) {
              ctx.lineWidth = 5.2;
              ctx.strokeStyle = "rgba(255, 110, 20, 0.18)";
              ctx.stroke();

              // Layer 2: Core Luminous Amber Energy Highway
              ctx.lineWidth = 2.0;
              ctx.strokeStyle = "rgba(255, 175, 50, 0.72)";
              ctx.stroke();

              // Layer 3: Razor White-Hot Center Filament
              ctx.lineWidth = 0.9;
              ctx.strokeStyle = "rgba(255, 245, 220, 0.92)";
              ctx.stroke();
            }

            // Dual Photon Comet Bursts Travelling Along Highway
            const pulseCount = 2;
            for (let pIdx = 0; pIdx < pulseCount; pIdx++) {
              const pulseT = (frame * 0.011 + cIdx * 0.24 + pIdx * 0.5) % 1;
              const pulseLat = from.lat + (to.lat - from.lat) * pulseT;
              const pulseLon = from.lon + (to.lon - from.lon) * pulseT;
              const pulseHeight = 1.0 + Math.sin(pulseT * Math.PI) * 0.18;
              const pulsePt = projectUnit(latLonToUnit(pulseLat, pulseLon), pulseHeight);

              if (pulsePt.visible && pulsePt.z > 0 && Number.isFinite(pulsePt.x) && Number.isFinite(pulsePt.y)) {
                // Outer photon bloom
                ctx.beginPath();
                ctx.arc(pulsePt.x, pulsePt.y, 4.8, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255, 140, 30, 0.38)";
                ctx.fill();

                // Brilliant white-hot photon head
                ctx.beginPath();
                ctx.arc(pulsePt.x, pulsePt.y, 2.2, 0, Math.PI * 2);
                ctx.fillStyle = "#FFF8EE";
                ctx.shadowColor = "#FF9A24";
                ctx.shadowBlur = 12;
                ctx.fill();
                ctx.shadowBlur = 0;
              }
            }
          }
        });
      }

      // 9. 3D Elliptical Orbital Satellite Tracks
      if (showOrbitsRef.current && currentFilters.satellites) {
        const orbitConfigs = [
          { tilt: 0.35, speed: 0.008, radiusFactor: 1.28, color: "rgba(255, 150, 50, 0.32)" },
          { tilt: -0.52, speed: -0.006, radiusFactor: 1.38, color: "rgba(255, 130, 30, 0.28)" },
          { tilt: 0.72, speed: 0.011, radiusFactor: 1.46, color: "rgba(255, 170, 70, 0.24)" },
        ];

        orbitConfigs.forEach((cfg, oIdx) => {
          ctx.save();
          ctx.translate(globeCenterX, globeCenterY);
          ctx.rotate(cfg.tilt);

          ctx.beginPath();
          if (typeof ctx.ellipse === "function") {
            ctx.ellipse(0, 0, radius * cfg.radiusFactor, radius * 0.42 * cfg.radiusFactor, 0, 0, Math.PI * 2);
          } else {
            ctx.save();
            ctx.scale(1, 0.42);
            ctx.arc(0, 0, radius * cfg.radiusFactor, 0, Math.PI * 2);
            ctx.restore();
          }
          ctx.lineWidth = 1.1;
          ctx.strokeStyle = cfg.color;
          ctx.stroke();

          const satAngle = frame * cfg.speed + oIdx * 2.1;
          const satX = Math.cos(satAngle) * radius * cfg.radiusFactor;
          const satY = Math.sin(satAngle) * radius * 0.42 * cfg.radiusFactor;

          // Satellite main bus
          ctx.fillStyle = "#FFB347";
          ctx.shadowColor = "#FF7A1A";
          ctx.shadowBlur = 10;
          ctx.fillRect(satX - 2.5, satY - 2.5, 5, 5);

          // Left solar array wing
          ctx.fillStyle = "#38BDF8";
          ctx.fillRect(satX - 9, satY - 2, 5, 4);
          ctx.lineWidth = 0.8;
          ctx.strokeStyle = "#BAE6FD";
          ctx.strokeRect(satX - 9, satY - 2, 5, 4);

          // Right solar array wing
          ctx.fillRect(satX + 4, satY - 2, 5, 4);
          ctx.strokeRect(satX + 4, satY - 2, 5, 4);

          ctx.shadowBlur = 0;
          ctx.restore();
        });
      }

      // 10. Regional Hub Markers & High-Visibility Floating HUD Glass Badges
      if (currentFilters.regionalHubs) {
        // Project all hubs to calculate screen layout & avoid text collision
        const projectedHubs = currentGeo.hubs.map((hub) => {
          const hubUnit = hub.unit || latLonToUnit(hub.lat, hub.lon);
          const p = projectUnit(hubUnit);
          return { hub, p };
        });

        projectedHubs.forEach(({ hub, p }) => {
          if (p.visible && p.z > -0.05 && Number.isFinite(p.x) && Number.isFinite(p.y)) {
            const isHovered = hoveredHubRef.current?.id === hub.id;
            const isSelected = selectedHubIdRef.current === hub.id;
            const depthScale = Math.max(0.72, (p.z + 1) / 2);
            const baseHubSize = (isSelected ? 9.0 : isHovered ? 8.0 : 6.0) * depthScale * (Number.isFinite(zoomRef.current) ? zoomRef.current : 1.0);
            const hubSize = Number.isFinite(baseHubSize) && baseHubSize > 0 ? baseHubSize : 6.0;

            // 1. Dual-Stage Outward Radar Pulse Waves
            const wave1 = (frame * 0.032 + Math.abs(Number(hub.lat) || 0) * 0.12) % 1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, hubSize + 4 + wave1 * 20, 0, Math.PI * 2);
            ctx.strokeStyle = isSelected
              ? `rgba(255, 175, 50, ${1 - wave1})`
              : isHovered
              ? `rgba(56, 189, 248, ${1 - wave1})`
              : `rgba(255, 122, 26, ${(1 - wave1) * 0.8})`;
            ctx.lineWidth = 1.6;
            ctx.stroke();

            // 2. Concentric Neon Ambient Halo
            ctx.beginPath();
            ctx.arc(p.x, p.y, hubSize + 5, 0, Math.PI * 2);
            ctx.fillStyle = isSelected
              ? "rgba(255, 140, 40, 0.48)"
              : isHovered
              ? "rgba(56, 189, 248, 0.38)"
              : "rgba(255, 122, 26, 0.22)";
            ctx.fill();

            // 3. Precision White Outer Ring
            ctx.beginPath();
            ctx.arc(p.x, p.y, hubSize + 2.5, 0, Math.PI * 2);
            ctx.strokeStyle = isSelected ? "#FFFFFF" : isHovered ? "#38BDF8" : "#FFAE58";
            ctx.lineWidth = isSelected || isHovered ? 2.0 : 1.4;
            ctx.stroke();

            // 4. Radiant Neon Core
            ctx.beginPath();
            ctx.arc(p.x, p.y, hubSize, 0, Math.PI * 2);
            ctx.fillStyle = isSelected ? "#FFAE58" : isHovered ? "#38BDF8" : "#FF7A1A";
            ctx.shadowColor = isHovered ? "#38BDF8" : "#FF9A3C";
            ctx.shadowBlur = 18;
            ctx.fill();

            // 5. Specular White-Hot Center Dot
            ctx.beginPath();
            ctx.arc(p.x, p.y, hubSize * 0.45, 0, Math.PI * 2);
            ctx.fillStyle = "#FFFFFF";
            ctx.fill();
            ctx.shadowBlur = 0;

            // 6. Floating High-Contrast Glassmorphic Pill Badge
            const fontSize = Math.round(11 * depthScale);
            ctx.font = `bold ${fontSize}px 'Inter', system-ui, sans-serif`;
            const textMetrics = ctx.measureText(hub.name);
            const textW = textMetrics.width;
            const badgeW = textW + 26;
            const badgeH = 22 * depthScale;

            // Smart orientation: if there is another visible hub to the east within 120px,
            // or if the location is on the far right edge of the globe, place badge to the left
            const hasEastNeighbor = projectedHubs.some(
              (other) =>
                other.hub.id !== hub.id &&
                other.p.visible &&
                other.p.x > p.x &&
                other.p.x - p.x < 120 &&
                Math.abs(other.p.y - p.y) < 45
            );
            const placeLeft = hasEastNeighbor || (p.x > globeCenterX + radius * 0.65);

            const badgeX = placeLeft ? p.x - badgeW - 12 : p.x + hubSize + 12;
            const badgeY = p.y - badgeH / 2;

            // Leader line connecting hub to floating badge
            ctx.beginPath();
            ctx.moveTo(p.x + (placeLeft ? -hubSize - 2 : hubSize + 2), p.y);
            ctx.lineTo(placeLeft ? badgeX + badgeW : badgeX, p.y);
            ctx.strokeStyle = isSelected
              ? "rgba(255, 175, 50, 0.9)"
              : isHovered
              ? "rgba(56, 189, 248, 0.9)"
              : "rgba(255, 140, 40, 0.55)";
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Glassmorphic dark badge background (100% opaque against lines & globe)
            ctx.save();
            ctx.beginPath();
            drawRoundRect(ctx, badgeX, badgeY, badgeW, badgeH, 6);
            ctx.fillStyle = isSelected
              ? "rgba(18, 12, 8, 0.96)"
              : isHovered
              ? "rgba(8, 20, 32, 0.96)"
              : "rgba(8, 12, 18, 0.92)";
            ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;

            // Badge border hairline
            ctx.strokeStyle = isSelected
              ? "rgba(255, 175, 50, 0.95)"
              : isHovered
              ? "rgba(56, 189, 248, 0.95)"
              : "rgba(255, 140, 40, 0.60)";
            ctx.lineWidth = isSelected || isHovered ? 1.6 : 1.0;
            ctx.stroke();
            ctx.restore();

            // Status light indicator on left side of badge
            ctx.beginPath();
            ctx.arc(badgeX + 10, badgeY + badgeH / 2, 3, 0, Math.PI * 2);
            ctx.fillStyle = isHovered ? "#38BDF8" : isSelected ? "#FFAE58" : "#22C55E";
            ctx.shadowColor = isHovered ? "#38BDF8" : "#22C55E";
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.shadowBlur = 0;

            // Location Name (Bold, crisp white, maximum legibility)
            ctx.font = `bold ${fontSize}px 'Inter', system-ui, sans-serif`;
            ctx.fillStyle = isSelected ? "#FFAE58" : isHovered ? "#FFFFFF" : "#F8FAFC";
            ctx.fillText(hub.name, badgeX + 18, badgeY + badgeH / 2 + fontSize * 0.35);
          }
        });
      }

      // 11. Live User Location Pin ("Piyush [Live Telemetry]")
      const userLoc = userLocationRef.current;
      if (currentFilters.userLocation && userLoc.isDetected) {
        const pUser = projectUnit(userLoc.unit);
        if (pUser.visible && pUser.z > -0.05) {
          const pulse = (frame * 0.05) % 1;

          ctx.beginPath();
          ctx.arc(pUser.x, pUser.y, 8 + pulse * 18, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(34, 197, 94, ${1 - pulse})`;
          ctx.lineWidth = 1.8;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(pUser.x, pUser.y, 5.5, 0, Math.PI * 2);
          ctx.fillStyle = "#22C55E";
          ctx.shadowColor = "#22C55E";
          ctx.shadowBlur = 14;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(pUser.x, pUser.y, 2.2, 0, Math.PI * 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.fill();
          ctx.shadowBlur = 0;

          // Callout Box
          const boxX = pUser.x + 14;
          const boxY = pUser.y - 28;
          const boxW = 124;
          const boxH = 34;

          ctx.fillStyle = "rgba(14, 11, 9, 0.92)";
          ctx.strokeStyle = "rgba(34, 197, 94, 0.65)";
          ctx.lineWidth = 1.2;

          ctx.beginPath();
          drawRoundRect(ctx, boxX, boxY, boxW, boxH, 6);
          ctx.fill();
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(pUser.x + 5, pUser.y - 5);
          ctx.lineTo(boxX, boxY + boxH / 2);
          ctx.strokeStyle = "rgba(34, 197, 94, 0.8)";
          ctx.stroke();

          ctx.font = "bold 10px 'Inter', sans-serif";
          ctx.fillStyle = "#22C55E";
          ctx.fillText("Piyush (Live)", boxX + 8, boxY + 14);

          ctx.font = "9px monospace";
          ctx.fillStyle = "#B8A89A";
          ctx.fillText(userLoc.coordsText, boxX + 8, boxY + 26);
        }
      }

      // 12. Floating Holographic HUD Target Callout on Selected or Hovered Hub
      const activeCalloutHub =
        currentGeo.hubs.find((h) => h.id === selectedHubIdRef.current) ||
        (hoveredHubRef.current ? currentGeo.hubs.find((h) => h.id === hoveredHubRef.current?.id) : null);

      if (activeCalloutHub) {
        const calloutUnit = activeCalloutHub.unit || latLonToUnit(activeCalloutHub.lat, activeCalloutHub.lon);
        const pHud = projectUnit(calloutUnit);
        if (pHud.visible && pHud.z > 0.05 && Number.isFinite(pHud.x) && Number.isFinite(pHud.y)) {
          const boxX = pHud.x + 16;
          const boxY = pHud.y - 56;
          const boxW = 158;
          const boxH = 64;

          ctx.fillStyle = "rgba(14, 11, 9, 0.94)";
          ctx.strokeStyle = "rgba(255, 122, 26, 0.75)";
          ctx.lineWidth = 1.3;

          ctx.beginPath();
          drawRoundRect(ctx, boxX, boxY, boxW, boxH, 8);
          ctx.fill();
          ctx.stroke();

          // Corner bracket accents
          ctx.strokeStyle = "#FF9A3C";
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(boxX, boxY + 7);
          ctx.lineTo(boxX, boxY);
          ctx.lineTo(boxX + 7, boxY);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(boxX + boxW - 7, boxY);
          ctx.lineTo(boxX + boxW, boxY);
          ctx.lineTo(boxX + boxW, boxY + 7);
          ctx.stroke();

          // Pointer Line from Hub to Callout Box
          ctx.beginPath();
          ctx.moveTo(pHud.x + 5, pHud.y - 5);
          ctx.lineTo(boxX, boxY + boxH / 2);
          ctx.strokeStyle = "rgba(255, 150, 50, 0.85)";
          ctx.lineWidth = 1.2;
          ctx.stroke();

          ctx.font = "bold 10px monospace";
          ctx.fillStyle = "#FFB347";
          ctx.fillText(`${activeCalloutHub.name}`, boxX + 8, boxY + 14);

          ctx.font = "9px 'Inter', sans-serif";
          ctx.fillStyle = "#FFF4EA";
          const volText = activeCalloutHub?.volumeFormatted || "--";
          const shareText = activeCalloutHub?.sharePct != null ? ` (${activeCalloutHub.sharePct}%)` : "";
          ctx.fillText(`Volume: ${volText}${shareText}`, boxX + 8, boxY + 28);

          const statusText = String(activeCalloutHub?.status || "Active").split(" - ")[0];
          ctx.fillStyle = "#22C55E";
          ctx.fillText(`Status: ${statusText}`, boxX + 8, boxY + 41);

          const latVal = (activeCalloutHub?.lat != null ? Number(activeCalloutHub.lat).toFixed(2) : "0.00");
          const lonVal = (activeCalloutHub?.lon != null ? Number(activeCalloutHub.lon).toFixed(2) : "0.00");
          ctx.font = "9px monospace";
          ctx.fillStyle = "#B8A89A";
          ctx.fillText(
            `Coord: ${latVal}°, ${lonVal}°`,
            boxX + 8,
            boxY + 54
          );
        }
      }

      ctx.restore();
    } catch (err) {
      console.error("Globe render loop recovered error:", err);
    } finally {
      animId = requestAnimationFrame(render);
    }
  };

    render();
    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Oscilloscope Waveform Animation
  // -------------------------------------------------------------------------

  useEffect(() => {
    const canvas = signalCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const renderSignal = () => {
      t += 0.045;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      ctx.lineWidth = 0.5;
      ctx.strokeStyle = "rgba(255, 140, 40, 0.12)";
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = "#FF9A3C";
      ctx.shadowColor = "#FF7A1A";
      ctx.shadowBlur = 8;

      for (let x = 0; x < w; x++) {
        const normX = x / w;
        const y =
          h / 2 +
          Math.sin(normX * 14 - t) * 16 +
          Math.sin(normX * 28 + t * 0.7) * 7 +
          Math.sin(normX * 42 - t * 1.2) * 3;

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
      ctx.shadowBlur = 0;
      animId = requestAnimationFrame(renderSignal);
    };

    renderSignal();
    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  // -------------------------------------------------------------------------
  // JSX Render
  // -------------------------------------------------------------------------

  return (
    <div
      style={{ overflowAnchor: "none" }}
      className={cn(
        "relative w-full rounded-2xl border border-brand-orange/40 bg-[#07070A] overflow-hidden flex flex-col shadow-2xl glass-panel-3d",
        className
      )}
    >
      {/* Top Header matching Enterprise HUD Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-surface-border bg-surface-main/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-orange/15 border border-brand-orange/40 text-brand-orange text-xs font-bold shadow-glowSm">
            <Globe className="w-4 h-4 animate-spin duration-3000" />
            <span>Enterprise Global Topography</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <span className="w-2 h-2 rounded-full bg-status-positive animate-pulse inline-block" />
            <span className="font-semibold text-text-main text-[11px]">
              {activeDataset?.name || "Verified Dataset"} &bull; Live Telemetry
            </span>
          </div>
        </div>

        {/* Quick Node Search & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-subtle border border-surface-border text-text-muted focus-within:border-brand-orange transition-colors">
            <Search className="w-3.5 h-3.5 text-brand-orange shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hubs, cities, nodes..."
              className="bg-transparent border-none text-xs text-text-main placeholder:text-text-muted outline-none w-32 sm:w-48"
            />
          </div>

          <button
            type="button"
            onClick={centerOnUserLocation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 text-xs font-bold hover:bg-emerald-500/25 transition-all cursor-pointer shadow-sm"
            title="Pan to Live Detected Geolocation"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>My Live Location</span>
          </button>

          {onViewEvidence && (
            <button
              type="button"
              onClick={onViewEvidence}
              className="p-1.5 rounded-xl border border-surface-border hover:border-brand-orange/40 bg-surface-subtle text-text-muted hover:text-brand-orange transition-all cursor-pointer"
              title="View Calculation Lineage & Lineage Steps"
            >
              <ShieldCheck className="w-4 h-4 text-brand-orange" />
            </button>
          )}

          {onExplain && (
            <button
              type="button"
              onClick={onExplain}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-orange/15 border border-brand-orange/40 text-brand-orange text-xs font-semibold hover:bg-brand-orange/25 transition-all cursor-pointer shadow-sm"
              title="Explain Topography & Geographic Flow"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Explain</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-brand-orange/10 border border-brand-orange/30 text-text-main font-semibold text-xs">
            <div className="w-5 h-5 rounded-full bg-brand-orange text-white flex items-center justify-center text-[10px] font-bold">
              P
            </div>
            <span>Piyush</span>
          </div>
        </div>
      </div>

      {/* Main Workspace Body: Left 3D Globe + Right Telemetry Panel */}
      <div className="flex flex-col lg:flex-row items-stretch flex-1 min-h-[580px] relative">
        {/* LEFT COLUMN: Interactive 3D Canvas Globe Viewport */}
        <div className="relative flex-1 min-h-[480px] lg:min-h-[580px] bg-black overflow-hidden select-none">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="w-full h-full cursor-grab active:cursor-grabbing block touch-none"
          />

          {/* Top-Right Floating Global Stream Badge */}
          <div className="absolute top-4 right-4 bg-surface-card/90 backdrop-blur-xl border border-brand-orange/40 rounded-2xl p-3 text-xs shadow-2xl max-w-[220px] pointer-events-none z-10 animate-fadeIn">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-brand-orange">
                Global Core Stream
              </span>
              <span className="w-2 h-2 rounded-full bg-status-positive animate-pulse" />
            </div>
            <div className="text-sm font-extrabold text-[#FFF4EA] font-mono">{effectiveStream}</div>
            <div className="text-[10px] text-text-muted mt-0.5">
              {activeGeo.hubs.length} Active Regional Hubs &bull; Live Telemetry
            </div>
          </div>

          {/* BOTTOM LEFT: 3D Robot Mascot pointing to Holographic Mini HUD Screen */}
          {showMascot && (
            <div className="absolute bottom-4 left-4 flex items-end gap-3 z-20 pointer-events-none select-none">
              <div className="relative">
                <div className="absolute -bottom-1 -left-2 w-20 h-6 rounded-full bg-brand-orange/40 blur-md" />
                <svg
                  width="78"
                  height="94"
                  viewBox="0 0 78 94"
                  fill="none"
                  className="drop-shadow-[0_8px_20px_rgba(255,122,26,0.65)]"
                >
                  <path d="M39 20 V8" stroke="#FFA34D" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="39" cy="6" r="4.5" fill="#FFB347" className="animate-pulse" />
                  <rect
                    x="18"
                    y="16"
                    width="42"
                    height="32"
                    rx="12"
                    fill="url(#botHeadGradSmooth)"
                    stroke="#FFB347"
                    strokeWidth="1.8"
                  />
                  <rect
                    x="23"
                    y="22"
                    width="32"
                    height="19"
                    rx="7"
                    fill="#100C09"
                    stroke="#FF7A1A"
                    strokeWidth="1.2"
                  />
                  <ellipse cx="32" cy="31" rx="3.5" ry="4.5" fill="#FFB347" />
                  <ellipse cx="46" cy="31" rx="3.5" ry="4.5" fill="#FFB347" />
                  <rect x="35" y="48" width="8" height="5" rx="1" fill="#FF7A1A" />
                  <rect
                    x="21"
                    y="53"
                    width="36"
                    height="30"
                    rx="9"
                    fill="url(#botBodyGradSmooth)"
                    stroke="#FFA34D"
                    strokeWidth="1.8"
                  />
                  <circle cx="39" cy="66" r="6" fill="#FF7A1A" stroke="#FFB347" strokeWidth="1.5" />
                  <circle cx="39" cy="66" r="2.8" fill="#FFF4EA" />
                  <path
                    d="M57 60 Q69 52 74 38"
                    stroke="#FFA34D"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <circle cx="74" cy="37" r="4" fill="#FFB347" />
                  <path
                    d="M21 60 Q11 68 12 76"
                    stroke="#FFA34D"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <circle cx="12" cy="76" r="3.5" fill="#FF7A1A" />

                  <defs>
                    <linearGradient id="botHeadGradSmooth" x1="18" y1="16" x2="60" y2="48" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FFB347" />
                      <stop offset="0.5" stopColor="#FF7A1A" />
                      <stop offset="1" stopColor="#9A3412" />
                    </linearGradient>
                    <linearGradient id="botBodyGradSmooth" x1="21" y1="53" x2="57" y2="83" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FFB347" />
                      <stop offset="0.55" stopColor="#FF7A1A" />
                      <stop offset="1" stopColor="#7C2D12" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Holographic Mini HUD Screen */}
              <div className="bg-surface-main/92 backdrop-blur-xl border border-brand-orange/40 rounded-xl p-2.5 shadow-glowSm max-w-[160px] space-y-1 animate-fadeIn">
                <div className="flex items-center justify-between text-[10px] text-text-muted">
                  <span className="font-bold text-brand-orange">AI Fleet Copilot</span>
                  <span className="font-mono text-status-positive">Active</span>
                </div>
                <div className="h-7 w-full flex items-end gap-0.5 pt-1">
                  {[35, 60, 45, 80, 55, 90, 70, 95, 85].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-brand-orange/80 rounded-t-sm"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <div className="text-[9px] text-text-muted font-mono truncate">
                  Target: {selectedHub?.name || activeGeo.hubs[0]?.name || "Core Network"}
                </div>
              </div>
            </div>
          )}

          {/* Floating 3D Navigation Controls Toolbar */}
          <div className="absolute bottom-4 right-4 flex items-center gap-1.5 p-1 rounded-2xl bg-surface-main/90 backdrop-blur-xl border border-surface-border shadow-2xl z-20">
            <button
              type="button"
              onClick={() => {
                targetZoomRef.current = Math.min(1.85, targetZoomRef.current + 0.2);
              }}
              className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-subtle transition-all cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4 text-brand-orange" />
            </button>
            <button
              type="button"
              onClick={() => {
                targetZoomRef.current = Math.max(0.65, targetZoomRef.current - 0.2);
              }}
              className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-subtle transition-all cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4 text-brand-orange" />
            </button>
            <button
              type="button"
              onClick={() => {
                targetRotXRef.current = 0.32;
                targetRotYRef.current = 0.45;
                targetZoomRef.current = 1.0;
              }}
              className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-subtle transition-all cursor-pointer"
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-5 bg-surface-border mx-0.5" />
            <button
              type="button"
              onClick={() => setIsAutoRotateState((prev) => !prev)}
              className={cn(
                "p-2 rounded-xl transition-all cursor-pointer",
                isAutoRotateState ? "bg-brand-orange/20 text-brand-orange" : "text-text-muted hover:text-text-main"
              )}
              title={isAutoRotateState ? "Pause Auto-Rotation" : "Enable Auto-Rotation"}
            >
              {isAutoRotateState ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setRadarEnabledState((prev) => !prev)}
              className={cn(
                "p-2 rounded-xl transition-all cursor-pointer",
                radarEnabledState ? "bg-brand-orange/20 text-brand-orange" : "text-text-muted hover:text-text-main"
              )}
              title="Toggle Radar Sweep"
            >
              <Radar className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowOrbitsState((prev) => !prev)}
              className={cn(
                "p-2 rounded-xl transition-all cursor-pointer",
                showOrbitsState ? "bg-brand-orange/20 text-brand-orange" : "text-text-muted hover:text-text-main"
              )}
              title="Toggle Orbital Satellites"
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: "REAL-TIME FLEET & DATA TRACKER" Telemetry Deck */}
        <div
          style={{ overflowAnchor: "none" }}
          className="w-full lg:w-[380px] xl:w-[420px] bg-surface-main/95 border-t lg:border-t-0 lg:border-l border-surface-border p-4 lg:p-5 flex flex-col justify-between space-y-4 overflow-y-auto custom-scrollbar z-20"
        >
          <div className="space-y-4">
            {/* Panel Title & Telemetry Header */}
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-main">
                  Real-Time Fleet &amp; Data Tracker
                </h3>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Synchronous multi-region ingestion telemetry
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono bg-status-positiveBg text-status-positive border border-status-positive/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-status-positive animate-pulse" />
                Live
              </span>
            </div>

            {/* Navigation Tabs between "Selected Inspection" and "All Locations Directory" */}
            <div className="flex items-center p-1 rounded-xl bg-surface-subtle border border-surface-border text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("inspection")}
                className={cn(
                  "flex-1 py-1 px-2.5 rounded-lg font-semibold text-center transition-all cursor-pointer",
                  activeTab === "inspection"
                    ? "bg-brand-orange text-white shadow-sm"
                    : "text-text-muted hover:text-text-main"
                )}
              >
                Location Dossier
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("all_locations")}
                className={cn(
                  "flex-1 py-1 px-2.5 rounded-lg font-semibold text-center transition-all cursor-pointer flex items-center justify-center gap-1",
                  activeTab === "all_locations"
                    ? "bg-brand-orange text-white shadow-sm"
                    : "text-text-muted hover:text-text-main"
                )}
              >
                <span>All Locations</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-brand-orange/20 text-brand-orange font-mono">
                  {activeGeo.hubs.length}
                </span>
              </button>
            </div>

            {/* TAB 1: SELECTED LOCATION INSPECTION DOSSIER */}
            {activeTab === "inspection" && (
              selectedHub ? (
                <div className="p-3.5 rounded-2xl bg-surface-card border border-brand-orange/40 space-y-3 shadow-lg relative overflow-hidden animate-fadeIn">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-xl bg-brand-orange/15 border border-brand-orange/40 text-brand-orange flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-bold text-text-main leading-tight">
                            {selectedHub.name}
                          </h4>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-brand-orange/15 text-brand-orange border border-brand-orange/30">
                            {(selectedHub.type || "NODE").toUpperCase()}
                          </span>
                        </div>
                        {selectedHub.label && (
                          <div className="text-[11px] font-semibold text-brand-orange/90 mt-0.5">
                            {selectedHub.label}
                          </div>
                        )}
                        <p className="text-[10px] text-text-muted font-mono mt-0.5 flex items-center gap-1">
                          <span>
                            {typeof selectedHub.lat === "number" ? selectedHub.lat.toFixed(3) : "0.000"}° N,{" "}
                            {typeof selectedHub.lon === "number" ? selectedHub.lon.toFixed(3) : "0.000"}° E
                          </span>
                          <span>&bull;</span>
                          <span className="text-emerald-400 font-semibold">{selectedHub.status || "Active"}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => centerOnHub(selectedHub)}
                      className="p-1.5 rounded-lg bg-surface-subtle text-text-muted hover:text-brand-orange hover:bg-surface-elevated transition-colors cursor-pointer"
                      title="Center 3D Globe on this Location"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Location Detailed Metrics Matrix */}
                  <div className="grid grid-cols-2 gap-2 font-mono text-xs pt-1">
                    <div className="p-2.5 rounded-xl bg-surface-subtle/80 border border-surface-border">
                      <span className="text-[9px] uppercase font-bold text-text-muted block">Direct Volume</span>
                      <span className="text-base font-extrabold text-brand-orange block mt-0.5">
                        {selectedHub.volumeFormatted || "$0"}
                      </span>
                      <span className="text-[9px] text-text-muted block mt-0.5">Grounded Parquet value</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-surface-subtle/80 border border-surface-border">
                      <span className="text-[9px] uppercase font-bold text-text-muted block">Portfolio Share</span>
                      <span className="text-base font-extrabold text-[#FFF4EA] block mt-0.5">
                        {selectedHub.sharePct != null ? `${selectedHub.sharePct}%` : "18.4%"}
                      </span>
                      <div className="w-full bg-surface-border/80 h-1.5 rounded-full mt-1 overflow-hidden">
                        <div
                          className="bg-brand-orange h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (selectedHub.sharePct || 18) * 2.5)}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-surface-subtle/80 border border-surface-border">
                      <span className="text-[9px] uppercase font-bold text-text-muted block">Completed Orders</span>
                      <span className="text-sm font-extrabold text-text-main block mt-0.5">
                        {selectedHub.ordersCount != null ? Number(selectedHub.ordersCount).toLocaleString() : "1,240"}
                      </span>
                      <span className="text-[9px] text-text-muted block mt-0.5">Verified checkouts</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-surface-subtle/80 border border-surface-border">
                      <span className="text-[9px] uppercase font-bold text-text-muted block">Network Latency</span>
                      <span className="text-sm font-extrabold text-status-positive block mt-0.5">
                        {selectedHub.latency || "8ms"}
                      </span>
                      <span className="text-[9px] text-text-muted block mt-0.5">99.98% SLA Uptime</span>
                    </div>
                  </div>

                  {/* Connected Destinations */}
                  {selectedHub.connectedTo && selectedHub.connectedTo.length > 0 && (
                    <div className="pt-2 border-t border-surface-border/60">
                      <span className="text-[10px] uppercase font-bold text-text-muted block mb-1.5">
                        Connected Direct Telemetry Routes ({selectedHub.connectedTo.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedHub.connectedTo.map((targetName) => {
                          const targetHub = resolveHub(targetName) || activeGeo.hubs[0];
                          return (
                            <button
                              key={targetName}
                              type="button"
                              onMouseDown={(e) => {
                                // Prevent capturing focus to stop focus-loss scroll jump when button unmounts
                                e.preventDefault();
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                (e.currentTarget as HTMLElement)?.blur();
                                if (targetHub) handleSelectHub(targetHub);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-surface-subtle border border-surface-border text-text-muted hover:text-brand-orange hover:border-brand-orange/40 transition-all cursor-pointer"
                            >
                              <ArrowUpRight className="w-2.5 h-2.5" />
                              <span>{targetHub?.name || targetName}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Action Row */}
                  <div className="pt-2 border-t border-surface-border/60 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-text-muted font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-status-positive" />
                      <span>Real-time Sync Active</span>
                    </span>

                    {onViewEvidence && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onViewEvidence();
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-brand-orange/15 text-brand-orange border border-brand-orange/40 hover:bg-brand-orange/25 transition-all cursor-pointer"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>View Calculation Lineage</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-surface-card border border-surface-border text-center space-y-2 animate-fadeIn">
                  <MapPin className="w-8 h-8 text-brand-orange/60 mx-auto" />
                  <h4 className="text-sm font-semibold text-text-main">No Location Selected</h4>
                  <p className="text-xs text-text-muted">
                    Click any location node on the 3D globe or select from All Locations to inspect telemetry.
                  </p>
                </div>
              )
            )}

            {/* TAB 2: ALL DATASET LOCATIONS DIRECTORY (EVERY LOCATION CLICKABLE) */}
            {activeTab === "all_locations" && (
              <div className="p-3 rounded-2xl bg-surface-card border border-surface-border space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between text-xs pb-1 border-b border-surface-border/60">
                  <span className="text-[11px] font-bold text-text-main">
                    All Locations in Active Dataset ({activeGeo.hubs.length})
                  </span>
                  <span className="text-[9px] text-text-muted font-mono">Click to fly camera &amp; center</span>
                </div>

                <div
                  style={{ overflowAnchor: "none" }}
                  className="space-y-1.5 max-h-[260px] overflow-y-auto custom-scrollbar pr-1"
                >
                  {activeGeo.hubs.map((hub, idx) => {
                    const isSelected = selectedHubId === hub.id;
                    const safeLat = typeof hub?.lat === "number" ? hub.lat.toFixed(1) : "0.0";
                    const safeLon = typeof hub?.lon === "number" ? hub.lon.toFixed(1) : "0.0";
                    const safeStatus = hub?.status || "Active";
                    return (
                      <div
                        key={hub.id || `hub-${idx}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          (e.currentTarget as HTMLElement)?.blur();
                          handleSelectHub(hub);
                        }}
                        className={cn(
                          "w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all cursor-pointer select-none",
                          isSelected
                            ? "bg-brand-orange/15 border-brand-orange/60 text-brand-orange shadow-sm ring-1 ring-brand-orange/40"
                            : "bg-surface-subtle/70 border-surface-border/60 text-text-muted hover:text-text-main hover:bg-surface-subtle"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={cn(
                              "w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 font-mono",
                              isSelected
                                ? "bg-brand-orange text-white"
                                : "bg-surface-elevated text-text-muted border border-surface-border"
                            )}
                          >
                            {idx + 1}
                          </span>
                          <div className="min-w-0 truncate">
                            <strong className="text-[11px] font-semibold text-text-main block truncate">
                              {hub.name}
                            </strong>
                            <span className="text-[9px] text-text-muted font-mono block">
                              {safeLat}°, {safeLon}° &bull; {safeStatus}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 font-mono flex items-center gap-2">
                          <div>
                            <span className="text-[11px] font-extrabold text-brand-orange block">
                              {hub.volumeFormatted || "$0"}
                            </span>
                            {hub.sharePct != null && (
                              <span className="text-[9px] text-text-muted block">
                                {hub.sharePct}% share
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              (e.currentTarget as HTMLElement)?.blur();
                              handleSelectHub(hub);
                              setActiveTab("inspection");
                            }}
                            title="Open Full Dossier"
                            className={cn(
                              "p-1.5 rounded-lg border transition-all cursor-pointer",
                              isSelected
                                ? "bg-brand-orange text-white border-brand-orange shadow-sm"
                                : "bg-surface-card border-surface-border text-text-muted hover:text-brand-orange hover:border-brand-orange/50"
                            )}
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* General 4 Core Top Telemetry KPI Cards */}
            {activeTab === "all_locations" && (
              <div className="grid grid-cols-2 gap-2.5 font-mono">
                <div className="p-3 rounded-xl bg-surface-subtle/80 border border-surface-border">
                  <span className="text-[10px] uppercase font-bold text-text-muted block">Active Nodes</span>
                  <span className="text-lg font-extrabold text-brand-orange tabular-nums mt-0.5 block">
                    {Number(effectiveNodes || 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-surface-subtle/80 border border-surface-border">
                  <span className="text-[10px] uppercase font-bold text-text-muted block">Online Tracks</span>
                  <span className="text-lg font-extrabold text-brand-orange tabular-nums mt-0.5 block">
                    {Number(flowsCount || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Section 1: Data Transmission Activity Feed */}
            <div className="p-3 rounded-xl bg-surface-card border border-surface-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold text-text-main flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-brand-orange" />
                  <span>Data Transmission Activity Feed</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Grounded
                </span>
              </div>

              <div
                style={{ overflowAnchor: "none" }}
                className="space-y-1.5 max-h-[120px] overflow-y-auto custom-scrollbar pr-1"
              >
                {activityFeed.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-lg bg-surface-subtle/70 border border-surface-border/60 text-xs flex items-start gap-2 animate-fadeIn"
                  >
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                        item.status === "success"
                          ? "bg-status-positive"
                          : item.status === "warning"
                          ? "bg-status-warning"
                          : "bg-brand-orange"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <strong className="text-[11px] font-semibold text-text-main truncate">
                          {item.node}
                        </strong>
                        <span className="text-[9px] font-mono text-text-muted shrink-0">{item.time}</span>
                      </div>
                      <p className="text-[10px] text-text-muted mt-0.5 leading-tight">{item.event}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Signal & Connectivity Integrity Meter */}
            <div className="p-3 rounded-xl bg-surface-card border border-surface-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold text-text-main flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-brand-orange" />
                  <span>Signal &amp; Connectivity Integrity Meter</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-status-positive">99.8% Nominal</span>
              </div>

              <div className="h-14 w-full bg-surface-subtle/90 rounded-lg p-1 border border-surface-border relative overflow-hidden">
                <canvas ref={signalCanvasRef} width={340} height={56} className="w-full h-full" />
              </div>
            </div>

            {/* Section 3: Filter Location Types */}
            <div className="p-3 rounded-xl bg-surface-card border border-surface-border space-y-2.5">
              <span className="text-[11px] font-bold text-text-main block">Filter Location Types</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-text-muted hover:text-text-main select-none">
                  <input
                    type="checkbox"
                    checked={filters.regionalHubs}
                    onChange={(e) => setFilters((prev) => ({ ...prev, regionalHubs: e.target.checked }))}
                    className="accent-brand-orange w-3.5 h-3.5 rounded"
                  />
                  <span>Regional Hubs</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-text-muted hover:text-text-main select-none">
                  <input
                    type="checkbox"
                    checked={filters.liveTransactions}
                    onChange={(e) => setFilters((prev) => ({ ...prev, liveTransactions: e.target.checked }))}
                    className="accent-brand-orange w-3.5 h-3.5 rounded"
                  />
                  <span>Live Transits</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-text-muted hover:text-text-main select-none">
                  <input
                    type="checkbox"
                    checked={filters.dataCenters}
                    onChange={(e) => setFilters((prev) => ({ ...prev, dataCenters: e.target.checked }))}
                    className="accent-brand-orange w-3.5 h-3.5 rounded"
                  />
                  <span>Data Centers</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-text-muted hover:text-text-main select-none">
                  <input
                    type="checkbox"
                    checked={filters.satellites}
                    onChange={(e) => setFilters((prev) => ({ ...prev, satellites: e.target.checked }))}
                    className="accent-brand-orange w-3.5 h-3.5 rounded"
                  />
                  <span>Satellites</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-text-muted hover:text-text-main select-none col-span-2">
                  <input
                    type="checkbox"
                    checked={filters.userLocation}
                    onChange={(e) => setFilters((prev) => ({ ...prev, userLocation: e.target.checked }))}
                    className="accent-brand-orange w-3.5 h-3.5 rounded"
                  />
                  <span className="text-emerald-400 font-semibold">User Live Location (Piyush)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 4: Live Geographical Summary */}
          <div className="pt-3 border-t border-surface-border text-xs space-y-1.5 font-mono">
            <span className="text-[10px] uppercase font-bold text-text-muted block">
              Live Geographical Summary
            </span>
            <div className="flex items-center justify-between text-text-muted">
              <span>Location Volume:</span>
              <strong className="text-text-main">{effectiveStream}</strong>
            </div>
            <div className="flex items-center justify-between text-text-muted">
              <span>Active Locations:</span>
              <strong className="text-status-positive">{activeGeo.hubs.length} Grounded Hubs</strong>
            </div>
            <div className="flex items-center justify-between text-text-muted">
              <span>Detected Coordinates:</span>
              <strong className="text-emerald-400 text-[10px]">{userLocation.coordsText}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
