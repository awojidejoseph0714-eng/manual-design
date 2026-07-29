import type { Metadata } from 'next';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';

export const metadata: Metadata = {
  title: 'BS 8110 Manual Design Guide — Slabs, Beams & Columns',
  description: 'A complete step-by-step manual design reference for structural concrete under BS 8110-1:1997. Covers one-way and two-way slabs, flat slabs, beams, and columns — from load take-down to detailing.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Inter:wght@300;400;500;600;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{__html: `
          window.MathJax = {
            tex: {
              inlineMath: [['\\\\(', '\\\\)']],
              displayMath: [['\\\\[', '\\\\]']]
            }
          };
        `}} />
        <script async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
      </head>
      <body>
        {children}
      </body>
      <GoogleAnalytics gaId="G-3B611KJ9MB" />
    </html>
  );
}
