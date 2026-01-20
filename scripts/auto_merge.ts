/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
// Watcher script for PR 62
const prId = 62;
console.log(`Starting auto-merge watcher for PR ${prId}...`);

async function checkAndMerge() {
    while (true) {
        const cmd = new Deno.Command("gh", {
            args: ["pr", "view", String(prId), "--json", "statusCheckRollup"]
        });
        const output = await cmd.output();
        const data = JSON.parse(new TextDecoder().decode(output.stdout));

        // Check status
        const checks = data.statusCheckRollup || [];
        // This part depends on GH JSON structure. Simplified: check if state is "SUCCESS"
        // Actually simpler: try to merge. If it fails due to checks, wait.

        console.log("Attempting merge...");
        const mergeCmd = new Deno.Command("gh", {
            args: ["pr", "merge", String(prId), "--merge"]
        });
        const mergeOut = await mergeCmd.output();

        if (mergeOut.success) {
            console.log("✅ Successfully merged!");
            Deno.exit(0);
        } else {
            const err = new TextDecoder().decode(mergeOut.stderr);
            if (err.includes("not succeeded")) {
                console.log("⏳ Checks pending. Waiting 30s...");
            } else {
                console.log("⚠️ Merge failed:", err);
                // If generic error, keep retrying or exit? Retry.
            }
        }

        await new Promise(r => setTimeout(r, 30000));
    }
}

checkAndMerge();
