import { Avatar } from '@/components/ui/avatar';

// Social proof avatars — seeded with fixed IDs for consistent colours
const SOCIAL_PROOF_USERS = [
  { id: 'sp-1', name: 'Alex Rivera' },
  { id: 'sp-2', name: 'Jordan Kim' },
  { id: 'sp-3', name: 'Sam Patel' },
] as const;

export function AuthBrandPanel() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-linear-to-br from-blue-900 via-[#2563eb] to-[#7c3aed] p-12 text-white lg:flex lg:w-[45%] xl:w-1/2">
      {/* Decorative blobs */}
      <div
        className="absolute -left-20 -top-20 size-80 rounded-full bg-white/5 blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-32 -right-16 size-96 rounded-full bg-white/5 blur-[100px]"
        aria-hidden="true"
      />

      {/* TF logo + name */}
      <div className="relative z-10 flex items-center gap-3">
        <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-radius-xl bg-white">
          <span className="text-lg font-bold text-brand-primary">TF</span>
        </div>
        <span className="text-2xl font-bold tracking-tight">TaskForge</span>
      </div>

      {/* Hero text — sits in the vertical middle via justify-between */}
      <div className="relative z-10 max-w-160">
        <h1 className="text-5xl font-extrabold leading-tight tracking-tight">
          The architect of your <span className="text-blue-200">digital workflow.</span>
        </h1>
        <p className="mt-4 text-lg font-medium leading-relaxed text-blue-100/90">
          A workspace designed for precision. Plan, track, and deliver — together, with your entire
          team in one connected place.
        </p>
      </div>

      {/* Social proof */}
      <div className="relative z-10 flex items-center gap-4">
        <div className="flex -space-x-2">
          {SOCIAL_PROOF_USERS.map((u) => (
            <Avatar
              key={u.id}
              name={u.name}
              userId={u.id}
              size="md"
              className="ring-2 ring-white/30"
            />
          ))}
        </div>
        <p className="text-sm text-white/80">
          <span className="font-semibold text-white">Built for teams like yours</span> — from
          freelancers to growing organizations.
        </p>
      </div>
    </div>
  );
}
