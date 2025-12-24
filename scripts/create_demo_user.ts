
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const serviceRoleKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createDemoUser() {
    const email = 'admin@kitloop.com';
    const password = 'password';

    console.log(`Attempting to create/update user: ${email}`);

    // 1. Check if user exists (by listing, or getting by email if possible - admin api 'listUsers' is best)
    // Actually, createUser with same email might return existing user or error.

    // Try to delete first to be clean (optional, but good for reset)
    // Need ID to delete.

    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
        console.error('List users error:', listError);
        return;
    }

    const existingUser = users.find(u => u.email === email);

    if (existingUser) {
        console.log(`User exists (ID: ${existingUser.id}). Updating password...`);
        const { data, error } = await supabase.auth.admin.updateUserById(
            existingUser.id,
            { password: password, email_confirm: true, user_metadata: { first_name: 'Demo', last_name: 'User' } }
        );
        if (error) console.error('Update failed:', error);
        else console.log('Password updated successfully.');

        // Also ensure profile exists (via logic or trigger, but we seeded it via SQL so it should match by ID if ID matches?)
        // Wait, SQL seed forced ID 0000... 
        // Admin API will generate a random UUID usually.
        // IF existingUser.id != '0000...', then the SQL profile (linked to 0000...) is ORPHANED.
        // We must update the Profile to point to this real User ID.

        return existingUser.id;
    } else {
        console.log('Creating new user...');
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { first_name: 'Demo', last_name: 'User' }
        });

        if (error) {
            console.error('Create failed:', error);
            return null;
        }

        console.log(`User created (ID: ${data.user.id})`);
        return data.user.id;
    }
}

async function linkProfile(userId: string) {
    if (!userId) return;

    // Force update profile to ensure correct role
    console.log('Forcing profile role to provider/admin...');
    const { error: updateError, count } = await supabase.from('profiles').update({
        is_admin: true,
        role: 'provider'
    }).eq('user_id', userId).select();

    if (updateError) {
        console.error('Profile update error:', updateError);
    } else if (count === 0) {
        console.log('Profile not found, inserting...');
        const { error: insertError } = await supabase.from('profiles').insert({
            user_id: userId,
            is_admin: true,
            role: 'provider'
        });
        if (insertError) console.error('Profile insert error:', insertError);
        else console.log('Profile created.');
    } else {
        console.log('Profile role updated.');
    }

    // Link to Provider 1111...
    const providerId = '11111111-1111-1111-1111-111111111111';
    const { error: memberError } = await supabase.from('user_provider_memberships')
        .upsert({ user_id: userId, provider_id: providerId, role: 'owner' });

    if (memberError) console.error('Membership link error:', memberError);
    else console.log('Linked to Provider successfully.');
}

createDemoUser().then(userId => {
    if (userId) linkProfile(userId);
});
