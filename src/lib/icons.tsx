import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const UsersIcon = (props: IconProps) => (
  <svg {...base} {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
export const CourtIcon = (props: IconProps) => (
  <svg {...base} {...props}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16M3 12h18M7 8h2M15 16h2"/></svg>
);
export const SparkleIcon = (props: IconProps) => (
  <svg {...base} {...props}><path d="m12 3-1.5 4.5L6 9l4.5 1.5L12 15l1.5-4.5L18 9l-4.5-1.5L12 3Z"/><path d="m5 16-.75 2.25L2 19l2.25.75L5 22l.75-2.25L8 19l-2.25-.75L5 16ZM19 13l-.75 2.25L16 16l2.25.75L19 19l.75-2.25L22 16l-2.25-.75L19 13Z"/></svg>
);
export const TrashIcon = (props: IconProps) => (
  <svg {...base} {...props}><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14M10 11v5M14 11v5"/></svg>
);
export const ChevronIcon = (props: IconProps) => (
  <svg {...base} {...props}><path d="m6 9 6 6 6-6"/></svg>
);
export const CheckIcon = (props: IconProps) => (
  <svg {...base} {...props}><path d="m5 12 4 4L19 6"/></svg>
);
export const RefreshIcon = (props: IconProps) => (
  <svg {...base} {...props}><path d="M20 6v5h-5M4 18v-5h5"/><path d="M18.5 9A7 7 0 0 0 6.2 6.2L4 8m2 7a7 7 0 0 0 11.8 2.8L20 16"/></svg>
);
export const EditIcon = (props: IconProps) => (
  <svg {...base} {...props}><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>
);
export const ChartIcon = (props: IconProps) => (
  <svg {...base} {...props}><path d="M4 19V9M10 19V5M16 19v-7M22 19V3"/></svg>
);
export const BrandMark = (props: IconProps) => (
  <svg viewBox="0 0 44 48" fill="none" {...props}>
    <path d="M7 36c7-5 13-11 17-20" stroke="#0D456F" strokeWidth="5" strokeLinecap="round"/>
    <path d="M14 38c6-4 13-12 17-22" stroke="#159A66" strokeWidth="6" strokeLinecap="round"/>
    <path d="M21 40c6-5 12-13 15-21" stroke="#37B47A" strokeWidth="6" strokeLinecap="round"/>
    <path d="M6 35c5-1 11 2 14 7-7 3-14 0-14-7Z" fill="#0B315F"/>
  </svg>
);
