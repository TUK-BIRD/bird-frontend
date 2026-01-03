import { NavLink, rem } from "@mantine/core";
import type { Icon } from "@tabler/icons-react";
import { useLocation, useNavigate } from "react-router";

export interface MenuItem {
  label: string;
  path: string;
  description?: string;
  icons?: Icon;
  children?: {
    label: string;
    path: string;
  }[];
}

export default function AdminSidebar({ items }: { items: MenuItem[] }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      {items.map((item) => {
        const Icon = item.icons;

        // 🔹 nested menu
        if (item.children) {
          const isActive = item.children.some((child) =>
            location.pathname.startsWith(child.path)
          );

          return (
            <NavLink
              key={item.label}
              label={item.label}
              description={item.description}
              styles={{
                root: {
                  borderRadius: "var(--mantine-radius-md)",
                  "&:hover": {
                    borderRadius: "var(--mantine-radius-md)",
                  },
                },
              }}
              leftSection={
                Icon ? (
                  <Icon style={{ width: rem(20), height: rem(20) }} />
                ) : null
              }
              defaultOpened={isActive}
              variant="light"
            >
              {item.children.map((child) => (
                <NavLink
                  key={child.path}
                  label={child.label}
                  styles={{
                    root: {
                      borderRadius: "var(--mantine-radius-md)",
                      marginLeft: rem(12),
                      "&:hover": {
                        borderRadius: "var(--mantine-radius-md)",
                      },
                    },
                  }}
                  active={location.pathname === child.path}
                  onClick={() => {
                    navigate(child.path);
                  }}
                  variant="light"
                />
              ))}
            </NavLink>
          );
        }

        return (
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
              },
            }}
            leftSection={
              Icon ? <Icon style={{ width: rem(20), height: rem(20) }} /> : null
            }
            active={location.pathname === item.path}
            onClick={() => navigate(item.path)}
            variant="light"
          />
        );
      })}
    </>
  );
}
