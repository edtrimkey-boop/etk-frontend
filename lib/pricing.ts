/**
 * Centralized Real-time Pricing Engine for Ed-Trim Key
 * Directly synced with Supabase `pricing_master` table.
 */

import { serverCall } from './api-client';

export interface PricingTier {
  id?: string;
  service_name: string;
  plan_type?: string;
  base_rate: number;
  discount_percent: number;
  final_rate: number;
  unit_measure?: string;
  active?: boolean;
  min_quantity: number;
  max_quantity: number;
}

export const SUPABASE_URL = 'https://ypmnsgpohaaavbjdqjye.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_A-eYAoVILzcgjGWBbgTjuQ_gGPRHU-n';

/**
 * Exact verified fallback snapshot from production Supabase `pricing_master` table.
 * Used whenever network or offline conditions occur.
 */
export const FALLBACK_PRICING_MASTER: PricingTier[] = [
  // MCQ Paper
  {
    id: '45431520-af2d-469c-93fc-39f342fa4a8f',
    service_name: 'MCQ',
    plan_type: 'Starter',
    base_rate: 200.0,
    discount_percent: 25.0,
    final_rate: 150.0,
    unit_measure: 'Per Paper',
    active: true,
    min_quantity: 1,
    max_quantity: 11,
  },
  {
    id: '1fe1bad9-4fc0-4ee9-9c1e-c3484f9d869d',
    service_name: 'MCQ',
    plan_type: 'Academic',
    base_rate: 200.0,
    discount_percent: 32.5,
    final_rate: 135.0,
    unit_measure: 'Per Paper',
    active: true,
    min_quantity: 12,
    max_quantity: 23,
  },
  {
    id: '3d636639-8976-4626-8752-aea95ed84112',
    service_name: 'MCQ',
    plan_type: 'Institutional',
    base_rate: 200.0,
    discount_percent: 50.0,
    final_rate: 100.0,
    unit_measure: 'Per Paper',
    active: true,
    min_quantity: 24,
    max_quantity: 99999,
  },

  // Maths Paper
  {
    id: 'e532a3ab-9d7a-4d72-b919-4b24c628db9b',
    service_name: 'Maths',
    plan_type: 'Starter',
    base_rate: 250.0,
    discount_percent: 28.0,
    final_rate: 180.0,
    unit_measure: 'Per Paper',
    active: true,
    min_quantity: 1,
    max_quantity: 11,
  },
  {
    id: '5da074a1-d1fc-4a89-ab2a-e5b2f9558a75',
    service_name: 'Maths',
    plan_type: 'Academic',
    base_rate: 250.0,
    discount_percent: 36.0,
    final_rate: 160.0,
    unit_measure: 'Per Paper',
    active: true,
    min_quantity: 12,
    max_quantity: 23,
  },
  {
    id: 'eb82f7a2-3cf2-4495-93dc-d8521a943243',
    service_name: 'Maths',
    plan_type: 'Institutional',
    base_rate: 250.0,
    discount_percent: 44.0,
    final_rate: 140.0,
    unit_measure: 'Per Paper',
    active: true,
    min_quantity: 24,
    max_quantity: 99999,
  },

  // Physics / Numerical Paper
  {
    id: 'f83bb0c5-0996-4bae-bc2b-b7e91b9f6b42',
    service_name: 'Physics / Numerical',
    plan_type: 'Starter',
    base_rate: 250.0,
    discount_percent: 28.0,
    final_rate: 180.0,
    unit_measure: 'Per Paper',
    active: true,
    min_quantity: 1,
    max_quantity: 11,
  },
  {
    id: 'e18f06a5-5177-44d3-ab60-face69b35290',
    service_name: 'Physics / Numerical',
    plan_type: 'Academic',
    base_rate: 250.0,
    discount_percent: 36.0,
    final_rate: 160.0,
    unit_measure: 'Per Paper',
    active: true,
    min_quantity: 12,
    max_quantity: 23,
  },
  {
    id: 'ae104d76-8370-4945-8c59-bd5be132c170',
    service_name: 'Physics / Numerical',
    plan_type: 'Institutional',
    base_rate: 250.0,
    discount_percent: 44.0,
    final_rate: 140.0,
    unit_measure: 'Per Paper',
    active: true,
    min_quantity: 24,
    max_quantity: 99999,
  },

  // Report Card
  {
    id: 'd6673848-55bf-4801-8364-748d7fb1dc0f',
    service_name: 'Report Card',
    plan_type: 'Regular',
    base_rate: 14.0,
    discount_percent: 35.71,
    final_rate: 9.0,
    unit_measure: 'Per Student',
    active: true,
    min_quantity: 1,
    max_quantity: 99999,
  },

  // Admit Card
  {
    id: 'c61c4095-f60b-4304-aa3e-e87cd93a4ed3',
    service_name: 'Admit Card',
    plan_type: 'Regular',
    base_rate: 10.0,
    discount_percent: 30.0,
    final_rate: 1.0,
    unit_measure: 'Per Student',
    active: true,
    min_quantity: 1,
    max_quantity: 99999,
  },

  // SMS
  {
    id: 'e12e1a85-b951-4337-99cd-79fbdb06f552',
    service_name: 'SMS',
    plan_type: 'Regular',
    base_rate: 0.45,
    discount_percent: 22.22,
    final_rate: 0.35,
    unit_measure: 'Per SMS',
    active: true,
    min_quantity: 1,
    max_quantity: 999999,
  },

  // App Subscriptions (Flat Rate Annual / One-Time)
  {
    id: '362b0cac-9a2b-463f-8dfa-4b653e349601',
    service_name: 'Admission System',
    plan_type: 'Annual',
    base_rate: 3000.0,
    discount_percent: 33.33,
    final_rate: 2000.0,
    unit_measure: 'Per Year',
    active: true,
    min_quantity: 1,
    max_quantity: 1,
  },
  {
    id: '432d9e26-b2b3-4995-af34-4c38c021d950',
    service_name: 'Attendance System',
    plan_type: 'Annual',
    base_rate: 2500.0,
    discount_percent: 20.0,
    final_rate: 2000.0,
    unit_measure: 'Per Year',
    active: true,
    min_quantity: 1,
    max_quantity: 1,
  },
  {
    id: 'e9037e1f-fb2f-4f94-a457-aef1b55b484b',
    service_name: 'Fee Collection',
    plan_type: 'Annual',
    base_rate: 4000.0,
    discount_percent: 37.5,
    final_rate: 2500.0,
    unit_measure: 'Per Year',
    active: true,
    min_quantity: 1,
    max_quantity: 1,
  },
  {
    id: 'e34fa86b-2233-4365-8dee-8686e572e2ab',
    service_name: 'AI Agent',
    plan_type: 'Annual',
    base_rate: 3000.0,
    discount_percent: 40.0,
    final_rate: 1800.0,
    unit_measure: 'Per Year',
    active: true,
    min_quantity: 1,
    max_quantity: 1,
  },
  {
    id: 'a4d73ddc-7a03-45ee-bc42-4e6193a1823d',
    service_name: 'AI Song',
    plan_type: 'Regular',
    base_rate: 1000.0,
    discount_percent: 50.0,
    final_rate: 500.0,
    unit_measure: 'Per Song',
    active: true,
    min_quantity: 1,
    max_quantity: 5,
  },
  {
    id: 'df3a36e7-c338-43b6-81e2-a46e21240425',
    service_name: 'Document Branding',
    plan_type: 'One-Time',
    base_rate: 400.0,
    discount_percent: 50.0,
    final_rate: 200.0,
    unit_measure: 'Per Document',
    active: true,
    min_quantity: 1,
    max_quantity: 10,
  },
  {
    id: 'd2edb3a0-fbd2-466a-bf7a-181954e9b687',
    service_name: 'Complete Apps Combo',
    plan_type: 'Intro Combo',
    base_rate: 8500.0,
    discount_percent: 11.76,
    final_rate: 7500.0,
    unit_measure: 'One-Time',
    active: true,
    min_quantity: 1,
    max_quantity: 1,
  },
];

