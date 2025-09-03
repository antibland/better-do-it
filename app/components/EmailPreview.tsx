import { useState, useEffect } from "react";
import { render } from "@react-email/render";
import { InviteExistingUserEmail } from "./emails/InviteExistingUser";
import { InviteNewUserEmail } from "./emails/InviteNewUser";

interface EmailPreviewProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmailPreview({ isOpen, onClose }: EmailPreviewProps) {
  const [previewType, setPreviewType] = useState<"existing" | "new">(
    "existing"
  );
  const [inviterName, setInviterName] = useState("John Doe");
  const [inviteeEmail, setInviteeEmail] = useState("partner@example.com");
  const [inviteCode, setInviteCode] = useState("ABC12345");
  const [appUrl, setAppUrl] = useState("http://localhost:3000");
  const [emailHtml, setEmailHtml] = useState<string>("");

  // Render email to HTML when preview settings change
  useEffect(() => {
    const renderEmail = async () => {
      try {
        let emailComponent;

        if (previewType === "existing") {
          emailComponent = InviteExistingUserEmail({
            inviterName,
            inviteeEmail,
            inviteCode,
            appUrl,
          });
        } else {
          emailComponent = InviteNewUserEmail({
            inviterName,
            inviteeEmail,
            inviteCode,
            appUrl,
          });
        }

        // Render the React Email component to HTML string
        const html = await render(emailComponent);
        setEmailHtml(html);
      } catch (error) {
        console.error("Failed to render email preview:", error);
        setEmailHtml("<p>Error rendering email preview</p>");
      }
    };

    renderEmail();
  }, [previewType, inviterName, inviteeEmail, inviteCode, appUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Email Preview</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="flex">
          {/* Controls */}
          <div className="w-80 p-4 border-r bg-gray-50">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preview Type
                </label>
                <select
                  value={previewType}
                  onChange={(e) =>
                    setPreviewType(e.target.value as "existing" | "new")
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="existing">Existing User Invite</option>
                  <option value="new">New User Invite</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Inviter Name
                </label>
                <input
                  type="text"
                  value={inviterName}
                  onChange={(e) => setInviterName(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invitee Email
                </label>
                <input
                  type="email"
                  value={inviteeEmail}
                  onChange={(e) => setInviteeEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invite Code
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  App URL
                </label>
                <input
                  type="url"
                  value={appUrl}
                  onChange={(e) => setAppUrl(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* Email Preview */}
          <div className="flex-1 p-4 overflow-auto">
            <div className="bg-white border rounded-lg">
              <div
                className="email-preview"
                dangerouslySetInnerHTML={{ __html: emailHtml }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
