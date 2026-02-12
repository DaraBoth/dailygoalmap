import React from "react";
import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

interface Testimonial {
  name: string;
  role: string;
  content: string;
  avatarLetter: string;
}

const testimonials: Testimonial[] = [
  {
    name: "Alex Rivera",
    role: "Founding Engineer",
    avatarLetter: "A",
    content: "Orbit transformed my chaotic product roadmap into a precise orbital trajectory. The AI breakdown is disturbingly accurate."
  },
  {
    name: "Sarah Chen",
    role: "Performance Athlete",
    avatarLetter: "S",
    content: "Minimalist, fast, and intelligent. It's the first goal tracker that actually understands how I think and act."
  },
  {
    name: "Marcus Thorne",
    role: "Strategic Consultant",
    avatarLetter: "M",
    content: "The zero-friction interface and mission-critical notifications keep me in a flow state I didn't think was possible."
  }
];

const TestimonialsSection: React.FC = () => {
  return (
    <section id="intelligence" className="relative z-10 py-32 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-24 space-y-4"
        >
          <h4 className="text-primary font-black uppercase tracking-[0.3em] text-sm">Command Chronicles</h4>
          <h2 className="text-5xl lg:text-7xl font-black text-foreground tracking-tight">
            Trusted by <span className="text-primary italic">High Performers</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ y: 30, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group relative bg-white/40 dark:bg-white/5 backdrop-blur-2xl rounded-[2.5rem] p-10 border border-white/20 dark:border-white/10 shadow-2xl hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-500"
            >
              <div className="absolute top-8 right-8 text-primary/10 group-hover:text-primary/20 transition-colors">
                <Quote size={64} strokeWidth={3} />
              </div>

              <div className="relative space-y-8">
                <div className="flex gap-1 text-yellow-500">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={14} fill="currentColor" stroke="none" />
                  ))}
                </div>

                <p className="text-lg font-medium text-foreground/80 leading-relaxed italic">
                  "{testimonial.content}"
                </p>

                <div className="flex items-center gap-4 pt-6 border-t border-white/10">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center font-black text-white text-xl shadow-lg">
                    {testimonial.avatarLetter}
                  </div>
                  <div>
                    <h4 className="font-black text-foreground leading-none">{testimonial.name}</h4>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
