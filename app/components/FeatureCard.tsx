"use client";

import { motion } from "motion/react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <motion.div
      className="pt-6 grid grid-rows-subgrid"
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="bg-card rounded-lg px-6 pb-8 shadow-lg h-full flex flex-col relative overflow-hidden">
        <div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, transparent 100%)",
            border: "1px solid transparent",
            borderImage:
              "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 50%, transparent 100%) 1",
          }}
        ></div>
        <div
          className="absolute inset-0 rounded-lg pointer-events-none dark:block hidden"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%, transparent 100%)",
            border: "1px solid transparent",
            borderImage:
              "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 50%, transparent 100%) 1",
          }}
        ></div>

        <div className="flex-1 relative z-10 pt-6">
          <div className="flex items-start gap-4">
            <span className="inline-flex items-center justify-center p-1 bg-secondary rounded-md shadow-lg shrink-0">
              {icon}
            </span>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-card-foreground tracking-tight">
                {title}
              </h3>
              <p className="mt-3 text-base text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
