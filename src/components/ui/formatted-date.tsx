"use client";

import { useEffect, useState } from "react";

type FormattedDateProps = {
  value: string;
  fallback?: string;
};

export function FormattedDate({
  value,
  fallback = "-",
}: FormattedDateProps) {
  const [formatted, setFormatted] = useState(fallback);

  useEffect(() => {
    setFormatted(new Date(value).toLocaleString("pt-BR"));
  }, [value]);

  return formatted;
}
