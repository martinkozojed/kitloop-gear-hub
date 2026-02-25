
import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				// Public surfaces: section background and dark accent
				subtle: 'hsl(var(--bg-subtle))',
				inverse: {
					DEFAULT: 'hsl(var(--bg-inverse))',
					foreground: 'hsl(var(--text-inverse))',
				},
				brand: {
					DEFAULT: 'hsl(var(--brand) / <alpha-value>)',
					foreground: 'hsl(var(--brand-foreground) / <alpha-value>)',
				},
				// Status: semantic tokens (Badge, StatusBadge, getStatusColorClasses)
				status: {
					success: {
						DEFAULT: 'hsl(var(--status-success) / <alpha-value>)',
						foreground: 'hsl(var(--status-foreground))',
					},
					info: {
						DEFAULT: 'hsl(var(--status-info) / <alpha-value>)',
						foreground: 'hsl(var(--status-foreground))',
					},
					warning: {
						DEFAULT: 'hsl(var(--status-warning) / <alpha-value>)',
						foreground: 'hsl(var(--status-foreground))',
					},
					danger: {
						DEFAULT: 'hsl(var(--status-danger) / <alpha-value>)',
						foreground: 'hsl(var(--status-foreground))',
					},
					neutral: {
						DEFAULT: 'hsl(var(--status-neutral) / <alpha-value>)',
						foreground: 'hsl(var(--status-foreground))',
					},
				},
				kitloop: {
					accent: '#2E7D32',
					'accent-hover': '#27632A',
					background: '#FAF9F6',
					text: '#1F1F1F'
				}
			},
			borderRadius: {
				// Token-based radius (use these!)
				'token-sm': 'var(--radius-sm)',  // 6px - badges, chips
				'token-md': 'var(--radius-md)',  // 10px - buttons, inputs
				'token-lg': 'var(--radius-lg)',  // 16px - cards, modals
				'token-xl': 'var(--radius-xl)',  // 24px - MARKETING ONLY
				// Legacy shadcn (keep for compatibility)
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			boxShadow: {
				// Token-based shadows (use these!)
				'xs': 'var(--shadow-xs)',
				'card': 'var(--shadow-card)',
				'elevated': 'var(--shadow-elevated)',
				'brand': 'var(--shadow-brand)',  // MARKETING CTA ONLY
				'hero': 'var(--shadow-hero)',
				'hero-hover': 'var(--shadow-hero-hover)',
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'fade-out': {
					'0%': {
						opacity: '1',
						transform: 'translateY(0)'
					},
					'100%': {
						opacity: '0',
						transform: 'translateY(10px)'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.4s ease-out',
				'fade-out': 'fade-out 0.4s ease-out'
			},
			fontFamily: {
				sans: ["Inter", ...fontFamily.sans],
				heading: ["Poppins", "sans-serif"],
			}
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
