import { Flex } from "@mantine/core";
import MemberInviteTable from "../../components/member/MemberInviteTable";
import { MemberTable } from "../../components/member/MemberTable";

export default function Members() {
  return (
    <Flex direction={"column"} gap={"sm"}>
      <MemberTable/>
      <MemberInviteTable/>
    </Flex>
  )
}