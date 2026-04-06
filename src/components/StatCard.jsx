export default function StatCard({ icon, label, value, gradient }) {
  return (
    <div className={`rounded-2xl p-5 text-white ${gradient}`}>
      <div className="mb-2 opacity-80">{icon}</div>
      <p className="text-2xl font-extrabold leading-none">{value}</p>
      <p className="text-sm mt-1 font-medium opacity-75">{label}</p>
    </div>
  );
}
