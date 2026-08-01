import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('http://127.0.0.1:54321', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0');

describe('availability_slots RLS', () => {
  let testUserId: string;
  let listingId: string;
  let testEmail: string;
  const testPassword = 'TestPassword123!';

  beforeEach(async () => {
    // Generate unique email for each test run
    testEmail = `availability-test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}@example.com`;

    // Create a fresh user for this test
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (signUpError) throw new Error(`Sign up failed: ${signUpError.message}`);
    testUserId = authData.user!.id;

    // Sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    if (signInError) throw new Error(`Sign in failed: ${signInError.message}`);

    // Create a test listing (as this user)
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .insert({
        seller_id: testUserId,
        title: 'Test Listing for Availability',
        category: 'photography-studio',
        price_cents: 5000,
        location: 'Test Location',
        booking_mode: 'instant',
        status: 'draft',
      })
      .select('id')
      .single();

    if (listingError) throw new Error(`Listing creation failed: ${listingError.message}`);
    listingId = listing.id;
  });

  afterEach(async () => {
    // Clean up: delete availability slots, then listing
    if (listingId) {
      await supabase.from('availability_slots').delete().eq('listing_id', listingId);
      await supabase.from('listings').delete().eq('id', listingId);
    }
  });

  it('allows owner to manage slots', async () => {
    const start = new Date().toISOString();
    const end = new Date(Date.now() + 3600000).toISOString();

    const { error: insertError } = await supabase
      .from('availability_slots')
      .insert({ listing_id: listingId, start_time: start, end_time: end });

    expect(insertError).toBeNull();
  });

  it('prevents overlapping slots (DB constraint)', async () => {
    const start = new Date().toISOString();
    const end = new Date(Date.now() + 3600000).toISOString();

    // First insert
    const { error: firstInsertError } = await supabase
      .from('availability_slots')
      .insert({ listing_id: listingId, start_time: start, end_time: end });

    expect(firstInsertError).toBeNull();

    // Overlapping insert
    const { error: insertError } = await supabase
      .from('availability_slots')
      .insert({ listing_id: listingId, start_time: start, end_time: end });

    expect(insertError).not.toBeNull();
    expect(insertError!.message).toContain('no_overlapping_slots');
  });
});
