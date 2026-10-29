import type { Metadata } from "next";

import { AdminGate } from "@/components/admin/admin-gate";
import { NewBlogEditor } from "@/components/blogs/blog-editor";

export const metadata: Metadata = { title: "Create blog" };

export default function NewBlogPage() {
  return (
    <AdminGate message="Only admins can write blogs." backHref="/blogs" backLabel="Back to blogs">
      <NewBlogEditor />
    </AdminGate>
  );
}
