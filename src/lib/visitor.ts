import { centres } from "@/content/site";

export type Visitor = { city: string; latitude: number; longitude: number; country?: string };

// Nearest Dignifyd centre by browser timezone (used when IP lookup is unavailable).
const TZ_TO_CENTRE: [RegExp, string][] = [
  [/^Europe\//, "London"],
  [/^Africa\//, "Dubai"],
  [/^Asia\/(Dubai|Muscat|Qatar|Bahrain|Riyadh|Kuwait|Baghdad|Tehran|Karachi)/, "Dubai"],
  [/^Asia\/(Kolkata|Calcutta|Colombo|Kathmandu|Dhaka|Thimphu)/, "Delhi NCR"],
  [/^(Asia|Australia|Pacific)\//, "Singapore"],
  [/^America\/(Toronto|Montreal|Halifax|Vancouver|Edmonton|Winnipeg|Regina|St_Johns|Moncton)/, "Toronto"],
  [/^America\//, "Chicago"],
];

export function nearestCentre(): (typeof centres)[number] {
  let tz = "";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {}
  const hit = TZ_TO_CENTRE.find(([re]) => re.test(tz));
  return centres.find((c) => c.city === (hit?.[1] ?? "London")) ?? centres[0];
}

let pending: Promise<Visitor> | null = null;

export function getVisitor(): Promise<Visitor> {
  if (pending) return pending;
  const fallback = (): Visitor => {
    const c = nearestCentre();
    return { city: c.city, latitude: c.lat, longitude: c.lon };
  };
  pending = (async () => {
    try {
      const cached = sessionStorage.getItem("dg_visitor");
      if (cached) return JSON.parse(cached) as Visitor;
    } catch {}
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3500);
      const r = await fetch("https://ipapi.co/json/", { signal: ctrl.signal });
      clearTimeout(t);
      const j = await r.json();
      if (typeof j?.latitude === "number" && j.city) {
        const v: Visitor = { city: j.city, latitude: j.latitude, longitude: j.longitude, country: j.country_code };
        try {
          sessionStorage.setItem("dg_visitor", JSON.stringify(v));
        } catch {}
        return v;
      }
    } catch {}
    return fallback();
  })();
  return pending;
}
