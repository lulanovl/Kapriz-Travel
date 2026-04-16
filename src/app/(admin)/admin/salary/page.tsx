import Header from "@/components/admin/Header";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import SalaryClient from "./SalaryClient";

export const dynamic = "force-dynamic";

export default async function SalaryPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // Only Admin, Senior Manager, Finance can see salary calculations
  if (!["ADMIN", "SENIOR_MANAGER", "FINANCE"].includes(session.user.role)) {
    redirect("/admin");
  }

  // Finance and above can also add/edit extra expenses
  const canEdit = ["ADMIN", "SENIOR_MANAGER", "FINANCE"].includes(session.user.role);

  return (
    <>
      <Header title="Зарплаты менеджеров" />
      <div className="p-6">
        <SalaryClient canEdit={canEdit} />
      </div>
    </>
  );
}
