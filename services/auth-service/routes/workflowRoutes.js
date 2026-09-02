/**
 * Approval workflows, work-mode requests, employee site assignments
 */
const express = require('express');
const { supabase } = require('../config/supabase');
const { requirePermission } = require('../lib/permissions');
const { normalizeDepartmentName, toLookupKey } = require('../lib/orgNormalize');

/** Resolve a department UUID from an id or a (possibly display) name in a company. */
async function resolveDepartmentId({ department_id, department }, companyId) {
  if (department_id) return String(department_id);
  const raw = String(department || '').trim();
  if (!raw || !companyId) return null;
  const key = toLookupKey(normalizeDepartmentName(raw) || raw);
  const { data } = await supabase
    .from('departments')
    .select('id, name, normalized_name')
    .eq('company_id', companyId);
  const row = (data || []).find(
    (d) =>
      toLookupKey(d.normalized_name) === key ||
      toLookupKey(normalizeDepartmentName(d.name) || d.name) === key
  );
  return row?.id ? String(row.id) : null;
}
const {
  ensureDefaultWorkflows,
  getWorkflowForRequestType,
  initializeApprovalSteps,
  getApprovalProgress,
  processApprovalStep,
  REQUEST_TYPES,
  mapLeaveTypeToRequestType,
} = require('../lib/approvalEngine');

const router = express.Router();

const ROLES = { SUPER_ADMIN: 'super_admin', MANAGER: 'manager', EMPLOYEE: 'employee' };

// Identity resolved via lib/resolveRequester inside withTenantContext.

async function withTenantContext(req, res) {
  const { resolveRequester } = require('../lib/resolveRequester');
  const requesterIdentity = await resolveRequester(req);
  if (!requesterIdentity?.uid) {
    res.status(401).json({ success: false, error: 'Authentication expired. Please sign in again.' });
    return null;
  }
  const { data: user } = await supabase
    .from('users')
    .select('uid, username, email, role, department, company_id, name')
    .eq('uid', requesterIdentity.uid)
    .eq('is_active', true)
    .maybeSingle();
  if (!user?.company_id) {
    res.status(403).json({ success: false, error: 'Tenant scope required' });
    return null;
  }
  return { requester: user, companyId: user.company_id };
}

async function requireAdminPermission(requester, key, res) {
  return requirePermission(supabase, requester, key, res);
}

function requireSuperAdmin(requester, res) {
  if (requester.role !== ROLES.SUPER_ADMIN) {
    res.status(403).json({ success: false, error: 'Super admin required' });
    return false;
  }
  return true;
}

// ── Approval workflows ────────────────────────────────────────────────────────

