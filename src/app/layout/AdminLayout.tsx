import { useState } from "react";
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  rem,
  ScrollArea,
  Title,
} from "@mantine/core";
import { Outlet, useLocation, useNavigate } from "react-router";
import {
  IconHomeEdit,
  IconLayoutDashboard,
  IconLogout,
} from "@tabler/icons-react";

export default function AdminLayout() {
  const [opened, setOpened] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      label: "대시보드",
      path: "/admin/dashboard",
      icons: IconLayoutDashboard,
      description: "전체 데이터 한눈에 보기",
    },
    {
      label: "공간관리",
      path: "/admin/manage-space",
      icons: IconHomeEdit,
      description: "공간 수정 및 생성",
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
            <Title order={3}>Bird Admin</Title>
          </Group>
          <Burger
            opened={opened}
            onClick={() => setOpened((o) => !o)}
            size="sm"
            visibleFrom="sm"
            style={{ display: "none" }} // 데스크톱에서는 버거 숨김 (항상 열림)
          />
        </Group>
      </AppShell.Header>

      {/* 사이드바 */}
      <AppShell.Navbar p="md">
        <AppShell.Section>
          {/* <Title order={4} pl="xs" mb="md">
            Menu
          </Title> */}
        </AppShell.Section>

        <AppShell.Section grow component={ScrollArea}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              label={item.label}
              description={item.description}
              styles={{
                root: {
                  borderRadius: "var(--mantine-radius-md)",
                  "&:hover": {
                    borderRadius: "var(--mantine-radius-md)",
                  },
                  "&[data-active]": {
                    borderRadius: "var(--mantine-radius-md)",
                  },
                },
              }}
              leftSection={
                <item.icons style={{ width: rem(20), height: rem(20) }} />
              }
              active={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                setOpened(false); // 모바일에서 클릭 후 닫힘
              }}
              variant="light"
            />
          ))}
        </AppShell.Section>

        <AppShell.Section>
          <NavLink
            styles={{
              root: {
                borderRadius: "var(--mantine-radius-md)",
                "&:hover": {
                  borderRadius: "var(--mantine-radius-md)",
                },
              },
            }}
            label="Logout"
            color="red"
            leftSection={<IconLogout size={20} />}
            onClick={() => {
              // 로그아웃 로직
              navigate("/login");
            }}
          />
        </AppShell.Section>
      </AppShell.Navbar>

      {/* 메인 콘텐츠 */}
      <AppShell.Main>
        <Outlet /> {/* 여기서 각 페이지 컴포넌트가 렌더링됩니다 */}
      </AppShell.Main>
    </AppShell>
  );
}
