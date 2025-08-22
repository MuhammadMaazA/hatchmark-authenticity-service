import { useState, useEffect } from "react";
import { CheckCircle, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  title: string;
  description: string;
}

interface ProgressIndicatorProps {
  steps: Step[];
  currentStep: string | null;
  completedSteps: string[];
  className?: string;
}

export function ProgressIndicator({ steps, currentStep, completedSteps, className }: ProgressIndicatorProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(step.id);
        const isCurrent = currentStep === step.id;
        const isUpcoming = !isCompleted && !isCurrent;

        return (
          <div key={step.id} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300",
                isCompleted && "bg-gradient-to-r from-green-500 to-emerald-500 text-white",
                isCurrent && "bg-gradient-to-r from-primary to-accent text-primary-foreground animate-pulse-glow",
                isUpcoming && "bg-muted text-muted-foreground"
              )}>
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5" />
                ) : isCurrent ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </div>
              
              {index < steps.length - 1 && (
                <div className={cn(
                  "w-px h-8 mt-2 transition-colors duration-300",
                  isCompleted ? "bg-green-500" : "bg-muted"
                )} />
              )}
            </div>
            
            <div className={cn(
              "flex-1 pb-4 transition-all duration-300",
              isCurrent && "animate-slide-up"
            )}>
              <h4 className={cn(
                "font-medium transition-colors duration-300",
                isCompleted && "text-green-600 dark:text-green-400",
                isCurrent && "text-primary",
                isUpcoming && "text-muted-foreground"
              )}>
                {step.title}
              </h4>
              <p className={cn(
                "text-sm mt-1 transition-colors duration-300",
                isCompleted && "text-green-600/80 dark:text-green-400/80",
                isCurrent && "text-foreground",
                isUpcoming && "text-muted-foreground"
              )}>
                {step.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}