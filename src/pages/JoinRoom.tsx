import { Navigate, useParams } from "react-router-dom";

export default function JoinRoom() {
  const { code } = useParams<{ code: string }>();
  return <Navigate to={`/room/${code}`} replace />;
}
