import { getDashboardStats } from "./actions";
import { Users, Activity, User, Building2, Clock } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const stats = await getDashboardStats();

  return (
    <div className="min-h-screen bg-background py-10 text-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-2 text-muted">
            Overview of population and hospital admissions.
          </p>
        </div>
        <Link
          href="/population"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          Manage Population
        </Link>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Population Card */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted">
              Total Population
            </h3>
            <Users className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-2 text-3xl font-bold text-foreground">{stats.totalPopulation}</p>
        </div>

        {/* Total Admissions Card */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted">
              Total Admissions
            </h3>
            <Activity className="h-5 w-5 text-secondary" />
          </div>
          <p className="mt-2 text-3xl font-bold text-foreground">{stats.totalAdmissions}</p>
        </div>

        {/* Gender Distribution Card (Combined) */}
        <div className="col-span-1 md:col-span-2 rounded-xl border border-border bg-surface p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted">
              Gender Distribution
            </h3>
            <User className="h-5 w-5 text-muted" />
            </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-blue-500/5 hover:bg-blue-500/10 transition-colors">
              <span className="block text-2xl font-bold text-blue-500">
                {stats.genderDistribution.M}
              </span>
              <span className="text-xs font-medium text-muted">Male</span>
            </div>
            <div className="text-center p-3 rounded-lg bg-pink-500/5 hover:bg-pink-500/10 transition-colors">
              <span className="block text-2xl font-bold text-pink-500">
                {stats.genderDistribution.F}
              </span>
              <span className="text-xs font-medium text-muted">Female</span>
            </div>
            <div className="text-center p-3 rounded-lg bg-purple-500/5 hover:bg-purple-500/10 transition-colors">
              <span className="block text-2xl font-bold text-purple-500">
                {stats.genderDistribution.O}
              </span>
              <span className="text-xs font-medium text-muted">Other</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold text-foreground">Recent Hospital Admissions</h2>
        <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
          {stats.recentAdmissions.length === 0 ? (
            <div className="p-6 text-center text-muted">
              No recent admissions found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-surface-highlight text-muted">
                  <tr>
                    <th className="px-6 py-3 font-medium">Citizen ID</th>
                    <th className="px-6 py-3 font-medium">Hospital Name</th>
                    <th className="px-6 py-3 font-medium">Admission Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.recentAdmissions.map((admission) => (
                    <tr key={admission.id} className="hover:bg-surface-highlight/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">{admission.cid}</td>
                      <td className="px-6 py-4 text-muted">
                        <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            {admission.hospitalName}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted">
                        <div className="flex items-center gap-2">
                           <Clock className="h-4 w-4 text-secondary" />
                           {new Date(admission.admissionDate).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
