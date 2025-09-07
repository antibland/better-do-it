"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { XIcon, ClockIcon } from "lucide-react";
import { Invite } from "@/types";
import { ConfirmDialog } from "./ConfirmDialog";

interface PendingInvitesSectionProps {
  invites: Invite[];
  onRevokeInvite: (inviteId: string) => void;
}

export function PendingInvitesSection({
  invites,
  onRevokeInvite,
}: PendingInvitesSectionProps) {
  const [inviteToRevoke, setInviteToRevoke] = useState<{
    id: string;
    email: string;
  } | null>(null);

  const handleRevokeClick = (invite: Invite) => {
    setInviteToRevoke({
      id: invite.id,
      email: invite.inviteeEmail,
    });
  };

  const confirmRevoke = () => {
    if (inviteToRevoke) {
      onRevokeInvite(inviteToRevoke.id);
      setInviteToRevoke(null);
    }
  };

  const cancelRevoke = () => {
    setInviteToRevoke(null);
  };

  const formatExpiryDate = (expiresAt: string) => {
    const date = new Date(expiresAt);
    const now = new Date();
    const diffInDays = Math.ceil(
      (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays <= 0) {
      return "Expired";
    } else if (diffInDays === 1) {
      return "Expires tomorrow";
    } else {
      return `Expires in ${diffInDays} days`;
    }
  };

  if (invites.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <div className="flex items-center space-x-2 mb-4">
          <ClockIcon className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-gray-900">
            Pending Invitations
          </h2>
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {invites.map((invite) => (
              <motion.div
                key={invite.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">
                      {invite.inviteeEmail}
                    </span>
                    <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                      {invite.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {formatExpiryDate(invite.expiresAt)}
                  </div>
                </div>
                <button
                  onClick={() => handleRevokeClick(invite)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200"
                  title="Revoke invitation"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {invites.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> Invitations expire after 30 days. The
              recipient will receive an email with instructions to accept the
              invitation.
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!inviteToRevoke}
        onConfirm={confirmRevoke}
        onCancel={cancelRevoke}
        title="Revoke Invitation"
        message={`Are you sure you want to revoke the invitation sent to ${inviteToRevoke?.email}? This action cannot be undone.`}
        confirmText="Revoke"
        cancelText="Cancel"
        confirmVariant="danger"
      />
    </>
  );
}
