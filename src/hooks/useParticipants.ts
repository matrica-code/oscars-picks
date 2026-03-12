import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { Participant } from "../types";

export function useParticipants(roomCode: string | undefined) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomCode) return;

    const unsub = onSnapshot(
      collection(db, "rooms", roomCode.toUpperCase(), "participants"),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Participant);
        setParticipants(list);
        setLoading(false);
      }
    );

    return unsub;
  }, [roomCode]);

  return { participants, loading };
}
