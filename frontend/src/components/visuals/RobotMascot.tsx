import React from "react";
import { cn } from "@/lib/utils";

interface RobotMascotProps {
  size?: number;
  className?: string;
  isHovered?: boolean;
  interactive?: boolean;
  expression?: "happy" | "neutral" | "curious";
}

export const RobotMascot: React.FC<RobotMascotProps> = ({
  size = 64,
  className,
  isHovered = false,
  expression = "happy",
}) => {
  // SVG proportions based on 100x110 coordinate box
  return (
    <div
      className={cn("relative select-none flex flex-col items-center", className)}
      style={{ width: size, height: size * 1.08 }}
    >
      {/* Floating Robot Body System */}
      <div className="w-full h-full animate-robot-float transition-transform duration-300">
        <svg
          viewBox="0 0 100 110"
          className="w-full h-full overflow-visible drop-shadow-[0_8px_16px_rgba(255,122,26,0.35)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Metallic Head & Body Gradient */}
            <linearGradient id="mascotChassisGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2A211B" />
              <stop offset="45%" stopColor="#1B140F" />
              <stop offset="100%" stopColor="#0B0806" />
            </linearGradient>

            {/* Orange Chrome Trim Gradient */}
            <linearGradient id="mascotTrimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF9E43" />
              <stop offset="50%" stopColor="#FF7A1A" />
              <stop offset="100%" stopColor="#C2410C" />
            </linearGradient>

            {/* Visor Screen Deep Glass Gradient */}
            <linearGradient id="mascotVisorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#120D0A" />
              <stop offset="100%" stopColor="#080605" />
            </linearGradient>

            {/* Glowing Eye Radial Energy */}
            <radialGradient id="mascotEyeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFE082" />
              <stop offset="40%" stopColor="#FF9800" />
              <stop offset="100%" stopColor="#E65100" />
            </radialGradient>

            {/* Cyan/Electric Accent for Antenna & Chest Core */}
            <radialGradient id="mascotEnergyCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="35%" stopColor="#FFB300" />
              <stop offset="70%" stopColor="#FF6D00" />
              <stop offset="100%" stopColor="#DD2C00" />
            </radialGradient>

            {/* Thruster Flame Gradient */}
            <linearGradient id="mascotThrusterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFB74D" />
              <stop offset="60%" stopColor="#FF5722" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>

            {/* Specular Sheen for 3D curved surfaces */}
            <linearGradient id="mascotSheen" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
              <stop offset="30%" stopColor="#FFFFFF" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>

            {/* Eye Glow Filter */}
            <filter id="eyeGlowFilter" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="1.8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. ANTENNA SYSTEM */}
          {/* Antenna Stem */}
          <rect
            x="48"
            y="4"
            width="4"
            height="11"
            rx="2"
            fill="url(#mascotTrimGrad)"
          />
          {/* Antenna Pulse Ring */}
          <circle
            cx="50"
            cy="5"
            r="6"
            className="animate-ping opacity-60 origin-center"
            style={{ transformOrigin: "50px 5px" }}
            fill="#FF7A1A"
          />
          {/* Antenna Glowing Orb */}
          <circle
            cx="50"
            cy="5"
            r="4"
            fill="url(#mascotEnergyCore)"
            filter="url(#eyeGlowFilter)"
          />

          {/* 2. EARS / AUDIO COMM SENSORS */}
          {/* Left Ear Sensor */}
          <rect
            x="13"
            y="26"
            width="7"
            height="14"
            rx="3.5"
            fill="url(#mascotChassisGrad)"
            stroke="url(#mascotTrimGrad)"
            strokeWidth="1.5"
          />
          <circle cx="16.5" cy="33" r="2" fill="#FF7A1A" />

          {/* Right Ear Sensor */}
          <rect
            x="80"
            y="26"
            width="7"
            height="14"
            rx="3.5"
            fill="url(#mascotChassisGrad)"
            stroke="url(#mascotTrimGrad)"
            strokeWidth="1.5"
          />
          <circle cx="83.5" cy="33" r="2" fill="#FF7A1A" />

          {/* 3. ROBOT HEAD CHASSIS (Rounded 3D Pod) */}
          <rect
            x="18"
            y="13"
            width="64"
            height="46"
            rx="20"
            fill="url(#mascotChassisGrad)"
            stroke="url(#mascotTrimGrad)"
            strokeWidth="1.8"
          />
          {/* Head 3D Specular Sheen (Top Highlight) */}
          <path
            d="M 26 16 C 36 14, 64 14, 74 16 C 78 17, 80 20, 78 24 C 65 19, 35 19, 22 24 C 20 20, 22 17, 26 16 Z"
            fill="url(#mascotSheen)"
          />

          {/* 4. VISOR SCREEN (Dark Glossy Glass) */}
          <rect
            x="24"
            y="19"
            width="52"
            height="34"
            rx="14"
            fill="url(#mascotVisorGrad)"
            stroke="#3B2A1E"
            strokeWidth="1.2"
          />
          {/* Visor Glass Reflection Arc */}
          <path
            d="M 26 23 C 38 21, 62 21, 74 23 C 71 27, 29 27, 26 23 Z"
            fill="#FFFFFF"
            opacity="0.12"
          />

          {/* 5. ROBOT EYES & EXPRESSION */}
          {isHovered || expression === "happy" ? (
            /* Happy Expressive Curved Arcs (^ ^) on Hover */
            <g filter="url(#eyeGlowFilter)">
              {/* Left Happy Eye Arc */}
              <path
                d="M 33 38 C 36 31, 44 31, 47 38"
                stroke="#FFB300"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
              {/* Right Happy Eye Arc */}
              <path
                d="M 53 38 C 56 31, 64 31, 67 38"
                stroke="#FFB300"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />
            </g>
          ) : (
            /* Standard Alert Glowing Pill Eyes with Blinking Animation */
            <g
              className="animate-robot-blink"
              style={{ transformOrigin: "50px 36px" }}
              filter="url(#eyeGlowFilter)"
            >
              {/* Left Eye */}
              <rect
                x="34"
                y="30"
                width="11"
                height="12"
                rx="5"
                fill="url(#mascotEyeGlow)"
              />
              <circle cx="37" cy="33" r="1.8" fill="#FFFFFF" />

              {/* Right Eye */}
              <rect
                x="55"
                y="30"
                width="11"
                height="12"
                rx="5"
                fill="url(#mascotEyeGlow)"
              />
              <circle cx="58" cy="33" r="1.8" fill="#FFFFFF" />
            </g>
          )}

          {/* Cheeks: Cute Amber LED Micro-Dots */}
          <circle cx="31" cy="45" r="1.5" fill="#FF7A1A" opacity="0.8" />
          <circle cx="69" cy="45" r="1.5" fill="#FF7A1A" opacity="0.8" />

          {/* Subtle Friendly Mouth Line */}
          <path
            d="M 46 44 Q 50 47 54 44"
            stroke="#FF9E43"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
            opacity="0.85"
          />

          {/* 6. ROBOT NECK CONNECTOR */}
          <rect
            x="44"
            y="58"
            width="12"
            height="4"
            rx="1.5"
            fill="#FF7A1A"
            opacity="0.9"
          />

          {/* 7. ROBOT TORSO CHASSIS */}
          <rect
            x="29"
            y="61"
            width="42"
            height="26"
            rx="12"
            fill="url(#mascotChassisGrad)"
            stroke="url(#mascotTrimGrad)"
            strokeWidth="1.5"
          />
          {/* Torso Top Specular Sheen */}
          <path
            d="M 35 63 C 44 62, 56 62, 65 63 C 67 65, 33 65, 35 63 Z"
            fill="#FFFFFF"
            opacity="0.25"
          />

          {/* Chest Energy Core (BizLens Diamond Reactor) */}
          <g
            className="animate-pulse"
            style={{ transformOrigin: "50px 73px" }}
            filter="url(#eyeGlowFilter)"
          >
            {/* Core Outer Ring */}
            <circle
              cx="50"
              cy="73"
              r="6.5"
              fill="#18110B"
              stroke="#FF7A1A"
              strokeWidth="1"
            />
            {/* Core Glowing Diamond / Gem */}
            <path
              d="M 50 68 L 54.5 73 L 50 78 L 45.5 73 Z"
              fill="url(#mascotEnergyCore)"
            />
          </g>

          {/* 8. FLOATING ROBOT HANDS */}
          {/* Left Hand */}
          <g
            className={cn(
              "transition-transform duration-300 origin-center",
              isHovered && "-translate-y-1 -rotate-6"
            )}
          >
            <rect
              x="19"
              y="67"
              width="8"
              height="11"
              rx="4"
              fill="url(#mascotChassisGrad)"
              stroke="url(#mascotTrimGrad)"
              strokeWidth="1.2"
            />
            <circle cx="23" cy="72" r="1.5" fill="#FF7A1A" />
          </g>

          {/* Right Hand (Waving Gesture on Hover!) */}
          <g
            className={cn(
              "transition-transform duration-300 origin-bottom",
              isHovered ? "animate-robot-wave" : ""
            )}
            style={{ transformOrigin: "77px 75px" }}
          >
            <rect
              x="73"
              y="67"
              width="8"
              height="11"
              rx="4"
              fill="url(#mascotChassisGrad)"
              stroke="url(#mascotTrimGrad)"
              strokeWidth="1.2"
            />
            <circle cx="77" cy="72" r="1.5" fill="#FF7A1A" />
          </g>

          {/* 9. THRUSTER EXHAUST JET */}
          <g className="animate-robot-thruster" style={{ transformOrigin: "50px 87px" }}>
            <path
              d="M 44 87 Q 50 99 56 87 Z"
              fill="url(#mascotThrusterGrad)"
              filter="url(#eyeGlowFilter)"
            />
          </g>
        </svg>
      </div>

      {/* Floating Ground / Ambient Levitation Shadow */}
      <div
        className="w-8 h-2 rounded-full bg-brand-orange/20 blur-[3px] animate-robot-shadow -mt-1 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
};
