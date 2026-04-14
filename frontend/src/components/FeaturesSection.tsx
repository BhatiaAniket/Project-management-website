import { useEffect, useRef } from "react";
import {
  Activity,
  Brain,
  Video,
  MessageSquare,
  CreditCard,
  Shield,
  Users,
  FileText,
  Eye,
  Building2,
} from "lucide-react";

const features = [
  {
    icon: Activity,
    title: "Real-time Task Tracking",
    desc: "Monitor task progress, deadlines, and employee performance in real time with live dashboards.",
  },
  {
    icon: Brain,
    title: "AI Performance Reports",
    desc: "Automated AI-generated insights, productivity analysis, and actionable recommendations.",
  },
  {
    icon: Video,
    title: "WebRTC Video Meetings",
    desc: "Built-in video conferencing with AI meeting summaries and action item extraction.",
  },
  {
    icon: MessageSquare,
    title: "Team Collaboration & Chat",
    desc: "Integrated messaging, file sharing, and real-time collaboration across teams.",
  },
  {
    icon: CreditCard,
    title: "Razorpay Subscription & Billing",
    desc: "Flexible SaaS subscription model with free trial and automated billing.",
  },
  {
    icon: Shield,
    title: "Role-Based Access Control",
    desc: "Secure permissions for Super Admin, Company Admin, Managers, Employees, and Clients.",
  },
  {
    icon: Users,
    title: "Multi-Company Architecture",
    desc: "Secure multi-tenant platform with complete data isolation between companies.",
  },
  {
    icon: FileText,
    title: "Document & File Sharing",
    desc: "Centralized document management with version control and secure access.",
  },
  {
    icon: Eye,
    title: "Client Progress Visibility",
    desc: "Give clients transparent project updates without exposing internal data.",
  },
  {
    icon: Building2,
    title: "Department Management",
    desc: "Organize teams by department with hierarchical project structures.",
  },
];

const FeaturesSection = () => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.05 }
    );
    ref.current?.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" ref={ref} className="relative py-32 px-6 bg-card/30">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-20">
          <span className="reveal opacity-0 inline-block text-xs tracking-[0.3em] uppercase text-accent font-medium mb-4">
            ( Features )
          </span>
          <h2 className="reveal opacity-0 font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
            Everything you need,
            <br />
            <span className="text-stroke">nothing you don't</span>
          </h2>
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="reveal opacity-0 feature-card group"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-5 group-hover:bg-accent/20 transition-colors duration-300">
                <feature.icon className="w-6 h-6 text-foreground group-hover:text-accent transition-colors duration-300" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .reveal.is-visible { animation: fade-up 0.8s ease-out forwards; }
      `}</style>
    </section>
  );
};

export default FeaturesSection;
