export default function Layout({ children, currentPageName }) {
  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      {children}
    </div>
  );
}