/**
 * Multi-step approval engine for leave and work-mode requests.
 */
const {
  REQUEST_TYPES,
  LEAVE_TYPE_TO_REQUEST_TYPE,
  APPROVER_ROLES,
  DEFAULT_WORKFLOW_TEMPLATES,
} = require('../../../shared/permissions/catalog.cjs');

async function writeApprovalAudit(supabase, entry) {
  try {
    await supabase.from('approval_audit_logs').insert({
      company_id: entry.companyId,
      request_type: entry.requestType,
      request_id: entry.requestId,
      actor_uid: entry.actorUid || null,
      actor_username: entry.actorUsername || null,
      action: entry.action,
      step_order: entry.stepOrder ?? null,
      details: entry.details || {},
    });
  } catch (err) {
    console.warn('[approvalEngine] audit write failed:', err.message);
  }
}

async function notifyUsers(supabase, { companyId, recipientUids, title, message, type = 'approval' }) {
  if (!recipientUids?.length) return;
  const rows = recipientUids.map((uid) => ({
    company_id: companyId,
    recipient_uid: uid,
    title,
    body: message,
    type,
    read: false,
  }));
  try {
    const { error } = await supabase.from('notifications').insert(rows);
    if (error) {
      console.warn('[approvalEngine] notification insert failed:', error.message);
    }
  } catch (err) {
    console.warn('[approvalEngine] notification insert failed:', err.message);
  }
}

async function ensureDefaultWorkflows(supabase, companyId) {
  for (const [requestType, steps] of Object.entries(DEFAULT_WORKFLOW_TEMPLATES)) {
    const { data: existing } = await supabase
      .from('approval_workflows')
      .select('id')
      .eq('company_id', companyId)
      .eq('request_type', requestType)
      .maybeSingle();
    if (existing) continue;

    const name = requestType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const { data: wf, error } = await supabase
      .from('approval_workflows')
      .insert({ company_id: companyId, request_type: requestType, name })
      .select('id')
      .single();
    if (error) {
      console.warn(`[approvalEngine] default workflow ${requestType}:`, error.message);
      continue;
    }
    const stepRows = steps.map((s) => ({
      workflow_id: wf.id,
      step_order: s.step_order,
      step_label: s.step_label,
      approver_role: s.approver_role,
    }));
    await supabase.from('approval_workflow_steps').insert(stepRows);
  }
}

async function getWorkflowForRequestType(supabase, companyId, requestType) {
  await ensureDefaultWorkflows(supabase, companyId);
  const { data: wf } = await supabase
    .from('approval_workflows')
    .select('id, request_type, name, is_active')
    .eq('company_id', companyId)
    .eq('request_type', requestType)
    .eq('is_active', true)
    .maybeSingle();
  if (!wf) return null;

  const { data: steps } = await supabase
    .from('approval_workflow_steps')
    .select('id, step_order, step_label, approver_role')
    .eq('workflow_id', wf.id)
    .order('step_order', { ascending: true });

  return { ...wf, steps: steps || [] };
}

async function initializeApprovalSteps(supabase, { companyId, requestType, requestId, employeeUid }) {
  const workflow = await getWorkflowForRequestType(supabase, companyId, requestType);
  if (!workflow?.steps?.length) return { workflowId: null, steps: [] };

  const rows = workflow.steps.map((s) => ({
    company_id: companyId,
    request_type: requestType,
    request_id: requestId,
    step_order: s.step_order,
    step_label: s.step_label,
    approver_role: s.approver_role,
    action: 'pending',
  }));

  const { error } = await supabase.from('approval_request_actions').insert(rows);
  if (error) throw error;

  const approvers = await resolveApproversForStep(supabase, workflow.steps[0], employeeUid, companyId);
  await notifyUsers(supabase, {
    companyId,
    recipientUids: approvers.map((a) => a.uid),
    title: 'Approval required',
    message: `A new ${requestType.replace(/_/g, ' ')} request needs your review.`,
  });

  return { workflowId: workflow.id, steps: workflow.steps };
}

async function getApprovalProgress(supabase, requestType, requestId) {
  const { data } = await supabase
    .from('approval_request_actions')
    .select('*')
    .eq('request_type', requestType)
    .eq('request_id', requestId)
    .order('step_order', { ascending: true });
  return data || [];
}

