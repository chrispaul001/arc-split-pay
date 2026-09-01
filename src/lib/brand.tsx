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

export const DEFAULT_WALLET = "0x8fA2b41c7Dd90E5a3f77C29b104e0B96b7bb4c19";

const EMPTY: Brand = {
  avatar: null,
  logo: null,
  product: null,
  businessName: "Nova Studio",
  settlementWallet: DEFAULT_WALLET,
};

type ImageKey = "avatar" | "logo" | "product";

type Ctx = Brand & {
  setImage: (key: ImageKey, value: string | null) => void;
  setProfile: (patch: Partial<Pick<Brand, "businessName" | "settlementWallet">>) => void;
  initials: string;
};

export function toInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
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
      if (raw) setBrand({ ...EMPTY, ...(JSON.parse(raw) as Partial<Brand>) });
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  const setImage = useCallback((key: keyof Brand, value: string | null) => {
    setBrand((b) => {
      const next = { ...b, [key]: value };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* quota exceeded — keep in-memory only */
      }
      return next;
    });
  }, []);

  return <BrandContext.Provider value={{ ...brand, setImage }}>{children}</BrandContext.Provider>;
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
