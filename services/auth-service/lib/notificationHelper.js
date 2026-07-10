/**
 * Server-side notification inserts (synced with mobile notifications table).
 */
async function insertNotification(supabase, { companyId, recipientUid, recipientUsername, title, body, type, data }) {
  if (!recipientUid || !title || !body) return;
  try {
    await supabase.from('notifications').insert({
      company_id: companyId,
      recipient_uid: recipientUid,
      recipient_username: recipientUsername || null,
      title,
      body,
      type: type || 'general',
      data: data || {},
      read: false,
    });
  } catch (err) {
    console.warn('[notificationHelper] insert failed:', err.message);
  }
}

async function notifyUsernames(supabase, companyId, usernames, payload) {
  if (!usernames?.length) return;
  const { data: users } = await supabase
    .from('users')
    .select('uid, username')
    .eq('company_id', companyId)
    .in('username', usernames);
  for (const u of users || []) {
    await insertNotification(supabase, {
      companyId,
      recipientUid: u.uid,
      recipientUsername: u.username,
      ...payload,
    });
  }
}

module.exports = { insertNotification, notifyUsernames };
