import './globals.css';

export const metadata = {
  title: 'Kart Bros Leaderboard',
  description: 'Track and compare Kart Bros time trial rankings by map.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}