import Cookies from "js-cookie";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

import { CookiesEnum } from "@/enums/cookies";

export const COMPARE_MAX = 4;
const EVENT = "cpr-compare-change";

const read = (): string[] => {
  try {
    const v = JSON.parse(Cookies.get(CookiesEnum.ComparisonItems) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};

const write = (ids: string[]) => {
  Cookies.set(CookiesEnum.ComparisonItems, JSON.stringify(ids), { sameSite: "lax" });
  window.dispatchEvent(new Event(EVENT));
};

/** Products picked for comparison (kept in a cookie, shared by every component on the page). */
export default function useCompare() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setIds(read());
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  const has = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback((id: string) => {
    const cur = read();
    if (cur.includes(id)) return write(cur.filter((x) => x !== id));
    if (cur.length >= COMPARE_MAX) {
      toast.info(`You can compare up to ${COMPARE_MAX} products — remove one first`);
      return;
    }
    write([...cur, id]);
  }, []);

  const remove = useCallback((id: string) => write(read().filter((x) => x !== id)), []);
  const clear = useCallback(() => write([]), []);

  return { ids, has, toggle, remove, clear };
}
