-- 20260822200000_database_tables_rpc.sql
-- Create an RPC function that returns metadata about all public tables

CREATE OR REPLACE FUNCTION public.get_database_tables()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.name), '[]'::jsonb)
  FROM (
    SELECT
      'public.' || tbl.table_name AS name,
      COALESCE(
        CASE tbl.table_name
          WHEN 'system_settings'      THEN 'តារាងគ្រប់គ្រងអថេរ និងការកំណត់ប្រព័ន្ធសកល (Global Variables)'
          WHEN 'users'                THEN 'គណនីអ្នកប្រើប្រាស់ និងព័ត៌មាន Auth Logins'
          WHEN 'members'              THEN 'បញ្ជីឈ្មោះសមាជិកប្រព័ន្ធ និងព័ត៌មានលម្អិត'
          WHEN 'voters'               THEN 'បញ្ជីឈ្មោះអ្នកបោះឆ្នោតតាមតំបន់ភូមិសាស្ត្រ'
          WHEN 'menu_items'           THEN 'ឋានានុក្រមម៉ឺនុយប្រព័ន្ធ ម៉ូឌុល និងលំដាប់'
          WHEN 'module_configs'       THEN 'ការកំណត់ម៉ូឌុល និងស្វ័យប្រវត្តិកំណត់ត្រា'
          WHEN 'workflow_steps'       THEN 'ជំហានអនុម័ត និងតួនាទីអ្នកអនុម័ត'
          WHEN 'report_templates'     THEN 'គំរូរបាយការណ៍ .docx & HTML Templates'
          WHEN 'files'                THEN 'ប្រព័ន្ធគ្រប់គ្រង និងតម្កល់ឯកសាររដ្ឋបាល'
          WHEN 'folders'              THEN 'ថតឯកសាររដ្ឋបាល (Folder Structure)'
          WHEN 'records'              THEN 'កំណត់ត្រារដ្ឋបាល លិខិត និងឯកសារផ្លូវការ'
          WHEN 'performance_periods'  THEN 'កាលភាគ និងរយៈពេលវាយតម្លៃសមិទ្ធកម្ម'
          WHEN 'performance_indicators' THEN 'សូចនាករ និងដែនវាយតម្លៃសមិទ្ធកម្ម'
          WHEN 'roles'                THEN 'តួនាទី និងកម្រិតសិទ្ធិអ្នកប្រើប្រាស់'
          WHEN 'permissions'          THEN 'សិទ្ធិប្រតិបត្តិការតាមម៉ូឌុលប្រព័ន្ធ'
          WHEN 'cron_logs'            THEN 'កំណត់ត្រាប្រតិបត្តិការ Cron Jobs'
          WHEN 'geographic_zones'     THEN 'តំបន់ភូមិសាស្ត្រ (ខេត្ត ស្រុក ឃុំ ភូមិ)'
          WHEN 'parties'              THEN 'គណបក្សនយោបាយ និងការភ្ជាប់ទៅនឹងសមាជិក'
          WHEN 'report_documents'     THEN 'ឯកសាររបាយការណ៍ និងស្ថានភាពការអនុម័ត'
          WHEN 'report_reviews'       THEN 'ការពិនិត្យ និងការអនុម័តរបាយការណ៍'
          WHEN 'membership_applications' THEN 'ពាក្យសុំសមាជិកភាព និងស្ថានភាពការពិនិត្យ'
          WHEN 'membership_cards'     THEN 'កាតសមាជិក និង QR Code'
          WHEN 'audit_logs'           THEN 'កំណត់ត្រាប្រវត្តិរបស់ប្រព័ន្ធ (Audit Trail)'
          WHEN 'user_sessions'        THEN 'សesionនៃអ្នកប្រើប្រាស់ (Login Sessions)'
          ELSE '—'
        END, '—'
      ) AS desc,
      COALESCE(
        (SELECT string_agg(k.column_name, ', ')
         FROM information_schema.key_column_usage k
         JOIN information_schema.table_constraints tc
           ON k.constraint_name = tc.constraint_name
          AND k.table_schema = tc.table_schema
         WHERE tc.table_schema = 'public'
           AND tc.table_name = tbl.table_name
           AND tc.constraint_type = 'PRIMARY KEY'),
        '—'
      ) AS pk,
      COALESCE(
        CASE tbl.table_name
          WHEN 'system_settings'      THEN 'Global Config'
          WHEN 'users'                THEN 'Core Auth'
          WHEN 'members'              THEN 'Core Business'
          WHEN 'voters'               THEN 'Voter System'
          WHEN 'menu_items'           THEN 'Navigation'
          WHEN 'module_configs'       THEN 'Workflow'
          WHEN 'workflow_steps'       THEN 'Approval Flow'
          WHEN 'report_templates'     THEN 'Reports'
          WHEN 'files'                THEN 'Storage'
          WHEN 'folders'              THEN 'Storage'
          WHEN 'records'              THEN 'Documents'
          WHEN 'performance_periods'  THEN 'Performance'
          WHEN 'performance_indicators' THEN 'Performance'
          WHEN 'roles'                THEN 'RBAC Security'
          WHEN 'permissions'          THEN 'RBAC Security'
          WHEN 'cron_logs'            THEN 'Cron System'
          WHEN 'geographic_zones'     THEN 'Geography'
          WHEN 'parties'              THEN 'Political'
          WHEN 'report_documents'     THEN 'Reports'
          WHEN 'report_reviews'       THEN 'Reports'
          WHEN 'membership_applications' THEN 'Membership'
          WHEN 'membership_cards'     THEN 'Membership'
          WHEN 'audit_logs'           THEN 'Audit'
          WHEN 'user_sessions'        THEN 'Auth'
          ELSE 'General'
        END, 'General'
      ) AS type,
      'Active' AS status
    FROM information_schema.tables tbl
    WHERE tbl.table_schema = 'public'
      AND tbl.table_type = 'BASE TABLE'
  ) t;
$$;
