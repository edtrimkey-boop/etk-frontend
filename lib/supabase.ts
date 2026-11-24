import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ypmnsgpohaaavbjdqjye.supabase.co';
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_A-eYAoVILzcgjGWBbgTjuQ_gGPRHU-n';

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return supabaseClient;
}

export const supabase = getSupabase();

// Type Definitions
export interface DBInstituteSettings {
  institute_id: string;
  paper_header: string;
  paper_footer: string;
  allow_teacher_contacts: boolean;
  allow_teacher_edit: boolean;
  alert_paper_threshold: number;
  alert_doc_threshold: number;
  updated_at?: string;
}

export interface DBCommunicationTemplate {
  id?: string;
  institute_id: string;
  event_type: 'ATTENDANCE_ABSENT' | 'FEE_REMINDER';
  channel: 'SMS' | 'WHATSAPP' | 'PUSH' | 'EMAIL';
  is_active: boolean;
  template_body: string;
  updated_at?: string;
}

export interface DBJobCommunication {
  id?: string;
  job_code: string;
  actor_name: string;
  actor_role: string;
  message_type: 'note' | 'revision' | 'system';
  message: string;
  created_at?: string;
}

// 1. Fetch Core Institute Settings from Database
export async function fetchInstituteSettings(
  instituteId: string
): Promise<DBInstituteSettings | null> {
  if (!instituteId) return null;
  try {
    const { data, error } = await supabase
      .from('institute_settings')
      .select('*')
      .eq('institute_id', instituteId)
      .maybeSingle();

    if (error) {
      console.warn('[Supabase] Failed to fetch institute settings:', error);
      return null;
    }
    return data as DBInstituteSettings;
  } catch (err) {
    console.error('[Supabase] Error querying institute_settings:', err);
    return null;
  }
}

// 2. Upsert Core Institute Settings to Database
export async function saveInstituteSettings(
  settings: DBInstituteSettings
): Promise<{ success: boolean; error?: string }> {
  if (!settings.institute_id) return { success: false, error: 'Institute ID is required.' };
  try {
    const payload = {
      ...settings,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('institute_settings')
      .upsert(payload, { onConflict: 'institute_id' });

    if (error) {
      console.error('[Supabase] Upsert error on institute_settings:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown network error' };
  }
}

// 3. Fetch Multi-Channel Templates from Database
export async function fetchCommunicationTemplates(
  instituteId: string
): Promise<DBCommunicationTemplate[]> {
  if (!instituteId) return [];
  try {
    const { data, error } = await supabase
      .from('communication_templates')
      .select('*')
      .eq('institute_id', instituteId);

    if (error) {
      console.warn('[Supabase] Failed to fetch communication templates:', error);
      return [];
    }
    return (data || []) as DBCommunicationTemplate[];
  } catch (err) {
    console.error('[Supabase] Error querying communication_templates:', err);
    return [];
  }
}

// 4. Upsert Multi-Channel Templates to Database
export async function saveCommunicationTemplates(
  templates: DBCommunicationTemplate[]
): Promise<{ success: boolean; error?: string }> {
  if (!templates || templates.length === 0) return { success: true };
  try {
    const payload = templates.map((t) => ({
      ...t,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('communication_templates')
      .upsert(payload, { onConflict: 'institute_id, event_type, channel' });

    if (error) {
      console.error('[Supabase] Upsert error on communication_templates:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown network error' };
  }
}

// 5. Upload Brand Logo to Storage and Sync to Institutes Table
export async function uploadLogoToStorage(
  instituteId: string,
  userCode: string,
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!file || !instituteId) return { success: false, error: 'Missing file or institute ID' };
  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `logo_${userCode || instituteId}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('logo')
      .upload(fileName, file, { contentType: file.type || 'image/jpeg', upsert: true });

    if (uploadError) {
      console.error('[Supabase Storage] Logo upload failed:', uploadError);
      return { success: false, error: uploadError.message };
    }

    const { data: pubData } = supabase.storage.from('logo').getPublicUrl(fileName);
    const publicUrl = pubData?.publicUrl;

    if (publicUrl) {
      await supabase.from('institutes').update({ logo_url: publicUrl }).eq('id', instituteId);
      return { success: true, url: publicUrl };
    }
    return { success: false, error: 'Could not obtain public URL.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Upload failed' };
  }
}

// 6. Fetch Job Timeline Communications
export async function fetchJobCommunications(
  jobCode: string
): Promise<DBJobCommunication[]> {
  if (!jobCode) return [];
  try {
    const { data, error } = await supabase
      .from('job_communications')
      .select('*')
      .eq('job_code', jobCode)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[Supabase] Failed to fetch job communications:', error);
      return [];
    }
    return (data || []) as DBJobCommunication[];
  } catch (err) {
    console.error('[Supabase] Error loading job_communications:', err);
    return [];
  }
}

// 7. Insert New Message to Job Communications (Instant Chat)
export async function sendJobCommunication(
  msg: DBJobCommunication
): Promise<{ success: boolean; data?: DBJobCommunication; error?: string }> {
  if (!msg.job_code || !msg.message) return { success: false, error: 'Message cannot be empty.' };
  try {
    const { data, error } = await supabase
      .from('job_communications')
      .insert([
        {
          job_code: msg.job_code,
          actor_name: msg.actor_name || 'User',
          actor_role: msg.actor_role || 'Staff',
          message_type: msg.message_type || 'note',
          message: msg.message,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Insert error on job_communications:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data: data as DBJobCommunication };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error' };
  }
}
