import { SHARED_CSS, PANEL_CSS } from "@/lib/ui-css";

export const metadata = {
  title: "ördek // Vulnerable Lab",
  description: "ördek — egitim amacli kasitli zafiyetli lab (Low/Medium/High)",
  icons: { icon: "/ordek.png", apple: "/ordek.png" },
};

// Tasarım tek kaynaktan (lib/ui-css.js) gelir; panel için SHARED + PANEL enjekte edilir.
export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <head>
        <style dangerouslySetInnerHTML={{ __html: SHARED_CSS + PANEL_CSS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
