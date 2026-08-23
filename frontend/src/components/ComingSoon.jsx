export default function ComingSoon({ label }) {
  return (
    <div className="px-8 py-16 flex flex-col items-center justify-center text-center">
      <div className="label-mono mb-3">Under construction</div>
      <h2 className="font-display text-xl text-text mb-2">{label} lands in a later phase</h2>
      <p className="text-sm text-muted max-w-sm">
        This screen is routed and reachable, but its real functionality is built
        in a later phase of the roadmap, once the corresponding backend and AI
        service work is in place.
      </p>
    </div>
  )
}
