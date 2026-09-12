const WIDTHS = {
  prose: "max-w-3xl",
  default: "max-w-5xl",
  wide: "max-w-7xl",
} as const;

/** The page gutter, previously copy-pasted across four routes. */
export default function PageContainer({
  children,
  width = "default",
  className = "",
}: {
  children: React.ReactNode;
  width?: keyof typeof WIDTHS;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto px-5 py-10 sm:px-10 sm:py-14 ${WIDTHS[width]} ${className}`}
    >
      {children}
    </div>
  );
}
