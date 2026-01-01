import { useState } from "react";
import {
  TextInput,
  PasswordInput,
  Title,
  Text,
  Container,
  Button,
  Center,
  Box,
  Loader,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconMail, IconLock } from "@tabler/icons-react";

export default function AdminSignin() {
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      email: "",
      password: "",
      remember: false,
    },

    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
      password: (value) =>
        value.length >= 6 ? null : "Password must be at least 6 characters",
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
  };

  return (
    <Box h={"100dvh"}>
      <Container size={420} h={"100%"}>
        <Center h="100%">
          <Box
            w={"100%"}
            maw={"80%"}
          >
            <Title order={2} ta="center" mb="md">
              Welcome back!
            </Title>
            <Text c="dimmed" size="sm" ta="center" mb={30}>
              Bird Admin에 로그인하세요
            </Text>

            <form onSubmit={form.onSubmit(handleSubmit)}>
              <TextInput
                label="Email"
                placeholder="you@example.com"
                leftSection={<IconMail size={16} />}
                required
                {...form.getInputProps("email")}
                mb="md"
              />

              <PasswordInput
                label="Password"
                placeholder="Your password"
                leftSection={<IconLock size={16} />}
                required
                {...form.getInputProps("password")}
                mb="md"
              />
              <Button fullWidth type="submit" loading={loading}>
                {loading ? <Loader size="sm" color="white" /> : "Login"}
              </Button>
            </form>
          </Box>
        </Center>
      </Container>
    </Box>
  );
}
