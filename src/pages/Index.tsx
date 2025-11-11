import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Coffee, ShoppingCart, BarChart3, Users, Cloud, Zap, TrendingUp } from "lucide-react";
import ContactForm from "@/components/ContactForm";

export default function Index() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      // If user is logged in but has no role, send to pending approval
      if (!userRole) {
        navigate("/pending-approval");
        return;
      }

      // Redirect authenticated users with roles to their respective pages
      switch (userRole) {
        case "admin":
          navigate("/admin");
          break;
        case "tenant":
          navigate("/tenant");
          break;
        default:
          // For any other role (including staff), redirect to POS
          navigate("/pos");
          break;
      }
    }
  }, [user, userRole, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Coffee className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <img src="/logo(800 x 200 px) (800 x 100 px).png" alt="Nomad Bean Co." className="h-12 w-auto" />
          <Button onClick={() => navigate("/auth")} size="lg">
            Sign In
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Empowering coffee shops and restaurants with effortless digital control
              </h1>
              <p className="text-xl text-muted-foreground">
                Whether you're a multi-location operator or a single café owner, Nomad Bean Co. gives you the tools to thrive—without the complexity.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={() => setIsContactFormOpen(true)} size="lg" className="text-lg px-8 py-6">
                  Get Started Free
                </Button>
              </div>
            </div>
            <div className="relative">
              <img
                src="/pexels-barcelona-albertus-986500-1924951.jpg"
                alt="Professional barista creating latte art"
                className="rounded-lg shadow-2xl w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-muted/30 to-secondary/10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <img
                src="/Gemini_Generated_Image_giw1zngiw1zngiw1.png"
                alt="Where Craft Meets Technology"
                className="rounded-lg shadow-xl w-full h-auto"
              />
            </div>
            <div className="space-y-6 order-1 md:order-2">
              <h2 className="text-3xl md:text-4xl font-bold">Where Craft Meets Technology</h2>
              <p className="text-lg text-muted-foreground">
                For years, coffee shops and small restaurants have struggled with clunky, expensive, and overly complicated point-of-sale systems. We built Nomad Bean Co. to change that.
              </p>
              <p className="text-lg text-muted-foreground">
                Our platform is designed specifically for independent operators and multi-location businesses who want control, simplicity, and scalability—all in one place.
              </p>
              <p className="text-lg text-muted-foreground">
                No bloated features. No confusing dashboards. Just powerful tools that work the way you do.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Two-Tier Model Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">One Platform. Two Powerful Views.</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Every user gets exactly what they need—nothing more, nothing less.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-card border rounded-lg p-8 space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">Partner View</h3>
              <p className="text-muted-foreground">
                <strong>For Business Owners & Managers:</strong> Manage your menu, view real-time sales reports, add team members, and stay in control—from anywhere.
              </p>
            </div>

            <div className="bg-card border rounded-lg p-8 space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold">POS Front-End</h3>
              <p className="text-muted-foreground">
                <strong>For Baristas & Staff:</strong> A lightning-fast, intuitive interface for taking orders, processing payments, and keeping the line moving.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-muted/30 to-secondary/10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need. Nothing You Don't.</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <img
                src="/Gemini_Generated_Image_3ofdyr3ofdyr3ofd.png"
                alt="Payment processing and cloud sync dashboard"
                className="w-full h-64 object-cover"
              />
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Cloud className="w-8 h-8 text-primary" />
                  <h3 className="text-2xl font-bold">Cloud-Based & Always Accessible</h3>
                </div>
                <p className="text-muted-foreground">
                  Access your dashboard from any device. Your data is always synced, secure, and ready when you are.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <img
                src="/Gemini_Generated_Image_u32d9xu32d9xu32d.png"
                alt="Real-time analytics dashboard"
                className="w-full h-64 object-cover"
              />
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-8 h-8 text-primary" />
                  <h3 className="text-2xl font-bold">Real-Time Insights</h3>
                </div>
                <p className="text-muted-foreground">
                  See what's selling, track revenue trends, and make data-driven decisions on the fly.
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-6 space-y-3">
              <Zap className="w-10 h-10 text-primary" />
              <h4 className="text-xl font-bold">Lightning-Fast POS</h4>
              <p className="text-muted-foreground">Built for speed during peak hours</p>
            </div>

            <div className="bg-white rounded-lg p-6 space-y-3">
              <Coffee className="w-10 h-10 text-primary" />
              <h4 className="text-xl font-bold">Custom Menu Builder</h4>
              <p className="text-muted-foreground">Easily add, edit, and organize items</p>
            </div>

            <div className="bg-white rounded-lg p-6 space-y-3">
              <Users className="w-10 h-10 text-primary" />
              <h4 className="text-xl font-bold">Multi-User Management</h4>
              <p className="text-muted-foreground">Staff accounts with role-based access</p>
            </div>

            <div className="bg-white rounded-lg p-6 space-y-3">
              <TrendingUp className="w-10 h-10 text-primary" />
              <h4 className="text-xl font-bold">Scalable Architecture</h4>
              <p className="text-muted-foreground">Grows with your business</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Nomad Bean Co. Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Coffee Shops Choose Nomad Bean Co.</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-2xl font-bold">It Just Works</h3>
                <p className="text-muted-foreground">
                  No IT degree required. Our system is intuitive from day one—so you can focus on your customers, not troubleshooting software.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-2xl font-bold">Built for Multi-Location Businesses</h3>
                <p className="text-muted-foreground">
                  Manage multiple locations with ease. View performance across all stores, or drill down into individual café metrics.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-2xl font-bold">Affordable & Transparent Pricing</h3>
                <p className="text-muted-foreground">
                  No hidden fees. No surprise charges. Just straightforward pricing that scales with your business.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-2xl font-bold">Made for Independent Operators</h3>
                <p className="text-muted-foreground">
                  You're not a franchise—so why settle for one-size-fits-all software? Our platform adapts to your unique needs.
                </p>
              </div>
            </div>

            <div className="flex items-center">
              <div className="relative">
                <img
                  src="/Gemini_Generated_Image_u32d9xu32d9xu32d.png"
                  alt="Business analytics and insights"
                  className="rounded-lg shadow-xl w-full h-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-primary/5 to-secondary/10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div className="order-2 md:order-1">
              <img
                src="/Gemini_Generated_Image_dz3p38dz3p38dz3p.png"
                alt="Turn every transaction into a connection"
                className="rounded-lg shadow-2xl w-full h-auto"
              />
            </div>
            <div className="space-y-6 order-1 md:order-2">
              <h2 className="text-3xl md:text-4xl font-bold">Ready to Take Control?</h2>
              <p className="text-xl text-muted-foreground">
                Join the coffee shops and restaurants who are running smarter, not harder.
              </p>
              <div className="space-y-4">
                <Button onClick={() => setIsContactFormOpen(true)} size="lg" className="w-full sm:w-auto text-lg px-8 py-6">
                  Start Your Free Trial
                </Button>
                <p className="text-sm text-muted-foreground">
                  No credit card required. Set up in minutes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <img src="/logo(800 x 200 px) (800 x 100 px).png" alt="Nomad Bean Co." className="h-12 w-auto brightness-0 invert" />
              <p className="text-slate-400">
                Empowering coffee shops with effortless digital control.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-lg">Product</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">Demo</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-lg">Company</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
                <li><a href="#" className="hover:text-white transition">Support</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-lg">Connect</h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition">Twitter</a></li>
                <li><a href="#" className="hover:text-white transition">LinkedIn</a></li>
                <li><a href="#" className="hover:text-white transition">Instagram</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 text-center text-slate-400">
            <p>&copy; 2025 Nomad Bean Co. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Contact Form Modal */}
      <ContactForm isOpen={isContactFormOpen} onClose={() => setIsContactFormOpen(false)} />
    </div>
  );
}
