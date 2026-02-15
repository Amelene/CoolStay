import AdminNavbar from "@/components/admin/AdminNavbar";
import AdminSidebar from "@/components/admin/AdminSidebar";
import IdleTimer from "@/components/admin/IdleTimer"; // Import

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F0F8FF] font-sans text-gray-800">
      <IdleTimer /> {/* Protects all admin pages */}
      <AdminSidebar />
      <div className="lg:ml-64 min-h-screen flex flex-col">
        <AdminNavbar />
        <main className="flex-1 p-6 mt-16 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
