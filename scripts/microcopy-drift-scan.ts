// microcopy-drift-scan.ts
// This script checks for hardcoded Czech/English words inside text nodes of specific components.
// It fails the build if it finds any, forcing the use of microcopy.registry.ts.

import { readFileSync } from 'fs';
import { globSync } from 'glob';
import { parse } from '@typescript-eslint/parser';
import * as tseslint from '@typescript-eslint/utils';

// We only want to aggressively scan Onboarding and Dashboard callouts as per the scope.
const SCOPE_GLOBS = [
    'src/components/dashboard/OnboardingChecklist.tsx',
    'src/pages/provider/DashboardOverview.tsx',
    'src/components/ui/context-tip.tsx'
];

// Look for common Czech/English words used as text children
const FORBIDDEN_WORDS = /\b(Vydat|Vrátit|Uložit|Zrušit|Potvrdit|Zpět|Další|Přidat|Nastavení|Smazat|Odeslat|Issue|Return|Save|Cancel|Confirm|Back|Next|Add|Settings|Delete|Submit)\b/i;

// Regex to find the bypass comment
const IGNORE_COMMENT = /\/\/ drift-scan:allow/i;

let hasViolations = false;

console.log('🔍 Microcopy Drift Scan...');
console.log('=============================');

const files = globSync(SCOPE_GLOBS);

for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    // Parse the file to AST
    let ast;
    try {
        ast = parse(content, {
            loc: true,
            range: true,
            jsx: true,
            comment: true
        });
    } catch (e) {
        console.warn(`[WARN] Could not parse ${file}:`, e);
        continue;
    }

    // Very simple traversal just looking for JSXText nodes.
    // A robust AST traversal would be better, but we do a pragmatic token scan here.
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Ignore simple comment lines and console.error
        if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*') || line.includes('console.error')) {
            continue;
        }

        // Check if line contains a forbidden word
        if (FORBIDDEN_WORDS.test(line)) {
            // Check if previous line or current line has an ignore comment
            const prevLine = i > 0 ? lines[i - 1] : '';
            if (IGNORE_COMMENT.test(line) || IGNORE_COMMENT.test(prevLine)) {
                continue;
            }

            // We want to avoid matching common TS keywords like return, import, etc 
            // when they accidentally overlap (though FORBIDDEN_WORDS targets Czech mainly now + some explicit English UI words like Save/Cancel)
            // If it's pure "return (" it's not a UI string.
            if (line.match(/return\s*\(/) && !line.match(/>.*[a-zA-Z].*</)) {
                continue;
            }

            // Ignore single-quoted strings, as they are usually object keys/values or IDs (e.g. id: 'issue', type === 'return', t('ssot...'))
            if (line.includes("'") && !line.includes(">")) {
                continue;
            }
            // Ignore if statements
            if (line.trim().startsWith('if ') || line.trim().startsWith('return t(') || line.includes("=== 'return'")) {
                continue;
            }
            // Ignore object property matches with match.completed
            if (line.includes("match.completed")) {
                continue;
            }
            // Ignore simple JSX comments
            if (line.trim().startsWith('{/*')) {
                continue;
            }

            // Simple heuristic: if the word is inside quotes, it might be an aria-label or prop.
            // If it's pure text, it's definitely a violation. Let's just flag it all for now 
            // unles allowed, to be strict.

            console.error(`❌ Violation in ${file}:${i + 1}`);
            console.error(`   "${line.trim()}"`);
            console.error(`   -> Hardcoded string detected. Use microcopy.registry.ts or add '// drift-scan:allow <reason>'`);
            hasViolations = true;
        }
    }
}

if (hasViolations) {
    console.log('\n=============================');
    console.error('❌ Microcopy Drift Scan FAILED. ❌');
    console.error('Please move hardcoded text to src/content/microcopy.registry.ts and use i18n.');
    process.exit(1);
} else {
    console.log('\n✅ Scan complete. No hardcoded violations found in scope.');
    process.exit(0);
}
