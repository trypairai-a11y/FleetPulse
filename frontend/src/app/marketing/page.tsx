import Link from "next/link";

export const metadata = {
  title: "Darb — Fleet Operating System for Kuwait",
  description: "Real-time courier monitoring, automated violations and AI-driven dispatch across Keeta, Talabat, Deliveroo and Americana.",
};

export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-sand-100 text-sand-900 font-sans">
      {/* ============ NAV ============ */}
      <header className="sticky top-0 z-50 backdrop-blur bg-sand-100/80 border-b border-sand-200/60">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <Link href="/marketing" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-forest-800 text-white flex items-center justify-center font-display text-lg">
              D
            </div>
            <span className="font-medium tracking-tight">Darb</span>
          </Link>
          <nav className="hidden md:flex items-center">
            {["Product", "Platforms", "Customers", "Company"].map((item) => (
              <a
                key={item}
                href="#"
                className="px-4 h-9 inline-flex items-center text-sm text-sand-800/80 hover:text-sand-900 rounded-pill hover:bg-sand-200/70 transition-colors duration-250"
              >
                {item}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:inline-flex h-9 px-4 items-center text-sm text-sand-800 hover:text-sand-900 rounded-pill hover:bg-sand-200/70 transition-colors">
              Sign in
            </Link>
            <Link href="/login" className="btn-primary h-9">Book a demo</Link>
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-forest-gradient" />
        <div className="absolute -top-40 right-0 w-[680px] h-[680px] rounded-full bg-moss/25 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[520px] h-[520px] rounded-full bg-forest-600/30 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-24 pb-32 lg:pt-32 lg:pb-40">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 animate-fade-up">
              <div className="inline-flex items-center gap-2 h-7 px-3 rounded-pill bg-white/10 border border-white/15 text-white/80 text-xs mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Live across 4 platforms · 24/7
              </div>
              <h1 className="font-display text-white text-[44px] sm:text-[58px] lg:text-display-xl leading-[1.05] tracking-[-0.02em] mb-6">
                Better delivery<br/>operations.<br/>
                <span className="italic text-white/90">Built on Darb.</span>
              </h1>
              <p className="text-white/80 text-lg max-w-xl leading-relaxed mb-8">
                One command center for couriers, violations, cash, and performance across every delivery platform in Kuwait.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/login" className="btn-primary">Enter demo</Link>
                <a href="#platforms" className="btn-ghost">See platforms →</a>
              </div>
            </div>

            {/* Right column: agent preview card */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-white/10 backdrop-blur-lg border border-white/15 p-5 shadow-float animate-fade-up">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white">AI</div>
                  <span className="text-white/85 text-sm font-medium">Darb Agent</span>
                  <span className="ml-auto text-[10px] text-white/50 uppercase tracking-widest">live</span>
                </div>
                <div className="space-y-3">
                  <div className="text-xs text-white/60">Today · 09:14</div>
                  <div className="rounded-xl bg-white/10 border border-white/10 p-3 text-sm text-white/90">
                    3 Keeta couriers haven't uploaded GPS in 15+ min. Want me to page dispatch?
                  </div>
                  <div className="flex gap-2">
                    <button className="h-8 px-3 text-xs rounded-pill bg-primary text-white font-medium">Page dispatch</button>
                    <button className="h-8 px-3 text-xs rounded-pill bg-white/10 text-white/80 border border-white/10">Mute 10m</button>
                  </div>
                  <div className="rounded-xl bg-forest-900/50 border border-white/5 p-3 text-xs text-white/70 font-mono">
                    <span className="text-primary">→</span> 2 late pickups auto-logged · penalty drafts ready
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Curved bottom */}
        <div className="absolute bottom-0 inset-x-0 h-16 bg-sand-100 rounded-t-[64px]" />
      </section>

      {/* ============ STATS STRIP ============ */}
      <section className="bg-sand-100 py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-[0.2em] text-sand-600">By the numbers</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { n: "2.4M", label: "Orders tracked" },
              { n: "1,200+", label: "Active couriers" },
              { n: "4", label: "Delivery platforms" },
              { n: "99.97%", label: "Uptime" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-5xl lg:text-6xl text-sand-900 mb-2">{s.n}</div>
                <div className="text-sm text-sand-700">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PLATFORM PANELS ============ */}
      <section id="platforms" className="py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="max-w-2xl mb-14">
            <p className="text-xs uppercase tracking-[0.2em] text-sand-600 mb-3">Platforms we speak fluently</p>
            <h2 className="font-display text-display-md lg:text-display-lg text-sand-900 leading-tight">
              One console.<br/>Every delivery partner.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: "Keeta", tint: "bg-forest-700", fg: "text-white", sub: "KW ops flagship", meta: "Operation Centre · Violations · Shifts" },
              { name: "Talabat", tint: "bg-[#27455C]", fg: "text-white", sub: "Restaurants & grocery", meta: "Cash · Penalties · Attendance" },
              { name: "Deliveroo", tint: "bg-[#C57B59]", fg: "text-white", sub: "Premium delivery", meta: "KPIs · Incentives · Performance" },
              { name: "Americana", tint: "bg-sand-900", fg: "text-white", sub: "Branch-based KPIs", meta: "Order-tiered scoring" },
            ].map((p) => (
              <div key={p.name} className={`${p.tint} ${p.fg} rounded-2xl p-6 aspect-[3/4] flex flex-col justify-between transition-transform duration-400 ease-sierra-out hover:-translate-y-1`}>
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-white/60 mb-2">{p.sub}</div>
                  <h3 className="font-display text-3xl mb-3">{p.name}</h3>
                </div>
                <div className="text-sm text-white/80 leading-relaxed">{p.meta}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURE LIST ============ */}
      <section className="py-20 bg-sand-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5">
              <p className="text-xs uppercase tracking-[0.2em] text-sand-600 mb-3">The stack</p>
              <h2 className="font-display text-display-md lg:text-display-lg text-sand-900 leading-tight mb-6">
                Run your whole fleet from one window.
              </h2>
              <p className="text-sand-700 leading-relaxed mb-6">
                Darb combines courier monitoring, violation detection, cash reconciliation and AI-driven ops into a single, opinionated workspace.
              </p>
              <Link href="/login" className="btn-primary">Open dashboard</Link>
            </div>

            <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
              {[
                { t: "Real-time monitor", d: "Live courier status, GPS drops, order rejections, area shifts." },
                { t: "Violation engine", d: "Late pickups, drop-off distance checks, photo validation — all automatic." },
                { t: "Cash & penalties", d: "Daily reconciliation, appeal workflow, tier-based fines." },
                { t: "AI Chief of Staff", d: "Anomaly alerts, digests, auto-drafted actions for dispatch." },
              ].map((f) => (
                <div key={f.t} className="rounded-2xl bg-white border border-sand-200 p-6 shadow-soft hover:shadow-lift transition-shadow duration-400">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <span className="text-sm font-semibold">✓</span>
                  </div>
                  <h4 className="font-medium text-sand-900 mb-1.5">{f.t}</h4>
                  <p className="text-sm text-sand-700 leading-relaxed">{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ TRUST STRIP ============ */}
      <section className="py-16 border-y border-sand-200 bg-sand-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-sand-600 mb-6">Trusted by operators across Kuwait</p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 opacity-70">
            {["Sidra Ops", "Hawally Fleet", "Avenues Logistics", "Salmiya Dispatch", "KTech Labs"].map((n) => (
              <span key={n} className="font-display text-xl text-sand-800">{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="py-24 bg-forest-800 text-white relative overflow-hidden">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-primary/20 blur-3xl" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-display text-display-lg lg:text-display-xl leading-tight mb-6">
            Ready to run your fleet<br/><span className="italic text-white/90">on Darb?</span>
          </h2>
          <p className="text-white/75 text-lg max-w-xl mx-auto mb-8">
            Start with a demo workspace pre-loaded with Keeta Kuwait City data.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/login" className="btn-primary">Enter demo</Link>
            <a href="mailto:hello@darb.kw" className="btn-ghost">Talk to sales</a>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="bg-sand-100 border-t border-sand-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-7 w-7 rounded-md bg-forest-800 text-white flex items-center justify-center font-display text-sm">D</div>
                <span className="font-medium">Darb</span>
              </div>
              <p className="text-sm text-sand-700 leading-relaxed">
                Fleet operating system for Kuwait delivery ops.
              </p>
            </div>
            {[
              { title: "Product", items: ["Monitor", "Violations", "Cash", "Agents"] },
              { title: "Platforms", items: ["Keeta", "Talabat", "Deliveroo", "Americana"] },
              { title: "Company", items: ["About", "Careers", "Privacy", "Terms"] },
            ].map((c) => (
              <div key={c.title}>
                <div className="text-xs uppercase tracking-widest text-sand-600 mb-3">{c.title}</div>
                <ul className="space-y-2">
                  {c.items.map((i) => (
                    <li key={i}><a href="#" className="text-sm text-sand-800 hover:text-sand-900">{i}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-sand-600 pt-6 border-t border-sand-200">
            <span>© {new Date().getFullYear()} Darb by Pair · Kuwait</span>
            <span className="font-mono">v2.0</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
