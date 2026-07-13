'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateIssue } from '@/hooks/use-issues';
import { useMembers } from '@/hooks/use-orgs';
import { useActiveOrg } from '@/hooks/use-active-org';
import { useUIStore } from '@/stores/ui-store';
import { ApiError } from '@/lib/api';
import { PRIORITIES, PRIORITY_LABEL, STATUSES, STATUS_LABEL } from '@/lib/types';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Field, FieldError, Label } from '@/components/ui/field';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'done', 'cancelled']),
  priority: z.enum(['none', 'low', 'medium', 'high', 'urgent']),
  assigneeId: z.string(),
});
type FormValues = z.infer<typeof schema>;

export function CreateIssueDialog({ projectId }: { projectId: string }) {
  const { org } = useActiveOrg();
  const { data: members } = useMembers(org?.id);
  const create = useCreateIssue(projectId);
  const open = useUIStore((s) => s.createIssueOpen);
  const prefillStatus = useUIStore((s) => s.createIssueStatus);
  const close = useUIStore((s) => s.closeCreateIssue);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'backlog', priority: 'none', assigneeId: '' },
  });

  // Reset with the prefilled status each time the dialog opens.
  useEffect(() => {
    if (open) {
      reset({
        title: '',
        description: '',
        status: prefillStatus ?? 'backlog',
        priority: 'none',
        assigneeId: '',
      });
      setFormError(null);
    }
  }, [open, prefillStatus, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await create.mutateAsync({
        title: values.title,
        description: values.description || null,
        status: values.status,
        priority: values.priority,
        assigneeId: values.assigneeId || null,
      });
      close();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong');
    }
  });

  return (
    <Modal open={open} onClose={close} title="New issue">
      <form onSubmit={onSubmit} noValidate>
        <Field>
          <Label htmlFor="i-title">Title</Label>
          <Input id="i-title" autoFocus placeholder="What needs to be done?" {...register('title')} />
          <FieldError>{errors.title?.message}</FieldError>
        </Field>
        <Field>
          <Label htmlFor="i-desc">Description</Label>
          <Textarea id="i-desc" placeholder="Add more detail…" {...register('description')} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field>
            <Label htmlFor="i-status">Status</Label>
            <Select id="i-status" {...register('status')}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label htmlFor="i-priority">Priority</Label>
            <Select id="i-priority" {...register('priority')}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label htmlFor="i-assignee">Assignee</Label>
            <Select id="i-assignee" {...register('assigneeId')}>
              <option value="">Unassigned</option>
              {members?.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {formError && (
          <p className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {formError}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending}>
            Create issue
          </Button>
        </div>
      </form>
    </Modal>
  );
}
