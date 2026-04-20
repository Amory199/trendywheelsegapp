export default function SupportDashboard(): JSX.Element {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <header className="bg-gradient-to-r from-primary-700 to-primary-500 text-white p-6">
        <h1 className="text-2xl font-bold">TrendyWheels Support</h1>
        <p className="text-sm opacity-80">Ticket & Chat Management</p>
      </header>
      <div className="p-6">
        {/* TODO: Ticket queue, live chat, KB editor */}
        <p className="text-gray-500">Support dashboard coming soon.</p>
      </div>
    </main>
  );
}
