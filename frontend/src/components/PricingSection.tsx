import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Check, X, Star, Zap, Shield, Users, BarChart3, 
  ArrowRight, Crown, Sparkles, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const PricingSection = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const plans = [
    {
      name: 'Trial',
      description: 'Perfect for trying out CognifyPM',
      price: 0,
      annualPrice: 0,
      period: '60 days',
      features: [
        'Up to 5 users',
        'Up to 3 projects',
        'Basic task management',
        'Team collaboration',
        'Mobile app access',
        'Email support',
      ],
      limitations: [
        'No AI-powered insights',
        'No advanced reporting',
        'No integrations',
        'No custom branding',
      ],
      icon: Sparkles,
      color: 'from-gray-500 to-gray-600',
      popular: false,
      buttonText: 'Start Free Trial',
      buttonVariant: 'outline' as const,
    },
    {
      name: 'Starter',
      description: 'Great for small teams and startups',
      price: 200,
      annualPrice: 1500,
      period: 'month',
      features: [
        'Up to 25 users',
        'Up to 20 projects',
        'Advanced task management',
        'Real-time collaboration',
        'Time tracking',
        'Basic reporting & analytics',
        'Mobile & desktop apps',
        'Email & chat support',
        'GitHub integration',
        'File sharing (10GB)',
      ],
      limitations: [
        'Limited AI insights',
        'No custom workflows',
        'No API access',
      ],
      icon: TrendingUp,
      color: 'from-blue-500 to-cyan-500',
      popular: false,
      buttonText: 'Get Started',
      buttonVariant: 'default' as const,
    },
    {
      name: 'Professional',
      description: 'Complete solution for growing teams',
      price: 500,
      annualPrice: 4000,
      period: 'month',
      features: [
        'Up to 100 users',
        'Unlimited projects',
        'Advanced project management',
        'AI-powered insights & recommendations',
        'Advanced reporting & analytics',
        'Custom workflows & automations',
        'Time tracking & resource management',
        'Mobile, desktop & web apps',
        'Priority support (24/7)',
        'All integrations (GitHub, Slack, etc.)',
        'File sharing (100GB)',
        'API access & webhooks',
        'Custom branding',
        'Advanced security features',
        'Data export & backup',
      ],
      limitations: [],
      icon: Crown,
      color: 'from-purple-500 to-pink-500',
      popular: true,
      buttonText: 'Get Started',
      buttonVariant: 'default' as const,
    },
    {
      name: 'Enterprise',
      description: 'Tailored solutions for large organizations',
      price: 'Custom',
      annualPrice: 'Custom',
      period: 'month',
      features: [
        'Unlimited users & projects',
        'Everything in Professional',
        'Custom AI models & training',
        'Advanced security & compliance',
        'Dedicated account manager',
        'SLA guarantee (99.9%)',
        'On-premise deployment option',
        'Custom integrations development',
        'Unlimited file storage',
        'Advanced analytics & BI tools',
        'White-label solutions',
        'Multi-tenant architecture',
        'Advanced audit logs',
        'Custom training & onboarding',
      ],
      limitations: [],
      icon: Shield,
      color: 'from-amber-500 to-orange-500',
      popular: false,
      buttonText: 'Contact Sales',
      buttonVariant: 'outline' as const,
    },
  ];

  const getAnnualSavings = (monthlyPrice: number, annualPrice: number) => {
    if (typeof monthlyPrice === 'string' || typeof annualPrice === 'string') return null;
    const monthlyTotal = monthlyPrice * 12;
    const savings = monthlyTotal - annualPrice;
    return Math.round((savings / monthlyTotal) * 100);
  };

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-sm font-semibold rounded-full mb-4">
            <Zap className="w-4 h-4" />
            Flexible Pricing Plans
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold font-heading mb-6">
            Choose Your Perfect Plan
          </h2>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Start with our free trial and upgrade as you grow. No hidden fees, no credit card required.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${billingCycle === 'annual' ? 'text-foreground' : 'text-muted-foreground'}`}>
              Annual
            </span>
            <span className="text-xs text-green-500 font-medium">
              Save 20%
            </span>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`relative ${
                plan.popular
                  ? 'scale-105'
                  : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs font-semibold rounded-full">
                    <Star className="w-3 h-3 fill-current" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className={`relative h-full bg-card border rounded-2xl p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                plan.popular
                  ? 'border-primary shadow-lg'
                  : 'border-border'
              }`}>
                {/* Plan Icon */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${plan.color} flex items-center justify-center mb-6`}>
                  <plan.icon className="w-6 h-6 text-white" />
                </div>

                {/* Plan Name */}
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      {typeof plan.price === 'string' ? plan.price : `¥${plan.price}`}
                    </span>
                    {typeof plan.price === 'number' && (
                      <span className="text-muted-foreground">/{plan.period}</span>
                    )}
                  </div>
                  
                  {billingCycle === 'annual' && typeof plan.price === 'number' && typeof plan.annualPrice === 'number' && (
                    <div className="mt-2">
                      <div className="text-sm text-muted-foreground line-through">
                        ¥{plan.price * 12}/{plan.period}
                      </div>
                      <div className="text-sm text-green-500 font-medium">
                        ¥{plan.annualPrice}/year (Save {getAnnualSavings(plan.price, plan.annualPrice)}%)
                      </div>
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start gap-3">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                  
                  {plan.limitations.map((limitation, limitIndex) => (
                    <div key={limitIndex} className="flex items-start gap-3 opacity-60">
                      <X className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{limitation}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Button
                  variant={plan.buttonVariant}
                  className={`w-full ${
                    plan.popular
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : ''
                  }`}
                  size="lg"
                >
                  {plan.buttonText}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <div className="bg-card border border-border rounded-2xl p-8 max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">30-Day Money-Back Guarantee</h3>
            <p className="text-muted-foreground mb-6">
              Try CognifyPM risk-free. If you're not completely satisfied within the first 30 days, 
              we'll give you a full refund. No questions asked.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium">Secure Payment</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium">24/7 Support</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium">Cancel Anytime</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-20"
        >
          <h3 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-card border border-border rounded-xl p-6">
              <h4 className="font-semibold mb-2">Can I change my plan later?</h4>
              <p className="text-sm text-muted-foreground">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <h4 className="font-semibold mb-2">What happens after the trial?</h4>
              <p className="text-sm text-muted-foreground">
                After your 60-day trial, you can choose to subscribe to a paid plan or continue with limited features.
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <h4 className="font-semibold mb-2">Do you offer discounts for nonprofits?</h4>
              <p className="text-sm text-muted-foreground">
                Yes! We offer 50% discounts for qualified nonprofit organizations and educational institutions.
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6">
              <h4 className="font-semibold mb-2">Is my data secure?</h4>
              <p className="text-sm text-muted-foreground">
                Absolutely. We use industry-standard encryption and comply with GDPR, CCPA, and other privacy regulations.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
