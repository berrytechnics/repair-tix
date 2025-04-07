import axios, { AxiosError, AxiosRequestConfig } from "axios";

// Create axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interface
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    errors?: Record<string, string>;
  };
}

// Types for auth
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Ticket interfaces
export interface Ticket {
  id: string;
  ticketNumber: string;
  customerId: string;
  technicianId?: string;
  status:
    | "new"
    | "assigned"
    | "in_progress"
    | "on_hold"
    | "completed"
    | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  deviceType: string;
  deviceBrand?: string;
  deviceModel?: string;
  serialNumber?: string;
  issueDescription: string;
  diagnosticNotes?: string;
  repairNotes?: string;
  estimatedCompletionDate?: string;
  completedDate?: string;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  technician?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateTicketData {
  customerId: string;
  technicianId?: string;
  deviceType: string;
  deviceBrand?: string;
  deviceModel?: string;
  serialNumber?: string;
  issueDescription: string;
  priority?: "low" | "medium" | "high" | "urgent";
}

export interface UpdateTicketData {
  customerId?: string;
  technicianId?: string;
  deviceType?: string;
  deviceBrand?: string;
  deviceModel?: string;
  serialNumber?: string;
  issueDescription?: string;
  status?:
    | "new"
    | "assigned"
    | "in_progress"
    | "on_hold"
    | "completed"
    | "cancelled";
  priority?: "low" | "medium" | "high" | "urgent";
  estimatedCompletionDate?: string;
  completedDate?: string;
}

// Customer interfaces
export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
}

export interface UpdateCustomerData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
}

// Token management
let accessToken: string | null = null;

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token to headers if available
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // If 401 and not already retrying, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Get refresh token from local storage
        const refreshToken = localStorage.getItem("refreshToken");

        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        // Attempt to refresh token
        const response = await axios.post<
          ApiResponse<{ accessToken: string; refreshToken: string }>
        >(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, { refreshToken });

        if (response.data.success && response.data.data) {
          // Update tokens
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
            response.data.data;
          accessToken = newAccessToken;
          localStorage.setItem("refreshToken", newRefreshToken);

          // Retry original request
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          return axios(originalRequest);
        }
      } catch (err) {
        console.error(err);
        // If refresh fails, logout user
        logout();
      }
    }

    return Promise.reject(error);
  }
);

// Auth functions
export const login = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  const response = await api.post<ApiResponse<AuthResponse>>(
    "/auth/login",
    credentials
  );

  if (response.data.success && response.data.data) {
    const { accessToken: token, refreshToken } = response.data.data;
    accessToken = token;
    localStorage.setItem("refreshToken", refreshToken);
    return response.data.data;
  }

  throw new Error(response.data.error?.message || "Login failed");
};

export const register = async (
  userData: LoginCredentials & {
    firstName: string;
    lastName: string;
    role?: string;
  }
): Promise<AuthResponse> => {
  const response = await api.post<ApiResponse<AuthResponse>>(
    "/auth/register",
    userData
  );

  if (response.data.success && response.data.data) {
    const { accessToken: token, refreshToken } = response.data.data;
    accessToken = token;
    localStorage.setItem("refreshToken", refreshToken);
    return response.data.data;
  }

  throw new Error(response.data.error?.message || "Registration failed");
};

export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get<ApiResponse<User>>("/auth/me");

  if (response.data.success && response.data.data) {
    return response.data.data;
  }

  throw new Error(response.data.error?.message || "Failed to get user");
};

export const logout = (): void => {
  accessToken = null;
  localStorage.removeItem("refreshToken");
  // Redirect to login or handle in UI
};

// Ticket API functions
export const getTickets = async (
  params?: URLSearchParams
): Promise<ApiResponse<Ticket[]>> => {
  const url = params ? `/tickets?${params.toString()}` : "/tickets";
  const response = await api.get<ApiResponse<Ticket[]>>(url);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to fetch tickets");
};

export const getTicketById = async (
  id: string
): Promise<ApiResponse<Ticket>> => {
  const response = await api.get<ApiResponse<Ticket>>(`/tickets/${id}`);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to fetch ticket");
};

