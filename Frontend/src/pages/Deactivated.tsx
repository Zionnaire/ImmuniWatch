import { ShieldOff, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Deactivated() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen app-bg flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
          <ShieldOff className="h-8 w-8 text-red-500" />
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Account Deactivated
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          Your account has been deactivated by your organization administrator.
          You cannot log in until it is reactivated.
        </p>

        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-6 text-left">
          <p className="text-xs font-semibold text-red-700 mb-1">
            What to do next
          </p>
          <p className="text-xs text-red-600 leading-relaxed">
            Contact your <strong>Organization Admin</strong> or{" "}
            <strong>Supervisor</strong> to request reactivation. Ask them to log
            in and re-enable your account from the User Management page.
          </p>
        </div>

        <a
          href="mailto:admin@immuniwatch.ng"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors mb-3"
        >
          <Mail className="h-4 w-4" />
          Contact Platform Admin
        </a>

        <button
          onClick={() => {
            void logout();
          }}
          className="w-full px-4 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
