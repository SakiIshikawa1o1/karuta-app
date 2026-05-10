import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { ROLE } from "../utils/roles";

const REQUEST_STATUS_LABEL = {
  pending: "承認待ち",
  approved: "承認済み",
  rejected: "却下",
};

function formatDateTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getName(items, id) {
  if (!id) return "";
  return items.find((item) => item.id === id)?.name || "";
}

export default function AffiliationApprovalPage() {
  const { user, hasRole } = useAuth();
  const isSystemAdmin = hasRole(ROLE.SYSTEM_ADMIN);

  const [requests, setRequests] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [affiliations, setAffiliations] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [danRanks, setDanRanks] = useState([]);
  const [representativeAffiliations, setRepresentativeAffiliations] = useState([]);
  const [rejectReasons, setRejectReasons] = useState({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [message, setMessage] = useState("");

  const profileMap = useMemo(() => {
    return Object.fromEntries(profiles.map((profile) => [profile.id, profile]));
  }, [profiles]);

  const canReview = isSystemAdmin || representativeAffiliations.length > 0;

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    setMessage("");

    const [
      representativeResult,
      affiliationResult,
      classLevelResult,
      danRankResult,
    ] = await Promise.all([
      supabase
        .from("affiliations")
        .select("id, name, representative_user_id")
        .eq("representative_user_id", user.id),
      supabase
        .from("affiliations")
        .select("id, name, representative_user_id")
        .order("name", { ascending: true }),
      supabase
        .from("class_levels")
        .select("id, name, sort_order")
        .order("sort_order", { ascending: true }),
      supabase
        .from("dan_ranks")
        .select("id, name, sort_order")
        .order("sort_order", { ascending: true }),
    ]);

    const representativeList = representativeResult.data ?? [];
    setRepresentativeAffiliations(representativeList);
    setAffiliations(affiliationResult.data ?? []);
    setClassLevels(classLevelResult.data ?? []);
    setDanRanks(danRankResult.data ?? []);

    if (!isSystemAdmin && representativeList.length === 0) {
      setRequests([]);
      setProfiles([]);
      setLoading(false);
      return;
    }

    let requestQuery = supabase
      .from("affiliation_join_requests")
      .select("*")
      .order("requested_at", { ascending: false });

    if (!isSystemAdmin) {
      const affiliationIds = representativeList.map((item) => item.id);
      requestQuery = requestQuery.in("affiliation_id", affiliationIds);
    }

    const { data: requestData, error: requestError } = await requestQuery;

    if (requestError) {
      setMessage(`申請の取得に失敗しました：${requestError.message}`);
      setLoading(false);
      return;
    }

    const requestList = requestData ?? [];
    setRequests(requestList);

    const userIds = [...new Set(requestList.map((request) => request.user_id))];

    if (userIds.length === 0) {
      setProfiles([]);
      setLoading(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select(
        "id, display_name, full_name, email, school_name, affiliation_id, class_level_id, dan_rank_id, approval_status"
      )
      .in("id", userIds);

    if (profileError) {
      setMessage(`申請者情報の取得に失敗しました：${profileError.message}`);
      setLoading(false);
      return;
    }

    setProfiles(profileData ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user?.id, isSystemAdmin]);

  const handleApprove = async (request) => {
    setProcessingId(request.id);
    setMessage("");

    const { error } = await supabase.rpc("approve_affiliation_join_request", {
      request_id: request.id,
    });

    setProcessingId("");

    if (error) {
      setMessage(`承認に失敗しました：${error.message}`);
      return;
    }

    setMessage("申請を承認しました。");
    await fetchData();
  };

  const handleReject = async (request) => {
    const reason = rejectReasons[request.id]?.trim() || "";

    setProcessingId(request.id);
    setMessage("");

    const { error } = await supabase.rpc("reject_affiliation_join_request", {
      request_id: request.id,
      reason,
    });

    setProcessingId("");

    if (error) {
      setMessage(`却下に失敗しました：${error.message}`);
      return;
    }

    setMessage("申請を却下しました。");
    await fetchData();
  };

  return (
    <div className="application-admin-page">
      <section className="application-admin-hero">
        <div>
          <h1>所属会申請の確認</h1>
          <p>所属会代表者として、新規登録申請を確認します。</p>
        </div>
      </section>

      {message && <p className="application-admin-message">{message}</p>}

      {loading ? (
        <section className="application-admin-panel">
          <p>読み込み中...</p>
        </section>
      ) : !canReview ? (
        <section className="application-admin-panel">
          <p>確認できる所属会申請はありません。</p>
        </section>
      ) : (
        <section className="application-admin-table-card">
          <div className="application-admin-table-wrap">
            <table className="application-admin-table">
              <thead>
                <tr>
                  <th>申請者</th>
                  <th>所属会</th>
                  <th>学校 / 級段位</th>
                  <th>申請日時</th>
                  <th>状態</th>
                  <th>操作</th>
                </tr>
              </thead>

              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan="6">申請はありません。</td>
                  </tr>
                ) : (
                  requests.map((request) => {
                    const applicant = profileMap[request.user_id];
                    const applicantName =
                      applicant?.full_name ||
                      applicant?.display_name ||
                      applicant?.email ||
                      "未設定";
                    const isPending = request.status === "pending";

                    return (
                      <tr key={request.id}>
                        <td>
                          <strong>{applicantName}</strong>
                          <br />
                          <small>{applicant?.email || ""}</small>
                        </td>
                        <td>
                          {getName(affiliations, request.affiliation_id) ||
                            "未設定"}
                        </td>
                        <td>
                          {applicant?.school_name || "未設定"}
                          <br />
                          <small>
                            {getName(classLevels, applicant?.class_level_id) ||
                              "未設定"}{" "}
                            /{" "}
                            {getName(danRanks, applicant?.dan_rank_id) ||
                              "未設定"}
                          </small>
                        </td>
                        <td>{formatDateTime(request.requested_at)}</td>
                        <td>
                          {REQUEST_STATUS_LABEL[request.status] ||
                            request.status}
                        </td>
                        <td>
                          {isPending ? (
                            <div className="application-admin-action-stack">
                              <button
                                type="button"
                                onClick={() => handleApprove(request)}
                                disabled={processingId === request.id}
                              >
                                承認
                              </button>
                              <input
                                value={rejectReasons[request.id] || ""}
                                onChange={(event) =>
                                  setRejectReasons((prev) => ({
                                    ...prev,
                                    [request.id]: event.target.value,
                                  }))
                                }
                                placeholder="却下理由"
                              />
                              <button
                                type="button"
                                onClick={() => handleReject(request)}
                                disabled={processingId === request.id}
                              >
                                却下
                              </button>
                            </div>
                          ) : (
                            <small>
                              {formatDateTime(request.reviewed_at)}
                              {request.rejection_reason
                                ? ` / ${request.rejection_reason}`
                                : ""}
                            </small>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
