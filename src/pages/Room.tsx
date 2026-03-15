import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, updateDoc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useRoom } from "../hooks/useRoom";
import { useParticipants } from "../hooks/useParticipants";
import oscarsData from "../data/oscars-2025.json";
import type { Category } from "../types";

function JoinPrompt({ code, room, onJoined }: { code: string; room: { locked: boolean }; onJoined: (name: string) => void }) {
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setJoining(true);
    setError("");

    try {
      if (room.locked) {
        setError("This room is locked. No new participants can join.");
        return;
      }

      const ref = doc(db, "rooms", code.toUpperCase(), "participants", name.trim());
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          name: name.trim(),
          picks: {},
          joinedAt: Date.now(),
        });
      }

      localStorage.setItem(`name-${code.toUpperCase()}`, name.trim());
      onJoined(name.trim());
    } catch {
      setError("Failed to join. Try again.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-yellow-900/20 text-white flex items-center justify-center">
      <div className="max-w-md w-full px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-yellow-400">🏆 Join Room {code}</h1>
          {room.locked && (
            <p className="text-red-400 mt-2">This room is locked. No new participants can join.</p>
          )}
        </div>

        {!room.locked && (
          <form onSubmit={handleJoin} className="bg-gray-800 rounded-xl p-6 space-y-3">
            {error && (
              <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 text-center text-sm">
                {error}
              </div>
            )}
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-yellow-400 focus:outline-none"
              maxLength={30}
              autoFocus
            />
            <button
              type="submit"
              disabled={joining || !name.trim()}
              className="w-full py-3 rounded-lg bg-yellow-500 text-gray-900 font-semibold hover:bg-yellow-400 disabled:opacity-50 transition-colors"
            >
              {joining ? "Joining..." : "Join Room"}
            </button>
          </form>
        )}

        <div className="text-center mt-4">
          <Link to="/" className="text-gray-400 hover:text-white text-sm">← Home</Link>
        </div>
      </div>
    </div>
  );
}

