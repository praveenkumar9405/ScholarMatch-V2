const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tclwcrlxykpocaneegwf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjbHdjcmx4eWtwb2NhbmVlZ3dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MzA1OTMsImV4cCI6MjA5MDUwNjU5M30.54mlS2HHasj1WAuw0w6DCzZE4AejG6JH3HFN30SlueI'
);

async function test() {
  const { data, error } = await supabase.auth.signUp({
    email: 'test@example.com',
    password: 'password123456!'
  });
  console.log('Data:', data);
  console.log('Error:', error);
}

test();
