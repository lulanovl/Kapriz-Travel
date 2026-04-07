import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Header from "@/components/admin/Header";
import TourForm from "@/components/admin/tours/TourForm";

export default async function NewTourPage() {
  const session = await getServerSession(authOptions);
  if (!["ADMIN", "SENIOR_MANAGER"].includes(session?.user.role ?? "")) {
    redirect("/admin/tours");
  }

  return (
    <>
      <Header title="Новый тур" />
      <div className="flex-1 p-6 max-w-3xl">
        <TourForm />
      </div>
    </>
  );
}
