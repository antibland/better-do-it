// Shared Partner types used across the application

export type Partner = {
  id: string;
  email: string;
  name: string;
  partnershipId: string;
  createdAt: string;
};

export type PartnerResponse = {
  partners: Partner[];
};

export type PartnerTasksResponse = {
  partner: {
    id: string;
    email: string;
    name: string;
  };
  tasks: import("./task").Task[];
  completedThisWeek: number;
};

export type Invite = {
  id: string;
  code: string;
  inviterId: string;
  inviteeEmail: string;
  status: "pending" | "accepted" | "expired";
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
};

export type InviteResponse = {
  success: boolean;
  message: string;
  invite?: Invite;
  error?: string;
};

export type InvitesResponse = {
  success: boolean;
  invites: Invite[];
  error?: string;
};