async function resolveApproversForStep(supabase, step, employeeUid, companyId) {
  const role = step.approver_role;

  if (role === APPROVER_ROLES.SUPER_ADMIN) {
    const { data } = await supabase
      .from('users')
      .select('uid, username, email')
      .eq('company_id', companyId)
      .eq('role', 'super_admin')
      .eq('is_active', true);
    return data || [];
  }

  const { data: employee } = await supabase
    .from('users')
    .select('uid, department')
    .eq('uid', employeeUid)
    .eq('company_id', companyId)
    .maybeSingle();

  if (role === APPROVER_ROLES.DEPARTMENT_MANAGER) {
    if (!employee?.department) return [];
    const { data } = await supabase
      .from('users')
      .select('uid, username, email')
      .eq('company_id', companyId)
      .eq('role', 'manager')
      .eq('department', employee.department)
      .eq('is_active', true);
    return data || [];
  }

  if (role === APPROVER_ROLES.HR) {
    const { data: managers } = await supabase
      .from('users')
      .select('uid, username, email')
      .eq('company_id', companyId)
      .eq('role', 'manager')
      .eq('is_active', true);
    const uids = (managers || []).map((m) => m.uid);
    if (!uids.length) return [];
    const { data: perms } = await supabase
      .from('manager_permissions')
      .select('manager_uid')
      .in('manager_uid', uids)
      .in('permission_key', ['approve_leave', 'approve_work_mode'])
      .eq('granted', true);
    const hrUids = new Set((perms || []).map((p) => p.manager_uid));
    return (managers || []).filter((m) => hrUids.has(m.uid));
  }

  return [];
}

async function canUserActOnStep(supabase, requester, step, employeeUid, companyId) {
  if (requester.role === 'super_admin') return true;
  const approvers = await resolveApproversForStep(supabase, step, employeeUid, companyId);
  return approvers.some((a) => a.uid === requester.uid);
}

async function processApprovalStep(supabase, {
  companyId,
  requestType,
  requestId,
  employeeUid,
  requester,
  action,
  notes,
  onFinalApprove,
}) {
  const progress = await getApprovalProgress(supabase, requestType, requestId);
  const pendingStep = progress.find((p) => p.action === 'pending');
  if (!pendingStep) {
    throw new Error('No pending approval step for this request');
  }

  const stepDef = {
    approver_role: pendingStep.approver_role,
    step_order: pendingStep.step_order,
    step_label: pendingStep.step_label,
  };

  const allowed = await canUserActOnStep(supabase, requester, stepDef, employeeUid, companyId);
  if (!allowed) {
    throw new Error('You are not authorized to act on this approval step');
  }

  if (action === 'rejected') {
    await supabase
      .from('approval_request_actions')
      .update({
        action: 'rejected',
        approver_uid: requester.uid,
        approver_username: requester.username || requester.email,
        notes: notes || null,
        acted_at: new Date().toISOString(),
      })
      .eq('id', pendingStep.id);

    await writeApprovalAudit(supabase, {
      companyId,
      requestType,
      requestId,
      actorUid: requester.uid,
      actorUsername: requester.username,
      action: 'rejected',
      stepOrder: pendingStep.step_order,
      details: { notes },
    });

    return { final: true, status: 'rejected', currentStep: pendingStep.step_order };
  }

  await supabase
    .from('approval_request_actions')
    .update({
      action: 'approved',
      approver_uid: requester.uid,
      approver_username: requester.username || requester.email,
      notes: notes || null,
      acted_at: new Date().toISOString(),
    })
    .eq('id', pendingStep.id);

  await writeApprovalAudit(supabase, {
    companyId,
    requestType,
    requestId,
    actorUid: requester.uid,
    actorUsername: requester.username,
    action: 'approved',
    stepOrder: pendingStep.step_order,
    details: { notes },
  });

  const nextPending = progress.find(
    (p) => p.step_order > pendingStep.step_order && p.action === 'pending'
  );

  if (nextPending) {
    const approvers = await resolveApproversForStep(
      supabase,
      { approver_role: nextPending.approver_role },
      employeeUid,
      companyId
    );
    await notifyUsers(supabase, {
      companyId,
      recipientUids: approvers.map((a) => a.uid),
      title: 'Approval required',
      message: `Step "${nextPending.step_label}" is waiting for your review.`,
    });
    return {
      final: false,
      status: 'pending',
      currentStep: nextPending.step_order,
    };
  }

  if (typeof onFinalApprove === 'function') {
    await onFinalApprove();
  }

  return { final: true, status: 'approved', currentStep: pendingStep.step_order };
}

function mapLeaveTypeToRequestType(leaveType) {
  return LEAVE_TYPE_TO_REQUEST_TYPE[leaveType] || REQUEST_TYPES.CASUAL_LEAVE;
}

module.exports = {
  REQUEST_TYPES,
  mapLeaveTypeToRequestType,
  ensureDefaultWorkflows,
  getWorkflowForRequestType,
  initializeApprovalSteps,
  getApprovalProgress,
  resolveApproversForStep,
  canUserActOnStep,
  processApprovalStep,
  writeApprovalAudit,
};
