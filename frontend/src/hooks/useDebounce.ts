import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => { const id = window.setTimeout(() => setV(value), delay); return () => window.clearTimeout(id); }, [value, delay]);
  return v;
}
