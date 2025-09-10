import { Partner, PartnerTasksResponse } from "@/types";

interface PartnerSectionProps {
  partner: Partner | null;
  partnerTasks: PartnerTasksResponse | null;
  partnerEmail: string;
  loading: boolean;
  onPartnerEmailChange: (email: string) => void;
  onSendInvite: (e: React.FormEvent) => void;
  onUnpairPartner: () => void;
}

export function PartnerSection({
  partner,
  partnerTasks,
  partnerEmail,
  loading,
  onPartnerEmailChange,
  onSendInvite,
  onUnpairPartner,
}: PartnerSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Partner</h2>

      {partner ? (
        <div>
          <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
            <h3 className="font-medium text-indigo-900 mb-2">
              Partnered with: {partner.name} ({partner.email})
            </h3>
            <p className="text-sm text-indigo-700">
              Since: {new Date(partner.createdAt).toLocaleDateString()}
            </p>
            <button
              onClick={onUnpairPartner}
              className="mt-2 text-sm text-red-600 hover:text-red-800"
            >
              Unpair
            </button>
          </div>

          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-700">
              <span className="font-medium">Partner&apos;s Week:</span>{" "}
              {partnerTasks?.completedThisWeek || 0} completed this week
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-3">
              Partner&apos;s Active Tasks
            </h3>
            <div className="space-y-3">
              {partnerTasks?.tasks
                .filter((task) => task.isCompleted === 0)
                .map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center space-x-3 p-3 border border-gray-200 rounded-lg ${
                      task.isCompleted === 1 ? "bg-green-50" : "bg-gray-50"
                    }`}
                  >
                    <div className="w-5 h-5 border-2 border-gray-300 rounded bg-gray-200 flex items-center justify-center">
                      {task.isCompleted === 1 ? (
                        <span className="text-green-600 text-xs">✓</span>
                      ) : (
                        <span className="text-gray-400 text-xs">👁</span>
                      )}
                    </div>
                    <span
                      className={`${
                        task.isCompleted === 1
                          ? "text-gray-500 line-through"
                          : "text-gray-700"
                      }`}
                    >
                      {task.title}
                    </span>
                    {task.isCompleted === 1 && (
                      <span className="text-xs text-gray-500 ml-auto">
                        {new Date(task.completedAt!).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              {(!partnerTasks ||
                partnerTasks.tasks.filter((task) => task.isCompleted === 0)
                  .length === 0) && (
                <p className="text-gray-500 text-center py-4">
                  No active tasks
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600">
              Send an invitation to someone you&apos;d like to partner with on
              tasks.
            </p>
          </div>
          <form onSubmit={onSendInvite}>
            <div className="flex gap-2">
              <input
                type="email"
                value={partnerEmail}
                onChange={(e) => onPartnerEmailChange(e.target.value)}
                placeholder="Partner's email address..."
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !partnerEmail.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                {loading ? "Sending..." : "Send Invitation"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
