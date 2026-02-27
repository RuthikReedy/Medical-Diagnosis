import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Analyze from "../pages/Analyze";

vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        from: vi.fn(() => ({
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: "123" }, error: null }),
        })),
        storage: {
            from: vi.fn(() => ({
                upload: vi.fn().mockResolvedValue({ error: null }),
                getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "http://example.com/image.png" } }),
            })),
        },
        functions: {
            invoke: vi.fn().mockResolvedValue({
                data: {
                    analysis: { summary: "Summary", findings: "findings", recommendations: "action" },
                    disease_found: false,
                },
                error: null,
            }),
        },
    },
}));

vi.mock("@/hooks/useAuth", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/hooks/useAuth")>();
    return {
        ...actual,
        useAuth: () => ({
            session: { user: { id: "test-user" } },
            user: { id: "test-user" },
            loading: false,
        }),
    };
});

describe("Analyze Page", () => {
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

    it("should render Analyze page elements", async () => {
        renderWithProviders(<Analyze />);

        await waitFor(() => {
            expect(screen.getByText("New Analysis")).toBeInTheDocument();
            expect(screen.getByLabelText(/Patient Name/i)).toBeInTheDocument();
        });

        expect(screen.getByRole("button", { name: /Start AI Analysis/i })).toBeInTheDocument();
    });

    it("should allow filling Analyze form", async () => {
        const user = userEvent.setup();
        renderWithProviders(<Analyze />);

        // Wait for the form to render
        await waitFor(() => {
            expect(screen.getByLabelText(/Patient Name/i)).toBeInTheDocument();
        });

        const nameInput = screen.getByLabelText(/Patient Name/i);
        await user.type(nameInput, "John Doe");
        expect(nameInput).toHaveValue("John Doe");

        const bodyRegionInput = screen.getByLabelText(/Body Region/i);
        await user.type(bodyRegionInput, "Chest");
        expect(bodyRegionInput).toHaveValue("Chest");
    });
});
