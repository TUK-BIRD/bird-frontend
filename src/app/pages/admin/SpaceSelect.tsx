import { Card, Loader, SimpleGrid } from "@mantine/core";
import useSpaces from "../../../hooks/useSpaces"
import { useNavigate } from "react-router";

export default function SpaceSelect() {
  const { data: spaces, isLoading: isSpaceLoading } = useSpaces();
  const navigate = useNavigate();

  if(isSpaceLoading) <Loader />

  return (
    <SimpleGrid cols={3}>
      {spaces?.map(space => (
        <Card
          key={space.id}
          withBorder
          shadow="sm"
          style={{ cursor: 'pointer' }}
          onClick={() =>
            navigate(`/admin/space/${space.id}/dashboard`)
          }
        >
          <strong>{space.name}</strong>
          <div>{space.role}</div>
        </Card>
      ))}
    </SimpleGrid>
  )
}