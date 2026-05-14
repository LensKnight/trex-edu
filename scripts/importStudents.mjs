import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const SUPABASE_URL = "https://dszrvvdgcfkamgbuevxp.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzenJ2dmRnY2ZrYW1nYnVldnhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQ5Nzg2OCwiZXhwIjoyMDk0MDczODY4fQ.sY3r1X-D5wxHLSonnwotc7SVdtyO9aVI_0pghjHHpDc";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const csv = fs.readFileSync("students.csv", "utf8");
const lines = csv.trim().split("\n");
const headers = lines[0].split(",");

const students = lines.slice(1).map((line) => {
  const values = line.split(",");
  return Object.fromEntries(headers.map((h, i) => [h.trim(), values[i].trim()]));
});

// Pehle saare existing users fetch karo
const { data: existingUsersData } = await supabase.auth.admin.listUsers();
const existingUsers = existingUsersData?.users || [];

for (const student of students) {
  const email = `${student.username}@trexedu.com`;
  let userId = null;

  // Check karo user already hai kya
  const existingUser = existingUsers.find((u) => u.email === email);

  if (existingUser) {
    console.log(`⚠️ Already exists: ${student.username} — profile banate hain`);
    userId = existingUser.id;
  } else {
    // Naya user banao
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: "Pass@123",
      email_confirm: true,
    });

    if (authError) {
      console.log(`❌ Auth error for ${student.username}:`, authError.message);
      continue;
    }

    userId = authData.user.id;
    console.log(`✅ New user: ${student.username}`);
  }

  // Profile insert/update karo
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    username: student.username,
    full_name: student.full_name,
    class_name: student.class_name,
    stream: student.stream,
    section: student.section,
    roll_no: student.roll_no,
    xp: 0,
  });

  if (profileError) {
    console.log(`❌ Profile error for ${student.username}:`, profileError.message);
  } else {
    console.log(`✅ Profile done: ${student.full_name} (${student.username})`);
  }
}

console.log("🎉 Sab ho gaya!");