export default function Room() {
  const { code } = useParams<{ code: string }>();
  const { room, loading, error } = useRoom(code);
  const { participants } = useParticipants(code);
  const [tab, setTab] = useState<"picks" | "leaderboard" | "admin">("picks");
  const [userName, setUserName] = useState(() =>
    code ? localStorage.getItem(`name-${code.toUpperCase()}`) : null
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading room...</p>
      </div>
    );
  }

  if (error || !room || !code) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center flex-col gap-4">
        <p className="text-red-400">{error || "Room not found"}</p>
        <Link to="/" className="text-yellow-400 underline">
          Back to Home
        </Link>
      </div>
    );
  }

  // If user hasn't joined this room yet, show the join prompt inline
  const hasJoined = userName && participants.some((p) => p.name === userName);
  if (!hasJoined) {
    return <JoinPrompt code={code} room={room} onJoined={setUserName} />;
  }

  const adminSecret = localStorage.getItem(`admin-${code.toUpperCase()}`);
  const isAdmin = adminSecret === room.adminSecret;

  const categories = oscarsData.categories.filter((c) =>
    room.selectedCategories.includes(c.id)
  );

  const currentParticipant = participants.find((p) => p.name === userName);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-yellow-900/20 text-white">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-yellow-400">
              🏆 Room {code}
              <span className="text-base font-normal text-gray-300 ml-2">
                — {userName}
              </span>
            </h1>
            <p className="text-sm text-gray-400">
              {participants.length} participant{participants.length !== 1 && "s"}{" "}
              • {room.locked ? "🔒 Locked" : "🔓 Open"}
            </p>
          </div>
          <Link to="/" className="text-gray-400 hover:text-white text-sm">
            ← Home
          </Link>
        </div>

        {/* Share banner */}
        {!room.locked && (
          <div className="bg-gray-800 rounded-lg p-3 mb-6 text-center text-sm">
            Share this code with friends:{" "}
            <span className="font-mono text-yellow-400 text-lg tracking-widest">
              {code}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/room/${code}`
                );
              }}
              className="ml-3 text-xs bg-gray-700 px-2 py-1 rounded hover:bg-gray-600 transition-colors"
            >
              Copy Link
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-800 rounded-lg p-1">
          <TabButton
            active={tab === "picks"}
            onClick={() => setTab("picks")}
            label="My Picks"
          />
          <TabButton
            active={tab === "leaderboard"}
            onClick={() => setTab("leaderboard")}
            label="Leaderboard"
          />
          {isAdmin && (
            <TabButton
              active={tab === "admin"}
              onClick={() => setTab("admin")}
              label="Admin"
            />
          )}
        </div>

        {/* Content */}
        {tab === "picks" && (
          <PicksTab
            code={code}
            userName={userName}
            categories={categories}
            currentPicks={currentParticipant?.picks || {}}
            locked={room.locked}
            winners={room.winners}
          />
        )}
        {tab === "leaderboard" && (
          <LeaderboardTab
            participants={participants}
            categories={categories}
            winners={room.winners}
          />
        )}
        {tab === "admin" && isAdmin && (
          <AdminTab code={code} room={room} categories={oscarsData.categories} />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
        active
          ? "bg-yellow-500 text-gray-900"
          : "text-gray-400 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function PicksTab({
  code,
  userName,
  categories,
  currentPicks,
  locked,
  winners,
}: {
  code: string;
  userName: string | null;
  categories: Category[];
  currentPicks: Record<string, string>;
  locked: boolean;
  winners: Record<string, string>;
}) {
  const [saving, setSaving] = useState<string | null>(null);

  if (!userName) {
    return (
      <div className="text-center text-gray-400 py-8">
        <p>You haven't joined this room yet.</p>
        <Link to="/" className="text-yellow-400 underline mt-2 inline-block">
          Go back to join
        </Link>
      </div>
    );
  }

  async function handlePick(categoryId: string, nominee: string) {
    if (locked) return;
    setSaving(categoryId);
    try {
      const newPicks = { ...currentPicks, [categoryId]: nominee };
      await setDoc(
        doc(db, "rooms", code.toUpperCase(), "participants", userName!),
        { picks: newPicks },
        { merge: true }
      );
    } catch (err) {
      console.error("Failed to save pick:", err);
    } finally {
      setSaving(null);
    }
  }

  const pickedCount = Object.keys(currentPicks).length;

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-400 text-center">
        {pickedCount} of {categories.length} categories picked
      </div>

      {categories.map((category) => {
        const winner = winners[category.id];
        const myPick = currentPicks[category.id];
        const isCorrect = winner && myPick === winner;
        const isWrong = winner && myPick && myPick !== winner;

        return (
          <div
            key={category.id}
            className={`bg-gray-800 rounded-xl p-4 ${
              winner
                ? isCorrect
                  ? "ring-2 ring-green-500"
                  : isWrong
                  ? "ring-2 ring-red-500"
                  : ""
                : ""
            }`}
          >
            <h3 className="font-semibold text-yellow-400 mb-3 flex items-center gap-2">
              {category.name}
              {winner && (
                <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded-full">
                  Winner announced
                </span>
              )}
              {saving === category.id && (
                <span className="text-xs text-gray-500">Saving...</span>
              )}
            </h3>
            <div className="space-y-1.5">
              {category.nominees.map((nominee) => {
                const isSelected = myPick === nominee;
                const isWinner = winner === nominee;

                return (
                  <button
                    key={nominee}
                    onClick={() => handlePick(category.id, nominee)}
                    disabled={locked || saving === category.id}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      isWinner
                        ? "bg-green-900/60 text-green-200 ring-1 ring-green-500"
                        : isSelected
                        ? "bg-yellow-500/20 text-yellow-200 ring-1 ring-yellow-500"
                        : "bg-gray-700/50 text-gray-300 hover:bg-gray-700 disabled:hover:bg-gray-700/50"
                    } ${locked ? "cursor-default" : "cursor-pointer"}`}
                  >
                    <span className="flex items-center gap-2">
                      {isSelected && !isWinner && "⭐ "}
                      {isWinner && "🏆 "}
                      {nominee}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeaderboardTab({
  participants,
  categories,
  winners,
}: {
  participants: { name: string; picks: Record<string, string> }[];
  categories: Category[];
  winners: Record<string, string>;
}) {
  const announcedCount = Object.keys(winners).length;

  const scored = participants
    .map((p) => {
      let correct = 0;
      let total = 0;
      for (const cat of categories) {
        if (p.picks[cat.id]) {
          total++;
          if (winners[cat.id] && p.picks[cat.id] === winners[cat.id]) {
            correct++;
          }
        }
      }
      return { name: p.name, correct, total };
    })
    .sort((a, b) => b.correct - a.correct || b.total - a.total);

  return (
    <div>
      <div className="text-sm text-gray-400 text-center mb-4">
        {announcedCount} of {categories.length} winners announced
      </div>

      {announcedCount === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <p className="text-4xl mb-3">🍿</p>
          <p>No winners announced yet.</p>
          <p className="text-sm mt-1">
            The leaderboard will update in real-time as winners are announced.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {scored.map((p, i) => (
            <div
              key={p.name}
              className={`flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3 ${
                i === 0 ? "ring-2 ring-yellow-500" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-500 w-8">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                </span>
                <span className="font-medium">{p.name}</span>
              </div>
              <div className="text-right">
                <span className="text-yellow-400 font-bold text-lg">
                  {p.correct}
                </span>
                <span className="text-gray-500 text-sm">
                  /{announcedCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Picks breakdown */}
      {announcedCount > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
            Picks Breakdown
          </h3>
          {categories
            .filter((c) => winners[c.id])
            .map((cat) => (
              <div key={cat.id} className="mb-4">
                <div className="text-sm font-medium text-yellow-400 mb-1">
                  {cat.name}
                </div>
                <div className="text-xs text-green-400 mb-2">
                  🏆 {winners[cat.id]}
                </div>
                <div className="flex flex-wrap gap-1">
                  {participants.map((p) => {
                    const pick = p.picks[cat.id];
                    const correct = pick === winners[cat.id];
                    return (
                      <span
                        key={p.name}
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          correct
                            ? "bg-green-900 text-green-300"
                            : pick
                            ? "bg-red-900/50 text-red-400"
                            : "bg-gray-700 text-gray-500"
                        }`}
                        title={pick || "No pick"}
                      >
                        {p.name} {correct ? "✓" : pick ? "✗" : "—"}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function LiveWinnerPicker({
  categories,
  winners,
  onSetWinner,
}: {
  categories: Category[];
  winners: Record<string, string>;
  onSetWinner: (categoryId: string, nominee: string) => void;
}) {
  const unannounced = categories.filter((c) => !winners[c.id]);
  const announced = categories.filter((c) => winners[c.id]);
  const [activeId, setActiveId] = useState<string | null>(
    unannounced[0]?.id ?? null
  );

  const activeCat = categories.find((c) => c.id === activeId);

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Announce Winners</h3>
          <span className="text-sm text-gray-400">
            {announced.length}/{categories.length}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
            style={{
              width: `${(announced.length / categories.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Quick-select category */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h4 className="text-xs uppercase text-gray-500 font-semibold mb-2">
          Select category to announce
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => {
            const done = !!winners[cat.id];
            const active = cat.id === activeId;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveId(cat.id)}
                className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                  done
                    ? active
                      ? "bg-green-700 text-green-200 ring-1 ring-green-400"
                      : "bg-green-900/40 text-green-400"
                    : active
                    ? "bg-yellow-500 text-gray-900 font-semibold"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {done ? "✓ " : ""}
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Winner selection for active category */}
      {activeCat && (
        <div className="bg-gray-800 rounded-xl p-5">
          <h3 className="text-lg font-bold text-yellow-400 mb-1">
            {activeCat.name}
          </h3>
          {winners[activeCat.id] && (
            <p className="text-sm text-green-400 mb-3">
              Winner: {winners[activeCat.id]}
            </p>
          )}
          <p className="text-xs text-gray-500 mb-4">
            Tap the winner. Tap again to undo.
          </p>
          <div className="space-y-2">
            {activeCat.nominees.map((nominee) => {
              const isWinner = winners[activeCat.id] === nominee;
              return (
                <button
                  key={nominee}
                  onClick={() => {
                    onSetWinner(activeCat.id, nominee);
                    // Auto-advance to next unannounced category
                    if (!isWinner) {
                      const next = categories.find(
                        (c) => c.id !== activeCat.id && !winners[c.id]
                      );
                      if (next) setTimeout(() => setActiveId(next.id), 300);
                    }
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-base font-medium transition-all ${
                    isWinner
                      ? "bg-green-600 text-white ring-2 ring-green-400 scale-[1.02]"
                      : "bg-gray-700 text-gray-200 hover:bg-gray-600 active:scale-[0.98]"
                  }`}
                >
                  {isWinner ? "🏆 " : ""}
                  {nominee}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Announced history */}
      {announced.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-4">
          <h4 className="text-xs uppercase text-gray-500 font-semibold mb-3">
            Announced
          </h4>
          <div className="space-y-1.5">
            {announced.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveId(cat.id)}
                className="w-full flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors"
              >
                <span className="text-gray-400">{cat.name}</span>
                <span className="text-green-400">🏆 {winners[cat.id]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminTab({
  code,
  room,
  categories,
}: {
  code: string;
  room: {
    locked: boolean;
    selectedCategories: string[];
    winners: Record<string, string>;
  };
  categories: Category[];
}) {
  const [saving, setSaving] = useState(false);

  async function toggleLock() {
    setSaving(true);
    try {
      await updateDoc(doc(db, "rooms", code.toUpperCase()), {
        locked: !room.locked,
      });
    } finally {
      setSaving(false);
    }
  }

  async function toggleCategory(categoryId: string) {
    const current = room.selectedCategories;
    const updated = current.includes(categoryId)
      ? current.filter((id) => id !== categoryId)
      : [...current, categoryId];

    await updateDoc(doc(db, "rooms", code.toUpperCase()), {
      selectedCategories: updated,
    });
  }

  async function setWinner(categoryId: string, nominee: string) {
    const winners = { ...room.winners };
    if (winners[categoryId] === nominee) {
      delete winners[categoryId];
    } else {
      winners[categoryId] = nominee;
    }
    await updateDoc(doc(db, "rooms", code.toUpperCase()), { winners });
  }

  const selectedCats = categories.filter((c) =>
    room.selectedCategories.includes(c.id)
  );

  return (
    <div className="space-y-6">
      {/* Lock toggle */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Room Access</h3>
            <p className="text-sm text-gray-400">
              {room.locked
                ? "Room is locked — no new participants"
                : "Room is open — anyone with the code can join"}
            </p>
          </div>
          <button
            onClick={toggleLock}
            disabled={saving}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              room.locked
                ? "bg-green-600 hover:bg-green-500 text-white"
                : "bg-red-600 hover:bg-red-500 text-white"
            }`}
          >
            {room.locked ? "🔓 Unlock" : "🔒 Lock Room"}
          </button>
        </div>
      </div>

      {/* Category selection */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h3 className="font-semibold mb-3">Categories</h3>
        <p className="text-sm text-gray-400 mb-3">
          Toggle which categories participants can pick from.
        </p>
        <div className="space-y-1.5">
          {categories.map((cat) => (
            <label
              key={cat.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-700 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={room.selectedCategories.includes(cat.id)}
                onChange={() => toggleCategory(cat.id)}
                className="accent-yellow-500"
              />
              <span className="text-sm">{cat.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Live Mode - Announce Winners */}
      <LiveWinnerPicker
        categories={selectedCats}
        winners={room.winners}
        onSetWinner={setWinner}
      />
    </div>
  );
}
