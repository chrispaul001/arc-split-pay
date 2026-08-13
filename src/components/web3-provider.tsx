import "@rainbow-me/rainbowkit/styles.css";
import { useEffect, useState, type ReactNode } from "react";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";
import { useTheme } from "@/hooks/use-theme";

export function Web3Provider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <>{children}</>;

  return (
    <WagmiProvider config={wagmiConfig}>
      <RainbowKitProvider
        modalSize="compact"
        theme={
          theme === "dark"
            ? darkTheme({ accentColor: "#3b82f6", borderRadius: "large" })
            : lightTheme({ accentColor: "#1d4ed8", borderRadius: "large" })
        }
      >
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  );
}
