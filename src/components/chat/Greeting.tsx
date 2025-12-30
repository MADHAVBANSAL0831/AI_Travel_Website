"use client";

import { motion } from "framer-motion";
import { Plane, Hotel, Compass, Car, Sparkles } from "lucide-react";

interface GreetingProps {
  onSuggestionClick: (prompt: string) => void;
}

const SUGGESTED_PROMPTS = [
  { icon: Plane, text: "Find me flights from Delhi to London next week", bgColor: "bg-blue-50 dark:bg-blue-900/30", iconColor: "text-blue-600 dark:text-blue-400", hoverBg: "hover:bg-blue-100 dark:hover:bg-blue-900/50", borderColor: "hover:border-blue-300 dark:hover:border-blue-600" },
  { icon: Hotel, text: "I need a hotel in Paris for 3 nights", bgColor: "bg-emerald-50 dark:bg-emerald-900/30", iconColor: "text-emerald-600 dark:text-emerald-400", hoverBg: "hover:bg-emerald-100 dark:hover:bg-emerald-900/50", borderColor: "hover:border-emerald-300 dark:hover:border-emerald-600" },
  { icon: Compass, text: "Plan a weekend trip to Goa for 2 people", bgColor: "bg-purple-50 dark:bg-purple-900/30", iconColor: "text-purple-600 dark:text-purple-400", hoverBg: "hover:bg-purple-100 dark:hover:bg-purple-900/50", borderColor: "hover:border-purple-300 dark:hover:border-purple-600" },
  { icon: Car, text: "I want to travel from Mumbai to Pune tomorrow", bgColor: "bg-orange-50 dark:bg-orange-900/30", iconColor: "text-orange-600 dark:text-orange-400", hoverBg: "hover:bg-orange-100 dark:hover:bg-orange-900/50", borderColor: "hover:border-orange-300 dark:hover:border-orange-600" },
];

export function Greeting({ onSuggestionClick }: GreetingProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))] dark:bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.15),rgba(0,0,0,0))]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl blur-xl opacity-40 animate-pulse" />
        <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-5 rounded-2xl mb-6 shadow-xl">
          <Sparkles className="h-10 w-10 text-white" />
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3"
      >
        Where would you like to go?
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-gray-500 dark:text-gray-400 mb-10 max-w-md text-lg"
      >
        I&apos;m your AI travel assistant. Tell me about your trip and I&apos;ll find the best options for you.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl"
      >
        {SUGGESTED_PROMPTS.map((prompt, index) => (
          <motion.button
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSuggestionClick(prompt.text)}
            className={`flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 ${prompt.borderColor} ${prompt.hoverBg} transition-all text-left group shadow-sm hover:shadow-lg`}
          >
            <div className={`p-3 ${prompt.bgColor} rounded-xl transition-all duration-300 group-hover:scale-110`}>
              <prompt.icon className={`h-5 w-5 ${prompt.iconColor}`} />
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-snug">
              {prompt.text}
            </span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}

