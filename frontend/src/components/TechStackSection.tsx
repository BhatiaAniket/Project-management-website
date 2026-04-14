import { useEffect, useRef } from "react";

const stack = [
  { name: "React.js", category: "Frontend" },
  { name: "Node.js", category: "Backend" },
  { name: "Express.js", category: "Backend" },
  { name: "MongoDB", category: "Database" },
  { name: "WebRTC", category: "Real-time" },
  { name: "Socket.IO", category: "Real-time" },
  { name: "Razorpay", category: "Payments" },
  { name: "OpenAI API", category: "AI" },
  { name: "JWT", category: "Security" },
  { name: "Cloudinary", category: "Storage" },
];

const TechStackSection = () => {
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
    <section ref={ref} className="relative py-32 px-6 bg-card/30">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="reveal opacity-0 inline-block text-xs tracking-[0.3em] uppercase text-accent font-medium mb-4">
              ( Technology )
            </span>
            <h2 className="reveal opacity-0 font-heading text-4xl md:text-5xl font-bold text-foreground leading-tight mb-6">
              Built with the
              <br />
              <span className="text-stroke">MERN Stack</span>
            </h2>
            <p className="reveal opacity-0 text-muted-foreground leading-relaxed">
              Powered by modern technologies for performance, scalability, and security. 
              Every component is carefully chosen to deliver an exceptional experience.
            </p>
          </div>

          <div className="reveal opacity-0 flex flex-wrap gap-3">
            {stack.map((tech, i) => (
              <div
                key={tech.name}
                className="group px-5 py-3 rounded-full border border-border bg-background hover:bg-foreground hover:text-background transition-all duration-300 cursor-default"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <span className="text-sm font-medium">{tech.name}</span>
                <span className="ml-2 text-xs text-muted-foreground group-hover:text-background/60 transition-colors duration-300">
                  {tech.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .reveal.is-visible { animation: fade-up 0.8s ease-out forwards; }
      `}</style>
    </section>
  );
};

export default TechStackSection;
