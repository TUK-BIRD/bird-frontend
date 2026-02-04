import { useNavigate, useParams } from "react-router";
import FloorPlan from "../../components/floorplan/FloorPlan";

export default function RoomCreate() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();

  const handleCreated = (data: any) => {
    const id =
      data?.id ??
      data?.room?.id ??
      data?.data?.id ??
      data?.roomId ??
      data?.room_id;
    if (spaceId && id) {
      navigate(`/admin/space/${spaceId}/rooms/${id}`);
      return;
    }
    navigate(`/admin/space/${spaceId}/rooms`);
  };

  return (
    <div>
      <FloorPlan onCreated={handleCreated} />
    </div>
  );
}
