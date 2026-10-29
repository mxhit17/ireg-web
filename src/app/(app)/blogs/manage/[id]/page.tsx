import type { Metadata } from "next";

import { AdminGate } from "@/components/admin/admin-gate";
import { EditBlogEditor } from "@/components/blogs/blog-editor";

export const metadata: Metadata = { title: "Edit blog" };

export default async function EditBlogPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ slug?: string }>;
}) {
  const [{ id }, { slug }] = await Promise.all([params, searchParams]);
  return (
    <AdminGate message="Only admins can edit blogs." backHref="/blogs" backLabel="Back to blogs">
      <EditBlogEditor id={id} slug={typeof slug === "string" && slug ? slug : null} />
    </AdminGate>
  );
}
