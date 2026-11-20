import https from 'https';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFveXFpeXdtb3hxbGhjdWtua3dlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4NDU1NDIsImV4cCI6MjExMDQyMTU0Mn0.k_Im9U4VoIYI-BBw2kK-M-tIfg_gWtFnwmTSQA4HZq0';

https.get({
  hostname: 'qoyqiywmoxqlhcuknkwe.supabase.co',
  path: '/rest/v1/user_roles?select=id,role',
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
    'Prefer': 'count=exact'
  }
}, res => {
  console.log('STATUS:', res.statusCode, 'RANGE:', res.headers['content-range']);
});
