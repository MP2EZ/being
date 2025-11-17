/**
 * Standalone Layout - No navigation
 * For pages like coming-soon that should not have header/footer
 */

export const metadata = {
  title: 'Being - Launching Soon',
  description: 'Ancient Stoic wisdom meets modern mental health practice. Join the waitlist.',
};

export default function StandaloneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
