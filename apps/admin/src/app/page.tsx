export default function AdminDashboard(): JSX.Element {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      <header className="bg-gradient-to-r from-primary-700 to-primary-500 text-white p-6">
        <h1 className="text-2xl font-bold">TrendyWheels Admin</h1>
        <p className="text-sm opacity-80">Dashboard Overview</p>
      </header>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric Cards */}
        <MetricCard title="Total Bookings" value="0" subtitle="Today" />
        <MetricCard title="Revenue" value="0 EGP" subtitle="This month" />
        <MetricCard title="Active Users" value="0" subtitle="Total" />
        <MetricCard title="Vehicle Utilization" value="0%" subtitle="Average" />
      </div>

      {/* TODO: Charts, recent activity, vehicle management */}
    </main>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}): JSX.Element {
  return (
    <div className="bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-border p-6 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}
