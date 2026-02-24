export const size = 32;

export default function Icon() {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="6" fill="#22c55e" />
      <text
        x="16"
        y="21"
        textAnchor="middle"
        fontSize="16"
        fill="white"
        fontFamily="monospace"
        fontWeight="bold"
      >
        B
      </text>
    </svg>
  );
}
