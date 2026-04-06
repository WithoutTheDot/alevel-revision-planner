export default function PmtLinkButton({ href, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-indigo-200 text-indigo-600 bg-white hover:bg-indigo-50 transition-colors"
    >
      {label}
      <svg
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="w-3 h-3 opacity-60"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M2 10L10 2M10 2H5.5M10 2v4.5" />
      </svg>
    </a>
  );
}
