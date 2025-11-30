"use client";

import { payments } from "@square/web-sdk";
import { useEffect, useRef, useState } from "react";
import { getIntegration, IntegrationConfig } from "@/lib/api/integration.api";

interface SquarePaymentFormProps {
  onCardTokenized: (cardToken: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

export default function SquarePaymentForm({
  onCardTokenized,
  onError,
  disabled = false,
}: SquarePaymentFormProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [paymentForm, setPaymentForm] = useState<payments.PaymentForm | null>(
    null
  );
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const [integration, setIntegration] = useState<IntegrationConfig | null>(
    null
  );

  useEffect(() => {
    const initializeSquare = async () => {
      try {
        // Get Square integration config
        const integrationData = await getIntegration("payment");
        if (!integrationData?.data) {
          onError("Square payment integration not configured");
          setIsLoading(false);
          return;
        }

        const config = integrationData.data;
        if (config.provider !== "square" || !config.applicationId) {
          onError("Square payment integration not properly configured");
          setIsLoading(false);
          return;
        }

        setIntegration(config);

        // Initialize Square Payment Form
        const form = await payments.paymentForm({
          applicationId: config.applicationId,
          locationId: config.locationId || "",
          inputClass: "sq-input",
          autoBuild: false,
          card: {
            elementId: "#sq-card",
          },
        });

        setPaymentForm(form);
        setIsLoading(false);
      } catch (error) {
        console.error("Error initializing Square:", error);
        onError(
          error instanceof Error
            ? error.message
            : "Failed to initialize payment form"
        );
        setIsLoading(false);
      }
    };

    initializeSquare();
  }, [onError]);

  useEffect(() => {
    if (paymentForm && cardContainerRef.current) {
      paymentForm.build();
    }
  }, [paymentForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!paymentForm || disabled) {
      return;
    }

    try {
      const result = await paymentForm.requestCardNonce();
      if (result.status === "OK" && result.cardNonce) {
        onCardTokenized(result.cardNonce);
      } else {
        onError(
          result.errors?.[0]?.detail ||
            "Failed to tokenize card. Please try again."
        );
      }
    } catch (error) {
      console.error("Error tokenizing card:", error);
      onError(
        error instanceof Error
          ? error.message
          : "Failed to process card. Please try again."
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-600 dark:text-gray-400">Loading payment form...</div>
      </div>
    );
  }

  if (!integration) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded">
        Square payment integration is not configured. Please configure it in Settings → Integrations → Payment.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Card Information
        </label>
        <div id="sq-card" ref={cardContainerRef} className="sq-input"></div>
      </div>

      <button
        type="submit"
        disabled={disabled || !paymentForm}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {disabled ? "Processing..." : "Save Card for Autopay"}
      </button>

      <style jsx global>{`
        .sq-input {
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          padding: 0.5rem;
          min-height: 2.5rem;
        }
        .sq-input:focus {
          outline: none;
          border-color: #3b82f6;
          ring: 2px;
          ring-color: #3b82f6;
        }
        .dark .sq-input {
          background-color: #374151;
          border-color: #4b5563;
          color: #f9fafb;
        }
      `}</style>
    </form>
  );
}
