const Footer = () => {
  return (
    <footer className="border-t border-border py-16 px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-4 gap-10 mb-16">
          {/* Brand */}
          <div className="md:col-span-1">
            <span className="font-heading text-2xl font-bold text-foreground">CognifyPM</span>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              AI-powered multi-company project management and collaboration platform.
            </p>
          </div>

          {/* Links */}
          {[
            {
              title: "Platform",
              links: ["Features", "Pricing", "Security", "Integrations"],
            },
            {
              title: "Company",
              links: ["About", "Blog", "Careers", "Contact"],
            },
            {
              title: "Resources",
              links: ["Documentation", "API Reference", "Support", "Status"],
            },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="font-heading font-semibold text-foreground text-sm tracking-wider uppercase mb-4">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground">
            © 2026 CognifyPM. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {["Privacy", "Terms", "Cookies"].map((item) => (
              <a
                key={item}
                href="#"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-300"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