export const createTicket = async (
  ticketData: CreateTicketData
): Promise<ApiResponse<Ticket>> => {
  const response = await api.post<ApiResponse<Ticket>>("/tickets", ticketData);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to create ticket");
};

export const updateTicket = async (
  id: string,
  ticketData: UpdateTicketData
): Promise<ApiResponse<Ticket>> => {
  const response = await api.put<ApiResponse<Ticket>>(
    `/tickets/${id}`,
    ticketData
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to update ticket");
};

export const deleteTicket = async (
  id: string
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.delete<ApiResponse<{ message: string }>>(
    `/tickets/${id}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to delete ticket");
};

export const assignTechnician = async (
  ticketId: string,
  technicianId: string,
  notes?: string
): Promise<ApiResponse<Ticket>> => {
  const response = await api.post<ApiResponse<Ticket>>(
    `/tickets/${ticketId}/assign`,
    { technicianId, notes }
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to assign technician"
  );
};

export const updateTicketStatus = async (
  ticketId: string,
  status:
    | "new"
    | "assigned"
    | "in_progress"
    | "on_hold"
    | "completed"
    | "cancelled",
  notes?: string
): Promise<ApiResponse<Ticket>> => {
  const response = await api.post<ApiResponse<Ticket>>(
    `/tickets/${ticketId}/status`,
    { status, notes }
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to update ticket status"
  );
};

export const addDiagnosticNote = async (
  ticketId: string,
  note: string
): Promise<ApiResponse<Ticket>> => {
  const response = await api.post<ApiResponse<Ticket>>(
    `/tickets/${ticketId}/diagnostic-notes`,
    { note }
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to add diagnostic note"
  );
};

export const addRepairNote = async (
  ticketId: string,
  note: string
): Promise<ApiResponse<Ticket>> => {
  const response = await api.post<ApiResponse<Ticket>>(
    `/tickets/${ticketId}/repair-notes`,
    { note }
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to add repair note");
};

// Customer API functions
export const getCustomers = async (
  params?: URLSearchParams
): Promise<ApiResponse<Customer[]>> => {
  const url = params ? `/customers?${params.toString()}` : "/customers";
  const response = await api.get<ApiResponse<Customer[]>>(url);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to fetch customers");
};

export const getCustomerById = async (
  id: string
): Promise<ApiResponse<Customer>> => {
  const response = await api.get<ApiResponse<Customer>>(`/customers/${id}`);

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to fetch customer");
};

export const createCustomer = async (
  customerData: CreateCustomerData
): Promise<ApiResponse<Customer>> => {
  const response = await api.post<ApiResponse<Customer>>(
    "/customers",
    customerData
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to create customer");
};

export const updateCustomer = async (
  id: string,
  customerData: UpdateCustomerData
): Promise<ApiResponse<Customer>> => {
  const response = await api.put<ApiResponse<Customer>>(
    `/customers/${id}`,
    customerData
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to update customer");
};

export const deleteCustomer = async (
  id: string
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.delete<ApiResponse<{ message: string }>>(
    `/customers/${id}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to delete customer");
};

export const searchCustomers = async (
  query: string
): Promise<ApiResponse<Customer[]>> => {
  const response = await api.get<ApiResponse<Customer[]>>(
    `/customers/search?query=${encodeURIComponent(query)}`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(response.data.error?.message || "Failed to search customers");
};

export const getCustomerTickets = async (
  customerId: string
): Promise<ApiResponse<Ticket[]>> => {
  const response = await api.get<ApiResponse<Ticket[]>>(
    `/customers/${customerId}/tickets`
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch customer tickets"
  );
};

// User/Technician API functions
export type Technician = User & {
  // Additional technician-specific fields could be added here
};

export const getTechnicians = async (): Promise<ApiResponse<Technician[]>> => {
  const response = await api.get<ApiResponse<Technician[]>>(
    "/users/technicians"
  );

  if (response.data.success) {
    return response.data;
  }

  throw new Error(
    response.data.error?.message || "Failed to fetch technicians"
  );
};

// Set token from storage on init
if (typeof window !== "undefined") {
  const savedToken = localStorage.getItem("accessToken");
  if (savedToken) {
    accessToken = savedToken;
  }
}

export default api;
