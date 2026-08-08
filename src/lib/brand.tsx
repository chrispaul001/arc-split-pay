import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const KEY = "coindecc-brand";

export type Brand = {
  /** merchant avatar image (data URL) */
  avatar: string | null;
  /** brand logo used in checkout + receipts (data URL) */
  logo: string | null;
  /** product image attached to a checkout session (data URL) */
  product: string | null;
};

const EMPTY: Brand = { avatar: null, logo: null, product: null };

type Ctx = Brand & {
  setImage: (key: keyof Brand, value: string | null) => void;
};

const BrandContext = createContext<Ctx>({ ...EMPTY, setImage: () => {} });

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
