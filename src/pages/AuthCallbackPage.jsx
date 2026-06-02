import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { ROLE } from "../utils/roles";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { refreshMe } = useAuth();
  const [message, setMessage] = useState("メール認証を確認しています...");

  useEffect(() => {
    const handleCallback = async () => {
      if (window.location.search.includes("code=")) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(window.location.href);

        if (exchangeError) {
          setMessage(exchangeError.message);
          return;
        }
      }

      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session?.user) {
        setMessage(
          error?.message || "認証情報を確認できませんでした。ログインしてください。"
        );
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("approval_status")
        .eq("id", data.session.user.id)
        .maybeSingle();

      const { data: roleData } = await supabase
        .from("user_roles")
        .select(`
          roles (
            code
          )
        `)
        .eq("user_id", data.session.user.id)
        .eq("is_active", true);

      const roleCodes =
        roleData?.map((item) => item.roles?.code).filter(Boolean) ?? [];

      const canSyncProfileEmail =
        profileData?.approval_status === "approved" ||
        roleCodes.includes(ROLE.SYSTEM_ADMIN);

      if (canSyncProfileEmail) {
        await supabase
          .from("profiles")
          .update({
            email: data.session.user.email,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.session.user.id);

        await refreshMe();

        navigate("/mypage", { replace: true });
        return;
      }

      navigate("/approval-pending", { replace: true });
    };

    handleCallback();
  }, [navigate, refreshMe]);

  return (
    <div className="mypage-modern">
      <section className="mypage-modern-profile-card">
        <div className="mypage-modern-profile-main">
          <div className="mypage-modern-name-block">
            <span>認証確認</span>
            <h2>{message}</h2>
          </div>
        </div>
      </section>
    </div>
  );
}
