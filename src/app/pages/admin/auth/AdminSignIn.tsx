import {
  TextInput,
  PasswordInput,
  Title,
  Text,
  Container,
  Button,
  Center,
  Box,
  Stack,
  Divider,
  Alert,
  Paper,
  SimpleGrid,
  Group,
  ThemeIcon,
  Badge,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconMail, IconLock, IconSparkles, IconShieldLock } from "@tabler/icons-react";
import useSignIn from "../hooks/useSignIn";
import { Link, useLocation, useNavigate } from "react-router";

export default function AdminSignin() {
  const signInMutation = useSignIn();

  const navigate = useNavigate();
  const location = useLocation();

  const from =
    location.state?.from?.pathname + location.state?.from?.search ||
    "/admin/spaces";

  const form = useForm({
    initialValues: {
      email: "",
      password: "",
    },

    validate: {
      email: (value) =>
        /^\S+@\S+$/.test(value) ? null : "유효한 이메일을 입력하세요",
      password: (value) =>
        value.length >= 6 ? null : "비밀번호는 6자 이상입니다",
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    signInMutation.mutate(values, {
      onSuccess: () => navigate(from, { replace: true }),
    });
  };

  return (
    <Box
      style={{
        minHeight: "100dvh",
        background: "#f6f5f1",
      }}
    >
      <Container size="lg">
        <Center h="100dvh">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl" w="100%">
            <Stack gap="md" justify="center">
              <Badge
                variant="light"
                color="dark"
                leftSection={<IconSparkles size={12} />}
                w="fit-content"
              >
                Bird Admin
              </Badge>
              <Title
                order={1}
                style={{
                  fontFamily:
                    "Space Grotesk, ui-sans-serif, system-ui, sans-serif",
                  fontSize: "clamp(28px, 4vw, 40px)",
                }}
              >
                팀 공간을 더 빠르게
                <br />
                관리하세요
              </Title>
              <Text c="dimmed" maw={420}>
                로그인해서 공간, 멤버, 권한을 한 곳에서 간편하게 관리하세요.
              </Text>
            </Stack>

            <Paper
              radius="lg"
              withBorder
              p="xl"
              shadow="sm"
              style={{
                background:
                  "linear-gradient(180deg, #ffffff 0%, #fbfaf7 100%)",
                borderColor: "#e6e1d8",
              }}
            >
              <Stack gap="md">
                <Stack gap={4}>
                  <Title order={3}>로그인</Title>
                  <Text c="dimmed" size="sm">
                    Bird Admin에 접속하려면 계정 정보를 입력하세요.
                  </Text>
                </Stack>

                <form onSubmit={form.onSubmit(handleSubmit)}>
                  <Stack gap="xs">
                    {signInMutation.isError && (
                      <Alert color="red" title="로그인 실패">
                        이메일 또는 비밀번호를 확인해주세요.
                      </Alert>
                    )}
                    <TextInput
                      label="Email"
                      placeholder="you@example.com"
                      leftSection={<IconMail size={16} />}
                      required
                      {...form.getInputProps("email")}
                    />

                    <PasswordInput
                      label="Password"
                      placeholder="Your password"
                      leftSection={<IconLock size={16} />}
                      required
                      {...form.getInputProps("password")}
                    />
                    <Button
                      fullWidth
                      type="submit"
                      loading={signInMutation.isPending}
                    >
                      로그인
                    </Button>
                    <Divider />
                    <Button
                      component={Link}
                      to={"/admin/auth/sign-up"}
                      variant="subtle"
                      fullWidth
                    >
                      계정이 없으신가요?
                    </Button>
                  </Stack>
                </form>
              </Stack>
            </Paper>
          </SimpleGrid>
        </Center>
      </Container>
    </Box>
  );
}
