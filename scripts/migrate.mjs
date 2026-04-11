#!/usr/bin/env node
// Migration script — runs DDL SQL against Supabase via Management API
// Setup: Add SUPABASE_ACCESS_TOKEN to .env.local
//   Get token at: https://supabase.com/dashboard/account/tokens
// Usage: npm run migrate

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// Parse .env.local
let env = {}
try {
  const raw = readFileSync(resolve(root, '.env.local'), 'utf-8')
  for (const line of raw.split('\n')) {
    const m = line.match(/^([^=]+)=(.*)$/)
    if (m) env[m[1].trim()] = m[2].trim()
  }
} catch {
  console.error('❌ .env.local not found')
  process.exit(1)
}

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL']
const accessToken = env['SUPABASE_ACCESS_TOKEN']

if (!supabaseUrl) { console.error('❌ NEXT_PUBLIC_SUPABASE_URL not set'); process.exit(1) }

// Extract project ref from URL (https://<ref>.supabase.co)
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
if (!projectRef) { console.error('❌ Could not parse project ref from NEXT_PUBLIC_SUPABASE_URL'); process.exit(1) }

// Migrations to run (idempotent)
const migrations = [
  {
    name: '20260410_001_add_user_id_and_rls',
    sql: `
ALTER TABLE sl_master_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE sl_shopping_lists ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE sl_master_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sl_shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE sl_list_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_master_items" ON sl_master_items;
CREATE POLICY "own_master_items" ON sl_master_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own_lists" ON sl_shopping_lists;
CREATE POLICY "own_lists" ON sl_shopping_lists FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own_list_items" ON sl_list_items;
CREATE POLICY "own_list_items" ON sl_list_items FOR ALL USING (list_id IN (SELECT id FROM sl_shopping_lists WHERE user_id = auth.uid()));
    `.trim(),
  },
  {
    name: '20260411_001_add_image_url_to_master_items',
    sql: `ALTER TABLE sl_master_items ADD COLUMN IF NOT EXISTS image_url TEXT;`,
  },
]

if (!accessToken) {
  console.log('⚠️  SUPABASE_ACCESS_TOKEN not set in .env.local')
  console.log('')
  console.log('Get a personal access token at:')
  console.log('  https://supabase.com/dashboard/account/tokens')
  console.log('')
  console.log('Add to .env.local:')
  console.log('  SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxxxxx')
  console.log('')
  console.log('─── SQL to run manually in Supabase SQL Editor ───')
  for (const m of migrations) {
    console.log(`\n-- ${m.name}`)
    console.log(m.sql)
  }
  console.log('\nhttps://supabase.com/dashboard/project/' + projectRef + '/sql/new')
  process.exit(0)
}

console.log(`Project: ${projectRef}`)
console.log('')

let allOk = true
for (const migration of migrations) {
  process.stdout.write(`  ${migration.name}... `)
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ query: migration.sql }),
    })

    if (res.ok) {
      console.log('✅')
    } else {
      const body = await res.text()
      if (body.includes('already exists')) {
        console.log('✅ (already applied)')
      } else if (res.status === 401) {
        console.log('❌ 401 Unauthorized')
        console.log('     Your SUPABASE_ACCESS_TOKEN may be invalid or expired.')
        console.log('     Get a new one at: https://supabase.com/dashboard/account/tokens')
        allOk = false
        break
      } else {
        console.log(`❌ ${res.status}: ${body.slice(0, 200)}`)
        allOk = false
      }
    }
  } catch (e) {
    console.log(`❌ Network error: ${e.message}`)
    allOk = false
  }
}

console.log('')
if (allOk) {
  console.log('✅ All migrations complete!')
} else {
  console.log('⚠️  Some migrations failed. Run the SQL manually:')
  console.log('   https://supabase.com/dashboard/project/' + projectRef + '/sql/new')
  console.log('')
  for (const m of migrations) {
    console.log(`-- ${m.name}`)
    console.log(m.sql)
    console.log('')
  }
}
