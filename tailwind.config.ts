
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
				semantic: {
					brand: {
						50: 'hsl(var(--semantic-brand-50))',
						500: 'hsl(var(--semantic-brand-500))',
						900: 'hsl(var(--semantic-brand-900))',
					},
					success: {
						50: 'hsl(var(--semantic-success-50))',
						500: 'hsl(var(--semantic-success-500))',
						text: 'hsl(var(--semantic-success-text))',
					},
					warning: {
						50: 'hsl(var(--semantic-warning-50))',
						500: 'hsl(var(--semantic-warning-500))',
						text: 'hsl(var(--semantic-warning-text))',
					},
					danger: {
						50: 'hsl(var(--semantic-danger-50))',
						500: 'hsl(var(--semantic-danger-500))',
						text: 'hsl(var(--semantic-danger-text))',
					}
				},
				// PR7.1 Status Tokens
				status: {
					warning: 'hsl(var(--status-pending) / <alpha-value>)',
					info: 'hsl(var(--status-confirmed) / <alpha-value>)',
					success: 'hsl(var(--status-active) / <alpha-value>)',
					danger: 'hsl(var(--status-overdue) / <alpha-value>)',
					neutral: 'hsl(var(--status-completed) / <alpha-value>)',
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
