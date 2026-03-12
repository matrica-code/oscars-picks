import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { Room } from "../types";

export function useRoom(roomCode: string | undefined) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode) return;

    const unsub = onSnapshot(
      doc(db, "rooms", roomCode.toUpperCase()),
      (snap) => {
        if (snap.exists()) {
          setRoom(snap.data() as Room);
          setError(null);
        } else {
          setError("Room not found");
          setRoom(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, [roomCode]);

  return { room, loading, error };
}
