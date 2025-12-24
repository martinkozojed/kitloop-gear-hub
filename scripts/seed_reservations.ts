
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const serviceRoleKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seedReservation() {
    console.log('Seeding Outdoor Reservations...');

    // 1. Get User
    const { data: { users }, error: uErr } = await supabase.auth.admin.listUsers();
    if (uErr) throw uErr;
    const user = users.find(u => u.email === 'admin@kitloop.com') || users[0];
    if (!user) { console.error('User not found'); return; }

    const providerId = '11111111-1111-1111-1111-111111111111';

    // Ferrata Set (Universal)
    const ferrataVariantId = 'd1000000-0000-0000-0000-000000000001';
    // Harness (Size 1)
    const harnessVariantId = 'd2000000-0000-0000-0000-000000000001';

    // 2. Insert Reservation (Confirmed, ready for Check-out) - FOR HARNESS
    const { data, error } = await supabase.from('reservations').insert({
        user_id: user.id,
        provider_id: providerId,
        product_variant_id: harnessVariantId,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000).toISOString(),
        status: 'confirmed',
        customer_name: 'Climber Joe',
        customer_email: 'joe@climber.com',
        customer_phone: '+420999888777',
        total_price: 300,
        deposit_paid: true,
        notes: 'Needs Size S/M'
    }).select().single();

    if (error) {
        console.error('Failed to insert Confirmed reservation:', error);
    } else {
        console.log('Created Confirmed Reservation (Harness):', data.id);
    }

    // 3. Insert Active Reservation (Ready for Check-in) - FOR FERRATA SET
    const { data: activeRes, error: err2 } = await supabase.from('reservations').insert({
        user_id: user.id,
        provider_id: providerId,
        product_variant_id: ferrataVariantId,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000).toISOString(),
        status: 'active',
        customer_name: 'Alice Adventure',
        customer_email: 'alice@adventure.com',
        total_price: 500,
        deposit_paid: true
    }).select().single();

    if (err2) {
        console.error('Failed to insert Active reservation:', err2);
    } else {
        console.log('Created Active Reservation (Ferrata):', activeRes.id);

        // Assign FER-002 (which is 'active' in seed.sql)
        const { data: asset } = await supabase.from('assets').select('id').eq('asset_tag', 'FER-002').single();

        if (asset) {
            await supabase.from('reservation_assignments').insert({
                reservation_id: activeRes.id,
                asset_id: asset.id,
                assigned_at: new Date().toISOString()
            });
            console.log('Assigned FER-002 to Active Reservation');
        } else {
            console.error('Asset FER-002 not found for assignment');
        }
    }
}

seedReservation();
