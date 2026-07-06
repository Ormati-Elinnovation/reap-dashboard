import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reap — הוצאות",
  description: "Reap expenses dashboard",
};

// Set theme before paint to avoid a flash of the wrong theme.
const themeScript = `try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
