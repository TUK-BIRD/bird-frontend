// pages/admin/AdminSignUp.tsx
import { useForm, type FormErrors } from "@mantine/form";
import {
  Button,
  Stack,
  TextInput,
  PasswordInput,
  Textarea,
  Stepper,
  Group,
  Alert,
  Title,
  Center,
} from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import { useState } from "react";
import { useSignUp } from "../../../../hooks/useSignUp";

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
    mode: "uncontrolled",
    initialValues: {
      name: "",
      email: "",
      password: "",
      passwordConfirmation: "",
      spaceName: "",
      spaceDescription: "",
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
          spaceName: values.spaceName.trim()
            ? null
            : "프로젝트 이름을 입력하세요",
        };
      }

      return {};
    },
  });

  const handleSubmit = () => {
    const result = form.validate();
    if (result.hasErrors) return;

    const values = form.getValues();
    signUpMutation.mutate(values);
  };
  return (
    <Center h="100vh">
      <Stack w={500} p="xl" bg="white" style={{ borderRadius: 16 }}>
        <Title order={1} ta="center">
          Admin 회원가입
        </Title>

        <Stepper active={active} size="sm">
          <Stepper.Step label="기본 정보" description="이메일, 비밀번호">
            <Stack gap={"md"}>
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
              <TextInput
                label="프로젝트 이름"
                placeholder="내 첫 Admin 프로젝트"
                required
                {...form.getInputProps("spaceName")}
              />
              <Textarea
                label="프로젝트 설명"
                placeholder="프로젝트에 대한 설명..."
                autosize
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
              <Button onClick={handleSubmit} type="submit">
                회원가입 완료
              </Button>
            )}
          </Group>
        </Group>
      </Stack>
    </Center>
  );
}

export default AdminSignUp;
