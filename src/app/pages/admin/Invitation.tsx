import { useLocation, useNavigate, useSearchParams } from "react-router";
import { notifications } from "@mantine/notifications"; // Mantine 알림 사용 예시
import { useEffect } from "react";
import apiClient from "../../../api/client";
import { useAuth } from "../../auth/useAuth";

export default function Invitation() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(); 

  useEffect(() => {
    if (!token) {
      notifications.show({
        title: "오류",
        message: "유효하지 않은 초대 링크입니다.",
        color: "red",
      });
      navigate("/");
      return;
    }

    if (!user) {
      notifications.show({
        title: "로그인 필요",
        message: "초대를 수락하려면 로그인이 필요합니다.",
        color: "blue",
      });
      // state에 from 정보를 담아서 보냄 (로그인 완료 후 돌아오기 위함)
      navigate("/admin/auth/sign-in", { state: { from: location } });
      return;
    }

    // 1. 로그인 된 상태라면 -> 초대 수락 API 호출
    const acceptInvitation = async () => {
      try {
        await apiClient.post(`/spaces/invite/accept`, { token });

        notifications.show({
          title: "성공",
          message: "초대가 수락되었습니다!",
          color: "green",
        });
        // navigate("/admin/dashboard"); // 성공 후 이동할 곳
      } catch (error) {
        // 3. 이미 초대된 경우 등 에러 처리
        const errorMessage =
          error.response?.data?.message || "초대 수락 중 오류가 발생했습니다.";

        // 409 Conflict: 이미 멤버인 경우 등
        if (error.response?.status === 409) {
          notifications.show({
            title: "알림",
            message: "이미 이 공간의 멤버입니다.",
            color: "yellow",
          });
          navigate("/admin/spaces");
        } else {
          notifications.show({
            title: "오류",
            message: errorMessage,
            color: "red",
          });
        }
      }
    };
    acceptInvitation();
  }, [token, user, navigate, location]);

  return <div>Invitation {searchParams.get("token")} </div>;
}
