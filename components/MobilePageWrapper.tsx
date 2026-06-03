

export default function MobilePageWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pb-32">
      {children}
    </div>
  );
}