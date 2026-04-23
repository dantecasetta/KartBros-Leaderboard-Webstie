'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { leaderboardData as defaultLeaderboardData } from '../data/leaderboard';
import { db } from '../lib/firebase';

function formatTime(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return '-';

  const minutes = Math.floor(seconds / 60);
  const remaining = (seconds % 60).toFixed(3).padStart(6, '0');

  return minutes > 0 ? `${minutes}:${remaining}` : `${seconds.toFixed(3)}s`;
}

function sortTrackEntries(entries) {
  return [...entries].sort((a, b) => {
    if (a.bestLap == null && b.bestLap == null) return 0;
    if (a.bestLap == null) return 1;
    if (b.bestLap == null) return -1;
    return a.bestLap - b.bestLap;
  });
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

async function writePayloadToFirestore(payload) {
  if (!payload || !payload.player || !Array.isArray(payload.times)) return;

  const playerId = payload.player.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  await setDoc(
    doc(db, 'players', playerId),
    {
      player: payload.player,
      exportedAt: payload.exportedAt || null,
      updatedAt: serverTimestamp(),
      times: payload.times,
    },
    { merge: true }
  );
}

function convertPlayersToLeaderboard(players) {
  const nextData = {};

  for (const playerRecord of players) {
    const playerName = playerRecord.player;
    const times = Array.isArray(playerRecord.times) ? playerRecord.times : [];

    for (const timeEntry of times) {
      if (!timeEntry?.track) continue;

      if (!nextData[timeEntry.track]) {
        nextData[timeEntry.track] = [];
      }

      nextData[timeEntry.track].push({
        player: playerName,
        bestLap:
          typeof timeEntry.bestLapSeconds === 'number'
            ? timeEntry.bestLapSeconds
            : null,
        bestTotal:
          typeof timeEntry.bestTotalSeconds === 'number'
            ? timeEntry.bestTotalSeconds
            : null,
      });
    }
  }

  return nextData;
}


// Helper to compute player stats for summary
function computePlayerStats(tracks) {
  const stats = {};
  tracks.forEach(([, entries]) => {
    const sorted = sortTrackEntries(entries);
    sorted.forEach((entry, idx) => {
      if (!entry.player) return;
      if (!stats[entry.player]) stats[entry.player] = { first: 0, second: 0, third: 0, points: 0 };
      if (idx === 0) { stats[entry.player].first += 1; stats[entry.player].points += 5; }
      else if (idx === 1) { stats[entry.player].second += 1; stats[entry.player].points += 3; }
      else if (idx === 2) { stats[entry.player].third += 1; stats[entry.player].points += 1; }
    });
  });
  return Object.entries(stats)
    .map(([player, s]) => ({ player, ...s }))
    .sort((a, b) => b.points - a.points || a.player.localeCompare(b.player));
}

export default function HomePage() {
  const [leaderboard, setLeaderboard] = useState(defaultLeaderboardData);
  const [statusMessage, setStatusMessage] = useState('');
  const [debugMessage, setDebugMessage] = useState('Starting app...');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsub = null;

    async function setup() {
      try {
        setDebugMessage('Reading payload from URL...');
        const payload = readPayloadFromUrl();

        if (payload) {
          setDebugMessage('Writing payload to Firestore...');
          await writePayloadToFirestore(payload);
          setStatusMessage(`Imported times for ${payload.player}.`);

          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete('payload');
          window.history.replaceState({}, '', cleanUrl.toString());
        }

        setDebugMessage('Listening for Firestore player updates...');
        unsub = onSnapshot(
          collection(db, 'players'),
          (snapshot) => {
            const players = snapshot.docs.map((docSnapshot) => docSnapshot.data());
            const nextLeaderboard = convertPlayersToLeaderboard(players);
            setLeaderboard(nextLeaderboard);
            setIsLoading(false);
            setDebugMessage('Leaderboard data loaded.');
          },
          (error) => {
            console.error('Firestore snapshot error:', error);
            setLeaderboard(defaultLeaderboardData);
            setStatusMessage('Could not load shared leaderboard data.');
            setIsLoading(false);
            setDebugMessage('Firestore snapshot error occurred.');
          }
        );
      } catch (error) {
        console.error(error);
        setLeaderboard(defaultLeaderboardData);
        setStatusMessage('Could not load shared leaderboard data.');
        setIsLoading(false);
        setDebugMessage('Failed to initialize Firestore.');
      }
    }

    setup();

    return () => {
      if (typeof unsub === 'function') {
        unsub();
      }
    };
  }, []);

  const tracks = useMemo(() => Object.entries(leaderboard), [leaderboard]);
  const playerStats = useMemo(() => computePlayerStats(tracks), [tracks]);

  return (
    <main className="page-shell">
      <div className="page-content">
        <header className="hero">
          <p className="eyebrow">Kart Bros Time Trial</p>
          <h1>Kart Bros Leaderboard</h1>
          <p className="hero-text">
            Click any track below to expand the rankings and compare best lap and total time.
          </p>

          {statusMessage ? <p className="status-message">{statusMessage}</p> : null}
          {debugMessage ? <p className="status-message">{debugMessage}</p> : null}
        </header>

        {/* Player summary section */}
        {!isLoading && tracks.length > 0 && (
          <section className="player-summary" style={{ marginBottom: 32 }}>
            <h2>🏆 Player Standings</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>🥇 1st</th>
                    <th>🥈 2nd</th>
                    <th>🥉 3rd</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {playerStats.map((stat) => (
                    <tr key={stat.player}>
                      <td>{stat.player}</td>
                      <td>{stat.first}</td>
                      <td>{stat.second}</td>
                      <td>{stat.third}</td>
                      <td>{stat.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {isLoading ? (
          <section className="empty-state">
            <h2>Loading leaderboard...</h2>
            <p>Please wait while the latest times are loaded.</p>
          </section>
        ) : tracks.length === 0 ? (
          <section className="empty-state">
            <h2>No leaderboard data yet</h2>
            <p>
              Once a bookmarklet sends player times here, the rankings will appear automatically for everyone.
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