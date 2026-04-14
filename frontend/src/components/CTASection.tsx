import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

const CTASection = () => {
  const ref = useRef<HTMLElement>(null);

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

  return (
    <section id="contact" ref={ref} className="relative py-32 px-6">
      <div className="container mx-auto max-w-4xl text-center">
        <span className="reveal opacity-0 inline-block text-xs tracking-[0.3em] uppercase text-accent font-medium mb-4">
          ( Get Started )
        </span>
        <h2 className="reveal opacity-0 font-heading text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.05] mb-6">
          Ready to cognify
          <br />
          <span className="text-stroke">your workflow?</span>
        </h2>
        <p className="reveal opacity-0 text-lg text-muted-foreground max-w-xl mx-auto mb-10">
          Start your free trial today. No credit card required. 
          Experience AI-powered project management that scales with your team.
        </p>
        <div className="reveal opacity-0 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            to="/pricing"
            className="group inline-flex items-center gap-3 px-10 py-5 rounded-full bg-foreground text-background font-medium text-lg tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-2xl"
          >
            Start Free Trial
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
          <button className="inline-flex items-center gap-2 px-10 py-5 rounded-full border border-border text-foreground font-medium text-lg tracking-wide transition-all duration-300 hover:bg-secondary">
            Schedule Demo
          </button>
        </div>
      </div>

      <style>{`
        .reveal.is-visible { animation: fade-up 0.8s ease-out forwards; }
      `}</style>
    </section>
  );
};

export default CTASection;
