import React from 'react';

export interface IconProps {
    size?: number;
    className?: string;
    style?: React.CSSProperties;
}

// Reusable gradients and filters definition component
const IconDefs = () => (
    <defs>
        <filter id="icon-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.15" />
        </filter>
        <linearGradient id="blue-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="purple-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C084FC" />
            <stop offset="100%" stopColor="#9333EA" />
        </linearGradient>
        <linearGradient id="pink-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F472B6" />
            <stop offset="100%" stopColor="#DB2777" />
        </linearGradient>
        <linearGradient id="orange-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FB923C" />
            <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
        <linearGradient id="green-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ADE80" />
            <stop offset="100%" stopColor="#16A34A" />
        </linearGradient>
        <linearGradient id="metal-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
    </defs>
);

export const PremiumTarget: React.FC<IconProps> = ({ size = 64, className = '', style }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
        <IconDefs />
        <g filter="url(#icon-shadow)">
            {/* Target Rings */}
            <circle cx="32" cy="32" r="28" fill="url(#pink-gradient)" fillOpacity="0.2" />
            <circle cx="32" cy="32" r="22" fill="url(#pink-gradient)" stroke="white" strokeWidth="2" />
            <circle cx="32" cy="32" r="14" fill="white" />
            <circle cx="32" cy="32" r="8" fill="url(#pink-gradient)" />

            {/* Arrow */}
            <path d="M48 16L32 32" stroke="#3B82F6" strokeWidth="4" strokeLinecap="round" />
            <path d="M48 16L42 16L48 22" stroke="#3B82F6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            {/* Arrow fins */}
            <path d="M52 12L46 18" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
        </g>
    </svg>
);

export const PremiumClipboard: React.FC<IconProps> = ({ size = 64, className = '', style }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
        <IconDefs />
        <g filter="url(#icon-shadow)">
            {/* Board */}
            <rect x="12" y="8" width="40" height="52" rx="4" fill="url(#orange-gradient)" />
            {/* Paper */}
            <rect x="16" y="16" width="32" height="40" rx="2" fill="white" />
            {/* Lines */}
            <rect x="20" y="24" width="24" height="2" fill="#E2E8F0" />
            <rect x="20" y="32" width="24" height="2" fill="#E2E8F0" />
            <rect x="20" y="40" width="16" height="2" fill="#E2E8F0" />
            {/* Clip */}
            <path d="M24 6H40V12C40 13.1 39.1 14 38 14H26C24.9 14 24 13.1 24 12V6Z" fill="url(#metal-gradient)" />
            <circle cx="32" cy="10" r="2" fill="#64748B" />
        </g>
    </svg>
);

export const PremiumChart: React.FC<IconProps> = ({ size = 64, className = '', style }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
        <IconDefs />
        <g filter="url(#icon-shadow)">
            {/* Background Board */}
            <rect x="8" y="8" width="48" height="48" rx="8" fill="#F8FAFC" stroke="url(#blue-gradient)" strokeWidth="2" />

            {/* Grid Lines */}
            <line x1="16" y1="44" x2="48" y2="44" stroke="#E2E8F0" strokeWidth="2" />
            <line x1="16" y1="34" x2="48" y2="34" stroke="#E2E8F0" strokeWidth="2" />
            <line x1="16" y1="24" x2="48" y2="24" stroke="#E2E8F0" strokeWidth="2" />

            {/* Graph Line */}
            <path d="M16 44L26 34L34 38L48 18" stroke="url(#blue-gradient)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            {/* Area under curve */}
            <path d="M16 44L26 34L34 38L48 18V44H16Z" fill="url(#blue-gradient)" fillOpacity="0.1" />

            {/* Dots */}
            <circle cx="26" cy="34" r="3" fill="#3B82F6" />
            <circle cx="34" cy="38" r="3" fill="#3B82F6" />
            <circle cx="48" cy="18" r="3" fill="#3B82F6" />
        </g>
    </svg>
);

