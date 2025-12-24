
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const serviceRoleKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkUser() {
    console.log('Checking user admin@kitloop.com...');

    // 1. Get User ID
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) { console.error(error); return; }

    const user = users.find(u => u.email === 'admin@kitloop.com');
    if (!user) {
        console.log('User NOT FOUND in auth.users');
        return;
    }

    console.log('User Found:', user.id);
    console.log('User Meta:', user.user_metadata);

    // 2. Get Profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (profileError) {
        console.error('Profile Fetch Error:', profileError);
    } else {
        console.log('Profile Data:', profile);
    }

    // 3. Get Membership
    const { data: member, error: memberError } = await supabase
        .from('user_provider_memberships')
        .select('*')
        .eq('user_id', user.id);

    console.log('Memberships:', member);
}

checkUser();
