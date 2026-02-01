import React, { useEffect, useRef } from 'react';
import { Button } from './ui/button';

const CTASection = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const particles = [];
    const particleCount = 80;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedY: -Math.random() * 0.5 - 0.1,
        opacity: Math.random() * 0.5 + 0.2,
        color: Math.random() > 0.5 ? '#ff6b35' : '#ffffff'
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(particle => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.opacity;
        ctx.fill();

        particle.y += particle.speedY;

        if (particle.y < 0) {
          particle.y = canvas.height;
          particle.x = Math.random() * canvas.width;
        }
      });

      ctx.globalAlpha = 1;
      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <section className="relative bg-[#0f0f10] py-24 overflow-hidden">
      {/* Particle Canvas */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center px-6">
        <h2 className="text-white text-4xl md:text-5xl font-bold mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
          Ready to Start
        </h2>
        <h2 className="text-[#e34c26] text-4xl md:text-5xl font-bold italic mb-6" style={{ fontFamily: 'Georgia, serif' }}>
          Tracking?
        </h2>

        <p className="text-gray-400 text-base md:text-lg mb-8 max-w-lg mx-auto">
          Join the community of rail enthusiasts who log their sightings with precision.
        </p>

        <a href="/auth?signup=true">
          <Button 
            className="bg-[#e34c26] hover:bg-[#d14020] text-white font-semibold text-sm uppercase tracking-wider px-8 py-6 rounded"
          >
            Create Free Account
          </Button>
        </a>
      </div>
    </section>
  );
};

export default CTASection;
