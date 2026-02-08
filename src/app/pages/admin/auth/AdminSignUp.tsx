// pages/admin/AdminSignUp.tsx
import { useForm, type FormErrors } from "@mantine/form";
import {
  Badge,
  Box,
  Button,
  Center,
  Checkbox,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  PasswordInput,
  Textarea,
  Stepper,
  Alert,
  Title,
} from "@mantine/core";
import { IconCheck, IconSparkles } from "@tabler/icons-react";
import { useState } from "react";
import { useSignUp } from "../hooks/useSignUp";

function AdminSignUp() {
  const signUpMutation = useSignUp();
  const [active, setActive] = useState(0);

  const nextStep = () =>
    setActive((current) => {
      if (form.validate().hasErrors) return current;
      return current + 1;
    });

  const prevStep = () =>
    setActive((current) => (current > 0 ? current - 1 : current));

  const form = useForm({
    mode: "controlled",
    initialValues: {
      name: "",
      email: "",
      password: "",
      passwordConfirmation: "",
      spaceName: "",
      spaceDescription: "",
      skipSpaceCreate: false,
    },
    validate: (values): FormErrors => {
      if (active === 0) {
        return {
          email: /^\S+@\S+$/.test(values.email)
            ? null
            : "유효한 이메일을 입력하세요",
          password: values.password.length >= 8 ? null : "8자 이상 입력하세요",
          passwordConfirmation:
            values.passwordConfirmation === values.password
              ? null
              : "비밀번호가 일치하지 않습니다",
        };
      }

      if (active === 1) {
        return {
          spaceName: values.skipSpaceCreate
            ? null
            : values.spaceName.trim()
                ? null
                : "프로젝트 이름을 입력하세요",
        };
      }

      return {};
    },
  });
  const skipSpaceCreate = form.values.skipSpaceCreate;

  const handleSubmit = () => {
    const result = form.validate();
    if (result.hasErrors) return;

    const values = form.getValues();
    const spaceName = values.spaceName.trim();
    const spaceDescription = values.spaceDescription.trim();

    signUpMutation.mutate({
      name: values.name,
      email: values.email,
      password: values.password,
      passwordConfirmation: values.passwordConfirmation,
      ...(values.skipSpaceCreate
        ? { skip_space_create: true }
        : { spaceName, spaceDescription }),
    });
  };

  return (
    <Box style={{ minHeight: "100dvh", background: "#f6f5f1" }}>
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
                새 공간을 위한
                <br />
                관리자 계정 만들기
              </Title>
              <Text c="dimmed" maw={420}>
                기본 정보와 공간 정보를 입력하면 바로 시작할 수 있어요.
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
                  <Title order={3}>회원가입</Title>
                  <Text c="dimmed" size="sm">
                    단계별로 필요한 정보를 입력해 주세요.
                  </Text>
                </Stack>

                <Stepper active={active} size="sm">
                  <Stepper.Step label="기본 정보" description="이메일, 비밀번호">
                    <Stack gap="md">
                      <TextInput
                        label="이름"
                        placeholder="홍길동"
                        required
                        key={form.key("name")}
                        {...form.getInputProps("name")}
                      />
                      <TextInput
                        label="이메일"
                        placeholder="admin@example.com"
                        required
                        key={form.key("email")}
                        {...form.getInputProps("email")}
                      />
                      <PasswordInput
                        label="비밀번호"
                        placeholder="최소 8자"
                        required
                        key={form.key("password")}
                        {...form.getInputProps("password")}
                      />
                      <PasswordInput
                        label="비밀번호 확인"
                        required
                        key={form.key("passwordConfirmation")}
                        {...form.getInputProps("passwordConfirmation")}
                      />
                    </Stack>
                  </Stepper.Step>

                  <Stepper.Step label="프로젝트" description="프로젝트 정보">
                    <Stack gap="md">
                      <Checkbox
                        label="프로젝트 생성 건너뛰기"
                        key={form.key("skipSpaceCreate")}
                        {...form.getInputProps("skipSpaceCreate", {
                          type: "checkbox",
                        })}
                      />
                      <TextInput
                        label="프로젝트 이름"
                        placeholder="내 첫 Admin 프로젝트"
                        required={!skipSpaceCreate}
                        disabled={skipSpaceCreate}
                        {...form.getInputProps("spaceName")}
                      />
                      <Textarea
                        label="프로젝트 설명"
                        placeholder="프로젝트에 대한 설명..."
                        autosize
                        disabled={skipSpaceCreate}
                        {...form.getInputProps("spaceDescription")}
                      />
                    </Stack>
                  </Stepper.Step>

                  <Stepper.Completed>
                    <Alert icon={<IconCheck />} color="green">
                      회원가입이 완료되었습니다!
                    </Alert>
                  </Stepper.Completed>
                </Stepper>

                <Group justify="right" mt="md">
                  <Group>
                    <Button
                      disabled={active === 0}
                      variant="default"
                      onClick={prevStep}
                    >
                      이전
                    </Button>
                    {active < 1 ? (
                      <Button onClick={nextStep}>다음</Button>
                    ) : (
                      <Group>
                        <Button onClick={handleSubmit} type="submit">
                          회원가입 완료
                        </Button>
                      </Group>
                    )}
                  </Group>
                </Group>
              </Stack>
            </Paper>
          </SimpleGrid>
        </Center>
      </Container>
    </Box>
  );
}

export default AdminSignUp;
