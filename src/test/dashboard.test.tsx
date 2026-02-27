import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "../pages/Dashboard";

vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: vi.fn((callback) => Promise.resolve({ data: [], error: null }).then(callback)),
        })),
    },
}));

vi.mock("@/hooks/useAuth", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/hooks/useAuth")>();
    return {
        ...actual,
        useAuth: () => ({
            session: { user: { id: "test-user" } },
            user: { user_metadata: { first_name: "John" } },
            loading: false,
        }),
    };
});

describe("Dashboard Page", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const renderWithProviders = (ui: React.ReactElement) => {
        return render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>{ui}</MemoryRouter>
            </QueryClientProvider>
        );
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render Dashboard page elements", async () => {
        renderWithProviders(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
            expect(screen.getByText("Recent Diagnoses")).toBeInTheDocument();
        });
    });
});
