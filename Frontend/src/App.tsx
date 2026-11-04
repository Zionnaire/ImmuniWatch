import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { FullPageSpinner } from "./components/Spinner";
import Login from "./pages/Login";
import Deactivated from "./pages/Deactivated";
import AcceptInvite from "./pages/AcceptInvite";
import ClaimOrg from "./pages/ClaimOrg";
import Dashboard from "./pages/Dashboard";
import Posts from "./pages/Posts";
import HITLQueue from "./pages/HITLQueue";
import Alerts from "./pages/Alerts";
import ModelHealth from "./pages/ModelHealth";
import KnowledgeBase from "./pages/KnowledgeBase";
import Users from "./pages/Users";
import AuditLog from "./pages/AuditLog";
import TrendAnalysis from "./pages/TrendAnalysis";
import ResponseDispatch from "./pages/ResponseDispatch";
import IngestionPipeline from "./pages/IngestionPipeline";
import Settings from "./pages/Settings";
import Submit from "./pages/Submit";
import PlatformOverview from "./pages/PlatformOverview";
import OrganizationDetail from "./pages/OrganizationDetail";
import GeoSurge from "./pages/GeoSurge";
import LandingPage from "./pages/LandingPage";
import ViewerPage from "./pages/ViewerPage";
import type { UserRole } from "./types/api";

function RequireAuth({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: UserRole[];
}) {
  const { user, isLoading, isDeactivated } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (isDeactivated) return <Navigate to="/deactivated" replace />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role))
    return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/submit" element={<Submit />} />
      {/* ── Read-only investor viewer — /view/:token/* ──────────────────── */}
      <Route path="/view/:token" element={<ViewerPage />}>
        {/* Redirect bare /view/:token to /view/:token/dashboard */}
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route element={<Layout />}>
          <Route path="dashboard"     element={<Dashboard />} />
          <Route path="posts"         element={<Posts />} />
          <Route path="hitl"          element={<HITLQueue />} />
          <Route path="knowledge-base" element={<KnowledgeBase />} />
          <Route path="dispatch"      element={<ResponseDispatch />} />
          <Route path="trends"        element={<TrendAnalysis />} />
          <Route path="alerts"        element={<Alerts />} />
          <Route path="model-health"  element={<ModelHealth />} />
          <Route path="ingestion"     element={<IngestionPipeline />} />
          <Route path="geo-surge"     element={<GeoSurge />} />
          <Route path="users"         element={<Users />} />
          <Route path="audit-log"     element={<AuditLog />} />
          <Route path="settings"      element={<Settings />} />
        </Route>
      </Route>
      <Route path="/deactivated" element={<Deactivated />} />
      <Route path="/accept-invite/:token" element={<AcceptInvite />} />
      <Route path="/claim-org/:token" element={<ClaimOrg />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >

        {/* ── Platform super_admin routes ──────────────────────────────────── */}
        <Route
          path="organizations"
          element={
            <RequireAuth roles={["super_admin"]}>
              <PlatformOverview />
            </RequireAuth>
          }
        />
        <Route
          path="organizations/:id"
          element={
            <RequireAuth roles={["super_admin"]}>
              <OrganizationDetail />
            </RequireAuth>
          }
        />
        <Route
          path="platform/overview"
          element={
            <RequireAuth roles={["super_admin"]}>
              <PlatformOverview />
            </RequireAuth>
          }
        />

        {/* ── Org-level routes ─────────────────────────────────────────────── */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="posts" element={<Posts />} />
        <Route path="hitl" element={<HITLQueue />} />
        <Route path="knowledge-base" element={<KnowledgeBase />} />

        <Route
          path="dispatch"
          element={
            <RequireAuth
              roles={[
                "senior_analyst",
                "supervisor",
                "org_admin",
                "super_admin",
              ]}
            >
              <ResponseDispatch />
            </RequireAuth>
          }
        />
        <Route
          path="trends"
          element={
            <RequireAuth
              roles={[
                "senior_analyst",
                "supervisor",
                "org_admin",
                "super_admin",
              ]}
            >
              <TrendAnalysis />
            </RequireAuth>
          }
        />
        <Route
          path="alerts"
          element={
            <RequireAuth roles={["supervisor", "org_admin", "super_admin"]}>
              <Alerts />
            </RequireAuth>
          }
        />
        <Route
          path="model-health"
          element={
            <RequireAuth roles={["supervisor", "org_admin", "super_admin"]}>
              <ModelHealth />
            </RequireAuth>
          }
        />
        <Route
          path="users"
          element={
            <RequireAuth roles={["supervisor", "org_admin", "super_admin"]}>
              <Users />
            </RequireAuth>
          }
        />
        <Route
          path="audit-log"
          element={
            <RequireAuth roles={["supervisor", "org_admin", "super_admin"]}>
              <AuditLog />
            </RequireAuth>
          }
        />
        <Route
          path="ingestion"
          element={
            <RequireAuth roles={["org_admin", "super_admin"]}>
              <IngestionPipeline />
            </RequireAuth>
          }
        />
        <Route
          path="geo-surge"
          element={
            <RequireAuth roles={["supervisor", "org_admin", "super_admin"]}>
              <GeoSurge />
            </RequireAuth>
          }
        />
        <Route
          path="settings"
          element={
            <RequireAuth roles={["supervisor", "org_admin", "super_admin"]}>
              <Settings />
            </RequireAuth>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
