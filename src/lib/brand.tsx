import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const KEY = "coindecc-brand";

export type Brand = {
  /** merchant avatar image (data URL) */
  avatar: string | null;
  /** brand logo used in checkout + receipts (data URL) */
  logo: string | null;
  /** product image attached to a checkout session (data URL) */
  product: string | null;
  /** merchant business name — single source of truth across the app */
  businessName: string;
  /** settlement wallet shown in profile menu + settings */
  settlementWallet: string;
};

const EMPTY: Brand = {
  avatar: null,
  logo: null,
  product: null,
  businessName: "My Business",
  settlementWallet: "",
};

function normalizeBrand(value: unknown): Brand {
  if (!value || typeof value !== "object") return EMPTY;
  const saved = value as Partial<Brand>;
  return {
    avatar: typeof saved.avatar === "string" ? saved.avatar : null,
    logo: typeof saved.logo === "string" ? saved.logo : null,
    product: typeof saved.product === "string" ? saved.product : null,
    businessName:
      typeof saved.businessName === "string" && saved.businessName.trim()
        ? saved.businessName
        : EMPTY.businessName,
    settlementWallet:
      typeof saved.settlementWallet === "string" ? saved.settlementWallet : "",
  };
}

type ImageKey = "avatar" | "logo" | "product";

type Ctx = Brand & {
  setImage: (key: ImageKey, value: string | null) => void;
  setProfile: (patch: Partial<Pick<Brand, "businessName" | "settlementWallet">>) => void;
  initials: string;
};

export function toInitials(name: string) {
  const parts = (typeof name === "string" ? name : "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "NS";
  return (parts[0]![0]! + (parts[1]?.[0] ?? parts[0]![1] ?? "")).toUpperCase();
}

const BrandContext = createContext<Ctx>({
  ...EMPTY,
  setImage: () => {},
  setProfile: () => {},
  initials: "NS",
});

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brand, setBrand] = useState<Brand>(EMPTY);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setBrand(normalizeBrand(JSON.parse(raw)));
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  const persist = useCallback((next: Brand) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* quota exceeded — keep in-memory only */
    }
    return next;
  }, []);

  const setImage = useCallback(
    (key: ImageKey, value: string | null) => setBrand((b) => persist({ ...b, [key]: value })),
    [persist],
  );

  const setProfile = useCallback(
    (patch: Partial<Pick<Brand, "businessName" | "settlementWallet">>) =>
      setBrand((b) => persist({ ...b, ...patch })),
    [persist],
  );

  return (
    <BrandContext.Provider
      value={{ ...brand, setImage, setProfile, initials: toInitials(brand.businessName) }}
    >
      {children}
    </BrandContext.Provider>
  );
}

export const useBrand = () => useContext(BrandContext);

export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      reject(new Error("Unsupported file type. Use PNG, JPG or SVG."));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error("Image is larger than 2MB."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}
