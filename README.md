# Coindecc Pay Dashboard

Build a responsive, modern fintech merchant dashboard and checkout app called "Coindecc Pay" built for the Arc blockchain network. It must feature a fully functional Light Mode and Dark Mode toggle with custom color adaptation.

1. Visual Style & Color Gradients (Crucial):

- Background: A gorgeous vertical gradient that shifts from an ultra-light, crisp ice-blue (almost white, #F0F6FF) at the very top, smoothly transitioning down into a rich, deep midnight navy blue (#0A1128) at the bottom.

- Light Mode Adaptation: In Light Mode, maintain the top-to-bottom gradient from a soft airy ice-blue to a deeper slate-navy container base. Glassmorphism cards should use semi-transparent white backgrounds with subtle borders and crisp dark navy text.

- Dark Mode Adaptation: In Dark Mode, invert the experience gracefully—the background deepens into an immersive dark space navy gradient (from a muted electric blue tint at the top down to a true pitch-black navy #030712 at the bottom). Glassmorphism cards should use deep translucent navy panels (`bg-slate-900/60`) with glowing electric blue borders and bright white text.

2. Layout & Navigation:

- Sidebar Navigation: Links for Overview, Payment Links, Split Router, API Keys, and Settings, plus a clean Light/Dark mode toggle switch.

- Top Header: Displays user profile, active network status badge ("Arc Mainnet - USDC Gas"), and quick action buttons.

3. Core Interactive Screens (Tabbed or View Switcher):

- Dashboard Overview: Metrics cards showing Total Volume (USDC), Active Payment Streams, and Instant Split Executions with mock trend lines.

- Split-Router Link Builder: An interactive form where merchants can generate custom payment links. Include input fields for total amounts, recipient wallet addresses, and dynamic percentage/basis-point sliders that update live to show how incoming USDC is split across multiple parties.

- Embedded Checkout Widget Preview: A live preview of what customers see when paying via Coindecc Pay, showcasing sub-second settlement badges and a single-click pay button.

Ensure the UI is smooth, interactive, uses Tailwind CSS, Lucide icons, and features clean micro-interactions.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fd0f65ad-9346-4975-bc40-92c0f9a6054e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
