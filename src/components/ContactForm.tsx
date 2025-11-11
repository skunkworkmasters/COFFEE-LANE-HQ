import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

interface ContactFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactForm({ isOpen, onClose }: ContactFormProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    businessName: "",
    numberOfLocations: "",
    currentPOS: "",
    preferredContact: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Add your form submission logic here (e.g., send to API, email service, etc.)
      console.log("Form submitted:", formData);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Thank you for your interest!",
        description: "We'll get back to you within 24 hours.",
      });

      // Reset form
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        businessName: "",
        numberOfLocations: "",
        currentPOS: "",
        preferredContact: "",
        message: "",
      });

      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Get Started with Nomad Bean Co.</DialogTitle>
          <DialogDescription>
            Fill out the form below and we'll get back to you within 24 hours to set up your free trial.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name <span className="text-red-500">*</span></Label>
              <Input
                id="businessName"
                type="text"
                placeholder="Your Coffee Shop"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numberOfLocations">Number of Locations</Label>
              <Select
                value={formData.numberOfLocations}
                onValueChange={(value) => setFormData({ ...formData, numberOfLocations: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Location</SelectItem>
                  <SelectItem value="2-5">2-5 Locations</SelectItem>
                  <SelectItem value="6-10">6-10 Locations</SelectItem>
                  <SelectItem value="11+">11+ Locations</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentPOS">Current POS System</Label>
              <Input
                id="currentPOS"
                type="text"
                placeholder="e.g., Square, Clover, None"
                value={formData.currentPOS}
                onChange={(e) => setFormData({ ...formData, currentPOS: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredContact">Preferred Contact Method</Label>
            <Select
              value={formData.preferredContact}
              onValueChange={(value) => setFormData({ ...formData, preferredContact: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="either">Either</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message / Additional Information</Label>
            <Textarea
              id="message"
              placeholder="Tell us about your business and what you're looking for..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Submitting..." : "Submit Request"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
