import './globals.css';

export const metadata = {
  title: 'Justapedia Chatbot',
  description: 'AI-powered summaries for Justapedia articles',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="h-screen w-full overflow-hidden antialiased">
        {children}
      </body>
    </html>
  );
}
