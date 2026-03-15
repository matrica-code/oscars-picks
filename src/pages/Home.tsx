import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import oscarsData from "../data/oscars-2025.json";

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateSecret(): string {
  return crypto.randomUUID();
}

export default function Home() {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [adminName, setAdminName] = useState("");
  const [joinName, setJoinName] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!adminName.trim()) return;
    setCreating(true);
    setError("");

    try {
      const code = generateRoomCode();
      const secret = generateSecret();

      await setDoc(doc(db, "rooms", code), {
        code,
        adminName: adminName.trim(),
        adminSecret: secret,
        locked: false,
        selectedCategories: oscarsData.categories.map((c) => c.id),
        winners: {},
        createdAt: Date.now(),
      });

      // Store admin secret in localStorage
      localStorage.setItem(`admin-${code}`, secret);
      localStorage.setItem(`name-${code}`, adminName.trim());

      navigate(`/room/${code}`);
    } catch (err) {
      setError("Failed to create room. Check your Firebase config.");
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim() || !joinName.trim()) return;
    setJoining(true);
    setError("");

    const code = joinCode.trim().toUpperCase();

    try {
      const roomSnap = await getDoc(doc(db, "rooms", code));
      if (!roomSnap.exists()) {
        setError("Room not found. Check the code and try again.");
        return;
      }

      const room = roomSnap.data();
      if (room.locked) {
        setError("This room is locked. No new participants can join.");
        return;
      }

      // If participant doesn't exist yet, create them
      const participantSnap = await getDoc(
        doc(db, "rooms", code, "participants", joinName.trim())
      );
      if (!participantSnap.exists()) {
        await setDoc(doc(db, "rooms", code, "participants", joinName.trim()), {
          name: joinName.trim(),
          picks: {},
          joinedAt: Date.now(),
        });
      }

      localStorage.setItem(`name-${code}`, joinName.trim());
      navigate(`/room/${code}`);
    } catch (err) {
      setError("Failed to join room. Please try again.");
      console.error(err);
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-yellow-900/20 text-white">
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-2">
            <span className="text-yellow-400">🏆</span> Oscars Picks
          </h1>
          <p className="text-gray-400">
            Create a room, invite friends, and see who knows the Academy best.
          </p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 mb-6 text-center text-sm">
            {error}
          </div>
        )}

        {/* Create Room */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-yellow-400">
            Create a Room
          </h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              type="text"
              placeholder="Your name"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-yellow-400 focus:outline-none"
              maxLength={30}
            />
            <button
              type="submit"
              disabled={creating || !adminName.trim()}
              className="w-full py-3 rounded-lg bg-yellow-500 text-gray-900 font-semibold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? "Creating..." : "Create Room"}
            </button>
          </form>
        </div>

        {/* Join Room */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 text-yellow-400">
            Join a Room
          </h2>
          <form onSubmit={handleJoin} className="space-y-3">
            <input
              type="text"
              placeholder="Room code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-yellow-400 focus:outline-none uppercase tracking-widest text-center text-lg"
              maxLength={6}
            />
            <input
              type="text"
              placeholder="Your name"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-yellow-400 focus:outline-none"
              maxLength={30}
            />
            <button
              type="submit"
              disabled={joining || !joinCode.trim() || !joinName.trim()}
              className="w-full py-3 rounded-lg bg-yellow-500 text-gray-900 font-semibold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {joining ? "Joining..." : "Join Room"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
