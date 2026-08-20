import { redirect } from "next/navigation";
import { getCurrentUser, homeForRole } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(homeForRole(user.role));
}
