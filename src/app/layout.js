import "./globals.css";

export const metadata = {
  title: "Reverse Ludo Admin",
  description: "Admin panel for Reverse Ludo game",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
