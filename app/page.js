import { leaderboardData } from '../data/leaderboard';

function formatTime(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return '-';

  const minutes = Math.floor(seconds / 60);
  const remaining = (seconds % 60).toFixed(3).padStart(6, '0');

  return minutes > 0 ? `${minutes}:${remaining}` : `${seconds.toFixed(3)}s`;
}

function sortTrackEntries(entries) {
  return [...entries].sort((a, b) => {
    if (a.bestTotal == null && b.bestTotal == null) return 0;
    if (a.bestTotal == null) return 1;
    if (b.bestTotal == null) return -1;
    return a.bestTotal - b.bestTotal;
  });
}

export default function HomePage() {
  const tracks = Object.entries(leaderboardData);

  return (
    <main className="page-shell">
      <div className="page-content">
        <header className="hero">
          <p className="eyebrow">Kart Bros Time Trial</p>
          <h1>Kart Bros Leaderboard</h1>
          <p className="hero-text">
            Click any track below to expand the rankings and compare best lap and total time.
          </p>
        </header>

        <section className="track-list">
          {tracks.map(([trackName, entries]) => {
            const sortedEntries = sortTrackEntries(entries);

            return (
              <details key={trackName} className="track-card">
                <summary className="track-summary">
                  <span className="track-title">{trackName}</span>
                  <span className="track-hint">Click to expand</span>
                </summary>

                <div className="track-body">
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Rank</th>
                          <th>Player</th>
                          <th>Best Lap</th>
                          <th>Best Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedEntries.map((entry, index) => (
                          <tr key={`${trackName}-${entry.player}`}>
                            <td>#{index + 1}</td>
                            <td>{entry.player}</td>
                            <td>{formatTime(entry.bestLap)}</td>
                            <td>{formatTime(entry.bestTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </details>
            );
          })}
        </section>
      </div>
    </main>
  );
}