import AdminLayout from "~/components/admin/AdminLayout";
import TeamManagement from "~/components/admin/TeamManagement";

export default function AdminTeamRoute() {
    return (
        <AdminLayout activePage="team">
            <TeamManagement/>
        </AdminLayout>
    );
}