export const PremiumUsers: React.FC<IconProps> = ({ size = 64, className = '', style }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
        <IconDefs />
        <g filter="url(#icon-shadow)">
            {/* Back User */}
            <circle cx="44" cy="24" r="8" fill="url(#green-gradient)" fillOpacity="0.6" />
            <path d="M44 34C38 34 34 38 34 42V48H54V42C54 38 50 34 44 34Z" fill="url(#green-gradient)" fillOpacity="0.6" />

            {/* Front User */}
            <circle cx="28" cy="24" r="10" fill="url(#green-gradient)" />
            <path d="M28 36C18 36 14 42 14 48V50H42V48C42 42 38 36 28 36Z" fill="url(#green-gradient)" />
            {/* Badge/Icon */}
            <circle cx="48" cy="16" r="6" fill="#F0FDF4" stroke="#22C55E" strokeWidth="2" />
            <path d="M45 16L47 18L51 14" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
    </svg>
);

export const PremiumClock: React.FC<IconProps> = ({ size = 64, className = '', style }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
        <IconDefs />
        <g filter="url(#icon-shadow)">
            {/* Clock Face */}
            <circle cx="32" cy="32" r="24" fill="white" stroke="url(#orange-gradient)" strokeWidth="4" />
            {/* Ticks */}
            <path d="M32 14V18" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
            <path d="M32 46V50" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
            <path d="M50 32H46" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
            <path d="M18 32H14" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />

            {/* Hands */}
            <path d="M32 32V20" stroke="#EA580C" strokeWidth="3" strokeLinecap="round" />
            <path d="M32 32L40 40" stroke="#EA580C" strokeWidth="3" strokeLinecap="round" />
            <circle cx="32" cy="32" r="3" fill="#EA580C" />
        </g>
    </svg>
);

export const PremiumShield: React.FC<IconProps> = ({ size = 64, className = '', style }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
        <IconDefs />
        <g filter="url(#icon-shadow)">
            <path d="M32 6L14 14V30C14 42 22 52 32 58C42 52 50 42 50 30V14L32 6Z" fill="url(#purple-gradient)" />
            <path d="M32 14V50C40 44 44 36 44 30V18L32 14Z" fill="white" fillOpacity="0.2" />
            <path d="M32 20L22 26V30C22 36 26 42 32 46C38 42 42 36 42 30V26L32 20Z" fill="white" fillOpacity="0.9" />
            <path d="M32 26L28 28L32 34L36 28L32 26Z" fill="#9333EA" />
        </g>
    </svg>
);

export const PremiumGlobe: React.FC<IconProps> = ({ size = 64, className = '', style }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
        <IconDefs />
        <g filter="url(#icon-shadow)">
            <circle cx="32" cy="32" r="24" fill="url(#blue-gradient)" />
            {/* Grid lines */}
            <ellipse cx="32" cy="32" rx="24" ry="10" stroke="white" strokeWidth="2" strokeOpacity="0.5" fill="none" />
            <ellipse cx="32" cy="32" rx="10" ry="24" stroke="white" strokeWidth="2" strokeOpacity="0.5" fill="none" />
            <line x1="8" y1="32" x2="56" y2="32" stroke="white" strokeWidth="2" strokeOpacity="0.5" />
            <line x1="32" y1="8" x2="32" y2="56" stroke="white" strokeWidth="2" strokeOpacity="0.5" />
            {/* Continents approximation */}
            <path d="M40 20C44 20 46 24 46 28C46 32 42 34 40 36" stroke="white" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.8" />
            <path d="M24 44C20 42 18 36 20 30" stroke="white" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.8" />
        </g>
    </svg>
);

export const PremiumRocket: React.FC<IconProps> = ({ size = 64, className = '', style }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
        <IconDefs />
        <g filter="url(#icon-shadow)">
            {/* Flames */}
            <path d="M26 48L32 58L38 48" fill="#F59E0B" />
            <path d="M28 48L32 54L36 48" fill="#FCD34D" />

            {/* Body */}
            <path d="M32 6C32 6 20 18 20 32C20 40 22 46 22 46H42C42 46 44 40 44 32C44 18 32 6 32 6Z" fill="white" />
            {/* Window */}
            <circle cx="32" cy="24" r="6" fill="#3B82F6" stroke="#93C5FD" strokeWidth="2" />

            {/* Fins */}
            <path d="M20 32L12 42V46H22" fill="#3B82F6" />
            <path d="M44 32L52 42V46H42" fill="#3B82F6" />
            <path d="M32 6V46" stroke="#E2E8F0" strokeWidth="1" />
        </g>
    </svg>
);
