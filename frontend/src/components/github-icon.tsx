import type { SVGProps } from "react";

type GitHubIconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
};

export function GitHubIcon({
  size = 16,
  width,
  height,
  ...props
}: GitHubIconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={width ?? size}
      height={height ?? size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M12 0C5.37 0 0 5.51 0 12.3c0 5.44 3.44 10.05 8.21 11.68.6.11.82-.27.82-.59 0-.29-.01-1.06-.02-2.08-3.34.74-4.04-1.65-4.04-1.65-.55-1.42-1.33-1.8-1.33-1.8-1.09-.76.08-.74.08-.74 1.2.09 1.84 1.27 1.84 1.27 1.07 1.88 2.81 1.34 3.49 1.02.11-.79.42-1.34.76-1.65-2.67-.31-5.47-1.37-5.47-6.08 0-1.34.47-2.44 1.24-3.3-.13-.31-.54-1.56.12-3.25 0 0 1.01-.33 3.3 1.26a11.2 11.2 0 0 1 6 0c2.29-1.59 3.3-1.26 3.3-1.26.66 1.69.25 2.94.12 3.25.77.86 1.24 1.96 1.24 3.3 0 4.73-2.81 5.77-5.48 6.08.43.38.81 1.13.81 2.28 0 1.65-.02 2.98-.02 3.38 0 .33.22.71.83.59A12.25 12.25 0 0 0 24 12.3C24 5.51 18.63 0 12 0Z" />
    </svg>
  );
}