router.get('/approval-workflows', async (req, res) => {
  const ctx = await withTenantContext(req, res);
  if (!ctx) return;
  const { requester, companyId } = ctx;
  if (!(await requireAdminPermission(requester, 'manage_approval_workflows', res))) return;
  try {
    await ensureDefaultWorkflows(supabase, companyId);
    const { data: workflows, error } = await supabase
      .from('approval_workflows')
      .select('id, request_type, name, is_active, updated_at')
      .eq('company_id', companyId)
      .order('request_type');
    if (error) throw error;

    const withSteps = await Promise.all(
      (workflows || []).map(async (wf) => {
        const { data: steps } = await supabase
          .from('approval_workflow_steps')
          .select('id, step_order, step_label, approver_role')
          .eq('workflow_id', wf.id)
          .order('step_order');
        return { ...wf, steps: steps || [] };
      })
    );

    res.json({ success: true, data: withSteps });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/approval-workflows/:requestType', async (req, res) => {
  const ctx = await withTenantContext(req, res);
  if (!ctx) return;
  const { requester, companyId } = ctx;
  if (!requireSuperAdmin(requester, res)) return;
  if (!(await requireAdminPermission(requester, 'manage_approval_workflows', res))) return;

  const { requestType } = req.params;
  const { name, steps } = req.body;
  if (!Array.isArray(steps) || steps.length === 0) {
    return res.status(400).json({ success: false, error: 'At least one approval step is required' });
  }

  try {
    const sorted = [...steps].sort((a, b) => a.step_order - b.step_order);
    for (let i = 0; i < sorted.length; i++) {
      sorted[i].step_order = i + 1;
      if (!sorted[i].step_label || !sorted[i].approver_role) {
        return res.status(400).json({ success: false, error: 'Each step needs a label and approver role' });
      }
    }

    let { data: wf } = await supabase
      .from('approval_workflows')
      .select('id')
      .eq('company_id', companyId)
      .eq('request_type', requestType)
      .maybeSingle();

    if (!wf) {
      const { data: created, error: cErr } = await supabase
        .from('approval_workflows')
        .insert({
          company_id: companyId,
          request_type: requestType,
          name: name || requestType.replace(/_/g, ' '),
        })
        .select('id')
        .single();
      if (cErr) throw cErr;
      wf = created;
    } else if (name) {
      await supabase.from('approval_workflows').update({ name, updated_at: new Date().toISOString() }).eq('id', wf.id);
    }

    await supabase.from('approval_workflow_steps').delete().eq('workflow_id', wf.id);
    const rows = sorted.map((s) => ({
      workflow_id: wf.id,
      step_order: s.step_order,
      step_label: s.step_label,
      approver_role: s.approver_role,
    }));
    const { error: sErr } = await supabase.from('approval_workflow_steps').insert(rows);
    if (sErr) throw sErr;

    const updated = await getWorkflowForRequestType(supabase, companyId, requestType);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/approval-workflows/:requestType/audit', async (req, res) => {
  const ctx = await withTenantContext(req, res);
  if (!ctx) return;
  const { requester, companyId } = ctx;
  if (!(await requireAdminPermission(requester, 'manage_approval_workflows', res))) return;
  try {
    const { data, error } = await supabase
      .from('approval_audit_logs')
      .select('*')
      .eq('company_id', companyId)
      .eq('request_type', req.params.requestType)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Work mode requests ────────────────────────────────────────────────────────

router.get('/work-mode-requests', async (req, res) => {
  const ctx = await withTenantContext(req, res);
  if (!ctx) return;
  const { requester, companyId } = ctx;
  if (!(await requireAdminPermission(requester, 'view_work_mode_requests', res))) return;
  try {
    let query = supabase
      .from('work_mode_requests')
      .select('*')
      .eq('company_id', companyId)
      .order('requested_at', { ascending: false });
    if (requester.role === ROLES.MANAGER) {
      const { data: deptUsers } = await supabase
        .from('users')
        .select('uid')
        .eq('company_id', companyId)
        .eq('department', requester.department);
      const uids = (deptUsers || []).map((u) => u.uid);
      query = query.in('employee_uid', uids.length ? uids : ['00000000-0000-0000-0000-000000000000']);
    }
    const { data, error } = await query;
    if (error) throw error;

    const enriched = await Promise.all(
      (data || []).map(async (row) => {
        const progress = await getApprovalProgress(supabase, REQUEST_TYPES.REMOTE_WORK, row.id);
        const { data: emp } = await supabase
          .from('users')
          .select('name, username, email, department')
          .eq('uid', row.employee_uid)
          .maybeSingle();
        return { ...row, employee: emp, approvalProgress: progress };
      })
    );
    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/work-mode-requests/:id', async (req, res) => {
  const ctx = await withTenantContext(req, res);
  if (!ctx) return;
  const { requester, companyId } = ctx;
  const { status, admin_notes } = req.body;
  const permissionKey = status === 'approved' ? 'approve_work_mode' : status === 'rejected' ? 'reject_work_mode' : null;
  if (!permissionKey) return res.status(400).json({ success: false, error: 'status must be approved or rejected' });
  if (!(await requireAdminPermission(requester, permissionKey, res))) return;

  try {
    const { data: row } = await supabase
      .from('work_mode_requests')
      .select('*')
      .eq('id', req.params.id)
      .eq('company_id', companyId)
      .single();
    if (!row) return res.status(404).json({ success: false, error: 'Request not found' });
    if (row.status !== 'pending') return res.status(400).json({ success: false, error: 'Request already processed' });

    let progress = await getApprovalProgress(supabase, REQUEST_TYPES.REMOTE_WORK, row.id);
    if (!progress.length) {
      const init = await initializeApprovalSteps(supabase, {
        companyId,
        requestType: REQUEST_TYPES.REMOTE_WORK,
        requestId: row.id,
        employeeUid: row.employee_uid,
      });
      if (init.workflowId) {
        await supabase.from('work_mode_requests').update({ workflow_id: init.workflowId }).eq('id', row.id);
      }
    }

    const action = status === 'approved' ? 'approved' : 'rejected';
    const result = await processApprovalStep(supabase, {
      companyId,
      requestType: REQUEST_TYPES.REMOTE_WORK,
      requestId: row.id,
      employeeUid: row.employee_uid,
      requester,
      action,
      notes: admin_notes,
      onFinalApprove: async () => {
        await supabase
          .from('users')
          .update({ work_mode: row.requested_work_mode, updated_at: new Date().toISOString() })
          .eq('uid', row.employee_uid)
          .eq('company_id', companyId);
      },
    });

    const finalStatus = result.status === 'approved' && result.final ? 'approved' : result.status === 'rejected' ? 'rejected' : 'pending';
    const updates = {
      status: finalStatus,
      current_step: result.currentStep,
      admin_notes: admin_notes || null,
    };
    if (result.final) {
      updates.processed_at = new Date().toISOString();
      updates.processed_by = requester.username || requester.email;
    }
    await supabase.from('work_mode_requests').update(updates).eq('id', row.id);

    res.json({ success: true, data: { ...result, status: finalStatus } });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ── Employee site assignments ─────────────────────────────────────────────────

router.get('/employee-sites', async (req, res) => {
  const ctx = await withTenantContext(req, res);
  if (!ctx) return;
  const { requester, companyId } = ctx;
  if (!(await requireAdminPermission(requester, 'manage_geofencing', res))) return;
  const { employee_uid } = req.query;
  try {
    let query = supabase
      .from('employee_sites')
      .select('id, employee_uid, site_id, created_at, sites(id, name, latitude, longitude, radius, department_id, company_id)')
      .order('created_at', { ascending: false });
    if (employee_uid) query = query.eq('employee_uid', employee_uid);

    const { data, error } = await query;
    if (error) throw error;

    const filtered = (data || []).filter((row) => row.sites?.company_id === companyId);
    const scoped = requester.role === ROLES.MANAGER
      ? await (async () => {
          const managerDeptId = await resolveDepartmentId(requester, companyId);
          if (!managerDeptId) return [];
          const { data: deptUsers } = await supabase
            .from('users')
            .select('uid, department_id, department')
            .eq('company_id', companyId);
          const uidSet = new Set();
          for (const u of deptUsers || []) {
            const uDeptId = u.department_id
              ? String(u.department_id)
              : await resolveDepartmentId({ department: u.department }, companyId);
            if (uDeptId === managerDeptId) uidSet.add(String(u.uid));
          }
          return filtered.filter((r) => uidSet.has(String(r.employee_uid)));
        })()
      : filtered;

    const uids = [...new Set(scoped.map((row) => row.employee_uid).filter(Boolean))];
    let peopleByUid = new Map();
    if (uids.length) {
      const { data: people } = await supabase
        .from('users')
        .select('uid, name, username, department, department_id')
        .eq('company_id', companyId)
        .in('uid', uids);
      peopleByUid = new Map((people || []).map((person) => [String(person.uid), person]));
    }

    const payload = scoped.map((row) => {
      const person = peopleByUid.get(String(row.employee_uid));
      return {
        ...row,
        employee_name: person?.name || person?.username || null,
        employee_username: person?.username || null,
        employee_department: person?.department || null,
        employee_department_id: person?.department_id || null,
      };
    });

    res.json({ success: true, data: payload });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/employee-sites/:employeeUid', async (req, res) => {
  const ctx = await withTenantContext(req, res);
  if (!ctx) return;
  const { requester, companyId } = ctx;
  if (!(await requireAdminPermission(requester, 'manage_geofencing', res))) return;
  const { site_ids: siteIds } = req.body;
  if (!Array.isArray(siteIds)) {
    return res.status(400).json({ success: false, error: 'site_ids array required' });
  }
  try {
    const { data: employee } = await supabase
      .from('users')
      .select('uid, department, department_id, company_id')
      .eq('uid', req.params.employeeUid)
      .eq('company_id', companyId)
      .single();
    if (!employee) return res.status(404).json({ success: false, error: 'Employee not found' });

    let managerDeptId = null;
    if (requester.role === ROLES.MANAGER) {
      managerDeptId = await resolveDepartmentId(requester, companyId);
      const employeeDeptId = await resolveDepartmentId(employee, companyId);
      if (!managerDeptId || employeeDeptId !== managerDeptId) {
        return res
          .status(403)
          .json({ success: false, error: 'Managers can only assign their department employees' });
      }
    }

    if (siteIds.length > 0) {
      let siteQuery = supabase.from('sites').select('id, department_id').eq('company_id', companyId).in('id', siteIds);
      const { data: sites } = await siteQuery;
      if ((sites || []).length !== siteIds.length) {
        return res.status(400).json({ success: false, error: 'One or more sites are invalid for this company' });
      }
      if (managerDeptId && (sites || []).some((s) => String(s.department_id) !== managerDeptId)) {
        return res
          .status(403)
          .json({ success: false, error: 'Managers can only assign employees to their department sites' });
      }
    }

    await supabase.from('employee_sites').delete().eq('employee_uid', employee.uid);
    if (siteIds.length > 0) {
      const rows = siteIds.map((site_id) => ({ employee_uid: employee.uid, site_id }));
      const { error } = await supabase.from('employee_sites').insert(rows);
      if (error) throw error;
    }

    const { data: assigned } = await supabase
      .from('employee_sites')
      .select('id, site_id, sites(id, name, latitude, longitude, radius)')
      .eq('employee_uid', employee.uid);
    res.json({ success: true, data: assigned || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/employee-sites/:id', async (req, res) => {
  const ctx = await withTenantContext(req, res);
  if (!ctx) return;
  const { requester, companyId } = ctx;
  if (!(await requireAdminPermission(requester, 'manage_geofencing', res))) return;
  try {
    const { data: row } = await supabase
      .from('employee_sites')
      .select('id, employee_uid, sites(company_id)')
      .eq('id', req.params.id)
      .maybeSingle();
    if (!row || row.sites?.company_id !== companyId) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }
    await supabase.from('employee_sites').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
