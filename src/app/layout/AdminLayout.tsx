import { useState } from "react";
import {
  AppShell,
  Avatar,
  Burger,
  Button,
  Flex,
  Group,
  ScrollArea,
  Select,
  Space,
  Text,
  Title,
} from "@mantine/core";
import { Link, Outlet, useNavigate, useParams } from "react-router";
import {
  IconHomeEdit,
  IconLayoutDashboard,
  IconLogout,
  IconPlus,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";
import { useLogout } from "@/app/pages/admin/hooks/useLogout";
import useSpaces from "@/hooks/useSpaces";
import AdminSidebar from "@/app/components/AdminSidebar";
import { useAuth } from "../auth/useAuth";

export default function AdminLayout() {
  const [opened, setOpened] = useState(false);
  const navigate = useNavigate();
  const { spaceId } = useParams<{ spaceId: string }>();
  const logoutMutation = useLogout();

  const { data: spaces } = useSpaces();
  const spaceSelectData =
    spaces?.map((space) => ({
      value: String(space.id),
      label: space.name,
    })) ?? [];

  const { user } = useAuth();

  const menuItems = [
    {
      label: "대시보드",
      path: `/admin/space/${spaceId}/dashboard`,
      icons: IconLayoutDashboard,
      description: "운영 차트와 비교 차트 보기",
      children: [
        {
          label: "종합 대시보드",
          path: `/admin/space/${spaceId}/dashboard/overview`,
        },
        {
          label: "Anchor Set Chart",
          path: `/admin/space/${spaceId}/dashboard`,
        },
        {
          label: "BLE Compare Chart",
          path: `/admin/space/${spaceId}/dashboard/ble-compare`,
        },
        {
          label: "Location Estimates",
          path: `/admin/space/${spaceId}/dashboard/location-estimates`,
        },
        {
          label: "Location Heatmap",
          path: `/admin/space/${spaceId}/dashboard/location-heatmap`,
        },
      ],
    },
    {
      label: "방 관리",
      path: `/admin/space/${spaceId}/rooms`,
      icons: IconHomeEdit,
      description: "방 생성 및 수정",
      children: [
        {
          label: "방 목록",
          path: `/admin/space/${spaceId}/rooms`,
        },
        {
          label: "방 생성",
          path: `/admin/space/${spaceId}/rooms/create`,
          icon: IconPlus,
        },
      ],
    },
    {
      label: "멤버관리",
      path: `/admin/space/${spaceId}/members`,
      icons: IconUsers,
      description: "멤버 권한 설정 및 수정",
    },
    {
      label: "설정",
      path: `/admin/space/${spaceId}/settings`,
      icons: IconSettings,
      description: "운영 설정 관리",
    },
  ];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      {/* 헤더 */}
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={opened}
              onClick={() => setOpened((o) => !o)}
              size="sm"
              hiddenFrom="sm"
            />
            <Text component={Link} to={`/admin/space/${spaceId}/dashboard`}>
              Bird Admin
            </Text>
          </Group>
          <Burger
            opened={opened}
            onClick={() => setOpened((o) => !o)}
            size="sm"
            visibleFrom="sm"
            style={{ display: "none" }}
          />

          <Select
            placeholder="관리할 공간을 선택하세요"
            value={spaceId}
            data={spaceSelectData}
            onChange={(value) => {
              if (!value) return;
              navigate(`/admin/space/${value}/dashboard`);
            }}
          />
        </Group>
      </AppShell.Header>

      {/* 사이드바 */}
      <AppShell.Navbar p="md">
        <AppShell.Section grow component={ScrollArea}>
          <AdminSidebar items={menuItems} />
        </AppShell.Section>

        <AppShell.Section>
          <Flex
            direction={"row"}
            gap={"sm"}
            justify={"center"}
            align={"center"}
          >
            <Avatar />
            <Flex direction={"column"} w={"100%"}>
              <Title order={5}>{user?.name}</Title>
              <Text c="gray">{user?.email}</Text>
            </Flex>
          </Flex>
          <Space h={"sm"} />
          <Button
            justify="center"
            fullWidth
            variant={"light"}
            color={"dark"}
            leftSection={<IconLogout size={20} />}
            onClick={() => logoutMutation.mutate()}
            loading={logoutMutation.isPending}
          >
            로그아웃
          </Button>
        </AppShell.Section>
      </AppShell.Navbar>

      {/* 메인 콘텐츠 */}
      <AppShell.Main style={{ background: "#FAFAF8"}}>
        <Outlet /> {/* 여기서 각 페이지 컴포넌트가 렌더링됩니다 */}
      </AppShell.Main>
    </AppShell>
  );
}
