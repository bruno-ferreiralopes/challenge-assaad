import clsx from "clsx";

type SpinnerProps = {
  color?: string;
  width?: number | string;
  height?: number | string;
  className?: string;
};

function toCssSize(value: number | string) {
  return typeof value === "number" ? `${value}px` : value;
}

export function Spinner({
  color = "currentColor",
  width = 24,
  height = 24,
  className,
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Carregando"
      className={clsx(
        "inline-block animate-spin rounded-full border-solid border-transparent",
        className,
      )}
      style={{
        width: toCssSize(width),
        height: toCssSize(height),
        borderWidth:
          typeof width === "number" ? Math.max(2, Math.round(width / 8)) : 2,
        borderTopColor: color,
      }}
    />
  );
}
