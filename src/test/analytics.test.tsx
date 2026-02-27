import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Analytics from "../pages/Analytics";

vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
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

// Mock Recharts specifically here to prevent OOM
vi.mock("recharts", async (importOriginal) => {
    const actual = await importOriginal<typeof import("recharts")>();
    return {
        ...actual,
        ResponsiveContainer: ({ children }: any) => <div style={{ width: 800, height: 400 }}>{children}</div>,
        PieChart: ({ children }: any) => <div>PieChart {children}</div>,
        Pie: () => <div />,
        Cell: () => <div />,
        BarChart: ({ children }: any) => <div>BarChart {children}</div>,
        Bar: () => <div />,
        XAxis: () => <div />,
        YAxis: () => <div />,
        Tooltip: () => <div />,
        Legend: () => <div />,
    };
});

describe("Analytics Page", () => {
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

    it("should render Analytics page", async () => {
        renderWithProviders(<Analytics />);

        await waitFor(() => {
            expect(screen.getByText("Analytics")).toBeInTheDocument();
            expect(screen.getByText(/No data to display yet/i)).toBeInTheDocument();
        });
    });
});
