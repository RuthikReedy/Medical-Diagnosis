import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Auth from "../pages/Auth";
import NotFound from "../pages/NotFound";

vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        auth: {
            getSession: vi.fn(),
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
            signInWithPassword: vi.fn(),
            signUp: vi.fn(),
        }
    },
}));

// Mock useAuth
vi.mock("@/hooks/useAuth", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/hooks/useAuth")>();
    return {
        ...actual,
        useAuth: () => ({
            session: null,
            user: null,
            loading: false,
        }),
    };
});

describe("Auth and NotFound Pages", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const renderWithProviders = (ui: React.ReactElement, route = "/auth") => {
        return render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
            </QueryClientProvider>
        );
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render NotFound page", () => {
        renderWithProviders(<NotFound />, "/unknown");
        expect(screen.getByText("404")).toBeInTheDocument();
    });

    it("should render Auth page (Login form)", () => {
        renderWithProviders(<Auth />);
        expect(screen.getByRole("heading", { name: /Welcome back/i })).toBeInTheDocument();
    });

    it("should toggle to Signup form", async () => {
        const user = userEvent.setup();
        renderWithProviders(<Auth />);

        const toggleButton = screen.getByRole("button", { name: /Sign up/i });
        await user.click(toggleButton);

        expect(await screen.findByRole("heading", { name: /Create account/i })).toBeInTheDocument();
    });
});
