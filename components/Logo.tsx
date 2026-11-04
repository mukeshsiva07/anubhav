import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  role?: 'employee' | 'industry';
}

export function Logo({ className = '', size = 32, showText = true, role = 'employee' }: LogoProps) {
  const isIndustry = role === 'industry';
  const primaryColor = isIndustry ? '#e11d48' : '#059669';
  const secondaryColor = isIndustry ? '#fb7185' : '#34d399';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 hover:scale-105"
      >
        <rect width="40" height="40" rx="10" fill={primaryColor} />
        {/* Modern geometric industrial gear + infinite flame emblem */}
        <path
          d="M20 9C15.58 9 12 12.58 12 17C12 21.05 15.02 24.4 19 24.93V31H21V24.93C24.98 24.4 28 21.05 28 17C28 12.58 24.42 9 20 9ZM20 23C16.69 23 14 20.31 14 17C14 13.69 16.69 11 20 11C23.31 11 26 13.69 26 17C26 20.31 23.31 23 20 23Z"
          fill="white"
          fillOpacity="0.25"
        />
        <circle cx="20" cy="17" r="4" fill="white" />
        <path
          d="M10 28C10 24.6863 12.6863 22 16 22H24C27.3137 22 30 24.6863 30 28V30C30 31.1046 29.1046 32 28 32H12C10.8954 32 10 31.1046 10 30V28Z"
          fill="white"
          fillOpacity="0.85"
        />
        <circle cx="20" cy="17" r="2" fill={primaryColor} />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-display text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
            Anubhav
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                isIndustry
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isIndustry ? 'Admin' : 'Ops'}
            </span>
          </span>
          <span className="text-[11px] font-medium text-slate-500 tracking-tight mt-0.5">
            Knowledge Vault
          </span>
        </div>
      )}
    </div>
  );
}

