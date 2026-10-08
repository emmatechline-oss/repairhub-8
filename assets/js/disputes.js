/**
 * Disputes ("Report a problem"), shared by the customer repair page and the technician jobs page.
 * Rules mirror the API's disputeController: only jobs in these statuses, and not once money is settled.
 */
(function () {
  const { html } = RH.ui;
  const DISPUTABLE = ['in_progress', 'quality_check', 'ready', 'completed', 'awaiting_parts', 'on_hold', 'diagnosing'];
  const SETTLED = ['released', 'refunded', 'cash_settled'];
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4', 'video/quicktime'];
  const MAX_FILES = 5;
  const MAX_BYTES = 25 * 1024 * 1024;
  const DECISION = {
    release: 'Payment released to the technician',
    refund: 'Full refund to the customer',
    partial: 'Partial refund to the customer',
    none: 'Closed without moving money',
  };

  const idOf = (d) => String((d.repairJobId && d.repairJobId._id) || d.repairJobId);

  RH.disputes = {
    canOpen: (job) => DISPUTABLE.includes(job.status) && !SETTLED.includes(job.payment.status),

    /** Map of jobId -> latest dispute for the current user's jobs. */
    async byJob() {
      const { data } = await RH.api.disputes.list({ limit: 100 });
      const map = new Map();
      data.forEach((d) => {
        const prev = map.get(idOf(d));
        if (!prev || new Date(d.createdAt) > new Date(prev.createdAt)) map.set(idOf(d), d);
      });
      return map;
    },

    /** Status panel for a job's dispute. */
    panel(d) {
      if (!d) return '';
      if (d.status === 'open') {
        return html`<div class="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p class="font-semibold"><i class="fa-solid fa-scale-balanced mr-1"></i>Problem reported · under review</p>
          <p class="mt-1">RepairHub support is reviewing this job. Payment is frozen until they decide.</p>
          <p class="mt-2 text-xs text-red-700">Reported ${RH.ui.dateTime(d.createdAt)}: "${d.reason}"</p>
        </div>`;
      }
      const r = d.resolution || {};
      return html`<div class="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <p class="font-semibold text-ink"><i class="fa-solid fa-gavel mr-1 text-brand-600"></i>Dispute resolved</p>
        <p class="mt-1 text-slate-700">${DECISION[r.decision] || 'Resolved'}${r.refundAmount ? ` (${RH.ui.money(r.refundAmount)})` : ''}.</p>
        ${r.note ? html`<p class="mt-1 text-slate-600">Note from support: ${r.note}</p>` : ''}
        <p class="mt-2 text-xs text-slate-400">${RH.ui.dateTime(r.resolvedAt || d.updatedAt)}</p>
      </div>`;
    },

    /** Opens the "Report a problem" dialog; calls onDone() after a successful submit. */
    open(job, onDone, { who = 'customer' } = {}) {
      let files = [];
      const m = RH.ui.modal('Report a problem', html`<form class="space-y-4" novalidate>
        <p data-form-error class="hidden rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"></p>
        <p class="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">This opens a dispute with RepairHub support. The job and its payment are frozen until support decides${who === 'customer' ? ' whether to release payment to the technician or refund you' : ''}.</p>
        <div><label for="reason" class="label">What went wrong?</label>
          <textarea id="reason" name="reason" rows="4" maxlength="2000" class="input resize-y" placeholder="Describe the problem in detail (at least 10 characters)"></textarea></div>
        <div>
          <label for="evidence" class="label">Evidence <span class="font-normal text-slate-400">(optional · photos, videos or PDF, up to ${MAX_FILES})</span></label>
          <input id="evidence" type="file" multiple accept="${ALLOWED.join(',')}" class="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700" />
          <ul id="evidence-list" class="mt-2 space-y-1 text-xs text-slate-600"></ul>
        </div>
        <div class="flex justify-end gap-3"><button type="button" data-close class="btn-ghost btn-sm">Cancel</button><button type="submit" class="btn-danger btn-sm">Submit report</button></div>
      </form>`);
      const form = m.el.querySelector('form');
      const input = m.el.querySelector('#evidence');
      input.addEventListener('change', () => {
        for (const f of input.files) {
          if (files.length >= MAX_FILES) { RH.ui.toast(`Up to ${MAX_FILES} files.`, 'error'); break; }
          if (!ALLOWED.includes(f.type)) { RH.ui.toast(`${f.name}: unsupported file type.`, 'error'); continue; }
          if (f.size > MAX_BYTES) { RH.ui.toast(`${f.name} is larger than 25MB.`, 'error'); continue; }
          files.push(f);
        }
        input.value = '';
        RH.ui.setHTML(m.el.querySelector('#evidence-list'), files.map((f) => html`<li><i class="fa-solid fa-paperclip mr-1 text-slate-400"></i>${f.name}</li>`));
      });
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        RH.ui.clearErrors(form);
        const reason = form.reason.value.trim();
        if (reason.length < 10) return RH.ui.fieldError(form, 'reason', 'Please describe the problem in at least 10 characters.');
        const fd = new FormData();
        fd.append('repairJobId', job._id);
        fd.append('reason', reason);
        files.forEach((f) => fd.append('evidence', f));
        await RH.ui.withLoading(form.querySelector('[type=submit]'), async () => {
          try {
            await RH.api.disputes.open(fd);
            m.close();
            RH.ui.toast('Problem reported. RepairHub support will review it.', 'success');
            onDone && onDone();
          } catch (err) {
            RH.ui.showFormError(form, err.status >= 500 && files.length ? new RH.ApiError("We couldn't upload your evidence. Try again or submit without files.", err.status) : err);
          }
        }, 'Submitting…');
      });
    },
  };
})();
