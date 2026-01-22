import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "NxtDevs | Train Your Algorithmic Mind",
    description: "Level up your coding intuition. Practice, compete, and master algorithmic thinking.",
};

export default function LandingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
