import React from "react";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { Rating } from "@mui/material";

interface Testimonial {
  name: string;
  role: string;
  content: string;
  avatarLetter: string;
}

const testimonials: Testimonial[] = [
  {
    name: "Alex Rivera",
    role: "Freelancer",
    avatarLetter: "A",
    content: "I finally stopped overplanning. I just open Orbit and follow my daily task list."
  },
  {
    name: "Sarah Chen",
    role: "Student",
    avatarLetter: "S",
    content: "The interface is simple, and I always know what to do next. It helped me build a study routine."
  },
  {
    name: "Marcus Thorne",
    role: "Product Manager",
    avatarLetter: "M",
    content: "I use it for work and personal goals. Setup was easy and the progress view is very clear."
  }
];

const TestimonialsSection: React.FC = () => {
  return (
    <section id="stories" className="relative z-10 py-16 sm:py-20 px-4 md:px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          viewport={{ once: true }}
          className="text-center mb-10 space-y-4"
        >
          <h4 className="text-primary text-sm font-semibold">User feedback</h4>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground tracking-tight">
            People find it easy to start and stick with
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ y: 16, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.35, delay: index * 0.08 }}
              viewport={{ once: true }}
              className="group relative rounded-2xl border border-border/90 bg-card/92 p-5"
            >
              <div className="absolute top-4 right-4 text-primary/30">
                <Quote size={26} strokeWidth={2.2} />
              </div>

              <div className="relative space-y-4">
                <Rating value={5} readOnly size="small" />

                <p className="text-sm sm:text-base text-foreground/85 leading-relaxed">
                  "{testimonial.content}"
                </p>

                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-semibold">
                    {testimonial.avatarLetter}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground leading-none">{testimonial.name}</h4>
                    <p className="text-xs text-foreground/70 mt-1">{testimonial.role}</p>
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
