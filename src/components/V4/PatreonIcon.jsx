import React from 'react';

export function PatreonIcon({ className = "w-5 h-5", ...props }) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M410 187.937c-.058-41.626-32.514-75.741-70.594-88.05-47.288-15.286-109.656-13.07-154.81 8.21-54.729 25.796-71.921 82.303-72.561 138.659-.526 46.334 4.103 168.37 73.017 169.239 51.205.649 58.829-65.254 82.521-96.994 16.857-22.582 38.561-28.96 65.278-35.564 45.92-11.353 77.215-47.551 77.149-95.5Z" />
    </svg>
  );
}

export default PatreonIcon;
