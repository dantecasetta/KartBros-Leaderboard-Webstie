'use client';

import { useEffect, useMemo, useState } from 'react';
import { leaderboardData as defaultLeaderboardData } from '../data/leaderboard';

const STORAGE_KEY = 'kartbrosLeaderboardData';

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

function mergePayloadIntoLeaderboard(currentData, payload) {
  if (!payload || !payload.player || !Array.isArray(payload.times)) {
    return currentData;
  }

  const nextData = { ...currentData };

  for (const timeEntry of payload.times) {
    if (!timeEntry?.track) continue;

    const track = timeEntry.track;
    const existingEntries = Array.isArray(nextData[track]) ? [...nextData[track]] : [];
    const existingIndex = existingEntries.findIndex(
      (entry) => entry.player === payload.player
    );

    const newPlayerEntry = {
      player: payload.player,
      bestLap:
        typeof timeEntry.bestLapSeconds === 'number'
          ? timeEntry.bestLapSeconds
          : null,
      bestTotal:
        typeof timeEntry.bestTotalSeconds === 'number'
          ? timeEntry.bestTotalSeconds
          : null,
    };

    if (existingIndex >= 0) {
      existingEntries[existingIndex] = newPlayerEntry;
    } else {
      existingEntries.push(newPlayerEntry);
    }

    nextData[track] = existingEntries;
  }

  return nextData;
}

function readPayloadFromUrl() {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const payload = params.get('payload');

  if (!payload) return null;

  try {
    return JSON.parse(payload);
  } catch {
    try {
      return JSON.parse(decodeURIComponent(payload));
    } catch {
      return null;
    }
  }
}

export default function HomePage() {
  const [leaderboard, setLeaderboard] = useState(defaultLeaderboardData);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    try {
      const savedData = window.localStorage.getItem(STORAGE_KEY);
      let baseData = defaultLeaderboardData;

      if (savedData) {
        baseData = JSON.parse(savedData);
      }

      const payload = readPayloadFromUrl();

      if (payload) {
        const mergedData = mergePayloadIntoLeaderboard(baseData, payload);
        setLeaderboard(mergedData);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedData));
        setStatusMessage(`Imported times for ${payload.player}.`);

        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('payload');
        window.history.replaceState({}, '', cleanUrl.toString());
      } else {
        setLeaderboard(baseData);
      }
    } catch {
      setLeaderboard(defaultLeaderboardData);
      setStatusMessage('Could not load saved leaderboard data.');
    }
  }, []);

  const tracks = useMemo(() => Object.entries(leaderboard), [leaderboard]);

  function clearLeaderboard() {
    window.localStorage.removeItem(STORAGE_KEY);
    setLeaderboard(defaultLeaderboardData);
    setStatusMessage('Leaderboard data cleared from this browser.');
  }

  return (
    <main className="page-shell">
      <div className="page-content">
        <header className="hero">
          <p className="eyebrow">Kart Bros Time Trial</p>
          <h1>Kart Bros Leaderboard</h1>
          <p className="hero-text">
            Click any track below to expand the rankings and compare best lap and total time.
          </p>

          <div className="hero-actions">
            <button className="clear-button" onClick={clearLeaderboard}>
              Clear saved data
            </button>
            {statusMessage ? <p className="status-message">{statusMessage}</p> : null}
          </div>
        </header>

        {tracks.length === 0 ? (
          <section className="empty-state">
            <h2>No leaderboard data yet</h2>
            <p>
              Once a bookmarklet sends player times here, the rankings will appear automatically.
            </p>
          </section>
        ) : (
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
        )}
      </div>
    </main>
  );
}