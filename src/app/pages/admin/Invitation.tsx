import { useLocation, useNavigate, useSearchParams } from "react-router";
import { notifications } from "@mantine/notifications";
import { useEffect, useRef, useState } from "react";
import apiClient from "../../../api/client";
import { useAuth } from "../../auth/useAuth";
import {
  Box,
  Button,
  Card,
  Center,
  Container,
  Loader,
  Stack,
  Text,
  Title,
  ThemeIcon,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCircleCheck,
  IconInfoCircle,
  IconLock,
} from "@tabler/icons-react";

export default function Invitation() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const hasHandledRef = useRef(false);
  const [status, setStatus] = useState<
    "processing" | "invalid" | "login" | "success" | "error"
  >("processing");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (hasHandledRef.current) return;

    if (!token) {
      hasHandledRef.current = true;
      setStatus("invalid");
      return;
    }

    if (loading) return;

    if (!user) {
      hasHandledRef.current = true;
      setStatus("login");
      return;
    }

    // 1. 로그인 된 상태라면 -> 초대 수락 API 호출
    const acceptInvitation = async () => {
      hasHandledRef.current = true;
      try {
        await apiClient.post(`/spaces/invite/accept`, { token });

        notifications.show({
          title: "성공",
          message: "초대가 수락되었습니다!",
          color: "green",
        });
        setStatus("success");
        // navigate("/admin/dashboard"); // 성공 후 이동할 곳
      } catch (error: any) {
        // 3. 이미 초대된 경우 등 에러 처리
        const errorMessage =
          error.response?.data?.message || "초대 수락 중 오류가 발생했습니다.";

        // 409 Conflict: 이미 멤버인 경우 등
        if (error.response?.status === 409) {
          setErrorMessage("이미 이 공간의 멤버입니다.");
          setStatus("error");
        } else {
          setErrorMessage(errorMessage);
          setStatus("error");
        }
      }
    };
    acceptInvitation();
  }, [token, user, loading, navigate, location]);

  return (
    <Box style={{ minHeight: "100dvh", background: "#FAFAF8" }}>
      <Container size="sm" py={60}>
        <Center>
          <Card withBorder radius="md" p="xl" w="100%">
            {status === "processing" && (
              <Stack gap="md" align="center">
                <ThemeIcon size={56} radius="xl" variant="light" color="gray">
                  <IconInfoCircle size={28} />
                </ThemeIcon>
                <Title order={2}>초대 수락 처리 중</Title>
                <Text c="dimmed" ta="center">
                  잠시만 기다려 주세요. 초대 정보를 확인하고 있습니다.
                </Text>
                <Loader />
                <Button
                  variant="subtle"
                  onClick={() => navigate("/admin/spaces")}
                >
                  공간 선택으로 이동
                </Button>
              </Stack>
            )}

            {status === "success" && (
              <Stack gap="md" align="center">
                <ThemeIcon size={56} radius="xl" variant="light" color="green">
                  <IconCircleCheck size={28} />
                </ThemeIcon>
                <Title order={2}>초대가 수락되었습니다</Title>
                <Text c="dimmed" ta="center">
                  이제 공간에 참여할 수 있습니다.
                </Text>
                <Button onClick={() => navigate("/admin/spaces")}>
                  공간 선택으로 이동
                </Button>
              </Stack>
            )}

            {status === "invalid" && (
              <Stack gap="md" align="center">
                <ThemeIcon size={56} radius="xl" variant="light" color="red">
                  <IconAlertCircle size={28} />
                </ThemeIcon>
                <Title order={2}>유효하지 않은 초대 링크</Title>
                <Text c="dimmed" ta="center">
                  초대 링크를 다시 확인해 주세요.
                </Text>
                <Button onClick={() => navigate("/admin/spaces")}>
                  공간 선택으로 이동
                </Button>
              </Stack>
            )}

            {status === "login" && (
              <Stack gap="md" align="center">
                <ThemeIcon size={56} radius="xl" variant="light" color="blue">
                  <IconLock size={28} />
                </ThemeIcon>
                <Title order={2}>로그인이 필요합니다</Title>
                <Text c="dimmed" ta="center">
                  초대를 수락하려면 로그인 후 다시 시도해 주세요.
                </Text>
                <Button
                  onClick={() =>
                    navigate("/admin/auth/sign-in", {
                      state: { from: location },
                    })
                  }
                >
                  로그인 페이지로 이동
                </Button>
              </Stack>
            )}

            {status === "error" && (
              <Stack gap="md" align="center">
                <ThemeIcon size={56} radius="xl" variant="light" color="red">
                  <IconAlertCircle size={28} />
                </ThemeIcon>
                <Title order={2}>초대 수락 실패</Title>
                <Text c="dimmed" ta="center">
                  {errorMessage}
                </Text>
                <Button onClick={() => navigate("/admin/spaces")}>
                  공간 선택으로 이동
                </Button>
              </Stack>
            )}
          </Card>
        </Center>
      </Container>
    </Box>
  );
}
