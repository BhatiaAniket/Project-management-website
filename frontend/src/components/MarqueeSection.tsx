const items = [
  "Real-time Task Tracking",
  "AI Performance Reports",
  "WebRTC Video Meetings",
  "Team Collaboration",
  "Razorpay Billing",
  "Role-Based Access",
  "Client Portal",
  "Document Sharing",
  "AI Meeting Summaries",
  "Multi-Company Architecture",
];

const MarqueeSection = () => {
  return (
    <div className="relative py-6 overflow-hidden border-y border-border/50 bg-background">
      {/* Top row - left to right */}
      <div className="flex whitespace-nowrap mb-3">
        <div className="marquee flex items-center gap-12 px-6">
          {[...items, ...items].map((item, i) => (
            <span
              key={`top-${i}`}
              className="text-xs font-heading font-medium tracking-[0.2em] uppercase text-muted-foreground/60 hover:text-foreground transition-colors duration-500"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
      {/* Bottom row - right to left */}
      <div className="flex whitespace-nowrap">
        <div className="marquee-reverse flex items-center gap-12 px-6">
          {[...items, ...items].map((item, i) => (
            <span
              key={`bottom-${i}`}
              className="text-xs font-heading font-medium tracking-[0.2em] uppercase text-muted-foreground/40 hover:text-foreground transition-colors duration-500"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarqueeSection;
