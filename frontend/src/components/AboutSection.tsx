import { useEffect, useRef } from "react";

const AboutSection = () => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.15 }
    );
    ref.current?.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="about" ref={ref} className="relative py-32 px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <span className="reveal opacity-0 inline-block text-xs tracking-[0.3em] uppercase text-accent font-medium mb-4">
              ( About )
            </span>
            <h2 className="reveal opacity-0 font-heading text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] text-foreground mb-6">
              The intelligent way to manage projects
            </h2>
          </div>

          {/* Right */}
          <div>
            <p className="reveal opacity-0 text-lg text-muted-foreground leading-relaxed mb-8">
              CognifyPM is a centralized AI-powered project management and collaboration 
              platform. Built for modern organizations that need to manage multiple projects, 
              teams, and client communications efficiently — all in one secure place.
            </p>
            <div className="reveal opacity-0 grid grid-cols-2 gap-6">
              {[
                { title: "Centralized", desc: "One platform for all project needs" },
                { title: "Intelligent", desc: "AI-driven insights and automation" },
                { title: "Secure", desc: "Multi-tenant data isolation" },
                { title: "Scalable", desc: "SaaS subscription model" },
              ].map((item) => (
                <div key={item.title} className="group">
                  <h3 className="font-heading font-semibold text-foreground mb-1 group-hover:text-accent transition-colors duration-300">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
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

export default AboutSection;
