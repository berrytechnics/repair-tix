import api, { ApiResponse } from '.';

export type IntegrationType = 'email' | 'payment' | 'sms';

export interface IntegrationConfig {
  type: IntegrationType;
  provider: string;
  enabled: boolean;
  credentials: Record<string, string>; // Masked credentials
  settings?: Record<string, unknown>;
  lastTested?: string;
  lastError?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveEmailIntegrationData {
  provider: string;
  enabled?: boolean;
  credentials: {
    apiKey: string;
  };
  settings?: {
    fromEmail: string;
    fromName?: string;
    replyTo?: string;
  };
}

// Integration API functions
export const getIntegration = async (
  type: IntegrationType
): Promise<ApiResponse<IntegrationConfig> | null> => {
  try {
    const response = await api.get<ApiResponse<IntegrationConfig>>(`/integrations/${type}`);

    if (response.data.success) {
      return response.data;
    }

    throw new Error(response.data.error?.message || 'Failed to fetch integration');
  } catch (error: any) {
    // 404 means integration not configured yet - that's okay, return null
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const saveIntegration = async (
  type: IntegrationType,
  data: SaveEmailIntegrationData
): Promise<ApiResponse<IntegrationConfig>> => {
  const response = await api.post<ApiResponse<IntegrationConfig>>(
    `/integrations/${type}`,
    data
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || 'Failed to save integration');
};

export const testIntegration = async (
  type: IntegrationType
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.post<ApiResponse<{ message: string }>>(
    `/integrations/${type}/test`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || 'Failed to test integration');
};

export const deleteIntegration = async (
  type: IntegrationType
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.delete<ApiResponse<{ message: string }>>(
    `/integrations/${type}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || 'Failed to delete integration');
};

