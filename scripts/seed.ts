import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';

// Lightweight zero-dependency .env loader
function loadLocalEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
      break;
    }
  }
}

loadLocalEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('\n❌ ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env or .env.local to run the seed script.');
  console.error('Please configure your Supabase credentials before running `npm run seed`.\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function hash(pwd: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pwd, salt);
}

// Inline SVG placeholder generator for clean machine cards
function generateMachineSvg(name: string, category: string, primaryColor: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e293b" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>
      <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.8" />
        <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0.2" />
      </linearGradient>
    </defs>
    <rect width="600" height="400" fill="url(#grad)" rx="16"/>
    <circle cx="300" cy="180" r="80" fill="${primaryColor}" fill-opacity="0.15" stroke="${primaryColor}" stroke-width="2" stroke-dasharray="6 6"/>
    <path d="M275 180 L325 180 M300 155 L300 205" stroke="${primaryColor}" stroke-width="4" stroke-linecap="round"/>
    <rect x="250" y="130" width="100" height="100" rx="12" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-opacity="0.5"/>
    <text x="300" y="295" font-family="system-ui, sans-serif" font-size="24" font-weight="700" fill="#f8fafc" text-anchor="middle">${name}</text>
    <rect x="240" y="315" width="120" height="26" rx="13" fill="url(#glow)"/>
    <text x="300" y="333" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#ffffff" text-anchor="middle" letter-spacing="1">${category.toUpperCase()}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

async function seed() {
  console.log('🚀 Starting Anubhav database seed...');

  // 1. Ensure storage bucket exists
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const hasMedia = buckets?.some(b => b.id === 'anubhav-media');
    if (!hasMedia) {
      console.log('Creating storage bucket: anubhav-media');
      await supabase.storage.createBucket('anubhav-media', { public: true });
    }
  } catch (err) {
    console.warn('Note on storage bucket check:', (err as Error).message);
  }

  // 2. Organization: Aurobindo Manufacturing
  const orgName = 'Aurobindo Manufacturing';
  const orgPasswordHash = await hash('aurobindo47');
  const orgDetails = {
    name: orgName,
    password_hash: orgPasswordHash,
    org_code: 'ORG-AUR470',
    logo_url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=200&h=200&fit=crop',
    industry_type: 'Heavy Industrial & Precision Manufacturing',
    contact_phone: '+91 80 2345 6789',
    org_email: 'plant.operations@aurobindo-mfg.com',
    admin_name: 'Aurobindo Plant Operations',
    address: 'Plot 47, Peenya Industrial Area, Phase II, Bengaluru, Karnataka 560058',
    description: 'Premier smart manufacturing plant specializing in precision turned shafts, high-tonnage hydraulic forming, and automated production cells.',
  };

  let { data: org } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('name', orgName)
    .maybeSingle();

  if (!org) {
    console.log(`Creating organization: ${orgName}`);
    const { data: newOrg, error: orgErr } = await supabase
      .from('organizations')
      .insert([orgDetails])
      .select('id, name')
      .single();
    if (orgErr) throw orgErr;
    org = newOrg;
  } else {
    console.log(`Organization "${orgName}" already exists. Updating details.`);
    await supabase.from('organizations').update(orgDetails).eq('id', org.id);
  }

  const orgId = org!.id;

  // 3. Employees
  // Requirements:
  // - Mukesh: 2511377 / mukesh_siva
  // - 5 additional realistic employees (senior ones 15-25 yrs exp, plus 1-2 freshers)
  const defaultEmpHash = await hash('factory2024');
  const mukeshHash = await hash('mukesh_siva');

  const employeesSeed = [
    {
      employee_code: '2511377',
      password_hash: mukeshHash,
      full_name: 'Mukesh Siva',
      designation: 'Senior Production Supervisor',
      department: 'Machining & Fabrication',
      experience_years: 18,
      phone: '+91 98401 23456',
      email: 'mukesh@aurobindo-mfg.com',
      joined_on: '2008-04-12',
      bio: 'Over 18 years on the shop floor mastering precision lathe tolerances, pneumatic lines, and CNC cycle optimizations. Passionate about machine acoustics and safety mentoring.',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
    },
    {
      employee_code: 'EMP-1002',
      password_hash: defaultEmpHash,
      full_name: 'Rajesh Sharma',
      designation: 'Master Machinist & Tooling Lead',
      department: 'Heavy Machining',
      experience_years: 24,
      phone: '+91 98200 45678',
      email: 'rajesh.sharma@aurobindo-mfg.com',
      joined_on: '2002-01-15',
      bio: '24 years maintaining high-load hydraulic presses and custom lathe chuck fixtures. Knows every vibration quirk by ear.',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
    },
    {
      employee_code: 'EMP-1003',
      password_hash: defaultEmpHash,
      full_name: 'Anand Kulkarni',
      designation: 'Chief Thermal & Boiler Specialist',
      department: 'Plant Utilities',
      experience_years: 21,
      phone: '+91 98311 98765',
      email: 'anand.k@aurobindo-mfg.com',
      joined_on: '2005-09-01',
      bio: 'High-pressure steam boiler veteran. Certified in thermodynamic safety, safety valve calibration, and feed-water deaeration.',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
    },
    {
      employee_code: 'EMP-1004',
      password_hash: defaultEmpHash,
      full_name: 'Sunita Mehra',
      designation: 'Automation & Controls Engineer',
      department: 'Mechatronics & Robotics',
      experience_years: 15,
      phone: '+91 98450 11223',
      email: 'sunita.m@aurobindo-mfg.com',
      joined_on: '2011-03-20',
      bio: 'Specialist in conveyor VFD synchronized timing, CNC optical scale alignments, and pneumatic interlocks.',
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces',
    },
    {
      employee_code: 'EMP-1005',
      password_hash: defaultEmpHash,
      full_name: 'Praveen Nair',
      designation: 'Junior Mechanical Technician (Fresher)',
      department: 'Machining & Fabrication',
      experience_years: 1,
      phone: '+91 97410 77889',
      email: 'praveen.n@aurobindo-mfg.com',
      joined_on: '2025-06-10',
      bio: 'Recent mechanical graduate from Government Polytechnic. Eager learner currently shadowing senior machinists on Lathe #3 and CNC Mill #1.',
      avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=faces',
    },
    {
      employee_code: 'EMP-1006',
      password_hash: defaultEmpHash,
      full_name: 'Vikram Joshi',
      designation: 'Trainee Maintenance Associate (Fresher)',
      department: 'Plant Maintenance',
      experience_years: 2,
      phone: '+91 96112 33445',
      email: 'vikram.j@aurobindo-mfg.com',
      joined_on: '2024-08-01',
      bio: 'Assisting with preventive maintenance rounds, lubrication checklists, and pneumatic line drain checks across the main shed.',
      avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&h=200&fit=crop&crop=faces',
    },
  ];

  const employeeMap: Record<string, string> = {};

  for (const empData of employeesSeed) {
    let { data: existing } = await supabase
      .from('employees')
      .select('id, employee_code')
      .eq('org_id', orgId)
      .eq('employee_code', empData.employee_code)
      .maybeSingle();

    const isSenior = empData.experience_years >= 10;

    if (!existing) {
      const { data: created, error } = await supabase
        .from('employees')
        .insert([{ ...empData, org_id: orgId, is_senior: isSenior }])
        .select('id, employee_code')
        .single();
      if (error) throw error;
      existing = created;
      console.log(`Created employee: ${empData.full_name} (${empData.employee_code})`);
    } else {
      console.log(`Employee ${empData.employee_code} exists. Updating details.`);
      await supabase
        .from('employees')
        .update({
          full_name: empData.full_name,
          designation: empData.designation,
          department: empData.department,
          experience_years: empData.experience_years,
          phone: empData.phone,
          email: empData.email,
          bio: empData.bio,
          avatar_url: empData.avatar_url,
          password_hash: empData.password_hash,
          is_senior: isSenior,
        })
        .eq('id', existing.id);
    }
    employeeMap[empData.employee_code] = existing!.id;
  }

  // 4. Machines
  // Lathe #3, Hydraulic Press #2, Conveyor Belt A, CNC Mill #1, Air Compressor #1, Industrial Boiler #1
  const machinesSeed = [
    {
      name: 'Lathe #3',
      category: 'Turning & Machining',
      department: 'Machining & Fabrication',
      status: 'active',
      gallery: [generateMachineSvg('Lathe #3', 'Turning', '#059669')],
      description: 'Heavy-duty industrial center lathe used for precision shafts, threading, and turning large alloy billets up to 1200mm bed length.',
      image_url: generateMachineSvg('Lathe #3', 'Turning', '#059669'),
      specifications: 'Bed Length: 1500mm | Swing Over Bed: 400mm | Spindle Speed: 45 - 2000 RPM (12 gears) | Motor: 7.5 HP 3-Phase 415V | Chuck: 3-Jaw Self-Centering & 4-Jaw Independent',
      common_issues: 'Tailstock drift under heavy thermal loads after 2+ hours continuous roughing; headstock gear oil foaming if viscosity drops below ISO VG 68; chatter on thin-wall tubes when tool overhang exceeds 3x shank depth.',
      safety_notes: 'CRITICAL: Never leave the chuck key in the spindle socket. Tie back loose hair and roll sleeves past elbows. Always engage safety shield before spinning spindle above 800 RPM. Never clear curly swarf by hand; use a brass hook.',
    },
    {
      name: 'Hydraulic Press #2',
      category: 'Forming & Stamping',
      department: 'Heavy Machining',
      status: 'active',
      gallery: [generateMachineSvg('Hydraulic Press #2', 'Forming', '#2563eb')],
      description: '150-ton four-column hydraulic deep-drawing and blanking press with dual proportional servo valves and safety light curtains.',
      image_url: generateMachineSvg('Hydraulic Press #2', 'Forming', '#2563eb'),
      specifications: 'Max Tonnage: 150 Ton (1470 kN) | Ram Stroke: 450mm | Daylight: 700mm | Table Size: 900x800mm | Working Pressure: 25 MPa | Pump Motor: 15 kW',
      common_issues: 'Pressure drop at holding stage caused by solenoid spool seal wear (O-ring 70 Duro NBR); light curtain beam misalignment from floor vibration; high hydraulic oil temperature (>55°C) during summer double shifts.',
      safety_notes: 'MANDATORY: Two-hand anti-tie-down control must be tested each morning. Never enter daylight area without mechanical ram safety lock dog engaged. Check pressure relief valves monthly.',
    },
    {
      name: 'Conveyor Belt A',
      category: 'Material Handling',
      department: 'Mechatronics & Robotics',
      status: 'active',
      gallery: [generateMachineSvg('Conveyor Belt A', 'Conveyors', '#d97706')],
      description: 'Main assembly transfer conveyor connecting machining bay to quality inspection station with modular PVC belt and variable frequency drive.',
      image_url: generateMachineSvg('Conveyor Belt A', 'Conveyors', '#d97706'),
      specifications: 'Belt Width: 600mm | Total Length: 35 meters | Speed Range: 0.1 to 0.8 m/s | Belt Material: 3-ply oil-resistant PVC | Drive: Bonfiglioli helical gearbox + 3.7 kW Siemens VFD',
      common_issues: 'Belt tracking wander towards the motor drive drum when ambient humidity spikes; roller bearing seizing at drop zone #3 due to fine metal dust ingress; belt slipping on wet morning start-ups.',
      safety_notes: 'Emergency pull-wire cables run along both sides—verify trip switch test every Monday. Never crawl underneath the transfer junction while energized. Lockout/Tagout (LOTO) main disconnect before belt tensioning.',
    },
    {
      name: 'CNC Mill #1',
      category: 'CNC Machining',
      department: 'Machining & Fabrication',
      status: 'under_maintenance',
      gallery: [generateMachineSvg('CNC Mill #1', 'CNC Machining', '#7c3aed')],
      description: 'High-speed 3-axis vertical machining center (VMC) equipped with BT40 24-tool carousel and Fanuc 0i-MF Plus controller.',
      image_url: generateMachineSvg('CNC Mill #1', 'CNC Machining', '#7c3aed'),
      specifications: 'Travel: X=850mm, Y=510mm, Z=510mm | Spindle: 12,000 RPM Direct Drive 15kW | Tool Capacity: 24 Arm-type ATC | Controller: Fanuc 0i-MF Plus | Rapid Traverse: 36 m/min',
      common_issues: 'Z-axis zero drift if pneumatic counterbalance line falls below 5.5 bar; ATC tool change jam when tool taper has hardened coolant residue; coolant mist filter clogging causing fog in enclosure.',
      safety_notes: 'Interlock door bypass keys are strictly forbidden on production runs. Always dry-run (G00 25% single block) after tool pocket reassignment. High-pressure coolant jet can lacerate skin.',
    },
    {
      name: 'Air Compressor #1',
      category: 'Pneumatics & Utilities',
      department: 'Plant Utilities',
      status: 'active',
      gallery: [generateMachineSvg('Air Compressor #1', 'Pneumatics', '#0891b2')],
      description: 'Rotary screw air compressor with integrated refrigerated moisture dryer supplying clean compressed air to the entire fabrication bay.',
      image_url: generateMachineSvg('Air Compressor #1', 'Pneumatics', '#0891b2'),
      specifications: 'Free Air Delivery: 120 CFM @ 7.5 bar (108 psi) | Motor: 22 kW IE3 Premium Efficiency | Air Tank: 1000 Liters vertical receiver | Dryer Dewpoint: +3°C',
      common_issues: 'Moisture carryover into shop pneumatic headers when automatic drain solenoid sticks closed; oil separator element delta-P alarm above 0.8 bar; intake air filter choking in dry winds.',
      safety_notes: 'DANGER: Pressurized vessel up to 10 bar. Never unscrew fittings or sight glasses under pressure. Depressurize tank completely before oil changes. Wear ear protection within 3 meters.',
    },
    {
      name: 'Industrial Boiler #1',
      category: 'Steam & Thermal',
      department: 'Plant Utilities',
      status: 'active',
      gallery: [generateMachineSvg('Industrial Boiler #1', 'Boilers', '#dc2626')],
      description: '3-pass smoke tube horizontal steam boiler providing process steam for parts degreasing and surface coating wash tanks.',
      image_url: generateMachineSvg('Industrial Boiler #1', 'Boilers', '#dc2626'),
      specifications: 'Steam Output: 1500 kg/hr @ 10.5 bar | Fuel: Light Diesel Oil (LDO) / LPG Dual Burner | Water Capacity: 3200 Liters | Burner: Riello Modulating Dual Fuel',
      common_issues: 'Scale buildup on lower water tubes if softening plant TDS exceeds 3000 ppm; flame failure lockout triggered by soot on UV flame scanner eye; blowdown valve gland packing weeping.',
      safety_notes: 'EXTREME CAUTION: Perform gauge glass daily blow-down at 7:00 AM. If water level drops below lowest visible gauge mark, DO NOT pump cold water in; immediately trip burner fuel valve to prevent catastrophic thermal explosion.',
    },
  ];

  const machineMap: Record<string, string> = {};

  for (const mData of machinesSeed) {
    let { data: existing } = await supabase
      .from('machines')
      .select('id, name')
      .eq('org_id', orgId)
      .eq('name', mData.name)
      .maybeSingle();

    if (!existing) {
      const { data: created, error } = await supabase
        .from('machines')
        .insert([{ ...mData, org_id: orgId }])
        .select('id, name')
        .single();
      if (error) throw error;
      existing = created;
      console.log(`Created machine: ${mData.name}`);
    } else {
      console.log(`Machine ${mData.name} exists. Updating specs.`);
      await supabase
        .from('machines')
        .update({
          category: mData.category,
          department: mData.department,
          status: mData.status,
          gallery: mData.gallery,
          description: mData.description,
          image_url: mData.image_url,
          specifications: mData.specifications,
          common_issues: mData.common_issues,
          safety_notes: mData.safety_notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    }
    machineMap[mData.name] = existing!.id;
  }

  // 5. Entries: 18 realistic entries
  // Around 10 approved, 6 pending, 2 rejected, with 3 safety-critical
  // Content sounds like authentic shop-floor tips from seasoned experts!
  const mukeshId = employeeMap['2511377'];
  const rajeshId = employeeMap['EMP-1002'];
  const anandId = employeeMap['EMP-1003'];
  const sunitaId = employeeMap['EMP-1004'];
  const praveenId = employeeMap['EMP-1005'];
  const vikramId = employeeMap['EMP-1006'];

  const entriesSeed = [
    // 1. Lathe #3 Tailstock heat expansion (Mukesh - Approved - Safety Critical)
    {
      title: 'Lathe #3: Tailstock Loosens After 2 Hours of Heavy Turning',
      machine_name: 'Lathe #3',
      employee_id: mukeshId,
      status: 'approved' as const,
      is_safety_critical: true,
      tags: ['lathe', 'tailstock', 'vibration', 'thermal-expansion'],
      content_html: `<p><strong>Observation:</strong> During continuous roughing passes on EN24 steel billets, the tailstock quill begins to bind or chatter after approximately 120 minutes of runtime.</p>
<p><strong>Root Cause:</strong> Friction in the headstock warms the bed ways unevenly, causing a slight 0.04mm taper distortion along the center line. As the quill heats up, it expands into the revolving center taper.</p>
<p><strong>The Shop Trick:</strong></p>
<ol>
  <li><strong>Stop the spindle completely first</strong> before touching the quill clamp lock.</li>
  <li>Loosen the quill clamping lever exactly a quarter turn.</li>
  <li>Back off the handwheel by half a graduation (about 0.02mm) to relieve axial thrust.</li>
  <li>Allow 8 to 10 minutes for heat dissipation while lubricating the revolving center nipple with Shell Alvania EP2 grease.</li>
  <li>Re-snug the clamp firmly by hand without hammering the lever.</li>
</ol>
<p><em>Safety Warning:</em> Never adjust the tailstock while the chuck is turning. A sudden grab can throw a 40 kg billet off center!</p>`,
      content_text: `Lathe #3 vibrates after 2 hours: tailstock loosens from heat expansion; loosen a quarter turn and re-tighten after 10 minutes. Stop the spindle first. Never adjust the tailstock while the chuck is turning. A sudden grab can throw a 40 kg billet off center.`,
    },

    // 2. Lathe #3 Chatter suppression (Rajesh - Approved)
    {
      title: 'Eliminating Harmonic Chatter on Thin Brass Bushing IDs',
      machine_name: 'Lathe #3',
      employee_id: rajeshId,
      status: 'approved' as const,
      is_safety_critical: false,
      tags: ['lathe', 'chatter', 'tooling', 'brass'],
      content_html: `<p>When boring 80mm OD / 72mm ID brass sleeves, you will experience severe high-pitched squealing above 600 RPM due to thin-wall resonance.</p>
<p><strong>Solution:</strong> Wrap two heavy-duty rubber O-rings around the external diameter of the workpiece outside the chuck jaws. The elastomer absorbs harmonic frequency vibrations instantly. Drop speed to 480 RPM and use a positive rake CCMT 09T304 insert with 0.15mm/rev feed.</p>`,
      content_text: `When boring thin-wall brass bushings on Lathe #3, wrap two heavy rubber O-rings on the outer diameter to damp vibration resonance. Lower speed to 480 RPM with a positive rake insert.`,
    },

    // 3. Hydraulic Press #2 Tonnage Calibration (Rajesh - Approved - Safety Critical)
    {
      title: 'Hydraulic Press #2: Overcoming Morning Pressure Sluggishness',
      machine_name: 'Hydraulic Press #2',
      employee_id: rajeshId,
      status: 'approved' as const,
      is_safety_critical: true,
      tags: ['hydraulic', 'pressure', 'valves', 'morning-start'],
      content_html: `<p>During winter months (November-February), the ram fails to achieve full 150-ton blanking pressure on the first 10 cycles because the ISO VG 46 oil viscosity is thick around 18°C.</p>
<p><strong>Procedure:</strong></p>
<ul>
  <li>Turn on the tank heater 20 minutes prior to shift start.</li>
  <li>Cycle the ram in jog mode 5 times with no die loaded at minimum relief pressure.</li>
  <li>Check proportional valve solenoid B indicator LED. If orange instead of solid green, clean the DIN plug terminal with contact cleaner.</li>
</ul>
<p><strong>Safety Rule:</strong> Never bypass the dual light curtain or wedge a spacer behind the safety foot pedal.</p>`,
      content_text: `Hydraulic Press #2 morning sluggishness: cold hydraulic oil causes slow tonnage buildup. Run tank heaters 20 minutes before shift and jog 5 empty cycles. Never bypass the safety light curtain.`,
    },

    // 4. Hydraulic Press #2 Upper Die Centering (Mukesh - Approved)
    {
      title: 'Centering Upper Punch Tooling Without Shims',
      machine_name: 'Hydraulic Press #2',
      employee_id: mukeshId,
      status: 'approved' as const,
      is_safety_critical: false,
      tags: ['hydraulic', 'tooling', 'alignment', 'dies'],
      content_html: `<p>When setting up the 4-cavity punch die, never use paper or copper shims under the upper bolster. Instead, lower the ram under low-pressure creep mode onto four 50mm hardened ground gauge blocks positioned at the corners. Tighten the clamping T-bolts in a diagonal star pattern to 180 Nm.</p>`,
      content_text: `Upper punch tooling alignment on Hydraulic Press #2: lower ram in low-pressure creep mode onto ground gauge blocks and torque T-bolts diagonally to 180 Nm. Do not use loose shims.`,
    },

    // 5. Conveyor Belt A Tracking Fix (Sunita - Approved)
    {
      title: 'Conveyor Belt A: Quick Tracking Alignment When Drifting Left',
      machine_name: 'Conveyor Belt A',
      employee_id: sunitaId,
      status: 'approved' as const,
      is_safety_critical: false,
      tags: ['conveyor', 'tracking', 'maintenance', 'vfd'],
      content_html: `<p>If Conveyor Belt A starts rubbing against the left guide flange near Station 4, do not over-tighten the idler tension bolts.</p>
<p><strong>Fix:</strong> Adjust the tail pulley take-up screw on the <em>opposite</em> (right) side by 1.5 flats of the hex nut (approx 90 degrees). Let the belt cycle twice completely before making further micro-adjustments.</p>`,
      content_text: `Conveyor Belt A tracking left: adjust the right tail pulley take-up screw by 1.5 flats of the nut. Allow two full revolutions to verify alignment before making more adjustments.`,
    },

    // 6. Conveyor Belt A Motor Overheating (Sunita - Approved)
    {
      title: 'Preventing Bonfiglioli Gearbox Overheating on Continuous Runs',
      machine_name: 'Conveyor Belt A',
      employee_id: sunitaId,
      status: 'approved' as const,
      is_safety_critical: false,
      tags: ['conveyor', 'gearbox', 'lubrication'],
      content_html: `<p>If the drive gearbox casing temperature exceeds 65°C, check the breather plug on top of the casting. In 8 out of 10 cases, dried grease from cardboard carton dust seals the micro-holes, pressurizing the sump and forcing oil out past the lip seal.</p>`,
      content_text: `Conveyor Belt A gearbox overheating: check and clear the top breather plug of cardboard and metal dust. A clogged breather pressurizes the sump and blows the shaft seal.`,
    },

    // 7. CNC Mill #1 Tool Chipping Prevention (Mukesh - Approved)
    {
      title: 'CNC Mill #1: Preventing Corner Chipping on 10mm Carbide End Mills',
      machine_name: 'CNC Mill #1',
      employee_id: mukeshId,
      status: 'approved' as const,
      is_safety_critical: false,
      tags: ['cnc', 'milling', 'tool-life', 'coolant'],
      content_html: `<p>When pocketing AISI 4140 pre-hardened dies at 42 HRC, standard flood coolant causes thermal shock micro-fractures at the cutter corners.</p>
<p><strong>Recommendation:</strong> Switch to M07 high-pressure air blast with micro-lubrication (MQL) instead of flooded water-soluble oil. Increase radial stepover to 15% and ramp down feed by 20% on lead-in corners.</p>`,
      content_text: `CNC Mill #1 end mill chipping: on 42 HRC pre-hardened steel, switch from flood coolant to air blast M07 to avoid thermal shock micro-fractures. Use 15% radial stepover.`,
    },

    // 8. CNC Mill #1 Fanuc Error 414 Servo Alarm (Sunita - Approved)
    {
      title: 'Resolving Fanuc Alarm 414 (X-Axis Digital Servo Error)',
      machine_name: 'CNC Mill #1',
      employee_id: sunitaId,
      status: 'approved' as const,
      is_safety_critical: false,
      tags: ['cnc', 'fanuc', 'alarms', 'troubleshooting'],
      content_html: `<p>When Alarm 414 triggers on Monday mornings after cold weekends, check Diagnostic parameter #0200 bit 5 (OVL: overload) and bit 6 (LV: low voltage).</p>
<p>If bit 6 is 1, the 200V incoming phase voltage dipped below 180V when the neighboring annealing furnace ignited. Reset via CNC Reset button once voltage stabilizes at 415V.</p>`,
      content_text: `Fanuc Alarm 414 on CNC Mill #1: inspect Diagnostic #0200 bit 6 for incoming line voltage sag from adjacent furnace startup. Wait for voltage stabilization and press CNC Reset.`,
    },

    // 9. Air Compressor #1 Moisture Drain Maintenance (Anand - Approved)
    {
      title: 'Air Compressor #1: Daily Zero-Loss Drain Testing',
      machine_name: 'Air Compressor #1',
      employee_id: anandId,
      status: 'approved' as const,
      is_safety_critical: false,
      tags: ['compressor', 'pneumatics', 'drain', 'moisture'],
      content_html: `<p>Moisture inside the shop pneumatic lines will destroy the pneumatic solenoid valves on CNC Mill #1 and the robotic pick-and-place grippers.</p>
<p><strong>Daily Rule:</strong> At 08:30 AM, press the manual override test button on the Bekomat zero-loss auto-drain under the air receiver for 4 seconds. If only dry air hisses out, the float valve is clean. If yellowish oily emulsion discharges, clean the lower mesh strainer immediately.</p>`,
      content_text: `Air Compressor #1 daily drain check: test the Bekomat auto-drain for 4 seconds every morning. If yellowish oily emulsion discharges, clean the strainer to prevent water in CNC air lines.`,
    },

    // 10. Industrial Boiler #1 Low Water Trip Protocol (Anand - Approved - Safety Critical)
    {
      title: 'Industrial Boiler #1: Critical Low-Water Level Burner Trip Protocol',
      machine_name: 'Industrial Boiler #1',
      employee_id: anandId,
      status: 'approved' as const,
      is_safety_critical: true,
      tags: ['boiler', 'steam', 'safety-critical', 'low-water'],
      content_html: `<p><strong>EMERGENCY OPERATING INSTRUCTION:</strong></p>
<p>If the Mobrey magnetic level controller alarms and the gauge glass shows NO water meniscus:</p>
<ol>
  <li><strong>DO NOT START THE FEED PUMP UNDER ANY CIRCUMSTANCE.</strong> Pumping cold water onto red-hot dry boiler tubes produces instantaneous steam overpressure and shell rupture.</li>
  <li>Immediately depress the red Emergency Fuel Cutoff switch at the burner console.</li>
  <li>Close the main steam crown stop valve to hold internal pressure.</li>
  <li>Allow the boiler to cool naturally for at least 4 hours before inspecting the crown sheet and fusible plugs.</li>
  <li>Notify the plant safety director immediately.</li>
</ol>`,
      content_text: `CRITICAL SAFETY PROTOCOL for Industrial Boiler #1: If water level drops below gauge glass, DO NOT start the feed water pump. Cold water on overheated boiler tubes can cause a devastating explosion. Hit the red Emergency Fuel Cutoff switch immediately. Close main steam valve and allow 4 hours of natural cooling.`,
    },

    // 11. Industrial Boiler #1 TDS Blowdown Tuning (Anand - Pending)
    {
      title: 'Optimizing Boiler Bottom Blowdown Timing to Reduce Gas Consumption',
      machine_name: 'Industrial Boiler #1',
      employee_id: anandId,
      status: 'pending' as const,
      is_safety_critical: false,
      tags: ['boiler', 'energy-saving', 'blowdown'],
      content_html: `<p>Rather than performing two 60-second bottom blowdowns during high firing, shift to four short 15-second blowdowns spaced every two hours. This clears precipitated sludge without wasting sensible heat from 300 liters of treated hot water.</p>`,
      content_text: `Industrial Boiler #1: short 15-second blowdowns every two hours purge sludge more effectively than long 60-second blowdowns while saving boiler fuel.`,
    },

    // 12. Lathe #3 Parting Off Trick (Praveen - Pending)
    {
      title: 'Preventing Blade Breakage When Parting Off 50mm Stainless Steel',
      machine_name: 'Lathe #3',
      employee_id: praveenId,
      status: 'pending' as const,
      is_safety_critical: false,
      tags: ['lathe', 'parting', 'stainless-steel', 'fresher-tip'],
      content_html: `<p>Learned from senior technician Mukesh: when using a 3mm parting blade on SS 304, always set the cutting tip exactly 0.1mm above lathe center height. Feed gently at 0.04mm/rev and apply sulfurized neat oil with a brush.</p>`,
      content_text: `Lathe #3 parting off: set 3mm parting blade 0.1mm above center on SS 304 with continuous sulfurized neat oil brush lubrication.`,
    },

    // 13. Hydraulic Press #2 Micro-Switches Inspection (Vikram - Pending)
    {
      title: 'Routine Cleaning of Ram Top Dead Center Limit Switches',
      machine_name: 'Hydraulic Press #2',
      employee_id: vikramId,
      status: 'pending' as const,
      is_safety_critical: false,
      tags: ['hydraulic', 'limit-switch', 'preventive'],
      content_html: `<p>Wiping metal swarf and hydraulic mist off the top dead center (TDC) roller lever limit switch every Friday prevents ghost cycle stops.</p>`,
      content_text: `Weekly wipe-down of top dead center limit switches on Hydraulic Press #2 prevents intermittent ram cycling interruptions.`,
    },

    // 14. CNC Mill #1 Spindle Warmup Macro (Mukesh - Pending)
    {
      title: 'Morning Spindle Warmup G-Code Macro for 12,000 RPM Spindle',
      machine_name: 'CNC Mill #1',
      employee_id: mukeshId,
      status: 'pending' as const,
      is_safety_critical: false,
      tags: ['cnc', 'warmup', 'spindle', 'gcode'],
      content_html: `<p>Never run above 4,000 RPM immediately on a cold spindle. Run macro O9001: 5 mins at 2000 RPM, 5 mins at 6000 RPM, 3 mins at 10000 RPM with ceramic bearing oil-air lubrication cycle verified.</p>`,
      content_text: `CNC Mill #1 warmup routine: run O9001 macro graduating from 2000 to 10000 RPM over 13 minutes to distribute ceramic spindle bearing grease evenly before full cutting loads.`,
    },

    // 15. Conveyor Belt A Photoelectric Sensor Alignment (Vikram - Pending)
    {
      title: 'Aligning Retro-Reflective Sensors on Conveyor Station #2',
      machine_name: 'Conveyor Belt A',
      employee_id: vikramId,
      status: 'pending' as const,
      is_safety_critical: false,
      tags: ['conveyor', 'sensors', 'automation'],
      content_html: `<p>When shiny chrome parts pass Station #2, false triggers occur. Angle the polarized retro-reflective sensor 15 degrees off perpendicular to deflect direct specular reflections.</p>`,
      content_text: `Conveyor sensor false triggers on chrome parts: mount retro-reflective sensor at a 15 degree skew angle to eliminate direct glare false counts.`,
    },

    // 16. Air Compressor #1 Belt Tensioning (Praveen - Pending)
    {
      title: 'Checking V-Belt Deflection on Auxiliary Cooling Fan',
      machine_name: 'Air Compressor #1',
      employee_id: praveenId,
      status: 'pending' as const,
      is_safety_critical: false,
      tags: ['compressor', 'belts', 'fan'],
      content_html: `<p>A 10mm deflection under 4 kg thumb force at the midpoint between motor pulley and fan ensures no belt slip without placing excessive side-load on motor shaft bearings.</p>`,
      content_text: `Auxiliary cooling fan V-belt on Air Compressor #1: maintain 10mm deflection at 4kg force to prevent bearing fatigue.`,
    },

    // 17. Unapproved / Rejected entry 1 (Vikram - Rejected with reason)
    {
      title: 'Speeding up Lathe #3 by Disabling Spindle Interlock',
      machine_name: 'Lathe #3',
      employee_id: vikramId,
      status: 'rejected' as const,
      rejection_reason: 'VIOLATION OF PLANT SAFETY POLICY: Interlocks must NEVER be bypassed. This is an immediate disciplinary violation and creates catastrophic entanglement hazard.',
      is_safety_critical: true,
      tags: ['lathe', 'safety-violation', 'rejected'],
      content_html: `<p>To quickly gauge parts with micrometers while spindle slows down, place a magnetic wedge behind the chuck guard interlock limit switch.</p>`,
      content_text: `Bypassing chuck guard interlock to measure moving parts. (REJECTED FOR SEVERE SAFETY VIOLATION)`,
    },

    // 18. Unapproved / Rejected entry 2 (Praveen - Rejected with reason)
    {
      title: 'Using Kerosene as Degreaser on Hot Boiler Fittings',
      machine_name: 'Industrial Boiler #1',
      employee_id: praveenId,
      status: 'rejected' as const,
      rejection_reason: 'FIRE HAZARD: Kerosene has a flashpoint of 38-52°C. Using near hot boiler piping (180°C) is strictly prohibited. Use approved non-flammable water-based industrial detergent only.',
      is_safety_critical: true,
      tags: ['boiler', 'degreaser', 'rejected'],
      content_html: `<p>Spray kerosene from a pump bottle to cut through soot and baked oil on the boiler front door hinges while the burner is on low fire.</p>`,
      content_text: `Spraying kerosene on hot boiler fittings while burner operates. (REJECTED FOR HIGH FIRE RISK)`,
    },
  ];

  let approvedCount = 0;
  let pendingCount = 0;
  let rejectedCount = 0;
  let safetyCount = 0;

  for (const entryData of entriesSeed) {
    const machineId = machineMap[entryData.machine_name] || null;

    let { data: existing } = await supabase
      .from('entries')
      .select('id, title')
      .eq('org_id', orgId)
      .eq('title', entryData.title)
      .maybeSingle();

    const entryPayload = {
      org_id: orgId,
      employee_id: entryData.employee_id,
      machine_id: machineId,
      title: entryData.title,
      content_html: entryData.content_html,
      content_text: entryData.content_text,
      tags: entryData.tags,
      is_safety_critical: entryData.is_safety_critical,
      status: entryData.status,
      rejection_reason: 'rejection_reason' in entryData ? (entryData as any).rejection_reason : null,
      approved_at: entryData.status === 'approved' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
      thumbnail_url: null,
      attachments: [],
    };

    if (!existing) {
      const { error } = await supabase
        .from('entries')
        .insert([entryPayload]);
      if (error) throw error;
      console.log(`Created entry [${entryData.status}]: ${entryData.title}`);
    } else {
      console.log(`Entry exists: ${entryData.title}. Updating payload.`);
      await supabase
        .from('entries')
        .update(entryPayload)
        .eq('id', existing.id);
    }

    if (entryData.status === 'approved') approvedCount++;
    if (entryData.status === 'pending') pendingCount++;
    if (entryData.status === 'rejected') rejectedCount++;
    if (entryData.is_safety_critical) safetyCount++;
  }

  console.log('\n======================================================');
  console.log('✅ SEED COMPLETED SUCCESSFULLY!');
  console.log(`🏢 Organization: "${orgName}" (Password: aurobindo47)`);
  console.log(`👤 Primary Employee: Mukesh (Code: 2511377, Password: mukesh_siva)`);
  console.log(`👥 Total Employees Seeded: ${employeesSeed.length}`);
  console.log(`⚙️ Total Machines Seeded: ${machinesSeed.length}`);
  console.log(`📝 Total Entries: ${entriesSeed.length}`);
  console.log(`   - Approved: ${approvedCount}`);
  console.log(`   - Pending: ${pendingCount}`);
  console.log(`   - Rejected: ${rejectedCount}`);
  console.log(`   - Safety Critical: ${safetyCount}`);
  console.log('======================================================\n');
}

seed().catch((err) => {
  console.error('Seed script encountered an error:', err);
  process.exit(1);
});
