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
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconMail, IconLock } from "@tabler/icons-react";
import useSignIn from "../hooks/useSignIn";
import { Link, useLocation, useNavigate } from "react-router";

export default function AdminSignin() {
  const signInMutation = useSignIn();

  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname + location.state?.from?.search || '/admin/spaces';

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
    signInMutation.mutate(values);
    navigate(from, { replace: true });
  };

  return (
    <Box h={"100dvh"}>
      <Container size={420} h={"100%"}>
        <Center h="100%">
          <Box w={"100%"} maw={"80%"}>
            <Title order={2} ta="center" mb="md">
              Welcome back!
            </Title>
            <Text c="dimmed" size="sm" ta="center" mb={30}>
              Bird Admin에 로그인하세요
            </Text>

            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack gap={"xs"}>
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
                <Button fullWidth type="submit">
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
          </Box>
        </Center>
      </Container>
    </Box>
  );
}
