"use client";

import { useState } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDownIcon } from "lucide-react";
import { Partner, PartnerTasksResponse, Invite } from "@/types";
import { PendingInvitesSection } from "./PendingInvitesSection";
import { TaskAgeIcon } from "./TaskAgeIcon";

function PartnersAccordion({
  partners,
  partnerTasksMap,
  onUnpairPartner,
}: {
  partners: Partner[];
  partnerTasksMap: Record<string, PartnerTasksResponse>;
  onUnpairPartner: (partnershipId: string) => void;
}) {
  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);

  const handleAccordionChange = (value: string | string[]) => {
    setOpenAccordionItems(Array.isArray(value) ? value : [value]);
  };

  return (
    <div className="mb-10">
      <Accordion.Root
        type="multiple"
        value={openAccordionItems}
        onValueChange={handleAccordionChange}
        className="space-y-2"
      >
        {partners.map((partner) => {
          const partnerTasks = partnerTasksMap[partner.id];
          const isOpen = openAccordionItems.includes(partner.id);

          return (
            <Accordion.Item
              key={partner.id}
              value={partner.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            >
              <Accordion.Header className="w-full">
                <Accordion.Trigger className="flex items-center justify-between w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-inset">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium text-sm">
                        {partner.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {partner.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {partner.email}
                      </div>
                    </div>
                  </div>
                  <ChevronDownIcon
                    className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </Accordion.Trigger>
              </Accordion.Header>

              <Accordion.Content className="AccordionContent px-4 pb-4">
                <div className="space-y-4">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <p className="text-sm text-indigo-700 dark:text-indigo-300">
                      <span className="font-medium">Partnered since:</span>{" "}
                      {new Date(partner.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">
                        {partner.name}&apos;s Week:
                      </span>{" "}
                      {partnerTasks?.completedThisWeek || 0} completed this week
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                      {partner.name}&apos;s Active Tasks
                    </h3>
                    <div className="space-y-3">
                      {partnerTasks?.tasks
                        .filter((task) => task.isCompleted === 0)
                        .map((task) => (
                          <div
                            key={task.id}
                            className={`flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg ${
                              task.isCompleted === 1
                                ? "bg-green-50 dark:bg-green-950/20"
                                : "bg-gray-50 dark:bg-gray-800"
                            }`}
                          >
                            <div className="w-5 h-5 flex items-center justify-center">
                              {task.isCompleted === 1 ? (
                                <span className="text-green-600 dark:text-green-400 text-xs">
                                  ✓
                                </span>
                              ) : (
                                <TaskAgeIcon
                                  addedToActiveAt={task.addedToActiveAt}
                                  createdAt={task.createdAt}
                                />
                              )}
                            </div>
                            <span
                              className={`${
                                task.isCompleted === 1
                                  ? "text-gray-500 dark:text-gray-400 line-through"
                                  : "text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              {task.title}
                            </span>
                            {task.isCompleted === 1 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                                {new Date(
                                  task.completedAt!
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ))}
                      {(!partnerTasks ||
                        partnerTasks.tasks.filter(
                          (task) => task.isCompleted === 0
                        ).length === 0) && (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                          No active tasks
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => onUnpairPartner(partner.partnershipId)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium transition-colors duration-200"
                    >
                      Unpair with {partner.name}
                    </button>
                  </div>
                </div>
              </Accordion.Content>
            </Accordion.Item>
          );
        })}
      </Accordion.Root>
    </div>
  );
}

function InvitePartnerForm({
  partnerEmail,
  loading,
  onPartnerEmailChange,
  onSendInvite,
}: {
  partnerEmail: string;
  loading: boolean;
  onPartnerEmailChange: (email: string) => void;
  onSendInvite: (e: React.FormEvent) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-600 dark:text-gray-300 text-pretty">
          Send an invitation to someone you&apos;d like to partner with on
          tasks.
        </p>
      </div>
      <form onSubmit={onSendInvite} className="space-y-4">
        <div>
          <label
            htmlFor="partner-email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Email Address
          </label>
          <input
            id="partner-email"
            type="email"
            value={partnerEmail}
            onChange={(e) => onPartnerEmailChange(e.target.value)}
            placeholder="Enter partner's email address..."
            className="w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !partnerEmail.trim()}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {loading ? "Sending..." : "Send Invitation"}
        </button>
      </form>
    </div>
  );
}

interface PartnersSectionProps {
  partners: Partner[];
  partnerTasksMap: Record<string, PartnerTasksResponse>;
  partnerEmail: string;
  loading: boolean;
  invites: Invite[];
  onPartnerEmailChange: (email: string) => void;
  onSendInvite: (e: React.FormEvent) => void;
  onUnpairPartner: (partnershipId: string) => void;
  onRevokeInvite: (inviteId: string) => void;
}

export function PartnersSection({
  partners,
  partnerTasksMap,
  partnerEmail,
  loading,
  invites,
  onPartnerEmailChange,
  onSendInvite,
  onUnpairPartner,
  onRevokeInvite,
}: PartnersSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
        {partners.length === 1 ? "Partner" : "Partners"}
      </h2>

      {partners.length > 0 ? (
        <PartnersAccordion
          partners={partners}
          partnerTasksMap={partnerTasksMap}
          onUnpairPartner={onUnpairPartner}
        />
      ) : (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-600 dark:text-gray-300 text-center">
            No partners yet. Send an invitation below to get started!
          </p>
        </div>
      )}

      <InvitePartnerForm
        partnerEmail={partnerEmail}
        loading={loading}
        onPartnerEmailChange={onPartnerEmailChange}
        onSendInvite={onSendInvite}
      />

      <PendingInvitesSection
        invites={invites}
        onRevokeInvite={onRevokeInvite}
      />
    </div>
  );
}
