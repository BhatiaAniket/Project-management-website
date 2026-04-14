import { useEffect, useRef } from "react";

const HeroSection = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = sectionRef.current?.querySelectorAll(".reveal");
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6"
      style={{ background: "var(--hero-gradient)" }}
    >
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />

      <div className="relative z-10 text-center max-w-6xl mx-auto">
        {/* Small tag */}
        <div
          className="reveal opacity-0 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card/50 backdrop-blur-sm mb-8 text-sm text-muted-foreground tracking-wider uppercase"
          style={{ animationDelay: "0.2s" }}
        >
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          Project Management Website
        </div>

        {/* Main headline */}
        <h1 className="reveal opacity-0 font-heading text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold leading-[0.9] tracking-tight text-foreground mb-6">
          <span className="block">Cognify</span>
          <span className="block text-stroke">Your Projects</span>
        </h1>

        {/* Subtitle */}
        <p
          className="reveal opacity-0 max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground leading-relaxed mb-12"
          style={{ animationDelay: "0.4s" }}
        >
          A centralized platform for multi-company project management, 
          real-time collaboration, and intelligent performance analysis.
        </p>

        {/* CTA buttons */}
        <div
          className="reveal opacity-0 flex flex-col sm:flex-row items-center justify-center gap-4"
          style={{ animationDelay: "0.6s" }}
        >
          <a
            href="#features"
            className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-foreground text-background font-medium text-base tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-2xl"
          >
            Explore Features
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
          </a>
          <a
            href="#about"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-border text-foreground font-medium text-base tracking-wide transition-all duration-300 hover:bg-secondary"
          >
            Learn More
          </a>
        </div>

        {/* Stats row */}
        <div
          className="reveal opacity-0 flex flex-wrap items-center justify-center gap-12 mt-20"
          style={{ animationDelay: "0.8s" }}
        >
          {[
            { value: "6+", label: "User Roles" },
            { value: "AI", label: "Powered Reports" },
            { value: "Real-time", label: "Collaboration" },
            { value: "Multi", label: "Company Support" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-heading text-3xl md:text-4xl font-bold text-foreground">{stat.value}</div>
              <div className="text-sm text-muted-foreground mt-1 tracking-wide uppercase">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .reveal.is-visible {
          animation: fade-up 0.8s ease-out forwards;
        }
      `}</style>
    </section>
  );
};

export default HeroSection;
