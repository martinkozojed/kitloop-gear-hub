import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";
import { motion, HTMLMotionProps } from "framer-motion";

type SectionProps = Omit<HTMLMotionProps<"section">, "ref"> & {
  className?: string;
};

export default function Section({ className, ...props }: SectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn("py-24 px-4 max-w-6xl mx-auto", className)}
      {...props}
    />
  );
}