/**
 * Service name mapping from frontend dropdowns to exact Supabase database records.
 */
export const DB_SERVICE_MAP: Record<string, string> = {
  'MCQ Paper': 'MCQ',
  'Math Paper': 'Maths',
  'Physics / Numerical Paper': 'Physics / Numerical',
  'Report Card': 'Report Card',
  'Admit Card': 'Admit Card',
  'SMS Cost': 'SMS',
  'SMS Top-up': 'SMS',
};

/**
 * Fetches real-time active pricing tiers directly from Supabase REST endpoint.
 * Fallbacks cleanly to gateway serverCall or verified database snapshot.
 */
export async function fetchLivePricingMaster(): Promise<{ data: PricingTier[]; source: 'supabase_live' | 'gateway' | 'fallback' }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/pricing_master?select=*&active=eq.true`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return { data, source: 'supabase_live' };
      }
    }
  } catch (err) {
    console.warn('[Pricing] Supabase direct fetch failed, trying backend gateway:', err);
  }

  try {
    const gatewayRes = await serverCall<PricingTier[]>('getPricingMaster');
    if (gatewayRes && gatewayRes.success && Array.isArray(gatewayRes.data) && gatewayRes.data.length > 0) {
      return { data: gatewayRes.data, source: 'gateway' };
    }
  } catch (err) {
    console.warn('[Pricing] Gateway fetch failed, using fallback master:', err);
  }

  return { data: FALLBACK_PRICING_MASTER, source: 'fallback' };
}

export interface CalculationResult {
  matchingRow: PricingTier | null;
  baseRate: number;
  discountPct: number;
  finalRate: number;
  finalAmount: number;
  unitMeasure: string;
  planType: string;
  actualQty: number;
}

/**
 * Pure calculation function replicating `index.html:calculateValue` exactly.
 */
export function calculateServicePrice(params: {
  serviceSelect: string;
  rechargeQuantity: number;
  customUnitToggle: boolean;
  paperUnitInput: number;
  singleAppSelect: string;
  pricingMaster: PricingTier[];
}): CalculationResult {
  const { serviceSelect, rechargeQuantity, customUnitToggle, paperUnitInput, singleAppSelect, pricingMaster } = params;

  let actualQty = rechargeQuantity > 0 ? rechargeQuantity : 0;
  const checkQty = actualQty > 0 ? actualQty : 1;

  let matchingRow: PricingTier | null = null;

  if (serviceSelect === 'App Subscriptions') {
    // Match subscription service from singleAppSelect (e.g. 'Admission System', 'Attendance System', etc.)
    matchingRow =
      pricingMaster.find((r) => r.service_name.toLowerCase().includes(singleAppSelect.toLowerCase())) ||
      pricingMaster.find((r) => r.service_name === singleAppSelect) ||
      null;
    actualQty = 1; // Subscriptions are flat rate
  } else {
    const dbName = DB_SERVICE_MAP[serviceSelect] || serviceSelect;

    // Filter available tiers for the service
    const availableTiers = pricingMaster.filter(
      (r) =>
        r.service_name.toLowerCase() === dbName.toLowerCase() ||
        r.service_name.toLowerCase() === serviceSelect.toLowerCase()
    );

    if (availableTiers.length > 0) {
      // Find tier matching the quantity range
      matchingRow = availableTiers.find((r) => checkQty >= r.min_quantity && checkQty <= r.max_quantity) || null;

      // Failsafe: If quantity exceeds max, pick the highest tier (Enterprise/Bulk)
      if (!matchingRow) {
        matchingRow = availableTiers.reduce((prev, current) =>
          prev.max_quantity > current.max_quantity ? prev : current
        );
      }
    }
  }

  if (!matchingRow) {
    return {
      matchingRow: null,
      baseRate: 0,
      discountPct: 0,
      finalRate: 0,
      finalAmount: 0,
      unitMeasure: 'Unit',
      planType: 'Standard',
      actualQty,
    };
  }

  let baseRate = Number(matchingRow.base_rate) || 0;
  const discountPct = Number(matchingRow.discount_percent) || 0;
  let finalRate = Number(matchingRow.final_rate) || 0;
  const unitMeasure = matchingRow.unit_measure || 'Unit';
  const planType = matchingRow.plan_type || 'Standard';

  // Apply >25 questions custom multiplier for paper types
  if (serviceSelect.includes('Paper') && customUnitToggle) {
    const customUnits = paperUnitInput > 0 ? paperUnitInput : 25;
    const multiplier = customUnits / 25;
    baseRate *= multiplier;
    finalRate *= multiplier;
  }

  const finalAmount = finalRate * actualQty;

  return {
    matchingRow,
    baseRate,
    discountPct,
    finalRate,
    finalAmount,
    unitMeasure,
    planType,
    actualQty,
  };
}

export interface InstituteQuotaRecord {
  id?: string;
  institute_code: string;
  institute_name?: string;
  plan_type?: string;
  status?: string;
  papers_total: number;
  papers_left: number;
  rc_total: number;
  rc_left: number;
  ac_total: number;
  ac_left: number;
  sms_total: number;
  sms_remaining: number;
}

/**
 * Fetch live quota allocations directly from Supabase `institutes` table.
 */
export async function fetchInstituteQuotas(instCode: string = 'KPS'): Promise<InstituteQuotaRecord | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/institutes?institute_code=eq.${encodeURIComponent(instCode)}&limit=1`,
      {
        method: 'GET',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0] as InstituteQuotaRecord;
      }
    }
  } catch (err) {
    console.warn('[Quota] Supabase fetch error:', err);
  }
  return null;
}
