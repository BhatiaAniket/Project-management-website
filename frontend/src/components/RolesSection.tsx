import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Building, UserCog, Users, Briefcase, Eye } from "lucide-react";

const roles = [
  {
    icon: ShieldCheck,
    title: "Super Admin",
    subtitle: "Platform Owner",
    responsibilities: [
      "Manage all companies on the platform",
      "View subscriptions, payments & revenue",
      "Suspend or activate companies",
      "Monitor platform-wide analytics",
    ],
  },
  {
    icon: Building,
    title: "Company Admin",
    subtitle: "Company Owner",
    responsibilities: [
      "Create and manage departments",
      "Add managers and employees",
      "Manage company projects & subscription",
      "View comprehensive company reports",
    ],
  },
  {
    icon: UserCog,
    title: "Manager",
    subtitle: "Project Leader",
    responsibilities: [
      "Create and assign tasks to employees",
      "Monitor real-time task progress",
      "Conduct meetings with AI summaries",
      "Generate AI performance reports",
    ],
  },
  {
    icon: Users,
    title: "Employee",
    subtitle: "Team Member",
    responsibilities: [
      "View and update assigned tasks",
      "Collaborate through chat & meetings",
      "Share files and documents",
      "View personal performance analytics",
    ],
  },
  {
    icon: Briefcase,
    title: "HR Manager",
    subtitle: "Human Resources",
    responsibilities: [
      "Manage employee records",
      "Track attendance and leaves",
      "View department performance",
      "Generate HR analytics reports",
    ],
  },
  {
    icon: Eye,
    title: "Client",
    subtitle: "External Stakeholder",
    responsibilities: [
      "View assigned project progress",
      "Communicate with project manager",
      "Access project documents securely",
      "No access to internal company data",
    ],
  },
];

const RolesSection = () => {
  const ref = useRef<HTMLElement>(null);
  const [activeRole, setActiveRole] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.1 }
    );
    ref.current?.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const active = roles[activeRole];

  return (
    <section id="roles" ref={ref} className="relative py-32 px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <span className="reveal opacity-0 inline-block text-xs tracking-[0.3em] uppercase text-accent font-medium mb-4">
            ( User Roles )
          </span>
          <h2 className="reveal opacity-0 font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
            Built for every role
          </h2>
        </div>

        <div className="reveal opacity-0 grid md:grid-cols-[1fr_1.5fr] gap-8">
          {/* Role selector */}
          <div className="flex flex-col gap-2">
            {roles.map((role, i) => (
              <button
                key={role.title}
                onClick={() => setActiveRole(i)}
                className={`flex items-center gap-4 px-5 py-4 rounded-xl text-left transition-all duration-300 ${
                  activeRole === i
                    ? "bg-foreground text-background shadow-lg"
                    : "hover:bg-secondary text-foreground"
                }`}
              >
                <role.icon className="w-5 h-5 flex-shrink-0" />
                <div>
                  <div className="font-heading font-semibold text-sm">{role.title}</div>
                  <div className={`text-xs ${activeRole === i ? "text-background/70" : "text-muted-foreground"}`}>
                    {role.subtitle}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Role detail */}
          <div className="rounded-2xl border border-border bg-card p-8 md:p-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center">
                <active.icon className="w-7 h-7 text-accent" />
              </div>
              <div>
                <h3 className="font-heading text-2xl font-bold text-foreground">{active.title}</h3>
                <p className="text-sm text-muted-foreground">{active.subtitle}</p>
              </div>
            </div>
            <div className="space-y-4">
              {active.responsibilities.map((r, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 opacity-0"
                  style={{ animation: `fade-up 0.5s ease-out ${i * 0.1}s forwards` }}
                >
                  <span className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  </span>
                  <p className="text-foreground">{r}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .reveal.is-visible { animation: fade-up 0.8s ease-out forwards; }
      `}</style>
    </section>
  );
};

export default RolesSection;
