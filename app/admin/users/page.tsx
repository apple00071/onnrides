import { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";
import { getUsers } from "@/lib/api/users";

export const metadata: Metadata = {
  title: "Users | Admin Dashboard",
  description: "Manage registered users",
};

export default async function UsersPage() {
  try {
    const users = await getUsers();

    return (
      <div className="space-y-6">
        <div className="page-header">
          <h1 className="page-title">Users</h1>
        </div>

        <div className="container-base p-6">
          <Card className="border-none">
            <CardContent className="p-0">
              <DataTable
                columns={columns}
                data={users}
                searchKey="name"
                searchPlaceholder="Search users..."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">Error</h2>
          <p className="mt-2 text-sm text-gray-600">Failed to load users. Please try again later.</p>
        </div>
      </div>
    );
  }
} 