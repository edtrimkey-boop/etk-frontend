'use client';

import { serverCall, serverCallCached, getCachedServerCall } from '@/lib/api-client';

export interface DBInstituteSettings {
  id?: string;
  institute_id: string;
  paper_header?: string | null;
  paper_footer?: string | null;
  alert_paper_threshold?: number | null;
  alert_doc_threshold?: number | null;
  allow_teacher_contacts?: boolean | null;
  allow_teacher_edit?: boolean | null;
  updated_at?: string;
}

export interface DBCommunicationTemplate {
  id?: string;
  institute_id: string;
  event_type: 'ATTENDANCE_ABSENT' | 'FEE_REMINDER' | string;
  channel: 'SMS' | 'WHATSAPP' | 'PUSH' | 'EMAIL' | string;
  is_active: boolean;
  template_body: string;
  updated_at?: string;
}

export interface DBJobCommunication {
  id?: string;
  job_code: string;
  actor_name: string;
  actor_role: string;
  message_type?: string;
  message: string;
  timestamp?: string;
  created_at?: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

export function getCachedInstituteSettingsBundle(instId: string): {
  settings: DBInstituteSettings | null;
  templates: DBCommunicationTemplate[];
} | null {
  if (!instId) return null;
  const cached = getCachedServerCall('getInstituteSettings', { instId });
  if (!cached) return null;
  return {
    settings: (cached.settings as DBInstituteSettings) || null,
    templates: Array.isArray(cached.templates) ? (cached.templates as DBCommunicationTemplate[]) : [],
  };
}

export async function fetchInstituteSettings(instId: string): Promise<DBInstituteSettings | null> {
  if (!instId) return null;
  try {
    const res = await serverCallCached('getInstituteSettings', { instId }, { ttlMs: 10_000 });
    return (res?.settings as DBInstituteSettings) || null;
  } catch (e) {
    console.warn('[Settings Proxy] fetchInstituteSettings exception:', e);
    return null;
  }
}

export async function saveInstituteSettings(
  settings: DBInstituteSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await serverCall('updateInstituteSettings', {
      instId: settings.institute_id,
      paper_header: settings.paper_header ?? '',
      paper_footer: settings.paper_footer ?? '',
      alert_paper_threshold: settings.alert_paper_threshold ?? 10,
      alert_doc_threshold: settings.alert_doc_threshold ?? 50,
      allow_teacher_contacts: settings.allow_teacher_contacts ?? true,
      allow_teacher_edit: settings.allow_teacher_edit ?? false,
    });
    if (!res?.success) {
      return { success: false, error: res?.message || 'Failed to save institute settings.' };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Save failed' };
  }
}

export async function fetchCommunicationTemplates(instId: string): Promise<DBCommunicationTemplate[]> {
  if (!instId) return [];
  try {
    const res = await serverCallCached('getInstituteSettings', { instId }, { ttlMs: 10_000 });
    return Array.isArray(res?.templates) ? (res.templates as DBCommunicationTemplate[]) : [];
  } catch (e) {
    console.warn('[Settings Proxy] fetchCommunicationTemplates exception:', e);
    return [];
  }
}

export async function saveCommunicationTemplates(
  templates: DBCommunicationTemplate[]
): Promise<{ success: boolean; error?: string }> {
  if (!Array.isArray(templates) || templates.length === 0) return { success: true };
  try {
    const instId = templates[0].institute_id;
    const channels = { sms: false, wa: false, push: false, email: false };
    const feeChannels = { sms: false, wa: false, push: false, email: false };
    let attTemplate = '';
    let feeTemplate = '';

    for (const tpl of templates) {
      const ch = String(tpl.channel || '').toUpperCase();
      const target = tpl.event_type === 'FEE_REMINDER' ? feeChannels : channels;
      if (ch === 'SMS') target.sms = Boolean(tpl.is_active);
      else if (ch === 'WHATSAPP') target.wa = Boolean(tpl.is_active);
      else if (ch === 'PUSH') target.push = Boolean(tpl.is_active);
      else if (ch === 'EMAIL') target.email = Boolean(tpl.is_active);

      if (tpl.event_type === 'FEE_REMINDER' && tpl.template_body) {
        feeTemplate = tpl.template_body;
      } else if (tpl.event_type !== 'FEE_REMINDER' && tpl.template_body) {
        attTemplate = tpl.template_body;
      }
    }

    const existing = await fetchInstituteSettings(instId);
    const res = await serverCall('updateInstituteSettings', {
      instId,
      paper_header: existing?.paper_header ?? '',
      paper_footer: existing?.paper_footer ?? '',
      alert_paper_threshold: existing?.alert_paper_threshold ?? 10,
      alert_doc_threshold: existing?.alert_doc_threshold ?? 50,
      allow_teacher_contacts: existing?.allow_teacher_contacts ?? true,
      allow_teacher_edit: existing?.allow_teacher_edit ?? false,
      channels,
      feeChannels,
      attTemplate,
      feeTemplate,
    });
    if (!res?.success) {
      return { success: false, error: res?.message || 'Failed to save templates.' };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Template save failed' };
  }
}

export async function uploadLogoToStorage(
  instId: string,
  instCode: string,
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const fileBase64 = await fileToBase64(file);
    const res = await serverCall('updateInstituteLogo', {
      instId,
      instCode,
      fileBase64,
      mimeType: file.type || 'image/png',
    });
    if (!res?.success || !res?.url) {
      return { success: false, error: res?.message || 'Logo upload failed.' };
    }
    return { success: true, url: String(res.url) };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Logo upload failed.' };
  }
}

export async function fetchJobCommunications(jobId: string): Promise<DBJobCommunication[]> {
  if (!jobId) return [];
  try {
    const res = await serverCall('getJobTimeline', { jobId });
    const list = Array.isArray(res?.history) ? res.history : Array.isArray(res?.timeline) ? res.timeline : [];
    return list.map((item: any) => ({
      id: item.id,
      job_code: jobId,
      actor_name: item.actorName || item.actor_name || 'User',
      actor_role: item.actorRole || item.actor_role || 'Staff',
      message_type: item.type || item.message_type || 'note',
      message: item.message || '',
      timestamp: item.timestamp,
      created_at: item.created_at,
    }));
  } catch (e) {
    console.warn('[JobChat Proxy] fetchJobCommunications failed:', e);
    return [];
  }
}

export async function sendJobCommunication(payload: {
  job_id: string;
  sender_name?: string;
  sender_role?: string;
  message_type?: string;
  message: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await serverCall('addJobTimelineEvent', {
      jobId: payload.job_id,
      message: payload.message,
      actorName: payload.sender_name,
      actorRole: payload.sender_role,
      mode: payload.message_type === 'revision' ? 'revision' : 'note',
    });
    if (!res?.success) {
      return { success: false, error: res?.message || 'Failed to send message.' };
    }
    return { success: true, data: res.event || res.data || null };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to send message.' };
  }
}
