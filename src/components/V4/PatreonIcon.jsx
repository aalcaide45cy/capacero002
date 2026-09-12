import React from 'react';

export function PatreonIcon({ className = "w-5 h-5", ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M14.82 2.41a6.83 6.83 0 0 0-6.82 6.82 6.83 6.83 0 0 0 6.82 6.82 6.83 6.83 0 0 0 6.82-6.82 6.83 6.83 0 0 0-6.82-6.82zM2.36 21.59h3.77V2.41H2.36v19.18z" />
    </svg>
  );
}

export default PatreonIcon;
