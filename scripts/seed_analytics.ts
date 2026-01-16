import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0?target=denonext&pin=v135";
import { faker } from "https://esm.sh/@faker-js/faker@8.4.1?target=denonext&pin=v135";

// Load env vars if running locally with dotenv, or expect them in env
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function seed() {
    console.log("🌱 Starting Analytics Seed...");

    // 1. Create a Test Provider
    const providerEmail = `provider_${Date.now()}@test.com`;
    const { data: userAuth, error: authError } = await supabase.auth.admin.createUser({
        email: providerEmail,
        password: "password123",
        email_confirm: true,
    });

    if (authError) throw authError;
    const userId = userAuth.user.id;
    console.log(`Created user: ${providerEmail} (${userId})`);

    // Create Profile
    await supabase.from("profiles").insert({
        user_id: userId,
        role: "provider",
    });

    // Create Provider Record
    const { data: provider, error: providerError } = await supabase
        .from("providers")
        .insert({
            name: "Alpine Adventures Test",
            contact_name: "Test Owner",
            email: providerEmail,
            status: "approved", // Directly approved
            rental_name: "Alpine Adventures Test Rental",
            location: "Prague, CZ"
        })
        .select()
        .single();

    if (providerError) throw providerError;
    const providerId = provider.id;
    console.log(`Created provider: ${provider.rental_name} (${providerId})`);

    // Link User to Provider
    await supabase.from("user_provider_memberships").insert({
        user_id: userId,
        provider_id: providerId,
        role: "owner"
    });

    // 2. Create Gear Items
    const categories = ["Hiking", "Climbing", "Skiing", "Camping"];
    const gearIds: string[] = [];

    for (let i = 0; i < 10; i++) {
        const category = faker.random.arrayElement(categories);
        const { data: gear, error: gearError } = await supabase
            .from("gear_items")
            .insert({
                provider_id: providerId,
                name: `${faker.commerce.productAdjective()} ${category} Set`,
                description: faker.commerce.productDescription(),
                price_per_day: parseFloat(faker.commerce.price(200, 2000)),
                category: category,
                quantity_total: 5,
                quantity_available: 5,
                active: true,
                image_url: `https://source.unsplash.com/random/800x600?${category.toLowerCase()}`
            })
            .select()
            .single();

        if (gearError) throw gearError;
        gearIds.push(gear.id);
    }
    console.log(`Created 10 gear items`);

    // 3. Create Reservations (Past, Present, Future)
    // We need reservations to populate:
    // - analytics_provider_daily_utilisation (based on date ranges)
    // - analytics_provider_category_revenue (based on completed/confirmed orders)

    const statuses = ["completed", "confirmed", "active"]; // Only these count usually

    for (let i = 0; i < 50; i++) {
        const gearId = faker.random.arrayElement(gearIds);
        // Random date in last 30 days or next 30 days
        const daysOffset = faker.datatype.number({ min: -30, max: 30 });
        const duration = faker.datatype.number({ min: 2, max: 7 });

        const startDate = new Date();
        startDate.setDate(startDate.getDate() + daysOffset);

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + duration);

        // Fetch gear price (simplified, assuming we have it on hand or just randomizing)
        const pricePerDay = parseFloat(faker.commerce.price(200, 2000));
        const total = pricePerDay * duration;

        const { error: resError } = await supabase
            .from("reservations")
            .insert({
                provider_id: providerId,
                gear_id: gearId,
                customer_name: faker.name.findName(),
                customer_email: faker.internet.email(),
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                status: faker.random.arrayElement(statuses),
                total_price: total,
                created_at: startDate.toISOString(), // created around start time
            });

        if (resError && !resError.message.includes("overlap")) {
            // Ignore overlaps for bulk seeding, just want *some* data
            console.warn("Failed to insert reservation:", resError.message);
        }
    }

    console.log("Created ~50 reservations");
    console.log("✅ Seed complete!");
}

seed().catch(console.error);
