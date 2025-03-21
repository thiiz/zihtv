import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to profiles page
  redirect("/profiles");
}
