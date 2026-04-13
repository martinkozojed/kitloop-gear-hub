
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
				// Public surfaces
				subtle: 'hsl(var(--bg-subtle))',
				inverse: {
					DEFAULT: 'hsl(var(--bg-inverse))',
					foreground: 'hsl(var(--text-inverse))',
				},
				brand: {
					50: '#E0F2F1',
					100: '#B2DFDB',
					200: '#80CBC4',
					300: '#4DB6AC',
					400: '#26A69A',
					500: '#009688',
					600: '#00897B',
					700: '#00796B',
					800: '#00695C',
					900: '#004D40',
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
				},
				// Status: semantic tokens
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
			},
			borderRadius: {
				// Token-based radius
				'token-sm': '6px',
				'token-md': '10px',
				'token-lg': '16px',
				'token-xl': '20px',
				'token-2xl': '24px',
				'token-full': '9999px',
				// Legacy shadcn (keep for compatibility)
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			boxShadow: {
				'sm': 'var(--shadow-sm)',
				'card': 'var(--shadow-card)',
				'elevated': 'var(--shadow-elevated)',
				'xl': 'var(--shadow-xl)',
				'brand': 'var(--shadow-brand)',
				// Legacy compat
				'xs': 'var(--shadow-xs)',
				'hero': 'var(--shadow-hero)',
				'hero-hover': 'var(--shadow-hero-hover)',
				'premium': '0 20px 45px -25px rgba(28,86,52,0.45)',
			},
			transitionDuration: {
				'instant': 'var(--duration-instant)',
				'fast': 'var(--duration-fast)',
				'normal': 'var(--duration-normal)',
				'slow': 'var(--duration-slow)',
				'draw': 'var(--duration-draw)',
			},
			transitionTimingFunction: {
				'ease-out': 'var(--ease-out)',
				'ease-in': 'var(--ease-in)',
				'ease-spring': 'var(--ease-spring)',
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
						opacity: '0'
					},
					'100%': {
						opacity: '1'
					}
				},
				'fade-out': {
					'0%': {
						opacity: '1'
					},
					'100%': {
						opacity: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.4s ease-out',
				'fade-out': 'fade-out 0.4s ease-out'
			},
			fontSize: {
				xxs: ['10px', { lineHeight: '1rem' }],
			},
			backgroundImage: {
				'hero-glow': 'var(--hero-glow)',
			},
			fontFamily: {
				sans: ["Inter", ...fontFamily.sans],
				heading: ["Manrope", "system-ui", "sans-serif"],
			}
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
